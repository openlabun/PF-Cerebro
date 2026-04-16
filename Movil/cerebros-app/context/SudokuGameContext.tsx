import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
} from 'react';

import { clearNotesCell, createEmptyNotes, toggleNote, type SudokuBoard, type SudokuNotes } from '@/services';

export type SudokuSelectedCell = {
  row: number;
  col: number;
};

export type SudokuCellErrors = Record<string, boolean>;

export type SudokuEditableState = {
  editable: boolean;
  message?: string;
};

export type SudokuErrorMode = 'solution' | 'tracked' | 'none';

export type SudokuEditableRuleParams = {
  row: number;
  col: number;
  puzzle: SudokuBoard;
  solution: SudokuBoard;
  board: SudokuBoard;
  notes: SudokuNotes;
  selectedCell: SudokuSelectedCell | null;
  noteMode: boolean;
  cellErrors: SudokuCellErrors;
};

export type SudokuGameHydration = {
  puzzle?: SudokuBoard;
  solution?: SudokuBoard;
  board?: SudokuBoard;
  notes?: SudokuNotes;
  selectedCell?: SudokuSelectedCell | null;
  noteMode?: boolean;
  highlightEnabled?: boolean;
  cellErrors?: SudokuCellErrors;
};

export type SudokuGameContextValue = {
  puzzle: SudokuBoard;
  solution: SudokuBoard;
  board: SudokuBoard;
  notes: SudokuNotes;
  selectedCell: SudokuSelectedCell | null;
  selectedValue: number;
  noteMode: boolean;
  highlightEnabled: boolean;
  cellErrors: SudokuCellErrors;
  status: string;
  statusOk: boolean;
  hydrateGame: (game: SudokuGameHydration) => void;
  setPuzzle: Dispatch<SetStateAction<SudokuBoard>>;
  setSolution: Dispatch<SetStateAction<SudokuBoard>>;
  setBoard: Dispatch<SetStateAction<SudokuBoard>>;
  setNotes: Dispatch<SetStateAction<SudokuNotes>>;
  setSelectedCell: Dispatch<SetStateAction<SudokuSelectedCell | null>>;
  setNoteMode: Dispatch<SetStateAction<boolean>>;
  setHighlightEnabled: Dispatch<SetStateAction<boolean>>;
  setCellErrors: Dispatch<SetStateAction<SudokuCellErrors>>;
  setStatus: (message: string, ok?: boolean) => void;
  clearSelectedCell: () => boolean;
  toggleSelectedNote: (num: number) => boolean;
  markCellError: (row: number, col: number, isError?: boolean) => void;
  clearCellError: (row: number, col: number) => void;
  isCellError: (row: number, col: number, value: number) => boolean;
  resolveEditableState: (row: number, col: number) => SudokuEditableState;
};

type SudokuGameProviderProps = PropsWithChildren<{
  errorMode?: SudokuErrorMode;
  getEditableState?: (params: SudokuEditableRuleParams) => SudokuEditableState;
}>;

const SudokuGameContext = createContext<SudokuGameContextValue | undefined>(undefined);

export function cloneNotes(notes: SudokuNotes): SudokuNotes {
  return notes.map((row) => row.map((cell) => new Set<number>(cell)));
}

export function formatSudokuTime(totalSeconds: number) {
  const seconds = Math.max(0, Number(totalSeconds) || 0);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export function noteViolatesCurrentBoard(
  board: SudokuBoard,
  row: number,
  col: number,
  num: number,
) {
  for (let currentCol = 0; currentCol < 9; currentCol += 1) {
    if (currentCol !== col && board[row]?.[currentCol] === num) return 'ya existe en la fila';
  }

  for (let currentRow = 0; currentRow < 9; currentRow += 1) {
    if (currentRow !== row && board[currentRow]?.[col] === num) return 'ya existe en la columna';
  }

  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;

  for (let currentRow = startRow; currentRow < startRow + 3; currentRow += 1) {
    for (let currentCol = startCol; currentCol < startCol + 3; currentCol += 1) {
      if (currentRow === row && currentCol === col) continue;
      if (board[currentRow]?.[currentCol] === num) return 'ya existe en el bloque 3x3';
    }
  }

  return null;
}

function defaultEditableRule({ row, col, puzzle }: SudokuEditableRuleParams): SudokuEditableState {
  if (puzzle[row]?.[col] !== 0) {
    return { editable: false, message: 'No puedes modificar una celda fija.' };
  }

  return { editable: true, message: '' };
}

function getCellKey(row: number, col: number) {
  return `${row}-${col}`;
}

export function SudokuGameProvider({
  children,
  errorMode = 'solution',
  getEditableState = defaultEditableRule,
}: SudokuGameProviderProps) {
  const [puzzle, setPuzzle] = useState<SudokuBoard>([]);
  const [solution, setSolution] = useState<SudokuBoard>([]);
  const [board, setBoard] = useState<SudokuBoard>([]);
  const [notes, setNotes] = useState<SudokuNotes>(() => createEmptyNotes());
  const [selectedCell, setSelectedCell] = useState<SudokuSelectedCell | null>(null);
  const [noteMode, setNoteMode] = useState(false);
  const [highlightEnabled, setHighlightEnabled] = useState(true);
  const [cellErrors, setCellErrors] = useState<SudokuCellErrors>({});
  const [status, setStatus] = useState('');
  const [statusOk, setStatusOk] = useState(false);

  function setGameStatus(message: string, ok = false) {
    setStatus(message);
    setStatusOk(ok);
  }

  function hydrateGame({
    puzzle: nextPuzzle = [],
    solution: nextSolution = [],
    board: nextBoard = [],
    notes: nextNotes = createEmptyNotes(),
    selectedCell: nextSelectedCell = null,
    noteMode: nextNoteMode = false,
    highlightEnabled: nextHighlightEnabled = true,
    cellErrors: nextCellErrors = {},
  }: SudokuGameHydration) {
    setPuzzle(nextPuzzle);
    setSolution(nextSolution);
    setBoard(nextBoard);
    setNotes(nextNotes);
    setSelectedCell(nextSelectedCell);
    setNoteMode(nextNoteMode);
    setHighlightEnabled(nextHighlightEnabled);
    setCellErrors(nextCellErrors);
  }

  function getSelectedValue() {
    if (!selectedCell) return 0;
    return board[selectedCell.row]?.[selectedCell.col] || 0;
  }

  function resolveEditableState(row: number, col: number) {
    return getEditableState({
      row,
      col,
      puzzle,
      solution,
      board,
      notes,
      selectedCell,
      noteMode,
      cellErrors,
    });
  }

  function clearCellError(row: number, col: number) {
    const cellKey = getCellKey(row, col);

    setCellErrors((current) => {
      if (!current[cellKey]) return current;

      const next = { ...current };
      delete next[cellKey];
      return next;
    });
  }

  function markCellError(row: number, col: number, isError = true) {
    const cellKey = getCellKey(row, col);

    setCellErrors((current) => {
      if (!isError) {
        if (!current[cellKey]) return current;

        const next = { ...current };
        delete next[cellKey];
        return next;
      }

      return {
        ...current,
        [cellKey]: true,
      };
    });
  }

  function clearSelectedCell() {
    if (!selectedCell) return false;

    const { row, col } = selectedCell;
    const editableState = resolveEditableState(row, col);

    if (!editableState.editable) {
      setGameStatus(editableState.message || 'No puedes modificar esta celda.');
      return false;
    }

    setBoard((currentBoard) => {
      const nextBoard = currentBoard.map((line) => [...line]);
      if (nextBoard[row]) {
        nextBoard[row][col] = 0;
      }
      return nextBoard;
    });
    setNotes((currentNotes) => {
      const nextNotes = cloneNotes(currentNotes);
      clearNotesCell(nextNotes, row, col);
      return nextNotes;
    });
    clearCellError(row, col);
    setGameStatus('Celda borrada');
    return true;
  }

  function toggleSelectedNote(num: number) {
    if (!selectedCell || board.length === 0) return false;

    const { row, col } = selectedCell;
    const editableState = resolveEditableState(row, col);

    if (!editableState.editable) {
      setGameStatus(editableState.message || 'No puedes agregar notas en esta celda.');
      return false;
    }

    const invalidReason = noteViolatesCurrentBoard(board, row, col, num);

    if (invalidReason) {
      setGameStatus(`No puedes agregar la nota ${num}: ${invalidReason}.`);
      return false;
    }

    setNotes((currentNotes) => {
      const nextNotes = cloneNotes(currentNotes);
      const result = toggleNote(nextNotes, board, row, col, num);

      if (!result.ok) {
        setGameStatus(result.message || 'No se pudo actualizar la nota.');
        return currentNotes;
      }

      setGameStatus(result.action === 'added' ? `Nota ${num} agregada.` : `Nota ${num} eliminada.`);
      return nextNotes;
    });

    return true;
  }

  function isCellError(row: number, col: number, value: number) {
    if (value === 0) return false;

    if (errorMode === 'tracked') {
      return Boolean(cellErrors[getCellKey(row, col)]);
    }

    if (errorMode === 'solution') {
      const isPrefilled = puzzle[row]?.[col] !== 0;
      return !isPrefilled && solution[row]?.[col] !== value;
    }

    return false;
  }

  const value: SudokuGameContextValue = useMemo(
    () => ({
      puzzle,
      solution,
      board,
      notes,
      selectedCell,
      selectedValue: getSelectedValue(),
      noteMode,
      highlightEnabled,
      cellErrors,
      status,
      statusOk,
      hydrateGame,
      setPuzzle,
      setSolution,
      setBoard,
      setNotes,
      setSelectedCell,
      setNoteMode,
      setHighlightEnabled,
      setCellErrors,
      setStatus: setGameStatus,
      clearSelectedCell,
      toggleSelectedNote,
      markCellError,
      clearCellError,
      isCellError,
      resolveEditableState,
    }),
    [
      board,
      cellErrors,
      highlightEnabled,
      noteMode,
      notes,
      puzzle,
      selectedCell,
      solution,
      status,
      statusOk,
    ],
  );

  return <SudokuGameContext.Provider value={value}>{children}</SudokuGameContext.Provider>;
}

export function useSudokuGame() {
  const context = useContext(SudokuGameContext);

  if (!context) {
    throw new Error('useSudokuGame must be used within SudokuGameProvider');
  }

  return context;
}
