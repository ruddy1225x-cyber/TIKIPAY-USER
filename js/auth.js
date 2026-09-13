// ======================================================
// TIKIPAY AUTH
// ======================================================


// ======================================================
// INDEX - REDIRECCIÓN AUTOMÁTICA
// ======================================================

async function handleIndexPage() {

  const isIndex =
    location.pathname.endsWith("/") ||
    location.pathname.endsWith("index.html");


  if (!isIndex) {
    return;
  }


  const session =
    await getCurrentSession();


  setTimeout(
    () => {

      if (session) {

        window.location.replace(
          "dashboard.html"
        );

      } else {

        window.location.replace(
          "login.html"
        );

      }

    },
    700
  );
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


      const fullName =
        document
          .getElementById("fullName")
          .value
          .trim();


      const email =
        document
          .getElementById("email")
          .value
          .trim()
          .toLowerCase();


      const password =
        document
          .getElementById("password")
          .value;


      const confirmPassword =
        document
          .getElementById(
            "confirmPassword"
          )
          .value;


      const terms =
        document.getElementById(
          "acceptTerms"
        );


      const message =
        document.getElementById(
          "message"
        );


      if (fullName.length < 3) {

        showAuthMessage(
          message,
          "Escribe tu nombre completo.",
          "error"
        );

        return;
      }


      if (password.length < 8) {

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


      showAuthMessage(
        message,
        "Creando tu cuenta...",
        ""
      );


      const {
        data,
        error
      } =
        await supabaseClient
          .auth
          .signUp(
            {
              email,
              password,

              options: {
                data: {
                  full_name:
                    fullName
                }
              }
            }
          );


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
        data.session
      ) {

        showAuthMessage(
          message,
          "Cuenta creada correctamente.",
          "success"
        );


        setTimeout(
          () => {

            window.location.href =
              "dashboard.html";

          },
          1000
        );

      } else {

        showAuthMessage(
          message,
          "Cuenta creada. Revisa tu correo para confirmar tu cuenta.",
          "success"
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
          .value
          .trim()
          .toLowerCase();


      const password =
        document
          .getElementById(
            "loginPassword"
          )
          .value;


      const message =
        document.getElementById(
          "loginMessage"
        );


      // --------------------------------------
      // MENSAJE DE CARGA
      // --------------------------------------

      showAuthMessage(
        message,
        "Iniciando sesión...",
        ""
      );


      // --------------------------------------
      // LOGIN SUPABASE
      // --------------------------------------

      const {
        data,
        error
      } =
        await supabaseClient
          .auth
          .signInWithPassword(
            {
              email,
              password
            }
          );


      // --------------------------------------
      // ERROR DE LOGIN
      // --------------------------------------

      if (error) {

        showAuthMessage(
          message,
          "Correo o contraseña incorrectos.",
          "error"
        );

        return;
      }


      // --------------------------------------
      // VERIFICAR SESIÓN
      // --------------------------------------

      if (
        !data ||
        !data.session ||
        !data.user
      ) {

        showAuthMessage(
          message,
          "No se pudo iniciar la sesión.",
          "error"
        );

        return;
      }


      // --------------------------------------
      // CONSULTAR ESTADO DE CUENTA TIKIPAY
      // --------------------------------------

      const {
        data: account,
        error: accountError
      } =
        await supabaseClient
          .from("accounts")
          .select(
            "status"
          )
          .eq(
            "user_id",
            data.user.id
          )
          .single();


      // --------------------------------------
      // ERROR VALIDANDO CUENTA
      // --------------------------------------

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


      // --------------------------------------
      // CUENTAS QUE NO PUEDEN INICIAR SESIÓN
      // --------------------------------------

      if (
        account.status ===
          "LOGIN_BLOCKED"
        ||
        account.status ===
          "SUSPENDED"
        ||
        account.status ===
          "CLOSED"
      ) {

        await supabaseClient
          .auth
          .signOut();


        showAuthMessage(
          message,
          "Tu cuenta no está disponible actualmente.",
          "error"
        );

        return;
      }


      // --------------------------------------
      // LOGIN CORRECTO
      // --------------------------------------

      showAuthMessage(
        message,
        "Bienvenido a TikiPay.",
        "success"
      );


      setTimeout(
        () => {

          window.location.replace(
            "dashboard.html"
          );

        },
        500
      );

    }
  );

}

// ======================================================
// OJO LOGIN
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
// OJO REGISTRO
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
// RECUPERACIÓN
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
          .value
          .trim()
          .toLowerCase();


      const message =
        document.getElementById(
          "recoveryMessage"
        );


      showAuthMessage(
        message,
        "Enviando recuperación...",
        ""
      );


      const redirectTo =
        new URL(
          "seguridad.html",
          window.location.href
        ).href;


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

        showAuthMessage(
          message,
          translateAuthError(
            error.message
          ),
          "error"
        );

        return;
      }


      showAuthMessage(
        message,
        "Si el correo existe, recibirás instrucciones para cambiar tu contraseña.",
        "success"
      );

    }
  );

}


// ======================================================
// SI YA ESTÁ LOGUEADO EN LOGIN/REGISTRO
// ======================================================

async function redirectLoggedUser() {

  const currentPage =
    location.pathname
      .split("/")
      .pop();


  if (
    currentPage !==
      "login.html" &&
    currentPage !==
      "registro.html"
  ) {

    return;
  }


  const session =
    await getCurrentSession();


  if (session) {

    window.location.replace(
      "dashboard.html"
    );

  }

}


// ======================================================
// FUNCIONES
// ======================================================

function togglePasswordField(
  id,
  button
) {

  const input =
    document.getElementById(id);


  if (!input) {
    return;
  }


  const visible =
    input.type === "text";


  input.type =
    visible
      ? "password"
      : "text";


  button.textContent =
    visible
      ? "👁"
      : "🙈";
}


function showAuthMessage(
  element,
  text,
  type
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


function translateAuthError(
  error
) {

  const text =
    String(error).toLowerCase();


  if (
    text.includes(
      "already registered"
    )
  ) {
    return "Ese correo ya está registrado.";
  }


  if (
    text.includes(
      "password"
    )
  ) {
    return "La contraseña no cumple los requisitos.";
  }


  if (
    text.includes(
      "email"
    )
  ) {
    return "Verifica el correo electrónico.";
  }


  return (
    "No se pudo completar la operación."
  );
}


// ======================================================
// INICIO
// ======================================================

handleIndexPage();
redirectLoggedUser();