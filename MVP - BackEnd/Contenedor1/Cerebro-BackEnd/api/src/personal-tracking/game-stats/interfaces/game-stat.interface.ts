export interface GameStat {
  _id?: string;
  usuarioId: string;
  juegoId: string;
  elo: number;
  partidasJugadas: number;
  victorias: number;
  derrotas: number;
  empates: number;

  ligaId?: string | null;
}
