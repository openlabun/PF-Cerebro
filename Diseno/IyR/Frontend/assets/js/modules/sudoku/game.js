import {
  generarSolucion,
  crearPuzzle,
  estaResuelto,
  darPistaAleatoria,
  crearNotasVacias,
  limpiarNotasCelda,
  esMovimientoValido,
  toggleNota,
} from "https://esm.sh/@uninorte/cerebro-sudoku@1.1.0";
import {
  createSudokuState,
  difficultyLevels,
  pickSeedAndHuecosByLabel,
  GAME_ID_SUDOKU,
} from "./state.js";
import {
  setSudokuPausedUi,
  syncNoteModeUi,
  syncHighlightsUi,
  clearSelectionHighlights,
  applySelectionHighlights,
  showSudokuPausePopup,
  hideSudokuPausePopup,
  setStatus,
  updateProgress,
  syncSudokuStatsUi,
  showSudokuCompletionPopup,
  createSignBoard,
  createKeypad,
  initializeDifficultyOptions,
  closeGuideModal,
  openGuide,
} from "./ui.js";

export function createSudokuModule({ apiClient, authStorage, getAccessToken }) {
  const boardEl = document.getElementById("board");
  const signBoardEl = document.getElementById("sign-board");
  const keypadEl = document.getElementById("keypad");
  const timerEl = document.getElementById("timer");
  const statusEl = document.getElementById("status");
  const hintBtn = document.getElementById("hint");
  const clearBtn = document.getElementById("clear-cell");
  const difficultySelect = document.getElementById("difficulty-select");
  const difficultyLabel = document.getElementById("difficulty-label");
  const newGameBtn = document.getElementById("new-game-btn");
  const pauseBtn = document.getElementById("pause-btn");
  const toggleNotesBtn = document.getElementById("toggle-notes");
  const toggleHighlightsBtn = document.getElementById("toggle-highlights");
  const errorsCountEl = document.getElementById("errors-count");
  const hintsUsedEl = document.getElementById("hints-used");
  const progressFill = document.getElementById("progress-fill");
  const progressText = document.getElementById("progress-text");
  const juegoTab = document.getElementById("juego-tab");

  const openGuideBtns = document.querySelectorAll(".open-guide");
  const guideModal = document.getElementById("guide-modal");
  const guideModalClose = document.getElementById("guide-modal-close");
  const guideModalX = document.getElementById("guide-modal-x");
  const guideModalTitle = document.getElementById("guide-modal-title");
  const guideModalList = document.getElementById("guide-modal-list");

  const state = createSudokuState();

  function setSudokuStatus(message, ok = false) {
    setStatus(statusEl, message, ok);
  }

  function applyCurrentHighlights() {
    applySelectionHighlights(
      boardEl,
      state.selectedCell,
      state.tableroActual,
      state.highlightEnabled,
    );
  }

  function syncModeButtons() {
    syncNoteModeUi(toggleNotesBtn, state.noteMode);
    syncHighlightsUi(toggleHighlightsBtn, state.highlightEnabled);
    syncSudokuStatsUi(errorsCountEl, hintsUsedEl, state.errorCount, state.hintsUsed);
  }

  function refreshProgress() {
    updateProgress(
      progressFill,
      progressText,
      state.puzzleInicial,
      state.tableroActual,
      state.solucion,
    );
  }

  function startTimer(reset = false) {
    if (state.timerInterval) clearInterval(state.timerInterval);
    if (reset) state.seconds = 0;

    state.timerInterval = setInterval(() => {
      state.seconds += 1;
      const mm = String(Math.floor(state.seconds / 60)).padStart(2, "0");
      const ss = String(state.seconds % 60).padStart(2, "0");
      if (timerEl) timerEl.textContent = `${mm}:${ss}`;
    }, 1000);
  }

  function pauseSudoku() {
    if (state.sudokuPaused) return;
    state.sudokuPaused = true;
    if (state.timerInterval) clearInterval(state.timerInterval);
    setSudokuPausedUi(pauseBtn, true);
    showSudokuPausePopup(() => resumeSudoku());
  }

  function resumeSudoku() {
    if (!state.sudokuPaused) return;
    state.sudokuPaused = false;
    hideSudokuPausePopup();
    setSudokuPausedUi(pauseBtn, false);
    startTimer(false);
  }

  function setNoteMode(on) {
    state.noteMode = !!on;
    syncNoteModeUi(toggleNotesBtn, state.noteMode);
    setSudokuStatus(
      state.noteMode
        ? "Modo notas: ACTIVADO (N para desactivar)"
        : "Modo notas: desactivado",
    );
  }

  function getCorrectCountsByNumber() {
    const counts = Array(10).fill(0);
    if (!state.tableroActual?.length || !state.solucion?.length) return counts;

    for (let r = 0; r < 9; r += 1) {
      for (let c = 0; c < 9; c += 1) {
        const v = state.tableroActual[r][c];
        if (v !== 0 && v === state.solucion[r][c]) counts[v] += 1;
      }
    }
    return counts;
  }

  function updateKeypadAvailability() {
    if (!keypadEl) return;
    const counts = getCorrectCountsByNumber();

    keypadEl.querySelectorAll("button.chip.number").forEach((btn) => {
      const n = Number(btn.dataset.num || btn.textContent || 0);
      const complete = n >= 1 && n <= 9 ? counts[n] >= 9 : false;
      btn.disabled = complete;
      btn.classList.toggle("num-unavailable", complete);
      btn.setAttribute("aria-disabled", complete ? "true" : "false");
    });
  }

  function renderCellContent(cellEl, r, c) {
    const isPrefilled = state.puzzleInicial[r][c] !== 0;
    const value = state.tableroActual[r][c];

    cellEl.classList.remove("has-notes");
    cellEl.innerHTML = "";

    if (isPrefilled) {
      cellEl.textContent = String(value);
      cellEl.classList.add("prefilled");
      return;
    }

    if (value !== 0) {
      cellEl.textContent = String(value);
      return;
    }

    const cellNotes = state.notas?.[r]?.[c];
    if (!cellNotes || cellNotes.size === 0) return;

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

  function createBoard() {
    if (!boardEl) return;
    boardEl.innerHTML = "";
    state.selectedCell = null;
    clearSelectionHighlights(boardEl);

    for (let r = 0; r < 9; r += 1) {
      for (let c = 0; c < 9; c += 1) {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "cell";
        cell.dataset.row = r;
        cell.dataset.col = c;

        const isPrefilled = state.puzzleInicial[r][c] !== 0;
        cell.dataset.prefilled = isPrefilled ? "true" : "false";

        if ((c + 1) % 3 === 0 && c !== 8) cell.classList.add("block-right");
        if ((r + 1) % 3 === 0 && r !== 8) cell.classList.add("block-bottom");

        renderCellContent(cell, r, c);

        if (!isPrefilled) {
          const value = state.tableroActual[r][c];
          if (value !== 0) {
            const valido = esMovimientoValido(state.tableroActual, r, c, value);
            cell.classList.toggle("error", !valido);
          }
        }

        cell.addEventListener("click", () => {
          if (state.selectedCell) state.selectedCell.classList.remove("selected");
          state.selectedCell = cell;
          cell.classList.add("selected");
          applyCurrentHighlights();
        });

        boardEl.appendChild(cell);
      }
    }
  }

  function calculateSudokuScore() {
    const TIME_PENALTY_PER_SECOND = 2;
    const HINT_PENALTY = 75;
    const penalty = state.seconds * TIME_PENALTY_PER_SECOND + state.hintsUsed * HINT_PENALTY;
    return Math.max(0, 1000 - penalty);
  }

  async function finishSudokuWithScore() {
    if (state.roundCompleted) return;
    state.roundCompleted = true;

    const score = calculateSudokuScore();
    setSudokuStatus(
      `Sudoku completado. Puntaje final: ${score} (tiempo: ${state.seconds}s, pistas: ${state.hintsUsed}).`,
      true,
    );

    if (state.timerInterval) clearInterval(state.timerInterval);

    try {
      const accessToken = getAccessToken?.() || authStorage.getAccessToken();
      if (accessToken) {
        await apiClient.createGameSession(accessToken, {
          juegoId: GAME_ID_SUDOKU,
          puntaje: score,
          resultado: "victoria",
          cambioElo: score > 700 ? 15 : score > 400 ? 10 : 5,
        });
        await apiClient.addExperience(accessToken, Math.floor(score / 4));
      }
    } catch (error) {
      console.error("No se pudo registrar la partida:", error);
    }

    showSudokuCompletionPopup(score, () => loadDifficulty(state.currentDifficulty.key));
  }

  function fillSelected(value) {
    if (state.sudokuPaused) return;
    if (!state.selectedCell) return;

    const row = Number(state.selectedCell.dataset.row);
    const col = Number(state.selectedCell.dataset.col);
    const previousValue = state.tableroActual?.[row]?.[col] ?? 0;

    if (state.puzzleInicial[row][col] !== 0) {
      setSudokuStatus("No puedes modificar una celda fija.");
      return;
    }

    const num = value === "" ? 0 : Number(value);

    if (num === 0) {
      state.tableroActual[row][col] = 0;
      limpiarNotasCelda(state.notas, row, col);
      state.selectedCell.textContent = "";
      state.selectedCell.classList.remove("error");
      setSudokuStatus("Celda borrada");
      refreshProgress();
      updateKeypadAvailability();
      applyCurrentHighlights();
      return;
    }

    if (num < 1 || num > 9 || Number.isNaN(num)) {
      setSudokuStatus("Numero invalido (1-9)");
      return;
    }

    state.tableroActual[row][col] = num;
    limpiarNotasCelda(state.notas, row, col);
    state.selectedCell.textContent = String(num);

    if (
      previousValue !== num &&
      state.solucion?.[row]?.[col] &&
      num !== state.solucion[row][col]
    ) {
      state.errorCount += 1;
      syncSudokuStatsUi(errorsCountEl, hintsUsedEl, state.errorCount, state.hintsUsed);
      setSudokuStatus(`Numero incorrecto. Errores: ${state.errorCount}.`);
    }

    const valido = esMovimientoValido(state.tableroActual, row, col, num);
    state.selectedCell.classList.toggle("error", !valido);
    refreshProgress();

    if (!valido) {
      setSudokuStatus("Movimiento viola reglas del Sudoku");
      applyCurrentHighlights();
      return;
    }

    if (estaResuelto(state.tableroActual)) {
      finishSudokuWithScore();
      return;
    }

    setSudokuStatus("Movimiento aplicado");
    updateKeypadAvailability();
    applyCurrentHighlights();
  }

  function handleNoteInput(num) {
    if (!state.selectedCell) return;

    const row = Number(state.selectedCell.dataset.row);
    const col = Number(state.selectedCell.dataset.col);

    if (state.puzzleInicial[row][col] !== 0) {
      setSudokuStatus("No puedes poner notas en una celda fija.");
      return;
    }

    const res = toggleNota(state.notas, state.tableroActual, row, col, num);
    if (!res.ok) {
      setSudokuStatus(res.mensaje || "No se pudo actualizar la nota.");
      return;
    }

    renderCellContent(state.selectedCell, row, col);
    setSudokuStatus(
      res.accion === "agregada" ? `Nota ${num} agregada.` : `Nota ${num} eliminada.`,
    );
  }

  function buildSudokuBoard(seed, huecos) {
    state.sudokuPaused = false;
    hideSudokuPausePopup();
    setSudokuPausedUi(pauseBtn, false);
    state.noteMode = false;
    state.highlightEnabled = true;
    state.errorCount = 0;
    state.hintsUsed = 0;
    syncModeButtons();

    state.seedActual = seed;
    state.huecosActual = Number.isInteger(huecos) ? huecos : 40;
    state.solucion = generarSolucion(state.seedActual);
    state.puzzleInicial = crearPuzzle(state.solucion, state.huecosActual, state.seedActual);
    state.tableroActual = state.puzzleInicial.map((row) => [...row]);
    state.notas = crearNotasVacias();

    createBoard();
    state.roundCompleted = false;
    setSudokuStatus("Selecciona una celda para comenzar. Puntaje inicial: 1000.");
    refreshProgress();
    updateKeypadAvailability();
    startTimer(true);
  }

  function loadDifficulty(levelKey) {
    const found = difficultyLevels.find((d) => d.key === levelKey) || difficultyLevels[2];
    state.currentDifficulty = found;
    if (difficultyLabel) difficultyLabel.textContent = `Dificultad: ${found.label}`;
    const { seed, huecos } = pickSeedAndHuecosByLabel(found.label);
    buildSudokuBoard(seed, huecos);
  }

  function bindGuideControls() {
    openGuideBtns.forEach((btn) => {
      btn.addEventListener("click", () =>
        openGuide(guideModal, guideModalTitle, guideModalList, btn.dataset.guide),
      );
    });

    guideModalClose?.addEventListener("click", () => closeGuideModal(guideModal));
    guideModalX?.addEventListener("click", () => closeGuideModal(guideModal));
  }

  function bindSudokuControls() {
    clearBtn?.addEventListener("click", () => fillSelected(""));

    hintBtn?.addEventListener("click", () => {
      if (state.sudokuPaused) return;
      const resultado = darPistaAleatoria(state.tableroActual, state.solucion);

      if (!resultado.ok) {
        setSudokuStatus(resultado.mensaje);
        return;
      }

      state.hintsUsed += 1;
      syncSudokuStatsUi(errorsCountEl, hintsUsedEl, state.errorCount, state.hintsUsed);
      const { row, col, valor } = resultado;
      state.tableroActual[row][col] = valor;

      if (state.notas) limpiarNotasCelda(state.notas, row, col);
      createBoard();
      refreshProgress();
      updateKeypadAvailability();

      if (estaResuelto(state.tableroActual)) {
        finishSudokuWithScore();
      } else {
        setSudokuStatus(`Pista aplicada. Pistas usadas: ${state.hintsUsed}.`);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (juegoTab?.classList.contains("hidden")) return;
      if (state.sudokuPaused) return;
      if (!state.selectedCell) return;

      const row = Number(state.selectedCell.dataset.row);
      const col = Number(state.selectedCell.dataset.col);

      if (event.key.toLowerCase() === "n") {
        setNoteMode(!state.noteMode);
        return;
      }

      if (state.selectedCell.dataset.prefilled === "true") return;

      if (/^[1-9]$/.test(event.key)) {
        const num = Number(event.key);
        if (state.noteMode || event.shiftKey) {
          handleNoteInput(num);
        } else {
          fillSelected(event.key);
        }
        return;
      }

      if (event.key === "Backspace" || event.key === "Delete") {
        if (state.noteMode) {
          if (state.notas) limpiarNotasCelda(state.notas, row, col);
          renderCellContent(state.selectedCell, row, col);
          setSudokuStatus("Notas eliminadas.");
        } else {
          fillSelected("");
        }
      }
    });

    difficultySelect?.addEventListener("change", (event) => {
      loadDifficulty(event.target.value);
    });

    newGameBtn?.addEventListener("click", () => {
      loadDifficulty(state.currentDifficulty.key);
    });

    pauseBtn?.addEventListener("click", () => {
      if (state.sudokuPaused) resumeSudoku();
      else pauseSudoku();
    });

    toggleNotesBtn?.addEventListener("click", () => {
      if (state.sudokuPaused) return;
      setNoteMode(!state.noteMode);
    });

    toggleHighlightsBtn?.addEventListener("click", () => {
      if (state.sudokuPaused) return;
      state.highlightEnabled = !state.highlightEnabled;
      syncHighlightsUi(toggleHighlightsBtn, state.highlightEnabled);
      if (state.highlightEnabled) applyCurrentHighlights();
      else clearSelectionHighlights(boardEl);
    });
  }

  function init() {
    createSignBoard(signBoardEl);
    createKeypad(keypadEl, (n) => {
      if (state.sudokuPaused) return;
      if (state.noteMode) handleNoteInput(n);
      else fillSelected(n);
    });

    initializeDifficultyOptions(difficultySelect, state.currentDifficulty.key);
    bindGuideControls();
    bindSudokuControls();
    syncModeButtons();
    loadDifficulty(state.currentDifficulty.key);
  }

  return {
    init,
    loadDifficulty,
    getCurrentDifficultyKey: () => state.currentDifficulty.key,
    setStatus: setSudokuStatus,
    closeGuideModal: () => closeGuideModal(guideModal),
  };
}
