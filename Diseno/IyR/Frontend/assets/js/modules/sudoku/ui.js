import { difficultyLevels } from "./state.js";

export function setSudokuPausedUi(pauseBtn, paused) {
  const card = document.querySelector("#juego-tab .sudoku-game-card");
  card?.classList.toggle("paused", paused);

  if (pauseBtn) pauseBtn.textContent = paused ? "Reanudar" : "Pausar";
}

export function syncNoteModeUi(toggleNotesBtn, noteMode) {
  if (!toggleNotesBtn) return;
  toggleNotesBtn.classList.toggle("active", noteMode);
  toggleNotesBtn.setAttribute("aria-pressed", noteMode ? "true" : "false");
  toggleNotesBtn.textContent = noteMode ? "Notas: ON" : "Notas: OFF";
}

export function syncHighlightsUi(toggleHighlightsBtn, highlightEnabled) {
  if (!toggleHighlightsBtn) return;
  toggleHighlightsBtn.classList.toggle("active", highlightEnabled);
  toggleHighlightsBtn.setAttribute("aria-pressed", highlightEnabled ? "true" : "false");
  toggleHighlightsBtn.textContent = highlightEnabled ? "Resaltar: ON" : "Resaltar: OFF";
}

export function clearSelectionHighlights(boardEl) {
  if (!boardEl) return;
  boardEl.querySelectorAll(".cell").forEach((cell) => {
    cell.classList.remove("highlight-peer", "highlight-same");
  });
}

export function applySelectionHighlights(boardEl, selectedCell, tableroActual, highlightEnabled) {
  clearSelectionHighlights(boardEl);
  if (!highlightEnabled) return;
  if (!selectedCell) return;

  const selectedRow = Number(selectedCell.dataset.row);
  const selectedCol = Number(selectedCell.dataset.col);
  const selectedValue = tableroActual?.[selectedRow]?.[selectedCol] ?? 0;

  boardEl.querySelectorAll(".cell").forEach((cell) => {
    const r = Number(cell.dataset.row);
    const c = Number(cell.dataset.col);

    if (r === selectedRow || c === selectedCol) {
      cell.classList.add("highlight-peer");
    }

    const value = tableroActual?.[r]?.[c] ?? 0;
    if (selectedValue !== 0 && value === selectedValue) {
      cell.classList.add("highlight-same");
    }
  });
}

export function showSudokuPausePopup(onResume) {
  const existing = document.getElementById("sudoku-pause-popup");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "sudoku-pause-popup";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0,0,0,0.65)";
  overlay.style.display = "grid";
  overlay.style.placeItems = "center";
  overlay.style.zIndex = "9999";

  const card = document.createElement("div");
  card.style.width = "min(92vw, 420px)";
  card.style.padding = "1.1rem 1rem";
  card.style.borderRadius = "14px";
  card.style.background = "#111827";
  card.style.color = "#f9fafb";
  card.style.textAlign = "center";
  card.style.boxShadow = "0 10px 35px rgba(0,0,0,0.35)";

  const title = document.createElement("h3");
  title.textContent = "Juego en pausa";
  title.style.margin = "0 0 .35rem";

  const text = document.createElement("p");
  text.textContent = "El tiempo esta detenido. Presiona reanudar para continuar.";
  text.style.margin = "0 0 .9rem";
  text.style.opacity = "0.92";

  const resumeBtn = document.createElement("button");
  resumeBtn.type = "button";
  resumeBtn.textContent = "Reanudar";
  resumeBtn.style.border = "0";
  resumeBtn.style.borderRadius = "12px";
  resumeBtn.style.padding = ".72rem 1.1rem";
  resumeBtn.style.fontWeight = "800";
  resumeBtn.style.cursor = "pointer";
  resumeBtn.style.background = "#6B4EE6";
  resumeBtn.style.color = "#fff";
  resumeBtn.addEventListener("click", () => onResume?.());

  card.appendChild(title);
  card.appendChild(text);
  card.appendChild(resumeBtn);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

export function hideSudokuPausePopup() {
  const existing = document.getElementById("sudoku-pause-popup");
  if (existing) existing.remove();
}

export function setStatus(statusEl, message, ok = false) {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.classList.toggle("ok", ok);
}

export function updateProgress(progressFill, progressText, puzzleInicial, tableroActual, solucion) {
  let editable = 0;
  let correct = 0;

  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (puzzleInicial[r][c] === 0) {
        editable += 1;
        if (tableroActual[r][c] === solucion[r][c]) correct += 1;
      }
    }
  }

  const percentage = editable === 0 ? 100 : Math.round((correct / editable) * 100);
  if (progressFill) progressFill.style.width = `${percentage}%`;
  if (progressText) {
    progressText.textContent = `${correct}/${editable} celdas correctas (${percentage}%)`;
  }
}

export function syncSudokuStatsUi(errorsCountEl, hintsUsedEl, errorCount, hintsUsed) {
  if (errorsCountEl) errorsCountEl.textContent = `Errores: ${errorCount}`;
  if (hintsUsedEl) hintsUsedEl.textContent = `Pistas: ${hintsUsed}`;
}

export function showSudokuCompletionPopup(score, onRestart, onAfterClose) {
  const existing = document.getElementById("sudoku-completion-popup");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "sudoku-completion-popup";
  overlay.setAttribute("role", "alertdialog");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0,0,0,0.65)";
  overlay.style.display = "grid";
  overlay.style.placeItems = "center";
  overlay.style.zIndex = "9999";

  const card = document.createElement("div");
  card.style.width = "min(92vw, 420px)";
  card.style.padding = "1.1rem 1rem";
  card.style.borderRadius = "14px";
  card.style.background = "#111827";
  card.style.color = "#f9fafb";
  card.style.textAlign = "center";
  card.style.boxShadow = "0 10px 35px rgba(0,0,0,0.35)";

  const title = document.createElement("h3");
  title.textContent = "Sudoku completado";
  title.style.margin = "0 0 .35rem";

  const text = document.createElement("p");
  text.textContent = `Puntaje: ${score}. Reiniciando tablero...`;
  text.style.margin = "0";

  card.appendChild(title);
  card.appendChild(text);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  setTimeout(() => {
    overlay.remove();
    onRestart?.();
    onAfterClose?.();
  }, 2200);
}

export function showSudokuAchievementPopup(unlockedAchievements = []) {
  const unlocked = Array.isArray(unlockedAchievements)
    ? unlockedAchievements.filter((item) => item?.icon && item?.description)
    : [];
  if (unlocked.length === 0) return;

  const existing = document.getElementById("sudoku-achievement-popup");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "sudoku-achievement-popup";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(0,0,0,0.72)";
  overlay.style.display = "grid";
  overlay.style.placeItems = "center";
  overlay.style.zIndex = "10000";

  const card = document.createElement("div");
  card.style.width = "min(92vw, 460px)";
  card.style.padding = "1.1rem 1rem";
  card.style.borderRadius = "14px";
  card.style.background = "#111827";
  card.style.color = "#f9fafb";
  card.style.boxShadow = "0 10px 35px rgba(0,0,0,0.35)";

  const title = document.createElement("h3");
  title.textContent = unlocked.length === 1 ? "Logro desbloqueado" : "Logros desbloqueados";
  title.style.margin = "0 0 .65rem";
  title.style.textAlign = "center";

  const list = document.createElement("div");
  list.style.display = "grid";
  list.style.gap = ".55rem";
  list.style.marginBottom = ".95rem";

  unlocked.forEach((item) => {
    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.gap = ".55rem";
    row.style.alignItems = "flex-start";

    const icon = document.createElement("span");
    icon.textContent = item.icon;
    icon.style.fontSize = "1.25rem";
    icon.style.lineHeight = "1.2";

    const content = document.createElement("div");

    const titleEl = document.createElement("div");
    titleEl.textContent = String(item.title || "Nuevo logro");
    titleEl.style.fontWeight = "700";
    titleEl.style.fontSize = ".95rem";

    const descEl = document.createElement("div");
    descEl.textContent = String(item.description || "");
    descEl.style.fontSize = ".86rem";
    descEl.style.opacity = ".9";

    content.appendChild(titleEl);
    content.appendChild(descEl);
    row.appendChild(icon);
    row.appendChild(content);
    list.appendChild(row);
  });

  const acceptBtn = document.createElement("button");
  acceptBtn.type = "button";
  acceptBtn.textContent = "Aceptar";
  acceptBtn.style.display = "block";
  acceptBtn.style.margin = "0 auto";
  acceptBtn.style.border = "0";
  acceptBtn.style.borderRadius = "12px";
  acceptBtn.style.padding = ".72rem 1.2rem";
  acceptBtn.style.fontWeight = "800";
  acceptBtn.style.cursor = "pointer";
  acceptBtn.style.background = "#6B4EE6";
  acceptBtn.style.color = "#fff";
  acceptBtn.addEventListener("click", () => overlay.remove());

  card.appendChild(title);
  card.appendChild(list);
  card.appendChild(acceptBtn);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

export function createSignBoard(signBoardEl) {
  if (!signBoardEl) return;
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

export function createKeypad(keypadEl, onNumberClick) {
  if (!keypadEl) return;
  keypadEl.innerHTML = "";
  for (let n = 1; n <= 9; n += 1) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip number";
    btn.textContent = String(n);
    btn.dataset.num = String(n);
    btn.addEventListener("click", () => onNumberClick?.(n));
    keypadEl.appendChild(btn);
  }
}

export function initializeDifficultyOptions(difficultySelect, currentDifficultyKey) {
  if (!difficultySelect) return;
  difficultySelect.innerHTML = "";
  difficultyLevels.forEach((level, index) => {
    const option = document.createElement("option");
    option.value = level.key;
    option.textContent = `${index + 1}. ${level.label}`;
    if (level.key === currentDifficultyKey) option.selected = true;
    difficultySelect.appendChild(option);
  });
}

export function closeGuideModal(guideModal) {
  if (!guideModal) return;
  guideModal.classList.add("hidden");
  guideModal.setAttribute("aria-hidden", "true");
}

export function openGuide(guideModal, guideModalTitle, guideModalList, guide) {
  if (!guideModal || !guideModalTitle || !guideModalList) return;

  const guides = {
    sudoku: {
      title: "Como jugar Sudoku",
      items: [
        "Cada fila debe contener numeros del 1 al 9 sin repetirse.",
        "Cada columna debe contener numeros del 1 al 9 sin repetirse.",
        "Cada subcuadro 3x3 debe contener numeros del 1 al 9 sin repetirse.",
        "Los numeros iniciales no pueden modificarse.",
        "El objetivo es completar el tablero correctamente.",
      ],
    },
    torneos: {
      title: "Como jugar Torneos",
      items: [
        "Los torneos se juegan por rondas con sudokus de dificultad progresiva.",
        "Tu puntaje combina tiempo de resolucion y precision final.",
        "Puedes ver tu posicion en la clasificacion en tiempo real.",
      ],
    },
    pvp: {
      title: "Como jugar PvP",
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
