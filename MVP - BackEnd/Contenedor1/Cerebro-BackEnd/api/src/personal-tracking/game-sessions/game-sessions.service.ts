import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { RobleService } from '../../roble/roble.service';
import { GameStatsService } from '../game-stats/game-stats.service';
import type { GameSession } from './interfaces/game-session.interface';

@Injectable()
export class GameSessionsService {
  constructor(
    private readonly robleService: RobleService,
    private readonly gameStatsService: GameStatsService,
  ) {}

  async createSession(
    usuarioId: string,
    juegoId: string,
    puntaje: number,
    resultado: string,
    cambioElo: number,
    accessToken: string,
  ): Promise<GameSession> {
    const session: GameSession = {
      usuarioId,
      juegoId,
      puntaje,
      resultado,
      cambioElo,
      jugadoEn: new Date().toISOString(),
    };

    try {
      const resp = await this.robleService.insert<GameSession>(
        accessToken,
        'SesionJuego',
        [session],
      );

      if (!resp.inserted || resp.inserted.length === 0) {
        throw new HttpException(
          'No se pudo crear la sesión',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Actualizamos estadísticas automáticamente
      await this.updateStatsAfterMatch(
        usuarioId,
        juegoId,
        resultado,
        cambioElo,
        accessToken,
      );

      return resp.inserted[0];
    } catch {
      throw new HttpException(
        'Error al crear sesión',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async updateStatsAfterMatch(
    usuarioId: string,
    juegoId: string,
    resultado: string,
    cambioElo: number,
    accessToken: string,
  ): Promise<void> {
    const stats = await this.gameStatsService.createIfNotExists(
      usuarioId,
      juegoId,
      accessToken,
    );

    const updates = {
      partidasJugadas: Number(stats.partidasJugadas) + 1,
      elo: Number(stats.elo) + Number(cambioElo),
      victorias:
        resultado === 'victoria'
          ? Number(stats.victorias) + 1
          : Number(stats.victorias),
      derrotas:
        resultado === 'derrota'
          ? Number(stats.derrotas) + 1
          : Number(stats.derrotas),
      empates:
        resultado === 'empate'
          ? Number(stats.empates) + 1
          : Number(stats.empates),
    };

    await this.robleService.update(
      accessToken,
      'EstadisticasJuegoUsuario',
      '_id',
      stats._id!,
      updates,
    );
  }
}
