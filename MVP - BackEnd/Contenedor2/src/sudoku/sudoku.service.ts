import { Injectable } from '@nestjs/common';

class SeededRandom {
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
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

@Injectable()
export class SudokuService {
  generateBoard(seed: number): { board: number[][]; solution: number[][] } {
    const rng = new SeededRandom(seed);

    const base = [
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

    const digits = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    let grid = base.map((row) => row.map((v) => digits[v - 1]));

    for (let band = 0; band < 3; band++) {
      const indices = rng.shuffle([0, 1, 2]);
      const rows = indices.map((i) => grid[band * 3 + i]);
      for (let i = 0; i < 3; i++) grid[band * 3 + i] = rows[i];
    }

    for (let stack = 0; stack < 3; stack++) {
      const indices = rng.shuffle([0, 1, 2]);
      for (let row = 0; row < 9; row++) {
        const cols = indices.map((i) => grid[row][stack * 3 + i]);
        for (let i = 0; i < 3; i++) grid[row][stack * 3 + i] = cols[i];
      }
    }

    const bandOrder = rng.shuffle([0, 1, 2]);
    let reordered: number[][] = [];
    for (const b of bandOrder) {
      for (let i = 0; i < 3; i++) reordered.push([...grid[b * 3 + i]]);
    }
    grid = reordered;

    const stackOrder = rng.shuffle([0, 1, 2]);
    for (let row = 0; row < 9; row++) {
      const newRow: number[] = [];
      for (const s of stackOrder) {
        for (let i = 0; i < 3; i++) newRow.push(grid[row][s * 3 + i]);
      }
      grid[row] = newRow;
    }

    const solution = grid.map((row) => [...row]);

    const positions: [number, number][] = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) positions.push([r, c]);
    }
    const shuffled = rng.shuffle(positions);
    const toRemove = 40 + rng.nextInt(11);

    const board = solution.map((row) => [...row]);
    for (let i = 0; i < toRemove; i++) {
      const [r, c] = shuffled[i];
      board[r][c] = 0;
    }

    return { board, solution };
  }

  validateMove(
    solution: number[][],
    row: number,
    col: number,
    value: number,
  ): boolean {
    return solution[row][col] === value;
  }
}
