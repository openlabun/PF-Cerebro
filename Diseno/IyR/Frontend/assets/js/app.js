import { apiClient, authStorage } from "./services/api_client.js";
import { createAuthModule } from "./modules/auth.js";
import { createProfileModule } from "./modules/profile.js";
import { createSudokuModule } from "./modules/sudoku/game.js";

const themes = ["light", "dark"];
const THEME_KEY = "sudoku-theme";

const themeBtn = document.getElementById("theme-toggle");
const homeLogo = document.getElementById("home-logo");
const playNowBtn = document.getElementById("play-now");
const tabInicioBtn = document.getElementById("tab-inicio");
const tabJugarBtn = document.getElementById("tab-jugar");
const tabTorneosBtn = document.getElementById("tab-torneos");
const tabPvpBtn = document.getElementById("tab-pvp");
const tabPerfilBtn = document.getElementById("tab-perfil");
const goToSudokuBtn = document.getElementById("go-to-sudoku");
const goToTorneosBtn = document.getElementById("go-to-torneos");
const goToPvpBtn = document.getElementById("go-to-pvp");
const openAuthBtn = document.getElementById("open-auth");
const openProfileBtn = document.getElementById("open-profile");
const backHomeFromLoginBtn = document.getElementById("back-home-from-login");
const backHomeBtn = document.getElementById("back-home");
const backHomeFromProfileBtn = document.getElementById("back-home-from-profile");
const backHomeGenericBtns = document.querySelectorAll(".back-home-generic");

const inicioTab = document.getElementById("inicio-tab");
const juegoTab = document.getElementById("juego-tab");
const torneosTab = document.getElementById("torneos-tab");
const pvpTab = document.getElementById("pvp-tab");
const loginTab = document.getElementById("login-tab");
const perfilTab = document.getElementById("perfil-tab");

let activeTheme = "light";
let authModule = null;
let profileModule = null;
let sudokuModule = null;

function setTab(mode) {
  const isHome = mode === "inicio";
  const isGame = mode === "juego";
  const isProfile = mode === "perfil";
  const isTorneos = mode === "torneos";
  const isPvp = mode === "pvp";
  const isLogin = mode === "login";

  inicioTab?.classList.toggle("hidden", !isHome);
  juegoTab?.classList.toggle("hidden", !isGame);
  perfilTab?.classList.toggle("hidden", !isProfile);
  torneosTab?.classList.toggle("hidden", !isTorneos);
  pvpTab?.classList.toggle("hidden", !isPvp);
  loginTab?.classList.toggle("hidden", !isLogin);

  tabInicioBtn?.classList.toggle("active", isHome);
  tabJugarBtn?.classList.toggle("active", isGame);
  tabPerfilBtn?.classList.toggle("active", isProfile);
  tabTorneosBtn?.classList.toggle("active", isTorneos);
  tabPvpBtn?.classList.toggle("active", isPvp);

  if (isProfile) {
    const accessToken = authModule?.getAccessToken?.() || null;
    Promise.resolve(profileModule?.loadSudokuStatsIntoProfile(accessToken))
      .then(() => profileModule?.showModeDetail("sudoku"))
      .catch((error) => {
        console.warn("No se pudo actualizar el detalle del perfil.", error);
      });
  }

  if (!isHome) window.scrollTo({ top: 0, behavior: "smooth" });
}

function applyTheme(theme) {
  activeTheme = themes.includes(theme) ? theme : "light";
  document.documentElement.setAttribute("data-theme", activeTheme);

  try {
    localStorage.setItem(THEME_KEY, activeTheme);
  } catch {}

  const label = activeTheme === "light" ? "Claro" : "Oscuro";
  if (themeBtn) themeBtn.textContent = `Tema: ${label}`;
}

function initTheme() {
  let stored = "light";
  try {
    stored = localStorage.getItem(THEME_KEY) || "light";
  } catch {}

  applyTheme(stored);

  themeBtn?.addEventListener("click", () => {
    const next = themes[(themes.indexOf(activeTheme) + 1) % themes.length];
    applyTheme(next);
  });
}

function closePickerModalById(id) {
  const modal = document.getElementById(id);
  if (!modal || modal.getAttribute("aria-hidden") !== "false") return;
  modal.classList.add("hidden");
  modal.setAttribute("aria-hidden", "true");
}

function setupAppControls() {
  playNowBtn?.addEventListener("click", () => setTab("juego"));
  goToSudokuBtn?.addEventListener("click", () => setTab("juego"));
  goToTorneosBtn?.addEventListener("click", () => setTab("torneos"));
  goToPvpBtn?.addEventListener("click", () => setTab("pvp"));

  homeLogo?.addEventListener("click", () => setTab("inicio"));

  openAuthBtn?.addEventListener("click", async () => {
    if (authModule?.isBusy()) return;

    if (!authModule?.isAuthenticated()) {
      authModule?.openLoginTab();
      return;
    }

    await authModule?.logoutCurrentSession();
  });

  openProfileBtn?.addEventListener("click", () => {
    if (!authModule?.requireAuthForProfile()) return;
    setTab("perfil");
  });

  tabJugarBtn?.addEventListener("click", () => setTab("juego"));
  tabTorneosBtn?.addEventListener("click", () => setTab("torneos"));
  tabPvpBtn?.addEventListener("click", () => setTab("pvp"));
  tabInicioBtn?.addEventListener("click", () => setTab("inicio"));

  tabPerfilBtn?.addEventListener("click", () => {
    if (!authModule?.requireAuthForProfile()) return;
    setTab("perfil");
  });

  backHomeBtn?.addEventListener("click", () => setTab("inicio"));
  backHomeFromProfileBtn?.addEventListener("click", () => setTab("inicio"));
  backHomeFromLoginBtn?.addEventListener("click", () => setTab("inicio"));
  backHomeGenericBtns.forEach((btn) => btn.addEventListener("click", () => setTab("inicio")));

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closePickerModalById("avatar-modal");
    closePickerModalById("badge-modal");
    closePickerModalById("streak-modal");
    sudokuModule?.closeGuideModal();
  });
}

async function bootstrapApp() {
  sudokuModule = createSudokuModule({
    apiClient,
    authStorage,
    getAccessToken: () => authModule?.getAccessToken?.() || authStorage.getAccessToken(),
    onSudokuCompleted: async (score) => {
      const session = authModule?.getSession?.() || null;
      const accessToken = authModule?.getAccessToken?.() || null;
      await profileModule?.registerSudokuActivity(session, accessToken, { score });
    },
  });

  profileModule = createProfileModule({ apiClient });

  authModule = createAuthModule({
    apiClient,
    authStorage,
    setStatus: (message, ok = false) => sudokuModule?.setStatus(message, ok),
    setTab,
    onSessionChange: (session, isAuthenticated) => {
      profileModule?.syncIdentity(session, isAuthenticated);
      if (isAuthenticated) profileModule?.showModeDetail("sudoku");
    },
  });

  initTheme();
  setupAppControls();
  sudokuModule.init();
  profileModule.init();
  authModule.init();

  setTab("juego");
  await authModule.restoreAuthSession();
  await profileModule.showModeDetail("sudoku");
}

bootstrapApp();
