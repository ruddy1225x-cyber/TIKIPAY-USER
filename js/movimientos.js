// ======================================================
// MOVIMIENTOS TIKIPAY
// ======================================================

let allTransactions =
  [];

let currentAccountId =
  null;


// ======================================================
// INICIO
// ======================================================

async function initMovements() {

  const session =
    await requireAuth();


  if (!session) {
    return;
  }


  const {
    data: profile
  } =
    await supabaseClient
      .from("profiles")
      .select(
        "full_name"
      )
      .eq(
        "id",
        session.user.id
      )
      .single();


  const initial =
    document.getElementById(
      "profileInitial"
    );


  if (initial) {

    initial.textContent =
      (
        profile?.full_name
        || "T"
      )
        .charAt(0)
        .toUpperCase();

  }


  const {
    data: account,
    error
  } =
    await supabaseClient
      .from("accounts")
      .select("id")
      .eq(
        "user_id",
        session.user.id
      )
      .single();


  if (
    error ||
    !account
  ) {

    console.error(error);

    return;
  }


  currentAccountId =
    account.id;


  await loadTransactions();

}


// ======================================================
// CARGAR
// ======================================================

async function loadTransactions() {

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
        created_at
      `)
      .or(
        `sender_account_id.eq.${currentAccountId},receiver_account_id.eq.${currentAccountId}`
      )
      .order(
        "created_at",
        {
          ascending:
            false
        }
      );


  if (error) {

    console.error(error);

    return;
  }


  allTransactions =
    data || [];


  renderMovements(
    allTransactions
  );

}


// ======================================================
// RENDER
// ======================================================

function renderMovements(
  transactions
) {

  const container =
    document.getElementById(
      "transactionsList"
    );


  if (!container) {
    return;
  }


  let income =
    0;

  let expenses =
    0;


  if (
    transactions.length === 0
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
          Tus operaciones aparecerán aquí.
        </p>

      </div>

    `;


    updateMovementTotals(
      0,
      0
    );

    return;
  }


  container.innerHTML =
    "";


  transactions.forEach(
    transaction => {

      const incoming =
        transaction
          .receiver_account_id
        === currentAccountId;


      if (
        transaction.status ===
        "COMPLETED"
      ) {

        if (incoming) {

          income +=
            Number(
              transaction.amount
            );

        } else {

          expenses +=
            Number(
              transaction.amount
            );

        }

      }


      const card =
        document.createElement(
          "article"
        );


      card.className =
        "movement-card";


      card.innerHTML = `

        <div class="movement-left">

          <div class="movement-icon">

            ${incoming ? "↓" : "↑"}

          </div>


          <div>

            <h3>

              ${escapeHTML(
                transaction.description
                ||
                movementTypeName(
                  transaction.type
                )
              )}

            </h3>


            <p>

              ${formatTikiDate(
                transaction.created_at
              )}

            </p>


            <span
              class="
                movement-status
                status-${String(
                  transaction.status
                )
                  .toLowerCase()
                  .replaceAll(
                    "_",
                    "-"
                  )}
              "
            >

              ${movementStatusName(
                transaction.status
              )}

            </span>

          </div>

        </div>


        <strong
          class="
            movement-value
            ${
              incoming
                ? "income-text"
                : "expense-text"
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
        card
      );

    }
  );


  updateMovementTotals(
    income,
    expenses
  );

}


// ======================================================
// TOTALES
// ======================================================

function updateMovementTotals(
  income,
  expenses
) {

  const incomeElement =
    document.getElementById(
      "totalIncome"
    );


  const expenseElement =
    document.getElementById(
      "totalExpenses"
    );


  if (incomeElement) {

    incomeElement.textContent =
      formatBOB(income);

  }


  if (expenseElement) {

    expenseElement.textContent =
      formatBOB(expenses);

  }

}


// ======================================================
// FILTROS
// ======================================================

function applyMovementFilters() {

  const search =
    document
      .getElementById(
        "transactionSearch"
      )
      ?.value
      .trim()
      .toLowerCase()
    || "";


  const type =
    document
      .getElementById(
        "transactionFilter"
      )
      ?.value
    || "ALL";


  const filtered =
    allTransactions.filter(
      transaction => {

        const typeMatches =
          type === "ALL"
          ||
          transaction.type ===
            type;


        const description =
          (
            transaction.description
            ||
            movementTypeName(
              transaction.type
            )
          )
            .toLowerCase();


        const searchMatches =
          !search
          ||
          description.includes(
            search
          );


        return (
          typeMatches
          &&
          searchMatches
        );

      }
    );


  renderMovements(
    filtered
  );

}


document
  .getElementById(
    "transactionSearch"
  )
  ?.addEventListener(
    "input",
    applyMovementFilters
  );


document
  .getElementById(
    "transactionFilter"
  )
  ?.addEventListener(
    "change",
    applyMovementFilters
  );


// ======================================================
// TEXTOS
// ======================================================

function movementTypeName(
  type
) {

  const values = {

    TRANSFER:
      "Transferencia",

    SERVICE_PAYMENT:
      "Pago de servicio",

    ADMIN_CREDIT:
      "Crédito",

    ADMIN_DEBIT:
      "Ajuste administrativo",

    DEPOSIT:
      "Depósito",

    WITHDRAWAL:
      "Retiro"

  };


  return values[type]
    || "Movimiento";

}


function movementStatusName(
  status
) {

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


  return values[status]
    || status;

}


// ======================================================
// INICIO
// ======================================================

initMovements();