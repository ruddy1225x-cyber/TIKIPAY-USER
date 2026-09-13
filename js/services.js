console.log("✅ TikiPay services.js está cargando");


// ======================================================
// TIKIPAY - SERVICIOS + PAGOS REALES
// Diseño original + comprobante profesional
// ======================================================

let serviceCategories = [];
let allServices = [];
let selectedCategory = "ALL";

let servicesSession = null;
let servicesAccount = null;

let selectedService = null;
let servicePaymentBusy = false;


// ======================================================
// INICIO
// ======================================================

async function initServices() {

  try {

    servicesSession =
      await requireAuth();


    if (!servicesSession) {
      return;
    }


    console.log(
      "✅ Usuario autenticado para servicios"
    );


    injectPaymentModalStyles();

    createPaymentModal();


    await Promise.all([
      loadServiceCategories(),
      loadServices(),
      loadServicesAccount()
    ]);


    renderCategories();

    renderServices(
      allServices
    );


    bindServiceSearch();


  } catch (error) {

    console.error(
      "❌ Error iniciando servicios:",
      error
    );

  }

}


// ======================================================
// CARGAR CUENTA
// ======================================================

async function loadServicesAccount() {

  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from(
          "accounts"
        )
        .select(`
          id,
          user_id,
          currency,
          available_balance,
          frozen_balance,
          status
        `)
        .eq(
          "user_id",
          servicesSession.user.id
        )
        .single();


    if (error) {

      console.error(
        "❌ Error cargando cuenta:",
        error
      );

      servicesAccount = null;

      return;
    }


    servicesAccount =
      data;


    console.log(
      "✅ Cuenta cargada:",
      servicesAccount
    );


  } catch (error) {

    console.error(
      "❌ Error inesperado cargando cuenta:",
      error
    );

    servicesAccount = null;

  }

}


// ======================================================
// CARGAR CATEGORÍAS
// ======================================================

async function loadServiceCategories() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from(
        "service_categories"
      )
      .select(`
        id,
        name,
        icon,
        active
      `)
      .eq(
        "active",
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
      "❌ Error cargando categorías:",
      error
    );

    serviceCategories = [];

    return;
  }


  serviceCategories =
    data || [];


  console.log(
    "✅ Categorías:",
    serviceCategories
  );

}


// ======================================================
// CARGAR SERVICIOS
// ======================================================

async function loadServices() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from(
        "services"
      )
      .select(`
        id,
        category_id,
        name,
        provider,
        description,
        service_type,
        price,
        currency,
        active,
        unlock_enabled,
        unlock_network,
        unlock_lock_address,
        created_at
      `)
      .eq(
        "active",
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
      "❌ Error cargando servicios:",
      error
    );

    allServices = [];

    return;
  }


  allServices =
    data || [];


  console.log(
    "✅ Servicios:",
    allServices
  );

}


// ======================================================
// MOSTRAR CATEGORÍAS
// ======================================================

function renderCategories() {

  const container =
    document.getElementById(
      "serviceCategories"
    );


  if (!container) {

    console.error(
      "❌ No existe #serviceCategories"
    );

    return;
  }


  container.innerHTML =
    "";


  // --------------------------------------------------
  // TODOS
  // --------------------------------------------------

  const allButton =
    document.createElement(
      "button"
    );


  allButton.type =
    "button";


  allButton.className =
    "category-button";


  if (
    selectedCategory ===
    "ALL"
  ) {

    allButton.classList.add(
      "active"
    );

  }


  allButton.dataset.category =
    "ALL";


  allButton.innerHTML = `

    <span>
      ◈
    </span>

    <span>
      Todos
    </span>

  `;


  allButton.addEventListener(
    "click",
    function () {

      selectedCategory =
        "ALL";


      setActiveCategory(
        this
      );


      applyServiceFilters();

    }
  );


  container.appendChild(
    allButton
  );


  // --------------------------------------------------
  // CATEGORÍAS
  // --------------------------------------------------

  serviceCategories.forEach(
    category => {

      const button =
        document.createElement(
          "button"
        );


      button.type =
        "button";


      button.className =
        "category-button";


      button.dataset.category =
        category.id;


      button.innerHTML = `

        <span>
          ${categoryIcon(
            category.name
          )}
        </span>

        <span>
          ${safeHTML(
            category.name
          )}
        </span>

      `;


      button.addEventListener(
        "click",
        function () {

          selectedCategory =
            category.id;


          setActiveCategory(
            this
          );


          applyServiceFilters();

        }
      );


      container.appendChild(
        button
      );

    }
  );

}


// ======================================================
// CATEGORÍA ACTIVA
// ======================================================

function setActiveCategory(
  selectedButton
) {

  document
    .querySelectorAll(
      ".category-button"
    )
    .forEach(
      button => {

        button.classList.remove(
          "active"
        );

      }
    );


  selectedButton.classList.add(
    "active"
  );

}


// ======================================================
// MOSTRAR SERVICIOS
// ======================================================

function renderServices(
  services
) {

  const container =
    document.getElementById(
      "servicesGrid"
    );


  if (!container) {

    console.error(
      "❌ No existe #servicesGrid"
    );

    return;
  }


  if (
    !services ||
    services.length === 0
  ) {

    container.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          ◈
        </div>

        <h3>
          Sin servicios
        </h3>

        <p>
          No encontramos servicios disponibles.
        </p>

      </div>

    `;


    return;
  }


  container.innerHTML =
    "";


  services.forEach(
    service => {

      const category =
        serviceCategories.find(
          item =>
            item.id ===
            service.category_id
        );


      const card =
        document.createElement(
          "article"
        );


      card.className =
        "service-card";


      const price =
        getServicePrice(
          service
        );


      card.innerHTML = `

        <div class="service-card-icon">

          ${categoryIcon(
            category?.name
          )}

        </div>


        <div class="service-card-content">

          <span class="service-provider">

            ${safeHTML(
              service.provider ||
              "TikiPay"
            )}

          </span>


          <h3>

            ${safeHTML(
              service.name
            )}

          </h3>


          <p>

            ${safeHTML(
              service.description ||
              "Servicio disponible en TikiPay."
            )}

          </p>


          <strong>

            ${price}

          </strong>

        </div>


        <button
          type="button"
          class="service-pay-button"
        >

          ${
            service.unlock_enabled
              ?
              "Ver acceso"
              :
              "Pagar"
          }

        </button>

      `;


      const button =
        card.querySelector(
          ".service-pay-button"
        );


      button.addEventListener(
        "click",
        function () {

          openService(
            service
          );

        }
      );


      container.appendChild(
        card
      );

    }
  );

}


// ======================================================
// FILTROS
// ======================================================

function applyServiceFilters() {

  const searchInput =
    document.getElementById(
      "serviceSearch"
    );


  const search =
    searchInput
      ?
      searchInput
        .value
        .trim()
        .toLowerCase()
      :
      "";


  const filtered =
    allServices.filter(
      service => {

        const categoryMatches =
          selectedCategory ===
            "ALL"
          ||
          service.category_id ===
            selectedCategory;


        const category =
          serviceCategories.find(
            item =>
              item.id ===
              service.category_id
          );


        const searchText =
          (
            service.name +
            " " +
            (
              service.provider ||
              ""
            ) +
            " " +
            (
              service.description ||
              ""
            ) +
            " " +
            (
              category?.name ||
              ""
            )
          )
            .toLowerCase();


        const searchMatches =
          search === ""
          ||
          searchText.includes(
            search
          );


        return (
          categoryMatches &&
          searchMatches
        );

      }
    );


  renderServices(
    filtered
  );

}


// ======================================================
// BUSCADOR
// ======================================================

function bindServiceSearch() {

  const serviceSearch =
    document.getElementById(
      "serviceSearch"
    );


  if (!serviceSearch) {
    return;
  }


  serviceSearch.addEventListener(
    "input",
    applyServiceFilters
  );

}


// ======================================================
// ABRIR SERVICIO
// ======================================================

function openService(
  service
) {

  // --------------------------------------------------
  // TIKIPAY ACCESS
  // --------------------------------------------------

  if (
    service.unlock_enabled
  ) {

    localStorage.setItem(
      "tikipay_selected_access",
      service.id
    );


    window.location.href =
      "access.html";


    return;
  }


  // --------------------------------------------------
  // SERVICIO NORMAL
  // --------------------------------------------------

  openPaymentModal(
    service
  );

}


// ======================================================
// MODO VISUAL DEL MODAL
// ======================================================

function setPaymentSuccessMode(
  success
) {

  const modal =
    document.getElementById(
      "servicePaymentModal"
    );


  if (!modal) {
    return;
  }


  const selectors = [
    ".tikipay-payment-icon",
    ".tikipay-payment-label",
    "#paymentServiceName",
    "#paymentServiceProvider",
    "#paymentBalanceRow",
    "#paymentTotalRow",
    "#paymentVariableWrapper",
    "#confirmServicePayment",
    ".tikipay-payment-security"
  ];


  selectors.forEach(
    selector => {

      modal
        .querySelectorAll(
          selector
        )
        .forEach(
          element => {

            if (success) {

              element.style.display =
                "none";

            } else {

              element.style.display =
                "";

            }

          }
        );

    }
  );


  if (success) {

    modal.classList.add(
      "payment-success-mode"
    );

  } else {

    modal.classList.remove(
      "payment-success-mode"
    );

  }

}


// ======================================================
// ABRIR MODAL DE PAGO
// ======================================================

function openPaymentModal(
  service
) {

  if (
    !servicesAccount
  ) {

    showServiceToast(
      "No se pudo cargar tu cuenta TikiPay.",
      "error"
    );

    return;
  }


  if (
    servicesAccount.status !==
    "ACTIVE"
  ) {

    showServiceToast(
      "Tu cuenta no está habilitada para realizar pagos.",
      "error"
    );

    return;
  }


  selectedService =
    service;


  const modal =
    document.getElementById(
      "servicePaymentModal"
    );


  if (!modal) {
    return;
  }


  // Restaurar formulario normal
  setPaymentSuccessMode(
    false
  );


  const name =
    document.getElementById(
      "paymentServiceName"
    );


  const provider =
    document.getElementById(
      "paymentServiceProvider"
    );


  const balanceRow =
    document.getElementById(
      "paymentBalanceRow"
    );


  const balance =
    document.getElementById(
      "paymentAvailableBalance"
    );


  const totalRow =
    document.getElementById(
      "paymentTotalRow"
    );


  const fixedAmount =
    document.getElementById(
      "paymentFixedAmount"
    );


  const variableWrapper =
    document.getElementById(
      "paymentVariableWrapper"
    );


  const variableInput =
    document.getElementById(
      "paymentVariableAmount"
    );


  const result =
    document.getElementById(
      "servicePaymentResult"
    );


  const confirmButton =
    document.getElementById(
      "confirmServicePayment"
    );


  const security =
    modal.querySelector(
      ".tikipay-payment-security"
    );


  name.textContent =
    service.name;


  provider.textContent =
    service.provider ||
    "TikiPay";


  balance.textContent =
    formatServiceMoney(
      servicesAccount.available_balance,
      servicesAccount.currency
    );


  balanceRow.style.display =
    "flex";


  result.innerHTML =
    "";


  result.className =
    "tikipay-payment-result";


  result.style.display =
    "block";


  confirmButton.style.display =
    "block";


  confirmButton.disabled =
    false;


  confirmButton.textContent =
    "Confirmar pago";


  if (security) {

    security.style.display =
      "block";

  }


  const fixedPrice =
    Number(
      service.price || 0
    );


  // --------------------------------------------------
  // PRECIO FIJO
  // --------------------------------------------------

  if (
    fixedPrice > 0
  ) {

    totalRow.style.display =
      "flex";


    fixedAmount.style.display =
      "block";


    fixedAmount.textContent =
      formatServiceMoney(
        fixedPrice,
        service.currency
      );


    variableWrapper.style.display =
      "none";


    variableInput.value =
      "";

  }

  // --------------------------------------------------
  // MONTO VARIABLE
  // --------------------------------------------------

  else {

    totalRow.style.display =
      "none";


    fixedAmount.textContent =
      "";


    variableWrapper.style.display =
      "block";


    variableInput.value =
      "";

  }


  modal.classList.add(
    "open"
  );


  modal.setAttribute(
    "aria-hidden",
    "false"
  );


  if (
    fixedPrice <= 0
  ) {

    setTimeout(
      function () {

        variableInput.focus();

      },
      100
    );

  }

}


// ======================================================
// CERRAR MODAL
// ======================================================

function closePaymentModal() {

  if (
    servicePaymentBusy
  ) {

    return;
  }


  const modal =
    document.getElementById(
      "servicePaymentModal"
    );


  if (!modal) {
    return;
  }


  modal.classList.remove(
    "open"
  );


  modal.classList.remove(
    "payment-success-mode"
  );


  modal.setAttribute(
    "aria-hidden",
    "true"
  );


  selectedService =
    null;

}


// ======================================================
// PROCESAR PAGO
// ======================================================

async function confirmServicePayment() {

  if (
    servicePaymentBusy ||
    !selectedService
  ) {

    return;
  }


  const button =
    document.getElementById(
      "confirmServicePayment"
    );


  const variableInput =
    document.getElementById(
      "paymentVariableAmount"
    );


  const fixedPrice =
    Number(
      selectedService.price || 0
    );


  let amount =
    null;


  // --------------------------------------------------
  // MONTO VARIABLE
  // --------------------------------------------------

  if (
    fixedPrice <= 0
  ) {

    amount =
      Number(
        String(
          variableInput.value || ""
        )
          .replace(
            ",",
            "."
          )
      );


    if (
      !Number.isFinite(
        amount
      )
      ||
      amount <= 0
    ) {

      showPaymentResult(
        "Ingresa un monto válido.",
        "error"
      );

      return;
    }


    amount =
      Math.round(
        amount * 100
      ) / 100;

  }


  const amountToPay =
    fixedPrice > 0
      ?
      fixedPrice
      :
      amount;


  // --------------------------------------------------
  // PREVALIDAR SALDO
  // --------------------------------------------------

  const currentBalance =
    Number(
      servicesAccount
        ?.available_balance || 0
    );


  if (
    amountToPay >
    currentBalance
  ) {

    showPaymentResult(
      "Saldo insuficiente para realizar este pago.",
      "error"
    );

    return;
  }


  servicePaymentBusy =
    true;


  button.disabled =
    true;


  button.textContent =
    "Procesando...";


  showPaymentResult(
    "Procesando pago de forma segura...",
    "loading"
  );


  try {

    // --------------------------------------------------
    // RPC SEGURO EN SUPABASE
    // --------------------------------------------------

    const {
      data,
      error
    } =
      await supabaseClient
        .rpc(
          "tikipay_pay_service",
          {

            p_service_id:
              selectedService.id,

            p_amount:
              fixedPrice > 0
                ?
                null
                :
                amount

          }
        );


    if (error) {

      console.error(
        "❌ Error pagando servicio:",
        error
      );


      showPaymentResult(
        translateServicePaymentError(
          error
        ),
        "error"
      );


      return;
    }


    if (
      !data ||
      data.success !== true
    ) {

      console.error(
        "❌ Respuesta inesperada:",
        data
      );


      showPaymentResult(
        "No se pudo completar el pago.",
        "error"
      );


      return;
    }


    // --------------------------------------------------
    // ACTUALIZAR SALDO LOCAL
    // --------------------------------------------------

    servicesAccount.available_balance =
      Number(
        data.balance_after
      );


    // --------------------------------------------------
    // MOSTRAR COMPROBANTE
    // --------------------------------------------------

    renderPaymentReceipt(
      data
    );


    showServiceToast(
      "Pago realizado correctamente.",
      "success"
    );


  } catch (error) {

    console.error(
      "❌ Error inesperado:",
      error
    );


    showPaymentResult(
      "No se pudo conectar con TikiPay. Inténtalo nuevamente.",
      "error"
    );


  } finally {

    servicePaymentBusy =
      false;


    if (
      !document
        .getElementById(
          "servicePaymentModal"
        )
        ?.classList
        .contains(
          "payment-success-mode"
        )
    ) {

      button.disabled =
        false;


      button.textContent =
        "Confirmar pago";

    }

  }

}


// ======================================================
// COMPROBANTE PROFESIONAL
// ======================================================

function renderPaymentReceipt(
  receipt
) {

  const result =
    document.getElementById(
      "servicePaymentResult"
    );


  if (!result) {
    return;
  }


  // --------------------------------------------------
  // OCULTAR FORMULARIO
  // --------------------------------------------------

  setPaymentSuccessMode(
    true
  );


  result.style.display =
    "block";


  const paidAt =
    receipt.paid_at
      ?
      new Date(
        receipt.paid_at
      )
      :
      new Date();


  let formattedDate =
    "";


  try {

    formattedDate =
      paidAt.toLocaleString(
        "es-BO",
        {
          dateStyle:
            "medium",

          timeStyle:
            "short"
        }
      );

  } catch {

    formattedDate =
      paidAt.toLocaleString(
        "es-BO"
      );

  }


  result.className =
    "tikipay-payment-result success";


  result.innerHTML = `

    <div class="tikipay-receipt-header">

      <div class="tikipay-payment-success-icon">
        ✓
      </div>


      <h3>
        Pago completado
      </h3>


      <p>
        Tu operación fue procesada correctamente.
      </p>

    </div>


    <div class="tikipay-receipt-divider"></div>


    <div class="tikipay-receipt-row">

      <span>
        Servicio
      </span>

      <strong>

        ${safeHTML(
          receipt.service_name ||
          selectedService?.name ||
          ""
        )}

      </strong>

    </div>


    <div class="tikipay-receipt-row">

      <span>
        Proveedor
      </span>

      <strong>

        ${safeHTML(
          receipt.provider ||
          selectedService?.provider ||
          "TikiPay"
        )}

      </strong>

    </div>


    <div class="tikipay-receipt-row">

      <span>
        Monto pagado
      </span>

      <strong class="tikipay-paid-amount">

        ${safeHTML(
          formatServiceMoney(
            receipt.amount,
            receipt.currency
          )
        )}

      </strong>

    </div>


    <div class="tikipay-receipt-row">

      <span>
        Saldo restante
      </span>

      <strong>

        ${safeHTML(
          formatServiceMoney(
            receipt.balance_after,
            receipt.currency
          )
        )}

      </strong>

    </div>


    <div class="tikipay-receipt-row">

      <span>
        Fecha
      </span>

      <strong>

        ${safeHTML(
          formattedDate
        )}

      </strong>

    </div>


    <div class="tikipay-payment-reference">

      <span>
        ID de operación
      </span>

      <strong>

        ${safeHTML(
          shortTransactionId(
            receipt.transaction_id
          )
        )}

      </strong>

    </div>


    <div class="tikipay-receipt-security">

      🔒 Pago procesado de forma segura
      mediante TikiPay

    </div>


    <div class="tikipay-receipt-actions">

      <button
        type="button"
        id="paymentMovementsButton"
        class="tikipay-payment-secondary"
      >
        Ver movimientos
      </button>


      <button
        type="button"
        id="paymentFinishButton"
        class="tikipay-payment-primary"
      >
        Finalizar
      </button>

    </div>

  `;


  // --------------------------------------------------
  // VER MOVIMIENTOS
  // --------------------------------------------------

  document
    .getElementById(
      "paymentMovementsButton"
    )
    ?.addEventListener(
      "click",
      function () {

        window.location.href =
          "movimientos.html";

      }
    );


  // --------------------------------------------------
  // FINALIZAR
  // --------------------------------------------------

  document
    .getElementById(
      "paymentFinishButton"
    )
    ?.addEventListener(
      "click",
      async function () {

        closePaymentModal();

        await loadServicesAccount();

      }
    );

}


// ======================================================
// CREAR MODAL
// ======================================================

function createPaymentModal() {

  if (
    document.getElementById(
      "servicePaymentModal"
    )
  ) {

    return;
  }


  const modal =
    document.createElement(
      "div"
    );


  modal.id =
    "servicePaymentModal";


  modal.className =
    "tikipay-payment-overlay";


  modal.setAttribute(
    "aria-hidden",
    "true"
  );


  modal.innerHTML = `

    <div
      class="tikipay-payment-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paymentServiceName"
    >

      <button
        type="button"
        id="closeServicePayment"
        class="tikipay-payment-close"
        aria-label="Cerrar"
      >
        ×
      </button>


      <div class="tikipay-payment-icon">
        💳
      </div>


      <span class="tikipay-payment-label">
        Pago seguro
      </span>


      <h2 id="paymentServiceName">
        Servicio
      </h2>


      <p
        id="paymentServiceProvider"
        class="tikipay-payment-provider"
      >
        TikiPay
      </p>


      <div
        id="paymentBalanceRow"
        class="tikipay-payment-detail"
      >

        <span>
          Saldo disponible
        </span>

        <strong id="paymentAvailableBalance">
          Bs 0,00
        </strong>

      </div>


      <div
        id="paymentTotalRow"
        class="tikipay-payment-detail"
      >

        <span>
          Total a pagar
        </span>

        <strong id="paymentFixedAmount">
          Bs 0,00
        </strong>

      </div>


      <div
        id="paymentVariableWrapper"
        class="tikipay-payment-variable"
        style="display:none;"
      >

        <label
          for="paymentVariableAmount"
        >
          Monto a pagar
        </label>


        <input
          id="paymentVariableAmount"
          type="number"
          min="0.01"
          step="0.01"
          inputmode="decimal"
          autocomplete="off"
          placeholder="0,00"
        >

      </div>


      <div
        id="servicePaymentResult"
        class="tikipay-payment-result"
        aria-live="polite"
      ></div>


      <button
        type="button"
        id="confirmServicePayment"
        class="tikipay-payment-primary"
      >
        Confirmar pago
      </button>


      <p class="tikipay-payment-security">
        🔒 El saldo es procesado mediante
        una operación segura de TikiPay.
      </p>

    </div>

  `;


  document.body.appendChild(
    modal
  );


  // --------------------------------------------------
  // CERRAR
  // --------------------------------------------------

  document
    .getElementById(
      "closeServicePayment"
    )
    .addEventListener(
      "click",
      closePaymentModal
    );


  // --------------------------------------------------
  // CONFIRMAR PAGO
  // --------------------------------------------------

  document
    .getElementById(
      "confirmServicePayment"
    )
    .addEventListener(
      "click",
      confirmServicePayment
    );


  // --------------------------------------------------
  // ACTUALIZAR TOTAL EN MONTO VARIABLE
  // --------------------------------------------------

  document
    .getElementById(
      "paymentVariableAmount"
    )
    .addEventListener(
      "input",
      function () {

        const row =
          document.getElementById(
            "paymentTotalRow"
          );


        const total =
          document.getElementById(
            "paymentFixedAmount"
          );


        const value =
          Number(
            String(
              this.value || ""
            )
              .replace(
                ",",
                "."
              )
          );


        if (
          Number.isFinite(
            value
          )
          &&
          value > 0
        ) {

          row.style.display =
            "flex";


          total.style.display =
            "block";


          total.textContent =
            formatServiceMoney(
              value,
              selectedService?.currency ||
              "BOB"
            );

        } else {

          row.style.display =
            "none";

        }

      }
    );


  // --------------------------------------------------
  // CLIC EN FONDO
  // --------------------------------------------------

  modal.addEventListener(
    "click",
    function (event) {

      if (
        event.target ===
        modal
      ) {

        closePaymentModal();

      }

    }
  );


  // --------------------------------------------------
  // ESC
  // --------------------------------------------------

  document.addEventListener(
    "keydown",
    function (event) {

      if (
        event.key ===
        "Escape"
      ) {

        closePaymentModal();

      }

    }
  );

}


// ======================================================
// RESULTADO DEL MODAL
// ======================================================

function showPaymentResult(
  text,
  type = ""
) {

  const element =
    document.getElementById(
      "servicePaymentResult"
    );


  if (!element) {
    return;
  }


  element.className =
    "tikipay-payment-result";


  if (type) {

    element.classList.add(
      type
    );

  }


  element.textContent =
    text;

}


// ======================================================
// TOAST
// ======================================================

function showServiceToast(
  text,
  type = "success"
) {

  let toast =
    document.getElementById(
      "tikipayServiceToast"
    );


  if (!toast) {

    toast =
      document.createElement(
        "div"
      );


    toast.id =
      "tikipayServiceToast";


    toast.className =
      "tikipay-service-toast";


    document.body.appendChild(
      toast
    );

  }


  toast.textContent =
    text;


  toast.className =
    "tikipay-service-toast " +
    type +
    " visible";


  clearTimeout(
    showServiceToast.timer
  );


  showServiceToast.timer =
    setTimeout(
      function () {

        toast.classList.remove(
          "visible"
        );

      },
      3500
    );

}


// ======================================================
// TRADUCIR ERRORES DEL RPC
// ======================================================

function translateServicePaymentError(
  error
) {

  const text =
    [
      error?.message,
      error?.details,
      error?.hint,
      error?.code
    ]
      .filter(Boolean)
      .join(" ")
      .toUpperCase();


  if (
    text.includes(
      "INSUFFICIENT_BALANCE"
    )
  ) {

    return (
      "Saldo insuficiente para realizar este pago."
    );

  }


  if (
    text.includes(
      "ACCOUNT_NOT_ACTIVE"
    )
  ) {

    return (
      "Tu cuenta no está habilitada para realizar pagos."
    );

  }


  if (
    text.includes(
      "ACCOUNT_NOT_FOUND"
    )
  ) {

    return (
      "No se encontró tu cuenta TikiPay."
    );

  }


  if (
    text.includes(
      "SERVICE_NOT_FOUND"
    )
  ) {

    return (
      "Este servicio ya no está disponible."
    );

  }


  if (
    text.includes(
      "INVALID_AMOUNT"
    )
  ) {

    return (
      "El monto ingresado no es válido."
    );

  }


  if (
    text.includes(
      "CURRENCY_MISMATCH"
    )
  ) {

    return (
      "La moneda del servicio no coincide con tu cuenta."
    );

  }


  if (
    text.includes(
      "NOT_AUTHENTICATED"
    )
  ) {

    return (
      "Tu sesión expiró. Vuelve a iniciar sesión."
    );

  }


  if (
    text.includes(
      "SERVICE_PAYMENTS"
    )
    ||
    text.includes(
      "COLUMN"
    )
  ) {

    return (
      "La base de datos de pagos necesita una corrección. Revisa la consola."
    );

  }


  return (
    "No se pudo completar el pago."
  );

}


// ======================================================
// PRECIO
// ======================================================

function getServicePrice(
  service
) {

  if (
    service.price === null
    ||
    service.price === undefined
    ||
    Number(
      service.price
    ) <= 0
  ) {

    return (
      "Monto variable"
    );

  }


  if (
    String(
      service.currency
    ).toUpperCase() ===
    "BOB"
  ) {

    if (
      typeof formatBOB ===
      "function"
    ) {

      return formatBOB(
        service.price
      );

    }


    return formatServiceMoney(
      service.price,
      "BOB"
    );

  }


  return (

    Number(
      service.price
    )
      .toLocaleString(
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

    service.currency

  );

}


// ======================================================
// FORMATEAR DINERO
// ======================================================

function formatServiceMoney(
  amount,
  currency = "BOB"
) {

  const value =
    Number(
      amount || 0
    );


  const normalizedCurrency =
    String(
      currency || "BOB"
    ).toUpperCase();


  if (
    normalizedCurrency ===
    "BOB"
  ) {

    return (

      "Bs " +

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

    normalizedCurrency

  );

}


// ======================================================
// ICONOS ORIGINALES
// ======================================================

function categoryIcon(
  name = ""
) {

  const icons = {

    "Electricidad":
      "⚡",

    "Agua":
      "💧",

    "Internet":
      "🌐",

    "Telefonía":
      "📱",

    "Educación":
      "🎓",

    "Eventos":
      "🎫",

    "Membresías":
      "👑",

    "Certificaciones":
      "🏅",

    "Contenido Premium":
      "🔐",

    "TikiPay Access":
      "🔓"

  };


  return (
    icons[name] ||
    "◈"
  );

}


// ======================================================
// ID CORTO
// ======================================================

function shortTransactionId(
  value
) {

  const text =
    String(
      value || ""
    );


  if (
    text.length <= 14
  ) {

    return text;

  }


  return (

    text.slice(
      0,
      8
    )

    +

    "..."

    +

    text.slice(
      -4
    )

  );

}


// ======================================================
// HTML SEGURO
// ======================================================

function safeHTML(
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
// ESTILOS DEL MODAL DE PAGO
// NO MODIFICA LAS TARJETAS ORIGINALES
// ======================================================

function injectPaymentModalStyles() {

  if (
    document.getElementById(
      "tikipayPaymentModalStyles"
    )
  ) {

    return;
  }


  const style =
    document.createElement(
      "style"
    );


  style.id =
    "tikipayPaymentModalStyles";


  style.textContent = `

    .tikipay-payment-overlay {

      position:
        fixed;

      inset:
        0;

      z-index:
        99999;

      display:
        none;

      align-items:
        center;

      justify-content:
        center;

      padding:
        18px;

      background:
        rgba(
          4,
          25,
          55,
          .62
        );

      backdrop-filter:
        blur(5px);

    }


    .tikipay-payment-overlay.open {

      display:
        flex;

    }


    .tikipay-payment-modal {

      width:
        min(
          420px,
          100%
        );

      max-height:
        90vh;

      overflow-y:
        auto;

      position:
        relative;

      background:
        #ffffff;

      border-radius:
        22px;

      padding:
        26px;

      box-shadow:
        0 26px 75px
        rgba(
          4,
          25,
          55,
          .28
        );

      transition:
        .25s ease;

    }


    .tikipay-payment-modal.payment-success-mode {

      width:
        min(
          460px,
          100%
        );

    }


    .tikipay-payment-close {

      position:
        absolute;

      right:
        16px;

      top:
        13px;

      width:
        36px;

      height:
        36px;

      border:
        0;

      border-radius:
        50%;

      background:
        #f3f7fb;

      color:
        #526b84;

      cursor:
        pointer;

      font-size:
        24px;

      z-index:
        2;

    }


    .tikipay-payment-icon {

      width:
        50px;

      height:
        50px;

      display:
        grid;

      place-items:
        center;

      border-radius:
        15px;

      margin-bottom:
        12px;

      background:
        #edf6ff;

      font-size:
        23px;

    }


    .tikipay-payment-label {

      display:
        block;

      margin-bottom:
        6px;

      color:
        #0497b9;

      font-size:
        11px;

      font-weight:
        900;

      text-transform:
        uppercase;

    }


    .tikipay-payment-modal h2 {

      margin:
        0 0 5px;

      color:
        #102744;

    }


    .tikipay-payment-provider {

      margin:
        0 0 18px;

      color:
        #73859a;

      font-size:
        13px;

    }


    .tikipay-payment-detail {

      display:
        flex;

      align-items:
        center;

      justify-content:
        space-between;

      gap:
        15px;

      padding:
        14px 0;

      border-top:
        1px solid
        #e5edf5;

    }


    .tikipay-payment-detail span {

      color:
        #667a91;

      font-size:
        13px;

    }


    .tikipay-payment-detail strong {

      color:
        #102744;

    }


    .tikipay-payment-variable {

      margin:
        8px 0 15px;

    }


    .tikipay-payment-variable label {

      display:
        block;

      margin-bottom:
        7px;

      color:
        #173c64;

      font-size:
        13px;

      font-weight:
        800;

    }


    .tikipay-payment-variable input {

      width:
        100%;

      padding:
        13px 14px;

      border:
        1px solid
        #ccdae8;

      border-radius:
        11px;

      outline:
        none;

      font-size:
        16px;

      box-sizing:
        border-box;

    }


    .tikipay-payment-variable input:focus {

      border-color:
        #087df4;

      box-shadow:
        0 0 0 3px
        rgba(
          8,
          125,
          244,
          .10
        );

    }


    .tikipay-payment-primary,
    .tikipay-payment-secondary {

      width:
        100%;

      min-height:
        44px;

      padding:
        12px 14px;

      border-radius:
        11px;

      font-weight:
        900;

      cursor:
        pointer;

      font-family:
        inherit;

    }


    .tikipay-payment-primary {

      border:
        0;

      color:
        #ffffff;

      background:
        linear-gradient(
          100deg,
          #0877f9,
          #08b8c7
        );

    }


    .tikipay-payment-primary:hover:not(:disabled) {

      filter:
        brightness(.98);

    }


    .tikipay-payment-primary:disabled {

      opacity:
        .6;

      cursor:
        default;

    }


    .tikipay-payment-secondary {

      border:
        1px solid
        #ccdae8;

      color:
        #145b9f;

      background:
        #ffffff;

    }


    .tikipay-payment-result {

      margin:
        12px 0;

      font-size:
        12px;

      text-align:
        center;

    }


    .tikipay-payment-result.error {

      padding:
        10px;

      border-radius:
        10px;

      color:
        #c93434;

      background:
        #fff0f0;

    }


    .tikipay-payment-result.loading {

      padding:
        10px;

      border-radius:
        10px;

      color:
        #1469aa;

      background:
        #edf6ff;

    }


    .tikipay-payment-result.success {

      padding:
        19px;

      border:
        1px solid
        #b9eccf;

      border-radius:
        17px;

      background:
        linear-gradient(
          180deg,
          #f4fff8,
          #edfbf3
        );

      text-align:
        left;

      animation:
        tikipayReceiptAppear
        .28s
        ease;

    }


    .tikipay-receipt-header {

      text-align:
        center;

      padding:
        2px 0 8px;

    }


    .tikipay-payment-success-icon {

      width:
        48px;

      height:
        48px;

      margin:
        0 auto;

      display:
        grid;

      place-items:
        center;

      border-radius:
        50%;

      background:
        linear-gradient(
          135deg,
          #0eb663,
          #02964e
        );

      color:
        #ffffff;

      font-size:
        25px;

      font-weight:
        900;

      box-shadow:
        0 9px 22px
        rgba(
          13,
          174,
          93,
          .22
        );

    }


    .tikipay-receipt-header h3 {

      margin:
        11px 0 5px !important;

      color:
        #087844 !important;

      font-size:
        20px;

    }


    .tikipay-receipt-header p {

      margin:
        0;

      color:
        #6c8175;

      font-size:
        12px;

    }


    .tikipay-receipt-divider {

      height:
        1px;

      background:
        #d6eee0;

      margin:
        13px 0;

    }


    .tikipay-receipt-row {

      display:
        flex;

      justify-content:
        space-between;

      align-items:
        flex-start;

      gap:
        16px;

      padding:
        10px 0;

      border-top:
        1px solid
        #d5eee0;

      color:
        #547064;

    }


    .tikipay-receipt-row:first-of-type {

      border-top:
        none;

    }


    .tikipay-receipt-row span {

      flex:
        0 0 auto;

    }


    .tikipay-receipt-row strong {

      color:
        #143829;

      text-align:
        right;

      word-break:
        break-word;

    }


    .tikipay-paid-amount {

      color:
        #078847 !important;

      font-size:
        16px;

    }


    .tikipay-payment-reference {

      display:
        flex;

      justify-content:
        space-between;

      align-items:
        center;

      gap:
        12px;

      padding:
        12px 0;

      border-top:
        1px solid
        #d6eee0;

      color:
        #71867b;

      font-size:
        10px;

    }


    .tikipay-payment-reference strong {

      color:
        #4f6a5d;

      font-family:
        monospace;

    }


    .tikipay-receipt-security {

      margin:
        4px 0
        15px;

      padding:
        10px 12px;

      border-radius:
        10px;

      background:
        #e3f8ed;

      color:
        #347354;

      font-size:
        10px;

      text-align:
        center;

    }


    .tikipay-receipt-actions {

      display:
        grid;

      grid-template-columns:
        1fr 1fr;

      gap:
        8px;

      margin-top:
        7px;

    }


    .tikipay-payment-security {

      margin:
        12px 0 0;

      text-align:
        center;

      color:
        #75889c;

      font-size:
        10px;

    }


    .tikipay-service-toast {

      position:
        fixed;

      z-index:
        100000;

      left:
        50%;

      bottom:
        82px;

      transform:
        translate(
          -50%,
          20px
        );

      width:
        max-content;

      max-width:
        calc(
          100% - 32px
        );

      padding:
        11px 16px;

      border-radius:
        12px;

      opacity:
        0;

      pointer-events:
        none;

      transition:
        .25s ease;

      color:
        #ffffff;

      font-size:
        12px;

      font-weight:
        800;

      box-shadow:
        0 12px 35px
        rgba(
          0,
          0,
          0,
          .16
        );

    }


    .tikipay-service-toast.visible {

      opacity:
        1;

      transform:
        translate(
          -50%,
          0
        );

    }


    .tikipay-service-toast.success {

      background:
        #0b9853;

    }


    .tikipay-service-toast.error {

      background:
        #d33a3a;

    }


    @keyframes tikipayReceiptAppear {

      from {

        opacity:
          0;

        transform:
          translateY(
            8px
          );

      }

      to {

        opacity:
          1;

        transform:
          translateY(
            0
          );

      }

    }


    @media (
      max-width:
      600px
    ) {

      .tikipay-payment-modal {

        padding:
          22px 18px;

        border-radius:
          18px;

      }


      .tikipay-payment-result.success {

        padding:
          15px;

      }


      .tikipay-receipt-actions {

        grid-template-columns:
          1fr;

      }


      .tikipay-receipt-row {

        gap:
          10px;

      }

    }

  `;


  document.head.appendChild(
    style
  );

}


// ======================================================
// INICIAR
// ======================================================

initServices();