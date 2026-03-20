function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(array, random) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

class Node {
  constructor() {
    this.left = this;
    this.right = this;
    this.up = this;
    this.down = this;
    this.column = null;
  }
}

class ColumnNode extends Node {
  constructor(name) {
    super();
    this.name = name;
    this.size = 0;
  }
}

class DancingLinks {
  constructor(matrix, columnNames, randomFunc = Math.random) {
    this.header = new ColumnNode("header");
    this.columns = [];
    this.solution = [];
    this.random = randomFunc;
    let prev = this.header;
    for (const name of columnNames) {
      const col = new ColumnNode(name);
      this.columns.push(col);
      prev.right = col;
      col.left = prev;
      prev = col;
    }
    prev.right = this.header;
    this.header.left = prev;
    for (const row of matrix) {
      let first = null;
      for (const colIndex of row) {
        const col = this.columns[colIndex];
        const node = new Node();
        node.column = col;
        node.down = col;
        node.up = col.up;
        col.up.down = node;
        col.up = node;
        col.size += 1;
        if (!first) first = node;
        else {
          node.left = first.left;
          node.right = first;
          first.left.right = node;
          first.left = node;
        }
      }
    }
  }

  cover(col) {
    col.right.left = col.left;
    col.left.right = col.right;
    for (let row = col.down; row !== col; row = row.down) {
      for (let node = row.right; node !== row; node = node.right) {
        node.down.up = node.up;
        node.up.down = node.down;
        node.column.size -= 1;
      }
    }
  }

  uncover(col) {
    for (let row = col.up; row !== col; row = row.up) {
      for (let node = row.left; node !== row; node = node.left) {
        node.column.size += 1;
        node.down.up = node;
        node.up.down = node;
      }
    }
    col.right.left = col;
    col.left.right = col;
  }

  search(limit = 1) {
    if (this.header.right === this.header) return 1;
    let col = this.header.right;
    let min = col.size;
    for (let temp = col.right; temp !== this.header; temp = temp.right) {
      if (temp.size < min) {
        col = temp;
        min = temp.size;
      }
    }
    this.cover(col);
    const rows = [];
    for (let row = col.down; row !== col; row = row.down) rows.push(row);
    shuffle(rows, this.random);
    let solutions = 0;
    for (const row of rows) {
      this.solution.push(row);
      for (let node = row.right; node !== row; node = node.right) this.cover(node.column);
      solutions += this.search(limit);
      if (solutions >= limit) return solutions;
      this.solution.pop();
      for (let node = row.left; node !== row; node = node.left) this.uncover(node.column);
    }
    this.uncover(col);
    return solutions;
  }
}

function sudokuExactCover(board = null) {
  const matrix = [];
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      for (let n = 0; n < 9; n += 1) {
        if (board && board[r][c] !== 0 && board[r][c] !== n + 1) continue;
        const row = [];
        row.push(r * 9 + c);
        row.push(81 + r * 9 + n);
        row.push(162 + c * 9 + n);
        const block = Math.floor(r / 3) * 3 + Math.floor(c / 3);
        row.push(243 + block * 9 + n);
        matrix.push(row);
      }
    }
  }
  return matrix;
}

function construirTableroDesdeSolucion(solution) {
  const board = Array.from({ length: 9 }, () => Array(9).fill(0));
  for (const row of solution) {
    const cols = [];
    let node = row;
    do {
      cols.push(node.column.name);
      node = node.right;
    } while (node !== row);
    const cell = cols.find((c) => c < 81);
    const rowNum = cols.find((c) => c >= 81 && c < 162);
    const r = Math.floor(cell / 9);
    const c = cell % 9;
    const n = ((rowNum - 81) % 9) + 1;
    board[r][c] = n;
  }
  return board;
}

export function generarSolucion(seed = 1234) {
  const dlx = new DancingLinks(sudokuExactCover(), Array.from({ length: 324 }, (_, i) => i), mulberry32(seed));
  dlx.search();
  return construirTableroDesdeSolucion(dlx.solution);
}

function tieneSolucionUnica(board) {
  const dlx = new DancingLinks(sudokuExactCover(board), Array.from({ length: 324 }, (_, i) => i));
  return dlx.search(2) === 1;
}

export function crearPuzzle(board, vacios = 40, seed = 1234) {
  const random = mulberry32(seed);
  const puzzle = board.map((row) => [...row]);
  let removed = 0;
  let tries = 0;
  const maxTries = vacios * 100;
  while (removed < vacios && tries < maxTries) {
    tries += 1;
    const r = Math.floor(random() * 9);
    const c = Math.floor(random() * 9);
    if (puzzle[r][c] === 0) continue;
    const temp = puzzle[r][c];
    puzzle[r][c] = 0;
    if (!tieneSolucionUnica(puzzle)) puzzle[r][c] = temp;
    else removed += 1;
  }
  return puzzle;
}

export function estaResuelto(board) {
  const validGroup = (nums) => new Set(nums).size === 9 && nums.every((n) => n >= 1 && n <= 9);
  for (let r = 0; r < 9; r += 1) if (!validGroup(board[r])) return false;
  for (let c = 0; c < 9; c += 1) {
    const col = [];
    for (let r = 0; r < 9; r += 1) col.push(board[r][c]);
    if (!validGroup(col)) return false;
  }
  for (let br = 0; br < 3; br += 1) {
    for (let bc = 0; bc < 3; bc += 1) {
      const block = [];
      for (let r = br * 3; r < br * 3 + 3; r += 1) {
        for (let c = bc * 3; c < bc * 3 + 3; c += 1) block.push(board[r][c]);
      }
      if (!validGroup(block)) return false;
    }
  }
  return !board.flat().includes(0);
}

export function darPistaAleatoria(tableroActual, tableroSolucion) {
  const diferencias = [];
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (tableroActual[r][c] !== tableroSolucion[r][c]) diferencias.push([r, c]);
    }
  }
  if (!diferencias.length) return { ok: false, mensaje: "El tablero ya esta completo" };
  const [r, c] = diferencias[Math.floor(Math.random() * diferencias.length)];
  tableroActual[r][c] = tableroSolucion[r][c];
  return { ok: true, row: r, col: c, valor: tableroSolucion[r][c] };
}

export function crearNotasVacias() {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
}

export function toggleNota(notas, tableroActual, row, col, num) {
  if (tableroActual[row][col] !== 0) return { ok: false, mensaje: "La celda ya tiene un numero fijo" };
  const cellNotes = notas[row][col];
  if (cellNotes.has(num)) {
    cellNotes.delete(num);
    return { ok: true, accion: "eliminada" };
  }
  cellNotes.add(num);
  return { ok: true, accion: "agregada" };
}

export function limpiarNotasCelda(notas, row, col) {
  notas[row][col].clear();
  return { ok: true };
}
