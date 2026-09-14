// ======================================================
// TIKIPAY - MOVIMIENTOS
// Historial completo de operaciones
// ======================================================

let allTransactions =
  [];

let currentAccountId =
  null;

let currentMovementCurrency =
  "BOB";


// ======================================================
// INICIO
// ======================================================

async function initMovements() {

  try {

    const session =
      await requireAuth();


    if (!session) {
      return;
    }


    // ==================================================
    // PERFIL
    // ==================================================

    const {
      data: profile,
      error: profileError
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


    if (profileError) {

      console.warn(
        "No se pudo cargar el perfil:",
        profileError
      );

    }


    const initial =
      document.getElementById(
        "profileInitial"
      );


    if (initial) {

      initial.textContent =
        (
          profile?.full_name
          ||
          "T"
        )
          .trim()
          .charAt(0)
          .toUpperCase();

    }


    // ==================================================
    // CUENTA
    // ==================================================

    const {
      data: account,
      error: accountError
    } =
      await supabaseClient
        .from("accounts")
        .select(`
          id,
          currency
        `)
        .eq(
          "user_id",
          session.user.id
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


      showMovementMessage(
        "No se pudo cargar tu cuenta TikiPay.",
        "error"
      );


      renderMovements(
        []
      );


      return;

    }


    currentAccountId =
      account.id;


    currentMovementCurrency =
      String(
        account.currency ||
        "BOB"
      )
        .trim()
        .toUpperCase();


    await loadTransactions();


  } catch (error) {

    console.error(
      "Error iniciando movimientos:",
      error
    );


    showMovementMessage(
      "No se pudo iniciar el historial de movimientos.",
      "error"
    );


    renderMovements(
      []
    );

  }

}


// ======================================================
// CARGAR TRANSACCIONES
// ======================================================

async function loadTransactions() {

  if (!currentAccountId) {
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

    console.error(
      "Error cargando movimientos:",
      error
    );


    showMovementMessage(
      "No se pudieron cargar tus movimientos.",
      "error"
    );


    allTransactions =
      [];


    renderMovements(
      []
    );


    return;

  }


  allTransactions =
    data ||
    [];


  renderMovements(
    allTransactions
  );

}


// ======================================================
// RENDERIZAR MOVIMIENTOS
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


  // ====================================================
  // SIN RESULTADOS
  // ====================================================

  if (
    !Array.isArray(
      transactions
    )
    ||
    transactions.length === 0
  ) {

    const hasFilters =
      hasActiveMovementFilters();


    container.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          ${
            hasFilters
              ? "⌕"
              : "⇄"
          }
        </div>

        <h3>

          ${
            hasFilters
              ?
              "No encontramos movimientos"
              :
              "Sin movimientos"
          }

        </h3>

        <p>

          ${
            hasFilters
              ?
              "Prueba otra búsqueda o cambia el filtro."
              :
              "Tus operaciones aparecerán aquí."
          }

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


  // ====================================================
  // TARJETAS
  // ====================================================

  transactions.forEach(
    transaction => {


      const direction =
        getMovementDirection(
          transaction
        );


      const incoming =
        direction ===
        "INCOMING";


      const outgoing =
        direction ===
        "OUTGOING";


      /*
        Por seguridad:

        La consulta ya debería devolver solamente
        movimientos pertenecientes a la cuenta.

        Si por alguna razón una operación no es ni
        entrada ni salida, no la mostramos.
      */

      if (
        !incoming &&
        !outgoing
      ) {

        return;

      }


      // ==================================================
      // TOTALES
      // ==================================================

      if (
        String(
          transaction.status ||
          ""
        )
          .toUpperCase()
        ===
        "COMPLETED"
      ) {

        const amount =
          Number(
            transaction.amount ||
            0
          );


        if (
          Number.isFinite(
            amount
          )
        ) {

          if (incoming) {

            income +=
              amount;

          } else {

            expenses +=
              amount;

          }

        }

      }


      // ==================================================
      // INFORMACIÓN VISUAL
      // ==================================================

      const title =
        movementDisplayTitle(
          transaction,
          incoming
        );


      const description =
        movementDescription(
          transaction,
          title
        );


      const icon =
        movementIcon(
          transaction.type,
          incoming
        );


      const currency =
        String(
          transaction.currency ||
          currentMovementCurrency ||
          "BOB"
        )
          .trim()
          .toUpperCase();


      const amount =
        Number(
          transaction.amount ||
          0
        );


      const card =
        document.createElement(
          "article"
        );


      card.className =
        "movement-card";


      card.innerHTML = `

        <div class="movement-left">

          <div
            class="
              movement-icon
              ${
                incoming
                  ?
                  "incoming"
                  :
                  "outgoing"
              }
            "
          >

            ${safeMovementHTML(
              icon
            )}

          </div>


          <div class="movement-info">

            <h3>

              ${safeMovementHTML(
                title
              )}

            </h3>


            ${
              description
                ?
                `
                  <p class="movement-description">

                    ${safeMovementHTML(
                      description
                    )}

                  </p>
                `
                :
                ""
            }


            <span class="movement-date">

              ${safeMovementHTML(
                formatMovementDate(
                  transaction.created_at
                )
              )}

            </span>


            <div class="movement-meta">

              <span
                class="
                  movement-status
                  status-${
                    movementStatusClass(
                      transaction.status
                    )
                  }
                "
              >

                ${safeMovementHTML(
                  movementStatusName(
                    transaction.status
                  )
                )}

              </span>


              <span class="movement-direction">

                ${
                  incoming
                    ?
                    "Entrada"
                    :
                    "Salida"
                }

              </span>

            </div>

          </div>

        </div>


        <strong
          class="
            movement-value
            ${
              incoming
                ?
                "income-text"
                :
                "expense-text"
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

          ${safeMovementHTML(
            formatMovementMoney(
              amount,
              currency
            )
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
// DIRECCIÓN DEL MOVIMIENTO
// ======================================================

function getMovementDirection(
  transaction
) {

  if (
    transaction
      ?.receiver_account_id
    ===
    currentAccountId
  ) {

    return "INCOMING";

  }


  if (
    transaction
      ?.sender_account_id
    ===
    currentAccountId
  ) {

    return "OUTGOING";

  }


  return "UNKNOWN";

}


// ======================================================
// TÍTULO PROFESIONAL
// ======================================================

function movementDisplayTitle(
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


    // --------------------------------------------------
    // TRANSFERENCIA
    // --------------------------------------------------

    case "TRANSFER":

      return incoming
        ?
        "Transferencia recibida"
        :
        "Transferencia enviada";


    // --------------------------------------------------
    // PAGO QR
    // --------------------------------------------------

    case "QR_PAYMENT":

      return incoming
        ?
        "Pago QR recibido"
        :
        "Pago QR realizado";


    // --------------------------------------------------
    // SERVICIO
    // --------------------------------------------------

    case "SERVICE_PAYMENT":

      return incoming
        ?
        "Pago de servicio recibido"
        :
        "Pago de servicio";


    // --------------------------------------------------
    // CRÉDITO
    // --------------------------------------------------

    case "ADMIN_CREDIT":

      return "Crédito TikiPay";


    // --------------------------------------------------
    // AJUSTE
    // --------------------------------------------------

    case "ADMIN_DEBIT":

      return "Ajuste administrativo";


    // --------------------------------------------------
    // DEPÓSITO
    // --------------------------------------------------

    case "DEPOSIT":

      return "Depósito";


    // --------------------------------------------------
    // RETIRO
    // --------------------------------------------------

    case "WITHDRAWAL":

      return "Retiro";


    default:

      return movementTypeName(
        type
      );

  }

}


// ======================================================
// CONCEPTO / DESCRIPCIÓN
// ======================================================

function movementDescription(
  transaction,
  title
) {

  const description =
    String(
      transaction
        ?.description
      ||
      ""
    ).trim();


  if (!description) {
    return "";
  }


  /*
    Evitar mostrar dos veces exactamente
    el mismo texto.
  */

  if (
    description
      .toLowerCase()
    ===
    String(
      title ||
      ""
    )
      .trim()
      .toLowerCase()
  ) {

    return "";

  }


  return description;

}


// ======================================================
// ICONOS
// ======================================================

function movementIcon(
  type,
  incoming
) {

  const normalizedType =
    String(
      type ||
      ""
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
      formatMovementMoney(
        income,
        currentMovementCurrency
      );

  }


  if (expenseElement) {

    expenseElement.textContent =
      formatMovementMoney(
        expenses,
        currentMovementCurrency
      );

  }

}


// ======================================================
// FILTROS
// ======================================================

function applyMovementFilters() {

  const searchInput =
    document.getElementById(
      "transactionSearch"
    );


  const filterInput =
    document.getElementById(
      "transactionFilter"
    );


  const search =
    String(
      searchInput
        ?.value
      ||
      ""
    )
      .trim()
      .toLowerCase();


  const type =
    String(
      filterInput
        ?.value
      ||
      "ALL"
    )
      .trim()
      .toUpperCase();


  const filtered =
    allTransactions.filter(
      transaction => {


        // ================================================
        // FILTRO DE TIPO
        // ================================================

        const transactionType =
          String(
            transaction.type ||
            ""
          )
            .trim()
            .toUpperCase();


        const typeMatches =
          type ===
          "ALL"
          ||
          transactionType ===
          type;


        if (!typeMatches) {

          return false;

        }


        // ================================================
        // SIN TEXTO DE BÚSQUEDA
        // ================================================

        if (!search) {

          return true;

        }


        // ================================================
        // TEXTO BUSCABLE
        // ================================================

        const incoming =
          getMovementDirection(
            transaction
          )
          ===
          "INCOMING";


        const title =
          movementDisplayTitle(
            transaction,
            incoming
          );


        const searchable =
          [
            transaction.description,

            title,

            movementTypeName(
              transaction.type
            ),

            movementStatusName(
              transaction.status
            ),

            incoming
              ?
              "entrada recibido ingreso"
              :
              "salida enviado egreso",

            transaction.type,

            transaction.currency,

            transaction.amount,

            transaction
              .external_reference
          ]
            .filter(
              value =>
                value !==
                  null
                &&
                value !==
                  undefined
            )
            .join(
              " "
            )
            .toLowerCase();


        return searchable.includes(
          search
        );

      }
    );


  renderMovements(
    filtered
  );

}


// ======================================================
// DETECTAR FILTROS ACTIVOS
// ======================================================

function hasActiveMovementFilters() {

  const search =
    String(
      document
        .getElementById(
          "transactionSearch"
        )
        ?.value
      ||
      ""
    ).trim();


  const filter =
    String(
      document
        .getElementById(
          "transactionFilter"
        )
        ?.value
      ||
      "ALL"
    )
      .trim()
      .toUpperCase();


  return (
    Boolean(
      search
    )
    ||
    filter !==
      "ALL"
  );

}


// ======================================================
// EVENTOS DE FILTROS
// ======================================================

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
// NOMBRE DEL TIPO
// ======================================================

function movementTypeName(
  type
) {

  const normalizedType =
    String(
      type ||
      ""
    )
      .trim()
      .toUpperCase();


  const values = {

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
    values[
      normalizedType
    ]
    ||
    "Movimiento"
  );

}


// ======================================================
// NOMBRE DEL ESTADO
// ======================================================

function movementStatusName(
  status
) {

  const normalizedStatus =
    String(
      status ||
      ""
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
      normalizedStatus
    ]
    ||
    normalizedStatus
    ||
    "Sin estado"
  );

}


// ======================================================
// CLASE DEL ESTADO
// ======================================================

function movementStatusClass(
  status
) {

  return String(
    status ||
    "unknown"
  )
    .trim()
    .toLowerCase()
    .replaceAll(
      "_",
      "-"
    );

}


// ======================================================
// FORMATO DE FECHA
// ======================================================

function formatMovementDate(
  value
) {

  if (!value) {

    return "Fecha no disponible";

  }


  /*
    Mantener la función global que
    TikiPay ya utiliza.
  */

  if (
    typeof formatTikiDate ===
    "function"
  ) {

    return formatTikiDate(
      value
    );

  }


  const date =
    new Date(
      value
    );


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return "Fecha no disponible";

  }


  return date.toLocaleString(
    "es-BO",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit"
    }
  );

}


// ======================================================
// FORMATO DE DINERO
// ======================================================

function formatMovementMoney(
  amount,
  currency = "BOB"
) {

  const value =
    Number(
      amount ||
      0
    );


  const normalizedCurrency =
    String(
      currency ||
      "BOB"
    )
      .trim()
      .toUpperCase();


  // ====================================================
  // BOLIVIANOS
  // ====================================================

  if (
    normalizedCurrency ===
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


  // ====================================================
  // DÓLARES
  // ====================================================

  if (
    normalizedCurrency ===
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


  // ====================================================
  // OTRAS MONEDAS
  // ====================================================

  return (
    value.toLocaleString(
      "es-BO",
      {
        minimumFractionDigits:
          2,

        maximumFractionDigits:
          2
      }
    )
    +
    " "
    +
    normalizedCurrency
  );

}


// ======================================================
// ESCAPAR HTML
// ======================================================

function safeMovementHTML(
  value
) {

  const div =
    document.createElement(
      "div"
    );


  div.textContent =
    value ===
      null
    ||
    value ===
      undefined
      ?
      ""
      :
      String(
        value
      );


  return div.innerHTML;

}


// ======================================================
// MENSAJE DE LA PÁGINA
// ======================================================

function showMovementMessage(
  text,
  type = ""
) {

  const element =
    document.getElementById(
      "movementsMessage"
    );


  if (!element) {
    return;
  }


  element.textContent =
    text ||
    "";


  element.className =
    type
      ?
      "movements-message " +
      type
      :
      "movements-message";

}


// ======================================================
// INICIAR
// ======================================================

initMovements();