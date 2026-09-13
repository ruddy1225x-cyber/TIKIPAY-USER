// ======================================================
// TIKIPAY - TRANSFERENCIAS
// ======================================================

let transferSession =
  null;

let transferAccount =
  null;

let pendingTransfer =
  null;


// ======================================================
// INICIO
// ======================================================

async function initTransfers() {

  transferSession =
    await requireAuth();


  if (!transferSession) {
    return;
  }


  await loadTransferAccount();

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
// VALIDAR ESTADO
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
// FORMULARIO
// ======================================================

document
  .getElementById(
    "transferForm"
  )
  ?.addEventListener(
    "submit",
    function (event) {

      event.preventDefault();


      if (
        !transferAccount
      ) {
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


      const recipient =
        document
          .getElementById(
            "recipientInput"
          )
          .value
          .trim();


      const amountRaw =
        document
          .getElementById(
            "transferAmount"
          )
          .value;


      const amount =
        Number(
          amountRaw
        );


      const description =
        document
          .getElementById(
            "transferDescription"
          )
          .value
          .trim();


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
        )
        ||
        amount <= 0
      ) {

        showTransferMessage(
          "Ingresa un monto válido.",
          "error"
        );

        return;
      }


      // ==================================================
      // SOLO DOS DECIMALES
      // ==================================================

      if (
        Math.round(
          amount * 100
        ) / 100 !== amount
      ) {

        showTransferMessage(
          "El monto puede tener como máximo dos decimales.",
          "error"
        );

        return;
      }


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

        description

      };


      showTransferConfirmation();

    }
  );


// ======================================================
// MOSTRAR CONFIRMACIÓN
// ======================================================

function showTransferConfirmation() {

  if (!pendingTransfer) {
    return;
  }


  setTransferText(
    "confirmRecipient",
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
      || "Transferencia TikiPay"
  );


  const modal =
    document.getElementById(
      "transferModal"
    );


  if (modal) {

    modal.classList.add(
      "visible"
    );

  }

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
// CONFIRMAR
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
        translateTransferText(
          "Procesando transferencia..."
        );


      // ==================================================
      // RPC SEGURA
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
                || null

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
      "La transferencia fue procesada.",
      "success"
    );


    return;
  }


  // Actualizar saldo local

  transferAccount.available_balance =
    Number(
      result.new_balance
    );


  renderTransferBalance();


  // Recibo

  setTransferText(
    "receiptRecipient",

    result.recipient_name
    +
    " · "
    +
    result.recipient_tiki_id
  );


  setTransferText(
    "receiptAmount",

    formatTransferMoney(
      result.amount,
      result.currency
    )
  );


  setTransferText(
    "receiptBalance",

    formatTransferMoney(
      result.new_balance,
      result.currency
    )
  );


  setTransferText(
    "receiptTransaction",
    result.transaction_id
  );


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


  if (receipt) {

    receipt.classList.add(
      "visible"
    );

  }


  document
    .getElementById(
      "transferForm"
    )
    ?.reset();


  pendingTransfer =
    null;

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

      const formCard =
        document.getElementById(
          "transferFormCard"
        );


      const receipt =
        document.getElementById(
          "transferReceipt"
        );


      if (receipt) {

        receipt.classList.remove(
          "visible"
        );

      }


      if (formCard) {

        formCard.style.display =
          "block";

      }


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

  const modal =
    document.getElementById(
      "transferModal"
    );


  if (modal) {

    modal.classList.remove(
      "visible"
    );

  }

}


// ======================================================
// CERRAR AL HACER CLICK FUERA
// ======================================================

document
  .getElementById(
    "transferModal"
  )
  ?.addEventListener(
    "click",
    function (event) {

      if (
        event.target ===
        this
      ) {

        closeTransferModal();

      }

    }
  );


// ======================================================
// ERRORES DEL SERVIDOR
// ======================================================

function transferErrorMessage(
  error
) {

  const message =
    String(
      error?.message
      || ""
    )
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
    "No se pudo realizar la transferencia."
  );

}


// ======================================================
// MONEDA
// ======================================================

function formatTransferMoney(
  amount,
  currency
) {

  const value =
    Number(
      amount || 0
    );


  if (
    currency === "BOB"
  ) {

    return formatBOB(
      value
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
    currency
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
  type
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
      ? translateTransferText(
          text
        )
      : "";


  element.className =
    type
      ? "transfer-message " +
        type
      : "transfer-message";

}


// ======================================================
// TEXTO
// ======================================================

function setTransferText(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );


  if (element) {

    element.textContent =
      value ?? "";

  }

}


// ======================================================
// INICIAR
// ======================================================

initTransfers();