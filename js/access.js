// ======================================================
// TIKIPAY ACCESS
// Unlock Protocol + MetaMask + Supabase
// Base Sepolia
// ======================================================

let accessSession = null;
let accessServices = [];
let userAccesses = [];
let ethersModulePromise = null;
let web3Busy = false;
let walletEventsBound = false;


const BASE_SEPOLIA = {

  chainId: 84532,

  chainIdHex: "0x14a34",

  chainName:
    "Base Sepolia Testnet",

  rpcUrls: [
    "https://sepolia.base.org"
  ],

  blockExplorerUrls: [
    "https://sepolia.basescan.org"
  ],

  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18
  }

};


const UNLOCK_CHECKOUTS = {

  "0x151ef764492be15691eab0439af59bde92dccb42":
    "https://app.unlock-protocol.com/checkout?id=64a23380-b64c-47fa-9c18-c3b25c2b47c7"

};


const PUBLIC_LOCK_ABI = [

  "function getHasValidKey(address _user) view returns (bool)",

  "function totalKeys(address _keyOwner) view returns (uint256)",

  "function tokenOfOwnerByIndex(address _owner,uint256 index) view returns (uint256)",

  "function isValidKey(uint256 _tokenId) view returns (bool)",

  "function keyExpirationTimestampFor(uint256 _tokenId) view returns (uint256)"

];


// ======================================================
// INICIO
// ======================================================

async function initAccess() {

  accessSession =
    await requireAuth();


  if (!accessSession) {
    return;
  }


  await Promise.all([
    loadAccessServices(),
    loadUserAccesses()
  ]);


  bindWalletEvents();


  await restoreWalletAccessSilently();


  renderAccessServices();

  renderUserAccesses();


  handleUnlockReturn();
}


// ======================================================
// CARGAR SERVICIOS
// ======================================================

async function loadAccessServices() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("services")
      .select(`
        id,
        name,
        provider,
        description,
        service_type,
        price,
        currency,
        unlock_enabled,
        unlock_network,
        unlock_lock_address,
        active
      `)
      .eq(
        "active",
        true
      )
      .eq(
        "unlock_enabled",
        true
      )
      .order(
        "name",
        {
          ascending: true
        }
      );


  if (error) {

    console.error(
      "Error cargando TikiPay Access:",
      error
    );


    accessServices = [];


    showAccessMessage(
      "No se pudieron cargar las experiencias.",
      "error"
    );


    return;
  }


  accessServices =
    data || [];
}


// ======================================================
// CARGAR ACCESOS DESDE SUPABASE
// ======================================================

async function loadUserAccesses() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("unlock_access")
      .select(`
        id,
        service_id,
        network,
        lock_address,
        token_id,
        transaction_hash,
        purchase_amount,
        currency,
        valid_from,
        valid_until,
        status,
        created_at,
        wallet_address
      `)
      .eq(
        "user_id",
        accessSession.user.id
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (error) {

    console.error(
      "Error cargando accesos:",
      error
    );


    userAccesses = [];


    return;
  }


  userAccesses =
    (data || []).map(
      access => ({
        ...access,
        source: "database"
      })
    );
}


// ======================================================
// ESTADO DE UN SERVICIO
// ======================================================

function getServiceAccessState(
  service
) {

  const databaseAccess =
    userAccesses.find(
      access =>

        access.service_id ===
          service.id

        &&

        access.source ===
          "database"

        &&

        normalizedAccessStatus(
          access
        ) ===
          "ACTIVE"
    );


  if (databaseAccess) {

    return {
      active: true,
      synchronized: true,
      access: databaseAccess
    };
  }


  const onChainAccess =
    userAccesses.find(
      access =>

        access.service_id ===
          service.id

        &&

        access.source ===
          "onchain"

        &&

        normalizedAccessStatus(
          access
        ) ===
          "ACTIVE"
    );


  if (onChainAccess) {

    return {
      active: true,
      synchronized: false,
      access: onChainAccess
    };
  }


  return {
    active: false,
    synchronized: false,
    access: null
  };
}


// ======================================================
// MOSTRAR CATÁLOGO
// ======================================================

function renderAccessServices() {

  const container =
    document.getElementById(
      "accessServicesGrid"
    );


  if (!container) {
    return;
  }


  if (
    accessServices.length === 0
  ) {

    container.innerHTML = `

      <div class="access-empty">

        <div class="access-empty-icon">
          🔓
        </div>

        <h3>
          Próximamente
        </h3>

        <p>
          Las experiencias TikiPay Access aparecerán aquí.
        </p>

      </div>

    `;


    return;
  }


  const unlockSuccess =
    new URLSearchParams(
      window.location.search
    ).get("unlock") ===
      "success";


  container.innerHTML = "";


  accessServices.forEach(
    service => {

      const web3Ready =
        Boolean(
          service.unlock_network &&
          service.unlock_lock_address
        );


      const accessState =
        getServiceAccessState(
          service
        );


      let buttonText =
        "Configurar Web3";


      let disabled =
        true;


      if (
        accessState.active &&
        accessState.synchronized
      ) {

        buttonText =
          "Acceso activo";


        disabled =
          true;

      } else if (
        accessState.active &&
        !accessState.synchronized
      ) {

        buttonText =
          "Sincronizar acceso";


        disabled =
          false;

      } else if (web3Ready) {

        buttonText =
          unlockSuccess
            ?
            "Verificar acceso"
            :
            "Conectar wallet";


        disabled =
          false;
      }


      const card =
        document.createElement(
          "article"
        );


      card.className =
        "access-card";


      card.innerHTML = `

        <div class="access-card-icon">
          🔓
        </div>


        <span class="access-provider">

          ${escapeHTML(
            service.provider ||
            "TikiPay"
          )}

        </span>


        <h3>

          ${escapeHTML(
            service.name
          )}

        </h3>


        <p class="access-card-description">

          ${escapeHTML(
            service.description ||
            "Experiencia disponible en TikiPay Access."
          )}

        </p>


        <strong class="access-price">

          ${formatAccessPrice(
            service.price,
            service.currency
          )}

        </strong>


        <div class="access-network">

          ${
            web3Ready
              ?
              (
                "Red: " +
                escapeHTML(
                  service.unlock_network
                )
              )
              :
              "Integración Web3 pendiente"
          }

        </div>


        <button

          type="button"

          class="access-button"

          ${
            disabled
              ? "disabled"
              : ""
          }

          data-service="${service.id}"

        >

          ${escapeHTML(
            buttonText
          )}

        </button>

      `;


      const button =
        card.querySelector(
          ".access-button"
        );


      if (
        button &&
        !disabled
      ) {

        button.addEventListener(
          "click",
          async function () {

            await prepareUnlockPurchase(
              service,
              button
            );

          }
        );

      }


      container.appendChild(
        card
      );

    }
  );
}


// ======================================================
// MOSTRAR MIS ACCESOS
// ======================================================

function renderUserAccesses() {

  const container =
    document.getElementById(
      "myAccessGrid"
    );


  if (!container) {
    return;
  }


  const visibleAccesses =
    userAccesses.filter(
      access =>

        normalizedAccessStatus(
          access
        ) !==
          "REVOKED"
    );


  if (
    visibleAccesses.length === 0
  ) {

    container.innerHTML = `

      <div class="access-empty">

        <div class="access-empty-icon">
          🔐
        </div>

        <h3>
          Aún no tienes accesos
        </h3>

        <p>
          Tus membresías aparecerán aquí.
        </p>

      </div>

    `;


    return;
  }


  /*
    Si existe el mismo servicio en
    Supabase y on-chain temporal,
    mostramos preferentemente Supabase.
  */

  const uniqueAccesses =
    [];


  const serviceIds =
    new Set();


  visibleAccesses
    .slice()
    .sort(
      (a, b) => {

        if (
          a.source === "database" &&
          b.source !== "database"
        ) {
          return -1;
        }


        if (
          b.source === "database" &&
          a.source !== "database"
        ) {
          return 1;
        }


        return 0;
      }
    )
    .forEach(
      access => {

        if (
          serviceIds.has(
            access.service_id
          )
        ) {
          return;
        }


        serviceIds.add(
          access.service_id
        );


        uniqueAccesses.push(
          access
        );
      }
    );


  container.innerHTML = "";


  uniqueAccesses.forEach(
    access => {

      const service =
        accessServices.find(
          item =>
            item.id ===
            access.service_id
        );


      const status =
        normalizedAccessStatus(
          access
        );


      const verifiedLabel =
        access.source ===
          "database"
          ?
          "Verificado y sincronizado"
          :
          "Verificado en blockchain";


      const card =
        document.createElement(
          "article"
        );


      card.className =
        "my-access-card";


      card.innerHTML = `

        <div class="my-access-top">

          <div>


            <h3>

              ${escapeHTML(
                service?.name ||
                "TikiPay Access"
              )}

            </h3>


            <p>

              ${
                access.network
                  ?
                  (
                    "Red: " +
                    escapeHTML(
                      access.network
                    )
                  )
                  :
                  ""
              }

            </p>


            <p>

              ${escapeHTML(
                verifiedLabel
              )}

            </p>


            <p>

              ${
                access.wallet_address
                  ?
                  (
                    "Wallet: " +
                    escapeHTML(
                      shortAddress(
                        access.wallet_address
                      )
                    )
                  )
                  :
                  ""
              }

            </p>


            <p>

              ${
                access.token_id
                  ?
                  (
                    "Token: " +
                    escapeHTML(
                      access.token_id
                    )
                  )
                  :
                  ""
              }

            </p>


            <p>

              Válido hasta:

              ${
                access.valid_until
                  ?
                  formatTikiDate(
                    access.valid_until
                  )
                  :
                  "Verificado on-chain"
              }

            </p>


          </div>


          <span
            class="
              access-status
              ${status.toLowerCase()}
            "
          >

            ${escapeHTML(
              accessStatusName(
                status
              )
            )}

          </span>


        </div>

      `;


      container.appendChild(
        card
      );

    }
  );
}


// ======================================================
// CONECTAR / VERIFICAR / SINCRONIZAR
// ======================================================

async function prepareUnlockPurchase(
  service,
  button = null
) {

  if (web3Busy) {
    return;
  }


  if (
    !service.unlock_network ||
    !service.unlock_lock_address
  ) {

    showAccessMessage(
      "La integración Web3 de este servicio aún no está configurada.",
      "error"
    );


    return;
  }


  if (!window.ethereum) {

    showAccessMessage(
      "MetaMask no está disponible en este navegador.",
      "error"
    );


    return;
  }


  web3Busy = true;


  const originalText =
    button?.textContent ||
    "";


  if (button) {

    button.disabled =
      true;


    button.textContent =
      "Verificando...";
  }


  try {

    localStorage.setItem(
      "tikipay_unlock_service",
      service.id
    );


    // --------------------------------------------------
    // 1. CONECTAR METAMASK
    // --------------------------------------------------

    const wallet =
      await connectWallet();


    // --------------------------------------------------
    // 2. COMPROBAR BASE SEPOLIA
    // --------------------------------------------------

    await ensureBaseSepolia();


    // --------------------------------------------------
    // 3. VERIFICAR NFT / KEY DE UNLOCK
    // --------------------------------------------------

    const result =
      await verifyUnlockMembership(
        service,
        wallet
      );


    if (!result.valid) {

      removeOnChainAccess(
        service.id
      );


      renderUserAccesses();

      renderAccessServices();


      const checkoutUrl =
        getCheckoutUrl(
          service
        );


      if (!checkoutUrl) {

        showAccessMessage(
          "No se encontró un checkout de Unlock para este servicio.",
          "error"
        );


        return;
      }


      showAccessMessage(
        "No tienes una membresía activa. Abriendo Unlock...",
        "success"
      );


      setTimeout(
        function () {

          window.location.href =
            checkoutUrl;

        },
        700
      );


      return;
    }


    // --------------------------------------------------
    // 4. MOSTRAR VERIFICACIÓN ON-CHAIN TEMPORAL
    // --------------------------------------------------

    upsertOnChainAccess(

      service,

      wallet,

      result.validUntil,

      result.tokenId

    );


    renderUserAccesses();

    renderAccessServices();


    showAccessMessage(
      "Membresía encontrada. Confirma la firma de MetaMask para sincronizarla con TikiPay.",
      "success"
    );


    // --------------------------------------------------
    // 5. FIRMA + EDGE FUNCTION
    // --------------------------------------------------

    const syncResult =
      await syncUnlockAccessWithServer(
        service,
        wallet
      );


    if (
      !syncResult ||
      !syncResult.active
    ) {

      throw new Error(
        "La membresía no pudo sincronizarse."
      );
    }


    // --------------------------------------------------
    // 6. RECARGAR REGISTRO PERSISTENTE
    // --------------------------------------------------

    await loadUserAccesses();


    renderUserAccesses();

    renderAccessServices();


    clearUnlockSuccessFromUrl();


    localStorage.removeItem(
      "tikipay_unlock_service"
    );


    showAccessMessage(
      "Acceso verificado y sincronizado correctamente con TikiPay.",
      "success"
    );

  } catch (error) {

    console.error(
      "Error Web3 en TikiPay Access:",
      error
    );


    showAccessMessage(
      friendlyWeb3Error(
        error
      ),
      "error"
    );


    /*
      Si la firma fue cancelada,
      mantenemos el acceso on-chain
      temporal.

      El usuario podrá pulsar
      "Sincronizar acceso".
    */

    renderUserAccesses();

    renderAccessServices();

  } finally {

    web3Busy =
      false;


    if (
      button &&
      document.body.contains(
        button
      )
    ) {

      button.disabled =
        false;


      button.textContent =
        originalText;
    }
  }
}


// ======================================================
// SINCRONIZAR CON EDGE FUNCTION
// ======================================================

async function syncUnlockAccessWithServer(
  service,
  walletAddress
) {

  const ethers =
    await loadEthers();


  const provider =
    new ethers.BrowserProvider(
      window.ethereum
    );


  const signer =
    await provider.getSigner();


  const signerAddress =
    await signer.getAddress();


  if (
    signerAddress.toLowerCase()
    !==
    walletAddress.toLowerCase()
  ) {

    throw new Error(
      "La wallet seleccionada cambió."
    );
  }


  const issuedAt =
    new Date()
      .toISOString();


  const message =
    buildVerificationMessage(

      accessSession.user.id,

      service.id,

      walletAddress,

      issuedAt

    );


  /*
    Esto NO mueve fondos.

    MetaMask únicamente firma
    un mensaje de autenticación.
  */

  const signature =
    await signer.signMessage(
      message
    );


  const {
    data,
    error
  } =
    await supabaseClient
      .functions
      .invoke(
        "sync-unlock-access",
        {

          body: {

            service_id:
              service.id,

            wallet_address:
              walletAddress,

            issued_at:
              issuedAt,

            signature:
              signature

          }

        }
      );


  if (error) {

    console.error(
      "Error Edge Function:",
      error
    );


    let message =
      error.message ||
      "No se pudo ejecutar la función segura.";


    /*
      Cuando Supabase devuelve un
      FunctionsHttpError, context suele
      contener la respuesta HTTP.
    */

    try {

      if (
        error.context &&
        typeof error.context.json ===
          "function"
      ) {

        const details =
          await error.context.json();


        if (details?.error) {

          message =
            details.error;
        }
      }

    } catch (
      parseError
    ) {

      console.warn(
        "No se pudo leer el error de la Edge Function:",
        parseError
      );
    }


    throw new Error(
      message
    );
  }


  if (!data) {

    throw new Error(
      "La función segura no devolvió una respuesta."
    );
  }


  if (
    data.ok !== true
  ) {

    throw new Error(
      data.error ||
      "La sincronización fue rechazada."
    );
  }


  if (
    data.active !== true
  ) {

    throw new Error(
      "Unlock no confirmó una membresía activa."
    );
  }


  return data;
}


// ======================================================
// MENSAJE QUE TAMBIÉN RECONSTRUYE EL SERVIDOR
// ======================================================

function buildVerificationMessage(
  userId,
  serviceId,
  walletAddress,
  issuedAt
) {

  return [

    "TikiPay Access Verification",

    `User: ${userId}`,

    `Service: ${serviceId}`,

    `Wallet: ${walletAddress}`,

    `Chain ID: ${BASE_SEPOLIA.chainId}`,

    `Issued At: ${issuedAt}`

  ].join(
    "\n"
  );
}


// ======================================================
// CONECTAR METAMASK
// ======================================================

async function connectWallet() {

  const accounts =
    await window.ethereum.request(
      {
        method:
          "eth_requestAccounts"
      }
    );


  if (
    !accounts ||
    !accounts[0]
  ) {

    throw new Error(
      "No se autorizó ninguna wallet."
    );
  }


  return accounts[0];
}


// ======================================================
// ASEGURAR BASE SEPOLIA
// ======================================================

async function ensureBaseSepolia() {

  const chainId =
    String(
      await window.ethereum.request(
        {
          method:
            "eth_chainId"
        }
      )
    ).toLowerCase();


  if (
    chainId ===
    BASE_SEPOLIA.chainIdHex
      .toLowerCase()
  ) {

    return;
  }


  try {

    await window.ethereum.request(
      {

        method:
          "wallet_switchEthereumChain",

        params: [
          {
            chainId:
              BASE_SEPOLIA.chainIdHex
          }
        ]

      }
    );

  } catch (error) {

    if (
      error?.code !==
      4902
    ) {

      throw error;
    }


    await window.ethereum.request(
      {

        method:
          "wallet_addEthereumChain",

        params: [

          {

            chainId:
              BASE_SEPOLIA.chainIdHex,

            chainName:
              BASE_SEPOLIA.chainName,

            rpcUrls:
              BASE_SEPOLIA.rpcUrls,

            blockExplorerUrls:
              BASE_SEPOLIA.blockExplorerUrls,

            nativeCurrency:
              BASE_SEPOLIA.nativeCurrency

          }

        ]

      }
    );
  }
}


// ======================================================
// VERIFICAR MEMBERSHIP EN BLOCKCHAIN
// ======================================================

async function verifyUnlockMembership(
  service,
  walletAddress
) {

  const ethers =
    await loadEthers();


  const provider =
    new ethers.BrowserProvider(
      window.ethereum
    );


  const network =
    await provider.getNetwork();


  if (
    Number(
      network.chainId
    ) !==
    BASE_SEPOLIA.chainId
  ) {

    throw new Error(
      "La wallet no está conectada a Base Sepolia."
    );
  }


  const lock =
    new ethers.Contract(

      service.unlock_lock_address,

      PUBLIC_LOCK_ABI,

      provider

    );


  const valid =
    Boolean(
      await lock.getHasValidKey(
        walletAddress
      )
    );


  if (!valid) {

    return {

      valid: false,

      validUntil: null,

      tokenId: null

    };
  }


  let validUntil =
    null;


  let tokenId =
    null;


  try {

    const totalKeys =
      BigInt(
        await lock.totalKeys(
          walletAddress
        )
      );


    const maxChecks =
      totalKeys > 20n
        ?
        20n
        :
        totalKeys;


    for (
      let offset = 0n;
      offset < maxChecks;
      offset++
    ) {

      const index =
        totalKeys -
        1n -
        offset;


      const candidateTokenId =
        await lock
          .tokenOfOwnerByIndex(
            walletAddress,
            index
          );


      const candidateIsValid =
        Boolean(
          await lock.isValidKey(
            candidateTokenId
          )
        );


      if (
        !candidateIsValid
      ) {

        continue;
      }


      tokenId =
        candidateTokenId
          .toString();


      const expiration =
        BigInt(
          await lock
            .keyExpirationTimestampFor(
              candidateTokenId
            )
        );


      if (
        expiration > 0n &&
        expiration <
          8640000000000n
      ) {

        validUntil =
          new Date(
            Number(
              expiration
            ) *
            1000
          ).toISOString();
      }


      break;
    }

  } catch (error) {

    console.warn(
      "No se pudieron leer detalles del Key:",
      error
    );
  }


  return {

    valid: true,

    validUntil,

    tokenId

  };
}


// ======================================================
// CARGAR ETHERS
// ======================================================

async function loadEthers() {

  if (
    !ethersModulePromise
  ) {

    ethersModulePromise =
      import(
        "https://cdn.jsdelivr.net/npm/ethers@6.15.0/+esm"
      );
  }


  return ethersModulePromise;
}


// ======================================================
// RESTAURAR WALLET SIN SOLICITAR FIRMA
// ======================================================

async function restoreWalletAccessSilently() {

  if (!window.ethereum) {
    return;
  }


  try {

    const accounts =
      await window.ethereum.request(
        {
          method:
            "eth_accounts"
        }
      );


    if (
      !accounts ||
      !accounts[0]
    ) {

      return;
    }


    const chainId =
      String(
        await window.ethereum.request(
          {
            method:
              "eth_chainId"
          }
        )
      ).toLowerCase();


    if (
      chainId !==
      BASE_SEPOLIA.chainIdHex
        .toLowerCase()
    ) {

      return;
    }


    await verifyAllServicesForWallet(
      accounts[0]
    );

  } catch (error) {

    console.warn(
      "No se pudo restaurar la verificación Web3:",
      error
    );
  }
}


// ======================================================
// VERIFICAR SERVICIOS DE LA WALLET
// ======================================================

async function verifyAllServicesForWallet(
  walletAddress
) {

  const services =
    accessServices.filter(
      service =>

        Boolean(
          service.unlock_network &&
          service.unlock_lock_address
        )
    );


  for (
    const service of services
  ) {

    /*
      Si ya tenemos ACTIVE persistente,
      no necesitamos crear duplicado
      temporal.
    */

    const state =
      getServiceAccessState(
        service
      );


    if (
      state.active &&
      state.synchronized
    ) {

      continue;
    }


    try {

      const result =
        await verifyUnlockMembership(
          service,
          walletAddress
        );


      if (result.valid) {

        upsertOnChainAccess(

          service,

          walletAddress,

          result.validUntil,

          result.tokenId

        );

      } else {

        removeOnChainAccess(
          service.id
        );
      }

    } catch (error) {

      console.warn(
        "No se pudo verificar " +
        service.name +
        ":",
        error
      );
    }
  }
}


// ======================================================
// ACCESO ON-CHAIN TEMPORAL
// ======================================================

function upsertOnChainAccess(
  service,
  walletAddress,
  validUntil,
  tokenId = null
) {

  const trustedDatabaseAccess =
    userAccesses.some(
      access =>

        access.source ===
          "database"

        &&

        access.service_id ===
          service.id

        &&

        normalizedAccessStatus(
          access
        ) ===
          "ACTIVE"
    );


  if (
    trustedDatabaseAccess
  ) {

    removeOnChainAccess(
      service.id
    );


    return;
  }


  removeOnChainAccess(
    service.id
  );


  userAccesses.unshift(
    {

      id:
        "onchain:" +
        service.id +
        ":" +
        walletAddress.toLowerCase(),

      service_id:
        service.id,

      network:
        service.unlock_network ||
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
        null,

      valid_until:
        validUntil,

      status:
        "ACTIVE",

      created_at:
        new Date()
          .toISOString(),

      wallet_address:
        walletAddress,

      source:
        "onchain"

    }
  );
}


// ======================================================
// ELIMINAR ACCESO TEMPORAL
// ======================================================

function removeOnChainAccess(
  serviceId
) {

  userAccesses =
    userAccesses.filter(
      access =>

        !(
          access.source ===
            "onchain"

          &&

          access.service_id ===
            serviceId
        )
    );
}


// ======================================================
// ELIMINAR TODOS LOS TEMPORALES
// ======================================================

function removeAllOnChainAccesses() {

  userAccesses =
    userAccesses.filter(
      access =>
        access.source !==
          "onchain"
    );
}


// ======================================================
// CHECKOUT
// ======================================================

function getCheckoutUrl(
  service
) {

  const address =
    String(
      service.unlock_lock_address ||
      ""
    ).toLowerCase();


  return (
    UNLOCK_CHECKOUTS[
      address
    ] ||
    null
  );
}


// ======================================================
// RETORNO DESDE UNLOCK
// ======================================================

function handleUnlockReturn() {

  const params =
    new URLSearchParams(
      window.location.search
    );


  if (
    params.get(
      "unlock"
    ) !==
      "success"
  ) {

    return;
  }


  const serviceId =
    localStorage.getItem(
      "tikipay_unlock_service"
    );


  const synchronized =
    userAccesses.some(
      access => {

        if (
          access.source !==
            "database"

          ||

          normalizedAccessStatus(
            access
          ) !==
            "ACTIVE"
        ) {

          return false;
        }


        if (serviceId) {

          return (
            access.service_id ===
            serviceId
          );
        }


        return true;

      }
    );


  if (synchronized) {

    clearUnlockSuccessFromUrl();


    localStorage.removeItem(
      "tikipay_unlock_service"
    );


    showAccessMessage(
      "Tu acceso ya está sincronizado con TikiPay.",
      "success"
    );


    return;
  }


  showAccessMessage(
    "Membresía detectada. Pulsa Verificar acceso para sincronizarla con TikiPay.",
    "success"
  );
}


// ======================================================
// LIMPIAR URL
// ======================================================

function clearUnlockSuccessFromUrl() {

  const url =
    new URL(
      window.location.href
    );


  url.searchParams.delete(
    "unlock"
  );


  window.history.replaceState(

    {},

    "",

    url.pathname +
      url.search +
      url.hash

  );
}


// ======================================================
// EVENTOS METAMASK
// ======================================================

function bindWalletEvents() {

  if (
    walletEventsBound ||
    !window.ethereum?.on
  ) {

    return;
  }


  walletEventsBound =
    true;


  window.ethereum.on(
    "accountsChanged",
    async function (
      accounts
    ) {

      removeAllOnChainAccesses();


      if (
        accounts &&
        accounts[0]
      ) {

        try {

          const chainId =
            String(
              await window.ethereum.request(
                {
                  method:
                    "eth_chainId"
                }
              )
            ).toLowerCase();


          if (
            chainId ===
            BASE_SEPOLIA.chainIdHex
              .toLowerCase()
          ) {

            await verifyAllServicesForWallet(
              accounts[0]
            );
          }

        } catch (error) {

          console.warn(
            "Error actualizando wallet:",
            error
          );
        }
      }


      renderUserAccesses();

      renderAccessServices();

    }
  );


  window.ethereum.on(
    "chainChanged",
    async function (
      chainId
    ) {

      removeAllOnChainAccesses();


      if (
        String(
          chainId
        ).toLowerCase()
        ===
        BASE_SEPOLIA.chainIdHex
          .toLowerCase()
      ) {

        await restoreWalletAccessSilently();
      }


      renderUserAccesses();

      renderAccessServices();

    }
  );
}


// ======================================================
// ESTADO
// ======================================================

function normalizedAccessStatus(
  access
) {

  if (
    access.status ===
      "ACTIVE"

    &&

    isExpired(
      access.valid_until
    )
  ) {

    return "EXPIRED";
  }


  return (
    access.status ||
    "PENDING"
  );
}


// ======================================================
// VENCIMIENTO
// ======================================================

function isExpired(
  date
) {

  if (!date) {
    return false;
  }


  return (
    new Date(
      date
    ).getTime()
    <
    Date.now()
  );
}


// ======================================================
// NOMBRES DE ESTADO
// ======================================================

function accessStatusName(
  status
) {

  const names = {

    PENDING:
      "Pendiente",

    ACTIVE:
      "Activo",

    EXPIRED:
      "Expirado",

    REVOKED:
      "Revocado"

  };


  return (
    names[status] ||
    status
  );
}


// ======================================================
// PRECIO
// ======================================================

function formatAccessPrice(
  amount,
  currency
) {

  if (
    amount === null ||
    amount === undefined
  ) {

    return "Consultar";
  }


  if (
    currency === "BOB"
  ) {

    return formatBOB(
      amount
    );
  }


  return (

    Number(
      amount
    ).toLocaleString(
      "es-BO",
      {

        minimumFractionDigits:
          2,

        maximumFractionDigits:
          8

      }
    )

    +

    " "

    +

    currency

  );
}


// ======================================================
// DIRECCIÓN CORTA
// ======================================================

function shortAddress(
  address
) {

  const value =
    String(
      address ||
      ""
    );


  if (
    value.length < 12
  ) {

    return value;
  }


  return (

    value.slice(
      0,
      6
    )

    +

    "..."

    +

    value.slice(
      -4
    )

  );
}


// ======================================================
// ERRORES AMIGABLES
// ======================================================

function friendlyWeb3Error(
  error
) {

  const code =
    error?.code;


  const text =
    String(

      error?.shortMessage ||

      error?.message ||

      error ||

      ""

    ).toLowerCase();


  if (
    code === 4001

    ||

    text.includes(
      "user rejected"
    )

    ||

    text.includes(
      "user denied"
    )

    ||

    text.includes(
      "cancelada"
    )
  ) {

    return (
      "Operación cancelada en MetaMask. El acceso blockchain sigue válido, pero aún no fue sincronizado."
    );
  }


  if (
    text.includes(
      "firma ha expirado"
    )
  ) {

    return (
      "La firma expiró. Pulsa Sincronizar acceso nuevamente."
    );
  }


  if (
    text.includes(
      "firma no pertenece"
    )
  ) {

    return (
      "La firma no corresponde a la wallet conectada."
    );
  }


  if (
    text.includes(
      "failed to fetch"
    )
  ) {

    return (
      "No se pudo conectar con el servidor de TikiPay."
    );
  }


  if (
    text.includes(
      "401"
    )

    ||

    text.includes(
      "jwt"
    )

    ||

    text.includes(
      "unauthorized"
    )
  ) {

    return (
      "Tu sesión de TikiPay expiró. Vuelve a iniciar sesión."
    );
  }


  if (
    text.includes(
      "base sepolia"
    )
  ) {

    return (
      "No se pudo verificar la membresía en Base Sepolia."
    );
  }


  return (
    error?.message ||
    "No se pudo sincronizar la membresía Web3."
  );
}


// ======================================================
// MENSAJES
// ======================================================

function showAccessMessage(
  text,
  type
) {

  const element =
    document.getElementById(
      "accessMessage"
    );


  if (!element) {
    return;
  }


  element.textContent =

    typeof tikiT ===
      "function"

      ?

      tikiT(
        text
      )

      :

      text;


  element.className =
    "access-message " +
    type;


  setTimeout(
    function () {

      element.textContent =
        "";

    },
    5000
  );
}


// ======================================================
// INICIAR
// ======================================================

initAccess();