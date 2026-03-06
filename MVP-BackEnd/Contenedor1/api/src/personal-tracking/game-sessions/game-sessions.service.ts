import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { RobleService } from '../../roble/roble.service';
import { GameStatsService } from '../game-stats/game-stats.service';
import type { GameSession } from './interfaces/game-session.interface';

@Injectable()
export class GameSessionsService {
  private readonly logger = new Logger(GameSessionsService.name);

  constructor(
    private readonly robleService: RobleService,
    private readonly gameStatsService: GameStatsService,
  ) {}

  async createSession(
    usuarioID: string,
    juegoId: string,
    puntaje: number,
    resultado: string,
    cambioElo: number,
    accessToken: string,
  ): Promise<GameSession> {
    const session: GameSession = {
      usuarioID,
      juegoId,
      puntaje: Number(puntaje),
      resultado,
      cambioElo: Number(cambioElo),
      jugadoEn: new Date().toISOString(),
    };

    try {
      this.logger.log(
        `Creando sesión: usuarioId=${usuarioID}, juegoId=${juegoId}, puntaje=${puntaje}, resultado=${resultado}, cambioElo=${cambioElo}`,
      );

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

      await this.updateStatsAfterMatch(
        usuarioID,
        juegoId,
        resultado,
        Number(cambioElo),
        accessToken,
      );

      return resp.inserted[0];
    } catch (error) {
      this.logger.error('Error real al crear sesión', error instanceof Error ? error.stack : String(error));

      if (error instanceof HttpException) {
        throw error;
      }

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

    if (!stats?._id) {
      throw new HttpException(
        'Las estadísticas no tienen _id válido',
        HttpStatus.BAD_REQUEST,
      );
    }

    const updates = {
      partidasJugadas: Number(stats.partidasJugadas ?? 0) + 1,
      elo: Number(stats.elo ?? 0) + Number(cambioElo ?? 0),
      victorias:
        resultado === 'victoria'
          ? Number(stats.victorias ?? 0) + 1
          : Number(stats.victorias ?? 0),
      derrotas:
        resultado === 'derrota'
          ? Number(stats.derrotas ?? 0) + 1
          : Number(stats.derrotas ?? 0),
      empates:
        resultado === 'empate'
          ? Number(stats.empates ?? 0) + 1
          : Number(stats.empates ?? 0),
    };

    this.logger.log(
      `Actualizando stats _id=${stats._id} con ${JSON.stringify(updates)}`,
    );

    await this.robleService.update(
      accessToken,
      'EstadisticasJuegoUsuario',
      '_id',
      stats._id,
      updates,
    );
  }
}