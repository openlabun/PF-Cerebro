// =====================================
// RNG con seed (Mulberry32)
// =====================================

function mulberry32(seed) {
    return function() {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

// Shuffle Fisher-Yates determinístico
function shuffle(array, random) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// =====================================
// Dancing Links Nodes
// =====================================

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

// =====================================
// Dancing Links
// =====================================

class DancingLinks {
    constructor(matrix, columnNames, randomFunc = Math.random) {
        this.header = new ColumnNode("header");
        this.columns = [];
        this.solution = [];
        this.random = randomFunc;

        let prev = this.header;

        for (let name of columnNames) {
            let col = new ColumnNode(name);
            this.columns.push(col);
            prev.right = col;
            col.left = prev;
            prev = col;
        }

        prev.right = this.header;
        this.header.left = prev;

        for (let row of matrix) {
            let first = null;

            for (let colIndex of row) {
                let col = this.columns[colIndex];
                let node = new Node();
                node.column = col;

                // Vertical
                node.down = col;
                node.up = col.up;
                col.up.down = node;
                col.up = node;
                col.size++;

                // Horizontal
                if (!first) {
                    first = node;
                } else {
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
                node.column.size--;
            }
        }
    }

    uncover(col) {
        for (let row = col.up; row !== col; row = row.up) {
            for (let node = row.left; node !== row; node = node.left) {
                node.column.size++;
                node.down.up = node;
                node.up.down = node;
            }
        }

        col.right.left = col;
        col.left.right = col;
    }

    search(limit = 1) {
        if (this.header.right === this.header) {
            return 1;
        }

        // columna con menos nodos
        let col = this.header.right;
        let min = col.size;

        for (let temp = col.right; temp !== this.header; temp = temp.right) {
            if (temp.size < min) {
                col = temp;
                min = temp.size;
            }
        }

        this.cover(col);

        let rows = [];
        for (let row = col.down; row !== col; row = row.down) {
            rows.push(row);
        }

        shuffle(rows, this.random);

        let solutions = 0;

        for (let row of rows) {
            this.solution.push(row);

            for (let node = row.right; node !== row; node = node.right) {
                this.cover(node.column);
            }

            solutions += this.search(limit);

            if (solutions >= limit) return solutions;

            this.solution.pop();

            for (let node = row.left; node !== row; node = node.left) {
                this.uncover(node.column);
            }
        }

        this.uncover(col);
        return solutions;
    }
}

// =====================================
// Sudoku Exact Cover
// =====================================

function sudokuExactCover(board = null) {
    let matrix = [];

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            for (let n = 0; n < 9; n++) {

                if (board && board[r][c] !== 0 && board[r][c] !== n + 1)
                    continue;

                let row = [];

                row.push(r * 9 + c);
                row.push(81 + r * 9 + n);
                row.push(162 + c * 9 + n);

                let block = Math.floor(r / 3) * 3 + Math.floor(c / 3);
                row.push(243 + block * 9 + n);

                matrix.push(row);
            }
        }
    }

    return matrix;
}

// =====================================
// Resolver
// =====================================

function resolverSudoku(board) {
    let matrix = sudokuExactCover(board);
    let columns = Array.from({ length: 324 }, (_, i) => i);
    let dlx = new DancingLinks(matrix, columns);

    dlx.search();

    return construirTableroDesdeSolucion(dlx.solution);
}

function construirTableroDesdeSolucion(solution) {
    let board = Array.from({ length: 9 }, () => Array(9).fill(0));

    for (let row of solution) {
        let cols = [];
        let node = row;

        do {
            cols.push(node.column.name);
            node = node.right;
        } while (node !== row);

        let cell = cols.find(c => c < 81);
        let rowNum = cols.find(c => c >= 81 && c < 162);

        let r = Math.floor(cell / 9);
        let c = cell % 9;
        let n = (rowNum - 81) % 9 + 1;

        board[r][c] = n;
    }

    return board;
}

// =====================================
// Generar solución con SEED
// =====================================

function generarSolucion(seed = 1234) {
    let random = mulberry32(seed);

    let matrix = sudokuExactCover();
    let columns = Array.from({ length: 324 }, (_, i) => i);

    let dlx = new DancingLinks(matrix, columns, random);
    dlx.search();

    return construirTableroDesdeSolucion(dlx.solution);
}

// =====================================
// Verificar solución única
// =====================================

function tieneSolucionUnica(board) {
    let matrix = sudokuExactCover(board);
    let columns = Array.from({ length: 324 }, (_, i) => i);
    let dlx = new DancingLinks(matrix, columns);

    return dlx.search(2) === 1;
}

// =====================================
// Crear puzzle con SEED
// =====================================

function crearPuzzle(board, vacios = 40, seed = 1234) {
  let random = mulberry32(seed);
  let puzzle = board.map(row => [...row]);

  let removed = 0;
  const maxTries = vacios * 500; // ajusta si quieres (más = más lento, pero más probable llegar)
  let tries = 0;

  while (removed < vacios && tries < maxTries) {
    tries++;

    let r = Math.floor(random() * 9);
    let c = Math.floor(random() * 9);

    if (puzzle[r][c] === 0) continue;

    let temp = puzzle[r][c];
    puzzle[r][c] = 0;

    if (!tieneSolucionUnica(puzzle)) {
      puzzle[r][c] = temp;
    } else {
      removed++;
    }
  }

  // Si no se pudo llegar a 'vacios', devuelve lo mejor que se logró sin colgarse
  // (opcional) console.log(`Se removieron ${removed}/${vacios} en ${tries} intentos`);
  return puzzle;
}

//=====================================
//Analisis de dificultad
//=====================================

function analizarDificultad(board) {
  let stats = {
    single: 0,
    hiddenSingle: 0,
    nakedPair: 0,
    nakedTriple: 0,
    xwing: 0,
    backtracking: 0
  };

  let working = board.map(r => [...r]);

  function getCandidatesGrid() {
    let grid = Array.from({ length: 9 }, () =>
      Array.from({ length: 9 }, () => [])
    );

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (working[r][c] === 0) {
          grid[r][c] = obtenerCandidatos(working, r, c);
        }
      }
    }
    return grid;
  }

  // 🔒 Safety: evita loops infinitos por lógica/casos raros
  const MAX_ITERS = 200;
  let iter = 0;

  let progreso = true;

  while (progreso && iter < MAX_ITERS) {
    iter++;
    progreso = false;

    let candidates = getCandidatesGrid();

    // ==============================
    // Single Candidate (sí cambia working)
    // ==============================
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (working[r][c] === 0 && candidates[r][c].length === 1) {
          working[r][c] = candidates[r][c][0];
          stats.single++;
          progreso = true; // ✅ solo cuando hay número colocado
        }
      }
    }

    // recalcular candidatos luego de colocar singles
    candidates = getCandidatesGrid();

    // ==============================
    // Hidden Single (sí cambia working)
    // ==============================
    function hiddenSingleUnidad(celdas) {
      let conteo = {};
      for (let [r, c] of celdas) {
        for (let n of candidates[r][c]) {
          conteo[n] = conteo[n] ? conteo[n] + 1 : 1;
        }
      }

      for (let n in conteo) {
        if (conteo[n] === 1) {
          for (let [r, c] of celdas) {
            if (candidates[r][c].includes(Number(n))) {
              working[r][c] = Number(n);
              stats.hiddenSingle++;
              return true;
            }
          }
        }
      }
      return false;
    }

    // Filas
    for (let r = 0; r < 9; r++) {
      let celdas = [];
      for (let c = 0; c < 9; c++)
        if (working[r][c] === 0) celdas.push([r, c]);

      if (hiddenSingleUnidad(celdas)) progreso = true;
    }

    // Columnas
    for (let c = 0; c < 9; c++) {
      let celdas = [];
      for (let r = 0; r < 9; r++)
        if (working[r][c] === 0) celdas.push([r, c]);

      if (hiddenSingleUnidad(celdas)) progreso = true;
    }

    // Bloques
    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        let celdas = [];
        for (let r = br * 3; r < br * 3 + 3; r++) {
          for (let c = bc * 3; c < bc * 3 + 3; c++) {
            if (working[r][c] === 0) celdas.push([r, c]);
          }
        }
        if (hiddenSingleUnidad(celdas)) progreso = true;
      }
    }

    // =====================================================
    // A PARTIR DE AQUÍ: técnicas que SOLO eliminan candidatos
    // ❗ NO deben poner progreso=true, porque candidates se regenera
    // =====================================================

    candidates = getCandidatesGrid();

    // ==============================
    // Naked Pair (solo conteo)
    // ==============================
    function nakedPairUnidad(celdas) {
      let pares = {};

      for (let [r, c] of celdas) {
        if (candidates[r][c].length === 2) {
          let key = candidates[r][c].join("-");
          pares[key] = pares[key] ? pares[key].concat([[r, c]]) : [[r, c]];
        }
      }

      for (let key in pares) {
        if (pares[key].length === 2) {
          stats.nakedPair++; // ✅ contamos, pero NO cambiamos working
        }
      }
    }

    for (let r = 0; r < 9; r++) {
      let celdas = [];
      for (let c = 0; c < 9; c++) if (working[r][c] === 0) celdas.push([r, c]);
      nakedPairUnidad(celdas);
    }

    for (let c = 0; c < 9; c++) {
      let celdas = [];
      for (let r = 0; r < 9; r++) if (working[r][c] === 0) celdas.push([r, c]);
      nakedPairUnidad(celdas);
    }

    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        let celdas = [];
        for (let r = br * 3; r < br * 3 + 3; r++)
          for (let c = bc * 3; c < bc * 3 + 3; c++)
            if (working[r][c] === 0) celdas.push([r, c]);
        nakedPairUnidad(celdas);
      }
    }

    // ==============================
    // Naked Triple (solo conteo)
    // ==============================
    function nakedTripleUnidad(celdas) {
      if (celdas.length < 3) return;

      const candCeldas = celdas
        .map(([r, c]) => ({ r, c, cand: candidates[r][c] }))
        .filter(x => x.cand.length >= 2 && x.cand.length <= 3);

      if (candCeldas.length < 3) return;

      const esSubconjunto = (arr, sup) => arr.every(v => sup.includes(v));

      for (let i = 0; i < candCeldas.length; i++) {
        for (let j = i + 1; j < candCeldas.length; j++) {
          for (let k = j + 1; k < candCeldas.length; k++) {
            const a = candCeldas[i];
            const b = candCeldas[j];
            const d = candCeldas[k];

            const union = Array.from(new Set([...a.cand, ...b.cand, ...d.cand]));
            if (union.length !== 3) continue;

            if (!esSubconjunto(a.cand, union) || !esSubconjunto(b.cand, union) || !esSubconjunto(d.cand, union)) {
              continue;
            }

            stats.nakedTriple++; // ✅ contamos, pero NO cambiamos working
          }
        }
      }
    }

    for (let r = 0; r < 9; r++) {
      let celdas = [];
      for (let c = 0; c < 9; c++) if (working[r][c] === 0) celdas.push([r, c]);
      nakedTripleUnidad(celdas);
    }

    for (let c = 0; c < 9; c++) {
      let celdas = [];
      for (let r = 0; r < 9; r++) if (working[r][c] === 0) celdas.push([r, c]);
      nakedTripleUnidad(celdas);
    }

    for (let br = 0; br < 3; br++) {
      for (let bc = 0; bc < 3; bc++) {
        let celdas = [];
        for (let r = br * 3; r < br * 3 + 3; r++)
          for (let c = bc * 3; c < bc * 3 + 3; c++)
            if (working[r][c] === 0) celdas.push([r, c]);
        nakedTripleUnidad(celdas);
      }
    }

    // ==============================
    // X-Wing (solo conteo)
    // ==============================
    for (let n = 1; n <= 9; n++) {
      let filas = {};

      for (let r = 0; r < 9; r++) {
        let cols = [];
        for (let c = 0; c < 9; c++)
          if (working[r][c] === 0 && candidates[r][c].includes(n)) cols.push(c);

        if (cols.length === 2) filas[r] = cols;
      }

      let filasKeys = Object.keys(filas);

      for (let i = 0; i < filasKeys.length; i++) {
        for (let j = i + 1; j < filasKeys.length; j++) {
          let r1 = filasKeys[i];
          let r2 = filasKeys[j];

          if (filas[r1][0] === filas[r2][0] && filas[r1][1] === filas[r2][1]) {
            stats.xwing++; // ✅ contamos, pero NO cambiamos working
          }
        }
      }
    }
  }

  // si todavía quedan ceros, asumimos que tocaría backtracking
  if (working.flat().includes(0)) stats.backtracking++;

  return stats;
}
//=====================================
//Clasificacion de dificultad 
//=====================================
function evaluarDificultad(board) {

    const stats = analizarDificultad(board);

    const huecos = board.flat().filter(x => x === 0).length;

    // Sistema de puntuación ponderado
    const score =
        stats.single * 1 +
        stats.hiddenSingle * 2 +
        stats.nakedPair * 6 +
        stats.nakedTriple * 12 +
        stats.xwing * 25 +
        stats.backtracking * 100;

    let nivel = "";

    // Clasificación principal por técnica más avanzada
    if (stats.backtracking > 0) {
        nivel = "Profesional";
    }
    else if (stats.xwing > 0) {
        nivel = "Experto";
    }
    else if (stats.nakedTriple > 0) {
        nivel = "Avanzado";
    }
    else if (stats.nakedPair > 0) {
        nivel = "Intermedio";
    }
    else if (stats.hiddenSingle > 0) {
        nivel = "Iniciado";
    }
    else {
        nivel = "Principiante";
    }

    //  Ajuste fino por cantidad de huecos
    if (nivel === "Principiante" && huecos > 40) {
        nivel = "Iniciado";
    }

    return {
        dificultad: nivel,
        score: score,
        huecos: huecos,
        estadisticas: stats
    };
}


//=====================================
//Obtener candidatos para una celda
//=====================================
function obtenerCandidatos(board, r, c) {
    let usados = new Set();

    for (let i = 0; i < 9; i++) {
        usados.add(board[r][i]);
        usados.add(board[i][c]);
    }

    let br = Math.floor(r/3)*3;
    let bc = Math.floor(c/3)*3;

    for (let i = br; i < br+3; i++) {
        for (let j = bc; j < bc+3; j++) {
            usados.add(board[i][j]);
        }
    }

    let candidatos = [];
    for (let n = 1; n <= 9; n++) {
        if (!usados.has(n)) candidatos.push(n);
    }

    return candidatos;
}



//=====================================
//verificacion de tablero resuelto
//=====================================
function estaResuelto(board) {

    // Verificar que sea matriz 9x9
    if (!Array.isArray(board) || board.length !== 9) return false;

    for (let r = 0; r < 9; r++) {
        if (!Array.isArray(board[r]) || board[r].length !== 9) return false;
    }

    // Verificar que no haya ceros
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (board[r][c] === 0) return false;
        }
    }

    // Función auxiliar para validar conjunto 1-9 sin repetir
    function esValidoGrupo(nums) {
        let set = new Set(nums);
        if (set.size !== 9) return false;

        for (let n of set) {
            if (n < 1 || n > 9) return false;
        }

        return true;
    }

    // Verificar filas
    for (let r = 0; r < 9; r++) {
        if (!esValidoGrupo(board[r])) return false;
    }

    // Verificar columnas
    for (let c = 0; c < 9; c++) {
        let col = [];
        for (let r = 0; r < 9; r++) {
            col.push(board[r][c]);
        }
        if (!esValidoGrupo(col)) return false;
    }

    // Verificar bloques 3x3
    for (let br = 0; br < 3; br++) {
        for (let bc = 0; bc < 3; bc++) {

            let bloque = [];

            for (let r = br * 3; r < br * 3 + 3; r++) {
                for (let c = bc * 3; c < bc * 3 + 3; c++) {
                    bloque.push(board[r][c]);
                }
            }

            if (!esValidoGrupo(bloque)) return false;
        }
    }

    return true;
}

// =====================================
// Clasificar seeds (1..1M) por dificultad
// Devuelve 6 listas: Principiante, Iniciado, Intermedio, Avanzado, Experto, Profesional
// =====================================

function clasificarSeedsPorDificultad({
  huecos,
  porDificultad = 20,     // cuántas seeds quieres por cada dificultad
  masterSeed = 20260224,  // para que la búsqueda sea reproducible
  maxIntentos = 10    // límite para no quedarse eterno
} = {}) {
  if (!Number.isInteger(huecos) || huecos < 0 || huecos > 81) {
    throw new Error("huecos debe ser un entero entre 0 y 81");
  }

  const niveles = ["Principiante", "Iniciado", "Intermedio", "Avanzado", "Experto", "Profesional"];

  const resultado = {
    Principiante: [],
    Iniciado: [],
    Intermedio: [],
    Avanzado: [],
    Experto: [],
    Profesional: []
  };

  // Para no repetir seeds
  const usados = new Set();

  // RNG “global” para ir proponiendo seeds en 1..1,000,000 de forma reproducible
  const pick = mulberry32(masterSeed);

  let intentos = 0;

  function completo() {
    return niveles.every(n => resultado[n].length >= porDificultad);
  }

  while (!completo() && intentos < maxIntentos) {
    intentos++;
    console.log(intentos, "Intentando generar seed...");

    // seed en [1..1,000,000]
    const seed = Math.floor(pick() * 1_000_000) + 1;
    console.log("Probando seed:", seed);

    if (usados.has(seed)) continue;
    usados.add(seed);

    try {
      const solucion = generarSolucion(seed);
      
      const puzzle = crearPuzzle(solucion, huecos, seed);
      
      const evalRes = evaluarDificultad(puzzle); // { dificultad, score, huecos, ... 
      

      const nivel = evalRes.dificultad;
      if (resultado[nivel] && resultado[nivel].length < porDificultad) {
        resultado[nivel].push({ seed, huecos });
      }
    } catch (e) {
      // Si algo falla con esa seed, la saltamos sin romper todo
      continue;
    }
  }

  // opcional: info extra útil
  resultado._meta = {
    huecos,
    porDificultad,
    masterSeed,
    intentos,
    completado: completo()
  };

  return resultado;
}

// =====================
// Ejemplo de uso
// =====================

const listas = clasificarSeedsPorDificultad({ huecos: 45, porDificultad: 5, masterSeed: 50, maxIntentos: 100});
console.log(listas);
//console.log(listas.Principiante.length);

//=====================================
// Generar solución y puzzle con una de las semillas obtenidas
//=====================================
/*
console.log("Solución con seed:", semillasIntermedio[1]);
let solucion = generarSolucion(semillasIntermedio[1]);
console.table(solucion);

console.log("Puzzle con misma seed:");
let puzzle = crearPuzzle(solucion, 40, semillasIntermedio[1]);
console.table(puzzle);

let evaluarTablero = evaluarDificultad(puzzle);
console.log("Evaluación del tablero:", evaluarTablero);

let resultado = estaResuelto(puzzle);
console.log("¿El tablero está resuelto?", resultado);


//=====================
//validar movimiento del usuario
//=====================
function esMovimientoValido(board, row, col, num) {

    if (num < 1 || num > 9) return false;

    // Verificar fila
    for (let c = 0; c < 9; c++) {
        if (board[row][c] === num && c !== col) {
            return false;
        }
    }

    // Verificar columna
    for (let r = 0; r < 9; r++) {
        if (board[r][col] === num && r !== row) {
            return false;
        }
    }

    // Verificar bloque 3x3
    let startRow = Math.floor(row / 3) * 3;
    let startCol = Math.floor(col / 3) * 3;

    for (let r = startRow; r < startRow + 3; r++) {
        for (let c = startCol; c < startCol + 3; c++) {
            if (board[r][c] === num && (r !== row || c !== col)) {
                return false;
            }
        }
    }

    return true;
}

//=====================================
// funcion principal para jugar
//=====================================

//IMPORTANTE: Esta función asume que el tableroActual es una copia del puzzleInicial y que se mantiene actualizado con los movimientos del usuario. El puzzleInicial se utiliza para verificar qué celdas son fijas y no deben ser modificadas.
let tableroActual = puzzle.map(r => [...r]);
function introducirNumero(tableroActual, puzzleInicial, row, col, num) {

    // Validar índices
    if (row < 0 || row > 8 || col < 0 || col > 8) {
        return { ok: false, mensaje: "Posición inválida" };
    }

    //  Verificar que no sea celda original
    if (puzzleInicial[row][col] !== 0) {
        return { ok: false, mensaje: "No puedes modificar una celda fija" };
    }

    // Permitir borrar
    if (num === 0) {
        tableroActual[row][col] = 0;
        return { ok: true, mensaje: "Celda borrada" };
    }

    // Validar rango
    if (num < 1 || num > 9) {
        return { ok: false, mensaje: "Número inválido (1-9)" };
    }

    // Validar reglas Sudoku
    if (!esMovimientoValido(tableroActual, row, col, num)) {
        return { ok: false, mensaje: "Movimiento viola reglas del Sudoku" };
    }

    // Aplicar movimiento
    tableroActual[row][col] = num;

    return { ok: true, mensaje: "Movimiento aplicado" };
}

//=====================================
// Ejemplo de uso de introducirNumero
//=====================================
let response= introducirNumero(tableroActual, puzzle, 4, 2, 3);

if (!response.ok) {
    console.log("Error:", response.mensaje);
} else {
    console.log("valido", response.mensaje);
    console.table(tableroActual);
}
//=====================================
// función para dar pista al usuario
//=====================================

function darPistaAleatoria(tableroActual, tableroSolucion) {

    let diferencias = [];

    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (tableroActual[r][c] !== tableroSolucion[r][c]) {
                diferencias.push([r, c]);
            }
        }
    }

    if (diferencias.length === 0) {
        return { ok: false, mensaje: "El tablero ya está completo" };
    }

    // Elegir celda aleatoria
    let indice = Math.floor(Math.random() * diferencias.length);
    let [r, c] = diferencias[indice];

    tableroActual[r][c] = tableroSolucion[r][c];

    return {
        ok: true,
        row: r,
        col: c,
        valor: tableroSolucion[r][c],
        restantes: diferencias.length - 1
    };
}
//=====================================
// Ejemplo de uso de darPista
//=====================================
let pista = darPistaAleatoria(tableroActual, solucion);

if (pista.ok) {
    console.log("Pista:", pista);
    console.table(tableroActual);
} else {
    console.log("Nada que completar");
}


//======================================
//Notas
//======================================

function crearNotasVacias() {
    return Array.from({ length: 9 }, () =>
        Array.from({ length: 9 }, () => new Set())
    );
}
//======================================
// Función para agregar o eliminar nota en una celda
//======================================
function toggleNota(notas, tableroActual, row, col, num) {

    // Validar posición
    if (row < 0 || row > 8 || col < 0 || col > 8) {
        return { ok: false, mensaje: "Posición inválida" };
    }

    // No permitir notas si ya hay número definitivo
    if (tableroActual[row][col] !== 0) {
        return { ok: false, mensaje: "La celda ya tiene un número fijo" };
    }

    // Validar rango
    if (num < 1 || num > 9) {
        return { ok: false, mensaje: "Las notas deben estar entre 1 y 9" };
    }

    let celdaNotas = notas[row][col];

    // Si ya existe → eliminar
    if (celdaNotas.has(num)) {
        celdaNotas.delete(num);
        return {
            ok: true,
            accion: "eliminada",
            totalNotas: celdaNotas.size
        };
    }

    // Límite máximo 9 notas
    if (celdaNotas.size >= 9) {
        return {
            ok: false,
            mensaje: "Máximo 9 notas por celda"
        };
    }

    // Agregar nota
    //verificar si el número es candidato válido antes de agregarlo como nota
    if (!esMovimientoValido(tableroActual, row, col, num)) {
    return { ok: false, mensaje: "No es candidato válido" };
}
    celdaNotas.add(num);

    return {
        ok: true,
        accion: "agregada",
        totalNotas: celdaNotas.size
    };
}

//=====================================
// limpiar celda (borrar número definitivo o notas)
//=====================================
//IMPORTANTE: SIEMPRE EJECUTAR ESTA FUNCION ANTES DE INTRODUCIR UN NÚMERO DEFINITIVO PARA ASEGURAR QUE LA CELDA ESTÉ LIMPIA DE NOTAS Y NÚMEROS ANTERIORES.
function limpiarNotasCelda(notas, row, col) {

    // Validar posición
    if (row < 0 || row > 8 || col < 0 || col > 8) {
        return { ok: false, mensaje: "Posición inválida" };
    }

    // Limpiar todas las notas
    notas[row][col].clear();

    return {
        ok: true,
        mensaje: "Notas eliminadas",
        totalNotas: 0
    };
}
//=====================================
//imprimir notas
//=====================================
function imprimirNotasComoTablero(notas) {
    for (let fila = 0; fila < 9; fila++) {
        let filaTexto = "";

        for (let col = 0; col < 9; col++) {
            const notasCelda = [...notas[fila][col]].sort((a, b) => a - b);
            
            if (notasCelda.length === 0) {
                filaTexto += "[ ] ";
            } else {
                filaTexto += "[" + notasCelda.join("") + "] ";
            }
        }

        console.log(filaTexto);
    }
}
//=====================================
// Ejemplo de uso de Notas y limpieza de notas relacionadas
//=====================================

//crear notas vacías
let notas = crearNotasVacias();
toggleNota(notas, tableroActual, 0, 2, 7);

let nota = toggleNota(notas, tableroActual, 0, 2, 5);

if (!nota.ok) {
    console.log("Error:", nota.mensaje);
} else {
    console.log("Nota", nota.accion);
}
imprimirNotasComoTablero(notas);
limpiarNotasCelda(notas, 0, 2);
imprimirNotasComoTablero(notas);*/
