export class UpdateGameStatsDto {
  juegoId!: string;
  puntaje!: number;
  resultado!: 'victoria' | 'derrota' | 'empate';
  cambioElo?: number;
  jugadoEn?: string;
}