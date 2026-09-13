// ======================================================
// PERFIL Y AJUSTES TIKIPAY
// ======================================================

let profileSession =
  null;

let currentProfile =
  null;


// ======================================================
// INICIO
// ======================================================

async function initProfileModule() {

  profileSession =
    await requireAuth();


  if (!profileSession) {
    return;
  }


  await loadProfile();


  if (
    document.getElementById(
      "profileForm"
    )
  ) {

    renderProfilePage();

  }


  if (
    document.getElementById(
      "settingsForm"
    )
  ) {

    renderSettingsPage();

  }

}


// ======================================================
// CARGAR PERFIL
// ======================================================

async function loadProfile() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select(`
        tiki_id,
        full_name,
        phone,
        country,
        preferred_currency,
        language,
        avatar_url
      `)
      .eq(
        "id",
        profileSession.user.id
      )
      .single();


  if (error) {

    console.error(
      "Error cargando perfil:",
      error
    );

    return;
  }


  currentProfile =
    data;

}


// ======================================================
// MOSTRAR PERFIL
// ======================================================

function renderProfilePage() {

  if (!currentProfile) {
    return;
  }


  const name =
    currentProfile.full_name
    || "Usuario";


  setValue(
    "profileFullName",
    name
  );


  setValue(
    "profileEmail",
    profileSession.user.email
  );


  setValue(
    "profilePhone",
    currentProfile.phone || ""
  );


  setValue(
    "profileCountry",
    currentProfile.country
    || "Bolivia"
  );


  setText(
    "profileName",
    name
  );


  setText(
    "profileTikiId",
    currentProfile.tiki_id
  );


  setText(
    "profileAvatar",
    name
      .charAt(0)
      .toUpperCase()
  );

}


// ======================================================
// GUARDAR PERFIL
// ======================================================

document
  .getElementById(
    "profileForm"
  )
  ?.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();


      const fullName =
        document
          .getElementById(
            "profileFullName"
          )
          .value
          .trim();


      const phone =
        document
          .getElementById(
            "profilePhone"
          )
          .value
          .trim();


      const country =
        document
          .getElementById(
            "profileCountry"
          )
          .value;


      if (!fullName) {

        showProfileMessage(
          document.getElementById(
            "profileMessage"
          ),
          "El nombre completo es obligatorio.",
          "error"
        );

        return;
      }


      const {
        error
      } =
        await supabaseClient
          .from("profiles")
          .update(
            {
              full_name:
                fullName,

              phone:
                phone || null,

              country,

              updated_at:
                new Date()
                  .toISOString()
            }
          )
          .eq(
            "id",
            profileSession.user.id
          );


      const message =
        document.getElementById(
          "profileMessage"
        );


      if (error) {

        console.error(
          "Error guardando perfil:",
          error
        );


        showProfileMessage(
          message,
          "No se pudieron guardar los cambios.",
          "error"
        );

        return;
      }


      currentProfile.full_name =
        fullName;


      currentProfile.phone =
        phone;


      currentProfile.country =
        country;


      renderProfilePage();


      showProfileMessage(
        message,
        "Perfil actualizado.",
        "success"
      );

    }
  );


// ======================================================
// MOSTRAR AJUSTES
// ======================================================

function renderSettingsPage() {

  if (!currentProfile) {
    return;
  }


  setValue(
    "preferredLanguage",
    currentProfile.language
    || "es"
  );


  setValue(
    "preferredCurrency",
    currentProfile
      .preferred_currency
    || "BOB"
  );


  const hidden =
    localStorage.getItem(
      "tikipay_hide_balance"
    );


  const notifications =
    localStorage.getItem(
      "tikipay_notifications"
    );


  const hideCheckbox =
    document.getElementById(
      "hideBalanceDefault"
    );


  if (hideCheckbox) {

    hideCheckbox.checked =
      hidden === "true";

  }


  const notificationCheckbox =
    document.getElementById(
      "notificationsEnabled"
    );


  if (notificationCheckbox) {

    notificationCheckbox.checked =
      notifications !== "false";

  }

}


// ======================================================
// GUARDAR AJUSTES
// ======================================================

document
  .getElementById(
    "settingsForm"
  )
  ?.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();


      const language =
        document
          .getElementById(
            "preferredLanguage"
          )
          .value;


      const currency =
        document
          .getElementById(
            "preferredCurrency"
          )
          .value;


      const hideBalance =
        document
          .getElementById(
            "hideBalanceDefault"
          )
          .checked;


      const notifications =
        document
          .getElementById(
            "notificationsEnabled"
          )
          .checked;


      // -----------------------------------------------
      // VALIDACIÓN
      // -----------------------------------------------

      if (
        language !== "es"
        &&
        language !== "en"
      ) {

        showProfileMessage(
          document.getElementById(
            "settingsMessage"
          ),
          "Idioma no válido.",
          "error"
        );

        return;
      }


      // -----------------------------------------------
      // SUPABASE
      // -----------------------------------------------

      const {
        error
      } =
        await supabaseClient
          .from("profiles")
          .update(
            {
              language,

              preferred_currency:
                currency,

              updated_at:
                new Date()
                  .toISOString()
            }
          )
          .eq(
            "id",
            profileSession.user.id
          );


      if (error) {

        console.error(
          "Error guardando ajustes:",
          error
        );


        showProfileMessage(
          document.getElementById(
            "settingsMessage"
          ),
          "No se pudieron guardar los ajustes.",
          "error"
        );

        return;
      }


      // -----------------------------------------------
      // ACTUALIZAR DATOS LOCALES
      // -----------------------------------------------

      currentProfile.language =
        language;


      currentProfile.preferred_currency =
        currency;


      // -----------------------------------------------
      // LOCAL STORAGE
      // -----------------------------------------------

      localStorage.setItem(
        "tikipay_language",
        language
      );


      localStorage.setItem(
        "tikipay_hide_balance",
        String(
          hideBalance
        )
      );


      localStorage.setItem(
        "tikipay_notifications",
        String(
          notifications
        )
      );


      // -----------------------------------------------
      // MENSAJE
      // -----------------------------------------------

      showProfileMessage(
        document.getElementById(
          "settingsMessage"
        ),
        "Ajustes guardados.",
        "success"
      );


      // -----------------------------------------------
      // APLICAR NUEVO IDIOMA
      // -----------------------------------------------

      setTimeout(
        function () {

          if (
            typeof setTikiPayLanguage ===
            "function"
          ) {

            setTikiPayLanguage(
              language
            );

          } else {

            window.location.reload();

          }

        },
        500
      );

    }
  );


// ======================================================
// CERRAR SESIÓN
// ======================================================

document
  .getElementById(
    "logoutButton"
  )
  ?.addEventListener(
    "click",
    logoutTikiPay
  );


// ======================================================
// HELPERS
// ======================================================

function setValue(
  id,
  value
) {

  const element =
    document.getElementById(
      id
    );


  if (element) {

    element.value =
      value ?? "";

  }

}


function setText(
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
// MENSAJES
// ======================================================

function showProfileMessage(
  element,
  text,
  type
) {

  if (!element) {
    return;
  }


  element.textContent =
    typeof tikiT === "function"
      ? tikiT(text)
      : text;


  element.className =
    "message " + type;

}


// ======================================================
// INICIAR
// ======================================================

initProfileModule();