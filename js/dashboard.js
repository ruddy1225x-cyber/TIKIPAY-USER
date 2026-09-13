// ======================================================
// TIKIPAY DASHBOARD
// ======================================================

let dashboardAccount = null;

let balanceIsHidden = false;


// ======================================================
// INICIO
// ======================================================

async function initDashboard() {

  const session =
    await requireAuth();


  if (!session) {
    return;
  }


  // Leer preferencia:
  // ocultar saldo al abrir TikiPay

  balanceIsHidden =
    localStorage.getItem(
      "tikipay_hide_balance"
    ) === "true";


  const user =
    session.user;


  // ====================================================
  // PERFIL
  // ====================================================

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
      "Error cargando perfil:",
      profileError
    );

  }


  // ====================================================
  // CUENTA
  // ====================================================

  const {
    data: account,
    error: accountError
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
        user.id
      )
      .single();


  if (
    accountError ||
    !account
  ) {

    console.error(
      "Error cargando cuenta:",
      accountError
    );

    return;
  }


  dashboardAccount =
    account;


  renderProfile(
    profile
  );


  renderAccount(
    account
  );


  await loadRecentTransactions(
    account.id
  );


  await loadNotificationCount(
    user.id
  );

}


// ======================================================
// PERFIL
// ======================================================

function renderProfile(
  profile
) {

  const name =
    profile?.full_name?.trim()
    || "Usuario";


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
      || "TIKI";

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

  updateBalanceVisibility();


  const statusElement =
    document.getElementById(
      "accountStatus"
    );


  if (!statusElement) {
    return;
  }


  const states = {

    ACTIVE: {
      text: "Activa",
      css: "active"
    },

    LOGIN_BLOCKED: {
      text: "Bloqueada",
      css: "blocked"
    },

    OUTGOING_FROZEN: {
      text: "Envíos congelados",
      css: "frozen"
    },

    FULLY_FROZEN: {
      text: "Congelada",
      css: "frozen"
    },

    SUSPENDED: {
      text: "Suspendida",
      css: "blocked"
    },

    CLOSED: {
      text: "Cerrada",
      css: "blocked"
    }

  };


  const state =
    states[account.status]
    || states.ACTIVE;


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


  if (balanceIsHidden) {

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

    }

  } else {

    if (available) {

      available.textContent =
        formatBOB(
          dashboardAccount
            .available_balance
        );

    }


    if (frozen) {

      frozen.textContent =
        formatBOB(
          dashboardAccount
            .frozen_balance
        );

    }


    if (eye) {

      eye.textContent =
        "👁";

    }

  }

}


// ======================================================
// BOTÓN DEL OJO
// ======================================================

const balanceButton =
  document.getElementById(
    "toggleBalance"
  );


if (balanceButton) {

  balanceButton.addEventListener(
    "click",
    function () {

      balanceIsHidden =
        !balanceIsHidden;


      updateBalanceVisibility();

    }
  );

}


// ======================================================
// MOVIMIENTOS RECIENTES
// ======================================================

async function loadRecentTransactions(
  accountId
) {

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
        currency,
        status,
        description,
        created_at
      `)
      .or(
        `sender_account_id.eq.${accountId},receiver_account_id.eq.${accountId}`
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      )
      .limit(5);


  if (error) {

    console.error(
      "Error cargando movimientos:",
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


  if (
    !data ||
    data.length === 0
  ) {

    return;
  }


  container.innerHTML =
    "";


  data.forEach(
    transaction => {

      const incoming =
        transaction
          .receiver_account_id
        === accountId;


      const row =
        document.createElement(
          "div"
        );


      row.className =
        "transaction-row";


      row.innerHTML = `

        <div class="transaction-info">

          <div class="transaction-icon">
            ${incoming ? "↓" : "↑"}
          </div>

          <div>

            <strong>
              ${escapeHTML(
                transaction.description
                ||
                transactionLabel(
                  transaction.type
                )
              )}
            </strong>

            <small>
              ${formatTikiDate(
                transaction.created_at
              )}
            </small>

          </div>

        </div>


        <strong
          class="
            transaction-amount
            ${
              incoming
                ? "incoming"
                : "outgoing"
            }
          "
        >

          ${
            incoming
              ? "+"
              : "-"
          }

          ${formatBOB(
            transaction.amount
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
// NOTIFICACIONES
// ======================================================

async function loadNotificationCount(
  userId
) {

  const {
    count,
    error
  } =
    await supabaseClient
      .from("notifications")
      .select(
        "id",
        {
          count: "exact",
          head: true
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
      "Error contando notificaciones:",
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
    count &&
    count > 0
  ) {

    badge.textContent =
      count > 99
        ? "99+"
        : String(count);


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

  const labels = {

    TRANSFER:
      "Transferencia",

    SERVICE_PAYMENT:
      "Pago de servicio",

    ADMIN_CREDIT:
      "Crédito",

    ADMIN_DEBIT:
      "Ajuste",

    DEPOSIT:
      "Depósito",

    WITHDRAWAL:
      "Retiro"

  };


  return (
    labels[type]
    ||
    "Movimiento"
  );

}


// ======================================================
// INICIAR DASHBOARD
// ======================================================

initDashboard();