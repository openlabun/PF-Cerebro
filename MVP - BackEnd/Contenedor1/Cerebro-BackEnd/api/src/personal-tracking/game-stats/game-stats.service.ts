import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { RobleService } from '../../roble/roble.service';
import type { GameStat } from './interfaces/game-stat.interface';

@Injectable()
export class GameStatsService {
  constructor(private readonly robleService: RobleService) {}

  async getStats(
    usuarioId: string,
    juegoId: string,
    accessToken: string,
  ): Promise<GameStat | null> {
    try {
      const stats: GameStat[] = await this.robleService.read<GameStat>(
        accessToken,
        'EstadisticasJuegoUsuario',
        { usuarioId, juegoId },
      );

      if (!stats || stats.length === 0) {
        return null;
      }

      return {
        ...stats[0],
        elo: Number(stats[0].elo),
        partidasJugadas: Number(stats[0].partidasJugadas),
        victorias: Number(stats[0].victorias),
        derrotas: Number(stats[0].derrotas),
        empates: Number(stats[0].empates),
      };
    } catch {
      throw new HttpException(
        'Error al consultar estadísticas',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createIfNotExists(
    usuarioId: string,
    juegoId: string,
    accessToken: string,
  ): Promise<GameStat> {
    const existing = await this.getStats(usuarioId, juegoId, accessToken);

    if (existing) {
      return existing;
    }

    const newRecord: GameStat = {
      usuarioId,
      juegoId,
      elo: 1000,
      partidasJugadas: 0,
      victorias: 0,
      derrotas: 0,
      empates: 0,
      ligaId: null,
    };

    const resp = await this.robleService.insert<GameStat>(
      accessToken,
      'EstadisticasJuegoUsuario',
      [newRecord],
    );

    if (resp.inserted && resp.inserted.length > 0) {
      return resp.inserted[0];
    }

    throw new HttpException(
      'No se pudo crear estadísticas',
      HttpStatus.BAD_REQUEST,
    );
  }

  async updateStats(
    usuarioId: string,
    juegoId: string,
    updates: Partial<GameStat>,
    accessToken: string,
  ): Promise<GameStat> {
    try {
      return await this.robleService.update<GameStat>(
        accessToken,
        'EstadisticasJuegoUsuario',
        '_id',
        (await this.getStats(usuarioId, juegoId, accessToken))!._id!,
        updates,
      );
    } catch {
      throw new HttpException(
        'Error al actualizar estadísticas',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
