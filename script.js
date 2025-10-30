const PDF_SOURCES = {
  evening: "Assets/menus/evening.pdf",
  morning: "Assets/menus/morning.pdf",
};

const STATE = {
  language: "ENG",
  pdfKey: "evening",
};

const translations = {
  ENG: {
    food: "Food",
    tea: "Tea",
    cocktails: "Cocktails",
    coffee: "Coffee",
    discover: "Discover our Coffee Shelf",
    review: "Leave us a review",
    back: "Back",
  },
  FRA: {
    food: "Nourriture",
    tea: "Thé",
    cocktails: "Cocktails",
    coffee: "Café",
    discover: "Découvrez notre étagère de café",
    review: "Laissez-nous un avis",
    back: "Retour",
  },
};

let isTransitioning = false;

const i18nElements = Array.from(document.querySelectorAll("[data-i18n]"));
const languageToggles = Array.from(
  document.querySelectorAll('[data-role="language-toggle"] .toggle-track')
);
const pressableElements = Array.from(
  document.querySelectorAll(".menu-button, .social-button, .beans-card")
);
const navButtons = Array.from(
  document.querySelectorAll('[data-screen-target]')
);
const backButtons = Array.from(document.querySelectorAll('[data-back]'));

const teaMenu = document.getElementById("tea-menu");
const coffeeMenu = document.getElementById("coffee-menu");

function applyTranslations() {
  i18nElements.forEach((el) => {
    const key = el.dataset.i18n;
    const value = translations[STATE.language][key];
    if (value) {
      el.textContent = value;
    }
  });
  document.documentElement.lang = STATE.language === "ENG" ? "en" : "fr";
}

function syncLanguageToggles() {
  languageToggles.forEach((track) => {
    track.dataset.lang = STATE.language;
  });
}

function updateMenuImages() {
  if (teaMenu) {
    teaMenu.src =
      STATE.language === "ENG" ? teaMenu.dataset.srcEng : teaMenu.dataset.srcFra;
  }
  if (coffeeMenu) {
    coffeeMenu.src =
      STATE.language === "ENG"
        ? coffeeMenu.dataset.srcEng
        : coffeeMenu.dataset.srcFra;
  }
}

function toggleLanguage() {
  STATE.language = STATE.language === "ENG" ? "FRA" : "ENG";
  syncLanguageToggles();
  applyTranslations();
  updateMenuImages();
}

function attachToggleListeners() {
  const toggleButtons = document.querySelectorAll(
    '[data-role="language-toggle"] .toggle-pill'
  );
  toggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      toggleLanguage();
    });
  });
}

function addButtonPressEffect(element) {
  const removePress = () => element.classList.remove("pressed");
  element.addEventListener("pointerdown", () => {
    element.classList.add("pressed");
  });
  element.addEventListener("pointerup", removePress);
  element.addEventListener("pointerleave", removePress);
  element.addEventListener("pointercancel", removePress);
}

pressableElements.forEach(addButtonPressEffect);

function showScreen(targetId, direction = "forward") {
  if (isTransitioning) return;
  const current = document.querySelector(".screen.active");
  const next = document.getElementById(targetId);
  if (!next || current === next) return;

  isTransitioning = true;
  next.classList.add("active");
  next.style.visibility = "visible";
  next.style.transform = `translateX(${direction === "forward" ? "100%" : "-100%"})`;
  next.getBoundingClientRect();

  current.style.transform = `translateX(${direction === "forward" ? "-100%" : "100%"})`;
  next.style.transform = "translateX(0)";

  const handleTransitionEnd = () => {
    next.removeEventListener("transitionend", handleTransitionEnd);
    current.classList.remove("active");
    current.style.visibility = "";
    current.style.transform = "";
    next.style.transform = "";
    next.style.visibility = "";
    isTransitioning = false;
  };

  next.addEventListener("transitionend", handleTransitionEnd);
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const target = button.dataset.screenTarget;
    showScreen(target, "forward");
  });
});

backButtons.forEach((button) => {
  button.addEventListener("click", () => {
    showScreen("home-screen", "backward");
  });
});

applyTranslations();
syncLanguageToggles();
attachToggleListeners();
updateMenuImages();

// PDF viewer logic
const pdfCanvas = document.getElementById("food-pdf");
const pdfContainer = document.getElementById("food-viewer");
const pageIndicator = document.getElementById("page-indicator");
const pageButtons = document.querySelectorAll("[data-page]");
let pdfDoc = null;
let currentPage = 1;
let totalPages = 1;
let isRendering = false;
let pendingPage = null;

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

function updatePageIndicator() {
  pageIndicator.textContent = `${currentPage}/${totalPages}`;
}

function updatePageControls() {
  pageButtons.forEach((button) => {
    const direction = button.dataset.page;
    if (direction === "prev") {
      button.disabled = currentPage <= 1;
    } else {
      button.disabled = currentPage >= totalPages;
    }
  });
}

function renderPage(num) {
  if (!pdfDoc) return;
  isRendering = true;
  pdfDoc.getPage(num).then((page) => {
    const baseViewport = page.getViewport({ scale: 1 });
    const innerWidth = Math.max(pdfContainer.clientWidth - 36, 180);
    const scale = innerWidth / baseViewport.width;
    const viewport = page.getViewport({ scale });
    const outputScale = window.devicePixelRatio || 1;

    const context = pdfCanvas.getContext("2d");
    pdfCanvas.width = Math.floor(viewport.width * outputScale);
    pdfCanvas.height = Math.floor(viewport.height * outputScale);
    pdfCanvas.style.width = `${viewport.width}px`;
    pdfCanvas.style.height = `${viewport.height}px`;

    context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
    context.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);

    const renderContext = {
      canvasContext: context,
      viewport,
    };

    page.render(renderContext).promise.then(() => {
      isRendering = false;
      if (pendingPage !== null) {
        const nextPage = pendingPage;
        pendingPage = null;
        renderPage(nextPage);
      }
    });
  });
}

function queueRenderPage(num) {
  if (isRendering) {
    pendingPage = num;
  } else {
    renderPage(num);
  }
}

function loadPdf(path) {
  if (!window.pdfjsLib) return;
  pdfjsLib
    .getDocument(path)
    .promise.then((doc) => {
      pdfDoc = doc;
      totalPages = doc.numPages;
      currentPage = 1;
      updatePageIndicator();
      updatePageControls();
      renderPage(currentPage);
    })
    .catch((error) => {
      console.error("Failed to load PDF", error);
    });
}

pageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    if (!pdfDoc) return;
    const direction = button.dataset.page;
    if (direction === "prev" && currentPage > 1) {
      currentPage -= 1;
      updatePageIndicator();
      updatePageControls();
      queueRenderPage(currentPage);
    }
    if (direction === "next" && currentPage < totalPages) {
      currentPage += 1;
      updatePageIndicator();
      updatePageControls();
      queueRenderPage(currentPage);
    }
  });
});

let resizeTimeout = null;
window.addEventListener("resize", () => {
  if (!pdfDoc) return;
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    queueRenderPage(currentPage);
  }, 150);
});

loadPdf(PDF_SOURCES[STATE.pdfKey]);

window.setMenuPdf = function setMenuPdf(key) {
  const nextPath = PDF_SOURCES[key];
  if (!nextPath) return;
  STATE.pdfKey = key;
  loadPdf(nextPath);
};
*** End of File
