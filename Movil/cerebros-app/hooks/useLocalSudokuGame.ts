import { useEffect, useRef, useState } from 'react';

import { cloneNotes, noteViolatesCurrentBoard, useSudokuGame } from '@/context';
import {
  calculateProgress,
  calculateScore,
  clearNotesCell,
  countCorrectByNumber,
  createEmptyNotes,
  createPuzzle,
  difficultyLevels,
  generateSolution,
  getDifficultyByKey,
  getHintLimit,
  getRandomHint,
  isBoardSolved,
  type SudokuBoard,
  type SudokuDifficultyLevel,
  type SudokuNotes,
} from '@/services';

function removeCandidateFromPeerNotes(notes: SudokuNotes, row: number, col: number, num: number) {
  for (let currentCol = 0; currentCol < 9; currentCol += 1) {
    if (currentCol !== col) notes[row]?.[currentCol]?.delete(num);
  }

  for (let currentRow = 0; currentRow < 9; currentRow += 1) {
    if (currentRow !== row) notes[currentRow]?.[col]?.delete(num);
  }

  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let currentRow = startRow; currentRow < startRow + 3; currentRow += 1) {
    for (let currentCol = startCol; currentCol < startCol + 3; currentCol += 1) {
      if (currentRow === row && currentCol === col) continue;
      notes[currentRow]?.[currentCol]?.delete(num);
    }
  }
}

function revalidateAllNotes(puzzle: SudokuBoard, board: SudokuBoard, notes: SudokuNotes) {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (puzzle[row]?.[col] !== 0) continue;
      for (const note of Array.from(notes[row]?.[col] ?? [])) {
        if (noteViolatesCurrentBoard(board, row, col, note)) {
          notes[row]?.[col]?.delete(note);
        }
      }
    }
  }
}

function buildGame(difficultyKey: string) {
  const difficulty = getDifficultyByKey(difficultyKey);
  const seed = Math.floor(Math.random() * 1_000_000);
  const solution = generateSolution(seed);
  const puzzle = createPuzzle(solution, difficulty.holes, seed);

  return {
    difficulty,
    seed,
    solution,
    puzzle,
    board: puzzle.map((row) => [...row]),
    notes: createEmptyNotes(),
  };
}

export function useLocalSudokuGame() {
  const [difficultyKey, setDifficultyKey] = useState(difficultyLevels[2].key);
  const [paused, setPaused] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [score, setScore] = useState(0);
  const [seed, setSeed] = useState(0);
  const latestMetricsRef = useRef({ seconds: 0, errorCount: 0, hintsUsed: 0 });
  const difficulty: SudokuDifficultyLevel = getDifficultyByKey(difficultyKey);

  const {
    puzzle,
    solution,
    board,
    selectedCell,
    noteMode,
    highlightEnabled,
    status,
    statusOk,
    hydrateGame,
    setBoard,
    setNotes,
    setNoteMode,
    setHighlightEnabled,
    setStatus,
    clearSelectedCell,
    toggleSelectedNote,
    clearCellError,
    markCellError,
  } = useSudokuGame();

  function startNewGame(nextDifficultyKey = difficultyKey) {
    const nextGame = buildGame(nextDifficultyKey);

    setDifficultyKey(nextDifficultyKey);
    hydrateGame({
      puzzle: nextGame.puzzle,
      solution: nextGame.solution,
      board: nextGame.board,
      notes: nextGame.notes,
      selectedCell: null,
      noteMode: false,
      highlightEnabled: true,
      cellErrors: {},
    });
    setPaused(false);
    setCompleted(false);
    setSeconds(0);
    setErrorCount(0);
    setHintsUsed(0);
    setScore(0);
    setSeed(nextGame.seed);
    latestMetricsRef.current = { seconds: 0, errorCount: 0, hintsUsed: 0 };
    setStatus(
      `Selecciona una celda para comenzar. Limite de pistas: ${getHintLimit(nextGame.difficulty)}.`,
    );
  }

  function finishGame(nextBoard = board) {
    const metrics = latestMetricsRef.current;
    const nextScore = calculateScore({
      puzzle,
      board: nextBoard,
      solution,
      seconds: metrics.seconds,
      errorCount: metrics.errorCount,
      hintsUsed: metrics.hintsUsed,
      difficulty,
    });

    setCompleted(true);
    setScore(nextScore);
    setStatus(
      `Sudoku completado. Puntaje final: ${nextScore} (tiempo: ${metrics.seconds}s, errores: ${metrics.errorCount}, pistas: ${metrics.hintsUsed}).`,
      true,
    );
  }

  function applyValue(num: number, asNote = false) {
    if (!selectedCell || paused || completed) return;

    if (asNote) {
      toggleSelectedNote(num);
      return;
    }

    const { row, col } = selectedCell;
    if (puzzle[row]?.[col] !== 0) {
      setStatus('No puedes modificar una celda fija.');
      return;
    }

    const previousValue = board[row]?.[col] ?? 0;
    const nextBoard = board.map((line) => [...line]);
    if (!nextBoard[row]) return;
    nextBoard[row][col] = num;
    setBoard(nextBoard);

    setNotes((currentNotes) => {
      const nextNotes = cloneNotes(currentNotes);
      clearNotesCell(nextNotes, row, col);

      if (num === solution[row]?.[col]) {
        removeCandidateFromPeerNotes(nextNotes, row, col, num);
        revalidateAllNotes(puzzle, nextBoard, nextNotes);
      }

      return nextNotes;
    });

    if (num !== solution[row]?.[col]) {
      markCellError(row, col, true);

      let nextErrors = latestMetricsRef.current.errorCount;
      if (previousValue !== num) {
        nextErrors += 1;
        latestMetricsRef.current.errorCount = nextErrors;
        setErrorCount(nextErrors);
      }

      setStatus(`Numero incorrecto. Errores: ${nextErrors}.`);
      return;
    }

    clearCellError(row, col);
    setStatus('Movimiento aplicado', true);
  }

  function applyHint() {
    if (paused || completed) return;

    const hintLimit = getHintLimit(difficulty);
    if (hintLimit <= 0) {
      setStatus('Esta dificultad no permite pistas.');
      return;
    }

    if (hintsUsed >= hintLimit) {
      setStatus(`Ya alcanzaste el limite de ${hintLimit} pista(s) para esta dificultad.`);
      return;
    }

    const result = getRandomHint(board, solution, seed + seconds + hintsUsed + 1);
    if (!result.ok) {
      setStatus(result.message);
      return;
    }

    setBoard((currentBoard) => {
      const nextBoard = currentBoard.map((line) => [...line]);
      if (!nextBoard[result.row]) return currentBoard;
      nextBoard[result.row][result.col] = result.value;
      return nextBoard;
    });

    setNotes((currentNotes) => {
      const nextNotes = cloneNotes(currentNotes);
      clearNotesCell(nextNotes, result.row, result.col);
      removeCandidateFromPeerNotes(nextNotes, result.row, result.col, result.value);
      const hintedBoard = board.map((line) => [...line]);
      hintedBoard[result.row][result.col] = result.value;
      revalidateAllNotes(puzzle, hintedBoard, nextNotes);
      return nextNotes;
    });

    clearCellError(result.row, result.col);
    setHintsUsed((current) => current + 1);
    setStatus(`Pista aplicada. Pistas usadas: ${hintsUsed + 1}/${hintLimit}.`, true);
  }

  useEffect(() => {
    startNewGame(difficultyLevels[2].key);
  }, []);

  useEffect(() => {
    latestMetricsRef.current = { seconds, errorCount, hintsUsed };
  }, [seconds, errorCount, hintsUsed]);

  useEffect(() => {
    if (paused || completed || board.length === 0) return undefined;

    const interval = setInterval(() => {
      setSeconds((current) => current + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [paused, completed, board.length]);

  useEffect(() => {
    if (!board.length || completed || !solution.length) return;
    if (!isBoardSolved(board, solution)) return;
    finishGame(board);
  }, [board, completed, solution]);

  const progress = puzzle.length
    ? calculateProgress(puzzle, board, solution)
    : { correct: 0, editable: 0, percentage: 0 };
  const correctCounts = solution.length ? countCorrectByNumber(board, solution) : Array(10).fill(0);
  const hintLimit = getHintLimit(difficulty);

  return {
    difficulty,
    difficultyKey,
    paused,
    completed,
    seconds,
    errorCount,
    hintsUsed,
    score,
    noteMode,
    highlightEnabled,
    status,
    statusOk,
    progress,
    correctCounts,
    hintLimit,
    setPaused,
    setNoteMode,
    setHighlightEnabled,
    startNewGame,
    applyValue,
    applyHint,
    clearSelectedCell,
  };
}
