// ======================================================
// TIKIPAY - PAGAR CON QR
// Cámara + galería + QR seguro v2
// ======================================================

let qrPaySession = null;

let qrScanner = null;

let qrScannerRunning = false;

let qrProcessing = false;

let scannedTikiPayData = null;

let currentUserTikiId = "";

let selectedQrImageUrl = null;


// ======================================================
// INICIO
// ======================================================

async function initQrPayment() {

  try {

    qrPaySession =
      await requireAuth();


    if (!qrPaySession) {
      return;
    }


    await loadCurrentTikiId();

    bindQrPaymentEvents();


  } catch (error) {

    console.error(
      "Error iniciando Pago QR:",
      error
    );


    showQrMessage(
      "No se pudo iniciar el módulo de pago QR.",
      "error"
    );

  }

}


// ======================================================
// TIKI-ID DEL USUARIO ACTUAL
// ======================================================

async function loadCurrentTikiId() {

  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("profiles")
        .select("tiki_id")
        .eq(
          "id",
          qrPaySession.user.id
        )
        .single();


    if (error) {

      console.error(
        "Error cargando TIKI-ID:",
        error
      );

      return;

    }


    currentUserTikiId =
      String(
        data?.tiki_id || ""
      )
        .trim()
        .toUpperCase();


  } catch (error) {

    console.error(
      "Error cargando usuario actual:",
      error
    );

  }

}


// ======================================================
// EVENTOS
// ======================================================

function bindQrPaymentEvents() {

  const cameraButton =
    document.getElementById(
      "startQrScanner"
    );


  const fileInput =
    document.getElementById(
      "qrImageInput"
    );


  const galleryLabel =
    document.getElementById(
      "selectQrImageLabel"
    );


  const continueButton =
    document.getElementById(
      "continueQrPayment"
    );


  const scanAgainButton =
    document.getElementById(
      "scanAnotherQr"
    );


  // CÁMARA

  cameraButton
    ?.addEventListener(
      "click",
      startQrScanner
    );


  // GALERÍA

  fileInput
    ?.addEventListener(
      "change",
      handleQrImageSelected
    );


  // ACCESIBILIDAD PARA GALERÍA

  galleryLabel
    ?.addEventListener(
      "keydown",
      function (event) {

        if (
          event.key === "Enter" ||
          event.key === " "
        ) {

          event.preventDefault();

          fileInput?.click();

        }

      }
    );


  // CONTINUAR

  continueButton
    ?.addEventListener(
      "click",
      continueQrPayment
    );


  // ESCANEAR OTRO

  scanAgainButton
    ?.addEventListener(
      "click",
      resetQrScanner
    );


  // SALIR

  window.addEventListener(
    "beforeunload",
    function () {

      stopQrScanner();

      clearSelectedImageUrl();

    }
  );

}


// ======================================================
// IMAGEN DESDE GALERÍA
// ======================================================

async function handleQrImageSelected(
  event
) {

  const file =
    event.target
      ?.files
      ?.[0];


  if (!file) {
    return;
  }


  if (
    !file.type ||
    !file.type.startsWith("image/")
  ) {

    showQrMessage(
      "Selecciona una imagen válida.",
      "error"
    );

    event.target.value =
      "";

    return;

  }


  // Máximo 15 MB

  if (
    file.size >
    15 * 1024 * 1024
  ) {

    showQrMessage(
      "La imagen es demasiado grande. Selecciona una imagen menor a 15 MB.",
      "error"
    );

    event.target.value =
      "";

    return;

  }


  if (qrProcessing) {
    return;
  }


  qrProcessing =
    true;


  scannedTikiPayData =
    null;


  hideQrResult();


  await stopQrScanner();


  showSelectedQrImage(
    file
  );


  showQrMessage(
    "Analizando código QR...",
    "info"
  );


  setQrStep(
    1
  );


  try {

    const decodedText =
      await decodeQrImageFile(
        file
      );


    if (!decodedText) {

      throw new Error(
        "QR_EMPTY"
      );

    }


    console.log(
      "QR leído desde galería:",
      decodedText
    );


    await processDecodedQr(
      decodedText
    );


  } catch (error) {

    console.error(
      "Error leyendo QR desde imagen:",
      error
    );


    scannedTikiPayData =
      null;


    showQrMessage(
      "No pudimos detectar un código QR válido en esta imagen. Usa una captura donde el QR aparezca completo y con buena calidad.",
      "error"
    );


    showQrMethods();


  } finally {

    qrProcessing =
      false;


    if (event.target) {

      event.target.value =
        "";

    }

  }

}


// ======================================================
// LEER QR DESDE ARCHIVO
// ======================================================

async function decodeQrImageFile(
  file
) {

  if (
    typeof Html5Qrcode ===
    "undefined"
  ) {

    throw new Error(
      "HTML5_QRCODE_NOT_LOADED"
    );

  }


  const temporaryId =
    "tikipayQrFileReader";


  document
    .getElementById(
      temporaryId
    )
    ?.remove();


  const temporaryContainer =
    document.createElement(
      "div"
    );


  temporaryContainer.id =
    temporaryId;


  /*
    El lector necesita dimensiones reales.
    Lo dejamos fuera de la pantalla.
  */

  temporaryContainer.style.position =
    "fixed";

  temporaryContainer.style.left =
    "-10000px";

  temporaryContainer.style.top =
    "0";

  temporaryContainer.style.width =
    "700px";

  temporaryContainer.style.height =
    "700px";

  temporaryContainer.style.opacity =
    "0";

  temporaryContainer.style.pointerEvents =
    "none";

  temporaryContainer.style.zIndex =
    "-9999";


  document.body.appendChild(
    temporaryContainer
  );


  let fileScanner =
    null;


  try {

    fileScanner =
      new Html5Qrcode(
        temporaryId,
        {
          verbose: false
        }
      );


    const decodedText =
      await fileScanner.scanFile(
        file,
        false
      );


    return decodedText;


  } finally {

    if (fileScanner) {

      try {

        await fileScanner.clear();

      } catch {
        // No crítico
      }

    }


    temporaryContainer.remove();

  }

}


// ======================================================
// MOSTRAR IMAGEN SELECCIONADA
// ======================================================

function showSelectedQrImage(
  file
) {

  clearSelectedImageUrl();


  selectedQrImageUrl =
    URL.createObjectURL(
      file
    );


  const preview =
    document.getElementById(
      "qrImagePreview"
    );


  const image =
    document.getElementById(
      "qrPreviewImage"
    );


  const placeholder =
    document.getElementById(
      "qrPlaceholder"
    );


  const reader =
    document.getElementById(
      "qrReader"
    );


  if (placeholder) {

    placeholder.style.display =
      "none";

  }


  if (reader) {

    reader.style.display =
      "none";

  }


  if (image) {

    image.src =
      selectedQrImageUrl;

  }


  preview
    ?.classList
    .add(
      "visible"
    );

}


// ======================================================
// OCULTAR IMAGEN
// ======================================================

function hideSelectedQrImage() {

  document
    .getElementById(
      "qrImagePreview"
    )
    ?.classList
    .remove(
      "visible"
    );


  const image =
    document.getElementById(
      "qrPreviewImage"
    );


  if (image) {

    image.removeAttribute(
      "src"
    );

  }


  clearSelectedImageUrl();

}


// ======================================================
// LIMPIAR URL TEMPORAL
// ======================================================

function clearSelectedImageUrl() {

  if (!selectedQrImageUrl) {
    return;
  }


  URL.revokeObjectURL(
    selectedQrImageUrl
  );


  selectedQrImageUrl =
    null;

}


// ======================================================
// CÁMARA
// ======================================================

async function startQrScanner() {

  if (
    qrScannerRunning ||
    qrProcessing
  ) {

    return;

  }


  if (
    typeof Html5Qrcode ===
    "undefined"
  ) {

    showQrMessage(
      "No se pudo cargar el lector QR.",
      "error"
    );

    return;

  }


  scannedTikiPayData =
    null;


  hideQrResult();

  hideSelectedQrImage();


  const placeholder =
    document.getElementById(
      "qrPlaceholder"
    );


  const reader =
    document.getElementById(
      "qrReader"
    );


  if (placeholder) {

    placeholder.style.display =
      "none";

  }


  if (reader) {

    reader.innerHTML =
      "";

    reader.style.display =
      "block";

  }


  showQrMessage(
    "Solicitando permiso para usar la cámara...",
    "info"
  );


  setQrCameraButtonState(
    true
  );


  try {

    qrScanner =
      new Html5Qrcode(
        "qrReader",
        {
          verbose: false
        }
      );


    await qrScanner.start(

      {
        facingMode:
          "environment"
      },

      {

        fps:
          10,


        qrbox:
          function (
            viewfinderWidth,
            viewfinderHeight
          ) {

            const minimum =
              Math.min(
                viewfinderWidth,
                viewfinderHeight
              );


            const size =
              Math.floor(
                minimum * 0.72
              );


            return {

              width:
                size,

              height:
                size

            };

          }

      },

      onQrScanned,

      function () {
        // Buscar continuamente.
      }

    );


    qrScannerRunning =
      true;


    setQrCameraButtonState(
      false
    );


    showQrMessage(
      "Apunta la cámara hacia un código QR TikiPay.",
      "info"
    );


  } catch (error) {

    console.error(
      "Error iniciando cámara:",
      error
    );


    qrScannerRunning =
      false;

    qrScanner =
      null;


    if (reader) {

      reader.style.display =
        "none";

    }


    if (placeholder) {

      placeholder.style.display =
        "flex";

    }


    setQrCameraButtonState(
      false
    );


    showQrMessage(
      cameraErrorMessage(
        error
      ),
      "error"
    );

  }

}


// ======================================================
// QR LEÍDO POR CÁMARA
// ======================================================

async function onQrScanned(
  decodedText
) {

  if (
    !decodedText ||
    qrProcessing ||
    scannedTikiPayData
  ) {

    return;

  }


  qrProcessing =
    true;


  try {

    await processDecodedQr(
      decodedText
    );


  } finally {

    qrProcessing =
      false;

  }

}


// ======================================================
// PROCESAR CONTENIDO QR
// ======================================================

async function processDecodedQr(
  rawValue
) {

  let qrData;


  try {

    qrData =
      JSON.parse(
        String(
          rawValue
        ).trim()
      );


  } catch {

    showQrMessage(
      "Este código QR no corresponde a TikiPay.",
      "error"
    );

    return;

  }


  if (
    !qrData ||
    typeof qrData !==
      "object" ||
    Array.isArray(
      qrData
    )
  ) {

    showQrMessage(
      "El QR no contiene información válida.",
      "error"
    );

    return;

  }


  const app =
    String(
      qrData.app || ""
    )
      .trim()
      .toLowerCase();


  if (
    app !==
    "tikipay"
  ) {

    showQrMessage(
      "Este QR no pertenece a TikiPay.",
      "error"
    );

    return;

  }


  const type =
    String(
      qrData.type || ""
    )
      .trim()
      .toUpperCase();


  // ====================================================
  // QR SEGURO VERSIÓN 2
  // ====================================================

  if (
    type ===
    "PAYMENT_REQUEST"
  ) {

    await processSecureQrV2(
      qrData
    );

    return;

  }


  // ====================================================
  // QR ANTIGUO V1
  // ====================================================

  if (
    type ===
    "RECEIVE"
  ) {

    await processLegacyQr(
      qrData
    );

    return;

  }


  showQrMessage(
    "Este tipo de QR TikiPay no es compatible.",
    "error"
  );

}


// ======================================================
// PROCESAR QR V2
// ======================================================

async function processSecureQrV2(
  qrData
) {

  const qrId =
    String(
      qrData.qr_id || ""
    ).trim();


  if (
    !isValidUuid(
      qrId
    )
  ) {

    showQrMessage(
      "El identificador de este QR no es válido.",
      "error"
    );

    return;

  }


  showQrMessage(
    "Verificando QR con TikiPay...",
    "info"
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
        "Error resolviendo QR:",
        error
      );


      showQrMessage(
        "No se pudo verificar el QR con TikiPay.",
        "error"
      );

      return;

    }


    if (
      !data ||
      data.ok !== true
    ) {

      handleSecureQrError(
        data
      );

      return;

    }


    // ==================================================
    // QR VÁLIDO
    // ==================================================

    scannedTikiPayData = {

      app:
        "TikiPay",

      version:
        2,

      type:
        "PAYMENT_REQUEST",

      qr_id:
        qrId,

      tiki_id:
        String(
          data.tiki_id || ""
        )
          .trim()
          .toUpperCase(),

      recipient_name:
        String(
          data.full_name ||
          "Usuario TikiPay"
        ).trim(),

      amount:
        normalizeQrAmount(
          data.amount
        ),

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
            120
          ),

      validity:
        String(
          data.validity ||
          ""
        ),

      expires_at:
        data.expires_at ||
        null,

      server_verified:
        true

    };


    await stopQrScanner();


    showDetectedQr(
      scannedTikiPayData
    );


  } catch (error) {

    console.error(
      "Error verificando QR seguro:",
      error
    );


    showQrMessage(
      "Ocurrió un error al verificar el QR.",
      "error"
    );

  }

}


// ======================================================
// ERRORES DEL SERVIDOR QR
// ======================================================

function handleSecureQrError(
  result
) {

  const errorCode =
    String(
      result?.error || ""
    )
      .trim()
      .toUpperCase();


  const messages = {

    AUTH_REQUIRED:
      "Tu sesión ha expirado. Inicia sesión nuevamente.",

    QR_NOT_FOUND:
      "Este código QR no existe en TikiPay.",

    QR_REVOKED:
      "Este código QR fue desactivado por su propietario.",

    QR_EXPIRED:
      "Este código QR ha vencido. Solicita un QR nuevo.",

    SELF_PAYMENT:
      "Este QR pertenece a tu propia cuenta. No puedes pagarte a ti mismo.",

    RECIPIENT_NOT_FOUND:
      "No se encontró la cuenta receptora de este QR."

  };


  showQrMessage(
    messages[errorCode]
    ||
    "Este QR no puede utilizarse para realizar un pago.",
    "error"
  );

}


// ======================================================
// QR LEGACY V1
// ======================================================

async function processLegacyQr(
  qrData
) {

  const tikiId =
    String(
      qrData.tiki_id || ""
    )
      .trim()
      .toUpperCase();


  if (
    !/^TIKI-[A-Z0-9]+$/.test(
      tikiId
    )
  ) {

    showQrMessage(
      "El TikiPay ID contenido en este QR no es válido.",
      "error"
    );

    return;

  }


  if (
    currentUserTikiId &&
    tikiId ===
      currentUserTikiId
  ) {

    showQrMessage(
      "Este QR pertenece a tu propia cuenta. No puedes pagarte a ti mismo.",
      "error"
    );

    return;

  }


  scannedTikiPayData = {

    app:
      "TikiPay",

    version:
      1,

    type:
      "RECEIVE",

    tiki_id:
      tikiId,

    recipient_name:
      "",

    amount:
      normalizeQrAmount(
        qrData.amount
      ),

    currency:
      String(
        qrData.currency ||
        "BOB"
      )
        .trim()
        .toUpperCase(),

    description:
      String(
        qrData.description ||
        ""
      )
        .trim()
        .slice(
          0,
          120
        ),

    qr_id:
      null,

    expires_at:
      null,

    server_verified:
      false

  };


  await stopQrScanner();


  showDetectedQr(
    scannedTikiPayData
  );


  showQrMessage(
    "QR antiguo reconocido. El destinatario será validado nuevamente al realizar la transferencia.",
    "success"
  );

}


// ======================================================
// MOSTRAR QR DETECTADO
// ======================================================

function showDetectedQr(
  data
) {

  const card =
    document.getElementById(
      "qrResultCard"
    );


  const recipient =
    document.getElementById(
      "qrRecipientId"
    );


  const requestedAmount =
    document.getElementById(
      "qrRequestedAmount"
    );


  const amountValue =
    document.getElementById(
      "qrAmountValue"
    );


  const continueButton =
    document.getElementById(
      "continueQrPayment"
    );


  const scanAgainButton =
    document.getElementById(
      "scanAnotherQr"
    );


  const reader =
    document.getElementById(
      "qrReader"
    );


  if (reader) {

    reader.style.display =
      "none";

  }


  // ====================================================
  // DESTINATARIO
  // ====================================================

  if (recipient) {

    if (data.recipient_name) {

      recipient.textContent =
        `${data.recipient_name} · ${data.tiki_id}`;

    } else {

      recipient.textContent =
        data.tiki_id;

    }

  }


  // ====================================================
  // MONTO
  // ====================================================

  if (
    data.amount &&
    data.amount > 0
  ) {

    requestedAmount
      ?.classList
      .add(
        "visible"
      );


    if (amountValue) {

      amountValue.textContent =
        formatQrMoney(
          data.amount,
          data.currency
        );

    }


  } else {

    requestedAmount
      ?.classList
      .remove(
        "visible"
      );

  }


  card
    ?.classList
    .add(
      "visible"
    );


  if (continueButton) {

    continueButton.style.display =
      "block";

  }


  if (scanAgainButton) {

    scanAgainButton.style.display =
      "block";

  }


  hideQrMethods();


  setQrStep(
    2
  );


  // ====================================================
  // MENSAJE
  // ====================================================

  if (
    data.version === 2 &&
    data.expires_at
  ) {

    showQrMessage(
      `QR verificado correctamente. Válido hasta ${formatQrExpiry(data.expires_at)}.`,
      "success"
    );


  } else {

    showQrMessage(
      "Código QR reconocido correctamente.",
      "success"
    );

  }

}


// ======================================================
// CONTINUAR A PAGAR
// ======================================================

function continueQrPayment() {

  if (!scannedTikiPayData) {

    showQrMessage(
      "Primero debes escanear un QR TikiPay.",
      "error"
    );

    return;

  }


  // ====================================================
  // COMPROBACIÓN LOCAL ADICIONAL DE VENCIMIENTO
  // El servidor sigue siendo la autoridad.
  // ====================================================

  if (
    scannedTikiPayData.expires_at
  ) {

    const expiry =
      new Date(
        scannedTikiPayData.expires_at
      );


    if (
      !Number.isNaN(
        expiry.getTime()
      ) &&
      expiry.getTime() <=
        Date.now()
    ) {

      showQrMessage(
        "Este QR acaba de vencer. Solicita un código nuevo.",
        "error"
      );

      return;

    }

  }


  const paymentData = {

    app:
      "TikiPay",

    version:
      scannedTikiPayData.version,

    source:
      "QR",

    type:
      scannedTikiPayData.type,

    qr_id:
      scannedTikiPayData.qr_id,

    tiki_id:
      scannedTikiPayData.tiki_id,

    recipient_name:
      scannedTikiPayData.recipient_name,

    amount:
      scannedTikiPayData.amount,

    currency:
      scannedTikiPayData.currency,

    description:
      scannedTikiPayData.description,

    expires_at:
      scannedTikiPayData.expires_at,

    server_verified:
      scannedTikiPayData.server_verified

  };


  sessionStorage.setItem(

    "tikipay_qr_payment",

    JSON.stringify(
      paymentData
    )

  );


  setQrStep(
    3
  );


  window.location.href =
    "enviar.html?source=qr";

}


// ======================================================
// REINICIAR
// ======================================================

async function resetQrScanner() {

  await stopQrScanner();


  qrProcessing =
    false;


  scannedTikiPayData =
    null;


  sessionStorage.removeItem(
    "tikipay_qr_payment"
  );


  hideQrResult();

  hideSelectedQrImage();


  const placeholder =
    document.getElementById(
      "qrPlaceholder"
    );


  const reader =
    document.getElementById(
      "qrReader"
    );


  const input =
    document.getElementById(
      "qrImageInput"
    );


  if (reader) {

    reader.innerHTML =
      "";

    reader.style.display =
      "none";

  }


  if (placeholder) {

    placeholder.style.display =
      "flex";

  }


  if (input) {

    input.value =
      "";

  }


  showQrMethods();


  setQrStep(
    1
  );


  showQrMessage(
    "",
    ""
  );

}


// ======================================================
// OCULTAR RESULTADO
// ======================================================

function hideQrResult() {

  document
    .getElementById(
      "qrResultCard"
    )
    ?.classList
    .remove(
      "visible"
    );


  document
    .getElementById(
      "qrRequestedAmount"
    )
    ?.classList
    .remove(
      "visible"
    );


  const continueButton =
    document.getElementById(
      "continueQrPayment"
    );


  const scanAgainButton =
    document.getElementById(
      "scanAnotherQr"
    );


  if (continueButton) {

    continueButton.style.display =
      "none";

  }


  if (scanAgainButton) {

    scanAgainButton.style.display =
      "none";

  }

}


// ======================================================
// MOSTRAR MÉTODOS
// ======================================================

function showQrMethods() {

  const methods =
    document.getElementById(
      "qrMethods"
    );


  const title =
    document.getElementById(
      "qrMethodTitle"
    );


  const help =
    document.getElementById(
      "qrFileHelp"
    );


  if (methods) {

    methods.style.display =
      "grid";

  }


  if (title) {

    title.style.display =
      "block";

  }


  if (help) {

    help.style.display =
      "block";

  }

}


// ======================================================
// OCULTAR MÉTODOS
// ======================================================

function hideQrMethods() {

  const methods =
    document.getElementById(
      "qrMethods"
    );


  const title =
    document.getElementById(
      "qrMethodTitle"
    );


  const help =
    document.getElementById(
      "qrFileHelp"
    );


  if (methods) {

    methods.style.display =
      "none";

  }


  if (title) {

    title.style.display =
      "none";

  }


  if (help) {

    help.style.display =
      "none";

  }

}


// ======================================================
// DETENER CÁMARA
// ======================================================

async function stopQrScanner() {

  if (!qrScanner) {

    qrScannerRunning =
      false;

    return;

  }


  try {

    if (qrScannerRunning) {

      await qrScanner.stop();

    }


  } catch (error) {

    console.warn(
      "No se pudo detener la cámara:",
      error
    );

  }


  try {

    await qrScanner.clear();

  } catch {
    // No crítico
  }


  qrScanner =
    null;

  qrScannerRunning =
    false;


  setQrCameraButtonState(
    false
  );

}


// ======================================================
// ESTADO DEL BOTÓN DE CÁMARA
// ======================================================

function setQrCameraButtonState(
  loading
) {

  const button =
    document.getElementById(
      "startQrScanner"
    );


  if (!button) {
    return;
  }


  const text =
    button.querySelector(
      ".qr-method-copy strong"
    );


  button.disabled =
    loading;


  if (text) {

    if (loading) {

      text.textContent =
        "Abriendo cámara...";


    } else if (
      qrScannerRunning
    ) {

      text.textContent =
        "Escaneando...";


    } else {

      text.textContent =
        "Usar cámara";

    }

  }

}


// ======================================================
// PASOS VISUALES
// ======================================================

function setQrStep(
  step
) {

  const steps =
    document.querySelectorAll(
      ".qr-step"
    );


  steps.forEach(
    function (
      element,
      index
    ) {

      element.classList.remove(
        "active"
      );


      if (
        index ===
        step - 1
      ) {

        element.classList.add(
          "active"
        );

      }

    }
  );

}


// ======================================================
// UUID
// ======================================================

function isValidUuid(
  value
) {

  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  ).test(
    String(
      value || ""
    )
  );

}


// ======================================================
// NORMALIZAR MONTO
// ======================================================

function normalizeQrAmount(
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
// FORMATEAR DINERO
// ======================================================

function formatQrMoney(
  amount,
  currency = "BOB"
) {

  const number =
    Number(
      amount || 0
    );


  const formatted =
    number.toLocaleString(
      "es-BO",
      {

        minimumFractionDigits:
          2,

        maximumFractionDigits:
          2

      }
    );


  if (
    currency === "BOB" ||
    currency === "BS"
  ) {

    return (
      "Bs " +
      formatted
    );

  }


  return (
    formatted +
    " " +
    currency
  );

}


// ======================================================
// FECHA DE VENCIMIENTO
// ======================================================

function formatQrExpiry(
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
// MENSAJE
// ======================================================

function showQrMessage(
  message,
  type = ""
) {

  const element =
    document.getElementById(
      "qrMessage"
    );


  if (!element) {
    return;
  }


  element.className =
    "qr-message";


  if (type) {

    element.classList.add(
      type
    );

  }


  element.textContent =
    message || "";

}


// ======================================================
// ERRORES DE CÁMARA
// ======================================================

function cameraErrorMessage(
  error
) {

  const text =
    String(
      error?.message ||
      error ||
      ""
    )
      .toLowerCase();


  if (
    text.includes(
      "permission"
    ) ||
    text.includes(
      "notallowed"
    )
  ) {

    return (
      "Debes permitir el acceso a la cámara para escanear códigos QR."
    );

  }


  if (
    text.includes(
      "notfound"
    ) ||
    text.includes(
      "devicesnotfound"
    )
  ) {

    return (
      "No se encontró una cámara disponible."
    );

  }


  if (
    text.includes(
      "notreadable"
    )
  ) {

    return (
      "La cámara está siendo utilizada por otra aplicación."
    );

  }


  return (
    "No se pudo iniciar la cámara. Revisa los permisos del navegador."
  );

}


// ======================================================
// INICIAR
// ======================================================

initQrPayment();