// ======================================================
// TIKIPAY - ASISTENTE
// Motor local de asistencia
// Sin ChatGPT / sin API externa
// ======================================================

let assistantSession = null;

let assistantProfile = null;
let assistantAccount = null;
let assistantAccesses = [];


// ======================================================
// INICIO
// ======================================================

async function initTikiAssistant() {

  assistantSession =
    await requireAuth();


  if (!assistantSession) {
    return;
  }


  await Promise.all([
    loadAssistantProfile(),
    loadAssistantAccount(),
    loadAssistantAccess()
  ]);


  bindAssistantEvents();


  const name =
    assistantProfile?.full_name
      ?.split(" ")[0]
      ||
      "usuario";


  addBotMessage(
    `Hola ${name} 👋\nSoy el Asistente TikiPay. Puedo ayudarte con tu saldo, transferencias, recepción de dinero, seguridad, MetaMask y TikiPay Access.`
  );
}


// ======================================================
// PERFIL
// ======================================================

async function loadAssistantProfile() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("profiles")
      .select(`
        id,
        tiki_id,
        full_name,
        language
      `)
      .eq(
        "id",
        assistantSession.user.id
      )
      .single();


  if (error) {

    console.error(
      "Assistant profile:",
      error
    );

    return;
  }


  assistantProfile = data;
}


// ======================================================
// CUENTA
// ======================================================

async function loadAssistantAccount() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("accounts")
      .select(`
        currency,
        available_balance,
        frozen_balance,
        status
      `)
      .eq(
        "user_id",
        assistantSession.user.id
      )
      .single();


  if (error) {

    console.error(
      "Assistant account:",
      error
    );

    return;
  }


  assistantAccount = data;
}


// ======================================================
// TIKIPAY ACCESS
// ======================================================

async function loadAssistantAccess() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from("unlock_access")
      .select(`
        id,
        service_id,
        network,
        token_id,
        valid_until,
        status,
        wallet_address,
        services (
          name
        )
      `)
      .eq(
        "user_id",
        assistantSession.user.id
      )
      .eq(
        "status",
        "ACTIVE"
      );


  if (error) {

    console.error(
      "Assistant access:",
      error
    );

    assistantAccesses = [];

    return;
  }


  assistantAccesses =
    (data || []).filter(
      access =>
        !assistantAccessExpired(
          access.valid_until
        )
    );
}


// ======================================================
// EVENTOS
// ======================================================

function bindAssistantEvents() {

  const form =
    document.getElementById(
      "assistantForm"
    );

  const input =
    document.getElementById(
      "assistantInput"
    );


  form?.addEventListener(
    "submit",
    function (event) {

      event.preventDefault();


      const question =
        input.value.trim();


      if (!question) {
        return;
      }


      processAssistantQuestion(
        question
      );


      input.value = "";
    }
  );


  document
    .querySelectorAll(
      ".quick-btn"
    )
    .forEach(
      button => {

        button.addEventListener(
          "click",
          function () {

            const question =
              button.dataset.question;


            if (question) {

              processAssistantQuestion(
                question
              );
            }
          }
        );

      }
    );
}


// ======================================================
// PROCESAR CONSULTA
// ======================================================

function processAssistantQuestion(
  question
) {

  addUserMessage(
    question
  );


  const normalized =
    normalizeAssistantText(
      question
    );


  setTimeout(
    function () {

      const answer =
        getAssistantAnswer(
          normalized
        );


      addBotMessage(
        answer.text,
        answer.link,
        answer.button
      );

    },
    250
  );
}


// ======================================================
// MOTOR DE RESPUESTAS
// ======================================================

function getAssistantAnswer(
  text
) {

  // --------------------------------------------------
  // SALDO
  // --------------------------------------------------

  if (
    hasWords(
      text,
      [
        "saldo",
        "dinero tengo",
        "balance",
        "cuanto tengo"
      ]
    )
  ) {

    const amount =
      Number(
        assistantAccount
          ?.available_balance ||
        0
      );


    return {

      text:
        `Tu saldo disponible es ${formatAssistantMoney(amount)}.\n\nEstado de la cuenta: ${formatAssistantAccountStatus(assistantAccount?.status)}.`,

      link:
        "billetera.html",

      button:
        "Abrir billetera"

    };
  }


  // --------------------------------------------------
  // ENVIAR
  // --------------------------------------------------

  if (
    hasWords(
      text,
      [
        "enviar",
        "transferir",
        "transferencia"
      ]
    )
  ) {

    return {

      text:
        "Para enviar dinero necesitas el TIKI-ID o correo del destinatario. TikiPay validará el destinatario, el saldo disponible y el estado de tu cuenta antes de completar la transferencia.",

      link:
        "enviar.html",

      button:
        "Enviar dinero"

    };
  }


  // --------------------------------------------------
  // RECIBIR / QR
  // --------------------------------------------------

  if (
    hasWords(
      text,
      [
        "recibir",
        "qr",
        "codigo qr",
        "tiki id"
      ]
    )
  ) {

    return {

      text:
        `Tu TIKI-ID es ${assistantProfile?.tiki_id || "—"}.\n\nPuedes compartirlo o utilizar tu código QR para que otro usuario TikiPay te envíe dinero.`,

      link:
        "recibir.html",

      button:
        "Mostrar mi QR"

    };
  }


  // --------------------------------------------------
  // CONTRASEÑA
  // --------------------------------------------------

  if (
    hasWords(
      text,
      [
        "contraseña",
        "password",
        "clave",
        "cambiar contraseña"
      ]
    )
  ) {

    return {

      text:
        "Puedes cambiar la contraseña desde Seguridad. TikiPay nunca mostrará ni solicitará tu contraseña actual en este asistente.",

      link:
        "seguridad.html",

      button:
        "Abrir Seguridad"

    };
  }


  // --------------------------------------------------
  // MOVIMIENTOS
  // --------------------------------------------------

  if (
    hasWords(
      text,
      [
        "movimiento",
        "historial",
        "operaciones",
        "transacciones"
      ]
    )
  ) {

    return {

      text:
        "Puedes consultar el historial de depósitos, transferencias, créditos y otras operaciones desde Movimientos.",

      link:
        "movimientos.html",

      button:
        "Ver movimientos"

    };
  }


  // --------------------------------------------------
  // SERVICIOS
  // --------------------------------------------------

  if (
    hasWords(
      text,
      [
        "servicio",
        "pagar servicio",
        "internet",
        "electricidad"
      ]
    )
  ) {

    return {

      text:
        "TikiPay dispone de un módulo de servicios para explorar pagos y experiencias disponibles.",

      link:
        "servicios.html",

      button:
        "Ver servicios"

    };
  }


  // --------------------------------------------------
  // TIKIPAY ACCESS / NFT
  // --------------------------------------------------

  if (
    hasWords(
      text,
      [
        "access",
        "membresia",
        "membresía",
        "nft",
        "unlock",
        "curso blockchain"
      ]
    )
  ) {

    if (
      assistantAccesses.length >
      0
    ) {

      const access =
        assistantAccesses[0];


      const date =
        access.valid_until
          ?
          new Date(
            access.valid_until
          ).toLocaleString(
            "es-BO",
            {
              dateStyle:
                "medium",

              timeStyle:
                "short"
            }
          )
          :
          "sin vencimiento";


      return {

        text:
          `Tienes ${assistantAccesses.length} acceso Web3 activo.\n\n${access.services?.name || "TikiPay Access"}\nRed: ${access.network || "Base Sepolia"}\nToken: ${access.token_id || "—"}\nVálido hasta: ${date}.`,

        link:
          "access.html",

        button:
          "Abrir TikiPay Access"

      };
    }


    return {

      text:
        "Actualmente no veo una membresía Web3 activa en tu cuenta. Desde TikiPay Access puedes conectar MetaMask y adquirir o verificar una membresía mediante Unlock Protocol.",

      link:
        "access.html",

      button:
        "Explorar Access"

    };
  }


  // --------------------------------------------------
  // WALLET / METAMASK
  // --------------------------------------------------

  if (
    hasWords(
      text,
      [
        "wallet",
        "metamask",
        "base sepolia",
        "web3"
      ]
    )
  ) {

    return {

      text:
        "La wallet Web3 de TikiPay utiliza MetaMask. Para TikiPay Access trabajamos con Base Sepolia, Chain ID 84532. Puedes comprobar la conexión desde tu Billetera.",

      link:
        "billetera.html",

      button:
        "Abrir billetera"

    };
  }


  // --------------------------------------------------
  // IDIOMA
  // --------------------------------------------------

  if (
    hasWords(
      text,
      [
        "idioma",
        "ingles",
        "inglés",
        "english",
        "español"
      ]
    )
  ) {

    return {

      text:
        "Puedes cambiar el idioma de TikiPay desde Ajustes. La preferencia queda guardada en tu perfil.",

      link:
        "ajustes.html",

      button:
        "Abrir Ajustes"

    };
  }


  // --------------------------------------------------
  // PERFIL
  // --------------------------------------------------

  if (
    hasWords(
      text,
      [
        "perfil",
        "nombre",
        "telefono",
        "teléfono",
        "pais",
        "país"
      ]
    )
  ) {

    return {

      text:
        "Desde Perfil puedes administrar tus datos personales, como nombre, teléfono y país.",

      link:
        "perfil.html",

      button:
        "Abrir Perfil"

    };
  }


  // --------------------------------------------------
  // SEGURIDAD / SEED
  // --------------------------------------------------

  if (
    hasWords(
      text,
      [
        "semilla",
        "seed",
        "clave privada",
        "private key"
      ]
    )
  ) {

    return {

      text:
        "Nunca compartas tu frase semilla ni tu clave privada. TikiPay, MetaMask y este asistente no necesitan conocerlas para verificar tu membresía.",

      link:
        "seguridad.html",

      button:
        "Ver Seguridad"

    };
  }


  // --------------------------------------------------
  // NOTIFICACIONES
  // --------------------------------------------------

  if (
    hasWords(
      text,
      [
        "notificacion",
        "notificación",
        "aviso",
        "alerta"
      ]
    )
  ) {

    return {

      text:
        "Las notificaciones muestran eventos de tu cuenta, como transferencias enviadas, dinero recibido y otros avisos.",

      link:
        "notificaciones.html",

      button:
        "Ver notificaciones"

    };
  }


  // --------------------------------------------------
  // AYUDA GENERAL
  // --------------------------------------------------

  if (
    hasWords(
      text,
      [
        "ayuda",
        "que puedes hacer",
        "qué puedes hacer",
        "opciones"
      ]
    )
  ) {

    return {

      text:
        "Puedo ayudarte con:\n• saldo y billetera\n• enviar y recibir dinero\n• QR y TIKI-ID\n• movimientos\n• seguridad y contraseña\n• MetaMask y Base Sepolia\n• TikiPay Access\n• perfil, idioma y notificaciones",

      link:
        null,

      button:
        null

    };
  }


  // --------------------------------------------------
  // DEFAULT
  // --------------------------------------------------

  return {

    text:
      "Puedo ayudarte con funciones de TikiPay como saldo, transferencias, recibir dinero, QR, contraseña, movimientos, MetaMask, TikiPay Access, perfil y ajustes.\n\nPrueba preguntando: “¿Cuál es mi saldo?”",

    link:
      null,

    button:
      null

  };
}


// ======================================================
// MENSAJES
// ======================================================

function addUserMessage(
  text
) {

  addAssistantMessage(
    "user",
    text
  );
}


function addBotMessage(
  text,
  link = null,
  button = null
) {

  addAssistantMessage(
    "bot",
    text,
    link,
    button
  );
}


function addAssistantMessage(
  type,
  text,
  link = null,
  button = null
) {

  const container =
    document.getElementById(
      "assistantMessages"
    );


  if (!container) {
    return;
  }


  const message =
    document.createElement(
      "div"
    );


  message.className =
    "message " +
    type;


  const bubble =
    document.createElement(
      "div"
    );


  bubble.className =
    "bubble";


  bubble.textContent =
    text;


  if (
    link &&
    button
  ) {

    const action =
      document.createElement(
        "a"
      );


    action.className =
      "assistant-action";


    action.href =
      link;


    action.textContent =
      button;


    bubble.appendChild(
      document.createElement(
        "br"
      )
    );


    bubble.appendChild(
      action
    );
  }


  message.appendChild(
    bubble
  );


  container.appendChild(
    message
  );


  container.scrollTop =
    container.scrollHeight;
}


// ======================================================
// HELPERS
// ======================================================

function normalizeAssistantText(
  text
) {

  return String(
    text ||
    ""
  )
    .toLowerCase()
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .trim();
}


function hasWords(
  text,
  terms
) {

  return terms.some(
    term =>
      text.includes(
        normalizeAssistantText(
          term
        )
      )
  );
}


function formatAssistantMoney(
  amount
) {

  return (
    "Bs " +
    Number(
      amount
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


function formatAssistantAccountStatus(
  status
) {

  const names = {

    ACTIVE:
      "Activa",

    LOGIN_BLOCKED:
      "Inicio bloqueado",

    OUTGOING_FROZEN:
      "Envíos congelados",

    FULLY_FROZEN:
      "Congelada",

    SUSPENDED:
      "Suspendida",

    CLOSED:
      "Cerrada"

  };


  return (
    names[status] ||
    status ||
    "Desconocido"
  );
}


function assistantAccessExpired(
  date
) {

  if (!date) {
    return false;
  }


  return (
    new Date(
      date
    ).getTime()
    <
    Date.now()
  );
}


// ======================================================
// INICIAR
// ======================================================

initTikiAssistant();