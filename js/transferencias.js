// ======================================================
// TIKIPAY - TRANSFERENCIAS
// Transferencia normal + Pago QR seguro V2
// ======================================================

let transferSession = null;

let transferAccount = null;

let pendingTransfer = null;


// ======================================================
// CONTEXTO QR
// ======================================================

let qrPaymentMode = false;

let qrPaymentContext = null;


// ======================================================
// INICIO
// ======================================================

async function initTransfers() {

  try {

    transferSession =
      await requireAuth();


    if (!transferSession) {
      return;
    }


    await loadTransferAccount();


    if (!transferAccount) {
      return;
    }


    await initializeQrPaymentMode();


  } catch (error) {

    console.error(
      "Error iniciando transferencias:",
      error
    );


    showTransferMessage(
      "No se pudo iniciar el módulo de transferencias.",
      "error"
    );

  }

}


// ======================================================
// CUENTA
// ======================================================

async function loadTransferAccount() {

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
        transferSession.user.id
      )
      .single();


  if (
    error ||
    !data
  ) {

    console.error(
      "Error cargando cuenta:",
      error
    );


    showTransferMessage(
      "No se pudo cargar la cuenta.",
      "error"
    );


    return;
  }


  transferAccount =
    data;


  renderTransferBalance();

  validateAccountStatus();

}


// ======================================================
// SALDO
// ======================================================

function renderTransferBalance() {

  const element =
    document.getElementById(
      "transferBalance"
    );


  if (
    !element ||
    !transferAccount
  ) {
    return;
  }


  element.textContent =
    formatTransferMoney(
      transferAccount.available_balance,
      transferAccount.currency
    );

}


// ======================================================
// ESTADO CUENTA
// ======================================================

function validateAccountStatus() {

  if (!transferAccount) {
    return;
  }


  const button =
    document.getElementById(
      "continueTransferButton"
    );


  if (
    transferAccount.status ===
    "ACTIVE"
  ) {

    if (button) {

      button.disabled =
        false;

    }


    return;

  }


  if (button) {

    button.disabled =
      true;

  }


  showTransferMessage(
    "Tu cuenta no puede realizar operaciones actualmente.",
    "error"
  );

}


// ======================================================
// DETECTAR QR
// ======================================================

async function initializeQrPaymentMode() {

  const params =
    new URLSearchParams(
      window.location.search
    );


  const source =
    String(
      params.get("source") || ""
    )
      .trim()
      .toLowerCase();


  if (
    source !== "qr"
  ) {

    qrPaymentMode =
      false;

    return;

  }


  qrPaymentMode =
    true;


  createQrPaymentNotice();


  const raw =
    sessionStorage.getItem(
      "tikipay_qr_payment"
    );


  if (!raw) {

    invalidateQrPayment(
      "No encontramos los datos del código QR. Vuelve a escanearlo."
    );


    return;

  }


  let storedData;


  try {

    storedData =
      JSON.parse(
        raw
      );


  } catch (error) {

    console.error(
      "Datos QR inválidos:",
      error
    );


    invalidateQrPayment(
      "Los datos del código QR no son válidos."
    );


    return;

  }


  // ====================================================
  // QR SEGURO V2
  // ====================================================

  if (
    storedData?.qr_id
  ) {

    await loadSecureQrPayment(
      storedData.qr_id
    );


    return;

  }


  // ====================================================
  // QR LEGACY V1
  // ====================================================

  loadLegacyQrPayment(
    storedData
  );

}


// ======================================================
// CARGAR QR SEGURO V2
// ======================================================

async function loadSecureQrPayment(
  qrId
) {

  showTransferMessage(
    "Verificando código QR...",
    ""
  );


  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .rpc(
          "resolve_tikipay_payment_qr",
          {

            p_qr_id:
              qrId

          }
        );


    if (error) {

      console.error(
        "Error verificando QR:",
        error
      );


      invalidateQrPayment(
        "No se pudo verificar el código QR."
      );


      return;

    }


    if (
      !data ||
      data.ok !== true
    ) {

      invalidateQrPayment(
        secureQrErrorMessage(
          data
        )
      );


      return;

    }


    const tikiId =
      String(
        data.tiki_id || ""
      )
        .trim()
        .toUpperCase();


    if (
      !isValidTikiId(
        tikiId
      )
    ) {

      invalidateQrPayment(
        "El código QR no contiene un destinatario válido."
      );


      return;

    }


    const amount =
      normalizeTransferAmount(
        data.amount
      );


    qrPaymentContext = {

      version:
        2,

      qr_id:
        qrId,

      recipient:
        tikiId,

      recipient_name:
        String(
          data.full_name ||
          "Usuario TikiPay"
        ).trim(),

      amount:
        amount,

      fixed_amount:
        amount !== null,

      currency:
        String(
          data.currency ||
          "BOB"
        )
          .trim()
          .toUpperCase(),

      description:
        String(
          data.description ||
          ""
        )
          .trim()
          .slice(
            0,
            160
          ),

      expires_at:
        data.expires_at ||
        null,

      server_verified:
        true

    };


    populateQrTransferForm();


    showTransferMessage(
      "QR TikiPay verificado correctamente.",
      "success"
    );


  } catch (error) {

    console.error(
      "Error cargando pago QR:",
      error
    );


    invalidateQrPayment(
      "No se pudo preparar el pago QR."
    );

  }

}


// ======================================================
// QR ANTIGUO V1
// ======================================================

function loadLegacyQrPayment(
  data
) {

  const tikiId =
    String(
      data?.tiki_id ||
      data?.recipient ||
      data?.recipient_tiki_id ||
      ""
    )
      .trim()
      .toUpperCase();


  if (
    !isValidTikiId(
      tikiId
    )
  ) {

    invalidateQrPayment(
      "El código QR no contiene un destinatario TikiPay válido."
    );


    return;

  }


  qrPaymentContext = {

    version:
      1,

    qr_id:
      null,

    recipient:
      tikiId,

    recipient_name:
      String(
        data?.recipient_name ||
        ""
      ).trim(),

    amount:
      normalizeTransferAmount(
        data?.amount
      ),

    fixed_amount:
      false,

    currency:
      String(
        data?.currency ||
        "BOB"
      )
        .trim()
        .toUpperCase(),

    description:
      String(
        data?.description ||
        "Pago mediante QR TikiPay"
      )
        .trim()
        .slice(
          0,
          160
        ),

    expires_at:
      null,

    server_verified:
      false

  };


  populateQrTransferForm();


  showTransferMessage(
    "QR TikiPay cargado.",
    "success"
  );

}


// ======================================================
// RELLENAR FORMULARIO QR
// ======================================================

function populateQrTransferForm() {

  if (!qrPaymentContext) {
    return;
  }


  const recipientInput =
    document.getElementById(
      "recipientInput"
    );


  const amountInput =
    document.getElementById(
      "transferAmount"
    );


  const descriptionInput =
    document.getElementById(
      "transferDescription"
    );


  // ====================================================
  // DESTINATARIO
  // ====================================================

  if (recipientInput) {

    recipientInput.value =
      qrPaymentContext.recipient;


    recipientInput.readOnly =
      true;


    recipientInput.setAttribute(
      "aria-readonly",
      "true"
    );


    recipientInput.style.background =
      "#f0f7ff";


    recipientInput.style.fontWeight =
      "800";

  }


  // ====================================================
  // MONTO
  // ====================================================

  if (amountInput) {

    if (
      qrPaymentContext.amount !== null
    ) {

      amountInput.value =
        qrPaymentContext.amount
          .toFixed(2);

    } else {

      amountInput.value =
        "";

    }


    if (
      qrPaymentContext.fixed_amount
    ) {

      amountInput.readOnly =
        true;


      amountInput.setAttribute(
        "aria-readonly",
        "true"
      );


      amountInput.style.background =
        "#f0f7ff";


      amountInput.style.fontWeight =
        "900";

    } else {

      amountInput.readOnly =
        false;


      amountInput.removeAttribute(
        "aria-readonly"
      );

    }

  }


  // ====================================================
  // CONCEPTO
  // ====================================================

  if (descriptionInput) {

    descriptionInput.value =
      qrPaymentContext.description
      ||
      "Pago mediante QR TikiPay";

  }


  updateQrPaymentNotice();

}


// ======================================================
// AVISO QR
// ======================================================

function createQrPaymentNotice() {

  if (
    document.getElementById(
      "qrTransferNotice"
    )
  ) {
    return;
  }


  const balanceCard =
    document.querySelector(
      ".transfer-balance-card"
    );


  if (!balanceCard) {
    return;
  }


  const notice =
    document.createElement(
      "section"
    );


  notice.id =
    "qrTransferNotice";


  notice.style.cssText = `
    display:flex;
    align-items:center;
    gap:12px;
    margin-bottom:18px;
    padding:14px 16px;
    border:1px solid #7dd3fc;
    border-radius:15px;
    background:#ecfeff;
    color:#075985;
  `;


  notice.innerHTML = `

    <div
      style="
        width:40px;
        height:40px;
        min-width:40px;
        display:grid;
        place-items:center;
        border-radius:11px;
        background:linear-gradient(
          135deg,
          #0787ef,
          #06b6d4
        );
        color:white;
        font-size:18px;
      "
    >
      ▦
    </div>

    <div>

      <strong
        style="
          display:block;
          margin-bottom:3px;
          font-size:12px;
        "
      >
        Pago mediante QR TikiPay
      </strong>

      <span
        id="qrTransferNoticeText"
        style="
          display:block;
          font-size:10px;
          line-height:1.45;
        "
      >
        Verificando destinatario...
      </span>

    </div>

  `;


  balanceCard.parentNode
    .insertBefore(
      notice,
      balanceCard
    );

}


// ======================================================
// ACTUALIZAR AVISO QR
// ======================================================

function updateQrPaymentNotice() {

  const element =
    document.getElementById(
      "qrTransferNoticeText"
    );


  if (
    !element ||
    !qrPaymentContext
  ) {
    return;
  }


  let text =
    "Destinatario verificado mediante código QR TikiPay.";


  if (
    qrPaymentContext.recipient_name
  ) {

    text =
      `Pagar a ${qrPaymentContext.recipient_name} · ${qrPaymentContext.recipient}`;

  }


  if (
    qrPaymentContext.expires_at
  ) {

    text +=
      ` · Válido hasta ${formatQrTransferExpiry(qrPaymentContext.expires_at)}`;

  }


  element.textContent =
    text;

}


// ======================================================
// INVALIDAR QR
// ======================================================

function invalidateQrPayment(
  message
) {

  qrPaymentContext =
    null;


  const button =
    document.getElementById(
      "continueTransferButton"
    );


  if (button) {

    button.disabled =
      true;

  }


  showTransferMessage(
    message,
    "error"
  );


  const noticeText =
    document.getElementById(
      "qrTransferNoticeText"
    );


  if (noticeText) {

    noticeText.textContent =
      "No se pudo validar el código QR.";

  }

}


// ======================================================
// FORMULARIO
// ======================================================

document
  .getElementById(
    "transferForm"
  )
  ?.addEventListener(
    "submit",
    async function (
      event
    ) {

      event.preventDefault();


      if (!transferAccount) {
        return;
      }


      if (
        transferAccount.status !==
        "ACTIVE"
      ) {

        showTransferMessage(
          "Tu cuenta no puede realizar operaciones actualmente.",
          "error"
        );


        return;

      }


      // ==================================================
      // QR V2: REVALIDAR
      // ==================================================

      if (
        qrPaymentMode &&
        qrPaymentContext?.version === 2
      ) {

        const valid =
          await refreshSecureQrContext();


        if (!valid) {
          return;
        }

      }


      const recipientInput =
        document.getElementById(
          "recipientInput"
        );


      const amountInput =
        document.getElementById(
          "transferAmount"
        );


      const descriptionInput =
        document.getElementById(
          "transferDescription"
        );


      let recipient =
        String(
          recipientInput?.value ||
          ""
        ).trim();


      let amount =
        Number(
          amountInput?.value
        );


      let description =
        String(
          descriptionInput?.value ||
          ""
        ).trim();


      // ==================================================
      // MODO QR
      // ==================================================

      if (
        qrPaymentMode &&
        qrPaymentContext
      ) {

        recipient =
          qrPaymentContext.recipient;


        if (
          qrPaymentContext.fixed_amount
        ) {

          amount =
            qrPaymentContext.amount;

        }


        if (!description) {

          description =
            qrPaymentContext.description
            ||
            "Pago mediante QR TikiPay";

        }

      }


      // ==================================================
      // VALIDACIONES
      // ==================================================

      if (!recipient) {

        showTransferMessage(
          "Ingresa un destinatario.",
          "error"
        );


        return;

      }


      if (
        !Number.isFinite(
          amount
        ) ||
        amount <= 0
      ) {

        showTransferMessage(
          "Ingresa un monto válido.",
          "error"
        );


        return;

      }


      amount =
        Math.round(
          amount * 100
        ) / 100;


      if (
        amount >
        Number(
          transferAccount.available_balance
        )
      ) {

        showTransferMessage(
          "Saldo insuficiente.",
          "error"
        );


        return;

      }


      pendingTransfer = {

        recipient,

        amount,

        description,

        source:
          qrPaymentMode
            ?
            "QR"
            :
            "TRANSFER",

        qr_id:
          qrPaymentContext?.qr_id
          ||
          null,

        qr_version:
          qrPaymentContext?.version
          ||
          null

      };


      showTransferConfirmation();

    }
  );


// ======================================================
// REVALIDAR QR V2
// ======================================================

async function refreshSecureQrContext() {

  if (
    !qrPaymentContext?.qr_id
  ) {

    invalidateQrPayment(
      "No encontramos el identificador seguro del QR."
    );


    return false;

  }


  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .rpc(
          "resolve_tikipay_payment_qr",
          {

            p_qr_id:
              qrPaymentContext.qr_id

          }
        );


    if (
      error ||
      !data ||
      data.ok !== true
    ) {

      console.error(
        "QR dejó de ser válido:",
        error || data
      );


      invalidateQrPayment(
        error
          ?
          "No se pudo volver a verificar el QR."
          :
          secureQrErrorMessage(
            data
          )
      );


      return false;

    }


    const verifiedRecipient =
      String(
        data.tiki_id || ""
      )
        .trim()
        .toUpperCase();


    if (
      !isValidTikiId(
        verifiedRecipient
      )
    ) {

      invalidateQrPayment(
        "El destinatario del QR ya no es válido."
      );


      return false;

    }


    qrPaymentContext.recipient =
      verifiedRecipient;


    qrPaymentContext.recipient_name =
      String(
        data.full_name ||
        "Usuario TikiPay"
      ).trim();


    qrPaymentContext.amount =
      normalizeTransferAmount(
        data.amount
      );


    qrPaymentContext.fixed_amount =
      qrPaymentContext.amount !==
      null;


    qrPaymentContext.description =
      String(
        data.description ||
        qrPaymentContext.description ||
        ""
      )
        .trim()
        .slice(
          0,
          160
        );


    qrPaymentContext.currency =
      String(
        data.currency ||
        "BOB"
      )
        .trim()
        .toUpperCase();


    qrPaymentContext.expires_at =
      data.expires_at ||
      null;


    populateQrTransferForm();


    return true;


  } catch (error) {

    console.error(
      "Error revalidando QR:",
      error
    );


    invalidateQrPayment(
      "No se pudo comprobar nuevamente el QR."
    );


    return false;

  }

}


// ======================================================
// MODAL CONFIRMACIÓN
// ======================================================

function showTransferConfirmation() {

  if (!pendingTransfer) {
    return;
  }


  setTransferText(
    "confirmRecipient",

    qrPaymentMode &&
    qrPaymentContext?.recipient_name
      ?
      (
        qrPaymentContext
          .recipient_name
        +
        " · "
        +
        pendingTransfer.recipient
      )
      :
      pendingTransfer.recipient
  );


  setTransferText(
    "confirmAmount",

    formatTransferMoney(
      pendingTransfer.amount,
      transferAccount.currency
    )
  );


  setTransferText(
    "confirmDescription",

    pendingTransfer.description
    ||
    (
      qrPaymentMode
        ?
        "Pago mediante QR TikiPay"
        :
        "Transferencia TikiPay"
    )
  );


  const title =
    document.querySelector(
      "#transferModal h2"
    );


  if (title) {

    title.textContent =
      qrPaymentMode
        ?
        "Confirmar pago QR"
        :
        "Confirmar transferencia";

  }


  const description =
    document.querySelector(
      "#transferModal .transfer-modal-description"
    );


  if (description) {

    description.textContent =
      qrPaymentMode
        ?
        "Revisa los datos antes de realizar el pago."
        :
        "Revisa los datos antes de enviar.";

  }


  const confirmButton =
    document.getElementById(
      "confirmTransferButton"
    );


  if (confirmButton) {

    confirmButton.textContent =
      qrPaymentMode
        ?
        "Confirmar pago"
        :
        "Confirmar envío";

  }


  document
    .getElementById(
      "transferModal"
    )
    ?.classList
    .add(
      "visible"
    );

}


// ======================================================
// CANCELAR
// ======================================================

document
  .getElementById(
    "cancelTransferButton"
  )
  ?.addEventListener(
    "click",
    closeTransferModal
  );


// ======================================================
// CONFIRMAR OPERACIÓN
// ======================================================

document
  .getElementById(
    "confirmTransferButton"
  )
  ?.addEventListener(
    "click",
    async function () {

      if (!pendingTransfer) {
        return;
      }


      const button =
        this;


      button.disabled =
        true;


      button.textContent =
        qrPaymentMode
          ?
          "Procesando pago..."
          :
          "Procesando transferencia...";


      // ==================================================
      // QR V2
      // ==================================================

      if (
        qrPaymentMode &&
        qrPaymentContext?.version === 2
      ) {

        const valid =
          await refreshSecureQrContext();


        if (!valid) {

          closeTransferModal();


          button.disabled =
            false;


          button.textContent =
            "Confirmar pago";


          return;

        }


        /*
          Actualizar datos desde la última
          respuesta verificada del servidor.
        */

        pendingTransfer.recipient =
          qrPaymentContext.recipient;


        if (
          qrPaymentContext.fixed_amount
        ) {

          pendingTransfer.amount =
            qrPaymentContext.amount;

        }

      }


      let rpcData = null;

      let rpcError = null;


      // ==================================================
      // PAGO QR V2 SEGURO
      // ==================================================

      if (
        qrPaymentMode &&
        qrPaymentContext?.version === 2 &&
        qrPaymentContext?.qr_id
      ) {

        const response =
          await supabaseClient
            .rpc(
              "tikipay_qr_payment",
              {

                p_qr_id:
                  qrPaymentContext.qr_id,

                p_amount:
                  pendingTransfer.amount,

                p_description:
                  pendingTransfer.description
                  ||
                  null

              }
            );


        rpcData =
          response.data;


        rpcError =
          response.error;

      }


      // ==================================================
      // TRANSFERENCIA NORMAL / QR V1
      // ==================================================

      else {

        const response =
          await supabaseClient
            .rpc(
              "tikipay_transfer",
              {

                p_recipient:
                  pendingTransfer.recipient,

                p_amount:
                  pendingTransfer.amount,

                p_description:
                  pendingTransfer.description
                  ||
                  null

              }
            );


        rpcData =
          response.data;


        rpcError =
          response.error;

      }


      // ==================================================
      // ERROR
      // ==================================================

      if (rpcError) {

        console.error(
          "Error operación:",
          rpcError
        );


        closeTransferModal();


        showTransferMessage(
          transferErrorMessage(
            rpcError
          ),
          "error"
        );


        button.disabled =
          false;


        button.textContent =
          qrPaymentMode
            ?
            "Confirmar pago"
            :
            "Confirmar envío";


        return;

      }


      // ==================================================
      // ÉXITO
      // ==================================================

      button.disabled =
        false;


      button.textContent =
        qrPaymentMode
          ?
          "Confirmar pago"
          :
          "Confirmar envío";


      closeTransferModal();


      handleTransferSuccess(
        rpcData
      );

    }
  );


// ======================================================
// ÉXITO
// ======================================================

function handleTransferSuccess(
  result
) {

  if (!result) {

    showTransferMessage(
      qrPaymentMode
        ?
        "El pago fue procesado."
        :
        "La transferencia fue procesada.",
      "success"
    );


    return;

  }


  // ====================================================
  // SALDO NUEVO
  // ====================================================

  transferAccount.available_balance =
    Number(
      result.new_balance
    );


  renderTransferBalance();


  // ====================================================
  // RECIBO
  // ====================================================

  setTransferText(
    "receiptRecipient",

    (
      result.recipient_name
      ||
      qrPaymentContext?.recipient_name
      ||
      "Usuario TikiPay"
    )
    +
    " · "
    +
    (
      result.recipient_tiki_id
      ||
      pendingTransfer?.recipient
      ||
      ""
    )
  );


  setTransferText(
    "receiptAmount",

    formatTransferMoney(
      result.amount,
      result.currency
      ||
      transferAccount.currency
    )
  );


  setTransferText(
    "receiptBalance",

    formatTransferMoney(
      result.new_balance,
      result.currency
      ||
      transferAccount.currency
    )
  );


  setTransferText(
    "receiptTransaction",

    result.transaction_id
    ||
    "—"
  );


  // ====================================================
  // TÍTULO
  // ====================================================

  const receiptTitle =
    document.querySelector(
      "#transferReceipt h2"
    );


  if (receiptTitle) {

    receiptTitle.textContent =
      qrPaymentMode
        ?
        "Pago QR realizado"
        :
        "Transferencia realizada";

  }


  const formCard =
    document.getElementById(
      "transferFormCard"
    );


  const receipt =
    document.getElementById(
      "transferReceipt"
    );


  if (formCard) {

    formCard.style.display =
      "none";

  }


  receipt
    ?.classList
    .add(
      "visible"
    );


  // ====================================================
  // LIMPIAR QR DE SESIÓN
  // ====================================================

  if (qrPaymentMode) {

    sessionStorage.removeItem(
      "tikipay_qr_payment"
    );

  }


  pendingTransfer =
    null;


  showTransferMessage(
    "",
    ""
  );

}


// ======================================================
// NUEVA OPERACIÓN
// ======================================================

document
  .getElementById(
    "newTransferButton"
  )
  ?.addEventListener(
    "click",
    function () {

      if (qrPaymentMode) {

        window.location.href =
          "pagar-qr.html";


        return;

      }


      document
        .getElementById(
          "transferReceipt"
        )
        ?.classList
        .remove(
          "visible"
        );


      const formCard =
        document.getElementById(
          "transferFormCard"
        );


      if (formCard) {

        formCard.style.display =
          "block";

      }


      document
        .getElementById(
          "transferForm"
        )
        ?.reset();


      showTransferMessage(
        "",
        ""
      );

    }
  );


// ======================================================
// MOVIMIENTOS
// ======================================================

document
  .getElementById(
    "goMovementsButton"
  )
  ?.addEventListener(
    "click",
    function () {

      window.location.href =
        "movimientos.html";

    }
  );


// ======================================================
// CERRAR MODAL
// ======================================================

function closeTransferModal() {

  document
    .getElementById(
      "transferModal"
    )
    ?.classList
    .remove(
      "visible"
    );

}


// ======================================================
// CLICK FUERA
// ======================================================

document
  .getElementById(
    "transferModal"
  )
  ?.addEventListener(
    "click",
    function (
      event
    ) {

      if (
        event.target ===
        this
      ) {

        closeTransferModal();

      }

    }
  );


// ======================================================
// ESC
// ======================================================

document.addEventListener(
  "keydown",
  function (
    event
  ) {

    if (
      event.key ===
      "Escape"
    ) {

      closeTransferModal();

    }

  }
);


// ======================================================
// MENSAJES QR
// ======================================================

function secureQrErrorMessage(
  result
) {

  const code =
    String(
      result?.error || ""
    )
      .trim()
      .toUpperCase();


  const messages = {

    AUTH_REQUIRED:
      "Tu sesión expiró. Inicia sesión nuevamente.",

    QR_NOT_FOUND:
      "Este código QR no existe en TikiPay.",

    QR_REVOKED:
      "Este código QR fue desactivado.",

    QR_EXPIRED:
      "Este código QR venció. Solicita uno nuevo.",

    SELF_PAYMENT:
      "Este código QR pertenece a tu propia cuenta.",

    RECIPIENT_NOT_FOUND:
      "No se encontró la cuenta receptora."

  };


  return (
    messages[code]
    ||
    "Este código QR ya no puede utilizarse."
  );

}


// ======================================================
// ERRORES RPC
// ======================================================

function transferErrorMessage(
  error
) {

  const message =
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
    message.includes(
      "QR_AMOUNT_MISMATCH"
    )
  ) {

    return (
      "El monto del pago no coincide con el monto definido por el QR."
    );

  }


  if (
    message.includes(
      "QR_EXPIRED"
    )
  ) {

    return (
      "Este código QR ya venció."
    );

  }


  if (
    message.includes(
      "QR_REVOKED"
    )
  ) {

    return (
      "Este código QR fue desactivado."
    );

  }


  if (
    message.includes(
      "QR_NOT_FOUND"
    )
  ) {

    return (
      "Este código QR ya no existe."
    );

  }


  if (
    message.includes(
      "QR_CURRENCY_MISMATCH"
    )
  ) {

    return (
      "La moneda del QR no coincide con la moneda de tu cuenta."
    );

  }


  if (
    message.includes(
      "SELF_PAYMENT"
    ) ||
    message.includes(
      "SELF_TRANSFER"
    )
  ) {

    return (
      "No puedes realizar un pago a tu propia cuenta."
    );

  }


  if (
    message.includes(
      "RECIPIENT_NOT_FOUND"
    ) ||
    message.includes(
      "RECIPIENT_ACCOUNT_NOT_FOUND"
    )
  ) {

    return (
      "No encontramos la cuenta del destinatario."
    );

  }


  if (
    message.includes(
      "INSUFFICIENT_BALANCE"
    )
  ) {

    return (
      "Saldo insuficiente."
    );

  }


  if (
    message.includes(
      "SENDER_RESTRICTED"
    )
  ) {

    return (
      "Tu cuenta tiene una restricción y no puede realizar el pago."
    );

  }


  if (
    message.includes(
      "RECIPIENT_RESTRICTED"
    )
  ) {

    return (
      "La cuenta receptora no puede recibir dinero."
    );

  }


  if (
    message.includes(
      "CURRENCY_MISMATCH"
    )
  ) {

    return (
      "Las cuentas utilizan monedas diferentes."
    );

  }


  if (
    message.includes(
      "INVALID_AMOUNT"
    )
  ) {

    return (
      "El monto no es válido."
    );

  }


  if (
    message.includes(
      "AMOUNT_PRECISION"
    )
  ) {

    return (
      "El monto puede tener como máximo dos decimales."
    );

  }


  if (
    message.includes(
      "NOT_AUTHENTICATED"
    )
  ) {

    return (
      "Tu sesión expiró. Vuelve a iniciar sesión."
    );

  }


  return (
    "No se pudo realizar la operación."
  );

}


// ======================================================
// TIKI-ID
// ======================================================

function isValidTikiId(
  value
) {

  return (
    /^TIKI-[A-Z0-9]+$/
  ).test(
    String(
      value || ""
    )
      .trim()
      .toUpperCase()
  );

}


// ======================================================
// MONTO
// ======================================================

function normalizeTransferAmount(
  value
) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return null;

  }


  const amount =
    Number(
      value
    );


  if (
    !Number.isFinite(
      amount
    ) ||
    amount <= 0
  ) {

    return null;

  }


  return (
    Math.round(
      amount * 100
    ) / 100
  );

}


// ======================================================
// FECHA QR
// ======================================================

function formatQrTransferExpiry(
  value
) {

  if (!value) {
    return "—";
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

    return "—";

  }


  return date.toLocaleString(
    "es-BO",
    {

      timeZone:
        "America/La_Paz",

      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",

      hour12:
        false

    }
  );

}


// ======================================================
// MONEDA
// ======================================================

function formatTransferMoney(
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
    )
      .trim()
      .toUpperCase();


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
// MENSAJE
// ======================================================

function showTransferMessage(
  text,
  type = ""
) {

  const element =
    document.getElementById(
      "transferMessage"
    );


  if (!element) {
    return;
  }


  element.textContent =
    text || "";


  element.className =
    type
      ?
      "transfer-message " +
      type
      :
      "transfer-message";

}


// ======================================================
// TEXTO
// ======================================================

function setTransferText(
  id,
  text
) {

  const element =
    document.getElementById(
      id
    );


  if (!element) {
    return;
  }


  element.textContent =
    text === null ||
    text === undefined ||
    text === ""
      ?
      "—"
      :
      String(
        text
      );

}


// ======================================================
// INICIAR
// ======================================================

initTransfers();