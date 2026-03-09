export const difficultyLevels = [
  { key: "muy-facil", label: "Principiante", givens: 48 },
  { key: "facil", label: "Iniciado", givens: 42 },
  { key: "medio", label: "Intermedio", givens: 36 },
  { key: "dificil", label: "Avanzado", givens: 31 },
  { key: "experto", label: "Experto", givens: 27 },
  { key: "maestro", label: "Profesional", givens: 24 },
];

export const seedsPorDificultad = {
  Principiante: [{ seed: 99469, huecos: 20 }],
  Iniciado: [{ seed: 825023, huecos: 40 }],
  Intermedio: [{ seed: 979729, huecos: 40 }],
  Avanzado: [{ seed: 978497, huecos: 45 }],
  Experto: [{ seed: 73866, huecos: 50 }],
  Profesional: [{ seed: 542597, huecos: 60 }],
};

export const GAME_ID_SUDOKU = "uVsB-k2rjora";

export function createSudokuState() {
  return {
    currentDifficulty: difficultyLevels[2],
    noteMode: false,
    seconds: 0,
    timerInterval: null,
    solucion: [],
    puzzleInicial: [],
    tableroActual: [],
    notas: null,
    selectedCell: null,
    seedActual: null,
    seedRecordId: null,
    huecosActual: 40,
    hintsUsed: 0,
    roundCompleted: false,
    sudokuPaused: false,
    highlightEnabled: true,
    errorCount: 0,
  };
}

export function pickLocalSeedAndHuecosByLabel(label) {
  const lista = seedsPorDificultad[label] || seedsPorDificultad.Intermedio;
  const chosen = lista[Math.floor(Math.random() * lista.length)];
  return { seed: Number(chosen.seed), huecos: Number(chosen.huecos) };
}
