// ======================================================
// TIKIPAY - BILLETERA
// ======================================================

let walletSession = null;
let walletAccount = null;
let walletProfile = null;
let walletAccesses = [];

let balanceVisible = true;


// ======================================================
// INICIO
// ======================================================

async function initWalletPage() {

  walletSession =
    await requireAuth();


  if (!walletSession) {
    return;
  }


  await Promise.all([
    loadWalletProfile(),
    loadWalletAccount(),
    loadWalletMemberships()
  ]);


  renderTikiPayWallet();

  await detectWeb3Wallet();

  bindWalletButtons();
}


// ======================================================
// PERFIL
// ======================================================

async function loadWalletProfile() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select(`
        id,
        tiki_id,
        full_name
      `)
      .eq(
        "id",
        walletSession.user.id
      )
      .single();


  if (error) {

    console.error(
      "Error cargando perfil:",
      error
    );

    return;
  }


  walletProfile = data;
}


// ======================================================
// CUENTA
// ======================================================

async function loadWalletAccount() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("accounts")
      .select(`
        id,
        currency,
        available_balance,
        frozen_balance,
        status
      `)
      .eq(
        "user_id",
        walletSession.user.id
      )
      .single();


  if (error) {

    console.error(
      "Error cargando cuenta:",
      error
    );

    showWalletMessage(
      "No se pudo cargar la cuenta.",
      "error"
    );

    return;
  }


  walletAccount = data;
}


// ======================================================
// ACCESOS WEB3
// ======================================================

async function loadWalletMemberships() {

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
        wallet_address,
        valid_until,
        status,
        services (
          name,
          provider
        )
      `)
      .eq(
        "user_id",
        walletSession.user.id
      )
      .eq(
        "status",
        "ACTIVE"
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (error) {

    console.error(
      "Error cargando membresías:",
      error
    );

    walletAccesses = [];

    return;
  }


  walletAccesses =
    (data || []).filter(
      access =>
        !isWalletAccessExpired(
          access.valid_until
        )
    );
}


// ======================================================
// RENDER TIKIPAY
// ======================================================

function renderTikiPayWallet() {

  const owner =
    document.getElementById(
      "walletOwner"
    );

  const email =
    document.getElementById(
      "walletEmail"
    );

  const tikiId =
    document.getElementById(
      "walletTikiId"
    );

  const status =
    document.getElementById(
      "walletAccountStatus"
    );


  if (owner) {

    owner.textContent =
      walletProfile?.full_name ||
      "Usuario TikiPay";
  }


  if (email) {

    email.textContent =
      walletSession?.user?.email ||
      "";
  }


  if (tikiId) {

    tikiId.textContent =
      "TIKI-ID: " +
      (
        walletProfile?.tiki_id ||
        "—"
      );
  }


  if (status) {

    status.textContent =
      formatWalletStatus(
        walletAccount?.status
      );
  }


  renderWalletBalance();

  renderMemberships();
}


// ======================================================
// SALDO
// ======================================================

function renderWalletBalance() {

  const element =
    document.getElementById(
      "walletBalance"
    );


  if (!element) {
    return;
  }


  if (!balanceVisible) {

    element.textContent =
      "Bs ••••••";

    return;
  }


  const value =
    Number(
      walletAccount
        ?.available_balance ||
      0
    );


  element.textContent =
    new Intl.NumberFormat(
      "es-BO",
      {
        style:
          "currency",

        currency:
          walletAccount
            ?.currency ||
          "BOB"
      }
    )
      .format(value)
      .replace(
        "BOB",
        "Bs"
      );
}


// ======================================================
// MEMBERSHIPS
// ======================================================

function renderMemberships() {

  const container =
    document.getElementById(
      "walletMemberships"
    );

  const count =
    document.getElementById(
      "web3MembershipCount"
    );


  if (count) {

    count.textContent =
      walletAccesses.length +
      (
        walletAccesses.length === 1
          ?
          " acceso"
          :
          " accesos"
      );
  }


  if (!container) {
    return;
  }


  if (
    walletAccesses.length === 0
  ) {

    container.innerHTML = `

      <div class="wallet-card-small">
        No tienes membresías Web3 activas.
      </div>

    `;

    return;
  }


  container.innerHTML =
    walletAccesses
      .map(
        access => {

          const serviceName =
            access.services?.name ||
            "TikiPay Access";


          const expiration =
            access.valid_until
              ?
              new Date(
                access.valid_until
              ).toLocaleString(
                "es-BO",
                {
                  dateStyle:
                    "medium",

                  timeStyle:
                    "short"
                }
              )
              :
              "Sin vencimiento";


          return `

            <div class="wallet-access">

              <div>

                <div class="wallet-access-name">
                  ${escapeWalletHTML(
                    serviceName
                  )}
                </div>

                <div class="wallet-access-meta">

                  ${escapeWalletHTML(
                    access.network ||
                    "Base Sepolia"
                  )}

                  · Token #

                  ${escapeWalletHTML(
                    access.token_id ||
                    "—"
                  )}

                </div>

                <div class="wallet-access-meta">
                  Válido hasta:
                  ${escapeWalletHTML(
                    expiration
                  )}
                </div>

              </div>

              <span class="wallet-active-badge">
                ACTIVO
              </span>

            </div>

          `;

        }
      )
      .join("");
}


// ======================================================
// DETECTAR METAMASK
// ======================================================

async function detectWeb3Wallet() {

  if (!window.ethereum) {

    renderWeb3Disconnected(
      "MetaMask no detectado"
    );

    return;
  }


  try {

    const accounts =
      await window.ethereum.request({
        method:
          "eth_accounts"
      });


    const chainId =
      await window.ethereum.request({
        method:
          "eth_chainId"
      });


    if (
      accounts &&
      accounts[0]
    ) {

      renderWeb3Connected(
        accounts[0],
        chainId
      );

    } else {

      renderWeb3Disconnected(
        "No conectada"
      );
    }

  } catch (error) {

    console.error(
      "MetaMask:",
      error
    );


    renderWeb3Disconnected(
      "No disponible"
    );
  }
}


// ======================================================
// CONECTAR METAMASK
// ======================================================

async function connectWeb3Wallet() {

  if (!window.ethereum) {

    showWalletMessage(
      "Instala MetaMask para usar Web3.",
      "error"
    );

    return;
  }


  try {

    const accounts =
      await window.ethereum.request({
        method:
          "eth_requestAccounts"
      });


    const chainId =
      await window.ethereum.request({
        method:
          "eth_chainId"
      });


    if (
      accounts &&
      accounts[0]
    ) {

      renderWeb3Connected(
        accounts[0],
        chainId
      );


      showWalletMessage(
        "MetaMask conectada correctamente.",
        "success"
      );
    }

  } catch (error) {

    console.error(
      error
    );


    showWalletMessage(
      "La conexión con MetaMask fue cancelada.",
      "error"
    );
  }
}


// ======================================================
// WEB3 CONECTADO
// ======================================================

function renderWeb3Connected(
  address,
  chainId
) {

  const addressElement =
    document.getElementById(
      "web3WalletAddress"
    );

  const networkElement =
    document.getElementById(
      "web3Network"
    );

  const statusElement =
    document.getElementById(
      "web3Status"
    );

  const button =
    document.getElementById(
      "connectWalletButton"
    );


  if (addressElement) {

    addressElement.textContent =
      shortWalletAddress(
        address
      );
  }


  if (networkElement) {

    networkElement.textContent =
      "Red: " +
      walletNetworkName(
        chainId
      );
  }


  if (statusElement) {

    statusElement.textContent =
      "● Conectada";

    statusElement.className =
      "wallet-status ok";
  }


  if (button) {

    button.textContent =
      "Cambiar / verificar wallet";
  }
}


// ======================================================
// WEB3 DESCONECTADO
// ======================================================

function renderWeb3Disconnected(
  text
) {

  const addressElement =
    document.getElementById(
      "web3WalletAddress"
    );

  const networkElement =
    document.getElementById(
      "web3Network"
    );

  const statusElement =
    document.getElementById(
      "web3Status"
    );


  if (addressElement) {

    addressElement.textContent =
      text;
  }


  if (networkElement) {

    networkElement.textContent =
      "Red: —";
  }


  if (statusElement) {

    statusElement.textContent =
      "● Desconectada";

    statusElement.className =
      "wallet-status off";
  }
}


// ======================================================
// EVENTOS
// ======================================================

function bindWalletButtons() {

  const balanceButton =
    document.getElementById(
      "toggleWalletBalance"
    );

  const connectButton =
    document.getElementById(
      "connectWalletButton"
    );


  balanceButton
    ?.addEventListener(
      "click",
      function () {

        balanceVisible =
          !balanceVisible;

        balanceButton.textContent =
          balanceVisible
            ?
            "👁"
            :
            "🙈";

        renderWalletBalance();
      }
    );


  connectButton
    ?.addEventListener(
      "click",
      connectWeb3Wallet
    );


  if (
    window.ethereum?.on
  ) {

    window.ethereum.on(
      "accountsChanged",
      detectWeb3Wallet
    );


    window.ethereum.on(
      "chainChanged",
      detectWeb3Wallet
    );
  }
}


// ======================================================
// HELPERS
// ======================================================

function shortWalletAddress(
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


function walletNetworkName(
  chainId
) {

  const id =
    String(
      chainId ||
      ""
    ).toLowerCase();


  if (
    id ===
    "0x14a34"
  ) {

    return "Base Sepolia";
  }


  return (
    "Chain " +
    parseInt(
      id,
      16
    )
  );
}


function formatWalletStatus(
  status
) {

  const names = {

    ACTIVE:
      "Activa",

    LOGIN_BLOCKED:
      "Inicio bloqueado",

    OUTGOING_FROZEN:
      "Envíos congelados",

    FULLY_FROZEN:
      "Cuenta congelada",

    SUSPENDED:
      "Suspendida",

    CLOSED:
      "Cerrada"

  };


  return (
    names[
      status
    ]
    ||
    status
    ||
    "—"
  );
}


function isWalletAccessExpired(
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


function escapeWalletHTML(
  value
) {

  return String(
    value ??
    ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}


function showWalletMessage(
  text,
  type
) {

  const element =
    document.getElementById(
      "walletMessage"
    );


  if (!element) {
    return;
  }


  element.textContent =
    text;


  element.className =
    "wallet-message " +
    type;


  setTimeout(
    function () {

      element.textContent =
        "";

    },
    4000
  );
}


// ======================================================
// INICIAR
// ======================================================

initWalletPage();