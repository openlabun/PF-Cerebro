import {
  cloneBoard,
  createPuzzle,
  generateSolution,
  getDifficultyByKey,
} from './sudoku.js'

function createLegacyBackendRandom(seed = 1) {
  let state = (((Number(seed) % 2147483646) + 2147483646) % 2147483646) + 1

  return {
    next() {
      state = (state * 16807) % 2147483647
      return (state - 1) / 2147483646
    },
    nextInt(max) {
      return Math.floor(this.next() * max)
    },
    shuffle(values) {
      const result = [...values]
      for (let index = result.length - 1; index > 0; index -= 1) {
        const target = this.nextInt(index + 1)
        ;[result[index], result[target]] = [result[target], result[index]]
      }
      return result
    },
  }
}

function generateLegacyPvpBoard(seed) {
  const rng = createLegacyBackendRandom(seed)

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
  ]

  const digits = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])
  let grid = base.map((row) => row.map((value) => digits[value - 1]))

  for (let band = 0; band < 3; band += 1) {
    const indices = rng.shuffle([0, 1, 2])
    const rows = indices.map((index) => grid[band * 3 + index])
    for (let offset = 0; offset < 3; offset += 1) {
      grid[band * 3 + offset] = rows[offset]
    }
  }

  for (let stack = 0; stack < 3; stack += 1) {
    const indices = rng.shuffle([0, 1, 2])
    for (let row = 0; row < 9; row += 1) {
      const cols = indices.map((index) => grid[row][stack * 3 + index])
      for (let offset = 0; offset < 3; offset += 1) {
        grid[row][stack * 3 + offset] = cols[offset]
      }
    }
  }

  const bandOrder = rng.shuffle([0, 1, 2])
  const reordered = []
  for (const band of bandOrder) {
    for (let offset = 0; offset < 3; offset += 1) {
      reordered.push([...grid[band * 3 + offset]])
    }
  }
  grid = reordered

  const stackOrder = rng.shuffle([0, 1, 2])
  for (let row = 0; row < 9; row += 1) {
    const nextRow = []
    for (const stack of stackOrder) {
      for (let offset = 0; offset < 3; offset += 1) {
        nextRow.push(grid[row][stack * 3 + offset])
      }
    }
    grid[row] = nextRow
  }

  const solution = cloneBoard(grid)
  const positions = []
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      positions.push([row, col])
    }
  }

  const shuffled = rng.shuffle(positions)
  const toRemove = 40 + rng.nextInt(11)
  const puzzle = cloneBoard(solution)
  for (let index = 0; index < toRemove; index += 1) {
    const [row, col] = shuffled[index]
    puzzle[row][col] = 0
  }

  return { puzzle, solution }
}

export function generatePvpBoard(seed, difficultyKey = '') {
  const difficulty = getDifficultyByKey(difficultyKey)
  if (!difficultyKey) {
    return generateLegacyPvpBoard(seed)
  }

  const solution = generateSolution(seed)
  const puzzle = createPuzzle(solution, difficulty.holes, seed)
  return { puzzle, solution }
}
