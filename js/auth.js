// ======================================================
// TIKIPAY - AUTH
// ======================================================


// ======================================================
// CONFIGURACIÓN
// ======================================================

const TIKIPAY_PAGES = {
  dashboard: "dashboard.html",
  login: "login.html",
  register: "registro.html",
  recovery: "recuperar.html",
  security: "seguridad.html"
};


// ======================================================
// INDEX - REDIRECCIÓN AUTOMÁTICA
// ======================================================

async function handleIndexPage() {

  const pathname =
    window.location.pathname;

  const isIndex =
    pathname.endsWith("/") ||
    pathname.endsWith("/index.html") ||
    pathname.endsWith("index.html");


  if (!isIndex) {
    return;
  }


  try {

    const session =
      await getCurrentSession();


    setTimeout(
      () => {

        if (session) {

          window.location.replace(
            TIKIPAY_PAGES.dashboard
          );

        } else {

          window.location.replace(
            TIKIPAY_PAGES.login
          );

        }

      },
      350
    );

  } catch (error) {

    console.error(
      "Error verificando sesión:",
      error
    );


    window.location.replace(
      TIKIPAY_PAGES.login
    );

  }

}


// ======================================================
// REGISTRO
// ======================================================

const registerForm =
  document.getElementById(
    "registerForm"
  );


if (registerForm) {

  registerForm.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();


      const fullNameInput =
        document.getElementById(
          "fullName"
        );

      const emailInput =
        document.getElementById(
          "email"
        );

      const passwordInput =
        document.getElementById(
          "password"
        );

      const confirmPasswordInput =
        document.getElementById(
          "confirmPassword"
        );

      const terms =
        document.getElementById(
          "acceptTerms"
        );

      const message =
        document.getElementById(
          "message"
        );


      const fullName =
        fullNameInput
          ?.value
          .trim() || "";

      const email =
        emailInput
          ?.value
          .trim()
          .toLowerCase() || "";

      const password =
        passwordInput
          ?.value || "";

      const confirmPassword =
        confirmPasswordInput
          ?.value || "";


      // --------------------------------------------------
      // VALIDACIONES
      // --------------------------------------------------

      if (
        fullName.length <
        3
      ) {

        showAuthMessage(
          message,
          "Escribe tu nombre completo.",
          "error"
        );

        return;
      }


      if (
        !isValidEmail(email)
      ) {

        showAuthMessage(
          message,
          "Escribe un correo electrónico válido.",
          "error"
        );

        return;
      }


      if (
        password.length <
        8
      ) {

        showAuthMessage(
          message,
          "La contraseña debe tener al menos 8 caracteres.",
          "error"
        );

        return;
      }


      if (
        password !==
        confirmPassword
      ) {

        showAuthMessage(
          message,
          "Las contraseñas no coinciden.",
          "error"
        );

        return;
      }


      if (
        terms &&
        !terms.checked
      ) {

        showAuthMessage(
          message,
          "Debes aceptar los términos y condiciones.",
          "error"
        );

        return;
      }


      setFormBusy(
        registerForm,
        true,
        "Creando cuenta..."
      );


      showAuthMessage(
        message,
        "Creando tu cuenta...",
        ""
      );


      try {

        // --------------------------------------------------
        // URL DE CONFIRMACIÓN
        // Funciona en localhost y Vercel
        // --------------------------------------------------

        const emailRedirectTo =
          `${window.location.origin}/login.html?confirmed=1`;


        const {
          data,
          error
        } =
          await supabaseClient
            .auth
            .signUp({
              email,
              password,

              options: {

                data: {
                  full_name:
                    fullName
                },

                emailRedirectTo:
                  emailRedirectTo

              }

            });


        if (error) {

          showAuthMessage(
            message,
            translateAuthError(
              error.message
            ),
            "error"
          );

          return;
        }


        // --------------------------------------------------
        // SI CONFIRM EMAIL ESTÁ DESACTIVADO
        // Supabase devuelve sesión inmediatamente
        // --------------------------------------------------

        if (
          data?.session
        ) {

          showAuthMessage(
            message,
            "Cuenta creada correctamente. Iniciando sesión...",
            "success"
          );


          setTimeout(
            () => {

              window.location.replace(
                TIKIPAY_PAGES.dashboard
              );

            },
            1000
          );


          return;
        }


        // --------------------------------------------------
        // CONFIRM EMAIL ACTIVADO
        // --------------------------------------------------

        showAuthMessage(
          message,
          "Cuenta creada. Te enviamos un correo de verificación. Revisa tu bandeja de entrada y confirma tu cuenta antes de iniciar sesión.",
          "success"
        );


        registerForm.reset();


      } catch (error) {

        console.error(
          "Error durante el registro:",
          error
        );


        showAuthMessage(
          message,
          "No se pudo crear la cuenta. Inténtalo nuevamente.",
          "error"
        );

      } finally {

        setFormBusy(
          registerForm,
          false
        );

      }

    }
  );

}


// ======================================================
// LOGIN
// ======================================================

const loginForm =
  document.getElementById(
    "loginForm"
  );


if (loginForm) {

  loginForm.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();


      const email =
        document
          .getElementById(
            "loginEmail"
          )
          ?.value
          .trim()
          .toLowerCase() || "";


      const password =
        document
          .getElementById(
            "loginPassword"
          )
          ?.value || "";


      const message =
        document.getElementById(
          "loginMessage"
        );


      if (
        !email ||
        !password
      ) {

        showAuthMessage(
          message,
          "Ingresa tu correo y contraseña.",
          "error"
        );

        return;
      }


      setFormBusy(
        loginForm,
        true,
        "Verificando..."
      );


      showAuthMessage(
        message,
        "Verificando credenciales...",
        ""
      );


      try {

        // --------------------------------------------------
        // INICIAR SESIÓN
        // --------------------------------------------------

        const {
          data,
          error
        } =
          await supabaseClient
            .auth
            .signInWithPassword({
              email,
              password
            });


        if (error) {

          showAuthMessage(
            message,
            translateAuthError(
              error.message
            ),
            "error"
          );

          return;
        }


        if (
          !data?.session ||
          !data?.user
        ) {

          showAuthMessage(
            message,
            "No se pudo iniciar la sesión.",
            "error"
          );

          return;
        }


        // --------------------------------------------------
        // VALIDAR ESTADO DE CUENTA TIKIPAY
        // --------------------------------------------------

        const {
          data: account,
          error: accountError
        } =
          await supabaseClient
            .from(
              "accounts"
            )
            .select(
              "status"
            )
            .eq(
              "user_id",
              data.user.id
            )
            .single();


        if (
          accountError ||
          !account
        ) {

          console.error(
            "Error validando cuenta:",
            accountError
          );


          await supabaseClient
            .auth
            .signOut();


          showAuthMessage(
            message,
            "No se pudo validar tu cuenta TikiPay.",
            "error"
          );

          return;
        }


        // --------------------------------------------------
        // CUENTAS BLOQUEADAS
        // --------------------------------------------------

        const blockedStatuses = [
          "LOGIN_BLOCKED",
          "SUSPENDED",
          "CLOSED"
        ];


        if (
          blockedStatuses.includes(
            account.status
          )
        ) {

          await supabaseClient
            .auth
            .signOut();


          showAuthMessage(
            message,
            "Tu cuenta no está disponible actualmente. Contacta con soporte TikiPay.",
            "error"
          );

          return;
        }


        // --------------------------------------------------
        // LOGIN CORRECTO
        // --------------------------------------------------

        showAuthMessage(
          message,
          "Bienvenido a TikiPay.",
          "success"
        );


        setTimeout(
          () => {

            window.location.replace(
              TIKIPAY_PAGES.dashboard
            );

          },
          500
        );


      } catch (error) {

        console.error(
          "Error iniciando sesión:",
          error
        );


        showAuthMessage(
          message,
          "No se pudo conectar con TikiPay. Inténtalo nuevamente.",
          "error"
        );

      } finally {

        setFormBusy(
          loginForm,
          false
        );

      }

    }
  );

}


// ======================================================
// CONFIRMACIÓN DE CORREO
// ======================================================

function showEmailConfirmationMessage() {

  const currentPage =
    window.location.pathname
      .split("/")
      .pop();


  if (
    currentPage !==
    "login.html"
  ) {
    return;
  }


  const params =
    new URLSearchParams(
      window.location.search
    );


  const confirmed =
    params.get(
      "confirmed"
    );


  if (
    confirmed !==
    "1"
  ) {
    return;
  }


  const message =
    document.getElementById(
      "loginMessage"
    );


  showAuthMessage(
    message,
    "Correo verificado correctamente. Ya puedes iniciar sesión en TikiPay.",
    "success"
  );


  // Limpiar ?confirmed=1 sin recargar

  window.history.replaceState(
    {},
    document.title,
    "login.html"
  );

}


// ======================================================
// RECUPERACIÓN DE CONTRASEÑA
// ======================================================

const recoveryForm =
  document.getElementById(
    "recoveryForm"
  );


if (recoveryForm) {

  recoveryForm.addEventListener(
    "submit",
    async function (event) {

      event.preventDefault();


      const email =
        document
          .getElementById(
            "recoveryEmail"
          )
          ?.value
          .trim()
          .toLowerCase() || "";


      const message =
        document.getElementById(
          "recoveryMessage"
        );


      if (
        !isValidEmail(email)
      ) {

        showAuthMessage(
          message,
          "Escribe un correo electrónico válido.",
          "error"
        );

        return;
      }


      setFormBusy(
        recoveryForm,
        true,
        "Enviando..."
      );


      showAuthMessage(
        message,
        "Enviando recuperación...",
        ""
      );


      try {

        const redirectTo =
          `${window.location.origin}/seguridad.html?recovery=1`;


        const {
          error
        } =
          await supabaseClient
            .auth
            .resetPasswordForEmail(
              email,
              {
                redirectTo
              }
            );


        if (error) {

          console.error(
            "Error recuperación:",
            error
          );


          showAuthMessage(
            message,
            translateAuthError(
              error.message
            ),
            "error"
          );

          return;
        }


        // Mensaje deliberadamente genérico
        // para no revelar si un correo existe.

        showAuthMessage(
          message,
          "Si el correo está registrado en TikiPay, recibirás instrucciones para cambiar tu contraseña.",
          "success"
        );


      } catch (error) {

        console.error(
          "Error de recuperación:",
          error
        );


        showAuthMessage(
          message,
          "No se pudo enviar la recuperación. Inténtalo nuevamente.",
          "error"
        );

      } finally {

        setFormBusy(
          recoveryForm,
          false
        );

      }

    }
  );

}


// ======================================================
// OJO - LOGIN
// ======================================================

const togglePassword =
  document.getElementById(
    "togglePassword"
  );


if (togglePassword) {

  togglePassword.addEventListener(
    "click",
    function () {

      togglePasswordField(
        "loginPassword",
        togglePassword
      );

    }
  );

}


// ======================================================
// OJO - REGISTRO
// ======================================================

const toggleRegisterPassword =
  document.getElementById(
    "toggleRegisterPassword"
  );


if (toggleRegisterPassword) {

  toggleRegisterPassword
    .addEventListener(
      "click",
      function () {

        togglePasswordField(
          "password",
          toggleRegisterPassword
        );

      }
    );

}


// ======================================================
// OJO - CONFIRMAR CONTRASEÑA
// ======================================================

const toggleConfirmPassword =
  document.getElementById(
    "toggleConfirmPassword"
  );


if (toggleConfirmPassword) {

  toggleConfirmPassword
    .addEventListener(
      "click",
      function () {

        togglePasswordField(
          "confirmPassword",
          toggleConfirmPassword
        );

      }
    );

}


// ======================================================
// REDIRECCIÓN SI YA EXISTE SESIÓN
// ======================================================

async function redirectLoggedUser() {

  const currentPage =
    window.location.pathname
      .split("/")
      .pop();


  const publicAuthPages = [
    "login.html",
    "registro.html"
  ];


  if (
    !publicAuthPages.includes(
      currentPage
    )
  ) {
    return;
  }


  try {

    const session =
      await getCurrentSession();


    if (!session) {
      return;
    }


    // Si viene de confirmar email,
    // permitimos que Supabase termine
    // de procesar la URL antes de redirigir.

    const params =
      new URLSearchParams(
        window.location.search
      );


    const confirmed =
      params.get(
        "confirmed"
      );


    if (
      confirmed ===
      "1"
    ) {

      setTimeout(
        () => {

          window.location.replace(
            TIKIPAY_PAGES.dashboard
          );

        },
        1400
      );


      return;
    }


    window.location.replace(
      TIKIPAY_PAGES.dashboard
    );


  } catch (error) {

    console.error(
      "Error verificando sesión:",
      error
    );

  }

}


// ======================================================
// CAMBIAR VISIBILIDAD DE CONTRASEÑA
// ======================================================

function togglePasswordField(
  id,
  button
) {

  const input =
    document.getElementById(
      id
    );


  if (!input) {
    return;
  }


  const isVisible =
    input.type ===
    "text";


  input.type =
    isVisible
      ? "password"
      : "text";


  if (button) {

    button.textContent =
      isVisible
        ? "👁"
        : "🙈";

  }

}


// ======================================================
// MOSTRAR MENSAJES
// ======================================================

function showAuthMessage(
  element,
  text,
  type = ""
) {

  if (!element) {
    return;
  }


  element.textContent =
    text;


  element.className =
    "message" +
    (
      type
        ? " " + type
        : ""
    );

}


// ======================================================
// ACTIVAR / DESACTIVAR FORMULARIO
// ======================================================

function setFormBusy(
  form,
  busy,
  busyText = ""
) {

  if (!form) {
    return;
  }


  const button =
    form.querySelector(
      'button[type="submit"]'
    );


  if (!button) {
    return;
  }


  if (
    !button.dataset
      .originalText
  ) {

    button.dataset.originalText =
      button.textContent.trim();

  }


  button.disabled =
    busy;


  if (busy) {

    if (busyText) {

      button.textContent =
        busyText;

    }

  } else {

    button.textContent =
      button.dataset.originalText;

  }

}


// ======================================================
// VALIDAR EMAIL
// ======================================================

function isValidEmail(
  email
) {

  const value =
    String(
      email || ""
    ).trim();


  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    .test(
      value
    );

}


// ======================================================
// TRADUCIR ERRORES DE SUPABASE
// ======================================================

function translateAuthError(
  error
) {

  const text =
    String(
      error || ""
    ).toLowerCase();


  // --------------------------------------------------
  // EMAIL NO CONFIRMADO
  // --------------------------------------------------

  if (
    text.includes(
      "email not confirmed"
    )
  ) {

    return "Debes confirmar tu correo electrónico antes de iniciar sesión.";
  }


  // --------------------------------------------------
  // LOGIN INCORRECTO
  // --------------------------------------------------

  if (
    text.includes(
      "invalid login credentials"
    )
  ) {

    return "Correo o contraseña incorrectos.";
  }


  // --------------------------------------------------
  // USUARIO YA EXISTE
  // --------------------------------------------------

  if (
    text.includes(
      "already registered"
    )
    ||
    text.includes(
      "user already registered"
    )
  ) {

    return "Ese correo ya está registrado en TikiPay.";
  }


  // --------------------------------------------------
  // DEMASIADOS CORREOS
  // --------------------------------------------------

  if (
    text.includes(
      "email rate limit"
    )
    ||
    text.includes(
      "over_email_send_rate_limit"
    )
    ||
    text.includes(
      "rate limit"
    )
  ) {

    return "Se enviaron demasiados correos. Espera un momento e inténtalo nuevamente.";
  }


  // --------------------------------------------------
  // SIGNUP DESACTIVADO
  // --------------------------------------------------

  if (
    text.includes(
      "signup is disabled"
    )
    ||
    text.includes(
      "signups not allowed"
    )
  ) {

    return "El registro de nuevos usuarios está temporalmente deshabilitado.";
  }


  // --------------------------------------------------
  // CONTRASEÑA
  // --------------------------------------------------

  if (
    text.includes(
      "password should be"
    )
    ||
    text.includes(
      "weak password"
    )
  ) {

    return "La contraseña no cumple los requisitos de seguridad.";
  }


  // --------------------------------------------------
  // SMTP
  // --------------------------------------------------

  if (
    text.includes(
      "smtp"
    )
    ||
    text.includes(
      "error sending"
    )
    ||
    text.includes(
      "unexpected_failure"
    )
  ) {

    return "No se pudo enviar el correo. Inténtalo nuevamente en unos momentos.";
  }


  // --------------------------------------------------
  // EMAIL INVÁLIDO
  // --------------------------------------------------

  if (
    text.includes(
      "invalid email"
    )
  ) {

    return "El correo electrónico no es válido.";
  }


  // --------------------------------------------------
  // NETWORK
  // --------------------------------------------------

  if (
    text.includes(
      "failed to fetch"
    )
    ||
    text.includes(
      "network"
    )
  ) {

    return "No se pudo conectar con TikiPay. Verifica tu conexión a Internet.";
  }


  // --------------------------------------------------
  // DEFAULT
  // --------------------------------------------------

  return "No se pudo completar la operación. Inténtalo nuevamente.";

}


// ======================================================
// INICIAR
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  async function () {

    showEmailConfirmationMessage();

    await handleIndexPage();

    await redirectLoggedUser();

  }
);