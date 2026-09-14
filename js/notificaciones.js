// ======================================================
// TIKIPAY - NOTIFICACIONES
// Notificaciones normales + imágenes opcionales
// ======================================================

let notificationSession =
  null;

let tikiNotifications =
  [];


// ======================================================
// SONIDO TIKIPAY - NUEVA NOTIFICACIÓN
// ======================================================

const TIKIPAY_NOTIFICATION_SOUND =
  "/assets/sounds/tikipay-notificacion.mp3";

let notificationAudio =
  null;

let notificationAudioUnlocked =
  false;

let notificationAudioUnlockPromise =
  null;

let notificationRealtimeChannel =
  null;


function getNotificationAudio() {

  if (!notificationAudio) {

    notificationAudio =
      new Audio(
        TIKIPAY_NOTIFICATION_SOUND
      );


    notificationAudio.preload =
      "auto";


    notificationAudio.volume =
      0.95;

  }


  return notificationAudio;

}


function preloadNotificationAudio() {

  try {

    const audio =
      getNotificationAudio();


    audio.load();

  } catch (error) {

    console.warn(
      "No se pudo precargar el sonido de notificación TikiPay:",
      error
    );

  }

}


/*
  Los navegadores móviles pueden bloquear audio
  que se reproduce desde eventos en tiempo real.

  Por eso preparamos el mismo elemento de audio
  durante la primera interacción del usuario.
*/
function unlockNotificationAudio() {

  if (
    notificationAudioUnlocked ||
    notificationAudioUnlockPromise
  ) {

    return notificationAudioUnlockPromise;

  }


  try {

    const audio =
      getNotificationAudio();


    const previousVolume =
      audio.volume;


    audio.pause();

    audio.currentTime =
      0;


    audio.volume =
      0;


    const playPromise =
      audio.play();


    if (
      playPromise &&
      typeof playPromise.then ===
        "function"
    ) {

      notificationAudioUnlockPromise =
        playPromise
          .then(
            function () {

              audio.pause();

              audio.currentTime =
                0;


              audio.volume =
                previousVolume;


              notificationAudioUnlocked =
                true;

            }
          )
          .catch(
            function (error) {

              audio.pause();

              audio.currentTime =
                0;


              audio.volume =
                previousVolume;


              notificationAudioUnlockPromise =
                null;


              console.debug(
                "El navegador aún no habilitó el sonido de notificación TikiPay:",
                error
              );

            }
          );


      return notificationAudioUnlockPromise;

    }


    audio.pause();

    audio.currentTime =
      0;


    audio.volume =
      previousVolume;


    notificationAudioUnlocked =
      true;


    return null;

  } catch (error) {

    console.debug(
      "No se pudo preparar el sonido de notificación TikiPay:",
      error
    );


    return null;

  }

}


async function playNotificationSound() {

  try {

    if (notificationAudioUnlockPromise) {

      try {

        await notificationAudioUnlockPromise;

      } catch (error) {

        // Si falla el desbloqueo silencioso,
        // intentamos reproducir normalmente.

      }

    }


    const audio =
      getNotificationAudio();


    audio.pause();

    audio.currentTime =
      0;


    audio.volume =
      0.95;


    await audio.play();

  } catch (error) {

    /*
      El sonido es complementario.
      Nunca debe impedir que la notificación
      aparezca correctamente.
    */

    console.warn(
      "Llegó una notificación, pero el navegador no pudo reproducir el sonido TikiPay:",
      error
    );

  }

}


document.addEventListener(
  "pointerdown",
  unlockNotificationAudio,
  {
    passive:
      true
  }
);


document.addEventListener(
  "keydown",
  unlockNotificationAudio
);


// ======================================================
// NOTIFICACIONES EN TIEMPO REAL
// ======================================================

function subscribeToRealtimeNotifications() {

  if (
    !notificationSession?.user?.id
  ) {

    return;

  }


  if (
    !supabaseClient ||
    typeof supabaseClient.channel !==
      "function"
  ) {

    console.warn(
      "Supabase Realtime no está disponible en este cliente."
    );

    return;

  }


  if (notificationRealtimeChannel) {

    try {

      supabaseClient.removeChannel(
        notificationRealtimeChannel
      );

    } catch (error) {

      console.debug(
        "No se pudo cerrar el canal anterior de notificaciones:",
        error
      );

    }


    notificationRealtimeChannel =
      null;

  }


  const currentUserId =
    notificationSession.user.id;


  notificationRealtimeChannel =
    supabaseClient
      .channel(
        `tikipay-notifications-${currentUserId}`
      )
      .on(
        "postgres_changes",
        {
          event:
            "INSERT",

          schema:
            "public",

          table:
            "notifications",

          filter:
            `user_id=eq.${currentUserId}`
        },
        function (
          payload
        ) {

          handleRealtimeNotification(
            payload?.new
          );

        }
      )
      .subscribe(
        function (
          status
        ) {

          if (
            status ===
            "CHANNEL_ERROR"
          ) {

            console.warn(
              "No se pudo activar el canal en tiempo real de notificaciones TikiPay."
            );

          }

        }
      );

}


function handleRealtimeNotification(
  notification
) {

  if (
    !notification ||
    !notification.id
  ) {

    return;

  }


  const alreadyExists =
    tikiNotifications.some(
      item =>
        item.id ===
        notification.id
    );


  if (alreadyExists) {

    return;

  }


  tikiNotifications.unshift(
    notification
  );


  renderNotifications(
    tikiNotifications
  );


  updateMarkAllButton();


  playNotificationSound();

}


function closeRealtimeNotifications() {

  if (
    !notificationRealtimeChannel
  ) {

    return;

  }


  try {

    supabaseClient.removeChannel(
      notificationRealtimeChannel
    );

  } catch (error) {

    console.debug(
      "No se pudo cerrar el canal de notificaciones TikiPay:",
      error
    );

  }


  notificationRealtimeChannel =
    null;

}


window.addEventListener(
  "pagehide",
  closeRealtimeNotifications
);


// ======================================================
// INICIO
// ======================================================

async function initNotifications() {

  preloadNotificationAudio();


  notificationSession =
    await requireAuth();


  if (!notificationSession) {
    return;
  }


  await loadNotifications();


  subscribeToRealtimeNotifications();

}


// ======================================================
// CARGAR NOTIFICACIONES
// ======================================================

async function loadNotifications() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("notifications")
      .select(`
        id,
        title,
        message,
        type,
        is_read,
        created_at,
        image_url,
        image_alt
      `)
      .eq(
        "user_id",
        notificationSession.user.id
      )
      .order(
        "created_at",
        {
          ascending: false
        }
      );


  if (error) {

    console.error(
      "Error cargando notificaciones:",
      error
    );


    showNotificationMessage(
      "No se pudieron cargar las notificaciones.",
      "error"
    );


    renderNotifications(
      []
    );


    return;
  }


  tikiNotifications =
    data || [];


  renderNotifications(
    tikiNotifications
  );


  updateMarkAllButton();

}


// ======================================================
// MOSTRAR NOTIFICACIONES
// ======================================================

function renderNotifications(
  notifications
) {

  const container =
    document.getElementById(
      "notificationsList"
    );


  if (!container) {
    return;
  }


  // ====================================================
  // SIN NOTIFICACIONES
  // ====================================================

  if (
    !notifications ||
    notifications.length === 0
  ) {

    container.innerHTML = `

      <div class="notifications-empty">

        <div class="notifications-empty-icon">
          🔔
        </div>

        <h3>
          ${
            translateNotificationText(
              "Sin notificaciones"
            )
          }
        </h3>

        <p>
          ${
            translateNotificationText(
              "Tus avisos aparecerán aquí."
            )
          }
        </p>

      </div>

    `;


    return;
  }


  container.innerHTML =
    "";


  // ====================================================
  // CREAR TARJETAS
  // ====================================================

  notifications.forEach(
    notification => {

      const card =
        document.createElement(
          "article"
        );


      card.className =
        "notification-card" +
        (
          notification.is_read
            ? ""
            : " unread"
        );


      const translatedTitle =
        translateNotificationText(
          notification.title
        );


      const translatedMessage =
        translateNotificationText(
          notification.message
        );


      card.innerHTML = `

        <div class="notification-icon">

          ${notificationIcon(
            notification.type
          )}

        </div>


        <div class="notification-content">

          <div class="notification-top">

            <div>

              <h3 class="notification-title">

                ${escapeHTML(
                  translatedTitle
                )}

              </h3>

            </div>


            ${
              notification.is_read
                ? ""
                : `
                  <span
                    class="notification-unread-dot"
                    title="No leída"
                  ></span>
                `
            }

          </div>


          <p class="notification-message">

            ${escapeHTML(
              translatedMessage
            )}

          </p>


          <!-- IMAGEN OPCIONAL -->

          <div
            class="notification-media"
            hidden
          ></div>


          <span class="notification-date">

            ${formatTikiDate(
              notification.created_at
            )}

          </span>


          ${
            notification.is_read
              ? ""
              : `
                <button
                  type="button"
                  class="notification-read-button"
                  data-notification="${notification.id}"
                >
                  ${
                    translateNotificationText(
                      "Marcar como leída"
                    )
                  }
                </button>
              `
          }

        </div>

      `;


      // ==================================================
      // IMAGEN
      // ==================================================

      renderNotificationImage(
        card,
        notification
      );


      // ==================================================
      // BOTÓN MARCAR COMO LEÍDA
      // ==================================================

      const readButton =
        card.querySelector(
          ".notification-read-button"
        );


      if (readButton) {

        readButton.addEventListener(
          "click",
          async function () {

            await markNotificationAsRead(
              notification.id
            );

          }
        );

      }


      container.appendChild(
        card
      );

    }
  );

}


// ======================================================
// MOSTRAR IMAGEN DE NOTIFICACIÓN
// ======================================================

function renderNotificationImage(
  card,
  notification
) {

  if (!card) {
    return;
  }


  const media =
    card.querySelector(
      ".notification-media"
    );


  if (!media) {
    return;
  }


  const imageUrl =
    String(
      notification?.image_url ||
      ""
    ).trim();


  // ====================================================
  // SIN IMAGEN
  // ====================================================

  if (!imageUrl) {

    media.hidden =
      true;

    media.innerHTML =
      "";

    return;
  }


  // ====================================================
  // PREPARAR CONTENEDOR
  // ====================================================

  /*
    IMPORTANTE:

    Lo mostramos ANTES de iniciar
    la carga de la imagen.

    La versión anterior lo mantenía
    oculto esperando el evento "load".

    En algunos navegadores móviles,
    una imagen con loading="lazy"
    dentro de un elemento hidden
    puede no cargarse nunca.
  */

  media.hidden =
    false;

  media.innerHTML =
    "";


  // ====================================================
  // CREAR IMAGEN
  // ====================================================

  const image =
    document.createElement(
      "img"
    );


  image.className =
    "notification-image";


  image.alt =
    String(
      notification?.image_alt ||
      notification?.title ||
      "Imagen informativa de TikiPay"
    ).trim();


  /*
    Carga inmediata.

    Para imágenes informativas de
    notificaciones queremos que aparezcan
    apenas se renderice la tarjeta.
  */

  image.loading =
    "eager";


  image.decoding =
    "async";


  // ====================================================
  // CARGA CORRECTA
  // ====================================================

  image.addEventListener(
    "load",
    function () {

      media.hidden =
        false;

    }
  );


  // ====================================================
  // ERROR DE IMAGEN
  // ====================================================

  image.addEventListener(
    "error",
    function () {

      console.warn(
        "No se pudo cargar la imagen de notificación:",
        imageUrl
      );


      media.hidden =
        true;


      image.remove();

    }
  );


  /*
    Primero insertamos el elemento
    y después asignamos src.
  */

  media.appendChild(
    image
  );


  image.src =
    imageUrl;

}


// ======================================================
// MARCAR UNA NOTIFICACIÓN COMO LEÍDA
// ======================================================

async function markNotificationAsRead(
  notificationId
) {

  const {
    error
  } =
    await supabaseClient
      .from("notifications")
      .update(
        {
          is_read: true
        }
      )
      .eq(
        "id",
        notificationId
      )
      .eq(
        "user_id",
        notificationSession.user.id
      );


  if (error) {

    console.error(
      "Error marcando notificación:",
      error
    );


    showNotificationMessage(
      "No se pudo actualizar la notificación.",
      "error"
    );


    return;
  }


  const notification =
    tikiNotifications.find(
      item =>
        item.id ===
        notificationId
    );


  if (notification) {

    notification.is_read =
      true;

  }


  renderNotifications(
    tikiNotifications
  );


  updateMarkAllButton();

}


// ======================================================
// MARCAR TODAS COMO LEÍDAS
// ======================================================

async function markAllNotificationsAsRead() {

  const unread =
    tikiNotifications.filter(
      notification =>
        !notification.is_read
    );


  if (
    unread.length === 0
  ) {

    return;

  }


  const {
    error
  } =
    await supabaseClient
      .from("notifications")
      .update(
        {
          is_read: true
        }
      )
      .eq(
        "user_id",
        notificationSession.user.id
      )
      .eq(
        "is_read",
        false
      );


  if (error) {

    console.error(
      "Error marcando todas:",
      error
    );


    showNotificationMessage(
      "No se pudieron actualizar las notificaciones.",
      "error"
    );


    return;
  }


  tikiNotifications.forEach(
    notification => {

      notification.is_read =
        true;

    }
  );


  renderNotifications(
    tikiNotifications
  );


  updateMarkAllButton();


  showNotificationMessage(
    "Notificaciones actualizadas.",
    "success"
  );

}


// ======================================================
// BOTÓN LEER TODO
// ======================================================

const markAllReadButton =
  document.getElementById(
    "markAllReadButton"
  );


if (markAllReadButton) {

  markAllReadButton.addEventListener(
    "click",
    markAllNotificationsAsRead
  );

}


// ======================================================
// ACTUALIZAR ESTADO DEL BOTÓN LEER TODO
// ======================================================

function updateMarkAllButton() {

  const button =
    document.getElementById(
      "markAllReadButton"
    );


  if (!button) {
    return;
  }


  const unreadCount =
    tikiNotifications.filter(
      notification =>
        !notification.is_read
    )
      .length;


  button.disabled =
    unreadCount === 0;


  if (
    unreadCount > 0
  ) {

    button.textContent =
      translateNotificationText(
        "Leer todo"
      );

  } else {

    button.textContent =
      translateNotificationText(
        "Todo leído"
      );

  }

}


// ======================================================
// ICONOS
// ======================================================

function notificationIcon(
  type
) {

  const normalizedType =
    String(
      type ||
      "GENERAL"
    )
      .trim()
      .toUpperCase();


  const icons = {

    GENERAL:
      "🔔",

    WELCOME:
      "👋",

    WELCOME_BONUS:
      "🎁",

    TRANSFER:
      "💸",

    TRANSFER_SENT:
      "↑",

    TRANSFER_RECEIVED:
      "↓",

    QR_PAYMENT:
      "▦",

    QR_PAYMENT_SENT:
      "▦",

    QR_PAYMENT_RECEIVED:
      "▦",

    SERVICE:
      "💡",

    SERVICE_PAYMENT:
      "💡",

    SECURITY:
      "🔐",

    ACCESS:
      "🔓",

    ADMIN:
      "⚙️",

    WARNING:
      "⚠️",

    SUCCESS:
      "✅",

    PROMOTION:
      "✨",

    NEWS:
      "📢",

    INFO:
      "ℹ️"

  };


  return (
    icons[
      normalizedType
    ] ||
    "🔔"
  );

}


// ======================================================
// TRADUCCIÓN
// ======================================================

function translateNotificationText(
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
// MENSAJES DE LA PÁGINA
// ======================================================

function showNotificationMessage(
  text,
  type = ""
) {

  const element =
    document.getElementById(
      "notificationsMessage"
    );


  if (!element) {
    return;
  }


  element.textContent =
    translateNotificationText(
      text
    );


  element.className =
    type
      ?
      "notifications-message " +
      type
      :
      "notifications-message";


  clearTimeout(
    showNotificationMessage.timer
  );


  showNotificationMessage.timer =
    setTimeout(
      function () {

        element.textContent =
          "";

        element.className =
          "notifications-message";

      },
      3500
    );

}


// ======================================================
// INICIAR
// ======================================================

initNotifications();