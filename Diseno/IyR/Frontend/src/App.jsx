import { useEffect, useMemo, useRef, useState } from "react";
import {
  crearNotasVacias,
  crearPuzzle,
  darPistaAleatoria,
  estaResuelto,
  generarSolucion,
  limpiarNotasCelda,
  toggleNota,
} from "./sudoku-lib.js";
import { apiClient, authStorage } from "./api.js";
import { difficultyLevels, GAME_ID_SUDOKU, pickLocalSeedAndHuecosByLabel } from "./sudoku.js";

const THEMES = ["light", "dark"];
const THEME_KEY = "sudoku-theme";
const CURRENT_YEAR = new Date().getFullYear();
const avatarOptions = ["♔", "♕", "♖", "♗", "♘", "♙"];
const achievementBadges = [
  { key: "first-game", label: "Primera partida", icon: "🏁", description: "Completa tu primera partida de Sudoku." },
  { key: "five-games", label: "5 partidas", icon: "5️⃣", description: "Completa 5 partidas de Sudoku." },
  { key: "ten-games", label: "10 partidas", icon: "🔟", description: "Completa 10 partidas de Sudoku." },
  { key: "score-over-500", label: "Puntaje >500", icon: "🎯", description: "Alcanza un puntaje mayor a 500 en una partida." },
];
const achievementBadgeMap = Object.fromEntries(achievementBadges.map((badge) => [badge.key, badge]));
const frameOptions = ["frame-royal", "frame-arcane", "frame-neon", "frame-ember", "frame-ice", "frame-bronze", "frame-silver", "frame-gold", "frame-platinum", "frame-inferno"];
const guides = {
  sudoku: ["Cada fila debe contener numeros del 1 al 9 sin repetirse.", "Cada columna debe contener numeros del 1 al 9 sin repetirse.", "Cada subcuadro 3x3 debe contener numeros del 1 al 9 sin repetirse.", "Los numeros iniciales no pueden modificarse.", "El objetivo es completar el tablero correctamente."],
  torneos: ["Los torneos se juegan por rondas con sudokus de dificultad progresiva.", "Tu puntaje combina tiempo de resolucion y precision final.", "Puedes ver tu posicion en la clasificacion en tiempo real."],
  pvp: ["Te emparejamos con un jugador de nivel similar.", "Ambos juegan el mismo tablero al mismo tiempo.", "Gana quien complete correctamente en menor tiempo."],
};

function createSudokuState() {
  const emptySolucion = Array.from({ length: 9 }, () => Array(9).fill(0));
  const emptyPuzzleInicial = Array.from({ length: 9 }, () => Array(9).fill(0));
  const emptyTableroActual = Array.from({ length: 9 }, () => Array(9).fill(0));
  return {
    currentDifficulty: difficultyLevels[2],
    noteMode: false,
    seconds: 0,
    solucion: emptySolucion,
    puzzleInicial: emptyPuzzleInicial,
    tableroActual: emptyTableroActual,
    notas: crearNotasVacias(),
    selectedCell: null,
    seedActual: null,
    seedRecordId: null,
    hintsUsed: 0,
    roundCompleted: false,
    sudokuPaused: false,
    highlightEnabled: true,
    errorCount: 0,
  };
}

function formatTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function getHintLimit(label) {
  return { Principiante: 5, Iniciado: 4, Intermedio: 3, Avanzado: 2, Experto: 1, Profesional: 0 }[label] ?? 3;
}

function getProgress(sudoku) {
  if (!sudoku || !Array.isArray(sudoku.puzzleInicial) || !Array.isArray(sudoku.tableroActual) || !Array.isArray(sudoku.solucion)) {
    return { editable: 0, correct: 0, percentage: 0 };
  }
  let editable = 0;
  let correct = 0;
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (sudoku.puzzleInicial[r]?.[c] === 0) {
        editable += 1;
        if (sudoku.tableroActual[r]?.[c] === sudoku.solucion[r]?.[c]) correct += 1;
      }
    }
  }
  const percentage = editable === 0 ? 100 : Math.round((correct / editable) * 100);
  return { editable, correct, percentage };
}

function calculateScore(sudoku, board) {
  let solvedEditable = 0;
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (sudoku.puzzleInicial[r][c] === 0 && board[r][c] === sudoku.solucion[r][c]) solvedEditable += 1;
    }
  }
  const bonus = { Principiante: 100, Iniciado: 200, Intermedio: 300, Avanzado: 450, Experto: 600, Profesional: 800 }[sudoku.currentDifficulty.label] || 0;
  return Math.max(0, solvedEditable * 100 + bonus - sudoku.seconds * 2 - sudoku.errorCount * 50 - sudoku.hintsUsed * 100);
}

function getHighlights(sudoku) {
  const peers = new Set();
  const same = new Set();
  if (!sudoku || !sudoku.highlightEnabled || !sudoku.selectedCell) return { peers, same, noteValue: null };
  const cellRow = sudoku.selectedCell.row;
  const cellCol = sudoku.selectedCell.col;
  const value = sudoku.tableroActual?.[cellRow]?.[cellCol] || 0;
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (r === cellRow || c === cellCol) peers.add(`${r}-${c}`);
      if (value !== 0 && sudoku.tableroActual?.[r]?.[c] === value) same.add(`${r}-${c}`);
    }
  }
  return { peers, same, noteValue: value || null };
}

function getSessionUser(session) {
  return session?.user || session?.profile || null;
}

function toYmd(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function buildStreakDates(streak) {
  const dates = [];
  const cursor = new Date();
  for (let i = 0; i < Number(streak || 0); i += 1) {
    dates.push(toYmd(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return dates;
}

function App() {
  const [tab, setTab] = useState("juego");
  const [theme, setTheme] = useState("light");
  const [session, setSession] = useState(null);
  const [authView, setAuthView] = useState("login");
  const [authMessage, setAuthMessage] = useState("");
  const [authTone, setAuthTone] = useState("info");
  const [authBusy, setAuthBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [statusOk, setStatusOk] = useState(false);
  const [guideKey, setGuideKey] = useState(null);
  const [pickerType, setPickerType] = useState(null);
  const [pickerTab, setPickerTab] = useState("avatar");
  const [activeBadgeSlot, setActiveBadgeSlot] = useState(0);
  const [profileMode, setProfileMode] = useState("sudoku");
  const [profileAvatar, setProfileAvatar] = useState("♔");
  const [profileFrame, setProfileFrame] = useState("frame-royal");
  const [serverStreak, setServerStreak] = useState(0);
  const [streakMonth, setStreakMonth] = useState(new Date(CURRENT_YEAR, new Date().getMonth(), 1));
  const [streakDates, setStreakDates] = useState([]);
  const [selectedBadgeKeys, setSelectedBadgeKeys] = useState([]);
  const [unlockedBadgeKeys, setUnlockedBadgeKeys] = useState([]);
  const [bestScore, setBestScore] = useState(0);
  const [profileStats, setProfileStats] = useState({
    sudoku: ["Partidas jugadas: -", "Elo: -", "Liga: -"],
    torneos: ["Torneos jugados: 12", "Top 3 alcanzado: 5 veces", "Mejor posicion: #2", "Puntaje promedio: 1,240"],
    pvp: ["Partidas PvP: 33", "Victorias: 20 · Derrotas: 13", "Racha maxima: 6 victorias", "Precision en duelos: 90%"],
  });
  const [sudoku, setSudoku] = useState(createSudokuState);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [verifyForm, setVerifyForm] = useState({ email: "", code: "" });
  const [forgotForm, setForgotForm] = useState({ email: "" });
  const [resetForm, setResetForm] = useState({ token: "", newPassword: "", confirmPassword: "" });
  const [pauseOpen, setPauseOpen] = useState(false);
  const [completionScore, setCompletionScore] = useState(null);
  const [achievementPopup, setAchievementPopup] = useState([]);
  const timerRef = useRef(null);

  const isAuthenticated = Boolean(session?.accessToken);
  const accessToken = session?.accessToken || null;
  const profileUser = getSessionUser(session);
  const progress = useMemo(() => {
    try {
      return getProgress(sudoku);
    } catch (error) {
      console.error("getProgress error", error, sudoku);
      return { editable: 0, correct: 0, percentage: 0 };
    }
  }, [sudoku]);
  const highlights = useMemo(() => {
    try {
      return getHighlights(sudoku);
    } catch (error) {
      console.error("getHighlights error", error, sudoku);
      return { peers: new Set(), same: new Set(), noteValue: null };
    }
  }, [sudoku]);

  useEffect(() => {
    const storedTheme = localStorage.getItem(THEME_KEY) || "light";
    setTheme(THEMES.includes(storedTheme) ? storedTheme : "light");
    const stored = authStorage.getSession();
    if (stored) void restoreSession(stored);
    else resetProfileState();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!sudoku.seedActual) void loadDifficulty(sudoku.currentDifficulty.key);
  }, [sudoku.seedActual]);

  useEffect(() => {
    if (sudoku.sudokuPaused || sudoku.roundCompleted) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setSudoku((current) => ({ ...current, seconds: current.seconds + 1 }));
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [sudoku.seedActual, sudoku.sudokuPaused, sudoku.roundCompleted]);

  async function restoreSession(stored) {
    setAuthBusy(true);
    try {
      const verification = await apiClient.verifyToken(stored.accessToken);
      const profile = await apiClient.getMyProfile(stored.accessToken).catch(() => null);
      const hydrated = {
        ...stored,
        user: { ...(stored.user || {}), ...(verification?.user || {}), ...(profile || {}) },
        profile,
      };
      authStorage.setSession(hydrated);
      setSession(hydrated);
      syncProfileState(hydrated);
    } catch {
      authStorage.clearSession();
      setSession(null);
      resetProfileState();
    } finally {
      setAuthBusy(false);
    }
  }

  function setStatusMessage(message, ok = false) {
    setStatus(message);
    setStatusOk(ok);
  }

  function resetProfileState() {
    setServerStreak(0);
    setStreakDates([]);
    setSelectedBadgeKeys([]);
    setUnlockedBadgeKeys([]);
    setBestScore(0);
    setProfileFrame("frame-royal");
    setProfileStats((current) => ({ ...current, sudoku: ["Partidas jugadas: -", "Elo: -", "Liga: -"] }));
  }

  function syncProfileState(nextSession) {
    const user = getSessionUser(nextSession);
    const streak = Number(user?.rachaActual ?? 0);
    setServerStreak(streak);
    setStreakDates(buildStreakDates(streak));
  }

  async function loadDifficulty(levelKey, options = {}) {
    const found = difficultyLevels.find((item) => item.key === levelKey) || difficultyLevels[2];
    let payload = null;
    if (accessToken) {
      try {
        const remote = await apiClient.getSudokuSeed(accessToken, found.label);
        payload = { seed: Number(remote.seed), huecos: Number(remote.huecos), seedRecordId: remote.seedId || null };
      } catch {}
    }
    if (!payload) payload = { ...pickLocalSeedAndHuecosByLabel(found.label), seedRecordId: null };
    if (options.forceNewSeed && payload.seed === sudoku.seedActual) payload.seed = Math.floor(Math.random() * 1_000_000);

    const solution = generarSolucion(payload.seed);
    const puzzle = crearPuzzle(solution, payload.huecos, payload.seed);
    setSudoku({
      ...createSudokuState(),
      currentDifficulty: found,
      solucion: solution,
      puzzleInicial: puzzle,
      tableroActual: puzzle.map((row) => [...row]),
      notas: crearNotasVacias(),
      seedActual: payload.seed,
      seedRecordId: payload.seedRecordId,
    });
    setStatusMessage(`Selecciona una celda para comenzar. Limite de pistas: ${getHintLimit(found.label)}.`);
  }

  async function handleLogin(event) {
    event.preventDefault();
    setAuthBusy(true);
    try {
      const response = await apiClient.login(loginForm);
      await restoreSession({ accessToken: response.accessToken, refreshToken: response.refreshToken || "", user: response.user || { email: loginForm.email } });
      setLoginForm({ email: "", password: "" });
      setAuthMessage("Sesion iniciada correctamente.");
      setAuthTone("ok");
      setStatusMessage("Sesion iniciada correctamente.", true);
      setTab("inicio");
    } catch (error) {
      setAuthMessage(error.message || "No fue posible iniciar sesion.");
      setAuthTone("error");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    if (registerForm.password !== registerForm.confirmPassword) return setAuthMessage("Las contrasenas no coinciden.");
    setAuthBusy(true);
    try {
      const response = await apiClient.signup({ name: registerForm.name, email: registerForm.email, password: registerForm.password });
      if (response?.accessToken) {
        await restoreSession({ accessToken: response.accessToken, refreshToken: response.refreshToken || "", user: response.user || { name: registerForm.name, email: registerForm.email } });
        setTab("inicio");
      } else {
        setAuthView("verify");
        setVerifyForm({ email: registerForm.email, code: "" });
      }
      setRegisterForm({ name: "", email: "", password: "", confirmPassword: "" });
      setAuthMessage("Cuenta creada correctamente.");
      setAuthTone("ok");
    } catch (error) {
      setAuthMessage(error.message || "No fue posible crear la cuenta.");
      setAuthTone("error");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleVerify(event) {
    event.preventDefault();
    setAuthBusy(true);
    try {
      await apiClient.verifyEmail(verifyForm);
      setAuthView("login");
      setAuthMessage("Correo verificado. Ahora inicia sesion.");
      setAuthTone("ok");
    } catch (error) {
      setAuthMessage(error.message || "No fue posible verificar el correo.");
      setAuthTone("error");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleForgot(event) {
    event.preventDefault();
    setAuthBusy(true);
    try {
      await apiClient.forgotPassword(forgotForm);
      setAuthView("reset");
      setAuthMessage("Correo enviado. Revisa tu bandeja y pega el token.");
      setAuthTone("ok");
    } catch (error) {
      setAuthMessage(error.message || "No fue posible iniciar la recuperacion.");
      setAuthTone("error");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleReset(event) {
    event.preventDefault();
    setAuthBusy(true);
    try {
      await apiClient.resetPassword({ token: resetForm.token, newPassword: resetForm.newPassword });
      setResetForm({ token: "", newPassword: "", confirmPassword: "" });
      setAuthView("login");
      setAuthMessage("Contrasena actualizada. Inicia sesion con tu nueva clave.");
      setAuthTone("ok");
    } catch (error) {
      setAuthMessage(error.message || "No fue posible restablecer la contrasena.");
      setAuthTone("error");
    } finally {
      setAuthBusy(false);
    }
  }

  function handleLogoutOrOpenAuth() {
    if (!isAuthenticated) {
      setAuthView("login");
      setTab("login");
      return;
    }
    authStorage.clearSession();
    setSession(null);
    resetProfileState();
    setAuthMessage("Sesion cerrada.");
    setAuthTone("ok");
    setStatusMessage("Sesion cerrada.");
    setTab("inicio");
  }

  function requireAuthForProfile() {
    if (isAuthenticated) return true;
    setAuthView("login");
    setAuthMessage("Inicia sesion para acceder a tu perfil.");
    setAuthTone("error");
    setTab("login");
    return false;
  }

  function updateBoard(row, col, value) {
    if (sudoku.sudokuPaused || sudoku.puzzleInicial[row][col] !== 0) return;
    const board = sudoku.tableroActual.map((line) => [...line]);
    const notes = sudoku.notas.map((line) => line.map((set) => new Set(set)));
    if (value === "") {
      board[row][col] = 0;
      limpiarNotasCelda(notes, row, col);
      setSudoku((current) => ({ ...current, tableroActual: board, notas: notes }));
      return setStatusMessage("Celda borrada");
    }
    board[row][col] = Number(value);
    limpiarNotasCelda(notes, row, col);
    const isCorrect = board[row][col] === sudoku.solucion[row][col];
    setSudoku((current) => ({ ...current, tableroActual: board, notas: notes, errorCount: isCorrect ? current.errorCount : current.errorCount + 1 }));
    if (!isCorrect) return setStatusMessage(`Numero incorrecto. Errores: ${sudoku.errorCount + 1}.`);
    setStatusMessage("Movimiento aplicado");
    if (estaResuelto(board)) void finishGame(board);
  }

  function handleNote(value) {
    if (!sudoku.selectedCell) return;
    const { row, col } = sudoku.selectedCell;
    const notes = sudoku.notas.map((line) => line.map((set) => new Set(set)));
    const result = toggleNota(notes, sudoku.tableroActual, row, col, value);
    if (!result.ok) return setStatusMessage(result.mensaje || "No se pudo actualizar la nota.");
    setSudoku((current) => ({ ...current, notas: notes }));
    setStatusMessage(result.accion === "agregada" ? `Nota ${value} agregada.` : `Nota ${value} eliminada.`);
  }

  function useHint() {
    const limit = getHintLimit(sudoku.currentDifficulty.label);
    if (sudoku.hintsUsed >= limit) return;
    const board = sudoku.tableroActual.map((line) => [...line]);
    const result = darPistaAleatoria(board, sudoku.solucion);
    if (!result.ok) return setStatusMessage(result.mensaje);
    setSudoku((current) => ({ ...current, tableroActual: board, hintsUsed: current.hintsUsed + 1 }));
    if (estaResuelto(board)) void finishGame(board);
  }

  async function finishGame(board) {
    const score = calculateScore(sudoku, board);
    setSudoku((current) => ({ ...current, roundCompleted: true }));
    setStatusMessage(`Sudoku completado. Puntaje final: ${score}.`, true);
    if (accessToken) {
      try {
        await apiClient.createGameSession(accessToken, {
          juegoId: GAME_ID_SUDOKU,
          puntaje: score,
          resultado: "singlePlayer",
          cambioElo: score > 700 ? 15 : score > 400 ? 10 : 5,
          tiempo: sudoku.seconds,
          seedId: sudoku.seedRecordId || undefined,
          seed: String(sudoku.seedActual),
        });
        await apiClient.addExperience(accessToken, Math.floor(score / 4));
        await apiClient.increaseStreak(accessToken).catch(() => null);
        const stats = await apiClient.getMyGameStats(accessToken, GAME_ID_SUDOKU).catch(() => null);
        const profile = await apiClient.getMyProfile(accessToken).catch(() => null);
        setProfileStats((current) => ({
          ...current,
          sudoku: [`Partidas jugadas: ${stats?.partidasJugadas ?? 0}`, `Elo: ${stats?.elo ?? 0}`, `Liga: ${getLeague(stats?.elo ?? -1)}`],
        }));
        setServerStreak(Number(profile?.rachaActual ?? 0));
        setStreakDates(buildStreakDates(Number(profile?.rachaActual ?? 0)));
      } catch {}
    }
    const newUnlocked = unlockLocalAchievements(score);
    setCompletionScore(score);
    if (newUnlocked.length) setAchievementPopup(newUnlocked);
    window.setTimeout(() => {
      setCompletionScore(null);
      void loadDifficulty(sudoku.currentDifficulty.key, { forceNewSeed: true });
    }, 2200);
  }

  function unlockLocalAchievements(score) {
    const gamesPlayed = Number(profileStats.sudoku[0]?.split(":")[1]?.trim() || 0) + 1;
    const nextBest = Math.max(bestScore, score);
    const unlocked = [];
    if (gamesPlayed >= 1) unlocked.push("first-game");
    if (gamesPlayed >= 5) unlocked.push("five-games");
    if (gamesPlayed >= 10) unlocked.push("ten-games");
    if (nextBest > 500) unlocked.push("score-over-500");
    const merged = Array.from(new Set([...unlockedBadgeKeys, ...unlocked]));
    setUnlockedBadgeKeys(merged);
    const selected = Array.from(new Set([...selectedBadgeKeys, ...merged])).slice(0, 6);
    setSelectedBadgeKeys(selected);
    setBestScore(nextBest);
    return merged.filter((key) => !unlockedBadgeKeys.includes(key)).map((key) => achievementBadgeMap[key]);
  }

  return (
    <>
      <header className="topbar">
        <button className="logo" type="button" onClick={() => setTab("inicio")}>Cere<span>bro</span></button>
        <nav>
          {["inicio", "juego", "torneos", "pvp", "perfil"].map((key) => <button key={key} type="button" className={`nav-btn ${tab === key ? "active" : ""}`} onClick={() => key === "perfil" ? requireAuthForProfile() && setTab(key) : setTab(key)}>{key === "inicio" ? "Inicio" : key === "juego" ? "Jugar Sudoku" : key === "torneos" ? "Torneos" : key === "pvp" ? "PvP" : "Perfil"}</button>)}
        </nav>
        <div className="topbar-actions">
          <button className="btn ghost" type="button" onClick={() => setTheme(THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length])}>Tema: {theme === "light" ? "Claro" : "Oscuro"}</button>
          <button className="btn ghost" type="button" onClick={handleLogoutOrOpenAuth}>{isAuthenticated ? "Cerrar sesion" : "Iniciar sesion"}</button>
          <button className="btn ghost" type="button" onClick={() => requireAuthForProfile() && setTab("perfil")}>Mi perfil</button>
        </div>
      </header>
      <main>
        {tab === "inicio" && (
          <section id="inicio-tab">
            <article className="welcome-banner board-card">
              <p className="eyebrow">Bienvenido a Cerebro</p>
              <h1>Tu plataforma de juegos de agilidad mental</h1>
              <p className="subtitle">Aqui encontraras distintos desafios para entrenar tu mente. Explora los juegos disponibles y consulta sus reglas con el boton "Como jugar" de cada uno.</p>
            </article>
            <div className="games-list">
              <Hero eyebrow="Sudoku" title="Entrena tu mente con un Sudoku bonito y moderno" subtitle="Una experiencia limpia, amigable y rapida. Juega por niveles, guarda progreso y compite contigo mismo." primaryLabel="Jugar ahora" onPrimary={() => setTab("juego")} onGuide={() => setGuideKey("sudoku")} visual={<SignBoard />} />
              <Hero eyebrow="Torneos" title="Compite en torneos semanales de Sudoku" subtitle="Suma puntos, sube en la clasificacion y consigue recompensas por mantener constancia y precision en cada ronda." primaryLabel="Ver torneos" onPrimary={() => setTab("torneos")} onGuide={() => setGuideKey("torneos")} visual={<div className="mode-visual-inner">🏁<span>Torneos</span></div>} visualClass="torneos-card" />
              <Hero eyebrow="PvP" title="Reta a otro jugador en tiempo real" subtitle="Enfrentate a partidas uno a uno, usa pistas estrategicas y mejora tu ranking competitivo contra jugadores de tu nivel." primaryLabel="Ir a PvP" onPrimary={() => setTab("pvp")} onGuide={() => setGuideKey("pvp")} visual={<div className="mode-visual-inner">⚔️<span>PvP</span></div>} visualClass="pvp-card" />
            </div>
          </section>
        )}

        {tab === "juego" && (
          <section className="game-tab" id="juego-tab">
            <div className="game-header">
              <h2>Partida actual</h2>
              <button className="btn light" type="button" onClick={() => setTab("inicio")}>Volver al inicio</button>
            </div>
            <div className={`board-card sudoku-game-card ${sudoku.sudokuPaused ? "paused" : ""}`}>
              <div className="sudoku-top-row">
                <div className="difficulty-wrap">
                  <label htmlFor="difficulty-select">Dificultad:</label>
                  <select id="difficulty-select" className="difficulty-select" value={sudoku.currentDifficulty.key} onChange={(event) => void loadDifficulty(event.target.value, { forceNewSeed: true })}>
                    {difficultyLevels.map((level, index) => <option key={level.key} value={level.key}>{index + 1}. {level.label}</option>)}
                  </select>
                  <span className="difficulty-label">Dificultad: {sudoku.currentDifficulty.label}</span>
                </div>
                <div className="sudoku-top-right">
                  <span className="timer-display">{formatTime(sudoku.seconds)}</span>
                  <span className="stat-chip">Errores: {sudoku.errorCount}</span>
                  <span className="stat-chip">Pistas: {sudoku.hintsUsed}</span>
                  <button className="btn ghost btn-pause" type="button" onClick={() => { setSudoku((current) => ({ ...current, sudokuPaused: !current.sudokuPaused })); setPauseOpen((current) => !current); }}>{sudoku.sudokuPaused ? "Reanudar" : "Pausar"}</button>
                  <button className="btn primary btn-new-game" type="button" onClick={() => void loadDifficulty(sudoku.currentDifficulty.key, { forceNewSeed: true })}>Nuevo Juego</button>
                </div>
              </div>
              <div className="sudoku-main">
                <div className="sudoku-grid-wrap">
                  <div className="board">
                    {sudoku.tableroActual.map((row, rowIndex) => row.map((value, colIndex) => {
                      const notes = Array.from(sudoku.notas[rowIndex][colIndex] || []);
                      const selected = sudoku.selectedCell?.row === rowIndex && sudoku.selectedCell?.col === colIndex;
                      const fixed = sudoku.puzzleInicial[rowIndex][colIndex] !== 0;
                      const isCorrect = value === 0 || value === sudoku.solucion[rowIndex][colIndex];
                      const className = ["cell", selected ? "selected" : "", fixed ? "prefilled" : "", !fixed && value !== 0 && !isCorrect ? "error" : "", (colIndex + 1) % 3 === 0 && colIndex !== 8 ? "block-right" : "", (rowIndex + 1) % 3 === 0 && rowIndex !== 8 ? "block-bottom" : "", highlights.peers.has(`${rowIndex}-${colIndex}`) ? "highlight-peer" : "", highlights.same.has(`${rowIndex}-${colIndex}`) ? "highlight-same" : "", notes.length ? "has-notes" : ""].filter(Boolean).join(" ");
                      return (
                        <button key={`${rowIndex}-${colIndex}`} type="button" className={className} onClick={() => setSudoku((current) => ({ ...current, selectedCell: { row: rowIndex, col: colIndex } }))}>
                          {value !== 0 ? value : notes.length ? <div className="notes-grid">{Array.from({ length: 9 }).map((_, idx) => <div key={idx} className={`note ${highlights.noteValue === idx + 1 ? "highlight-same-note" : ""}`}>{notes.includes(idx + 1) ? idx + 1 : ""}</div>)}</div> : ""}
                        </button>
                      );
                    }))}
                  </div>
                </div>
                <div className="sudoku-controls">
                  <div className="keypad-nums">
                    {Array.from({ length: 9 }).map((_, index) => <button key={index} type="button" className="chip number" onClick={() => sudoku.noteMode ? handleNote(index + 1) : sudoku.selectedCell && updateBoard(sudoku.selectedCell.row, sudoku.selectedCell.col, index + 1)}>{index + 1}</button>)}
                  </div>
                  <div className="board-actions controls icon-actions">
                    <button className="btn-control btn-icon-circle" type="button" onClick={() => sudoku.selectedCell && updateBoard(sudoku.selectedCell.row, sudoku.selectedCell.col, "")}>Borrar</button>
                    <button className={`btn-control btn-icon-circle ${sudoku.noteMode ? "active" : ""}`} type="button" onClick={() => setSudoku((current) => ({ ...current, noteMode: !current.noteMode }))}><span className="btn-icon-badge notes-badge">{sudoku.noteMode ? "ON" : "OFF"}</span>Notas</button>
                    <button className="btn-control btn-icon-circle" type="button" onClick={useHint} disabled={getHintLimit(sudoku.currentDifficulty.label) <= sudoku.hintsUsed}><span className="btn-icon-badge hint-badge">{sudoku.hintsUsed}</span>Pista</button>
                  </div>
                  <div className="board-actions controls notes-actions">
                    <button className={`btn-control ${sudoku.highlightEnabled ? "active" : ""}`} type="button" onClick={() => setSudoku((current) => ({ ...current, highlightEnabled: !current.highlightEnabled }))}>Resaltar: {sudoku.highlightEnabled ? "ON" : "OFF"}</button>
                  </div>
                </div>
              </div>
              <div className="sudoku-bottom">
                <div className="progress-wrapper">
                  <div className="progress-track"><div className="progress-fill" style={{ width: `${progress.percentage}%` }} /></div>
                  <p className="progress-text">{progress.correct}/{progress.editable} celdas correctas ({progress.percentage}%)</p>
                </div>
                <p className={`status ${statusOk ? "ok" : ""}`}>{status}</p>
              </div>
            </div>
          </section>
        )}

        {tab === "torneos" && <ModeSection title="Torneos de Sudoku" heading="Copa Mente Rapida" eyebrow="Temporada activa" subtitle="Participa en partidas contrarreloj y sube en la tabla global." items={["Formato: 5 rondas · 1 sudoku por ronda.", "Puntaje: tiempo + precision en cada tablero.", "Premios: insignias, marcos y XP extra."]} buttonLabel="Unirme al proximo torneo" onBack={() => setTab("inicio")} />}
        {tab === "pvp" && <ModeSection title="Modo PvP" heading="Reta a otro jugador" eyebrow="1 vs 1" subtitle="Ambos resuelven el mismo sudoku. Gana quien termine primero con mejor precision." items={["Emparejamiento por nivel.", "Chat rapido con mensajes predefinidos.", "Modo revancha al finalizar la partida."]} buttonLabel="Buscar rival" onBack={() => setTab("inicio")} />}
        {tab === "perfil" && (
          <section className="profile-tab" id="perfil-tab">
            <div className="game-header">
              <h2>Perfil de usuario</h2>
              <button className="btn light" type="button" onClick={() => setTab("inicio")}>Volver al inicio</button>
            </div>
            <div className="board-card profile-card lol-profile">
              <div className="summoner-header">
                <button className={`avatar-frame ${profileFrame}`} type="button" onClick={() => { setPickerType("avatar"); setPickerTab("avatar"); }}>
                  <div className="avatar-inner">{profileAvatar}</div>
                  <span className="level-badge">{Number(profileUser?.nivel ?? 47)}</span>
                </button>
                <div className="summoner-meta">
                  <p className="eyebrow">Cuenta activa</p>
                  <h3>{profileUser?.name || (profileUser?.email ? String(profileUser.email).split("@")[0] : "Invitado#0001")}</h3>
                  <p className="profile-title">{profileUser?.tituloActivoTexto ? `Titulo: ${profileUser.tituloActivoTexto}` : profileUser?.email ? `Correo: ${profileUser.email}` : 'Titulo: "El dios de los numeros"'}</p>
                  <button type="button" className="streak-chip" onClick={() => setPickerType("streak")}>🔥<span>{serverStreak}</span></button>
                  <div className="profile-level-wrap">
                    <div className="level-track"><div className="level-fill" style={{ width: "68%" }} /></div>
                    <p className="level-text">Nivel {Number(profileUser?.nivel ?? 47)} · {Number(profileUser?.experiencia ?? 680)} / 1000 XP</p>
                  </div>
                </div>
              </div>
              <div className="badges-panel">
                <h4 className="badges-title">Badges</h4>
                <p className="badge-help">Selecciona un circulo para elegir una insignia.</p>
                <div className="badges-grid">
                  {Array.from({ length: 6 }).map((_, index) => <button key={index} type="button" className={`badge-slot ${selectedBadgeKeys[index] ? "badge-selected" : ""}`} onClick={() => { setActiveBadgeSlot(index); setPickerType("badge"); }}>{achievementBadgeMap[selectedBadgeKeys[index]]?.icon || ""}</button>)}
                </div>
              </div>
              <div className="profile-grid mode-grid-selector">
                {["sudoku", "torneos", "pvp"].map((mode) => <button key={mode} type="button" className={`mode-card ${profileMode === mode ? "active" : ""}`} onClick={() => setProfileMode(mode)}><h4>{mode === "sudoku" ? "Sudoku" : mode === "torneos" ? "Torneos" : "PvP"}</h4></button>)}
              </div>
              <article className="mode-detail">
                <h4>Estadisticas · {profileMode === "sudoku" ? "Sudoku" : profileMode === "torneos" ? "Torneos" : "PvP"}</h4>
                <ul>{profileStats[profileMode].map((line) => <li key={line}>{line}</li>)}</ul>
              </article>
            </div>
          </section>
        )}

        {tab === "login" && (
          <section className="game-tab" id="login-tab">
            <div className="game-header">
              <h2>Iniciar sesion</h2>
              <button className="btn light" type="button" onClick={() => setTab("inicio")}>Volver al inicio</button>
            </div>
            <div className="board-card auth-card auth-tab-card">
              <div className="auth-switch">
                <button type="button" className={`nav-btn ${authView === "login" ? "active" : ""}`} onClick={() => setAuthView("login")}>Iniciar sesion</button>
                <button type="button" className={`nav-btn ${authView === "register" ? "active" : ""}`} onClick={() => setAuthView("register")}>Crear cuenta</button>
              </div>
              <p className={`auth-message ${authTone === "ok" ? "ok" : authTone === "error" ? "error" : ""}`}>{authMessage}</p>
              {authView === "login" && <LoginForm value={loginForm} onChange={setLoginForm} onSubmit={handleLogin} onRegister={() => setAuthView("register")} onForgot={() => { setForgotForm({ email: loginForm.email }); setAuthView("forgot"); }} onVerify={() => { setVerifyForm({ email: loginForm.email, code: "" }); setAuthView("verify"); }} disabled={authBusy} />}
              {authView === "register" && <RegisterForm value={registerForm} onChange={setRegisterForm} onSubmit={handleRegister} disabled={authBusy} />}
              {authView === "verify" && <VerifyForm value={verifyForm} onChange={setVerifyForm} onSubmit={handleVerify} disabled={authBusy} />}
              {authView === "forgot" && <ForgotForm value={forgotForm} onChange={setForgotForm} onSubmit={handleForgot} disabled={authBusy} />}
              {authView === "reset" && <ResetForm value={resetForm} onChange={setResetForm} onSubmit={handleReset} disabled={authBusy} />}
            </div>
          </section>
        )}
      </main>
      <footer className="app-footer">
        <div className="app-footer-inner">
          <span>Cerebro</span><span className="footer-sep">·</span><span>Universidad del Norte</span><span className="footer-sep">·</span><a href="https://github.com/openlabun/Cerebro.git" target="_blank" rel="noreferrer">GitHub</a>
        </div>
      </footer>
      {guideKey && <GuideModal guideKey={guideKey} onClose={() => setGuideKey(null)} />}
      {pickerType === "avatar" && <PickerModal title="Personaliza perfil" onClose={() => setPickerType(null)}><div className="picker-switch"><button type="button" className={`picker-tab ${pickerTab === "avatar" ? "active" : ""}`} onClick={() => setPickerTab("avatar")}>Foto</button><button type="button" className={`picker-tab ${pickerTab === "frame" ? "active" : ""}`} onClick={() => setPickerTab("frame")}>Marco</button></div>{pickerTab === "avatar" ? <div className="picker-options">{avatarOptions.map((symbol) => <button key={symbol} type="button" className="picker-option" onClick={() => { setProfileAvatar(symbol); setPickerType(null); }}>{symbol}</button>)}</div> : <div className="picker-options">{frameOptions.map((frame) => <button key={frame} type="button" className={`picker-option frame-option ${frame} ${profileFrame === frame ? "active" : ""}`} onClick={() => { setProfileFrame(frame); setPickerType(null); }}>{frame === "frame-inferno" && serverStreak < 11 ? "LOCK" : ""}</button>)}</div>}</PickerModal>}
      {pickerType === "badge" && <PickerModal title="Elige insignia" onClose={() => setPickerType(null)}><div className="picker-options">{achievementBadges.map((badge) => <button key={badge.key} type="button" className={`picker-option ${selectedBadgeKeys.includes(badge.key) ? "active" : ""} ${!unlockedBadgeKeys.includes(badge.key) ? "locked" : ""}`} disabled={!unlockedBadgeKeys.includes(badge.key)} onClick={() => { const next = [...selectedBadgeKeys]; next[activeBadgeSlot] = badge.key; setSelectedBadgeKeys(next.filter(Boolean).slice(0, 6)); setPickerType(null); }}>{badge.icon}</button>)}</div></PickerModal>}
      {pickerType === "streak" && <PickerModal title="Racha de juego" onClose={() => setPickerType(null)}><p className="badge-help">Dias resaltados = dias con actividad de racha en este año.</p><div className="calendar-toolbar"><button type="button" className="chip" onClick={() => setStreakMonth((current) => new Date(CURRENT_YEAR, Math.max(0, current.getMonth() - 1), 1))}>◀</button><strong>{streakMonth.toLocaleDateString("es-CO", { month: "long", year: "numeric" })}</strong><button type="button" className="chip" onClick={() => setStreakMonth((current) => new Date(CURRENT_YEAR, Math.min(11, current.getMonth() + 1), 1))}>▶</button></div><div className="calendar-weekdays"><span>L</span><span>M</span><span>X</span><span>J</span><span>V</span><span>S</span><span>D</span></div><div className="streak-calendar">{renderCalendar(streakMonth, streakDates)}</div></PickerModal>}
      {pauseOpen && sudoku.sudokuPaused && <div id="sudoku-pause-popup" className="sudoku-pause-overlay"><div className="sudoku-pause-card"><h3 className="sudoku-pause-title">Juego en pausa</h3><p className="sudoku-pause-text">El tiempo esta detenido. Presiona reanudar para continuar.</p><button type="button" className="btn primary sudoku-pause-resume-btn" onClick={() => { setSudoku((current) => ({ ...current, sudokuPaused: false })); setPauseOpen(false); }}>Reanudar</button></div></div>}
      {completionScore !== null && <Popup title="Sudoku completado" body={`Puntaje: ${completionScore}. Reiniciando tablero...`} onClose={() => setCompletionScore(null)} />}
      {achievementPopup.length > 0 && <AchievementPopup items={achievementPopup} onClose={() => setAchievementPopup([])} />}
    </>
  );
}

function Hero({ eyebrow, title, subtitle, primaryLabel, onPrimary, onGuide, visual, visualClass = "" }) {
  return <section className="hero"><div className="hero-text"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p className="subtitle">{subtitle}</p><div className="hero-actions"><button className="btn primary" type="button" onClick={onPrimary}>{primaryLabel}</button><button className="btn light" type="button" onClick={onGuide}>Como jugar</button></div></div><div className={`board-card compact ${visualClass ? `mode-visual-card ${visualClass}` : ""}`}>{visual}</div></section>;
}

function SignBoard() {
  const letters = ["S", "U", "", "D", "O", "K", "", "U", ""];
  return <div className="board sign-board">{Array.from({ length: 81 }).map((_, index) => {
    const row = Math.floor(index / 9);
    const col = index % 9;
    const center = row % 3 === 1 && col % 3 === 1;
    const blockIndex = Math.floor(row / 3) * 3 + Math.floor(col / 3);
    return <div key={index} className={["sign-cell", (col + 1) % 3 === 0 && col !== 8 ? "block-right" : "", (row + 1) % 3 === 0 && row !== 8 ? "block-bottom" : ""].filter(Boolean).join(" ")}>{center ? letters[blockIndex] : ""}</div>;
  })}</div>;
}

function ModeSection({ title, eyebrow, heading, subtitle, items, buttonLabel, onBack }) {
  return <section className="game-tab"><div className="game-header"><h2>{title}</h2><button className="btn light" type="button" onClick={onBack}>Volver al inicio</button></div><div className="board-card mode-view-card"><p className="eyebrow">{eyebrow}</p><h3>{heading}</h3><p className="subtitle">{subtitle}</p><ul className="mode-view-list">{items.map((item) => <li key={item}>{item}</li>)}</ul><button className="btn primary" type="button">{buttonLabel}</button></div></section>;
}

function PickerModal({ title, children, onClose }) {
  return <div className="picker-modal" aria-hidden="false"><div className="picker-backdrop" onClick={onClose} /><div className="picker-card" role="dialog" aria-modal="true"><button type="button" className="picker-x" onClick={onClose}>✖</button><h3>{title}</h3>{children}</div></div>;
}

function GuideModal({ guideKey, onClose }) {
  const items = guides[guideKey] || guides.sudoku;
  const title = guideKey === "torneos" ? "Como jugar Torneos" : guideKey === "pvp" ? "Como jugar PvP" : "Como jugar Sudoku";
  return <div className="guide-modal" aria-hidden="false"><div className="guide-modal-backdrop" onClick={onClose} /><div className="guide-modal-card" role="dialog" aria-modal="true"><button type="button" className="guide-modal-x" onClick={onClose}>✖</button><h2>{title}</h2><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></div></div>;
}

function Popup({ title, body }) {
  return <div style={overlayStyle}><div style={popupStyle}><h3 style={{ margin: "0 0 .35rem" }}>{title}</h3><p style={{ margin: 0 }}>{body}</p></div></div>;
}

function AchievementPopup({ items, onClose }) {
  return <div style={overlayStyle}><div style={popupStyle}><h3 style={{ margin: "0 0 .65rem", textAlign: "center" }}>{items.length === 1 ? "Logro desbloqueado" : "Logros desbloqueados"}</h3><div style={{ display: "grid", gap: ".55rem", marginBottom: ".95rem" }}>{items.map((item) => <div key={item.key} style={{ display: "flex", gap: ".55rem", alignItems: "flex-start" }}><span style={{ fontSize: "1.25rem", lineHeight: "1.2" }}>{item.icon}</span><div><div style={{ fontWeight: 700, fontSize: ".95rem" }}>{item.label}</div><div style={{ fontSize: ".86rem", opacity: .9 }}>{item.description}</div></div></div>)}</div><button type="button" className="btn primary" onClick={onClose}>Aceptar</button></div></div>;
}

function LoginForm({ value, onChange, onSubmit, onRegister, onForgot, onVerify, disabled }) {
  return <form className="auth-form" onSubmit={onSubmit}><label htmlFor="login-email">Correo</label><input id="login-email" type="email" required value={value.email} onChange={(event) => onChange({ ...value, email: event.target.value })} /><label htmlFor="login-password">Contrasena</label><input id="login-password" type="password" required value={value.password} onChange={(event) => onChange({ ...value, password: event.target.value })} /><button type="submit" className="btn primary" disabled={disabled}>Entrar</button><p className="auth-helper">¿No tienes cuenta? <button type="button" className="link-btn" onClick={onRegister}>Crear cuenta</button> ¿Olvidaste tu contrasena? <button type="button" className="link-btn" onClick={onForgot}>Recuperarla</button> ¿Tienes codigo? <button type="button" className="link-btn" onClick={onVerify}>Verificar cuenta</button></p></form>;
}

function RegisterForm({ value, onChange, onSubmit, disabled }) {
  return <form className="auth-form" onSubmit={onSubmit}><label htmlFor="register-name">Nombre de usuario</label><input id="register-name" type="text" required value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} /><label htmlFor="register-email">Correo</label><input id="register-email" type="email" required value={value.email} onChange={(event) => onChange({ ...value, email: event.target.value })} /><label htmlFor="register-password">Contrasena</label><input id="register-password" type="password" required value={value.password} onChange={(event) => onChange({ ...value, password: event.target.value })} /><label htmlFor="register-password-confirm">Confirmar contrasena</label><input id="register-password-confirm" type="password" required value={value.confirmPassword} onChange={(event) => onChange({ ...value, confirmPassword: event.target.value })} /><button type="submit" className="btn primary" disabled={disabled}>Crear cuenta</button></form>;
}

function VerifyForm({ value, onChange, onSubmit, disabled }) {
  return <form className="auth-form" onSubmit={onSubmit}><label htmlFor="verify-email">Correo registrado</label><input id="verify-email" type="email" required value={value.email} onChange={(event) => onChange({ ...value, email: event.target.value })} /><label htmlFor="verify-code">Codigo de verificacion</label><input id="verify-code" type="text" required value={value.code} onChange={(event) => onChange({ ...value, code: event.target.value })} /><button type="submit" className="btn primary" disabled={disabled}>Verificar cuenta</button></form>;
}

function ForgotForm({ value, onChange, onSubmit, disabled }) {
  return <form className="auth-form" onSubmit={onSubmit}><label htmlFor="forgot-email">Correo registrado</label><input id="forgot-email" type="email" required value={value.email} onChange={(event) => onChange({ email: event.target.value })} /><button type="submit" className="btn primary" disabled={disabled}>Enviar correo de recuperacion</button></form>;
}

function ResetForm({ value, onChange, onSubmit, disabled }) {
  return <form className="auth-form" onSubmit={onSubmit}><label htmlFor="reset-token">Token de recuperacion</label><input id="reset-token" type="text" required value={value.token} onChange={(event) => onChange({ ...value, token: event.target.value })} /><label htmlFor="reset-password">Nueva contrasena</label><input id="reset-password" type="password" required value={value.newPassword} onChange={(event) => onChange({ ...value, newPassword: event.target.value })} /><label htmlFor="reset-password-confirm">Confirmar nueva contrasena</label><input id="reset-password-confirm" type="password" required value={value.confirmPassword} onChange={(event) => onChange({ ...value, confirmPassword: event.target.value })} /><button type="submit" className="btn primary" disabled={disabled}>Restablecer contrasena</button></form>;
}

function getLeague(elo) {
  if (elo >= 0 && elo <= 100) return "Bronce";
  if (elo <= 200) return "Plata";
  if (elo <= 300) return "Oro";
  if (elo <= 400) return "Platino";
  return "-";
}

function renderCalendar(monthDate, streakDates) {
  const month = monthDate.getMonth();
  const year = monthDate.getFullYear();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const offset = (firstDay.getDay() + 6) % 7;
  const activity = new Set(streakDates);
  const cells = [];
  for (let i = 0; i < offset; i += 1) cells.push(<div key={`e-${i}`} className="calendar-day empty" />);
  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(year, month, day);
    cells.push(<div key={day} className={`calendar-day ${activity.has(toYmd(date)) ? "active" : ""}`}>{day}</div>);
  }
  return cells;
}

const overlayStyle = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", display: "grid", placeItems: "center", zIndex: 9999 };
const popupStyle = { width: "min(92vw, 420px)", padding: "1.1rem 1rem", borderRadius: "14px", background: "#111827", color: "#f9fafb", textAlign: "center", boxShadow: "0 10px 35px rgba(0,0,0,0.35)" };

export default App;
