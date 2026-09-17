// ======================================================
// TIKIPAY USER - SISTEMA AUTOMÁTICO DE TEMAS
// Bolivia
// ======================================================

(() => {

  "use strict";

  const BOLIVIA_TIME_ZONE =
    "America/La_Paz";


  // ====================================================
  // DISEÑO BASE DE TIKIPAY
  // ====================================================

  const PALETTES = {

    default: {
      start: "#071f5f",
      middle: "#0845c8",
      end: "#08a9df",
      accent: "#7dd3fc",
      stripe: "linear-gradient(90deg,#0f62e8,#06b6d4)"
    },

    bolivia: {
      start: "#9b1616",
      middle: "#d4a900",
      end: "#08783d",
      accent: "#fff4a8",
      stripe:
        "linear-gradient(90deg,#d52b1e 0 33.33%,#f9e300 33.33% 66.66%,#007934 66.66% 100%)"
    },

    military: {
      start: "#06172e",
      middle: "#244b38",
      end: "#0b6d58",
      accent: "#e8c867",
      stripe:
        "linear-gradient(90deg,#d52b1e 0 33%,#f9e300 33% 66%,#007934 66% 100%)"
    },

    women: {
      start: "#4c1d95",
      middle: "#9333ea",
      end: "#ec4899",
      accent: "#f5d0fe",
      stripe:
        "linear-gradient(90deg,#7e22ce,#ec4899)"
    },

    indigenous: {
      start: "#5b2713",
      middle: "#b45309",
      end: "#15803d",
      accent: "#fde68a",
      stripe:
        "linear-gradient(90deg,#dc2626,#facc15,#16a34a,#2563eb)"
    },

    culture: {
      start: "#4c1d95",
      middle: "#be123c",
      end: "#f59e0b",
      accent: "#fde68a",
      stripe:
        "linear-gradient(90deg,#9333ea,#ec4899,#f59e0b)"
    },

    history: {
      start: "#292524",
      middle: "#78350f",
      end: "#a16207",
      accent: "#fef3c7",
      stripe:
        "linear-gradient(90deg,#78350f,#d97706)"
    },

    institutional: {
      start: "#0f172a",
      middle: "#1e3a8a",
      end: "#0369a1",
      accent: "#bae6fd",
      stripe:
        "linear-gradient(90deg,#1d4ed8,#0891b2)"
    },

    workers: {
      start: "#172554",
      middle: "#1d4ed8",
      end: "#0f766e",
      accent: "#bfdbfe",
      stripe:
        "linear-gradient(90deg,#2563eb,#14b8a6)"
    },

    business: {
      start: "#111827",
      middle: "#1d4ed8",
      end: "#0891b2",
      accent: "#67e8f9",
      stripe:
        "linear-gradient(90deg,#2563eb,#22d3ee)"
    },

    family: {
      start: "#172554",
      middle: "#7c3aed",
      end: "#db2777",
      accent: "#fbcfe8",
      stripe:
        "linear-gradient(90deg,#7c3aed,#ec4899)"
    },

    children: {
      start: "#0369a1",
      middle: "#2563eb",
      end: "#f59e0b",
      accent: "#fde68a",
      stripe:
        "linear-gradient(90deg,#22c55e,#3b82f6,#facc15,#f97316)"
    },

    nature: {
      start: "#052e16",
      middle: "#15803d",
      end: "#0d9488",
      accent: "#bbf7d0",
      stripe:
        "linear-gradient(90deg,#16a34a,#22c55e,#14b8a6)"
    },

    water: {
      start: "#082f49",
      middle: "#0369a1",
      end: "#22d3ee",
      accent: "#cffafe",
      stripe:
        "linear-gradient(90deg,#0284c7,#22d3ee)"
    },

    sea: {
      start: "#020617",
      middle: "#075985",
      end: "#0284c7",
      accent: "#bae6fd",
      stripe:
        "linear-gradient(90deg,#0c4a6e,#38bdf8)"
    },

    health: {
      start: "#064e3b",
      middle: "#059669",
      end: "#06b6d4",
      accent: "#ccfbf1",
      stripe:
        "linear-gradient(90deg,#10b981,#06b6d4)"
    },

    faith: {
      start: "#312e81",
      middle: "#7e22ce",
      end: "#c026d3",
      accent: "#f5d0fe",
      stripe:
        "linear-gradient(90deg,#4338ca,#c026d3)"
    },

    remembrance: {
      start: "#111827",
      middle: "#374151",
      end: "#475569",
      accent: "#e2e8f0",
      stripe:
        "linear-gradient(90deg,#475569,#94a3b8)"
    },

    mother: {
      start: "#831843",
      middle: "#db2777",
      end: "#f472b6",
      accent: "#fce7f3",
      stripe:
        "linear-gradient(90deg,#db2777,#f9a8d4)"
    },

    education: {
      start: "#172554",
      middle: "#1d4ed8",
      end: "#7c3aed",
      accent: "#ddd6fe",
      stripe:
        "linear-gradient(90deg,#2563eb,#8b5cf6)"
    },

    andean: {
      start: "#7c2d12",
      middle: "#d97706",
      end: "#ca8a04",
      accent: "#fef08a",
      stripe:
        "linear-gradient(90deg,#ef4444,#facc15,#22c55e,#3b82f6)"
    },

    afro: {
      start: "#292524",
      middle: "#7c2d12",
      end: "#ca8a04",
      accent: "#fde68a",
      stripe:
        "linear-gradient(90deg,#292524,#dc2626,#facc15)"
    },

    agriculture: {
      start: "#365314",
      middle: "#4d7c0f",
      end: "#a16207",
      accent: "#fef08a",
      stripe:
        "linear-gradient(90deg,#65a30d,#eab308)"
    },

    friendship: {
      start: "#1e3a8a",
      middle: "#7c3aed",
      end: "#db2777",
      accent: "#f5d0fe",
      stripe:
        "linear-gradient(90deg,#3b82f6,#a855f7,#ec4899)"
    },

    engineering: {
      start: "#111827",
      middle: "#334155",
      end: "#0369a1",
      accent: "#7dd3fc",
      stripe:
        "linear-gradient(90deg,#475569,#0ea5e9)"
    },

    solidarity: {
      start: "#4c0519",
      middle: "#be123c",
      end: "#ea580c",
      accent: "#fed7aa",
      stripe:
        "linear-gradient(90deg,#e11d48,#f97316)"
    },

    tourism: {
      start: "#075985",
      middle: "#0284c7",
      end: "#15803d",
      accent: "#bae6fd",
      stripe:
        "linear-gradient(90deg,#0ea5e9,#22c55e)"
    },

    newyear: {
      start: "#020617",
      middle: "#1e3a8a",
      end: "#7c3aed",
      accent: "#fde68a",
      stripe:
        "linear-gradient(90deg,#f59e0b,#a855f7,#38bdf8)"
    },

    christmas: {
      start: "#14532d",
      middle: "#166534",
      end: "#991b1b",
      accent: "#fef3c7",
      stripe:
        "linear-gradient(90deg,#15803d,#facc15,#b91c1c)"
    },

    santacruz: {
      start: "#064e3b",
      middle: "#059669",
      end: "#e5fff4",
      accent: "#d1fae5",
      stripe:
        "linear-gradient(90deg,#15803d,#ffffff,#15803d)"
    },

    lapaz: {
      start: "#7f1d1d",
      middle: "#991b1b",
      end: "#166534",
      accent: "#fde68a",
      stripe:
        "linear-gradient(90deg,#b91c1c,#15803d)"
    },

    cochabamba: {
      start: "#0369a1",
      middle: "#38bdf8",
      end: "#e0f2fe",
      accent: "#ffffff",
      stripe:
        "linear-gradient(90deg,#38bdf8,#ffffff)"
    },

    tarija: {
      start: "#7f1d1d",
      middle: "#dc2626",
      end: "#f8fafc",
      accent: "#fee2e2",
      stripe:
        "linear-gradient(90deg,#dc2626,#ffffff)"
    },

    chuquisaca: {
      start: "#7f1d1d",
      middle: "#dc2626",
      end: "#f8fafc",
      accent: "#ffffff",
      stripe:
        "linear-gradient(90deg,#ffffff,#dc2626)"
    },

    potosi: {
      start: "#450a0a",
      middle: "#991b1b",
      end: "#64748b",
      accent: "#fecaca",
      stripe:
        "linear-gradient(90deg,#991b1b,#e2e8f0)"
    },

    beni: {
      start: "#14532d",
      middle: "#15803d",
      end: "#0d9488",
      accent: "#bbf7d0",
      stripe:
        "linear-gradient(90deg,#16a34a,#14b8a6)"
    }
  };


  // ====================================================
  // CREAR EVENTO
  // ====================================================

  function event(
    title,
    subtitle,
    icon,
    palette = "default",
    priority = 50
  ) {

    return {
      title,
      subtitle,
      icon,
      palette,
      priority
    };

  }


  // ====================================================
  // FECHAS FIJAS DE BOLIVIA
  // ====================================================

  const FIXED_EVENTS = {

    // ==================== ENERO ====================

    "01-01": event(
      "Año Nuevo",
      "Año Nuevo y segunda fundación de Cochabamba",
      "🎆",
      "newyear",
      90
    ),

    "01-11": event(
      "Día Nacional del Acullico",
      "Tradición e identidad cultural boliviana",
      "🍃",
      "indigenous"
    ),

    "01-12": event(
      "Día Nacional del Turismo en Bolivia",
      "Descubre la riqueza de nuestro país",
      "🏔️",
      "tourism"
    ),

    "01-15": event(
      "Día Nacional del Charango",
      "Música, historia e identidad boliviana",
      "🎶",
      "culture"
    ),

    "01-22": event(
      "Estado Plurinacional de Bolivia",
      "Conmemoración nacional",
      "🇧🇴",
      "bolivia",
      95
    ),

    "01-24": event(
      "Alasita y Ekeko",
      "Tradición, prosperidad y esperanza",
      "🪙",
      "culture"
    ),

    "01-25": event(
      "Día Nacional de Los Caporales",
      "Danza y patrimonio cultural",
      "💃",
      "culture"
    ),

    "01-31": event(
      "Día Nacional de La Kullawada",
      "Tradición y cultura boliviana",
      "🧵",
      "culture"
    ),


    // ==================== FEBRERO ====================

    "02-02": event(
      "Virgen de la Candelaria",
      "Festividad tradicional de Copacabana",
      "🕯️",
      "faith"
    ),

    "02-03": event(
      "Nacimiento de Antonio José de Sucre",
      "Memoria histórica",
      "📜",
      "history"
    ),

    "02-08": event(
      "Día Nacional de la Transparencia",
      "Transparencia y lucha contra la corrupción",
      "⚖️",
      "institutional"
    ),

    "02-09": event(
      "Fundación de Cobija",
      "Celebramos a Cobija",
      "🏙️",
      "beni"
    ),

    "02-10": event(
      "Revolución de Oruro",
      "Memoria del grito libertario de 1781",
      "📜",
      "history"
    ),

    "02-13": event(
      "Virgen del Socavón",
      "Tradición y devoción de Oruro",
      "⛏️",
      "faith"
    ),

    "02-21": event(
      "Lenguas y Culturas de Bolivia",
      "Pueblos indígenas y afrobolivianos",
      "🗣️",
      "indigenous"
    ),

    "02-26": event(
      "Fundación de Santa Cruz de la Sierra",
      "Celebramos Santa Cruz",
      "🌴",
      "santacruz",
      70
    ),


    // ==================== MARZO ====================

    "03-08": event(
      "Día Internacional de la Mujer",
      "Reconocimiento a todas las mujeres",
      "💜",
      "women",
      85
    ),

    "03-15": event(
      "Trabajadores Gremiales y Aseo Urbano",
      "Reconocimiento al trabajo boliviano",
      "🤝",
      "workers"
    ),

    "03-18": event(
      "Micro y Pequeños Empresarios",
      "Impulsando el emprendimiento boliviano",
      "🚀",
      "business"
    ),

    "03-19": event(
      "Día del Padre",
      "También Día del Radialista y del Carpintero",
      "👨‍👧",
      "family",
      80
    ),

    "03-21": event(
      "Día Nacional del Cine Boliviano",
      "Arte, cultura y lucha contra el racismo",
      "🎬",
      "culture"
    ),

    "03-22": event(
      "Día Mundial del Agua",
      "Cuidemos el recurso que nos une",
      "💧",
      "water"
    ),

    "03-23": event(
      "Día del Mar",
      "Bolivia recuerda su Litoral",
      "⚓",
      "sea",
      85
    ),

    "03-30": event(
      "Trabajadora del Hogar Boliviano",
      "Reconocimiento a su trabajo",
      "🏠",
      "workers"
    ),


    // ==================== ABRIL ====================

    "04-01": event(
      "Fundación de Potosí",
      "También Día Mundial de la Educación",
      "⛰️",
      "potosi"
    ),

    "04-02": event(
      "Batalla del Tumusla",
      "Memoria histórica de Bolivia",
      "📜",
      "history"
    ),

    "04-07": event(
      "Día Mundial de la Salud",
      "Cuidemos nuestra salud",
      "❤️",
      "health"
    ),

    "04-12": event(
      "Día del Niño Boliviano",
      "Celebramos la alegría y el futuro",
      "🧒",
      "children",
      85
    ),

    "04-14": event(
      "Día de las Américas",
      "Integración y fraternidad",
      "🌎",
      "institutional"
    ),

    "04-15": event(
      "Aniversario de Tarija",
      "Batalla de La Tablada",
      "🍇",
      "tarija",
      75
    ),

    "04-22": event(
      "Día de la Tierra",
      "Protejamos nuestro planeta",
      "🌎",
      "nature"
    ),

    "04-26": event(
      "Día de la Secretaria y el Secretario",
      "Reconocimiento profesional",
      "🗂️",
      "institutional"
    ),


    // ==================== MAYO ====================

    "05-01": event(
      "Día del Trabajo",
      "Celebramos a quienes construyen Bolivia",
      "🛠️",
      "workers",
      90
    ),

    "05-03": event(
      "Día de la Cruz y Fiesta del Tinku",
      "Tradición cultural boliviana",
      "🎭",
      "culture"
    ),

    "05-12": event(
      "Escritora y Escritor Boliviano",
      "Celebramos nuestras letras",
      "📚",
      "education"
    ),

    "05-17": event(
      "Día Nacional del Canillita",
      "También jornada contra la homofobia y transfobia",
      "📰",
      "institutional"
    ),

    "05-18": event(
      "Trabajadora y Trabajador Fabril",
      "Reconocimiento al sector productivo",
      "🏭",
      "workers"
    ),

    "05-24": event(
      "Día contra el Racismo y la Discriminación",
      "Bolivia con igualdad y respeto",
      "🤝",
      "solidarity"
    ),

    "05-25": event(
      "Aniversario de Chuquisaca",
      "Celebramos Chuquisaca",
      "🏛️",
      "chuquisaca",
      75
    ),

    "05-26": event(
      "Batalla del Alto de la Alianza",
      "Memoria histórica",
      "📜",
      "history"
    ),

    "05-27": event(
      "Día de la Madre",
      "Homenaje a las madres bolivianas",
      "🌷",
      "mother",
      90
    ),

    "05-31": event(
      "Día Mundial Sin Tabaco",
      "Respira salud",
      "🌿",
      "health"
    ),


    // ==================== JUNIO ====================

    "06-05": event(
      "Día Mundial del Medio Ambiente",
      "Bolivia cuida su naturaleza",
      "🌱",
      "nature"
    ),

    "06-06": event(
      "Día del Maestro",
      "Gracias por educar el futuro",
      "📚",
      "education",
      80
    ),

    "06-14": event(
      "Día del Excombatiente",
      "Memoria de la Guerra del Chaco",
      "🎖️",
      "remembrance"
    ),

    "06-21": event(
      "Año Nuevo Andino, Amazónico y Chaqueño",
      "Renovación, cultura y tradición",
      "☀️",
      "andean",
      90
    ),

    "06-24": event(
      "Noche de San Juan",
      "Tradición boliviana",
      "🔥",
      "history"
    ),

    "06-29": event(
      "Día Nacional de la Saya Afroboliviana",
      "Ritmo, identidad y patrimonio",
      "🥁",
      "afro"
    ),


    // ==================== JULIO ====================

    "07-12": event(
      "Día Nacional del Bosque",
      "Protejamos nuestros recursos naturales",
      "🌳",
      "nature"
    ),

    "07-16": event(
      "Aniversario de La Paz",
      "También festividad de la Virgen del Carmen",
      "🏔️",
      "lapaz",
      80
    ),

    "07-17": event(
      "Día Nacional de la Memoria",
      "Recordar para construir el futuro",
      "🕊️",
      "remembrance"
    ),

    "07-20": event(
      "Día Nacional de la Defensa Pública",
      "Justicia y acceso a derechos",
      "⚖️",
      "institutional"
    ),

    "07-23": event(
      "Día de la Amistad",
      "TikiPay celebra las conexiones que nos unen",
      "🫂",
      "friendship"
    ),


    // ==================== AGOSTO ====================

    "08-02": event(
      "Día del Campesino",
      "Homenaje al campo boliviano",
      "🌾",
      "agriculture"
    ),

    "08-05": event(
      "Virgen de Copacabana",
      "Tradición y devoción",
      "🕯️",
      "faith"
    ),

    "08-06": event(
      "Independencia de Bolivia",
      "¡Viva Bolivia!",
      "🇧🇴",
      "bolivia",
      100
    ),

    // Fecha complementaria
    "08-07": event(
      "Día de las Fuerzas Armadas de Bolivia",
      "Honor, servicio y compromiso con Bolivia",
      "🇧🇴",
      "military",
      90
    ),

    "08-09": event(
      "Solidaridad con las Víctimas de Agresiones Sexuales",
      "Respeto, protección y solidaridad",
      "🕊️",
      "solidarity"
    ),

    "08-14": event(
      "Virgen de Urkupiña",
      "Tradición de Quillacollo",
      "🌸",
      "faith"
    ),

    "08-15": event(
      "Virgen de Urkupiña y Virgen de Chaguaya",
      "Fe y tradición boliviana",
      "🌸",
      "faith"
    ),

    "08-16": event(
      "Virgen de Urkupiña",
      "Tradición de Cochabamba",
      "🌸",
      "faith"
    ),

    // Fecha complementaria
    "08-17": event(
      "Día de la Bandera Boliviana",
      "Rojo, amarillo y verde",
      "🇧🇴",
      "bolivia",
      85
    ),

    "08-24": event(
      "Los Chutillos",
      "Fiesta de San Bartolomé en Potosí",
      "🎭",
      "culture"
    ),


    // ==================== SEPTIEMBRE ====================

    "09-05": event(
      "Mujer Indígena Originaria Campesina",
      "Identidad, fortaleza y tradición",
      "🌺",
      "indigenous"
    ),

    "09-07": event(
      "Día Nacional de La Morenada",
      "Patrimonio y danza boliviana",
      "🎭",
      "culture"
    ),

    // Fecha complementaria
    "09-09": event(
      "Día del Soldado Boliviano",
      "Servicio, disciplina y compromiso",
      "🎖️",
      "military"
    ),

    "09-14": event(
      "Aniversario de Cochabamba",
      "Celebramos Cochabamba",
      "🌄",
      "cochabamba",
      80
    ),

    "09-21": event(
      "Día del Estudiante y del Amor",
      "Juventud, aprendizaje y amistad",
      "💙",
      "friendship"
    ),

    "09-23": event(
      "Pueblo y Cultura Afroboliviana",
      "También jornada contra la trata y tráfico de personas",
      "🥁",
      "afro"
    ),

    "09-24": event(
      "Aniversario de Santa Cruz y Pando",
      "También Día de la Lengua de Señas Boliviana",
      "🌴",
      "santacruz",
      85
    ),

    // Fecha complementaria
    "09-27": event(
      "Día Nacional de la Integración Boliviana",
      "Unidad e integración nacional",
      "🇧🇴",
      "bolivia"
    ),


    // ==================== OCTUBRE ====================

    "10-04": event(
      "Cadena Productiva de la Carne",
      "Reconocimiento al sector productivo",
      "🐄",
      "agriculture"
    ),

    "10-05": event(
      "Día del Ingeniero Boliviano",
      "Ingenio que construye Bolivia",
      "⚙️",
      "engineering",
      75
    ),

    "10-11": event(
      "Día de la Mujer Boliviana",
      "También Día Nacional de la Castaña",
      "🌺",
      "women",
      85
    ),

    "10-12": event(
      "12 de Octubre",
      "Historia, culturas y Aeronáutica Nacional",
      "✈️",
      "institutional"
    ),

    "10-15": event(
      "Día de las Personas con Discapacidad",
      "Inclusión, accesibilidad y respeto",
      "♿",
      "institutional"
    ),

    "10-16": event(
      "Día del Sastre y Modista",
      "Creatividad y oficio boliviano",
      "🧵",
      "culture"
    ),

    "10-17": event(
      "Día de la Dignidad Nacional",
      "Memoria y dignidad",
      "🇧🇴",
      "remembrance"
    ),

    "10-20": event(
      "Fundación de La Paz",
      "Historia de Nuestra Señora de La Paz",
      "🏔️",
      "lapaz"
    ),


    // ==================== NOVIEMBRE ====================

    "11-01": event(
      "Todos los Santos",
      "Tradición y encuentro familiar",
      "🕯️",
      "faith"
    ),

    "11-02": event(
      "Fieles Difuntos",
      "Recordamos a quienes permanecen en nuestros corazones",
      "🕯️",
      "remembrance",
      80
    ),

    // Fecha complementaria
    "11-06": event(
      "Aniversario de la Armada Boliviana",
      "Servicio naval de Bolivia",
      "⚓",
      "sea"
    ),

    "11-08": event(
      "Día Nacional del Guardaparque Boliviano",
      "Protectores de nuestro patrimonio natural",
      "🌲",
      "nature"
    ),

    "11-10": event(
      "Aniversario de Potosí",
      "Celebramos Potosí",
      "⛰️",
      "potosi",
      75
    ),

    // Fecha complementaria
    "11-14": event(
      "Aniversario del Ejército de Bolivia",
      "Servicio, historia y compromiso con Bolivia",
      "🪖",
      "military",
      85
    ),

    "11-18": event(
      "Aniversario del Beni",
      "Celebramos el Beni",
      "🌿",
      "beni",
      75
    ),

    // Fecha complementaria
    "11-19": event(
      "Día Internacional del Hombre",
      "Bienestar, familia y contribución positiva",
      "👨",
      "family"
    ),

    "11-21": event(
      "Consumo de Alimentos Ecológicos",
      "Producción sostenible y saludable",
      "🥬",
      "nature"
    ),

    "11-25": event(
      "Día contra la Violencia hacia las Mujeres",
      "Respeto, protección e igualdad",
      "🧡",
      "solidarity",
      80
    ),


    // ==================== DICIEMBRE ====================

    "12-08": event(
      "Purísima Concepción",
      "Tradición y fe",
      "🕯️",
      "faith"
    ),

    "12-16": event(
      "Día de la Artesana y el Artesano",
      "Arte, identidad y trabajo boliviano",
      "🏺",
      "culture"
    ),

    "12-25": event(
      "Navidad",
      "TikiPay te desea una Feliz Navidad",
      "🎄",
      "christmas",
      95
    )

  };


  // ====================================================
  // EVENTOS VARIABLES CON FECHA CONOCIDA POR AÑO
  // ====================================================

  const YEAR_EVENTS = {

    2026: {

      // Gran Poder 2026
      "08-01": event(
        "Festividad del Gran Poder",
        "Cultura, tradición y devoción paceña",
        "🎭",
        "culture",
        80
      )

    }

  };


  // ====================================================
  // DEMOSTRACIÓN
  //
  // SOLO EL 17 DE SEPTIEMBRE DE 2026.
  // Después se desactiva automáticamente.
  // ====================================================

  const DEMO_EVENT = {

    enabled: true,

    date:
      "2026-09-17",

    event:
      event(
        "Día de las Fuerzas Armadas de Bolivia",
        "DEMOSTRACIÓN TIKIPAY · Honor, servicio y compromiso con Bolivia",
        "🇧🇴",
        "military",
        1000
      )

  };


  // ====================================================
  // FECHA ACTUAL EN HORA DE BOLIVIA
  // ====================================================

  function getBoliviaDate() {

    const formatter =
      new Intl.DateTimeFormat(
        "en-CA",
        {
          timeZone:
            BOLIVIA_TIME_ZONE,

          year:
            "numeric",

          month:
            "2-digit",

          day:
            "2-digit"
        }
      );


    const parts =
      formatter.formatToParts(
        new Date()
      );


    const result = {};

    parts.forEach(
      part => {

        if (
          part.type !==
          "literal"
        ) {

          result[
            part.type
          ] =
            part.value;

        }

      }
    );


    return {

      year:
        Number(
          result.year
        ),

      month:
        result.month,

      day:
        result.day,

      md:
        `${result.month}-${result.day}`,

      iso:
        `${result.year}-${result.month}-${result.day}`

    };

  }


  // ====================================================
  // CÁLCULO DE PASCUA
  // Algoritmo gregoriano
  // ====================================================

  function getEasterSunday(
    year
  ) {

    const a =
      year % 19;

    const b =
      Math.floor(
        year / 100
      );

    const c =
      year % 100;

    const d =
      Math.floor(
        b / 4
      );

    const e =
      b % 4;

    const f =
      Math.floor(
        (b + 8) / 25
      );

    const g =
      Math.floor(
        (b - f + 1) / 3
      );

    const h =
      (
        19 * a +
        b -
        d -
        g +
        15
      ) % 30;

    const i =
      Math.floor(
        c / 4
      );

    const k =
      c % 4;

    const l =
      (
        32 +
        2 * e +
        2 * i -
        h -
        k
      ) % 7;

    const m =
      Math.floor(
        (
          a +
          11 * h +
          22 * l
        ) / 451
      );

    const month =
      Math.floor(
        (
          h +
          l -
          7 * m +
          114
        ) / 31
      );

    const day =
      (
        (
          h +
          l -
          7 * m +
          114
        ) % 31
      ) + 1;


    return new Date(
      Date.UTC(
        year,
        month - 1,
        day
      )
    );

  }


  // ====================================================
  // SUMAR DÍAS
  // ====================================================

  function addDays(
    date,
    amount
  ) {

    const copy =
      new Date(
        date.getTime()
      );

    copy.setUTCDate(
      copy.getUTCDate() +
      amount
    );

    return copy;

  }


  // ====================================================
  // MM-DD
  // ====================================================

  function toMonthDay(
    date
  ) {

    const month =
      String(
        date.getUTCMonth() + 1
      ).padStart(
        2,
        "0"
      );

    const day =
      String(
        date.getUTCDate()
      ).padStart(
        2,
        "0"
      );

    return (
      `${month}-${day}`
    );

  }


  // ====================================================
  // FECHAS MÓVILES
  // ====================================================

  function getMovableEvents(
    year
  ) {

    const easter =
      getEasterSunday(
        year
      );


    const events = {};


    // Carnaval:
    // lunes y martes anteriores
    // al Miércoles de Ceniza.

    events[
      toMonthDay(
        addDays(
          easter,
          -48
        )
      )
    ] =
      event(
        "Carnaval Boliviano",
        "Tradición, música, danza y alegría",
        "🎭",
        "culture",
        90
      );


    events[
      toMonthDay(
        addDays(
          easter,
          -47
        )
      )
    ] =
      event(
        "Carnaval Boliviano",
        "Tradición, música, danza y alegría",
        "🎭",
        "culture",
        90
      );


    // Jueves Santo

    events[
      toMonthDay(
        addDays(
          easter,
          -3
        )
      )
    ] =
      event(
        "Jueves Santo",
        "Semana Santa",
        "✝️",
        "faith",
        80
      );


    // Viernes Santo

    events[
      toMonthDay(
        addDays(
          easter,
          -2
        )
      )
    ] =
      event(
        "Viernes Santo",
        "Semana Santa",
        "✝️",
        "faith",
        90
      );


    // Corpus Christi
    // 60 días después de Pascua.

    events[
      toMonthDay(
        addDays(
          easter,
          60
        )
      )
    ] =
      event(
        "Corpus Christi",
        "Celebración tradicional",
        "🕊️",
        "faith",
        85
      );


    return events;

  }


  // ====================================================
  // OBTENER EVENTO ACTIVO
  // ====================================================

  function getActiveEvent() {

    const today =
      getBoliviaDate();


    // ----------------------------------------------
    // DEMO
    // ----------------------------------------------

    if (
      DEMO_EVENT.enabled &&
      today.iso ===
        DEMO_EVENT.date
    ) {

      return {
        ...DEMO_EVENT.event,
        demo: true
      };

    }


    // ----------------------------------------------
    // EVENTOS ESPECÍFICOS DEL AÑO
    // ----------------------------------------------

    const yearly =
      YEAR_EVENTS[
        today.year
      ]?.[
        today.md
      ];

    if (yearly) {
      return yearly;
    }


    // ----------------------------------------------
    // FECHAS MÓVILES
    // ----------------------------------------------

    const movable =
      getMovableEvents(
        today.year
      );


    if (
      movable[
        today.md
      ]
    ) {

      return movable[
        today.md
      ];

    }


    // ----------------------------------------------
    // FECHAS FIJAS
    // ----------------------------------------------

    if (
      FIXED_EVENTS[
        today.md
      ]
    ) {

      return FIXED_EVENTS[
        today.md
      ];

    }


    // ----------------------------------------------
    // TEMA NORMAL
    // ----------------------------------------------

    return null;

  }


  // ====================================================
  // APLICAR VARIABLES CSS
  // ====================================================

  function applyPalette(
    paletteName
  ) {

    const palette =
      PALETTES[
        paletteName
      ] ||
      PALETTES.default;


    const root =
      document.documentElement;


    root.style.setProperty(
      "--tp-theme-start",
      palette.start
    );

    root.style.setProperty(
      "--tp-theme-middle",
      palette.middle
    );

    root.style.setProperty(
      "--tp-theme-end",
      palette.end
    );

    root.style.setProperty(
      "--tp-theme-accent",
      palette.accent
    );

    root.style.setProperty(
      "--tp-theme-stripe",
      palette.stripe
    );

  }


  // ====================================================
  // BUSCAR TARJETA DEL SALDO
  // ====================================================

  function getBalanceCard() {

    return (
      document.querySelector(
        "[data-tikipay-balance-card]"
      )
      ||
      document.querySelector(
        ".balance-card"
      )
      ||
      document.querySelector(
        ".wallet-card"
      )
      ||
      document.querySelector(
        ".saldo-card"
      )
    );

  }


  // ====================================================
  // CREAR BANNER DE EVENTO
  // ====================================================

  function createEventBanner(
    eventData,
    card
  ) {

    if (
      !card ||
      !eventData
    ) {
      return;
    }


    let banner =
      document.getElementById(
        "tikipayEventBanner"
      );


    if (!banner) {

      banner =
        document.createElement(
          "div"
        );

      banner.id =
        "tikipayEventBanner";

      banner.className =
        "tikipay-event-banner";


      card.parentNode
        ?.insertBefore(
          banner,
          card
        );

    }


    banner.innerHTML = "";


    const icon =
      document.createElement(
        "div"
      );

    icon.className =
      "tikipay-event-icon";

    icon.textContent =
      eventData.icon;


    const text =
      document.createElement(
        "div"
      );


    const title =
      document.createElement(
        "strong"
      );

    title.textContent =
      eventData.title;


    const subtitle =
      document.createElement(
        "span"
      );

    subtitle.textContent =
      eventData.subtitle;


    text.appendChild(
      title
    );

    text.appendChild(
      subtitle
    );


    banner.appendChild(
      icon
    );

    banner.appendChild(
      text
    );


    if (
      eventData.demo
    ) {

      const badge =
        document.createElement(
          "small"
        );

      badge.className =
        "tikipay-demo-badge";

      badge.textContent =
        "DEMO";

      banner.appendChild(
        badge
      );

    }

  }


  // ====================================================
  // MARCA DE AGUA
  // ====================================================

  function createWatermark(
    eventData,
    card
  ) {

    if (
      !eventData ||
      !card
    ) {
      return;
    }


    let watermark =
      card.querySelector(
        ".tikipay-theme-watermark"
      );


    if (!watermark) {

      watermark =
        document.createElement(
          "span"
        );

      watermark.className =
        "tikipay-theme-watermark";

      card.appendChild(
        watermark
      );

    }


    watermark.textContent =
      eventData.icon;

  }


  // ====================================================
  // ELIMINAR ELEMENTOS DE EVENTO
  // ====================================================

  function clearEventDecoration(
    card
  ) {

    document
      .getElementById(
        "tikipayEventBanner"
      )
      ?.remove();


    card
      ?.querySelector(
        ".tikipay-theme-watermark"
      )
      ?.remove();

  }


  // ====================================================
  // INICIAR TEMA
  // ====================================================

  function initTikiPayTheme() {

    const card =
      getBalanceCard();


    // Siempre aplicar azul como base.

    applyPalette(
      "default"
    );


    document.body
      .classList
      .add(
        "tikipay-theme-enabled"
      );


    if (!card) {

      console.warn(
        "TikiPay Theme: no se encontró la tarjeta de saldo."
      );

      return;

    }


    card.setAttribute(
      "data-tikipay-balance-card",
      ""
    );


    const activeEvent =
      getActiveEvent();


    if (!activeEvent) {

      clearEventDecoration(
        card
      );

      document.body
        .removeAttribute(
          "data-tikipay-event"
        );

      return;

    }


    applyPalette(
      activeEvent.palette
    );


    document.body
      .setAttribute(
        "data-tikipay-event",
        activeEvent.palette
      );


    createEventBanner(
      activeEvent,
      card
    );


    createWatermark(
      activeEvent,
      card
    );


    console.info(
      "TikiPay Theme:",
      activeEvent.title
    );

  }


  // ====================================================
  // EXPONER INFORMACIÓN ÚTIL
  // ====================================================

  window.TikiPayTheme = {

    getToday:
      getBoliviaDate,

    getActiveEvent,

    reload:
      initTikiPayTheme

  };


  // ====================================================
  // INICIAR
  // ====================================================

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initTikiPayTheme
    );

  } else {

    initTikiPayTheme();

  }

})();