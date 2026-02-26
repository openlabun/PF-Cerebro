import { Injectable } from '@nestjs/common';
import { RobleService } from '../roble/roble.service';

export interface RankingRecord {
  _id?: string;
  usuarioId: string;
  elo: number;
  victorias: number;
  derrotas: number;
  fechaActualizacion: string;
}

@Injectable()
export class RankingService {
  private readonly TABLE = 'RankingPvP';

  constructor(private readonly roble: RobleService) {}

  private async getLatestRanking(
    usuarioId: string,
    token: string,
  ): Promise<RankingRecord | null> {
    const all = await this.roble.read<RankingRecord>(token, this.TABLE);
    const userRecords = all
      .filter((r) => r.usuarioId === usuarioId)
      .sort(
        (a, b) =>
          new Date(b.fechaActualizacion).getTime() -
          new Date(a.fechaActualizacion).getTime(),
      );
    return userRecords[0] ?? null;
  }

  async getOrCreateRanking(
    usuarioId: string,
    token: string,
  ): Promise<RankingRecord> {
    const existing = await this.getLatestRanking(usuarioId, token);
    if (existing) return existing;

    const result = await this.roble.insert<RankingRecord>(token, this.TABLE, [
      {
        usuarioId,
        elo: 1000,
        victorias: 0,
        derrotas: 0,
        fechaActualizacion: new Date().toISOString(),
      },
    ]);
    return result.inserted[0];
  }

  async updateElo(ganadorId: string, perdedorId: string, token: string) {
    const ganadorRank = await this.getOrCreateRanking(ganadorId, token);
    const perdedorRank = await this.getOrCreateRanking(perdedorId, token);

    const eloG = Number(ganadorRank.elo);
    const eloP = Number(perdedorRank.elo);

    const expectedGanador = 1 / (1 + Math.pow(10, (eloP - eloG) / 400));
    const nuevoEloGanador = Math.round(eloG + 32 * (1 - expectedGanador));
    const nuevoEloPerdedor = Math.round(
      eloP + 32 * (0 - (1 - expectedGanador)),
    );

    const now = new Date().toISOString();

    await this.roble.insert<RankingRecord>(token, this.TABLE, [
      {
        usuarioId: ganadorId,
        elo: nuevoEloGanador,
        victorias: Number(ganadorRank.victorias) + 1,
        derrotas: Number(ganadorRank.derrotas),
        fechaActualizacion: now,
      },
    ]);

    await this.roble.insert<RankingRecord>(token, this.TABLE, [
      {
        usuarioId: perdedorId,
        elo: nuevoEloPerdedor,
        victorias: Number(perdedorRank.victorias),
        derrotas: Number(perdedorRank.derrotas) + 1,
        fechaActualizacion: now,
      },
    ]);

    return {
      ganador: { usuarioId: ganadorId, nuevoElo: nuevoEloGanador },
      perdedor: { usuarioId: perdedorId, nuevoElo: nuevoEloPerdedor },
    };
  }

  async getTop20(token: string): Promise<RankingRecord[]> {
    const all = await this.roble.read<RankingRecord>(token, this.TABLE);

    const latestByUser = new Map<string, RankingRecord>();
    for (const r of all) {
      const existing = latestByUser.get(r.usuarioId);
      if (
        !existing ||
        new Date(r.fechaActualizacion) > new Date(existing.fechaActualizacion)
      ) {
        latestByUser.set(r.usuarioId, r);
      }
    }

    return [...latestByUser.values()]
      .sort((a, b) => Number(b.elo) - Number(a.elo))
      .slice(0, 20);
  }

  async getMyRanking(
    usuarioId: string,
    token: string,
  ): Promise<RankingRecord> {
    return this.getOrCreateRanking(usuarioId, token);
  }
}
