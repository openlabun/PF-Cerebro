// ===== Sudoku base data =====
const solution = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
];

const difficultyLevels = [
  { key: "muy-facil", label: "Principiante", givens: 48 },
  { key: "facil", label: "Iniciado", givens: 42 },
  { key: "medio", label: "Intermedio", givens: 36 },
  { key: "dificil", label: "Avanzado", givens: 31 },
  { key: "experto", label: "Experto", givens: 27 },
  { key: "maestro", label: "Profesional", givens: 24 },
];

// ===== Theme settings =====
const themes = ["light", "dark"];
const THEME_KEY = "sudoku-theme";

// ===== DOM references =====
const boardEl = document.getElementById("board");
const signBoardEl = document.getElementById("sign-board");
const chessSignBoardEl = document.getElementById("chess-sign-board");
const checkersSignBoardEl = document.getElementById("checkers-sign-board");
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
const tabPerfilBtn = document.getElementById("tab-perfil");
const openProfileBtn = document.getElementById("open-profile");
const backHomeBtn = document.getElementById("back-home");
const backHomeFromProfileBtn = document.getElementById("back-home-from-profile");
const inicioTab = document.getElementById("inicio-tab");
const juegoTab = document.getElementById("juego-tab");
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

// ===== Runtime state =====
let puzzle = [];
let state = [];
let selectedCell = null;
let seconds = 0;
let activeTheme = "light";
let timerInterval = null;
let currentDifficulty = difficultyLevels[2];


const profileModeStats = {
  sudoku: [
    "Partidas jugadas: 42",
    "Mejor tiempo: 03:52",
    "Precisión promedio: 92%",
    "Dificultad favorita: Intermedio",
  ],
  ajedrez: [
    "Partidas jugadas: 18",
    "ELO actual: 1035",
    "Victorias: 11 · Derrotas: 7",
    "Apertura favorita: Italiana",
  ],
  damas: [
    "Partidas jugadas: 27",
    "Victorias: 16 · Derrotas: 11",
    "Racha máxima: 5 victorias",
    "Tasa de capturas: 78%",
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

function createStreakActivityDates(year) {
  const dates = new Set();
  const today = new Date();

  // Racha actual: últimos 17 días consecutivos hasta hoy.
  for (let i = 0; i < 17; i += 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    if (day.getFullYear() === year) dates.add(toYmd(day));
  }

  // Días adicionales de actividad en meses anteriores del mismo año.
  [
    `${year}-01-04`,
    `${year}-01-05`,
    `${year}-01-12`,
    `${year}-01-22`,
    `${year}-02-02`,
    `${year}-02-10`,
    `${year}-03-08`,
    `${year}-03-14`,
    `${year}-04-03`,
    `${year}-05-18`,
    `${year}-06-02`,
    `${year}-07-09`,
  ].forEach((d) => dates.add(d));

  return [...dates].sort();
}

const streakActivityDates = createStreakActivityDates(CURRENT_YEAR);
let currentStreakMonth = new Date(CURRENT_YEAR, new Date().getMonth(), 1);
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

function renderModeDetail(mode) {
  const selectedMode = profileModeStats[mode] ? mode : "sudoku";
  modeCardBtns.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === selectedMode);
  });
  modeDetailTitle.textContent = selectedMode[0].toUpperCase() + selectedMode.slice(1);
  modeDetailList.innerHTML = "";
  profileModeStats[selectedMode].forEach((stat) => {
    const item = document.createElement("li");
    item.textContent = stat;
    modeDetailList.appendChild(item);
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
  renderModeDetail("sudoku");

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

  modeCardBtns.forEach((btn) => {
    btn.addEventListener("click", () => renderModeDetail(btn.dataset.mode));
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
function seededRandom(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function createPuzzle(givens, difficultyKey) {
  const base = solution.map((row) => [...row]);
  const indices = Array.from({ length: 81 }, (_, i) => i);
  const rng = seededRandom(
    difficultyKey
      .split("")
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  );

  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  for (let i = givens; i < indices.length; i += 1) {
    const row = Math.floor(indices[i] / 9);
    const col = indices[i] % 9;
    base[row][col] = "";
  }

  return base;
}

function setTab(mode) {
  const isGame = mode === "juego";
  const isProfile = mode === "perfil";
  const isHome = !isGame && !isProfile;

  inicioTab.classList.toggle("hidden", !isHome);
  juegoTab.classList.toggle("hidden", !isGame);
  perfilTab.classList.toggle("hidden", !isProfile);

  tabInicioBtn.classList.toggle("active", isHome);
  tabJugarBtn.classList.toggle("active", isGame);
  tabPerfilBtn.classList.toggle("active", isProfile);

  if (isGame || isProfile) window.scrollTo({ top: 0, behavior: "smooth" });
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

function hasConflict(row, col, value) {
  if (value === "") return false;
  const n = Number(value);
  for (let i = 0; i < 9; i += 1) {
    if (i !== col && Number(state[row][i]) === n) return true;
    if (i !== row && Number(state[i][col]) === n) return true;
  }

  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let r = startRow; r < startRow + 3; r += 1) {
    for (let c = startCol; c < startCol + 3; c += 1) {
      if ((r !== row || c !== col) && Number(state[r][c]) === n) return true;
    }
  }
  return false;
}

function isSolved() {
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (Number(state[r][c]) !== solution[r][c]) return false;
    }
  }
  return true;
}

function getProgress() {
  let editable = 0;
  let correct = 0;

  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (puzzle[r][c] === "") {
        editable += 1;
        if (Number(state[r][c]) === solution[r][c]) correct += 1;
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

function fillSelected(value) {
  if (!selectedCell || selectedCell.dataset.prefilled === "true") return;
  const row = Number(selectedCell.dataset.row);
  const col = Number(selectedCell.dataset.col);

  state[row][col] = value === "" ? "" : Number(value);
  selectedCell.textContent = value;

  const conflict = hasConflict(row, col, value);
  selectedCell.classList.toggle("error", conflict);

  updateProgress();

  if (conflict) return setStatus("Hay conflicto en fila, columna o subcuadro.");
  if (isSolved()) return setStatus("¡Excelente! Completaste el Sudoku correctamente.", true);
  return setStatus("Sigue así, vas muy bien.");
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
      cell.dataset.prefilled = puzzle[r][c] !== "";

      if ((c + 1) % 3 === 0 && c !== 8) cell.classList.add("block-right");
      if ((r + 1) % 3 === 0 && r !== 8) cell.classList.add("block-bottom");

      if (puzzle[r][c] !== "") {
        cell.textContent = puzzle[r][c];
        cell.classList.add("prefilled");
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

function createChessSignBoard() {
  if (!chessSignBoardEl) return;
  const blackBack = ["♜", "♞", "♝", "♛", "♚", "♝", "♞", "♜"];
  const whiteBack = ["♖", "♘", "♗", "♕", "♔", "♗", "♘", "♖"];

  chessSignBoardEl.innerHTML = "";
  for (let i = 0; i < 64; i += 1) {
    const row = Math.floor(i / 8);
    const col = i % 8;
    const cell = document.createElement("div");
    cell.className = "sign-cell chess-cell";

    cell.classList.add((row + col) % 2 === 0 ? "light" : "dark");
    if (row === 0) cell.textContent = blackBack[col];
    else if (row === 1) cell.textContent = "♟";
    else if (row === 6) cell.textContent = "♙";
    else if (row === 7) cell.textContent = whiteBack[col];

    chessSignBoardEl.appendChild(cell);
  }
}

function createCheckersSignBoard() {
  if (!checkersSignBoardEl) return;
  checkersSignBoardEl.innerHTML = "";
  for (let i = 0; i < 64; i += 1) {
    const row = Math.floor(i / 8);
    const col = i % 8;
    const cell = document.createElement("div");
    cell.className = "sign-cell chess-cell checkers-cell";

    const darkSquare = (row + col) % 2 !== 0;
    cell.classList.add(darkSquare ? "dark" : "light");

    if (darkSquare && row <= 2) cell.textContent = "●";
    else if (darkSquare && row >= 5) cell.textContent = "○";

    checkersSignBoardEl.appendChild(cell);
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
    ajedrez: {
      title: "Cómo jugar Ajedrez",
      items: [
        "Cada jugador inicia con 16 piezas.",
        "El objetivo es dar jaque mate al rey rival.",
        "Cada tipo de pieza tiene un movimiento específico.",
        "No puedes dejar a tu rey en jaque.",
        "Si no hay movimientos legales y no hay jaque, es tablas.",
      ],
    },
    damas: {
      title: "Cómo jugar Damas",
      items: [
        "Se juega sobre un tablero de 8x8 usando las casillas oscuras.",
        "Cada jugador mueve piezas en diagonal hacia adelante.",
        "Capturas una pieza rival saltando sobre ella.",
        "Si llegas al extremo opuesto, tu pieza se convierte en reina.",
        "Gana quien deja al rival sin movimientos o sin piezas.",
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
    btn.addEventListener("click", () => fillSelected(n));
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

function loadDifficulty(levelKey) {
  const found = difficultyLevels.find((d) => d.key === levelKey) || difficultyLevels[2];
  currentDifficulty = found;
  difficultyLabel.textContent = `Dificultad: ${found.label}`;
  puzzle = createPuzzle(found.givens, found.key);
  state = puzzle.map((row) => [...row]);
  createBoard();
  setStatus("Selecciona una celda para comenzar.");
  updateProgress();
  startTimer(true);
}

// ===== App events =====
function setupControls() {
  clearBtn.addEventListener("click", () => fillSelected(""));
  hintBtn.addEventListener("click", () => {
    if (!selectedCell || selectedCell.dataset.prefilled === "true") {
      setStatus("Selecciona una celda vacía para usar pista.");
      return;
    }
    const row = Number(selectedCell.dataset.row);
    const col = Number(selectedCell.dataset.col);
    fillSelected(solution[row][col]);
  });

  document.addEventListener("keydown", (event) => {
    if (!selectedCell || selectedCell.dataset.prefilled === "true") return;
    if (/^[1-9]$/.test(event.key)) fillSelected(event.key);
    if (event.key === "Backspace" || event.key === "Delete") fillSelected("");
  });

  difficultySelect.addEventListener("change", (event) => {
    loadDifficulty(event.target.value);
  });

  playNowBtn.addEventListener("click", () => setTab("juego"));

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
  openProfileBtn.addEventListener("click", () => setTab("perfil"));
  tabJugarBtn.addEventListener("click", () => setTab("juego"));
  tabInicioBtn.addEventListener("click", () => setTab("inicio"));
  tabPerfilBtn.addEventListener("click", () => setTab("perfil"));
  backHomeBtn.addEventListener("click", () => setTab("inicio"));
  backHomeFromProfileBtn.addEventListener("click", () => setTab("inicio"));
}

// ===== App bootstrap =====
initTheme();
createSignBoard();
createChessSignBoard();
createCheckersSignBoard();
createKeypad();
initializeDifficultyOptions();
setupControls();
initProfileUi();
loadDifficulty(currentDifficulty.key);
setTab("inicio");