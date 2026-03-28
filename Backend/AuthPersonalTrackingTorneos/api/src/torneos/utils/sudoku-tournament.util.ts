export type SudokuDifficultyDefinition = {
  key: string;
  label: string;
  holes: number;
};

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const difficultyDefinitions: SudokuDifficultyDefinition[] = [
  { key: 'muy-facil', label: 'Principiante', holes: 20 },
  { key: 'facil', label: 'Iniciado', holes: 40 },
  { key: 'medio', label: 'Intermedio', holes: 40 },
  { key: 'dificil', label: 'Avanzado', holes: 45 },
  { key: 'experto', label: 'Experto', holes: 50 },
  { key: 'maestro', label: 'Profesional', holes: 60 },
];

const hintLimitByLabel: Record<string, number> = {
  principiante: 5,
  iniciado: 4,
  intermedio: 3,
  avanzado: 2,
  experto: 1,
  profesional: 0,
};

const difficultyBonusByLabel: Record<string, number> = {
  principiante: 100,
  iniciado: 200,
  intermedio: 300,
  avanzado: 450,
  experto: 600,
  profesional: 800,
};

function normalizeText(value: unknown): string {
  return String(value ?? '').trim();
}

function normalizeDifficulty(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

function hashStringToSeed(value: string): number {
  let hash = 2166136261;

  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }

  return Math.abs(hash >>> 0) || 1;
}

function shuffle(values: number[], random: () => number): number[] {
  const clone = [...values];

  for (let index = clone.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [clone[index], clone[target]] = [clone[target], clone[index]];
  }

  return clone;
}

function pattern(row: number, col: number): number {
  return (row * 3 + Math.floor(row / 3) + col) % 9;
}

function getCandidates(board: number[][], row: number, col: number): number[] {
  if (board[row][col] !== 0) return [];

  const blocked = new Set<number>();

  for (let index = 0; index < 9; index += 1) {
    if (board[row][index] !== 0) blocked.add(board[row][index]);
    if (board[index][col] !== 0) blocked.add(board[index][col]);
  }

  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;

  for (let currentRow = startRow; currentRow < startRow + 3; currentRow += 1) {
    for (
      let currentCol = startCol;
      currentCol < startCol + 3;
      currentCol += 1
    ) {
      if (board[currentRow][currentCol] !== 0) {
        blocked.add(board[currentRow][currentCol]);
      }
    }
  }

  return DIGITS.filter((digit) => !blocked.has(digit));
}

function findBestEmptyCell(board: number[][]): {
  row: number;
  col: number;
  candidates: number[];
} | null {
  let best: { row: number; col: number; candidates: number[] } | null = null;

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (board[row][col] !== 0) continue;

      const candidates = getCandidates(board, row, col);
      if (candidates.length === 0) {
        return { row, col, candidates };
      }

      if (!best || candidates.length < best.candidates.length) {
        best = { row, col, candidates };
        if (candidates.length === 1) {
          return best;
        }
      }
    }
  }

  return best;
}

function cloneBoard(board: number[][]): number[][] {
  return board.map((row) => [...row]);
}

function solveBoard(
  board: number[][],
  random: () => number,
  limit = 1,
): { count: number } {
  const working = cloneBoard(board);
  let count = 0;

  function backtrack() {
    if (count >= limit) return;

    const next = findBestEmptyCell(working);
    if (!next) {
      count += 1;
      return;
    }

    if (next.candidates.length === 0) return;

    const orderedCandidates = shuffle(next.candidates, random);
    for (const candidate of orderedCandidates) {
      working[next.row][next.col] = candidate;
      backtrack();
      working[next.row][next.col] = 0;

      if (count >= limit) return;
    }
  }

  backtrack();
  return { count };
}

export function resolveSudokuTournamentDifficulty(
  value: unknown,
): SudokuDifficultyDefinition {
  const normalized = normalizeDifficulty(value);

  return (
    difficultyDefinitions.find(
      (entry) =>
        entry.key === normalized || normalizeDifficulty(entry.label) === normalized,
    ) ?? difficultyDefinitions[2]
  );
}

export function getSudokuTournamentHintLimit(
  difficulty: SudokuDifficultyDefinition,
): number {
  return hintLimitByLabel[normalizeDifficulty(difficulty.label)] ?? 3;
}

export function resolveSudokuTournamentSeed(
  configuredSeed: unknown,
  fallbackSource: string,
): string {
  const rawSeed = normalizeText(configuredSeed);

  if (/^-?\d+$/.test(rawSeed)) {
    const numericSeed = Math.abs(Math.trunc(Number(rawSeed)));
    return String(numericSeed || 1);
  }

  const source = rawSeed || fallbackSource || 'torneo-sudoku';
  return String(hashStringToSeed(source));
}

export function createSeededRandom(seed: string | number): () => number {
  let state = (Number(seed) || 1) >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function generateSudokuSolution(seed: string | number): number[][] {
  const random = createSeededRandom(seed);
  const rowGroups = shuffle([0, 1, 2], random);
  const colGroups = shuffle([0, 1, 2], random);
  const rows = rowGroups.flatMap((group) =>
    shuffle([0, 1, 2], random).map((value) => group * 3 + value),
  );
  const cols = colGroups.flatMap((group) =>
    shuffle([0, 1, 2], random).map((value) => group * 3 + value),
  );
  const nums = shuffle(DIGITS, random);

  return rows.map((row) => cols.map((col) => nums[pattern(row, col)]));
}

export function createSudokuPuzzle(
  solution: number[][],
  holes: number,
  seed: string | number,
): number[][] {
  const random = createSeededRandom(Number(seed) + 97);
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
    const backup = puzzle[row][col];
    puzzle[row][col] = 0;

    const { count } = solveBoard(puzzle, random, 2);
    if (count !== 1) {
      puzzle[row][col] = backup;
      continue;
    }

    removed += 1;
  }

  return puzzle;
}

export function validateSudokuBoardShape(value: unknown): number[][] | null {
  if (!Array.isArray(value) || value.length !== 9) {
    return null;
  }

  const rows = value.map((row) => {
    if (!Array.isArray(row) || row.length !== 9) {
      return null;
    }

    const normalizedRow = row.map((cell) => {
      const parsed = Number(cell);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 9) {
        return null;
      }

      return parsed;
    });

    return normalizedRow.includes(null)
      ? null
      : (normalizedRow as unknown as number[]);
  });

  return rows.includes(null) ? null : (rows as unknown as number[][]);
}

export function isSolvedSudokuBoard(
  board: number[][],
  solution: number[][],
): boolean {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (board[row][col] !== solution[row][col]) {
        return false;
      }
    }
  }

  return true;
}

export function countEditableCells(puzzle: number[][]): number {
  let editable = 0;

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (puzzle[row][col] === 0) {
        editable += 1;
      }
    }
  }

  return editable;
}

export function calculateSudokuTournamentScore(args: {
  elapsedSeconds: number;
  timeLimitSeconds: number;
}): number {
  const safeElapsedSeconds = Math.max(
    0,
    Math.trunc(Number(args.elapsedSeconds) || 0),
  );
  const safeTimeLimitSeconds = Math.max(
    1,
    Math.trunc(Number(args.timeLimitSeconds) || 0),
  );

  return Math.max(1, safeTimeLimitSeconds - safeElapsedSeconds + 1);
}
