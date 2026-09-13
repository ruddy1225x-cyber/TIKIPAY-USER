// ======================================================
// TIKIPAY - CONEXIÓN CON SUPABASE
// ======================================================

const SUPABASE_URL =
  "https://szirswibnjkxdfiozbqk.supabase.co";

const SUPABASE_KEY =
  "sb_publishable_iikN_hv-lfGqt4aedO_m1w_zrJv9vdy";


// Cliente global
window.supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );


// ======================================================
// OBTENER SESIÓN
// ======================================================

window.getCurrentSession =
  async function () {

    const {
      data,
      error
    } =
      await window.supabaseClient
        .auth
        .getSession();

    if (error) {
      console.error(
        "Error obteniendo sesión:",
        error
      );

      return null;
    }

    return data.session;
  };


// ======================================================
// OBTENER USUARIO
// ======================================================

window.getCurrentUser =
  async function () {

    const {
      data,
      error
    } =
      await window.supabaseClient
        .auth
        .getUser();

    if (error) {
      return null;
    }

    return data.user;
  };


// ======================================================
// PROTEGER PÁGINAS PRIVADAS
// ======================================================

window.requireAuth =
  async function () {

    const session =
      await window.getCurrentSession();

    if (!session) {

      window.location.replace(
        "login.html"
      );

      return null;
    }

    return session;
  };


// ======================================================
// FORMATO BOLIVIANOS
// ======================================================

window.formatBOB =
  function (value) {

    const number =
      Number(value || 0);

    return (
      "Bs " +
      number.toLocaleString(
        "es-BO",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      )
    );
  };


// ======================================================
// FECHA
// ======================================================

window.formatTikiDate =
  function (value) {

    if (!value) {
      return "";
    }

    return new Date(value)
      .toLocaleString(
        "es-BO",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }
      );
  };


// ======================================================
// SEGURIDAD HTML
// ======================================================

window.escapeHTML =
  function (value = "") {

    const element =
      document.createElement("div");

    element.textContent =
      String(value);

    return element.innerHTML;
  };


// ======================================================
// CERRAR SESIÓN
// ======================================================

window.logoutTikiPay =
  async function () {

    await window.supabaseClient
      .auth
      .signOut();

    window.location.replace(
      "login.html"
    );
  };