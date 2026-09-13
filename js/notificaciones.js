// ======================================================
// TIKIPAY - NOTIFICACIONES
// ======================================================

let notificationSession =
  null;

let tikiNotifications =
  [];


// ======================================================
// INICIO
// ======================================================

async function initNotifications() {

  notificationSession =
    await requireAuth();


  if (!notificationSession) {
    return;
  }


  await loadNotifications();

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
        created_at
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
  // VACÍO
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
  // TARJETAS
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
// MARCAR UNA COMO LEÍDA
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
// ESTADO DEL BOTÓN
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

  const icons = {

    GENERAL:
      "🔔",

    TRANSFER:
      "💸",

    TRANSFER_SENT:
      "↑",

    TRANSFER_RECEIVED:
      "↓",

    SECURITY:
      "🔐",

    SERVICE:
      "💡",

    ACCESS:
      "🔓",

    ADMIN:
      "⚙️",

    WARNING:
      "⚠️",

    SUCCESS:
      "✅"

  };


  return (
    icons[type] ||
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
// MENSAJES
// ======================================================

function showNotificationMessage(
  text,
  type
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
    "notifications-message " +
    type;


  setTimeout(
    function () {

      element.textContent =
        "";

    },
    3500
  );

}


// ======================================================
// INICIAR
// ======================================================

initNotifications();