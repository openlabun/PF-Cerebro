export interface GameSession {
  _id?: string;
  usuarioID: string;
  juegoId: string;
  puntaje: number;
  resultado: string; // victoria | derrota | empate
  cambioElo: number;
  jugadoEn: string; // ISO date
}
