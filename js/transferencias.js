// ======================================================
// TIKIPAY - TRANSFERENCIAS
// Transferencia normal + Pago mediante QR TikiPay
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
// CARGAR CUENTA
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
// MOSTRAR SALDO
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
// VALIDAR ESTADO CUENTA
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
      button.disabled = false;
    }


    return;

  }


  if (button) {
    button.disabled = true;
  }


  showTransferMessage(
    "Tu cuenta no puede realizar transferencias actualmente.",
    "error"
  );

}


// ======================================================
// DETECTAR MODO QR
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
      "No encontramos los datos del QR. Vuelve a escanearlo."
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
  // COMPATIBILIDAD CON QR V1
  // ====================================================

  loadLegacyQrPayment(
    storedData
  );

}


// ======================================================
// QR V2 - VOLVER A VERIFICAR CON SUPABASE
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
        "El código QR no contiene un destinatario TikiPay válido."
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
    "QR TikiPay cargado. Revisa el monto antes de continuar.",
    "success"
  );

}


// ======================================================
// LLENAR FORMULARIO DESDE QR
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


    /*
      Si el creador del QR especificó un monto,
      el usuario no debe cambiarlo desde la interfaz.
    */

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
// AVISO VISUAL QR
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
          "Tu cuenta no puede realizar transferencias actualmente.",
          "error"
        );


        return;

      }


      // ==================================================
      // QR V2: VERIFICAR OTRA VEZ ANTES DE CONFIRMAR
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
      // EN MODO QR, DESTINATARIO SIEMPRE DEL QR
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


        if (
          !description
        ) {

          description =
            qrPaymentContext.description
            ||
            "Pago mediante QR TikiPay";

        }

      }


      // ==================================================
      // VALIDAR DESTINATARIO
      // ==================================================

      if (!recipient) {

        showTransferMessage(
          "Ingresa un destinatario.",
          "error"
        );


        return;

      }


      // ==================================================
      // VALIDAR MONTO
      // ==================================================

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


      // ==================================================
      // DOS DECIMALES
      // ==================================================

      amount =
        Math.round(
          amount * 100
        ) / 100;


      // ==================================================
      // SALDO
      // ==================================================

      if (
        amount >
        Number(
          transferAccount
            .available_balance
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
            ? "QR"
            : "TRANSFER",

        qr_id:
          qrPaymentContext?.qr_id
          || null

      };


      showTransferConfirmation();

    }
  );


// ======================================================
// VOLVER A VALIDAR QR V2
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
          ? "No se pudo volver a verificar el QR."
          : secureQrErrorMessage(
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
// MOSTRAR CONFIRMACIÓN
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


  const modal =
    document.getElementById(
      "transferModal"
    );


  modal
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
    function () {

      closeTransferModal();

    }
  );


// ======================================================
// CONFIRMAR TRANSFERENCIA / PAGO QR
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
          translateTransferText(
            "Procesando transferencia..."
          );


      // ==================================================
      // SI ES QR V2, COMPROBAR VIGENCIA UNA VEZ MÁS
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


        pendingTransfer.recipient =
          qrPaymentContext.recipient;


        if (
          qrPaymentContext.fixed_amount
        ) {

          pendingTransfer.amount =
            qrPaymentContext.amount;

        }

      }


      // ==================================================
      // RPC SEGURA DE TRANSFERENCIA
      // ==================================================

      const {
        data,
        error
      } =
        await supabaseClient
          .rpc(
            "tikipay_transfer",
            {

              p_recipient:
                pendingTransfer
                  .recipient,

              p_amount:
                pendingTransfer
                  .amount,

              p_description:
                pendingTransfer
                  .description
                ||
                (
                  qrPaymentMode
                    ?
                    "Pago mediante QR TikiPay"
                    :
                    null
                )

            }
          );


      // ==================================================
      // ERROR
      // ==================================================

      if (error) {

        console.error(
          "Error transferencia:",
          error
        );


        closeTransferModal();


        showTransferMessage(
          transferErrorMessage(
            error
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
            translateTransferText(
              "Confirmar envío"
            );


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
          translateTransferText(
            "Confirmar envío"
          );


      closeTransferModal();


      handleTransferSuccess(
        data
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
  // ACTUALIZAR SALDO
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
      qrPaymentContext
        ?.recipient_name
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
  // CAMBIAR TÍTULO SI ES QR
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
  // EL QR YA FUE UTILIZADO POR ESTA SESIÓN
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
// NUEVA TRANSFERENCIA
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


      const formCard =
        document.getElementById(
          "transferFormCard"
        );


      const receipt =
        document.getElementById(
          "transferReceipt"
        );


      receipt
        ?.classList
        .remove(
          "visible"
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
// VER MOVIMIENTOS
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
// CLICK FUERA DEL MODAL
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
// MENSAJES DE ERROR QR
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
      "Este código QR ya venció. Solicita uno nuevo.",

    SELF_PAYMENT:
      "Este código QR pertenece a tu propia cuenta.",

    RECIPIENT_NOT_FOUND:
      "No se encontró la cuenta receptora de este QR."

  };


  return (
    messages[code]
    ||
    "Este código QR ya no puede utilizarse."
  );

}


// ======================================================
// ERRORES TRANSFERENCIA
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
      "RECIPIENT_NOT_FOUND"
    )
  ) {

    return (
      "No encontramos al destinatario."
    );

  }


  if (
    message.includes(
      "SELF_TRANSFER"
    )
  ) {

    return (
      "No puedes enviarte dinero a tu propia cuenta."
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
      "Tu cuenta tiene una restricción y no puede enviar dinero."
    );

  }


  if (
    message.includes(
      "RECIPIENT_RESTRICTED"
    )
  ) {

    return (
      "La cuenta del destinatario no puede recibir dinero."
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
      "El monto ingresado no es válido."
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
// VALIDAR TIKI-ID
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
// NORMALIZAR MONTO
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
// FECHA DEL QR
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
// TRADUCCIÓN
// ======================================================

function translateTransferText(
  text
) {

  if (
    typeof tikiT ===
    "function"
  ) {

    return tikiT(
      text
    );

  }


  return text;

}


// ======================================================
// MENSAJES
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
    text
      ?
      translateTransferText(
        text
      )
      :
      "";


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