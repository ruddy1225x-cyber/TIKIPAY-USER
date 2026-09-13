console.log("✅ TikiPay services.js está cargando");


// ======================================================
// TIKIPAY - SERVICIOS
// ======================================================

let serviceCategories = [];
let allServices = [];
let selectedCategory = "ALL";


// ======================================================
// INICIO
// ======================================================

async function initServices() {

  const session =
    await requireAuth();

  if (!session) {
    return;
  }

  console.log(
    "✅ Usuario autenticado para servicios"
  );


  await loadServiceCategories();

  await loadServices();


  renderCategories();

  renderServices(
    allServices
  );

}


// ======================================================
// CARGAR CATEGORÍAS
// ======================================================

async function loadServiceCategories() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from(
        "service_categories"
      )
      .select(`
        id,
        name,
        icon,
        active
      `)
      .eq(
        "active",
        true
      )
      .order(
        "name",
        {
          ascending: true
        }
      );


  if (error) {

    console.error(
      "❌ Error cargando categorías:",
      error
    );

    serviceCategories = [];

    return;
  }


  serviceCategories =
    data || [];


  console.log(
    "✅ Categorías:",
    serviceCategories
  );

}


// ======================================================
// CARGAR SERVICIOS
// ======================================================

async function loadServices() {

  const {
    data,
    error
  } =
    await supabaseClient
      .from(
        "services"
      )
      .select(`
        id,
        category_id,
        name,
        provider,
        description,
        service_type,
        price,
        currency,
        active,
        unlock_enabled,
        unlock_network,
        unlock_lock_address,
        created_at
      `)
      .eq(
        "active",
        true
      )
      .order(
        "name",
        {
          ascending: true
        }
      );


  if (error) {

    console.error(
      "❌ Error cargando servicios:",
      error
    );

    allServices = [];

    return;
  }


  allServices =
    data || [];


  console.log(
    "✅ Servicios:",
    allServices
  );

}


// ======================================================
// MOSTRAR CATEGORÍAS
// ======================================================

function renderCategories() {

  const container =
    document.getElementById(
      "serviceCategories"
    );


  if (!container) {

    console.error(
      "❌ No existe #serviceCategories"
    );

    return;
  }


  container.innerHTML =
    "";


  // --------------------------------------
  // TODOS
  // --------------------------------------

  const allButton =
    document.createElement(
      "button"
    );


  allButton.type =
    "button";


  allButton.className =
    "category-button active";


  allButton.dataset.category =
    "ALL";


  allButton.innerHTML = `
    <span>◈</span>
    <span>Todos</span>
  `;


  allButton.addEventListener(
    "click",
    function () {

      selectedCategory =
        "ALL";


      setActiveCategory(
        this
      );


      applyServiceFilters();

    }
  );


  container.appendChild(
    allButton
  );


  // --------------------------------------
  // CATEGORÍAS DE SUPABASE
  // --------------------------------------

  serviceCategories.forEach(
    category => {

      const button =
        document.createElement(
          "button"
        );


      button.type =
        "button";


      button.className =
        "category-button";


      button.dataset.category =
        category.id;


      button.innerHTML = `

        <span>
          ${categoryIcon(
            category.name
          )}
        </span>

        <span>
          ${escapeHTML(
            category.name
          )}
        </span>

      `;


      button.addEventListener(
        "click",
        function () {

          selectedCategory =
            category.id;


          setActiveCategory(
            this
          );


          applyServiceFilters();

        }
      );


      container.appendChild(
        button
      );

    }
  );

}


// ======================================================
// CATEGORÍA ACTIVA
// ======================================================

function setActiveCategory(
  selectedButton
) {

  document
    .querySelectorAll(
      ".category-button"
    )
    .forEach(
      button => {

        button.classList.remove(
          "active"
        );

      }
    );


  selectedButton.classList.add(
    "active"
  );

}


// ======================================================
// MOSTRAR SERVICIOS
// ======================================================

function renderServices(
  services
) {

  const container =
    document.getElementById(
      "servicesGrid"
    );


  if (!container) {

    console.error(
      "❌ No existe #servicesGrid"
    );

    return;
  }


  // --------------------------------------
  // SIN SERVICIOS
  // --------------------------------------

  if (
    !services ||
    services.length === 0
  ) {

    container.innerHTML = `

      <div class="empty-state">

        <div class="empty-icon">
          ◈
        </div>

        <h3>
          Sin servicios
        </h3>

        <p>
          No encontramos servicios disponibles.
        </p>

      </div>

    `;

    return;
  }


  container.innerHTML =
    "";


  // --------------------------------------
  // TARJETAS
  // --------------------------------------

  services.forEach(
    service => {

      const category =
        serviceCategories.find(
          item =>
            item.id ===
            service.category_id
        );


      const card =
        document.createElement(
          "article"
        );


      card.className =
        "service-card";


      const price =
        getServicePrice(
          service
        );


      card.innerHTML = `

        <div class="service-card-icon">

          ${categoryIcon(
            category?.name
          )}

        </div>


        <div class="service-card-content">

          <span class="service-provider">

            ${escapeHTML(
              service.provider ||
              "TikiPay"
            )}

          </span>


          <h3>

            ${escapeHTML(
              service.name
            )}

          </h3>


          <p>

            ${escapeHTML(
              service.description ||
              "Servicio disponible en TikiPay."
            )}

          </p>


          <strong>

            ${price}

          </strong>

        </div>


        <button
          type="button"
          class="service-pay-button"
        >

          ${
            service.unlock_enabled
              ? "Ver acceso"
              : "Seleccionar"
          }

        </button>

      `;


      const button =
        card.querySelector(
          ".service-pay-button"
        );


      button.addEventListener(
        "click",
        function () {

          openService(
            service
          );

        }
      );


      container.appendChild(
        card
      );

    }
  );

}


// ======================================================
// FILTROS
// ======================================================

function applyServiceFilters() {

  const searchInput =
    document.getElementById(
      "serviceSearch"
    );


  const search =
    searchInput
      ? searchInput
          .value
          .trim()
          .toLowerCase()
      : "";


  const filtered =
    allServices.filter(
      service => {

        const categoryMatches =
          selectedCategory ===
            "ALL"
          ||
          service.category_id ===
            selectedCategory;


        const searchText =
          (
            service.name +
            " " +
            (
              service.provider ||
              ""
            ) +
            " " +
            (
              service.description ||
              ""
            )
          )
            .toLowerCase();


        const searchMatches =
          search === ""
          ||
          searchText.includes(
            search
          );


        return (
          categoryMatches &&
          searchMatches
        );

      }
    );


  renderServices(
    filtered
  );

}


// ======================================================
// BUSCADOR
// ======================================================

const serviceSearch =
  document.getElementById(
    "serviceSearch"
  );


if (serviceSearch) {

  serviceSearch.addEventListener(
    "input",
    applyServiceFilters
  );

}


// ======================================================
// ABRIR SERVICIO
// ======================================================

function openService(
  service
) {

  // --------------------------------------
  // TIKIPAY ACCESS
  // --------------------------------------

  if (
    service.unlock_enabled
  ) {

    localStorage.setItem(
      "tikipay_selected_access",
      service.id
    );


    window.location.href =
      "access.html";


    return;
  }


  // --------------------------------------
  // SERVICIO NORMAL
  // --------------------------------------

  localStorage.setItem(
    "tikipay_selected_service",
    service.id
  );


  alert(
    "Servicio seleccionado:\n\n" +
    service.name +
    "\n\n" +
    "El pago será conectado en el módulo de pagos."
  );

}


// ======================================================
// PRECIO
// ======================================================

function getServicePrice(
  service
) {

  if (
    service.price === null ||
    service.price === undefined
  ) {

    return "Monto variable";

  }


  if (
    service.currency ===
    "BOB"
  ) {

    return formatBOB(
      service.price
    );

  }


  return (
    Number(
      service.price
    )
      .toLocaleString(
        "es-BO",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 8
        }
      )
    +
    " "
    +
    service.currency
  );

}


// ======================================================
// ICONOS
// ======================================================

function categoryIcon(
  name = ""
) {

  const icons = {

    "Electricidad":
      "⚡",

    "Agua":
      "💧",

    "Internet":
      "🌐",

    "Telefonía":
      "📱",

    "Educación":
      "🎓",

    "Eventos":
      "🎫",

    "Membresías":
      "👑",

    "Certificaciones":
      "🏅",

    "Contenido Premium":
      "🔐",

    "TikiPay Access":
      "🔓"

  };


  return (
    icons[name] ||
    "◈"
  );

}


// ======================================================
// INICIAR SERVICIOS
// ======================================================

initServices();