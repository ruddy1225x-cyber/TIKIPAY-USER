// ======================================================
// TIKIPAY - RECIBIR DINERO
// ======================================================

let receiveSession =
  null;

let receiveProfile =
  null;


// ======================================================
// INICIO
// ======================================================

async function initReceive() {

  receiveSession =
    await requireAuth();


  if (!receiveSession) {
    return;
  }


  await loadReceiveProfile();


  if (!receiveProfile) {
    return;
  }


  renderReceiveProfile();

  generateTikiPayQR();

}


// ======================================================
// CARGAR PERFIL
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


  if (error) {

    console.error(
      "Error cargando perfil:",
      error
    );


    showReceiveMessage(
      "No se pudo cargar tu información.",
      "error"
    );


    return;
  }


  receiveProfile =
    data;

}


// ======================================================
// MOSTRAR PERFIL
// ======================================================

function renderReceiveProfile() {

  const name =
    receiveProfile
      ?.full_name
      ?.trim()
    || "Usuario TikiPay";


  const tikiId =
    receiveProfile
      ?.tiki_id
    || "TIKI";


  const nameElement =
    document.getElementById(
      "receiveName"
    );


  const tikiElement =
    document.getElementById(
      "receiveTikiId"
    );


  const avatarElement =
    document.getElementById(
      "receiveAvatar"
    );


  if (nameElement) {

    nameElement.textContent =
      name;

  }


  if (tikiElement) {

    tikiElement.textContent =
      tikiId;

  }


  if (avatarElement) {

    avatarElement.textContent =
      name
        .charAt(0)
        .toUpperCase();

  }

}


// ======================================================
// GENERAR QR
// ======================================================

function generateTikiPayQR() {

  const container =
    document.getElementById(
      "qr"
    );


  if (
    !container ||
    !receiveProfile
  ) {
    return;
  }


  container.innerHTML =
    "";


  const qrPayload =
    JSON.stringify(
      {
        app:
          "TikiPay",

        version:
          1,

        type:
          "RECEIVE",

        tiki_id:
          receiveProfile.tiki_id
      }
    );


  if (
    typeof QRCode ===
    "undefined"
  ) {

    container.innerHTML = `
      <span>
        QR no disponible
      </span>
    `;


    showReceiveMessage(
      "No se pudo cargar el generador QR.",
      "error"
    );


    return;
  }


  new QRCode(
    container,
    {
      text:
        qrPayload,

      width:
        210,

      height:
        210,

      correctLevel:
        QRCode.CorrectLevel.H
    }
  );

}


// ======================================================
// COPIAR TIKI-ID
// ======================================================

document
  .getElementById(
    "copyTikiIdButton"
  )
  ?.addEventListener(
    "click",
    async function () {

      if (
        !receiveProfile
          ?.tiki_id
      ) {
        return;
      }


      try {

        await navigator
          .clipboard
          .writeText(
            receiveProfile.tiki_id
          );


        this.textContent =
          translateReceiveText(
            "Copiado ✓"
          );


        showReceiveMessage(
          "Datos copiados.",
          "success"
        );


        const button =
          this;


        setTimeout(
          function () {

            button.textContent =
              translateReceiveText(
                "Copiar ID"
              );

          },
          1600
        );

      } catch (error) {

        console.error(
          "Error copiando Tiki-ID:",
          error
        );


        fallbackCopy(
          receiveProfile.tiki_id
        );

      }

    }
  );


// ======================================================
// COPIA DE RESPALDO
// ======================================================

function fallbackCopy(
  text
) {

  const textarea =
    document.createElement(
      "textarea"
    );


  textarea.value =
    text;


  textarea.style.position =
    "fixed";


  textarea.style.opacity =
    "0";


  document.body.appendChild(
    textarea
  );


  textarea.select();


  try {

    document.execCommand(
      "copy"
    );


    showReceiveMessage(
      "Datos copiados.",
      "success"
    );

  } catch (error) {

    console.error(
      error
    );


    showReceiveMessage(
      "No se pudo copiar el TikiPay ID.",
      "error"
    );

  }


  textarea.remove();

}


// ======================================================
// COMPARTIR
// ======================================================

document
  .getElementById(
    "shareTikiPayButton"
  )
  ?.addEventListener(
    "click",
    async function () {

      if (
        !receiveProfile
      ) {
        return;
      }


      const shareText =
        "Envíame dinero por TikiPay.\n\n" +
        "TikiPay ID: " +
        receiveProfile.tiki_id;


      if (
        navigator.share
      ) {

        try {

          await navigator.share(
            {
              title:
                "TikiPay",

              text:
                shareText
            }
          );


          return;

        } catch (error) {

          if (
            error?.name ===
            "AbortError"
          ) {

            return;

          }


          console.warn(
            "Compartir no disponible:",
            error
          );

        }

      }


      try {

        await navigator
          .clipboard
          .writeText(
            shareText
          );


        showReceiveMessage(
          "Datos copiados.",
          "success"
        );

      } catch (error) {

        fallbackCopy(
          shareText
        );

      }

    }
  );


// ======================================================
// ACTUALIZAR QR
// ======================================================

document
  .getElementById(
    "refreshQrButton"
  )
  ?.addEventListener(
    "click",
    function () {

      generateTikiPayQR();


      showReceiveMessage(
        "QR actualizado.",
        "success"
      );

    }
  );


// ======================================================
// TRADUCCIÓN
// ======================================================

function translateReceiveText(
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

function showReceiveMessage(
  text,
  type
) {

  const element =
    document.getElementById(
      "receiveMessage"
    );


  if (!element) {
    return;
  }


  element.textContent =
    translateReceiveText(
      text
    );


  element.className =
    "receive-message " +
    type;


  setTimeout(
    function () {

      element.textContent =
        "";

    },
    3000
  );

}


// ======================================================
// INICIAR
// ======================================================

initReceive();