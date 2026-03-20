export interface GameSession {
  _id?: string;
  usuarioID: string;
  juegoId: string;
  puntaje: number;
  resultado: string; // victoria | derrota | empate
  cambioElo: number;
  tiempo?: number | string | null;
  idseed?: string | number | null;
  seed?: string | number | null;
  jugadoEn: string; // ISO date
}
