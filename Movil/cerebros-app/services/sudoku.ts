export type SudokuValue = number;
export type SudokuBoard = SudokuValue[][];
export type SudokuNotes = Set<number>[][];

export type ToggleNoteResult =
  | { ok: true; action: 'added' | 'removed' }
  | { ok: false; message: string };

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
