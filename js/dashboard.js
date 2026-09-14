// ======================================================
// TIKIPAY DASHBOARD
// Dashboard en tiempo real
// ======================================================

let dashboardAccount =
  null;

let dashboardSession =
  null;

let balanceIsHidden =
  false;

let dashboardRefreshing =
  false;

let dashboardEventsBound =
  false;


// ======================================================
// INICIO
// ======================================================

async function initDashboard() {

  try {

    dashboardSession =
      await requireAuth();


    if (!dashboardSession) {
      return;
    }


    // ==================================================
    // PREFERENCIA DE VISIBILIDAD DEL SALDO
    // ==================================================

    balanceIsHidden =
      localStorage.getItem(
        "tikipay_hide_balance"
      ) === "true";


    const user =
      dashboardSession.user;


    // ==================================================
    // PERFIL
    // ==================================================

    const {
      data: profile,
      error: profileError
    } =
      await supabaseClient
        .from("profiles")
        .select(`
          tiki_id,
          full_name,
          preferred_currency,
          language
        `)
        .eq(
          "id",
          user.id
        )
        .single();


    if (profileError) {

      console.error(
        "❌ Error cargando perfil:",
        profileError
      );

    }


    renderProfile(
      profile
    );


    // ==================================================
    // CARGAR INFORMACIÓN ACTUAL
    // ==================================================

    await refreshDashboardData();


    // ==================================================
    // EVENTOS DE ACTUALIZACIÓN
    // ==================================================

    bindDashboardRefreshEvents();


    console.log(
      "✅ Dashboard TikiPay iniciado correctamente"
    );


  } catch (error) {

    console.error(
      "❌ Error iniciando dashboard:",
      error
    );

  }

}


// ======================================================
// REFRESCAR TODO EL DASHBOARD
// ======================================================

async function refreshDashboardData() {

  if (
    dashboardRefreshing ||
    !dashboardSession?.user
  ) {

    return;

  }


  dashboardRefreshing =
    true;


  try {

    const userId =
      dashboardSession.user.id;


    // ==================================================
    // CUENTA REAL DESDE SUPABASE
    // ==================================================

    const {
      data: account,
      error: accountError
    } =
      await supabaseClient
        .from("accounts")
        .select(`
          id,
          user_id,
          currency,
          available_balance,
          frozen_balance,
          status,
          updated_at
        `)
        .eq(
          "user_id",
          userId
        )
        .single();


    if (
      accountError ||
      !account
    ) {

      console.error(
        "❌ Error cargando cuenta:",
        accountError
      );

      return;

    }


    /*
      Reemplazamos siempre la cuenta
      anterior con la información más
      reciente almacenada en Supabase.
    */

    dashboardAccount =
      account;


    // ==================================================
    // MOSTRAR SALDO Y ESTADO
    // ==================================================

    renderAccount(
      dashboardAccount
    );


    // ==================================================
    // ACTIVIDAD + NOTIFICACIONES
    // ==================================================

    await Promise.all([

      loadRecentTransactions(
        dashboardAccount.id
      ),

      loadNotificationCount(
        userId
      )

    ]);


    console.log(
      "🔄 Dashboard actualizado.",
      {
        available_balance:
          dashboardAccount
            .available_balance,

        frozen_balance:
          dashboardAccount
            .frozen_balance,

        updated_at:
          dashboardAccount
            .updated_at
      }
    );


  } catch (error) {

    console.error(
      "❌ Error actualizando dashboard:",
      error
    );


  } finally {

    dashboardRefreshing =
      false;

  }

}


// ======================================================
// ACTUALIZAR SOLO LA CUENTA
// ======================================================

async function refreshDashboardAccount() {

  if (
    !dashboardSession?.user
  ) {

    return;

  }


  try {

    const {
      data: account,
      error
    } =
      await supabaseClient
        .from("accounts")
        .select(`
          id,
          user_id,
          currency,
          available_balance,
          frozen_balance,
          status,
          updated_at
        `)
        .eq(
          "user_id",
          dashboardSession.user.id
        )
        .single();


    if (
      error ||
      !account
    ) {

      console.error(
        "❌ Error refrescando saldo:",
        error
      );

      return;

    }


    dashboardAccount =
      account;


    renderAccount(
      dashboardAccount
    );


  } catch (error) {

    console.error(
      "❌ Error refrescando cuenta:",
      error
    );

  }

}


// ======================================================
// PERFIL
// ======================================================

function renderProfile(
  profile
) {

  const name =
    profile?.full_name?.trim()
    ||
    "Usuario";


  const welcome =
    document.getElementById(
      "welcomeName"
    );


  const tiki =
    document.getElementById(
      "tikiId"
    );


  const initial =
    document.getElementById(
      "profileInitial"
    );


  if (welcome) {

    welcome.textContent =
      name;

  }


  if (tiki) {

    tiki.textContent =
      profile?.tiki_id
      ||
      "TIKI";

  }


  if (initial) {

    initial.textContent =
      name
        .charAt(0)
        .toUpperCase();

  }

}


// ======================================================
// CUENTA
// ======================================================

function renderAccount(
  account
) {

  if (!account) {
    return;
  }


  // ==================================================
  // SALDOS
  // ==================================================

  updateBalanceVisibility();


  // ==================================================
  // ESTADO DE CUENTA
  // ==================================================

  const statusElement =
    document.getElementById(
      "accountStatus"
    );


  if (!statusElement) {
    return;
  }


  const states = {

    ACTIVE: {
      text:
        "Activa",

      css:
        "active"
    },

    LOGIN_BLOCKED: {
      text:
        "Bloqueada",

      css:
        "blocked"
    },

    OUTGOING_FROZEN: {
      text:
        "Envíos congelados",

      css:
        "frozen"
    },

    FULLY_FROZEN: {
      text:
        "Congelada",

      css:
        "frozen"
    },

    SUSPENDED: {
      text:
        "Suspendida",

      css:
        "blocked"
    },

    CLOSED: {
      text:
        "Cerrada",

      css:
        "blocked"
    }

  };


  const state =
    states[
      account.status
    ]
    ||
    states.ACTIVE;


  statusElement.textContent =
    state.text;


  statusElement.className =
    "account-status " +
    state.css;

}


// ======================================================
// MOSTRAR / OCULTAR SALDO
// ======================================================

function updateBalanceVisibility() {

  if (!dashboardAccount) {
    return;
  }


  const available =
    document.getElementById(
      "balanceAmount"
    );


  const frozen =
    document.getElementById(
      "frozenBalance"
    );


  const eye =
    document.getElementById(
      "toggleBalance"
    );


  if (
    balanceIsHidden
  ) {

    if (available) {

      available.textContent =
        "Bs ••••••";

    }


    if (frozen) {

      frozen.textContent =
        "Bs ••••••";

    }


    if (eye) {

      eye.textContent =
        "🙈";


      eye.setAttribute(
        "aria-label",
        "Mostrar saldo"
      );

    }

  } else {

    if (available) {

      available.textContent =
        formatDashboardMoney(
          dashboardAccount
            .available_balance,
          dashboardAccount
            .currency
        );

    }


    if (frozen) {

      frozen.textContent =
        formatDashboardMoney(
          dashboardAccount
            .frozen_balance,
          dashboardAccount
            .currency
        );

    }


    if (eye) {

      eye.textContent =
        "👁";


      eye.setAttribute(
        "aria-label",
        "Ocultar saldo"
      );

    }

  }

}


// ======================================================
// FORMATEAR MONEDA
// ======================================================

function formatDashboardMoney(
  amount,
  currency = "BOB"
) {

  const value =
    Number(
      amount || 0
    );


  const normalized =
    String(
      currency || "BOB"
    )
      .trim()
      .toUpperCase();


  // ==================================================
  // BOLIVIANOS
  // ==================================================

  if (
    normalized ===
    "BOB"
  ) {

    if (
      typeof formatBOB ===
      "function"
    ) {

      return formatBOB(
        value
      );

    }


    return (
      "Bs "
      +
      value.toLocaleString(
        "es-BO",
        {
          minimumFractionDigits:
            2,

          maximumFractionDigits:
            2
        }
      )
    );

  }


  // ==================================================
  // DÓLARES
  // ==================================================

  if (
    normalized ===
    "USD"
  ) {

    return (
      "$ "
      +
      value.toLocaleString(
        "es-BO",
        {
          minimumFractionDigits:
            2,

          maximumFractionDigits:
            2
        }
      )
    );

  }


  // ==================================================
  // OTRAS MONEDAS
  // ==================================================

  return (
    value.toLocaleString(
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
    normalized
  );

}


// ======================================================
// BOTÓN DEL OJO
// ======================================================

function bindBalanceButton() {

  const balanceButton =
    document.getElementById(
      "toggleBalance"
    );


  if (!balanceButton) {
    return;
  }


  if (
    balanceButton.dataset.bound ===
    "true"
  ) {

    return;

  }


  balanceButton.dataset.bound =
    "true";


  balanceButton.addEventListener(
    "click",
    function () {

      balanceIsHidden =
        !balanceIsHidden;


      localStorage.setItem(
        "tikipay_hide_balance",
        String(
          balanceIsHidden
        )
      );


      updateBalanceVisibility();

    }
  );

}


// ======================================================
// ACTIVIDAD RECIENTE
// ======================================================

async function loadRecentTransactions(
  accountId
) {

  if (!accountId) {
    return;
  }


  const {
    data,
    error
  } =
    await supabaseClient
      .from("transactions")
      .select(`
        id,
        sender_account_id,
        receiver_account_id,
        type,
        amount,
        fee,
        currency,
        status,
        description,
        external_reference,
        created_at,
        completed_at
      `)
      .or(
        `sender_account_id.eq.${accountId},receiver_account_id.eq.${accountId}`
      )
      .order(
        "created_at",
        {
          ascending:
            false
        }
      )
      .limit(5);


  if (error) {

    console.error(
      "❌ Error cargando movimientos:",
      error
    );

    return;

  }


  const container =
    document.getElementById(
      "recentTransactions"
    );


  if (!container) {
    return;
  }


  // ==================================================
  // SIN ACTIVIDAD
  // ==================================================

  if (
    !data ||
    data.length === 0
  ) {

    container.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          ⇄
        </div>

        <h3>
          Sin movimientos
        </h3>

        <p>
          Tus últimas operaciones aparecerán aquí.
        </p>

      </div>

    `;


    return;

  }


  container.innerHTML =
    "";


  // ==================================================
  // MOSTRAR ÚLTIMOS MOVIMIENTOS
  // ==================================================

  data.forEach(
    transaction => {

      const incoming =
        isIncomingTransaction(
          transaction,
          accountId
        );


      const title =
        dashboardTransactionTitle(
          transaction,
          incoming
        );


      const concept =
        dashboardTransactionDescription(
          transaction,
          title
        );


      const icon =
        dashboardTransactionIcon(
          transaction.type,
          incoming
        );


      const status =
        dashboardTransactionStatus(
          transaction.status
        );


      const row =
        document.createElement(
          "div"
        );


      row.className =
        "transaction-row";


      row.innerHTML = `

        <div class="transaction-info">

          <div class="transaction-icon">

            ${escapeDashboardHTML(
              icon
            )}

          </div>


          <div>

            <strong>

              ${escapeDashboardHTML(
                title
              )}

            </strong>


            ${
              concept
                ?
                `
                  <small
                    style="
                      display:block;
                      margin-top:3px;
                      color:#64748b;
                    "
                  >

                    ${escapeDashboardHTML(
                      concept
                    )}

                  </small>
                `
                :
                ""
            }


            <small
              style="
                display:block;
                margin-top:3px;
              "
            >

              ${escapeDashboardHTML(
                formatDashboardDate(
                  transaction.created_at
                )
              )}

            </small>


            ${
              status
                ?
                `
                  <small
                    style="
                      display:inline-block;
                      margin-top:5px;
                      font-weight:700;
                      color:${
                        String(
                          transaction.status ||
                          ""
                        ).toUpperCase() ===
                        "COMPLETED"
                          ?
                          "#059669"
                          :
                          "#64748b"
                      };
                    "
                  >

                    ${escapeDashboardHTML(
                      status
                    )}

                  </small>
                `
                :
                ""
            }

          </div>

        </div>


        <strong
          class="
            transaction-amount
            ${
              incoming
                ?
                "incoming"
                :
                "outgoing"
            }
          "
        >

          ${
            incoming
              ?
              "+"
              :
              "-"
          }

          ${escapeDashboardHTML(
            formatDashboardMoney(
              transaction.amount,
              transaction.currency
            )
          )}

        </strong>

      `;


      container.appendChild(
        row
      );

    }
  );

}


// ======================================================
// DETERMINAR ENTRADA / SALIDA
// ======================================================

function isIncomingTransaction(
  transaction,
  accountId
) {

  if (
    !transaction ||
    !accountId
  ) {

    return false;

  }


  /*
    Regla principal:

    si la cuenta actual es la receptora,
    entonces el movimiento es una entrada.
  */

  if (
    transaction.receiver_account_id ===
    accountId
  ) {

    return true;

  }


  /*
    Compatibilidad con operaciones
    administrativas o históricas donde
    eventualmente receiver_account_id
    pudiera no estar informado.
  */

  const type =
    String(
      transaction.type ||
      ""
    )
      .trim()
      .toUpperCase();


  if (
    type ===
      "DEPOSIT"
    ||
    type ===
      "ADMIN_CREDIT"
  ) {

    if (
      transaction.sender_account_id !==
      accountId
    ) {

      return true;

    }

  }


  return false;

}


// ======================================================
// TÍTULO DEL MOVIMIENTO
// ======================================================

function dashboardTransactionTitle(
  transaction,
  incoming
) {

  const type =
    String(
      transaction?.type ||
      ""
    )
      .trim()
      .toUpperCase();


  switch (type) {


    // ==================================================
    // TRANSFERENCIA
    // ==================================================

    case "TRANSFER":

      return incoming
        ?
        "Transferencia recibida"
        :
        "Transferencia enviada";


    // ==================================================
    // PAGO QR
    // ==================================================

    case "QR_PAYMENT":

      return incoming
        ?
        "Pago QR recibido"
        :
        "Pago QR realizado";


    // ==================================================
    // SERVICIOS
    // ==================================================

    case "SERVICE_PAYMENT":

      return incoming
        ?
        "Pago de servicio recibido"
        :
        "Pago de servicio";


    // ==================================================
    // CRÉDITO
    // ==================================================

    case "ADMIN_CREDIT":

      return "Crédito TikiPay";


    // ==================================================
    // DÉBITO ADMINISTRATIVO
    // ==================================================

    case "ADMIN_DEBIT":

      return "Ajuste administrativo";


    // ==================================================
    // DEPÓSITO
    // ==================================================

    case "DEPOSIT":

      return "Depósito";


    // ==================================================
    // RETIRO
    // ==================================================

    case "WITHDRAWAL":

      return "Retiro";


    default:

      return transactionLabel(
        type
      );

  }

}


// ======================================================
// CONCEPTO / DESCRIPCIÓN
// ======================================================

function dashboardTransactionDescription(
  transaction,
  title
) {

  const description =
    String(
      transaction?.description ||
      ""
    ).trim();


  if (!description) {
    return "";
  }


  /*
    Si el concepto es exactamente igual
    al título, no lo mostramos dos veces.
  */

  if (
    description
      .toLowerCase()
    ===
    String(
      title || ""
    )
      .trim()
      .toLowerCase()
  ) {

    return "";

  }


  return description;

}


// ======================================================
// ICONO SEGÚN TIPO
// ======================================================

function dashboardTransactionIcon(
  type,
  incoming
) {

  const normalizedType =
    String(
      type || ""
    )
      .trim()
      .toUpperCase();


  switch (
    normalizedType
  ) {


    case "QR_PAYMENT":

      return "▦";


    case "SERVICE_PAYMENT":

      return "◈";


    case "ADMIN_CREDIT":

      return "🎁";


    case "ADMIN_DEBIT":

      return "⚙";


    case "DEPOSIT":

      return "↓";


    case "WITHDRAWAL":

      return "↑";


    case "TRANSFER":

      return incoming
        ?
        "↓"
        :
        "↑";


    default:

      return incoming
        ?
        "↓"
        :
        "↑";

  }

}


// ======================================================
// ESTADO DE TRANSACCIÓN
// ======================================================

function dashboardTransactionStatus(
  status
) {

  const normalized =
    String(
      status || ""
    )
      .trim()
      .toUpperCase();


  const values = {

    PENDING:
      "Pendiente",

    PROCESSING:
      "Procesando",

    COMPLETED:
      "Completado",

    FAILED:
      "Fallido",

    CANCELLED:
      "Cancelado",

    UNDER_REVIEW:
      "En revisión",

    FROZEN:
      "Congelado"

  };


  return (
    values[
      normalized
    ]
    ||
    normalized
    ||
    ""
  );

}


// ======================================================
// NOTIFICACIONES
// ======================================================

async function loadNotificationCount(
  userId
) {

  if (!userId) {
    return;
  }


  const {
    count,
    error
  } =
    await supabaseClient
      .from("notifications")
      .select(
        "id",
        {
          count:
            "exact",

          head:
            true
        }
      )
      .eq(
        "user_id",
        userId
      )
      .eq(
        "is_read",
        false
      );


  if (error) {

    console.error(
      "❌ Error contando notificaciones:",
      error
    );

    return;

  }


  const badge =
    document.getElementById(
      "notificationBadge"
    );


  if (!badge) {
    return;
  }


  if (
    Number(
      count
    ) >
    0
  ) {

    badge.textContent =
      count > 99
        ?
        "99+"
        :
        String(
          count
        );


    badge.classList.add(
      "visible"
    );


  } else {

    badge.textContent =
      "";


    badge.classList.remove(
      "visible"
    );

  }

}


// ======================================================
// TIPOS DE TRANSACCIÓN
// ======================================================

function transactionLabel(
  type
) {

  const normalizedType =
    String(
      type || ""
    )
      .trim()
      .toUpperCase();


  const labels = {

    TRANSFER:
      "Transferencia",

    QR_PAYMENT:
      "Pago QR",

    SERVICE_PAYMENT:
      "Pago de servicio",

    ADMIN_CREDIT:
      "Crédito TikiPay",

    ADMIN_DEBIT:
      "Ajuste administrativo",

    DEPOSIT:
      "Depósito",

    WITHDRAWAL:
      "Retiro"

  };


  return (
    labels[
      normalizedType
    ]
    ||
    "Movimiento"
  );

}


// ======================================================
// FORMATEAR FECHA
// ======================================================

function formatDashboardDate(
  value
) {

  if (!value) {
    return "";
  }


  if (
    typeof formatTikiDate ===
    "function"
  ) {

    return formatTikiDate(
      value
    );

  }


  try {

    const date =
      new Date(
        value
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return "";

    }


    return date.toLocaleString(
      "es-BO"
    );


  } catch {

    return "";

  }

}


// ======================================================
// HTML SEGURO
// ======================================================

function escapeDashboardHTML(
  value
) {

  if (
    typeof escapeHTML ===
    "function"
  ) {

    return escapeHTML(
      value
    );

  }


  return String(
    value ?? ""
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


// ======================================================
// EVENTOS DE ACTUALIZACIÓN AUTOMÁTICA
// ======================================================

function bindDashboardRefreshEvents() {

  if (
    dashboardEventsBound
  ) {

    return;

  }


  dashboardEventsBound =
    true;


  // ==================================================
  // REGRESAR CON ATRÁS / ADELANTE DEL NAVEGADOR
  // ==================================================

  window.addEventListener(
    "pageshow",
    async function () {

      await refreshDashboardData();

    }
  );


  // ==================================================
  // VOLVER A LA PESTAÑA
  // ==================================================

  document.addEventListener(
    "visibilitychange",
    async function () {

      if (
        document.visibilityState ===
        "visible"
      ) {

        await refreshDashboardData();

      }

    }
  );


  // ==================================================
  // RECUPERAR FOCO DE LA VENTANA
  // ==================================================

  window.addEventListener(
    "focus",
    async function () {

      await refreshDashboardData();

    }
  );

}


// ======================================================
// INICIAR
// ======================================================

bindBalanceButton();

initDashboard();