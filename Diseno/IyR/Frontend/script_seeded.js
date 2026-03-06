// ===== Sudoku engine imports (ESM) =====
import {
  generarSolucion,
  crearPuzzle,
  introducirNumero,
  estaResuelto,
  darPistaAleatoria,
  crearNotasVacias,
  limpiarNotasCelda,
  esMovimientoValido,
  toggleNota,
} from "https://esm.sh/@uninorte/cerebro-sudoku@1.1.0";
import { apiClient, authStorage } from "./api_client.js";

// ===== Difficulty settings (UI labels) =====
const difficultyLevels = [
  { key: "muy-facil", label: "Principiante", givens: 48 },
  { key: "facil", label: "Iniciado", givens: 42 },
  { key: "medio", label: "Intermedio", givens: 36 },
  { key: "dificil", label: "Avanzado", givens: 31 },
  { key: "experto", label: "Experto", givens: 27 },
  { key: "maestro", label: "Profesional", givens: 24 },
];

let currentDifficulty = difficultyLevels[2];

// ===== Theme settings =====
const themes = ["light", "dark"];
const THEME_KEY = "sudoku-theme";

// ===== DOM references =====
const boardEl = document.getElementById("board");
const signBoardEl = document.getElementById("sign-board");
const homeLogo = document.getElementById("home-logo");
const openGuideBtns = document.querySelectorAll(".open-guide");
const guideModal = document.getElementById("guide-modal");
const guideModalClose = document.getElementById("guide-modal-close");
const guideModalX = document.getElementById("guide-modal-x");
const guideModalTitle = document.getElementById("guide-modal-title");
const guideModalList = document.getElementById("guide-modal-list");
const keypadEl = document.getElementById("keypad");
const timerEl = document.getElementById("timer");
const statusEl = document.getElementById("status");
const hintBtn = document.getElementById("hint");
const clearBtn = document.getElementById("clear-cell");
const themeBtn = document.getElementById("theme-toggle");
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
const difficultySelect = document.getElementById("difficulty-select");
const difficultyLabel = document.getElementById("difficulty-label");
const progressFill = document.getElementById("progress-fill");
const progressText = document.getElementById("progress-text");
const profileAvatarEl = document.getElementById("profile-avatar");
const openAvatarPickerBtn = document.getElementById("open-avatar-picker");
const avatarModal = document.getElementById("avatar-modal");
const badgeModal = document.getElementById("badge-modal");
const avatarOptionsEl = document.getElementById("avatar-options");
const badgeOptionsEl = document.getElementById("badge-options");
const frameOptionsEl = document.getElementById("frame-options");
const badgeSlotBtns = document.querySelectorAll(".badge-slot");
const closePickerBtns = document.querySelectorAll("[data-close-picker]");
const pickerTabBtns = document.querySelectorAll(".picker-tab");
const openStreakCalendarBtn = document.getElementById("open-streak-calendar");
const streakModal = document.getElementById("streak-modal");
const streakCalendarEl = document.getElementById("streak-calendar");
const streakCountEl = document.getElementById("streak-count");
const streakPrevMonthBtn = document.getElementById("streak-prev-month");
const streakNextMonthBtn = document.getElementById("streak-next-month");
const streakMonthLabelEl = document.getElementById("streak-month-label");
const modeCardBtns = document.querySelectorAll(".mode-card");
const modeDetailTitle = document.getElementById("mode-detail-title");
const modeDetailList = document.getElementById("mode-detail-list");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const verifyForm = document.getElementById("verify-form");
const forgotForm = document.getElementById("forgot-form");
const resetForm = document.getElementById("reset-form");
const showLoginFormBtn = document.getElementById("show-login-form");
const showRegisterFormBtn = document.getElementById("show-register-form");
const switchToRegisterBtn = document.getElementById("switch-to-register");
const switchToForgotBtn = document.getElementById("switch-to-forgot");
const switchToVerifyBtn = document.getElementById("switch-to-verify");
const switchToResetBtn = document.getElementById("switch-to-reset");
const switchToLoginBtn = document.getElementById("switch-to-login");
const switchToForgotFromResetBtn = document.getElementById("switch-to-forgot-from-reset");
const switchToLoginFromForgotBtn = document.getElementById("switch-to-login-from-forgot");
const switchToLoginFromResetBtn = document.getElementById("switch-to-login-from-reset");
const switchToLoginFromVerifyBtn = document.getElementById("switch-to-login-from-verify");
const registerPassword = document.getElementById("register-password");
const registerPasswordConfirm = document.getElementById("register-password-confirm");
const passwordMatchIcon = document.getElementById("password-match-icon");
const passwordMatchText = document.getElementById("password-match-text");
const loginEmailInput = document.getElementById("login-email");
const loginPasswordInput = document.getElementById("login-password");
const registerNameInput = document.getElementById("register-name");
const registerEmailInput = document.getElementById("register-email");
const verifyEmailInput = document.getElementById("verify-email");
const verifyCodeInput = document.getElementById("verify-code");
const forgotEmailInput = document.getElementById("forgot-email");
const resetTokenInput = document.getElementById("reset-token");
const resetPasswordInput = document.getElementById("reset-password");
const resetPasswordConfirmInput = document.getElementById("reset-password-confirm");
const authMessageEl = document.getElementById("auth-message");
const profileNameEl = document.getElementById("profile-name");
const profileTitleEl = document.getElementById("profile-title");
const profileLevelBadgeEl = document.querySelector(
  "#open-avatar-picker .level-badge",
);
const profileLevelFillEl = document.querySelector(
  "#perfil-tab .profile-level-wrap .level-fill",
);
const profileLevelTextEl = document.querySelector(
  "#perfil-tab .profile-level-wrap .level-text",
);

// ===== Runtime state =====
let noteMode = false; // 
let seconds = 0;
let activeTheme = "light";
let timerInterval = null;
let solucion = [];
let puzzleInicial = [];
let tableroActual = [];
let notas = null;

let selectedCell = null;
let seedActual = null;
let authSession = null;
let authBusy = false;
let hintsUsed = 0;

// ===== Seeds de prueba por dificultad (TEMP: luego vendrán de BD) =====
// Nota: aquí la dificultad es el label (Principiante..Profesional)
const seedsPorDificultad = {
  Principiante: [
    { seed: 99469, huecos: 20 },
    { seed: 998848, huecos: 20 },
    { seed: 154140, huecos: 20 },
    { seed: 544606, huecos: 20 },
    { seed: 534139, huecos: 20 },
  ],
  Iniciado: [
    { seed: 825023, huecos: 40 },
    { seed: 945845, huecos: 40 },
    { seed: 969344, huecos: 40 },
    { seed: 627661, huecos: 40 },
    { seed: 248826, huecos: 40 },
  ],
  Intermedio: [
    { seed: 979729, huecos: 40 },
    { seed: 484206, huecos: 40 },
    { seed: 817935, huecos: 40 },
    { seed: 73758, huecos: 40 },
    { seed: 996827, huecos: 40 },
  ],
  Avanzado: [
    { seed: 978497, huecos: 45 },
    { seed: 637366, huecos: 45 },
    { seed: 187073, huecos: 45 },
    { seed: 324083, huecos: 45 },
    { seed: 273520, huecos: 45 }
  ],
  Experto: [
    { seed: 73866, huecos: 50 },
    { seed: 786485, huecos: 50 },
    { seed: 461137, huecos: 50 },
    { seed: 695902, huecos: 50 },
    { seed: 187073, huecos: 50 }
  ],
  Profesional: [
    { seed: 542597, huecos: 60 },
    { seed: 109576, huecos: 60 },
    { seed: 336169, huecos: 60 },
    { seed: 73866, huecos: 60 },
    { seed: 81387, huecos: 60 }
  ],
};

let huecosActual = 40;
const GAME_ID_SUDOKU = "uVsB-k2rjora"; // id de juego SUDOKU

const profileModeStats = {
  sudoku: [
    "Partidas jugadas: 42",
    "Mejor tiempo: 03:52",
    "Precisión promedio: 92%",
    "Dificultad favorita: Intermedio",
  ],
  torneos: [
    "Torneos jugados: 12",
    "Top 3 alcanzado: 5 veces",
    "Mejor posición: #2",
    "Puntaje promedio: 1,240",
  ],
  pvp: [
    "Partidas PvP: 33",
    "Victorias: 20 · Derrotas: 13",
    "Racha máxima: 6 victorias",
    "Precisión en duelos: 90%",
  ],
};

// ===== Profile customization data =====
const avatarOptions = ["♔", "♕", "♖", "♗", "♘", "♙"];
const badgeOptions = ["🧠", "♟️", "🎯", "⚡", "🏆", "🔥", "🛡️", "💎", "🌟", "🎲"];
const frameOptions = [
  { key: "frame-royal", label: "Real", minStreak: 0 },
  { key: "frame-arcane", label: "Arcano", minStreak: 0 },
  { key: "frame-neon", label: "Neón", minStreak: 0 },
  { key: "frame-ember", label: "Ascua", minStreak: 0 },
  { key: "frame-ice", label: "Hielo", minStreak: 0 },
  { key: "frame-inferno", label: "Inferno", minStreak: 11 },
];
const CURRENT_YEAR = new Date().getFullYear();

function toYmd(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function createStreakActivityDates(year, rachaActual) {
  const dates = new Set();
  const today = new Date();
  const count = Math.max(0, Number(rachaActual) || 0);

  for (let i = 0; i < count; i += 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    if (day.getFullYear() === year) dates.add(toYmd(day));
  }

  return [...dates].sort();
}

let currentStreakMonth = new Date(CURRENT_YEAR, new Date().getMonth(), 1);

const streakActivityDates = createStreakActivityDates(
  currentStreakMonth.getFullYear(),
  currentStreakMonth.getMonth(),
  authSession?.user?.rachaActual ?? authSession?.profile?.rachaActual ?? 0
);

let activeBadgeSlot = null;
let activeFrame = "frame-royal";

// ===== Profile UI logic =====
function setProfileAvatar(symbol) {
  profileAvatarEl.textContent = symbol;
}

function getCurrentStreak(activityDates) {
  if (!activityDates.length) return 0;
  const activitySet = new Set(activityDates);
  const cursor = new Date();
  let streak = 0;

  while (activitySet.has(toYmd(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function isFrameUnlocked(frame) {
  return getCurrentStreak(streakActivityDates) >= frame.minStreak;
}

function refreshStreakUi() {
  streakCountEl.textContent = getCurrentStreak(streakActivityDates);
}

function openPicker(modalEl) {
  modalEl.classList.remove("hidden");
  modalEl.setAttribute("aria-hidden", "false");
}

function closePicker(modalEl) {
  modalEl.classList.add("hidden");
  modalEl.setAttribute("aria-hidden", "true");
}

function renderAvatarOptions() {
  avatarOptionsEl.innerHTML = "";
  avatarOptions.forEach((symbol) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "picker-option";
    btn.textContent = symbol;
    btn.addEventListener("click", () => {
      setProfileAvatar(symbol);
      closePicker(avatarModal);
    });
    avatarOptionsEl.appendChild(btn);
  });
}

function renderBadgeOptions() {
  badgeOptionsEl.innerHTML = "";
  badgeOptions.forEach((symbol) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "picker-option";
    btn.textContent = symbol;
    btn.addEventListener("click", () => {
      if (activeBadgeSlot) activeBadgeSlot.textContent = symbol;
      closePicker(badgeModal);
    });
    badgeOptionsEl.appendChild(btn);
  });
}



function setProfileFrame(frameKey) {
  const selected = frameOptions.find((frame) => frame.key === frameKey) || frameOptions[0];
  if (!isFrameUnlocked(selected)) return;

  openAvatarPickerBtn.classList.remove(...frameOptions.map((frame) => frame.key));
  openAvatarPickerBtn.classList.add(selected.key);
  activeFrame = selected.key;
}

function renderFrameOptions() {
  frameOptionsEl.innerHTML = "";
  frameOptions.forEach((frame) => {
    const unlocked = isFrameUnlocked(frame);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `picker-option frame-option ${frame.key}`;
    btn.dataset.frame = frame.key;
    btn.title = unlocked ? frame.label : `${frame.label} (desbloquea con racha > 10)`;

    if (!unlocked) {
      btn.classList.add("locked");
      btn.textContent = "🔒";
    }

    if (activeFrame === frame.key) btn.classList.add("active");

    btn.addEventListener("click", () => {
      if (!unlocked) return;
      setProfileFrame(frame.key);
      renderFrameOptions();
      closePicker(avatarModal);
    });

    frameOptionsEl.appendChild(btn);
  });
}

function setAvatarPickerTab(tab) {
  const isAvatar = tab === "avatar";
  avatarOptionsEl.classList.toggle("hidden", !isAvatar);
  frameOptionsEl.classList.toggle("hidden", isAvatar);
  pickerTabBtns.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.pickerTab === tab);
  });
}

function renderStreakCalendar() {
  if (!streakCalendarEl) return;

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  const month = currentStreakMonth.getMonth();
  const year = currentStreakMonth.getFullYear();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7; // Lunes=0

  streakMonthLabelEl.textContent = `${monthNames[month]} ${year}`;
  streakPrevMonthBtn.disabled = month === 0;
  streakNextMonthBtn.disabled = month === 11;

  const activitySet = new Set(streakActivityDates);
  streakCalendarEl.innerHTML = "";

  for (let i = 0; i < startOffset; i += 1) {
    const empty = document.createElement("div");
    empty.className = "calendar-day empty";
    streakCalendarEl.appendChild(empty);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(year, month, day);
    const cell = document.createElement("div");
    cell.className = "calendar-day";
    if (activitySet.has(toYmd(date))) cell.classList.add("active");
    cell.textContent = day;
    streakCalendarEl.appendChild(cell);
  }
}

async function loadSudokuStatsIntoProfile() {
  if (!isAuthenticated()) return;

  try {
    const stats = await apiClient.getMyGameStats(authSession.accessToken, GAME_ID_SUDOKU);

    if (!stats || typeof stats !== "object") {
      console.warn("[stats] respuesta inválida de getMyGameStats");
      return;
    }
    profileModeStats.sudoku = [
      `Partidas jugadas: ${stats.partidasJugadas ?? 0}`,
      `Elo: ${stats.elo ?? 0}`,
      stats.ligaId ? `Liga: ${stats.ligaId}` : "Liga: -",
    ];

  } catch (e) {
    console.warn("Fallo cargando stats sudoku:", e);
  }
}

async function showModeDetail(modeKey) {

  // Marcar visualmente el modo activo (Sudoku/Torneos/PvP)
  modeCardBtns?.forEach((card) => {
    card.classList.toggle("active", card.dataset.mode === modeKey);
  });

  if (modeKey === "sudoku") {
    await loadSudokuStatsIntoProfile();
  }

  const stats = profileModeStats[modeKey];
  if (!stats || !modeDetailTitle || !modeDetailList) return;

  const titleMap = {
    sudoku: "Sudoku",
    torneos: "Torneos",
    pvp: "PvP",
  };

  modeDetailTitle.textContent = `Estadísticas · ${titleMap[modeKey]}`;
  modeDetailList.innerHTML = "";
  stats.forEach((line) => {
    const li = document.createElement("li");
    li.textContent = line;
    modeDetailList.appendChild(li);
  });
}

function initProfileUi() {
  renderAvatarOptions();
  renderBadgeOptions();
  renderStreakCalendar();
  setProfileAvatar("♔");
  refreshStreakUi();
  setProfileFrame("frame-royal");
  setAvatarPickerTab("avatar");
  renderFrameOptions();
  showModeDetail("sudoku");

  pickerTabBtns.forEach((btn) => {
    btn.addEventListener("click", () => setAvatarPickerTab(btn.dataset.pickerTab));
  });

  openAvatarPickerBtn.addEventListener("click", () => openPicker(avatarModal));
  openStreakCalendarBtn.addEventListener("click", () => {
    currentStreakMonth = new Date(CURRENT_YEAR, new Date().getMonth(), 1);
    renderStreakCalendar();
    openPicker(streakModal);
  });

  streakPrevMonthBtn.addEventListener("click", () => {
    if (currentStreakMonth.getMonth() === 0) return;
    currentStreakMonth = new Date(CURRENT_YEAR, currentStreakMonth.getMonth() - 1, 1);
    renderStreakCalendar();
  });

  streakNextMonthBtn.addEventListener("click", () => {
    if (currentStreakMonth.getMonth() === 11) return;
    currentStreakMonth = new Date(CURRENT_YEAR, currentStreakMonth.getMonth() + 1, 1);
    renderStreakCalendar();
  });

  badgeSlotBtns.forEach((slot) => {
    slot.addEventListener("click", () => {
      activeBadgeSlot = slot;
      openPicker(badgeModal);
    });
  });

  modeCardBtns?.forEach((card) => {
    card.addEventListener("click", async () => {
      await showModeDetail(card.dataset.mode);
    });
  });

  closePickerBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.closePicker;
      if (type === "avatar") closePicker(avatarModal);
      if (type === "badge") closePicker(badgeModal);
      if (type === "streak") closePicker(streakModal);
    });
  });
}


// ===== Sudoku game logic =====
function setTab(mode) {
  const isHome = mode === "inicio";
  const isGame = mode === "juego";
  const isProfile = mode === "perfil";
  const isTorneos = mode === "torneos";
  const isPvp = mode === "pvp";
  const isLogin = mode === "login";

  inicioTab.classList.toggle("hidden", !isHome);
  juegoTab.classList.toggle("hidden", !isGame);
  perfilTab.classList.toggle("hidden", !isProfile);
  torneosTab.classList.toggle("hidden", !isTorneos);
  pvpTab.classList.toggle("hidden", !isPvp);
  loginTab.classList.toggle("hidden", !isLogin);

  tabInicioBtn.classList.toggle("active", isHome);
  tabJugarBtn.classList.toggle("active", isGame);
  tabPerfilBtn.classList.toggle("active", isProfile);
  tabTorneosBtn.classList.toggle("active", isTorneos);
  tabPvpBtn.classList.toggle("active", isPvp);

  if (!isHome) window.scrollTo({ top: 0, behavior: "smooth" });
}

function setAuthView(view) {
  const showLogin = view === "login";
  const showRegister = view === "register";
  const showVerify = view === "verify";
  const showForgot = view === "forgot";
  const showReset = view === "reset";

  loginForm?.classList.toggle("hidden", !showLogin);
  registerForm?.classList.toggle("hidden", !showRegister);
  verifyForm?.classList.toggle("hidden", !showVerify);
  forgotForm?.classList.toggle("hidden", !showForgot);
  resetForm?.classList.toggle("hidden", !showReset);
  showLoginFormBtn?.classList.toggle("active", showLogin);
  showRegisterFormBtn?.classList.toggle("active", showRegister);
}

const DEFAULT_PROFILE_NAME = profileNameEl?.textContent?.trim() || "Invitado#0001";
const DEFAULT_PROFILE_TITLE =
  profileTitleEl?.textContent?.trim() || 'Titulo: "El dios de los numeros"';

function isAuthenticated() {
  return Boolean(authSession?.accessToken);
}

function getErrorMessage(error, fallbackMessage) {
  if (error instanceof Error && error.message) return error.message;
  return fallbackMessage;
}

function setAuthMessage(message = "", tone = "info") {
  if (!authMessageEl) return;

  authMessageEl.textContent = message;
  authMessageEl.classList.remove("ok", "error");

  if (!message) return;
  if (tone === "ok") authMessageEl.classList.add("ok");
  if (tone === "error") authMessageEl.classList.add("error");
}

function getProfileDisplayName(user) {
  if (!user) return DEFAULT_PROFILE_NAME;
  if (user.name) return user.name;
  if (user.email) return user.email.split("@")[0];

  const rawId = user.id || user.sub;
  if (!rawId) return DEFAULT_PROFILE_NAME;

  const id = String(rawId);
  return `Jugador#${id.slice(-4)}`;
}

// ===== Helpers nuevos: XP -> siguiente nivel =====
function xpParaSiguienteNivel(nivel) {
  const lvl = Number(nivel);
  if (lvl >= 1 && lvl <= 10) return lvl * 100;
  if (lvl >= 11 && lvl <= 30) return lvl * 150;
  if (lvl >= 31 && lvl <= 50) return lvl * 250;
  return lvl + 250;
}

// ===== Helper nuevo: pinta nivel/racha/barra usando datos de profiles/me =====
function syncProfileProgress(user) {
  if (!profileLevelBadgeEl && !profileLevelFillEl && !profileLevelTextEl) {
    return;
  }

  if (!isAuthenticated()) {
    if (streakCountEl) streakCountEl.textContent = "0";
    if (profileLevelBadgeEl) profileLevelBadgeEl.textContent = "47";
    if (profileLevelFillEl) profileLevelFillEl.style.width = "68%";
    if (profileLevelTextEl)
      profileLevelTextEl.textContent = "Nivel 47 · 680 / 1000 XP";
    return;
  }

  const nivel = Number(user?.nivel ?? 0);
  const experiencia = Number(user?.experiencia ?? 0);
  const rachaActual = Number(user?.rachaActual ?? 0);

  if (streakCountEl && Number.isFinite(rachaActual)) {
    streakCountEl.textContent = String(rachaActual);
  }

  if (!Number.isFinite(nivel) || nivel <= 0) {
    return;
  }

  const xpNext = xpParaSiguienteNivel(nivel);
  const safeXpNext = Number.isFinite(xpNext) && xpNext > 0 ? xpNext : 1000;
  const safeXp = Number.isFinite(experiencia) && experiencia >= 0 ? experiencia : 0;
  const pct = Math.max(0, Math.min(100, (safeXp / safeXpNext) * 100));

  if (profileLevelBadgeEl) profileLevelBadgeEl.textContent = String(nivel);
  if (profileLevelFillEl) profileLevelFillEl.style.width = `${pct}%`;
  if (profileLevelTextEl) {
    profileLevelTextEl.textContent = `Nivel ${nivel} · ${safeXp} / ${safeXpNext} XP`;
  }
}

function syncProfileIdentity() {
  if (!profileNameEl || !profileTitleEl) return;

  if (!isAuthenticated()) {
    profileNameEl.textContent = DEFAULT_PROFILE_NAME;
    profileTitleEl.textContent = DEFAULT_PROFILE_TITLE;
    syncProfileProgress(null);
    return;
  }

  const user = authSession?.user || {};
  profileNameEl.textContent = getProfileDisplayName(user);

  //validar si hay titulo activo en user, si no en authSession.profile, si no null
  const tituloTexto =
    user.tituloActivoTexto ??
    authSession?.profile?.tituloActivoTexto ??
    null;

  if (tituloTexto) {
    profileTitleEl.textContent = `Título: ${tituloTexto}`;
  } else if (user.email) {
    profileTitleEl.textContent = `Correo: ${user.email}`;
  } else {
    profileTitleEl.textContent = "Sesión activa";
  }

  // NUEVO
  syncProfileProgress(user);
}

function syncAuthUi() {
  if (openAuthBtn) {
    openAuthBtn.textContent = isAuthenticated() ? "Cerrar sesion" : "Iniciar sesion";
    openAuthBtn.disabled = authBusy;
  }

  if (openProfileBtn) openProfileBtn.disabled = authBusy;
  if (tabPerfilBtn) tabPerfilBtn.disabled = authBusy;
  if (showLoginFormBtn) showLoginFormBtn.disabled = authBusy;
  if (showRegisterFormBtn) showRegisterFormBtn.disabled = authBusy;
  if (switchToForgotBtn) switchToForgotBtn.disabled = authBusy;
  if (switchToVerifyBtn) switchToVerifyBtn.disabled = authBusy;
  if (switchToResetBtn) switchToResetBtn.disabled = authBusy;
  if (switchToForgotFromResetBtn) switchToForgotFromResetBtn.disabled = authBusy;
  if (switchToLoginFromForgotBtn) switchToLoginFromForgotBtn.disabled = authBusy;
  if (switchToLoginFromResetBtn) switchToLoginFromResetBtn.disabled = authBusy;
  if (switchToLoginFromVerifyBtn) switchToLoginFromVerifyBtn.disabled = authBusy;
}

function setAuthBusyState(isBusy) {
  authBusy = isBusy;
  syncAuthUi();
}

function saveAuthSession(session) {
  authSession = session || null;

  if (authSession) authStorage.setSession(authSession);
  else authStorage.clearSession();

  syncAuthUi();
  syncProfileIdentity();
  
  // Si ya está autenticado, refresca stats del modo actual (o sudoku por defecto)
  if (isAuthenticated()) {
    showModeDetail("sudoku");
  }
}

async function hydrateSession(session) {
  if (!session?.accessToken) {
    throw new Error("Session without access token");
  }

  const verification = await apiClient.verifyToken(session.accessToken);
  const verifiedUser = verification?.user || {};
  const sessionUser = session.user || {};

  const user = {
    ...sessionUser,
    id: sessionUser.id || verifiedUser.sub,
    sub: verifiedUser.sub || sessionUser.sub || sessionUser.id,
    email: verifiedUser.email || sessionUser.email || "",
    name:
      sessionUser.name ||
      (verifiedUser.email ? String(verifiedUser.email).split("@")[0] : ""),
  };

  const hydrated = {
    ...session,
    user,
  };

  // NUEVO: traer nivel/racha/experiencia desde profiles/me
  try {
    const perfil = await apiClient.getMyProfile(hydrated.accessToken);

    if (perfil) {
      hydrated.user = {
        ...(hydrated.user || {}),
        ...perfil,
      };
      hydrated.profile = perfil;
    }
  } catch (error) {
    console.warn("No se pudo cargar el perfil del usuario.", error);
  }

  return hydrated;
}


async function tryRefreshSession(session) {
  if (!session?.refreshToken) {
    throw new Error("Missing refresh token");
  }

  const refreshed = await apiClient.refresh(session.refreshToken);

  if (!refreshed?.accessToken) {
    throw new Error("Refresh response without access token");
  }

  return hydrateSession({
    ...session,
    accessToken: refreshed.accessToken,
  });
}

async function restoreAuthSession() {
  const stored = authStorage.getSession();
  if (!stored?.accessToken) {
    saveAuthSession(null);
    return;
  }

  setAuthBusyState(true);
  saveAuthSession(stored);

  try {
    const hydrated = await hydrateSession(stored);
    saveAuthSession(hydrated);
  } catch {
    try {
      const refreshed = await tryRefreshSession(stored);
      saveAuthSession(refreshed);
    } catch {
      saveAuthSession(null);
      setStatus("Tu sesion expiro. Inicia sesion nuevamente.");
      setAuthMessage("Tu sesion expiro. Inicia sesion nuevamente.", "error");
    }
  } finally {
    setAuthBusyState(false);
  }
}

async function logoutCurrentSession() {
  if (!isAuthenticated()) {
    saveAuthSession(null);
    return;
  }

  setAuthBusyState(true);

  try {
    await apiClient.logout(authSession.accessToken);
  } catch (error) {
    console.warn("No se pudo notificar el logout al backend.", error);
  } finally {
    saveAuthSession(null);
    setAuthView("login");
    setAuthMessage("Sesion cerrada.", "ok");
    setStatus("Sesion cerrada.");
    setTab("inicio");
    setAuthBusyState(false);
  }
}

function openLoginTab(message = "", tone = "info") {
  setAuthView("login");
  setAuthMessage(message, tone);
  setTab("login");
}

function openVerifyTab(email = "", message = "", tone = "info") {
  setAuthView("verify");
  if (verifyEmailInput && email) verifyEmailInput.value = email;
  if (verifyCodeInput) verifyCodeInput.value = "";
  setAuthMessage(message, tone);
  setTab("login");
}

function openForgotTab(email = "", message = "", tone = "info") {
  setAuthView("forgot");
  if (forgotEmailInput && email) forgotEmailInput.value = email;
  setAuthMessage(message, tone);
  setTab("login");
}

function openResetTab(token = "", message = "", tone = "info") {
  setAuthView("reset");
  if (resetTokenInput && token) resetTokenInput.value = token;
  if (resetPasswordInput) resetPasswordInput.value = "";
  if (resetPasswordConfirmInput) resetPasswordConfirmInput.value = "";
  setAuthMessage(message, tone);
  setTab("login");
}

function requireAuthForProfile() {
  if (isAuthenticated()) return true;

  openLoginTab("Inicia sesion para acceder a tu perfil.", "error");
  return false;
}

function applyTheme(theme) {
  activeTheme = themes.includes(theme) ? theme : "light";
  document.documentElement.setAttribute("data-theme", activeTheme);
  try {
    localStorage.setItem(THEME_KEY, activeTheme);
  } catch {}
  const label = activeTheme === "light" ? "Claro" : "Oscuro";
  themeBtn.textContent = `Tema: ${label}`;
}

function initTheme() {
  let stored = "light";
  try {
    stored = localStorage.getItem(THEME_KEY) || "light";
  } catch {}
  applyTheme(stored);
  themeBtn.addEventListener("click", () => {
    const next = themes[(themes.indexOf(activeTheme) + 1) % themes.length];
    applyTheme(next);
  });
}

function getProgress() {
  let editable = 0;
  let correct = 0;

  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      // editable = celdas que NO venían dadas (0 en puzzleInicial)
      if (puzzleInicial[r][c] === 0) {
        editable += 1;
        if (tableroActual[r][c] === solucion[r][c]) correct += 1;
      }
    }
  }

  const percentage = editable === 0 ? 100 : Math.round((correct / editable) * 100);
  return { correct, editable, percentage };
}


function updateProgress() {
  const { correct, editable, percentage } = getProgress();
  progressFill.style.width = `${percentage}%`;
  progressText.textContent = `${correct}/${editable} celdas correctas (${percentage}%)`;
}

function setStatus(message, ok = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("ok", ok);
}


function calculateSudokuScore() {
  const TIME_PENALTY_PER_SECOND = 2;
  const HINT_PENALTY = 75;

  const penalty = seconds * TIME_PENALTY_PER_SECOND + hintsUsed * HINT_PENALTY;
  return Math.max(0, 1000 - penalty);
}

function finishSudokuWithScore() {
  const score = calculateSudokuScore();
  setStatus(
    `¡Sudoku completado! Puntaje final: ${score} (tiempo: ${seconds}s, pistas: ${hintsUsed}).`,
    true,
  );
  if (timerInterval) clearInterval(timerInterval);
}

function buildSudokuBoard(seed, huecos) {
  seedActual = seed;
  huecosActual = Number.isInteger(huecos) ? huecos : 40;

  // 1) Generar solución determinística con la seed
  solucion = generarSolucion(seedActual);

  // 2) Crear puzzle con huecosActual (0 = vacío) y solución única
  puzzleInicial = crearPuzzle(solucion, huecosActual, seedActual);

  // 3) Estado jugable (copia)
  tableroActual = puzzleInicial.map((row) => [...row]);

  // 4) Notas
  notas = crearNotasVacias();

  // 5) UI
  createBoard();
  hintsUsed = 0;
  setStatus(`Selecciona una celda para comenzar. Puntaje inicial: 1000.`);
  updateProgress();
  startTimer(true);
}


function fillSelected(value) {
  if (!selectedCell) return;

  const row = Number(selectedCell.dataset.row);
  const col = Number(selectedCell.dataset.col);

  // No tocar celdas fijas
  if (puzzleInicial[row][col] !== 0) {
    setStatus("No puedes modificar una celda fija.");
    return;
  }

  // Convertir input a num (0 = borrar)
  const num = value === "" ? 0 : Number(value);

  // Borrar
  if (num === 0) {
    tableroActual[row][col] = 0;
    limpiarNotasCelda(notas, row, col);
    selectedCell.textContent = "";
    selectedCell.classList.remove("error");
    setStatus("Celda borrada");
    updateProgress?.();
    return;
  }

  // Rango válido
  if (num < 1 || num > 9 || Number.isNaN(num)) {
    setStatus("Número inválido (1-9)");
    return;
  }

  // Colocar SIEMPRE
  tableroActual[row][col] = num;
  limpiarNotasCelda(notas, row, col);
  selectedCell.textContent = String(num);

  // Validar reglas (si es inválido, queda pintado en rojo)
  const valido = esMovimientoValido(tableroActual, row, col, num);
  selectedCell.classList.toggle("error", !valido);

  updateProgress?.();

  if (!valido) {
    setStatus("Movimiento viola reglas del Sudoku");
    return;
  }

  if (estaResuelto(tableroActual)) {
    finishSudokuWithScore();
    return;
  }

  setStatus("Movimiento aplicado");
}

function setNoteMode(on) {
  noteMode = !!on;
  setStatus(noteMode ? "Modo notas: ACTIVADO (N para desactivar)" : "Modo notas: desactivado");
}

function renderCellContent(cellEl, r, c) {
  const isPrefilled = puzzleInicial[r][c] !== 0;
  const value = tableroActual[r][c];

  cellEl.classList.remove("has-notes");
  cellEl.innerHTML = ""; // usamos innerHTML porque vamos a meter notas en grid

  if (isPrefilled) {
    cellEl.textContent = String(value);
    cellEl.classList.add("prefilled");
    return;
  }

  // si hay número definitivo
  if (value !== 0) {
    cellEl.textContent = String(value);
    return;
  }

  // si no hay número, mostramos notas (si existen)
  const cellNotes = notas?.[r]?.[c];
  if (cellNotes && cellNotes.size > 0) {
    cellEl.classList.add("has-notes");

    const wrap = document.createElement("div");
    wrap.className = "notes-grid";

    for (let n = 1; n <= 9; n += 1) {
      const item = document.createElement("div");
      item.className = "note";
      item.textContent = cellNotes.has(n) ? String(n) : "";
      wrap.appendChild(item);
    }

    cellEl.appendChild(wrap);
  }
}

function handleNoteInput(num) {
  if (!selectedCell) return;

  const row = Number(selectedCell.dataset.row);
  const col = Number(selectedCell.dataset.col);

  // no notas en celdas fijas
  if (puzzleInicial[row][col] !== 0) {
    setStatus("No puedes poner notas en una celda fija.");
    return;
  }

  const res = toggleNota(notas, tableroActual, row, col, num);

  if (!res.ok) {
    setStatus(res.mensaje || "No se pudo actualizar la nota.");
    return;
  }

  // Renderiza solo esa celda
  renderCellContent(selectedCell, row, col);
  setStatus(res.accion === "agregada" ? `Nota ${num} agregada.` : `Nota ${num} eliminada.`);
}

function createBoard() {
  boardEl.innerHTML = "";
  selectedCell = null;

  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.dataset.row = r;
      cell.dataset.col = c;

      const isPrefilled = puzzleInicial[r][c] !== 0;
      cell.dataset.prefilled = isPrefilled ? "true" : "false";

      if ((c + 1) % 3 === 0 && c !== 8) cell.classList.add("block-right");
      if ((r + 1) % 3 === 0 && r !== 8) cell.classList.add("block-bottom");

      // ✅ render número o notas
      renderCellContent(cell, r, c);

      // ✅ si es editable y tiene número, marcar error si viola reglas
      if (!isPrefilled) {
        const value = tableroActual[r][c];
        if (value !== 0) {
          const valido = esMovimientoValido(tableroActual, r, c, value);
          cell.classList.toggle("error", !valido);
        }
      }

      cell.addEventListener("click", () => {
        if (selectedCell) selectedCell.classList.remove("selected");
        selectedCell = cell;
        cell.classList.add("selected");
      });

      boardEl.appendChild(cell);
    }
  }
}

function createSignBoard() {
  const letters = ["S", "U", "", "D", "O", "K", "", "U", ""];
  signBoardEl.innerHTML = "";
  for (let i = 0; i < 81; i += 1) {
    const row = Math.floor(i / 9);
    const col = i % 9;
    const cell = document.createElement("div");
    cell.className = "sign-cell";

    if ((col + 1) % 3 === 0 && col !== 8) cell.classList.add("block-right");
    if ((row + 1) % 3 === 0 && row !== 8) cell.classList.add("block-bottom");

    const center = row % 3 === 1 && col % 3 === 1;
    const blockIndex = Math.floor(row / 3) * 3 + Math.floor(col / 3);
    if (center) cell.textContent = letters[blockIndex];

    signBoardEl.appendChild(cell);
  }
}

function closeGuideModal() {
  guideModal.classList.add("hidden");
  guideModal.setAttribute("aria-hidden", "true");
}

function openGuide(guide) {
  const guides = {
    sudoku: {
      title: "Cómo jugar Sudoku",
      items: [
        "Cada fila debe contener números del 1 al 9 sin repetirse.",
        "Cada columna debe contener números del 1 al 9 sin repetirse.",
        "Cada subcuadro 3x3 debe contener números del 1 al 9 sin repetirse.",
        "Los números iniciales no pueden modificarse.",
        "El objetivo es completar el tablero correctamente.",
      ],
    },
    torneos: {
      title: "Cómo jugar Torneos",
      items: [
        "Los torneos se juegan por rondas con sudokus de dificultad progresiva.",
        "Tu puntaje combina tiempo de resolución y precisión final.",
        "Puedes ver tu posición en la clasificación en tiempo real.",
      ],
    },
    pvp: {
      title: "Cómo jugar PvP",
      items: [
        "Te emparejamos con un jugador de nivel similar.",
        "Ambos juegan el mismo tablero al mismo tiempo.",
        "Gana quien complete correctamente en menor tiempo.",
      ],
    },
  };

  const selected = guides[guide] || guides.sudoku;
  guideModalTitle.textContent = selected.title;
  guideModalList.innerHTML = "";
  selected.items.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    guideModalList.appendChild(li);
  });

  guideModal.classList.remove("hidden");
  guideModal.setAttribute("aria-hidden", "false");
}

function createKeypad() {
  keypadEl.innerHTML = "";
  for (let n = 1; n <= 9; n += 1) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip number";
    btn.textContent = n;

    btn.addEventListener("click", () => {
      if (noteMode) handleNoteInput(n);
      else fillSelected(n);
    });

    keypadEl.appendChild(btn);
  }
}

function startTimer(reset = false) {
  if (timerInterval) clearInterval(timerInterval);
  if (reset) seconds = 0;

  timerInterval = setInterval(() => {
    seconds += 1;
    const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
    const ss = String(seconds % 60).padStart(2, "0");
    timerEl.textContent = `${mm}:${ss}`;
  }, 1000);
}

function initializeDifficultyOptions() {
  difficultySelect.innerHTML = "";
  difficultyLevels.forEach((level, index) => {
    const option = document.createElement("option");
    option.value = level.key;
    option.textContent = `${index + 1}. ${level.label}`;
    if (level.key === currentDifficulty.key) option.selected = true;
    difficultySelect.appendChild(option);
  });
}

function pickSeedAndHuecosByLabel(label) {
  const lista = seedsPorDificultad[label] || seedsPorDificultad.Intermedio;
  const chosen = lista[Math.floor(Math.random() * lista.length)];
  return { seed: chosen.seed, huecos: chosen.huecos };
}

function loadDifficulty(levelKey) {
  const found = difficultyLevels.find((d) => d.key === levelKey) || difficultyLevels[2];
  currentDifficulty = found;
  difficultyLabel.textContent = `Dificultad: ${found.label}`;

  // TEMP: elegimos una seed/huecos de la lista según la dificultad seleccionada.
  // Luego esto vendrá desde BD.
  const { seed, huecos } = pickSeedAndHuecosByLabel(found.label);
  buildSudokuBoard(seed, huecos);
}


// ===== App events =====
function setupControls() {
  clearBtn.addEventListener("click", () => fillSelected(""));

  hintBtn.addEventListener("click", () => {
    const resultado = darPistaAleatoria(tableroActual, solucion);

    if (!resultado.ok) {
      setStatus(resultado.mensaje);
      return;
    }

    // Aplicar pista y refrescar UI
    hintsUsed += 1;
    const { row, col, valor } = resultado;
    tableroActual[row][col] = valor;

    // Si existían notas en esa celda, se limpian
    if (notas) limpiarNotasCelda(notas, row, col);

    createBoard();
    updateProgress();

    if (estaResuelto(tableroActual)) {
      finishSudokuWithScore();
    } else {
      setStatus(`Pista aplicada. Pistas usadas: ${hintsUsed}.`);
    }
  });

  // ✅ Controles teclado: números / borrar / modo notas
  document.addEventListener("keydown", (event) => {
    if (!selectedCell) return;

    const row = Number(selectedCell.dataset.row);
    const col = Number(selectedCell.dataset.col);

    // Toggle modo notas con N
    if (event.key.toLowerCase() === "n") {
      noteMode = !noteMode;
      setStatus(noteMode ? "Modo notas: ACTIVADO (N para desactivar)" : "Modo notas: desactivado");
      return;
    }

    // No permitir editar celdas fijas
    if (selectedCell.dataset.prefilled === "true") return;

    // Números 1-9
    if (/^[1-9]$/.test(event.key)) {
      const num = Number(event.key);

      // Shift+num o modo notas -> notas
      if (noteMode || event.shiftKey) {
        handleNoteInput(num);
      } else {
        fillSelected(event.key);
      }
      return;
    }

    // Borrar
    if (event.key === "Backspace" || event.key === "Delete") {
      if (noteMode) {
        // borrar notas
        if (notas) limpiarNotasCelda(notas, row, col);
        renderCellContent(selectedCell, row, col);
        setStatus("Notas eliminadas.");
      } else {
        fillSelected("");
      }
    }
  });

  difficultySelect.addEventListener("change", (event) => {
    loadDifficulty(event.target.value);
  });

  playNowBtn.addEventListener("click", () => setTab("juego"));
  goToSudokuBtn?.addEventListener("click", () => setTab("juego"));
  goToTorneosBtn?.addEventListener("click", () => setTab("torneos"));
  goToPvpBtn?.addEventListener("click", () => setTab("pvp"));

  openGuideBtns.forEach((btn) => {
    btn.addEventListener("click", () => openGuide(btn.dataset.guide));
  });

  guideModalClose.addEventListener("click", closeGuideModal);
  guideModalX.addEventListener("click", closeGuideModal);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && guideModal.getAttribute("aria-hidden") === "false") closeGuideModal();
    if (event.key === "Escape" && avatarModal.getAttribute("aria-hidden") === "false") closePicker(avatarModal);
    if (event.key === "Escape" && badgeModal.getAttribute("aria-hidden") === "false") closePicker(badgeModal);
    if (event.key === "Escape" && streakModal.getAttribute("aria-hidden") === "false") closePicker(streakModal);
  });

  homeLogo.addEventListener("click", () => setTab("inicio"));
  openAuthBtn?.addEventListener("click", async () => {
    if (authBusy) return;

    if (!isAuthenticated()) {
      openLoginTab();
      return;
    }

    await logoutCurrentSession();
  });
  openProfileBtn.addEventListener("click", () => {
    if (!requireAuthForProfile()) return;
    setTab("perfil");
  });
  tabJugarBtn.addEventListener("click", () => setTab("juego"));
  tabTorneosBtn.addEventListener("click", () => setTab("torneos"));
  tabPvpBtn.addEventListener("click", () => setTab("pvp"));
  tabInicioBtn.addEventListener("click", () => setTab("inicio"));
  tabPerfilBtn.addEventListener("click", () => {
    if (!requireAuthForProfile()) return;
    setTab("perfil");
  });
  backHomeBtn.addEventListener("click", () => setTab("inicio"));
  backHomeFromProfileBtn.addEventListener("click", () => setTab("inicio"));
  backHomeFromLoginBtn?.addEventListener("click", () => setTab("inicio"));
  backHomeGenericBtns.forEach((btn) => btn.addEventListener("click", () => setTab("inicio")));

  showLoginFormBtn?.addEventListener("click", () => {
    setAuthView("login");
    setAuthMessage("");
  });
  showRegisterFormBtn?.addEventListener("click", () => {
    setAuthView("register");
    setAuthMessage("");
  });
  switchToRegisterBtn?.addEventListener("click", () => {
    setAuthView("register");
    setAuthMessage("");
  });
  switchToForgotBtn?.addEventListener("click", () => {
    openForgotTab(
      loginEmailInput?.value?.trim() || "",
      "Ingresa tu correo para enviarte el token de recuperacion.",
    );
  });
  switchToVerifyBtn?.addEventListener("click", () => {
    openVerifyTab(
      loginEmailInput?.value?.trim() || "",
      "Ingresa el correo y el codigo que recibiste por email.",
    );
  });
  switchToResetBtn?.addEventListener("click", () => {
    openResetTab(
      "",
      "Ingresa el token que te llego al correo y define tu nueva contrasena.",
    );
  });
  switchToLoginBtn?.addEventListener("click", () => {
    setAuthView("login");
    setAuthMessage("");
  });
  switchToLoginFromVerifyBtn?.addEventListener("click", () => {
    setAuthView("login");
    setAuthMessage("");
  });
  switchToForgotFromResetBtn?.addEventListener("click", () => {
    openForgotTab("", "Solicita un nuevo token de recuperacion.");
  });
  switchToLoginFromForgotBtn?.addEventListener("click", () => {
    setAuthView("login");
    setAuthMessage("");
  });
  switchToLoginFromResetBtn?.addEventListener("click", () => {
    setAuthView("login");
    setAuthMessage("");
  });

  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (authBusy) return;

    const email = loginEmailInput?.value?.trim() || "";
    const password = loginPasswordInput?.value || "";

    if (!email || !password) {
      setAuthMessage("Completa correo y contrasena.", "error");
      return;
    }

    const submitButton = loginForm.querySelector('button[type="submit"]');
    const originalLabel = submitButton?.textContent || "Entrar";

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Entrando...";
    }

    setAuthBusyState(true);
    setAuthMessage("Iniciando sesion...");

    try {
      const response = await apiClient.login({ email, password });

      if (!response?.accessToken) {
        throw new Error("Respuesta de login sin accessToken.");
      }

      const session = {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken || "",
        user: response.user || { email },
      };

      const hydrated = await hydrateSession(session);
      saveAuthSession(hydrated);

      loginForm.reset();
      setAuthMessage("Sesion iniciada correctamente.", "ok");
      setStatus("Sesion iniciada correctamente.", true);
      setTab("inicio");
    } catch (error) {
      setAuthMessage(
        getErrorMessage(error, "No fue posible iniciar sesion."),
        "error",
      );
    } finally {
      setAuthBusyState(false);
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalLabel;
      }
    }
  });

  registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (authBusy) return;

    const name = registerNameInput?.value?.trim() || "";
    const email = registerEmailInput?.value?.trim() || "";
    const password = registerPassword?.value || "";
    const confirmPassword = registerPasswordConfirm?.value || "";

    if (!name || !email || !password || !confirmPassword) {
      setAuthMessage("Completa todos los campos del registro.", "error");
      return;
    }

    if (password.length < 8) {
      setAuthMessage("La contrasena debe tener al menos 8 caracteres.", "error");
      return;
    }

    if (password !== confirmPassword) {
      setAuthMessage("Las contrasenas no coinciden.", "error");
      return;
    }

    const submitButton = registerForm.querySelector('button[type="submit"]');
    const originalLabel = submitButton?.textContent || "Crear cuenta";

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Creando...";
    }

    setAuthBusyState(true);
    setAuthMessage("Creando cuenta...");

    try {
      const response = await apiClient.signup({
        name,
        email,
        password,
      });

      registerForm.reset();

      if (response?.accessToken) {
        const session = {
          accessToken: response.accessToken,
          refreshToken: response.refreshToken || "",
          user: response.user || { name, email },
        };

        const hydrated = await hydrateSession(session);
        saveAuthSession(hydrated);
        setAuthMessage("Cuenta creada e inicio de sesion exitoso.", "ok");
        setStatus("Cuenta creada e inicio de sesion exitoso.", true);
        setTab("inicio");
      } else {
        openVerifyTab(
          email,
          "Cuenta creada. Revisa tu correo e ingresa el codigo para verificarla.",
          "ok",
        );
        setStatus("Cuenta creada. Verifica tu correo para activar la cuenta.", true);
      }
    } catch (error) {
      setAuthMessage(
        getErrorMessage(error, "No fue posible crear la cuenta."),
        "error",
      );
    } finally {
      setAuthBusyState(false);
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalLabel;
      }
    }
  });

  verifyForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (authBusy) return;

    const email = verifyEmailInput?.value?.trim() || "";
    const code = verifyCodeInput?.value?.trim() || "";

    if (!email || !code) {
      setAuthMessage("Completa correo y codigo de verificacion.", "error");
      return;
    }

    const submitButton = verifyForm.querySelector('button[type="submit"]');
    const originalLabel = submitButton?.textContent || "Verificar cuenta";

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Verificando...";
    }

    setAuthBusyState(true);
    setAuthMessage("Verificando codigo...");

    try {
      await apiClient.verifyEmail({ email, code });
      setAuthView("login");
      if (loginEmailInput) loginEmailInput.value = email;
      if (verifyCodeInput) verifyCodeInput.value = "";
      setAuthMessage("Correo verificado. Ahora inicia sesion.", "ok");
      setStatus("Correo verificado. Ya puedes iniciar sesion.", true);
    } catch (error) {
      setAuthMessage(
        getErrorMessage(error, "No fue posible verificar el correo."),
        "error",
      );
    } finally {
      setAuthBusyState(false);
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalLabel;
      }
    }
  });

  forgotForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (authBusy) return;

    const email = forgotEmailInput?.value?.trim() || "";

    if (!email) {
      setAuthMessage("Completa el correo para recuperar la contrasena.", "error");
      return;
    }

    const submitButton = forgotForm.querySelector('button[type="submit"]');
    const originalLabel = submitButton?.textContent || "Enviar correo de recuperacion";

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Enviando...";
    }

    setAuthBusyState(true);
    setAuthMessage("Solicitando correo de recuperacion...");

    try {
      await apiClient.forgotPassword({ email });
      openResetTab(
        "",
        "Correo enviado. Revisa tu bandeja y pega el token para restablecer tu contrasena.",
        "ok",
      );
      setStatus("Correo de recuperacion enviado.", true);
    } catch (error) {
      setAuthMessage(
        getErrorMessage(error, "No fue posible iniciar la recuperacion de contrasena."),
        "error",
      );
    } finally {
      setAuthBusyState(false);
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalLabel;
      }
    }
  });

  resetForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (authBusy) return;

    const token = resetTokenInput?.value?.trim() || "";
    const newPassword = resetPasswordInput?.value || "";
    const confirmPassword = resetPasswordConfirmInput?.value || "";
    const passwordPolicy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$_-])[A-Za-z\d!@#$_-]{8,}$/;

    if (!token || !newPassword || !confirmPassword) {
      setAuthMessage("Completa token y ambos campos de contrasena.", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      setAuthMessage("Las contrasenas no coinciden.", "error");
      return;
    }

    if (!passwordPolicy.test(newPassword)) {
      setAuthMessage(
        "La nueva contrasena debe tener minimo 8 caracteres, mayuscula, minuscula, numero y simbolo (!, @, #, $, _, -).",
        "error",
      );
      return;
    }

    const submitButton = resetForm.querySelector('button[type="submit"]');
    const originalLabel = submitButton?.textContent || "Restablecer contrasena";

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Restableciendo...";
    }

    setAuthBusyState(true);
    setAuthMessage("Restableciendo contrasena...");

    try {
      await apiClient.resetPassword({ token, newPassword });
      resetForm.reset();
      setAuthView("login");
      setAuthMessage("Contrasena actualizada. Inicia sesion con tu nueva clave.", "ok");
      setStatus("Contrasena restablecida correctamente.", true);
    } catch (error) {
      setAuthMessage(
        getErrorMessage(error, "No fue posible restablecer la contrasena."),
        "error",
      );
    } finally {
      setAuthBusyState(false);
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalLabel;
      }
    }
  });

  const syncPasswordValidation = () => {
    const pass = registerPassword?.value || "";
    const confirm = registerPasswordConfirm?.value || "";

    if (!pass && !confirm) {
      passwordMatchIcon.textContent = "•";
      passwordMatchText.textContent = "Escribe y confirma tu contraseña.";
      return;
    }

    if (pass.length < 8) {
      passwordMatchIcon.textContent = "⚠";
      passwordMatchText.textContent = "La contraseña debe tener al menos 8 caracteres.";
      return;
    }

    if (pass !== confirm) {
      passwordMatchIcon.textContent = "✕";
      passwordMatchText.textContent = "Las contraseñas no coinciden.";
      return;
    }

    passwordMatchIcon.textContent = "✓";
    passwordMatchText.textContent = "Contraseñas válidas y coincidentes.";
  };

  registerPassword?.addEventListener("input", syncPasswordValidation);
  registerPasswordConfirm?.addEventListener("input", syncPasswordValidation);
  setAuthView("login");
  setAuthMessage("");
  syncAuthUi();
  syncProfileIdentity();
}

// ===== App bootstrap =====
async function bootstrapApp() {
  initTheme();
  createSignBoard();
  createKeypad();
  initializeDifficultyOptions();
  setupControls();
  initProfileUi();
  loadDifficulty(currentDifficulty.key);
  setTab("inicio");
  await restoreAuthSession();
  await showModeDetail("sudoku");
}

bootstrapApp();

