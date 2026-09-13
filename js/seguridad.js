// ======================================================
// TIKIPAY - SEGURIDAD
// ======================================================

let securitySession =
  null;


// ======================================================
// INICIO
// ======================================================

async function initSecurity() {

  securitySession =
    await requireAuth();


  if (!securitySession) {
    return;
  }


  renderSecurityInformation();

}


// ======================================================
// INFORMACIÓN DE SEGURIDAD
// ======================================================

function renderSecurityInformation() {

  if (!securitySession) {
    return;
  }


  const email =
    document.getElementById(
      "securityEmail"
    );


  const status =
    document.getElementById(
      "securitySessionStatus"
    );


  if (email) {

    email.textContent =
      securitySession
        .user
        .email
      || "—";

  }


  if (status) {

    status.textContent =
      translateSecurityText(
        "Sesión activa"
      );

  }

}


// ======================================================
// CAMBIAR CONTRASEÑA
// ======================================================

document
  .getElementById(
    "passwordForm"
  )
  ?.addEventListener(
    "submit",
    async function (
      event
    ) {

      event.preventDefault();


      const password =
        document
          .getElementById(
            "newPassword"
          )
          .value;


      const confirmPassword =
        document
          .getElementById(
            "confirmPassword"
          )
          .value;


      const button =
        document.getElementById(
          "changePasswordButton"
        );


      // ==================================================
      // VALIDACIONES
      // ==================================================

      if (
        password.length < 8
      ) {

        showSecurityMessage(
          "passwordMessage",
          "La contraseña debe tener al menos 8 caracteres.",
          "error"
        );

        return;

      }


      if (
        password !==
        confirmPassword
      ) {

        showSecurityMessage(
          "passwordMessage",
          "Las contraseñas no coinciden.",
          "error"
        );

        return;

      }


      // ==================================================
      // PROCESANDO
      // ==================================================

      if (button) {

        button.disabled =
          true;


        button.textContent =
          translateSecurityText(
            "Actualizando..."
          );

      }


      showSecurityMessage(
        "passwordMessage",
        "",
        ""
      );


      // ==================================================
      // SUPABASE AUTH
      // ==================================================

      const {
        error
      } =
        await supabaseClient
          .auth
          .updateUser(
            {
              password
            }
          );


      if (error) {

        console.error(
          "Error cambiando contraseña:",
          error
        );


        showSecurityMessage(
          "passwordMessage",
          securityErrorMessage(
            error
          ),
          "error"
        );


        if (button) {

          button.disabled =
            false;


          button.textContent =
            translateSecurityText(
              "Cambiar contraseña"
            );

        }


        return;

      }


      // ==================================================
      // ÉXITO
      // ==================================================

      showSecurityMessage(
        "passwordMessage",
        "Contraseña actualizada correctamente.",
        "success"
      );


      document
        .getElementById(
          "passwordForm"
        )
        .reset();


      resetPasswordEyes();


      if (button) {

        button.disabled =
          false;


        button.textContent =
          translateSecurityText(
            "Cambiar contraseña"
          );

      }

    }
  );


// ======================================================
// MOSTRAR / OCULTAR CONTRASEÑA
// ======================================================

document
  .querySelectorAll(
    "[data-password-target]"
  )
  .forEach(
    button => {

      button.addEventListener(
        "click",
        function () {

          const targetId =
            this.dataset
              .passwordTarget;


          const input =
            document.getElementById(
              targetId
            );


          if (!input) {
            return;
          }


          const isPassword =
            input.type ===
            "password";


          input.type =
            isPassword
              ? "text"
              : "password";


          this.textContent =
            isPassword
              ? "🙈"
              : "👁";

        }
      );

    }
  );


// ======================================================
// REINICIAR OJOS
// ======================================================

function resetPasswordEyes() {

  document
    .querySelectorAll(
      "[data-password-target]"
    )
    .forEach(
      button => {

        const targetId =
          button.dataset
            .passwordTarget;


        const input =
          document.getElementById(
            targetId
          );


        if (input) {

          input.type =
            "password";

        }


        button.textContent =
          "👁";

      }
    );

}


// ======================================================
// CERRAR OTRAS SESIONES
// ======================================================

document
  .getElementById(
    "closeOtherSessionsButton"
  )
  ?.addEventListener(
    "click",
    async function () {

      const button =
        this;


      button.disabled =
        true;


      button.textContent =
        translateSecurityText(
          "Procesando..."
        );


      const {
        error
      } =
        await supabaseClient
          .auth
          .signOut(
            {
              scope:
                "others"
            }
          );


      if (error) {

        console.error(
          "Error cerrando otras sesiones:",
          error
        );


        showSecurityMessage(
          "sessionsMessage",
          "No se pudieron cerrar las otras sesiones.",
          "error"
        );


        button.disabled =
          false;


        button.textContent =
          translateSecurityText(
            "Cerrar otras sesiones"
          );


        return;

      }


      showSecurityMessage(
        "sessionsMessage",
        "Las otras sesiones fueron cerradas.",
        "success"
      );


      button.disabled =
        false;


      button.textContent =
        translateSecurityText(
          "Cerrar otras sesiones"
        );

    }
  );


// ======================================================
// TRADUCCIÓN
// ======================================================

function translateSecurityText(
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
// MOSTRAR MENSAJES
// ======================================================

function showSecurityMessage(
  elementId,
  text,
  type
) {

  const element =
    document.getElementById(
      elementId
    );


  if (!element) {
    return;
  }


  element.textContent =
    text
      ? translateSecurityText(
          text
        )
      : "";


  element.className =
    type
      ? "security-message " +
        type
      : "security-message";

}


// ======================================================
// MENSAJES DE ERROR
// ======================================================

function securityErrorMessage(
  error
) {

  const message =
    String(
      error?.message
      || ""
    )
      .toLowerCase();


  if (
    message.includes(
      "same password"
    )
  ) {

    return (
      "La nueva contraseña debe ser diferente de la contraseña actual."
    );

  }


  if (
    message.includes(
      "password"
    )
    &&
    message.includes(
      "weak"
    )
  ) {

    return (
      "La contraseña es demasiado débil."
    );

  }


  if (
    message.includes(
      "reauth"
    )
    ||
    message.includes(
      "nonce"
    )
  ) {

    return (
      "Por seguridad, vuelve a iniciar sesión antes de cambiar la contraseña."
    );

  }


  return (
    "No se pudo actualizar la contraseña."
  );

}


// ======================================================
// INICIAR
// ======================================================

initSecurity();