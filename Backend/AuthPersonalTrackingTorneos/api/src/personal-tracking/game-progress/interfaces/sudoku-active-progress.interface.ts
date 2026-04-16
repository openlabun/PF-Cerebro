export type SudokuCellCoord = {
  row: number;
  col: number;
};

export type SudokuProgressSnapshot = {
  difficultyKey: string;
  difficultyLabel: string;
  board: number[][];
  puzzle: number[][];
  solution: number[][];
  notes: number[][][];
  selectedCell?: SudokuCellCoord | null;
  noteMode: boolean;
  highlightEnabled: boolean;
  paused: boolean;
  completed: boolean;
  seconds: number;
  errorCount: number;
  hintsUsed: number;
  hintsRemaining: number;
  hintLimit: number;
  seed?: number | string | null;
  seedId?: string | null;
  statusMessage?: string;
};

export interface SudokuActiveProgressRecord {
  _id?: string;
  usuarioID: string;
  juegoId: string;
  estado: 'activa' | 'completada' | 'descartada';
  snapshot: SudokuProgressSnapshot | string;
  creadaEn?: string;
  ultimaActi?: string;
  creadoEn?: string;
  actualizadoEn?: string;
  ultimaActividadEn?: string;
  cerradoEn?: string;
  createdAt?: string;
  updatedAt?: string;
  lastActivityAt?: string;
  closedAt?: string;
}
