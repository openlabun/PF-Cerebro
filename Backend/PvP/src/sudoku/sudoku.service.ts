import { Injectable } from '@nestjs/common';

const PVP_DIFFICULTY_LEVELS = [
  { key: 'muy-facil', label: 'Principiante', holes: 20, completionBonus: 100 },
  { key: 'facil', label: 'Iniciado', holes: 40, completionBonus: 200 },
  { key: 'medio', label: 'Intermedio', holes: 40, completionBonus: 300 },
  { key: 'dificil', label: 'Avanzado', holes: 45, completionBonus: 450 },
  { key: 'experto', label: 'Experto', holes: 50, completionBonus: 600 },
  { key: 'maestro', label: 'Profesional', holes: 60, completionBonus: 800 },
] as const;

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

class LegacySeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = ((seed % 2147483646) + 2147483646) % 2147483646 + 1;
  }

  next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return (this.state - 1) / 2147483646;
  }

  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }

  shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = this.nextInt(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

type Board = number[][];

@Injectable()
export class SudokuService {
  private getDifficultyConfig(difficultyKey?: string | null) {
    const normalizedDifficultyKey = this.normalizeDifficultyKey(difficultyKey);
    return (
      PVP_DIFFICULTY_LEVELS.find((level) => level.key === normalizedDifficultyKey) ??
      PVP_DIFFICULTY_LEVELS[2]
    );
  }

  normalizeDifficultyKey(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    if (!normalized) return null;

    const exists = PVP_DIFFICULTY_LEVELS.some((level) => level.key === normalized);
    return exists ? normalized : null;
  }

  generateBoard(
    seed: number,
    difficultyKey?: string,
  ): { board: number[][]; solution: number[][] } {
    const normalizedDifficultyKey = this.normalizeDifficultyKey(difficultyKey);
    if (!normalizedDifficultyKey) {
      return this.generateLegacyBoard(seed);
    }

    const solution = this.generateSolution(seed);
    const holes = this.getHolesForDifficulty(normalizedDifficultyKey);
    const board = this.createPuzzle(solution, holes, seed);
    return { board, solution };
  }

  validateMove(
    solution: number[][],
    row: number,
    col: number,
    value: number,
  ): boolean {
    return Number(solution?.[row]?.[col]) === Number(value);
  }

  getDifficultyLabel(difficultyKey?: string | null): string {
    return this.getDifficultyConfig(difficultyKey).label;
  }

  getDifficultyCompletionBonus(difficultyKey?: string | null): number {
    return this.getDifficultyConfig(difficultyKey).completionBonus;
  }

  calculateScoreFromProgress(params: {
    solvedEditableCells: number;
    elapsedMs: number;
    errorCount: number;
    hintsUsed?: number;
    difficultyKey?: string | null;
  }): number {
    const pointsPerCorrectMove = 100;
    const timePenaltyPerSecond = 2;
    const errorPenalty = 50;
    const hintPenalty = 100;
    const solvedEditableCells = Math.max(
      0,
      Number(params.solvedEditableCells) || 0,
    );
    const seconds = Math.max(
      0,
      Math.floor((Number(params.elapsedMs) || 0) / 1000),
    );
    const errorCount = Math.max(0, Number(params.errorCount) || 0);
    const hintsUsed = Math.max(0, Number(params.hintsUsed) || 0);
    const earnedPoints =
      solvedEditableCells * pointsPerCorrectMove +
      this.getDifficultyCompletionBonus(params.difficultyKey);
    const penalty =
      seconds * timePenaltyPerSecond +
      errorCount * errorPenalty +
      hintsUsed * hintPenalty;
    return Math.max(0, earnedPoints - penalty);
  }

  private getHolesForDifficulty(difficultyKey: string): number {
    return this.getDifficultyConfig(difficultyKey).holes;
  }

  private cloneBoard(board: Board): Board {
    return board.map((row) => [...row]);
  }

  private createSeededRandom(seed = 1) {
    let state = (Number(seed) || 1) >>> 0;
    return () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  private shuffle(values: number[], random: () => number): number[] {
    const clone = [...values];
    for (let index = clone.length - 1; index > 0; index -= 1) {
      const target = Math.floor(random() * (index + 1));
      [clone[index], clone[target]] = [clone[target], clone[index]];
    }
    return clone;
  }

  private pattern(row: number, col: number): number {
    return (row * 3 + Math.floor(row / 3) + col) % 9;
  }

  private generateSolution(seed: number): Board {
    const random = this.createSeededRandom(seed);
    const rowGroups = this.shuffle([0, 1, 2], random);
    const colGroups = this.shuffle([0, 1, 2], random);
    const rows = rowGroups.flatMap((group) =>
      this.shuffle([0, 1, 2], random).map((value) => group * 3 + value),
    );
    const cols = colGroups.flatMap((group) =>
      this.shuffle([0, 1, 2], random).map((value) => group * 3 + value),
    );
    const nums = this.shuffle([...DIGITS], random);

    return rows.map((row) => cols.map((col) => nums[this.pattern(row, col)]));
  }

  private getCandidates(board: Board, row: number, col: number): number[] {
    if (board[row][col] !== 0) return [];

    const blocked = new Set<number>();
    for (let index = 0; index < 9; index += 1) {
      if (board[row][index] !== 0) blocked.add(board[row][index]);
      if (board[index][col] !== 0) blocked.add(board[index][col]);
    }

    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let currentRow = startRow; currentRow < startRow + 3; currentRow += 1) {
      for (let currentCol = startCol; currentCol < startCol + 3; currentCol += 1) {
        if (board[currentRow][currentCol] !== 0) {
          blocked.add(board[currentRow][currentCol]);
        }
      }
    }

    return DIGITS.filter((digit) => !blocked.has(digit));
  }

  private findBestEmptyCell(board: Board) {
    let best:
      | { row: number; col: number; candidates: number[] }
      | null = null;

    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        if (board[row][col] !== 0) continue;
        const candidates = this.getCandidates(board, row, col);
        if (candidates.length === 0) return { row, col, candidates };
        if (!best || candidates.length < best.candidates.length) {
          best = { row, col, candidates };
          if (candidates.length === 1) return best;
        }
      }
    }

    return best;
  }

  private solveBoard(
    board: Board,
    options: { limit?: number; random?: () => number } = {},
  ) {
    const random = options.random || Math.random;
    const limit = options.limit || 1;
    const working = this.cloneBoard(board);
    let count = 0;
    let solution: Board | null = null;

    const backtrack = () => {
      if (count >= limit) return;

      const next = this.findBestEmptyCell(working);
      if (!next) {
        count += 1;
        if (!solution) solution = this.cloneBoard(working);
        return;
      }

      if (next.candidates.length === 0) return;

      const orderedCandidates = this.shuffle([...next.candidates], random);
      for (const candidate of orderedCandidates) {
        working[next.row][next.col] = candidate;
        backtrack();
        working[next.row][next.col] = 0;
        if (count >= limit) return;
      }
    };

    backtrack();
    return { count, solution };
  }

  private createPuzzle(solution: Board, holes: number, seed: number): Board {
    const random = this.createSeededRandom(seed + 97);
    const puzzle = this.cloneBoard(solution);
    const positions = this.shuffle(
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

      const { count } = this.solveBoard(puzzle, { limit: 2, random });
      if (count !== 1) {
        puzzle[row][col] = backup;
        continue;
      }

      removed += 1;
    }

    return puzzle;
  }

  private generateLegacyBoard(seed: number): { board: Board; solution: Board } {
    const rng = new LegacySeededRandom(seed);

    const base: Board = [
      [1, 2, 3, 4, 5, 6, 7, 8, 9],
      [4, 5, 6, 7, 8, 9, 1, 2, 3],
      [7, 8, 9, 1, 2, 3, 4, 5, 6],
      [2, 3, 1, 5, 6, 4, 8, 9, 7],
      [5, 6, 4, 8, 9, 7, 2, 3, 1],
      [8, 9, 7, 2, 3, 1, 5, 6, 4],
      [3, 1, 2, 6, 4, 5, 9, 7, 8],
      [6, 4, 5, 9, 7, 8, 3, 1, 2],
      [9, 7, 8, 3, 1, 2, 6, 4, 5],
    ];

    const digits: number[] = rng.shuffle([...DIGITS]);
    let grid: Board = base.map((row) => row.map((value) => digits[value - 1]));

    for (let band = 0; band < 3; band += 1) {
      const indices = rng.shuffle([0, 1, 2]);
      const rows = indices.map((index) => grid[band * 3 + index]);
      for (let offset = 0; offset < 3; offset += 1) {
        grid[band * 3 + offset] = rows[offset];
      }
    }

    for (let stack = 0; stack < 3; stack += 1) {
      const indices = rng.shuffle([0, 1, 2]);
      for (let row = 0; row < 9; row += 1) {
        const cols = indices.map((index) => grid[row][stack * 3 + index]);
        for (let offset = 0; offset < 3; offset += 1) {
          grid[row][stack * 3 + offset] = cols[offset];
        }
      }
    }

    const bandOrder = rng.shuffle([0, 1, 2]);
    const reordered: Board = [];
    for (const band of bandOrder) {
      for (let offset = 0; offset < 3; offset += 1) {
        reordered.push([...grid[band * 3 + offset]]);
      }
    }
    grid = reordered;

    const stackOrder = rng.shuffle([0, 1, 2]);
    for (let row = 0; row < 9; row += 1) {
      const nextRow: number[] = [];
      for (const stack of stackOrder) {
        for (let offset = 0; offset < 3; offset += 1) {
          nextRow.push(grid[row][stack * 3 + offset]);
        }
      }
      grid[row] = nextRow;
    }

    const solution = this.cloneBoard(grid);
    const positions: [number, number][] = [];
    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        positions.push([row, col]);
      }
    }

    const shuffled = rng.shuffle(positions);
    const toRemove = 40 + rng.nextInt(11);
    const board = this.cloneBoard(solution);
    for (let index = 0; index < toRemove; index += 1) {
      const [row, col] = shuffled[index];
      board[row][col] = 0;
    }

    return { board, solution };
  }
}
