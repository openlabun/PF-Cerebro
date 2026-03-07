const GAME_ID_SUDOKU = "uVsB-k2rjora";

const DEFAULT_PROFILE_MODE_STATS = {
  sudoku: [
    "Partidas jugadas: 42",
    "Mejor tiempo: 03:52",
    "Precision promedio: 92%",
    "Dificultad favorita: Intermedio",
  ],
  torneos: [
    "Torneos jugados: 12",
    "Top 3 alcanzado: 5 veces",
    "Mejor posicion: #2",
    "Puntaje promedio: 1,240",
  ],
  pvp: [
    "Partidas PvP: 33",
    "Victorias: 20 · Derrotas: 13",
    "Racha maxima: 6 victorias",
    "Precision en duelos: 90%",
  ],
};

const avatarOptions = ["♔", "♕", "♖", "♗", "♘", "♙"];
const badgeOptions = ["🧠", "♟️", "🎯", "⚡", "🏆", "🔥", "🛡️", "💎", "🌟", "🎲"];
const frameOptions = [
  { key: "frame-royal", label: "Real", minStreak: 0 },
  { key: "frame-arcane", label: "Arcano", minStreak: 0 },
  { key: "frame-neon", label: "Neon", minStreak: 0 },
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

  for (let i = 0; i < 17; i += 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    if (day.getFullYear() === year) dates.add(toYmd(day));
  }

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

export function createProfileModule({ apiClient }) {
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
  const profileNameEl = document.getElementById("profile-name");
  const profileTitleEl = document.getElementById("profile-title");
  const profileLevelBadgeEl = document.querySelector("#open-avatar-picker .level-badge");
  const profileLevelFillEl = document.querySelector("#perfil-tab .profile-level-wrap .level-fill");
  const profileLevelTextEl = document.querySelector("#perfil-tab .profile-level-wrap .level-text");

  const DEFAULT_PROFILE_NAME = profileNameEl?.textContent?.trim() || "Invitado#0001";
  const DEFAULT_PROFILE_TITLE =
    profileTitleEl?.textContent?.trim() || 'Titulo: "El dios de los numeros"';

  const profileModeStats = {
    sudoku: [...DEFAULT_PROFILE_MODE_STATS.sudoku],
    torneos: [...DEFAULT_PROFILE_MODE_STATS.torneos],
    pvp: [...DEFAULT_PROFILE_MODE_STATS.pvp],
  };

  const streakActivityDates = createStreakActivityDates(CURRENT_YEAR);
  let currentStreakMonth = new Date(CURRENT_YEAR, new Date().getMonth(), 1);
  let activeBadgeSlot = null;
  let activeFrame = "frame-royal";

  function setProfileAvatar(symbol) {
    if (profileAvatarEl) profileAvatarEl.textContent = symbol;
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
    if (streakCountEl) {
      streakCountEl.textContent = String(getCurrentStreak(streakActivityDates));
    }
  }

  function openPicker(modalEl) {
    if (!modalEl) return;
    modalEl.classList.remove("hidden");
    modalEl.setAttribute("aria-hidden", "false");
  }

  function closePicker(modalEl) {
    if (!modalEl) return;
    modalEl.classList.add("hidden");
    modalEl.setAttribute("aria-hidden", "true");
  }

  function renderAvatarOptions() {
    if (!avatarOptionsEl) return;
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
    if (!badgeOptionsEl) return;
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
    if (!isFrameUnlocked(selected) || !openAvatarPickerBtn) return;

    openAvatarPickerBtn.classList.remove(...frameOptions.map((frame) => frame.key));
    openAvatarPickerBtn.classList.add(selected.key);
    activeFrame = selected.key;
  }

  function renderFrameOptions() {
    if (!frameOptionsEl) return;
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
    avatarOptionsEl?.classList.toggle("hidden", !isAvatar);
    frameOptionsEl?.classList.toggle("hidden", isAvatar);
    pickerTabBtns.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.pickerTab === tab);
    });
  }

  function renderStreakCalendar() {
    if (!streakCalendarEl || !streakMonthLabelEl || !streakPrevMonthBtn || !streakNextMonthBtn) {
      return;
    }

    const monthNames = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];

    const month = currentStreakMonth.getMonth();
    const year = currentStreakMonth.getFullYear();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;

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
      cell.textContent = String(day);
      streakCalendarEl.appendChild(cell);
    }
  }

  function xpParaSiguienteNivel(nivel) {
    const lvl = Number(nivel);
    if (lvl >= 1 && lvl <= 10) return lvl * 100;
    if (lvl >= 11 && lvl <= 30) return lvl * 150;
    return lvl * 250;
  }

  function syncProfileProgress(user, isAuthenticated) {
    if (!profileLevelBadgeEl && !profileLevelFillEl && !profileLevelTextEl) return;

    if (!isAuthenticated) {
      if (streakCountEl) streakCountEl.textContent = "0";
      if (profileLevelBadgeEl) profileLevelBadgeEl.textContent = "47";
      if (profileLevelFillEl) profileLevelFillEl.style.width = "68%";
      if (profileLevelTextEl) profileLevelTextEl.textContent = "Nivel 47 · 680 / 1000 XP";
      return;
    }

    const nivel = Number(user?.nivel ?? 0);
    const experiencia = Number(user?.experiencia ?? 0);
    const rachaActual = Number(user?.rachaActual ?? 0);

    if (streakCountEl && Number.isFinite(rachaActual)) {
      streakCountEl.textContent = String(rachaActual);
    }

    if (!Number.isFinite(nivel) || nivel <= 0) return;

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

  function getProfileDisplayName(user) {
    if (!user) return DEFAULT_PROFILE_NAME;
    if (user.name) return user.name;
    if (user.email) return String(user.email).split("@")[0];

    const rawId = user.id || user.sub;
    if (!rawId) return DEFAULT_PROFILE_NAME;
    return `Jugador#${String(rawId).slice(-4)}`;
  }

  function syncIdentity(session, isAuthenticated) {
    if (!profileNameEl || !profileTitleEl) return;

    if (!isAuthenticated) {
      profileNameEl.textContent = DEFAULT_PROFILE_NAME;
      profileTitleEl.textContent = DEFAULT_PROFILE_TITLE;
      profileModeStats.sudoku = [...DEFAULT_PROFILE_MODE_STATS.sudoku];
      syncProfileProgress(null, false);
      return;
    }

    const user = session?.user || {};
    profileNameEl.textContent = getProfileDisplayName(user);

    const tituloTexto = user.tituloActivoTexto ?? session?.profile?.tituloActivoTexto ?? null;
    if (tituloTexto) {
      profileTitleEl.textContent = `Titulo: ${tituloTexto}`;
    } else if (user.email) {
      profileTitleEl.textContent = `Correo: ${user.email}`;
    } else {
      profileTitleEl.textContent = "Sesion activa";
    }

    syncProfileProgress(user, true);
  }

  async function loadSudokuStatsIntoProfile(accessToken) {
    if (!accessToken) return;

    try {
      const perfil = await apiClient.getMyProfile(accessToken);
      const stats = await apiClient.getMyGameStats(accessToken, GAME_ID_SUDOKU);

      if (!stats || typeof stats !== "object") {
        console.warn("[stats] respuesta invalida de getMyGameStats");
        return;
      }

      syncProfileProgress(perfil, true);
      profileModeStats.sudoku = [
        `Partidas jugadas: ${stats.partidasJugadas ?? 0}`,
        `Elo: ${stats.elo ?? 0}`,
        stats.ligaId ? `Liga: ${stats.ligaId}` : "Liga: -",
      ];
    } catch (error) {
      console.warn("Fallo cargando stats sudoku:", error);
    }
  }

  async function showModeDetail(modeKey) {
    modeCardBtns?.forEach((card) => {
      card.classList.toggle("active", card.dataset.mode === modeKey);
    });

    const stats = profileModeStats[modeKey];
    if (!stats || !modeDetailTitle || !modeDetailList) return;

    const titleMap = {
      sudoku: "Sudoku",
      torneos: "Torneos",
      pvp: "PvP",
    };

    modeDetailTitle.textContent = `Estadisticas · ${titleMap[modeKey]}`;
    modeDetailList.innerHTML = "";
    stats.forEach((line) => {
      const li = document.createElement("li");
      li.textContent = line;
      modeDetailList.appendChild(li);
    });
  }

  function init() {
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

    openAvatarPickerBtn?.addEventListener("click", () => openPicker(avatarModal));
    openStreakCalendarBtn?.addEventListener("click", () => {
      currentStreakMonth = new Date(CURRENT_YEAR, new Date().getMonth(), 1);
      renderStreakCalendar();
      openPicker(streakModal);
    });

    streakPrevMonthBtn?.addEventListener("click", () => {
      if (currentStreakMonth.getMonth() === 0) return;
      currentStreakMonth = new Date(CURRENT_YEAR, currentStreakMonth.getMonth() - 1, 1);
      renderStreakCalendar();
    });

    streakNextMonthBtn?.addEventListener("click", () => {
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
      btn.addEventListener("click", () => showModeDetail(btn.dataset.mode));
    });

    closePickerBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const type = btn.dataset.closePicker;
        if (type === "avatar") closePicker(avatarModal);
        if (type === "badge") closePicker(badgeModal);
        if (type === "streak") closePicker(streakModal);
      });
    });

    syncIdentity(null, false);
  }

  return {
    init,
    loadSudokuStatsIntoProfile,
    showModeDetail,
    syncIdentity,
  };
}
