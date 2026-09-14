// ======================================================
// TIKIPAY - COBRAR QR SEGURO
// QR respaldado por Supabase
// ======================================================

let receiveSession = null;

let receiveProfile = null;

let receiveAmount = 0;

let receiveDescription = "";

let receiveValidity = "TODAY";

let currentQrId = null;

let currentQrExpiresAt = null;

let currentQrPayload = null;

let selectedQrImageUrl = null;


// ======================================================
// INICIO
// ======================================================

async function initReceive() {

  try {

    receiveSession =
      await requireAuth();


    if (!receiveSession) {
      return;
    }


    await loadReceiveProfile();


    bindReceiveEvents();


    /*
      Al abrir la página generamos automáticamente
      un QR válido hasta hoy 23:59.
    */

    await createSecureQr();


  } catch (error) {

    console.error(
      "Error iniciando Cobrar QR:",
      error
    );


    showReceiveMessage(
      "No se pudo iniciar el módulo QR.",
      "error"
    );

  }

}


// ======================================================
// PERFIL
// ======================================================

async function loadReceiveProfile() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select(`
        tiki_id,
        full_name
      `)
      .eq(
        "id",
        receiveSession.user.id
      )
      .single();


  if (
    error ||
    !data
  ) {

    console.error(
      "Error cargando perfil:",
      error
    );


    throw new Error(
      "PROFILE_NOT_FOUND"
    );

  }


  receiveProfile =
    data;


  renderReceiveProfile();

}


// ======================================================
// MOSTRAR PERFIL
// ======================================================

function renderReceiveProfile() {

  const name =
    String(
      receiveProfile?.full_name ||
      "Usuario TikiPay"
    ).trim();


  const tikiId =
    String(
      receiveProfile?.tiki_id ||
      "TIKI"
    ).trim();


  const avatar =
    document.getElementById(
      "receiveAvatar"
    );


  const nameElement =
    document.getElementById(
      "receiveName"
    );


  const tikiIdElement =
    document.getElementById(
      "receiveTikiId"
    );


  if (avatar) {

    avatar.textContent =
      name
        .charAt(0)
        .toUpperCase();

  }


  if (nameElement) {

    nameElement.textContent =
      name;

  }


  if (tikiIdElement) {

    tikiIdElement.textContent =
      tikiId;

  }

}


// ======================================================
// CREAR QR SEGURO EN SUPABASE
// ======================================================

async function createSecureQr() {

  const qrContainer =
    document.getElementById(
      "qr"
    );


  const status =
    document.getElementById(
      "qrStatusText"
    );


  if (qrContainer) {

    qrContainer.innerHTML =
      "<span>Generando QR seguro...</span>";

  }


  if (status) {

    status.textContent =
      "Creando QR protegido...";

  }


  showReceiveMessage(
    "Generando código QR...",
    ""
  );


  try {

    const rpcAmount =
      receiveAmount > 0
        ?
        Number(
          receiveAmount.toFixed(2)
        )
        :
        null;


    const {
      data,
      error
    } =
      await supabaseClient
        .rpc(
          "create_tikipay_payment_qr",
          {

            p_amount:
              rpcAmount,

            p_description:
              receiveDescription || null,

            p_validity:
              receiveValidity

          }
        );


    if (error) {

      console.error(
        "Error RPC creando QR:",
        error
      );


      throw error;

    }


    if (
      !data ||
      data.ok !== true ||
      !data.qr_id
    ) {

      throw new Error(
        "INVALID_QR_RESPONSE"
      );

    }


    currentQrId =
      data.qr_id;


    currentQrExpiresAt =
      data.expires_at;


    /*
      IMPORTANTE:
      El QR ya NO contiene destinatario ni monto.
      Solo contiene un identificador seguro.
    */

    currentQrPayload = {

      app:
        "TikiPay",

      version:
        2,

      type:
        "PAYMENT_REQUEST",

      qr_id:
        currentQrId

    };


    renderSecureQr();

    updateQrInformation();


    if (status) {

      status.textContent =
        "Activo y verificado por TikiPay";

    }


    showReceiveMessage(
      "QR generado correctamente.",
      "success"
    );


  } catch (error) {

    console.error(
      "No se pudo crear QR:",
      error
    );


    currentQrId =
      null;


    currentQrPayload =
      null;


    if (qrContainer) {

      qrContainer.innerHTML =
        "<span>No se pudo generar el QR.</span>";

    }


    if (status) {

      status.textContent =
        "Error generando QR";

    }


    showReceiveMessage(
      "No se pudo generar el QR seguro. Verifica la función de Supabase.",
      "error"
    );

  }

}


// ======================================================
// RENDERIZAR QR
// ======================================================

function renderSecureQr() {

  if (
    !currentQrPayload
  ) {
    return;
  }


  const container =
    document.getElementById(
      "qr"
    );


  if (!container) {
    return;
  }


  container.innerHTML =
    "";


  new QRCode(
    container,
    {

      text:
        JSON.stringify(
          currentQrPayload
        ),

      width:
        320,

      height:
        320,

      colorDark:
        "#000000",

      colorLight:
        "#ffffff",

      correctLevel:
        QRCode.CorrectLevel.H

    }
  );

}


// ======================================================
// INFORMACIÓN DEL QR
// ======================================================

function updateQrInformation() {

  const amountElement =
    document.getElementById(
      "receiveAmountLabel"
    );


  const validityElement =
    document.getElementById(
      "receiveValidityLabel"
    );


  const expiryElement =
    document.getElementById(
      "receiveExpiryLabel"
    );


  if (amountElement) {

    amountElement.textContent =
      formatReceiveMoney(
        receiveAmount
      );

  }


  if (validityElement) {

    validityElement.textContent =
      validityLabel(
        receiveValidity
      );

  }


  if (expiryElement) {

    expiryElement.textContent =
      formatExpiryDate(
        currentQrExpiresAt
      );

  }

}


// ======================================================
// TEXTO DE VIGENCIA
// ======================================================

function validityLabel(
  value
) {

  const labels = {

    TODAY:
      "Hoy hasta 23:59",

    WEEK:
      "1 semana",

    MONTH:
      "1 mes",

    YEAR:
      "1 año",

    TWO_YEARS:
      "2 años"

  };


  return (
    labels[value]
    ||
    "Hoy hasta 23:59"
  );

}


// ======================================================
// FORMATEAR VENCIMIENTO
// ======================================================

function formatExpiryDate(
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
// EVENTOS
// ======================================================

function bindReceiveEvents() {

  document
    .getElementById(
      "copyTikiIdButton"
    )
    ?.addEventListener(
      "click",
      copyTikiId
    );


  document
    .getElementById(
      "refreshQrButton"
    )
    ?.addEventListener(
      "click",
      async function () {

        await createSecureQr();

      }
    );


  document
    .getElementById(
      "editQrButton"
    )
    ?.addEventListener(
      "click",
      openQrEditModal
    );


  document
    .getElementById(
      "cancelQrEditButton"
    )
    ?.addEventListener(
      "click",
      closeQrEditModal
    );


  document
    .getElementById(
      "saveQrEditButton"
    )
    ?.addEventListener(
      "click",
      saveQrEdit
    );


  document
    .getElementById(
      "saveQrButton"
    )
    ?.addEventListener(
      "click",
      saveReceiveQr
    );


  document
    .getElementById(
      "shareTikiPayButton"
    )
    ?.addEventListener(
      "click",
      shareReceiveQr
    );


  document
    .getElementById(
      "qrEditModal"
    )
    ?.addEventListener(
      "click",
      function (event) {

        if (
          event.target === this
        ) {

          closeQrEditModal();

        }

      }
    );


  document.addEventListener(
    "keydown",
    function (event) {

      if (
        event.key === "Escape"
      ) {

        closeQrEditModal();

      }

    }
  );

}


// ======================================================
// MODAL
// ======================================================

function openQrEditModal() {

  const amount =
    document.getElementById(
      "qrAmountInput"
    );


  const description =
    document.getElementById(
      "qrDescriptionInput"
    );


  if (amount) {

    amount.value =
      receiveAmount > 0
        ?
        receiveAmount.toFixed(2)
        :
        "";

  }


  if (description) {

    description.value =
      receiveDescription;

  }


  const validityRadio =
    document.querySelector(
      `input[name="qrValidity"][value="${receiveValidity}"]`
    );


  if (validityRadio) {

    validityRadio.checked =
      true;

  }


  document
    .getElementById(
      "qrEditModal"
    )
    ?.classList
    .add(
      "visible"
    );

}


// ======================================================
// CERRAR MODAL
// ======================================================

function closeQrEditModal() {

  document
    .getElementById(
      "qrEditModal"
    )
    ?.classList
    .remove(
      "visible"
    );

}


// ======================================================
// GUARDAR CONFIGURACIÓN
// ======================================================

async function saveQrEdit() {

  const amountInput =
    document.getElementById(
      "qrAmountInput"
    );


  const descriptionInput =
    document.getElementById(
      "qrDescriptionInput"
    );


  const selectedValidity =
    document.querySelector(
      'input[name="qrValidity"]:checked'
    );


  const rawAmount =
    String(
      amountInput?.value ||
      ""
    )
      .trim()
      .replace(
        ",",
        "."
      );


  let amount =
    0;


  if (rawAmount) {

    amount =
      Number(
        rawAmount
      );


    if (
      !Number.isFinite(
        amount
      )
      ||
      amount < 0
    ) {

      showReceiveMessage(
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


  receiveAmount =
    amount;


  receiveDescription =
    String(
      descriptionInput?.value ||
      ""
    )
      .trim()
      .slice(
        0,
        120
      );


  receiveValidity =
    String(
      selectedValidity?.value ||
      "TODAY"
    );


  closeQrEditModal();


  await createSecureQr();

}


// ======================================================
// COPIAR ID
// ======================================================

async function copyTikiId() {

  const tikiId =
    receiveProfile?.tiki_id;


  if (!tikiId) {
    return;
  }


  try {

    await navigator.clipboard.writeText(
      tikiId
    );


    showReceiveMessage(
      "TikiPay ID copiado.",
      "success"
    );


  } catch {

    showReceiveMessage(
      "No se pudo copiar el TikiPay ID.",
      "error"
    );

  }

}


// ======================================================
// GUARDAR IMAGEN
// ======================================================

async function saveReceiveQr() {

  try {

    if (!currentQrId) {

      showReceiveMessage(
        "Primero genera un QR válido.",
        "error"
      );

      return;

    }


    showReceiveMessage(
      "Preparando imagen...",
      ""
    );


    const blob =
      await createReceiveQrImage();


    if (!blob) {

      throw new Error(
        "IMAGE_NOT_CREATED"
      );

    }


    const url =
      URL.createObjectURL(
        blob
      );


    const link =
      document.createElement(
        "a"
      );


    link.href =
      url;


    link.download =
      `TikiPay-QR-${receiveProfile.tiki_id}.png`;


    document.body.appendChild(
      link
    );


    link.click();

    link.remove();


    setTimeout(
      function () {

        URL.revokeObjectURL(
          url
        );

      },
      1000
    );


    showReceiveMessage(
      "QR guardado correctamente.",
      "success"
    );


  } catch (error) {

    console.error(
      "Error guardando QR:",
      error
    );


    showReceiveMessage(
      "No se pudo guardar el QR.",
      "error"
    );

  }

}


// ======================================================
// COMPARTIR
// ======================================================

async function shareReceiveQr() {

  try {

    if (!currentQrId) {

      showReceiveMessage(
        "Primero genera un QR válido.",
        "error"
      );

      return;

    }


    const blob =
      await createReceiveQrImage();


    const text =
      receiveAmount > 0
        ?
        `Págame ${formatReceiveMoney(receiveAmount)} mediante TikiPay.`
        :
        "Escanea mi QR para pagarme mediante TikiPay.";


    if (
      blob &&
      typeof File !==
      "undefined"
    ) {

      const file =
        new File(
          [blob],
          "TikiPay-QR.png",
          {
            type:
              "image/png"
          }
        );


      if (
        navigator.canShare &&
        navigator.canShare(
          {
            files:
              [file]
          }
        )
      ) {

        await navigator.share(
          {

            title:
              "Cobrar con QR | TikiPay",

            text:
              text,

            files:
              [file]

          }
        );


        return;

      }

    }


    if (navigator.share) {

      await navigator.share(
        {

          title:
            "TikiPay",

          text:
            text

        }
      );


      return;

    }


    showReceiveMessage(
      "Tu navegador no permite compartir directamente.",
      "error"
    );


  } catch (error) {

    if (
      error?.name ===
      "AbortError"
    ) {

      return;

    }


    console.error(
      "Error compartiendo:",
      error
    );


    showReceiveMessage(
      "No se pudo compartir el QR.",
      "error"
    );

  }

}


// ======================================================
// GENERAR IMAGEN VERTICAL
// ======================================================

async function createReceiveQrImage() {

  const width =
    1080;


  const height =
    1600;


  const canvas =
    document.createElement(
      "canvas"
    );


  canvas.width =
    width;


  canvas.height =
    height;


  const ctx =
    canvas.getContext(
      "2d"
    );


  if (!ctx) {
    return null;
  }


  // FONDO

  const gradient =
    ctx.createLinearGradient(
      0,
      0,
      width,
      height
    );


  gradient.addColorStop(
    0,
    "#063978"
  );


  gradient.addColorStop(
    .55,
    "#087fa6"
  );


  gradient.addColorStop(
    1,
    "#08b9b9"
  );


  ctx.fillStyle =
    gradient;


  ctx.fillRect(
    0,
    0,
    width,
    height
  );


  // LOGO

  try {

    const logo =
      await loadReceiveImage(
        "assets/android-chrome-192x192.png"
      );


    ctx.drawImage(
      logo,
      450,
      45,
      180,
      180
    );


  } catch {
    // Continuar sin logo.
  }


  ctx.textAlign =
    "center";


  ctx.fillStyle =
    "#ffffff";


  ctx.font =
    "900 58px Arial";


  ctx.fillText(
    "TikiPay",
    width / 2,
    235
  );


  ctx.font =
    "700 39px Arial";


  ctx.fillText(
    "Cobrar con QR",
    width / 2,
    300
  );


  // TARJETA

  drawReceiveRoundedRect(
    ctx,
    55,
    345,
    970,
    1180,
    60
  );


  ctx.fillStyle =
    "#ffffff";


  ctx.fill();


  // NOMBRE

  ctx.fillStyle =
    "#071b3a";


  ctx.font =
    "700 31px Arial";


  ctx.fillText(
    String(
      receiveProfile.full_name ||
      "Usuario TikiPay"
    ),
    width / 2,
    425
  );


  ctx.fillStyle =
    "#718198";


  ctx.font =
    "21px Arial";


  ctx.fillText(
    "Escanea para pagarme con TikiPay",
    width / 2,
    465
  );


  // QR

  const qrSource =
    await getCurrentQrSource();


  if (!qrSource) {

    throw new Error(
      "QR_SOURCE_NOT_FOUND"
    );

  }


  ctx.imageSmoothingEnabled =
    false;


  ctx.drawImage(
    qrSource,
    150,
    505,
    780,
    780
  );


  ctx.imageSmoothingEnabled =
    true;


  // INFORMACIÓN

  ctx.strokeStyle =
    "#e2e8f0";


  ctx.beginPath();


  ctx.moveTo(
    120,
    1325
  );


  ctx.lineTo(
    960,
    1325
  );


  ctx.stroke();


  drawImageDataRow(
    ctx,
    "Cuenta",
    receiveProfile.tiki_id,
    1385
  );


  drawImageDataRow(
    ctx,
    "Monto",
    formatReceiveMoney(
      receiveAmount
    ),
    1440
  );


  drawImageDataRow(
    ctx,
    "Válido hasta",
    formatExpiryDate(
      currentQrExpiresAt
    ),
    1495
  );


  return new Promise(
    function (resolve) {

      canvas.toBlob(
        resolve,
        "image/png",
        1
      );

    }
  );

}


// ======================================================
// FILA IMAGEN
// ======================================================

function drawImageDataRow(
  ctx,
  label,
  value,
  y
) {

  ctx.textAlign =
    "left";


  ctx.fillStyle =
    "#078f9f";


  ctx.font =
    "24px Arial";


  ctx.fillText(
    label,
    130,
    y
  );


  ctx.textAlign =
    "right";


  ctx.fillStyle =
    "#071b3a";


  ctx.font =
    "700 23px Arial";


  ctx.fillText(
    String(
      value
    ),
    950,
    y
  );

}


// ======================================================
// QR ACTUAL
// ======================================================

async function getCurrentQrSource() {

  const container =
    document.getElementById(
      "qr"
    );


  const canvas =
    container?.querySelector(
      "canvas"
    );


  if (canvas) {

    return canvas;

  }


  const image =
    container?.querySelector(
      "img"
    );


  if (image) {

    if (image.complete) {

      return image;

    }


    await new Promise(
      function (
        resolve,
        reject
      ) {

        image.onload =
          resolve;


        image.onerror =
          reject;

      }
    );


    return image;

  }


  return null;

}


// ======================================================
// CARGAR IMAGEN
// ======================================================

function loadReceiveImage(
  src
) {

  return new Promise(
    function (
      resolve,
      reject
    ) {

      const image =
        new Image();


      image.onload =
        function () {

          resolve(
            image
          );

        };


      image.onerror =
        reject;


      image.src =
        src;

    }
  );

}


// ======================================================
// RECTÁNGULO
// ======================================================

function drawReceiveRoundedRect(
  ctx,
  x,
  y,
  width,
  height,
  radius
) {

  const r =
    Math.min(
      radius,
      width / 2,
      height / 2
    );


  ctx.beginPath();

  ctx.moveTo(
    x + r,
    y
  );

  ctx.lineTo(
    x + width - r,
    y
  );

  ctx.quadraticCurveTo(
    x + width,
    y,
    x + width,
    y + r
  );

  ctx.lineTo(
    x + width,
    y + height - r
  );

  ctx.quadraticCurveTo(
    x + width,
    y + height,
    x + width - r,
    y + height
  );

  ctx.lineTo(
    x + r,
    y + height
  );

  ctx.quadraticCurveTo(
    x,
    y + height,
    x,
    y + height - r
  );

  ctx.lineTo(
    x,
    y + r
  );

  ctx.quadraticCurveTo(
    x,
    y,
    x + r,
    y
  );

  ctx.closePath();

}


// ======================================================
// MONEDA
// ======================================================

function formatReceiveMoney(
  amount
) {

  return (
    "Bs "
    +
    Number(
      amount || 0
    ).toLocaleString(
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


// ======================================================
// MENSAJES
// ======================================================

function showReceiveMessage(
  text,
  type = ""
) {

  const element =
    document.getElementById(
      "receiveMessage"
    );


  if (!element) {
    return;
  }


  element.className =
    "receive-message";


  if (type) {

    element.classList.add(
      type
    );

  }


  element.textContent =
    text || "";

}


// ======================================================
// INICIAR
// ======================================================

initReceive();