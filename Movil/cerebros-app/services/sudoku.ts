export type SudokuValue = number;
export type SudokuBoard = SudokuValue[][];
export type SudokuNotes = Set<number>[][];
export type SudokuDifficultyLevel = {
  key: string;
  label: string;
  holes: number;
};

export type SudokuSeededRandom = () => number;

export type SudokuSolveOptions = {
  random?: SudokuSeededRandom;
  limit?: number;
};

export type SudokuSolveResult = {
  count: number;
  solution: SudokuBoard | null;
};

export type SudokuHintResult =
  | { ok: false; message: string }
  | { ok: true; row: number; col: number; value: number };

export type SudokuProgress = {
  correct: number;
  editable: number;
  percentage: number;
};

export type SudokuScoreProgressInput = {
  solvedEditableCells: number;
  seconds: number;
  errorCount: number;
  hintsUsed: number;
  difficulty?: SudokuDifficultyLevel | null;
};

export type SudokuScoreInput = {
  puzzle: SudokuBoard;
  board: SudokuBoard;
  solution: SudokuBoard;
  seconds: number;
  errorCount: number;
  hintsUsed: number;
  difficulty?: SudokuDifficultyLevel | null;
};

export type ToggleNoteResult =
  | { ok: true; action: 'added' | 'removed' }
  | { ok: false; message: string };

type BestEmptyCell = {
  row: number;
  col: number;
  candidates: number[];
};

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

const difficultyBonus: Record<string, number> = {
  Principiante: 100,
  Iniciado: 200,
  Intermedio: 300,
  Avanzado: 450,
  Experto: 600,
  Profesional: 800,
};

const hintLimitByDifficulty: Record<string, number> = {
  Principiante: 5,
  Iniciado: 4,
  Intermedio: 3,
  Avanzado: 2,
  Experto: 1,
  Profesional: 0,
};

export const difficultyLevels: SudokuDifficultyLevel[] = [
  { key: 'muy-facil', label: 'Principiante', holes: 20 },
  { key: 'facil', label: 'Iniciado', holes: 40 },
  { key: 'medio', label: 'Intermedio', holes: 40 },
  { key: 'dificil', label: 'Avanzado', holes: 45 },
  { key: 'experto', label: 'Experto', holes: 50 },
  { key: 'maestro', label: 'Profesional', holes: 60 },
];

export function getDifficultyByKey(key: string) {
  return difficultyLevels.find((level) => level.key === key) || difficultyLevels[2];
}

export function getHintLimit(level?: SudokuDifficultyLevel | null) {
  return hintLimitByDifficulty[level?.label ?? ''] ?? 3;
}

export function getDifficultyCompletionBonus(level?: SudokuDifficultyLevel | null) {
  return difficultyBonus[level?.label ?? ''] ?? 0;
}

export function cloneBoard(board: SudokuBoard): SudokuBoard {
  return board.map((row) => [...row]);
}

export function createEmptyNotes(): SudokuNotes {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set<number>()));
}

export function clearNotesCell(notes: SudokuNotes, row: number, col: number) {
  notes[row]?.[col]?.clear();
}

export function toggleNote(
  notes: SudokuNotes,
  board: SudokuBoard,
  row: number,
  col: number,
  num: number,
): ToggleNoteResult {
  if (board[row]?.[col] !== 0) {
    return { ok: false, message: 'La celda ya tiene un valor.' };
  }

  const cellNotes = notes[row]?.[col];

  if (!cellNotes) {
    return { ok: false, message: 'No hay notas disponibles para esta celda.' };
  }

  if (cellNotes.has(num)) {
    cellNotes.delete(num);
    return { ok: true, action: 'removed' };
  }

  cellNotes.add(num);
  return { ok: true, action: 'added' };
}

export function createSeededRandom(seed = 1): SudokuSeededRandom {
  let state = (Number(seed) || 1) >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function shuffle<T>(values: T[], random: SudokuSeededRandom): T[] {
  const clone = [...values];

  for (let index = clone.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [clone[index], clone[target]] = [clone[target], clone[index]];
  }

  return clone;
}

function pattern(row: number, col: number) {
  return (row * 3 + Math.floor(row / 3) + col) % 9;
}

export function generateSolution(seed?: number): SudokuBoard {
  const random = createSeededRandom(seed);
  const rowGroups = shuffle([0, 1, 2], random);
  const colGroups = shuffle([0, 1, 2], random);
  const rows = rowGroups.flatMap((group) =>
    shuffle([0, 1, 2], random).map((value) => group * 3 + value),
  );
  const cols = colGroups.flatMap((group) =>
    shuffle([0, 1, 2], random).map((value) => group * 3 + value),
  );
  const nums = shuffle([...DIGITS], random);

  return rows.map((row) => cols.map((col) => nums[pattern(row, col)]));
}

export function getCandidates(board: SudokuBoard, row: number, col: number): number[] {
  if (board[row]?.[col] !== 0) return [];

  const blocked = new Set<number>();

  for (let index = 0; index < 9; index += 1) {
    const rowValue = board[row]?.[index];
    const colValue = board[index]?.[col];

    if (rowValue && rowValue !== 0) blocked.add(rowValue);
    if (colValue && colValue !== 0) blocked.add(colValue);
  }

  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;

  for (let currentRow = startRow; currentRow < startRow + 3; currentRow += 1) {
    for (let currentCol = startCol; currentCol < startCol + 3; currentCol += 1) {
      const blockValue = board[currentRow]?.[currentCol];
      if (blockValue && blockValue !== 0) blocked.add(blockValue);
    }
  }

  return DIGITS.filter((digit) => !blocked.has(digit));
}

function findBestEmptyCell(board: SudokuBoard): BestEmptyCell | null {
  let best: BestEmptyCell | null = null;

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (board[row]?.[col] !== 0) continue;

      const candidates = getCandidates(board, row, col);

      if (candidates.length === 0) return { row, col, candidates };

      if (!best || candidates.length < best.candidates.length) {
        best = { row, col, candidates };
        if (candidates.length === 1) return best;
      }
    }
  }

  return best;
}

export function solveBoard(board: SudokuBoard, options: SudokuSolveOptions = {}): SudokuSolveResult {
  const random = options.random || Math.random;
  const limit = options.limit || 1;
  const working = cloneBoard(board);
  let count = 0;
  let solution: SudokuBoard | null = null;

  function backtrack() {
    if (count >= limit) return;

    const next = findBestEmptyCell(working);

    if (!next) {
      count += 1;
      if (!solution) solution = cloneBoard(working);
      return;
    }

    if (next.candidates.length === 0) return;

    const orderedCandidates = shuffle(next.candidates, random);

    for (const candidate of orderedCandidates) {
      if (!working[next.row]) continue;

      working[next.row][next.col] = candidate;
      backtrack();
      working[next.row][next.col] = 0;

      if (count >= limit) return;
    }
  }

  backtrack();
  return { count, solution };
}

export function createPuzzle(solution: SudokuBoard, holes: number, seed = 1): SudokuBoard {
  const random = createSeededRandom(seed + 97);
  const puzzle = cloneBoard(solution);
  const positions = shuffle(
    Array.from({ length: 81 }, (_, index) => index),
    random,
  );
  let removed = 0;

  for (const position of positions) {
    if (removed >= holes) break;

    const row = Math.floor(position / 9);
    const col = position % 9;

    if (!puzzle[row]) continue;

    const backup = puzzle[row][col];
    puzzle[row][col] = 0;

    const { count } = solveBoard(puzzle, { limit: 2, random });

    if (count !== 1) {
      puzzle[row][col] = backup;
      continue;
    }

    removed += 1;
  }

  return puzzle;
}

export function isBoardSolved(board: SudokuBoard, solution: SudokuBoard | null = null) {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const value = board[row]?.[col] || 0;

      if (value === 0) return false;
      if (solution && value !== solution[row]?.[col]) return false;
    }
  }

  return true;
}

export function getRandomHint(
  board: SudokuBoard,
  solution: SudokuBoard,
  seed = Date.now(),
): SudokuHintResult {
  const candidates: Array<{ row: number; col: number; value: number }> = [];

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const boardValue = board[row]?.[col];
      const solutionValue = solution[row]?.[col];

      if (solutionValue !== undefined && boardValue !== solutionValue) {
        candidates.push({ row, col, value: solutionValue });
      }
    }
  }

  if (candidates.length === 0) {
    return { ok: false, message: 'El tablero ya esta resuelto.' };
  }

  const random = createSeededRandom(seed);
  const picked = candidates[Math.floor(random() * candidates.length)];
  return { ok: true, ...picked };
}

export function countCorrectByNumber(board: SudokuBoard, solution: SudokuBoard) {
  const counts = Array<number>(10).fill(0);

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const value = board[row]?.[col] || 0;

      if (value !== 0 && value === solution[row]?.[col]) {
        counts[value] += 1;
      }
    }
  }

  return counts;
}

export function countSolvedEditableCells(
  puzzle: SudokuBoard,
  board: SudokuBoard,
  solution: SudokuBoard,
) {
  let solved = 0;

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (puzzle[row]?.[col] === 0 && board[row]?.[col] === solution[row]?.[col]) solved += 1;
    }
  }

  return solved;
}

export function calculateProgress(
  puzzle: SudokuBoard,
  board: SudokuBoard,
  solution: SudokuBoard,
): SudokuProgress {
  let editable = 0;
  let correct = 0;

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (puzzle[row]?.[col] !== 0) continue;

      editable += 1;
      if (board[row]?.[col] === solution[row]?.[col]) correct += 1;
    }
  }

  const percentage = editable === 0 ? 100 : Math.round((correct / editable) * 100);
  return { correct, editable, percentage };
}

export function calculateScoreFromProgress({
  solvedEditableCells,
  seconds,
  errorCount,
  hintsUsed,
  difficulty,
}: SudokuScoreProgressInput) {
  const pointsPerCorrectMove = 100;
  const timePenaltyPerSecond = 2;
  const errorPenalty = 50;
  const hintPenalty = 100;
  const safeSolvedEditableCells = Math.max(0, Number(solvedEditableCells) || 0);
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const safeErrorCount = Math.max(0, Number(errorCount) || 0);
  const safeHintsUsed = Math.max(0, Number(hintsUsed) || 0);
  const earnedPoints =
    safeSolvedEditableCells * pointsPerCorrectMove + getDifficultyCompletionBonus(difficulty);
  const penalty =
    safeSeconds * timePenaltyPerSecond +
    safeErrorCount * errorPenalty +
    safeHintsUsed * hintPenalty;

  return Math.max(0, earnedPoints - penalty);
}

export function calculateScore({
  puzzle,
  board,
  solution,
  seconds,
  errorCount,
  hintsUsed,
  difficulty,
}: SudokuScoreInput) {
  const solvedEditableCells = countSolvedEditableCells(puzzle, board, solution);

  return calculateScoreFromProgress({
    solvedEditableCells,
    seconds,
    errorCount,
    hintsUsed,
    difficulty,
  });
}
