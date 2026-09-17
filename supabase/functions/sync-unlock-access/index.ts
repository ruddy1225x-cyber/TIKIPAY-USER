import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";
import {
  Contract,
  JsonRpcProvider,
  getAddress,
  verifyMessage,
} from "npm:ethers@6.15.0";

const CHAIN_ID = 84532;
const RPC_URL = "https://sepolia.base.org";

const PUBLIC_LOCK_ABI = [
  "function getHasValidKey(address _user) view returns (bool)",
  "function totalKeys(address _keyOwner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address _owner,uint256 index) view returns (uint256)",
  "function isValidKey(uint256 _tokenId) view returns (bool)",
  "function keyExpirationTimestampFor(uint256 _tokenId) view returns (uint256)",
];

function verificationMessage(
  userId: string,
  serviceId: string,
  wallet: string,
  issuedAt: string,
) {
  return [
    "TikiPay Access Verification",
    `User: ${userId}`,
    `Service: ${serviceId}`,
    `Wallet: ${wallet}`,
    `Chain ID: ${CHAIN_ID}`,
    `Issued At: ${issuedAt}`,
  ].join("\n");
}

export default {
  fetch: withSupabase(
    { auth: "user" },

    async (req, ctx) => {
      try {
        if (req.method !== "POST") {
          return Response.json(
            {
              ok: false,
              error: "Método no permitido.",
            },
            {
              status: 405,
            },
          );
        }

        // ----------------------------------------------
        // Usuario autenticado TikiPay
        // ----------------------------------------------

        const userId = String(
          ctx.userClaims?.id ?? "",
        );

        if (!userId) {
          return Response.json(
            {
              ok: false,
              error: "Usuario no autenticado.",
            },
            {
              status: 401,
            },
          );
        }

        // ----------------------------------------------
        // Datos enviados por TikiPay User
        // ----------------------------------------------

        const body = await req.json();

        const serviceId = String(
          body?.service_id ?? "",
        ).trim();

        const walletRaw = String(
          body?.wallet_address ?? "",
        ).trim();

        const issuedAt = String(
          body?.issued_at ?? "",
        ).trim();

        const signature = String(
          body?.signature ?? "",
        ).trim();

        if (
          !serviceId ||
          !walletRaw ||
          !issuedAt ||
          !signature
        ) {
          return Response.json(
            {
              ok: false,
              error: "Faltan datos de verificación.",
            },
            {
              status: 400,
            },
          );
        }

        // ----------------------------------------------
        // La firma solo dura 5 minutos
        // ----------------------------------------------

        const issuedTime =
          new Date(issuedAt).getTime();

        if (!Number.isFinite(issuedTime)) {
          return Response.json(
            {
              ok: false,
              error: "Fecha de firma inválida.",
            },
            {
              status: 400,
            },
          );
        }

        if (
          Math.abs(Date.now() - issuedTime) >
          5 * 60 * 1000
        ) {
          return Response.json(
            {
              ok: false,
              error:
                "La firma expiró. Vuelve a sincronizar.",
            },
            {
              status: 400,
            },
          );
        }

        // ----------------------------------------------
        // Dirección Ethereum
        // ----------------------------------------------

        let walletAddress: string;

        try {
          walletAddress =
            getAddress(walletRaw);
        } catch {
          return Response.json(
            {
              ok: false,
              error: "Wallet inválida.",
            },
            {
              status: 400,
            },
          );
        }

        // ----------------------------------------------
        // Verificar firma MetaMask
        // ----------------------------------------------

        const message =
          verificationMessage(
            userId,
            serviceId,
            walletRaw,
            issuedAt,
          );

        let recovered: string;

        try {
          recovered =
            getAddress(
              verifyMessage(
                message,
                signature,
              ),
            );
        } catch {
          return Response.json(
            {
              ok: false,
              error:
                "Firma de MetaMask inválida.",
            },
            {
              status: 400,
            },
          );
        }

        if (
          recovered.toLowerCase() !==
          walletAddress.toLowerCase()
        ) {
          return Response.json(
            {
              ok: false,
              error:
                "La firma no pertenece a esa wallet.",
            },
            {
              status: 403,
            },
          );
        }

        // ----------------------------------------------
        // Obtener Lock desde Supabase
        // Nunca confiar en un Lock enviado por el cliente
        // ----------------------------------------------

        const {
          data: service,
          error: serviceError,
        } =
          await ctx.supabaseAdmin
            .from("services")
            .select(`
              id,
              name,
              active,
              unlock_enabled,
              unlock_network,
              unlock_lock_address
            `)
            .eq("id", serviceId)
            .single();

        if (
          serviceError ||
          !service
        ) {
          console.error(
            "SERVICE:",
            serviceError,
          );

          return Response.json(
            {
              ok: false,
              error:
                "Servicio TikiPay Access no encontrado.",
            },
            {
              status: 404,
            },
          );
        }

        if (
          !service.active ||
          !service.unlock_enabled ||
          !service.unlock_lock_address
        ) {
          return Response.json(
            {
              ok: false,
              error:
                "El servicio Web3 no está habilitado.",
            },
            {
              status: 400,
            },
          );
        }

        let lockAddress: string;

        try {
          lockAddress =
            getAddress(
              service.unlock_lock_address,
            );
        } catch {
          return Response.json(
            {
              ok: false,
              error:
                "Dirección del Lock inválida.",
            },
            {
              status: 500,
            },
          );
        }

        // ----------------------------------------------
        // Verificación independiente en Base Sepolia
        // ----------------------------------------------

        const provider =
          new JsonRpcProvider(
            RPC_URL,
            CHAIN_ID,
          );

        const lock =
          new Contract(
            lockAddress,
            PUBLIC_LOCK_ABI,
            provider,
          );

        let validMembership = false;

        try {
          validMembership =
            Boolean(
              await lock.getHasValidKey(
                walletAddress,
              ),
            );
        } catch (error) {
          console.error(
            "BLOCKCHAIN:",
            error,
          );

          return Response.json(
            {
              ok: false,
              error:
                "No se pudo consultar Base Sepolia.",
            },
            {
              status: 502,
            },
          );
        }

        if (!validMembership) {
          return Response.json({
            ok: true,
            active: false,
            error:
              "La wallet no posee una membresía válida.",
          });
        }

        // ----------------------------------------------
        // Token ID + vencimiento
        // ----------------------------------------------

        let tokenId: string | null =
          null;

        let validUntil: string | null =
          null;

        try {
          const total =
            BigInt(
              await lock.totalKeys(
                walletAddress,
              ),
            );

          const max =
            total > 20n
              ? 20n
              : total;

          for (
            let offset = 0n;
            offset < max;
            offset++
          ) {
            const index =
              total - 1n - offset;

            const token =
              await lock
                .tokenOfOwnerByIndex(
                  walletAddress,
                  index,
                );

            const valid =
              Boolean(
                await lock.isValidKey(
                  token,
                ),
              );

            if (!valid) {
              continue;
            }

            tokenId =
              token.toString();

            const expiration =
              BigInt(
                await lock
                  .keyExpirationTimestampFor(
                    token,
                  ),
              );

            if (
              expiration > 0n &&
              expiration <
                8640000000000n
            ) {
              validUntil =
                new Date(
                  Number(expiration) *
                    1000,
                ).toISOString();
            }

            break;
          }
        } catch (error) {
          console.warn(
            "KEY DETAILS:",
            error,
          );
        }

        // ----------------------------------------------
        // Buscar acceso existente
        // ----------------------------------------------

        const {
          data: existing,
        } =
          await ctx.supabaseAdmin
            .from("unlock_access")
            .select(
              "id, valid_from",
            )
            .eq(
              "user_id",
              userId,
            )
            .eq(
              "service_id",
              serviceId,
            )
            .eq(
              "lock_address",
              service.unlock_lock_address,
            )
            .maybeSingle();

        // ----------------------------------------------
        // Guardar acceso confirmado
        // ----------------------------------------------

        const row = {
          user_id:
            userId,

          service_id:
            serviceId,

          network:
            "Base Sepolia",

          lock_address:
            service.unlock_lock_address,

          token_id:
            tokenId,

          transaction_hash:
            null,

          purchase_amount:
            0,

          currency:
            "ETH",

          valid_from:
            existing?.valid_from ??
            new Date().toISOString(),

          valid_until:
            validUntil,

          status:
            "ACTIVE",

          wallet_address:
            walletAddress,
        };

        const {
          data: saved,
          error: saveError,
        } =
          await ctx.supabaseAdmin
            .from("unlock_access")
            .upsert(
              row,
              {
                onConflict:
                  "user_id,service_id,lock_address",
              },
            )
            .select()
            .single();

        if (saveError) {
          console.error(
            "DATABASE:",
            saveError,
          );

          return Response.json(
            {
              ok: false,
              error:
                "La membresía es válida, pero no pudo guardarse.",
              details:
                saveError.message,
            },
            {
              status: 500,
            },
          );
        }

        return Response.json({
          ok: true,
          active: true,

          service_id:
            serviceId,

          service_name:
            service.name,

          wallet_address:
            walletAddress,

          network:
            "Base Sepolia",

          chain_id:
            CHAIN_ID,

          lock_address:
            lockAddress,

          token_id:
            tokenId,

          valid_until:
            validUntil,

          access:
            saved,
        });

      } catch (error) {
        console.error(
          "UNEXPECTED:",
          error,
        );

        return Response.json(
          {
            ok: false,
            error:
              "Error interno en TikiPay Access.",
          },
          {
            status: 500,
          },
        );
      }
    },
  ),
};