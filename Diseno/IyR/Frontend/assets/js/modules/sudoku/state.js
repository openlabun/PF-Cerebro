export const difficultyLevels = [
  { key: "muy-facil", label: "Principiante", givens: 48 },
  { key: "facil", label: "Iniciado", givens: 42 },
  { key: "medio", label: "Intermedio", givens: 36 },
  { key: "dificil", label: "Avanzado", givens: 31 },
  { key: "experto", label: "Experto", givens: 27 },
  { key: "maestro", label: "Profesional", givens: 24 },
];

// TEMP: luego estas seeds vendran desde backend/BD.
export const seedsPorDificultad = {
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
    { seed: 273520, huecos: 45 },
  ],
  Experto: [
    { seed: 73866, huecos: 50 },
    { seed: 786485, huecos: 50 },
    { seed: 461137, huecos: 50 },
    { seed: 695902, huecos: 50 },
    { seed: 187073, huecos: 50 },
  ],
  Profesional: [
    { seed: 542597, huecos: 60 },
    { seed: 109576, huecos: 60 },
    { seed: 336169, huecos: 60 },
    { seed: 73866, huecos: 60 },
    { seed: 81387, huecos: 60 },
  ],
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
    huecosActual: 40,
    hintsUsed: 0,
    roundCompleted: false,
    sudokuPaused: false,
    highlightEnabled: true,
    errorCount: 0,
  };
}

export function pickSeedAndHuecosByLabel(label) {
  const lista = seedsPorDificultad[label] || seedsPorDificultad.Intermedio;
  const chosen = lista[Math.floor(Math.random() * lista.length)];
  return { seed: chosen.seed, huecos: chosen.huecos };
}
