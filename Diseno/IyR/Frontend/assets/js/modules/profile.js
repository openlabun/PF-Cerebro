const GAME_ID_SUDOKU = "uVsB-k2rjora";
const PROFILE_BADGES_STORAGE_PREFIX = "cerebro_profile_badges";
const PROFILE_SCORE_STORAGE_PREFIX = "cerebro_profile_sudoku_score";
const CURRENT_YEAR = new Date().getFullYear();

const DEFAULT_PROFILE_MODE_STATS = {
  sudoku: [
    "Partidas jugadas: -",
    "Elo: -",
    "Liga: -",
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

const avatarOptions = ["\u2654", "\u2655", "\u2656", "\u2657", "\u2658", "\u2659"];
const achievementBadges = [
  {
    key: "first-game",
    label: "Primera partida",
    icon: "\uD83C\uDFC1",
    description: "Completa tu primera partida de Sudoku.",
  },
  {
    key: "five-games",
    label: "5 partidas",
    icon: "5\uFE0F\u20E3",
    description: "Completa 5 partidas de Sudoku.",
  },
  {
    key: "ten-games",
    label: "10 partidas",
    icon: "\uD83D\uDD1F",
    description: "Completa 10 partidas de Sudoku.",
  },
  {
    key: "score-over-500",
    label: "Puntaje >500",
    icon: "\uD83C\uDFAF",
    description: "Alcanza un puntaje mayor a 500 en una partida.",
  },
];

const achievementBadgeMap = Object.fromEntries(
  achievementBadges.map((badge) => [badge.key, badge]),
);

const frameOptions = [
  { key: "frame-royal", label: "Real", minStreak: 0 },
  { key: "frame-arcane", label: "Arcano", minStreak: 0 },
  { key: "frame-neon", label: "Neon", minStreak: 0 },
  { key: "frame-ember", label: "Ascua", minStreak: 0 },
  { key: "frame-ice", label: "Hielo", minStreak: 0 },
  { key: "frame-inferno", label: "Inferno", minStreak: 11 },
];

const STREAK_SESSION_WINDOW_MS = 28 * 60 * 60 * 1000;

function toYmd(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isValidYmd(value) {
  if (typeof value !== "string") return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime()) && toYmd(parsed) === value;
}

function normalizeStreakDates(rawDates) {
  if (!Array.isArray(rawDates)) return [];
  const cleaned = rawDates
    .map((item) => String(item || "").trim())
    .filter((item) => isValidYmd(item));

  return [...new Set(cleaned)].sort((a, b) => a.localeCompare(b));
}

function parseIsoDate(value) {
  const parsed = new Date(String(value || "").trim());
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getSessionDayKey(value) {
  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = parseIsoDate(raw);
  return parsed ? toYmd(parsed) : null;
}

function getProfileStorageKey(prefix, userId) {
  return `${prefix}:${String(userId || "guest")}`;
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

  let streakActivityDates = [];
  let currentUserId = null;
  let serverStreak = 0;
  let isProfileAuthenticated = false;
  let currentStreakMonth = new Date(CURRENT_YEAR, new Date().getMonth(), 1);
  let activeBadgeSlot = null;
  let activeFrame = "frame-royal";
  let badgeSelectionStorageKey = getProfileStorageKey(PROFILE_BADGES_STORAGE_PREFIX, "guest");
  let scoreStorageKey = getProfileStorageKey(PROFILE_SCORE_STORAGE_PREFIX, "guest");
  let selectedBadgeKeys = [];
  let unlockedBadgeKeys = new Set();
  let achievementCatalogByKey = new Map();
  let bestSudokuScore = 0;

  function getEffectiveStreak() {
    if (!isProfileAuthenticated) return 0;
    const safeServerStreak = Number(serverStreak);
    if (!Number.isFinite(safeServerStreak) || safeServerStreak < 0) return 0;
    return Math.floor(safeServerStreak);
  }

  function refreshStreakUi() {
    if (streakCountEl) streakCountEl.textContent = String(getEffectiveStreak());
  }

  function setProfileAvatar(symbol) {
    if (profileAvatarEl) profileAvatarEl.textContent = symbol;
  }

  function isFrameUnlocked(frame) {
    return getEffectiveStreak() >= frame.minStreak;
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

  function resolveSessionUserId(session) {
    const user = session?.user || {};
    return (
      user.usuarioId ||
      session?.profile?.usuarioId ||
      user.id ||
      user.sub ||
      null
    );
  }

  function loadStreakDatesForUser(userId) {
    currentUserId = userId ? String(userId) : null;
    streakActivityDates = [];
  }

  function buildSyntheticStreakDates(streakValue) {
    const safeStreak = Math.max(0, Math.floor(Number(streakValue) || 0));
    if (safeStreak <= 0) return [];

    const dates = [];
    const cursor = new Date();

    for (let i = 0; i < safeStreak; i += 1) {
      dates.push(toYmd(cursor));
      cursor.setDate(cursor.getDate() - 1);
    }

    return normalizeStreakDates(dates);
  }

  function syncCalendarFromServerStreak() {
    streakActivityDates = buildSyntheticStreakDates(serverStreak);
    renderStreakCalendar();
  }

  function normalizeBadgeKeys(rawKeys) {
    if (!Array.isArray(rawKeys)) return [];
    const cleaned = rawKeys
      .map((item) => String(item || "").trim())
      .filter((item) => achievementBadgeMap[item]);
    return [...new Set(cleaned)];
  }

  function readStoredBadgeSelection() {
    try {
      const raw = localStorage.getItem(badgeSelectionStorageKey);
      if (!raw) return [];
      return normalizeBadgeKeys(JSON.parse(raw));
    } catch {
      return [];
    }
  }

  function writeStoredBadgeSelection() {
    try {
      localStorage.setItem(badgeSelectionStorageKey, JSON.stringify(selectedBadgeKeys));
    } catch {
      // noop
    }
  }

  function readStoredBestScore() {
    try {
      const raw = localStorage.getItem(scoreStorageKey);
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed < 0) return 0;
      return Math.floor(parsed);
    } catch {
      return 0;
    }
  }

  function writeStoredBestScore() {
    try {
      localStorage.setItem(scoreStorageKey, String(bestSudokuScore));
    } catch {
      // noop
    }
  }

  function loadBadgeStateForUser(userId) {
    const scopedUserId = String(userId || "guest");
    badgeSelectionStorageKey = getProfileStorageKey(PROFILE_BADGES_STORAGE_PREFIX, scopedUserId);
    scoreStorageKey = getProfileStorageKey(PROFILE_SCORE_STORAGE_PREFIX, scopedUserId);
    selectedBadgeKeys = readStoredBadgeSelection();
    bestSudokuScore = readStoredBestScore();
  }

  function setBestSudokuScore(nextScore) {
    const numericScore = Number(nextScore);
    if (!Number.isFinite(numericScore) || numericScore < 0) return;
    const safeScore = Math.floor(numericScore);
    if (safeScore <= bestSudokuScore) return;
    bestSudokuScore = safeScore;
    writeStoredBestScore();
  }

  function renderSelectedBadges() {
    badgeSlotBtns.forEach((slot, index) => {
      const badgeKey = selectedBadgeKeys[index];
      const badge = badgeKey ? achievementBadgeMap[badgeKey] : null;
      slot.textContent = badge ? badge.icon : "";
      slot.title = badge ? badge.label : "Slot vacio";
      slot.classList.toggle("badge-selected", Boolean(badge));
    });
  }

  function normalizeAchievementName(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function mapAchievementNameToBadgeKey(name) {
    const normalized = normalizeAchievementName(name);
    if (!normalized) return null;
    if (normalized.includes("primera") && normalized.includes("partida")) return "first-game";
    if (normalized.includes("5") && normalized.includes("partida")) return "five-games";
    if (normalized.includes("10") && normalized.includes("partida")) return "ten-games";
    if (normalized.includes("500") && normalized.includes("puntaje")) return "score-over-500";
    return null;
  }

  function getUnlockedKeysByRules(partidasJugadas) {
    const gamesPlayed = Number(partidasJugadas ?? 0);
    const unlocked = [];
    if (gamesPlayed >= 1) unlocked.push("first-game");
    if (gamesPlayed >= 5) unlocked.push("five-games");
    if (gamesPlayed >= 10) unlocked.push("ten-games");
    if (bestSudokuScore > 500) unlocked.push("score-over-500");
    return unlocked;
  }

  function applyUnlockedBadges(unlockedKeys) {
    unlockedBadgeKeys = new Set(normalizeBadgeKeys(unlockedKeys));
    selectedBadgeKeys = selectedBadgeKeys.filter((key) => unlockedBadgeKeys.has(key));

    achievementBadges.forEach((badge) => {
      if (!unlockedBadgeKeys.has(badge.key)) return;
      if (selectedBadgeKeys.includes(badge.key)) return;
      if (selectedBadgeKeys.length >= badgeSlotBtns.length) return;
      selectedBadgeKeys.push(badge.key);
    });

    writeStoredBadgeSelection();
    renderSelectedBadges();
    renderBadgeOptions();
  }

  function setBadgeInSlot(slotIndex, badgeKey) {
    if (!Number.isInteger(slotIndex) || slotIndex < 0) return;
    if (!achievementBadgeMap[badgeKey] || !unlockedBadgeKeys.has(badgeKey)) return;

    const deduped = selectedBadgeKeys.filter((key) => key !== badgeKey);
    while (deduped.length <= slotIndex) deduped.push(null);
    deduped[slotIndex] = badgeKey;
    selectedBadgeKeys = deduped.filter(Boolean).slice(0, badgeSlotBtns.length);
    writeStoredBadgeSelection();
    renderSelectedBadges();
    renderBadgeOptions();
  }

  function toAchievementPopupItems(keys) {
    return normalizeBadgeKeys(keys)
      .map((key) => {
        const badge = achievementBadgeMap[key];
        if (!badge) return null;
        return {
          key: badge.key,
          icon: badge.icon,
          title: badge.label,
          description: badge.description || badge.label,
        };
      })
      .filter(Boolean);
  }

  async function syncRemoteAchievementCatalog(accessToken) {
    if (!accessToken) return;

    try {
      const catalog = await apiClient.getAchievements(accessToken);
      achievementCatalogByKey = new Map();
      if (!Array.isArray(catalog)) return;

      catalog.forEach((item) => {
        const key = mapAchievementNameToBadgeKey(item?.nombre);
        if (!key || !item?._id) return;
        achievementCatalogByKey.set(key, String(item._id));
      });
    } catch (error) {
      console.warn("No se pudo cargar el catalogo de logros:", error);
    }
  }

  async function getUnlockedKeysFromRemote(accessToken) {
    if (!accessToken) return [];

    try {
      if (achievementCatalogByKey.size === 0) {
        await syncRemoteAchievementCatalog(accessToken);
      }

      const myAchievements = await apiClient.getMyAchievements(accessToken);
      if (!Array.isArray(myAchievements)) return [];

      const byId = new Map();
      achievementCatalogByKey.forEach((logroId, key) => {
        byId.set(logroId, key);
      });

      return myAchievements
        .map((item) => byId.get(String(item?.logroId || "")))
        .filter(Boolean);
    } catch (error) {
      console.warn("No se pudieron consultar los logros del usuario:", error);
      return [];
    }
  }

  async function unlockRemoteAchievements(accessToken, unlockedKeys) {
    if (!accessToken) return;
    if (achievementCatalogByKey.size === 0) return;

    const unlockPromises = normalizeBadgeKeys(unlockedKeys)
      .map((badgeKey) => achievementCatalogByKey.get(badgeKey))
      .filter(Boolean)
      .map((logroId) =>
        apiClient.unlockAchievement(accessToken, logroId).catch((error) => {
          console.warn(`No se pudo desbloquear logro remoto ${logroId}:`, error);
        }),
      );

    await Promise.all(unlockPromises);
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
    achievementBadges.forEach((badge) => {
      const unlocked = unlockedBadgeKeys.has(badge.key);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "picker-option";
      btn.textContent = badge.icon;
      btn.title = unlocked ? badge.label : `${badge.label} (bloqueado)`;
      if (!unlocked) btn.classList.add("locked");
      if (selectedBadgeKeys.includes(badge.key)) btn.classList.add("active");

      btn.addEventListener("click", () => {
        if (!unlocked || !activeBadgeSlot) return;
        const slotIndex = Number(activeBadgeSlot.dataset.badgeSlot);
        setBadgeInSlot(slotIndex, badge.key);
        closePicker(badgeModal);
      });
      badgeOptionsEl.appendChild(btn);
    });
  }

function setProfileFrame(frameKey) {
  // Filtrar los marcos de liga según la liga actual del jugador
  const currentLeagueFrameKey = frameKey=== "frame-bronze" ? "frame-bronze" :
                               frameKey=== "frame-silver" ? "frame-silver" :
                               frameKey=== "frame-gold" ? "frame-gold" :
                               frameKey=== "frame-platinum" ? "frame-platinum" : null;

  // Asegurarse de que el marco seleccionado es el de la liga actual o cualquier otro marco desbloqueado
  const selected = frameOptions.find((frame) => frame.key === frameKey && (frame.key === currentLeagueFrameKey || isFrameUnlocked(frame))) || frameOptions[0];
  selected.key = currentLeagueFrameKey || selected.key; // Priorizar el marco de liga si es aplicable
  if (!openAvatarPickerBtn || !isFrameUnlocked(selected)) return;

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
        btn.textContent = "LOCK";
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
    isProfileAuthenticated = Boolean(isAuthenticated);

    if (!isAuthenticated) {
      serverStreak = 0;
      syncCalendarFromServerStreak();
      if (profileLevelBadgeEl) profileLevelBadgeEl.textContent = "47";
      if (profileLevelFillEl) profileLevelFillEl.style.width = "68%";
      if (profileLevelTextEl) profileLevelTextEl.textContent = "Nivel 47 · 680 / 1000 XP";
      refreshStreakUi();
      return;
    }

    const nivel = Number(user?.nivel ?? 0);
    const experiencia = Number(user?.experiencia ?? 0);
    const rachaActual = Number(user?.rachaActual ?? 0);

    serverStreak = Number.isFinite(rachaActual) ? rachaActual : 0;
    syncCalendarFromServerStreak();
    refreshStreakUi();

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
      currentUserId = null;
      streakActivityDates = [];
      loadBadgeStateForUser("guest");
      applyUnlockedBadges([]);
      achievementCatalogByKey = new Map();
      profileNameEl.textContent = DEFAULT_PROFILE_NAME;
      profileTitleEl.textContent = DEFAULT_PROFILE_TITLE;
      profileModeStats.sudoku = [...DEFAULT_PROFILE_MODE_STATS.sudoku];
      syncProfileProgress(null, false);
      renderStreakCalendar();
      renderFrameOptions();
      return;
    }

    const user = session?.user || {};
    const sessionUserId = resolveSessionUserId(session);
    loadStreakDatesForUser(sessionUserId);
    loadBadgeStateForUser(sessionUserId);
    applyUnlockedBadges(selectedBadgeKeys);
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
    renderStreakCalendar();
    renderFrameOptions();
  }

  async function loadSudokuStatsIntoProfile(accessToken) {
    if (!accessToken) return;

    try {
      const [perfil, stats] = await Promise.all([
        apiClient.getMyProfile(accessToken),
        apiClient.getMyGameStats(accessToken, GAME_ID_SUDOKU),
      ]);

      if (perfil && typeof perfil === "object") {
        syncProfileProgress(perfil, true);
      }

      if (perfil?.usuarioId && String(perfil.usuarioId) !== currentUserId) {
        loadStreakDatesForUser(perfil.usuarioId);
        loadBadgeStateForUser(perfil.usuarioId);
      }

      if (!stats || typeof stats !== "object") {
        console.warn("[stats] respuesta invalida de getMyGameStats");
        return;
      }

      // Asignación de liga según el valor de "elo"
      profileModeStats.sudoku = [
        `Partidas jugadas: ${stats.partidasJugadas ?? 0}`,
        `Elo: ${stats.elo ?? 0}`,
        stats.elo >= 0 && stats.elo <= 100 ? `Liga: Bronce` :
        stats.elo >= 101 && stats.elo <= 200 ? `Liga: Plata` :
        stats.elo >= 201 && stats.elo <= 300 ? `Liga: Oro` :
        stats.elo >= 301 && stats.elo <= 400 ? `Liga: Platino` : 
        `Liga: -`,
      ];

      const unlockedByRules = getUnlockedKeysByRules(stats.partidasJugadas);
      await syncRemoteAchievementCatalog(accessToken);
      await unlockRemoteAchievements(accessToken, unlockedByRules);
      const unlockedFromRemote = await getUnlockedKeysFromRemote(accessToken);
      applyUnlockedBadges([...unlockedByRules, ...unlockedFromRemote]);

      // Selección del marco según la liga
      if (stats.elo >= 0 && stats.elo <= 100) {
        setProfileFrame("frame-bronze"); // Bronce
      } else if (stats.elo >= 101 && stats.elo <= 200) {
        setProfileFrame("frame-silver"); // Plata
      } else if (stats.elo >= 201 && stats.elo <= 300) {
        setProfileFrame("frame-gold"); // Oro
      } else if (stats.elo >= 301 && stats.elo <= 400) {
        setProfileFrame("frame-platinum"); // Platino
      } else {
        setProfileFrame("frame-bronze"); // Valor predeterminado
      }

      renderFrameOptions();
      renderStreakCalendar();
    } catch (error) {
      console.warn("Fallo cargando stats sudoku:", error);
    }
  }

  async function registerSudokuActivity(session, accessToken, options = {}) {
    if (!accessToken) return { recorded: false, reason: "missing-token" };

    const userId = resolveSessionUserId(session);
    if (!userId) return { recorded: false, reason: "missing-user-id" };

    if (String(userId) !== currentUserId) {
      loadStreakDatesForUser(userId);
      loadBadgeStateForUser(userId);
    }

    const previousUnlocked = new Set(unlockedBadgeKeys);

    setBestSudokuScore(options.score);
    const nextUnlocked = new Set(unlockedBadgeKeys);
    if (bestSudokuScore > 500) nextUnlocked.add("score-over-500");

    try {
      const stats = await apiClient.getMyGameStats(accessToken, GAME_ID_SUDOKU);
      const unlockedByRules = getUnlockedKeysByRules(stats?.partidasJugadas);
      unlockedByRules.forEach((key) => nextUnlocked.add(key));

      await syncRemoteAchievementCatalog(accessToken);
      await unlockRemoteAchievements(accessToken, [...nextUnlocked]);

      const unlockedFromRemote = await getUnlockedKeysFromRemote(accessToken);
      unlockedFromRemote.forEach((key) => nextUnlocked.add(key));
    } catch (error) {
      console.warn("No se pudieron sincronizar logros de Sudoku:", error);
    }

    applyUnlockedBadges([...nextUnlocked]);
    const newlyUnlockedKeys = [...unlockedBadgeKeys].filter((key) => !previousUnlocked.has(key));
    const newlyUnlockedAchievements = toAchievementPopupItems(newlyUnlockedKeys);

    renderFrameOptions();

    try {
      if (!options?.gameSession?.jugadoEn) {
        throw new Error("La sesion actual no quedo persistida en SesionJuego.");
      }

      const currentSessionId = String(options?.gameSession?._id || "").trim();
      const currentPlayedAt =
        parseIsoDate(options?.gameSession?.jugadoEn) || new Date();
      const previousSession = await apiClient.getLatestGameSession(accessToken, GAME_ID_SUDOKU, {
        excludeSessionId: currentSessionId,
      });

      const previousPlayedAt = parseIsoDate(previousSession?.jugadoEn);
      const currentSessionDayKey = getSessionDayKey(options?.gameSession?.jugadoEn);
      const previousSessionDayKey = getSessionDayKey(previousSession?.jugadoEn);
      const isSameSessionDay =
        Boolean(currentSessionDayKey) &&
        Boolean(previousSessionDayKey) &&
        currentSessionDayKey === previousSessionDayKey;
      const elapsedSincePreviousSessionMs = previousPlayedAt
        ? currentPlayedAt.getTime() - previousPlayedAt.getTime()
        : null;
      const isWithinStreakWindow =
        elapsedSincePreviousSessionMs !== null &&
        elapsedSincePreviousSessionMs <= STREAK_SESSION_WINDOW_MS;
      const currentStreakValue = Number(serverStreak) || 0;
      const shouldResetStreak =
        elapsedSincePreviousSessionMs !== null &&
        !isSameSessionDay &&
        elapsedSincePreviousSessionMs > STREAK_SESSION_WINDOW_MS;
      const shouldIncreaseStreak =
        elapsedSincePreviousSessionMs === null ||
        shouldResetStreak ||
        (!isSameSessionDay && isWithinStreakWindow);
      const nextStreakValue = shouldIncreaseStreak
        ? shouldResetStreak
          ? 1
          : currentStreakValue + 1
        : currentStreakValue;

      // console.info("[streak] Evaluacion previa a actualizar racha", {
      //   userId: currentUserId,
      //   sessionActual: options?.gameSession || null,
      //   ultimaSesion: previousSession || null,
      //   rachaActual: currentStreakValue,
      //   nuevaRacha: nextStreakValue,
      //   isWithinStreakWindow,
      //   isSameSessionDay,
      //   currentSessionDayKey,
      //   previousSessionDayKey,
      //   elapsedSincePreviousSessionMs,
      //   shouldIncreaseStreak,
      //   shouldResetStreak,
      //   streakWindowHours: 28,
      // });

      if (shouldResetStreak) {
        await apiClient.resetStreak(accessToken);
      }

      let remote = Number.NaN;
      if (shouldIncreaseStreak) {
        const response = await apiClient.increaseStreak(accessToken);
        remote = Number(response?.rachaActual);
        if (Number.isFinite(remote)) serverStreak = remote;
      }

      // Confirma el valor persistido en backend para evitar UI optimista inconsistente.
      const refreshedProfile = await apiClient.getMyProfile(accessToken);
      const persisted = Number(refreshedProfile?.rachaActual);
      if (Number.isFinite(persisted)) serverStreak = persisted;

      // console.info("[streak] Resultado final tras sincronizar racha", {
      //   userId: currentUserId,
      //   sessionActual: options?.gameSession || null,
      //   ultimaSesion: previousSession || null,
      //   rachaActual: currentStreakValue,
      //   nuevaRacha: Number.isFinite(persisted)
      //     ? persisted
      //     : Number.isFinite(remote)
      //       ? remote
      //       : nextStreakValue,
      // });
    } catch (error) {
      console.warn("No se pudo aumentar la racha en backend:", {
        currentUserId,
        status: error?.status,
        payload: error?.payload,
        message: error instanceof Error ? error.message : String(error),
      });
    }

    syncCalendarFromServerStreak();
    refreshStreakUi();
    renderFrameOptions();
    return { recorded: true, newlyUnlockedAchievements };
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
    setProfileAvatar("\u2654");
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
        if (!isProfileAuthenticated) return;
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
    registerSudokuActivity,
    showModeDetail,
    syncIdentity,
  };
}
