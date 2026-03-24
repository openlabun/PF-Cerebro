import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RobleService } from '../../roble/roble.service';
import {
  SyncPvpHistoryDto,
  SyncPvpHistoryPlayerDto,
} from './dto/sync-pvp-history.dto';

type PvpMatchRow = {
  id?: string | number;
  _id?: string;
  external_match_id: string;
  seed: number;
  difficulty_key: string;
  mode: string;
  torneo_id: string | null;
  status: string;
  winner_user_id: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | number | null;
  duration_ms: number | null;
  ended_reason: string | null;
  forfeited_by_user_id: string | null;
};

type PvpMatchPlayerRow = {
  id?: string | number;
  _id?: string;
  match_id: string | number;
  user_id: string;
  slot: number;
  result: string;
  final_score: number;
  mistakes: number;
  correct_cells: number;
  finished: boolean;
  finished_at: string | null;
  duration_ms: number | null;
  elo_before: number | null;
  elo_after: number | null;
};

@Injectable()
export class PvpHistoryService {
  private readonly logger = new Logger(PvpHistoryService.name);
  private readonly matchesTable = 'pvp_matches';
  private readonly playersTable = 'pvp_match_players';

  constructor(private readonly robleService: RobleService) {}

  private normalizeOptionalString(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    const normalized = String(value).trim();
    return normalized ? normalized : null;
  }

  private normalizeOptionalInt(value: unknown): number | null {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    return Math.trunc(parsed);
  }

  private normalizeOptionalDateMs(value: unknown): number | null {
    if (value === undefined || value === null || value === '') return null;
    const parsed = new Date(String(value)).getTime();
    return Number.isFinite(parsed) ? parsed : null;
  }

  private extractRecordIdentity(record: {
    id?: string | number;
    _id?: string;
  }): { idColumn: 'id' | '_id'; idValue: string } | null {
    if (record.id !== undefined && record.id !== null && `${record.id}`.trim()) {
      return { idColumn: 'id', idValue: String(record.id) };
    }
    if (record._id !== undefined && record._id !== null && `${record._id}`.trim()) {
      return { idColumn: '_id', idValue: String(record._id) };
    }
    return null;
  }

  private buildMatchRow(dto: SyncPvpHistoryDto): PvpMatchRow {
    return {
      external_match_id: dto.externalMatchId,
      seed: Number(dto.seed),
      difficulty_key: dto.difficultyKey,
      mode: dto.mode,
      torneo_id: this.normalizeOptionalString(dto.torneoId),
      status: dto.status,
      winner_user_id: this.normalizeOptionalString(dto.winnerUserId),
      created_at: dto.createdAt,
      started_at: this.normalizeOptionalString(dto.startedAt),
      finished_at: this.normalizeOptionalDateMs(dto.finishedAt),
      duration_ms: this.normalizeOptionalInt(dto.durationMs),
      ended_reason: this.normalizeOptionalString(dto.endedReason),
      forfeited_by_user_id: this.normalizeOptionalString(dto.forfeitedByUserId),
    };
  }

  private buildPlayerRow(
    matchId: string | number,
    player: SyncPvpHistoryPlayerDto,
  ): PvpMatchPlayerRow {
    return {
      match_id: matchId,
      user_id: player.userId,
      slot: Number(player.slot),
      result: player.result,
      final_score: Number(player.finalScore),
      mistakes: Number(player.mistakes),
      correct_cells: Number(player.correctCells),
      finished: Boolean(player.finished),
      finished_at: this.normalizeOptionalString(player.finishedAt),
      duration_ms: this.normalizeOptionalInt(player.durationMs),
      elo_before: this.normalizeOptionalInt(player.eloBefore),
      elo_after: this.normalizeOptionalInt(player.eloAfter),
    };
  }

  private async findMatch(
    externalMatchId: string,
    accessToken: string,
  ): Promise<PvpMatchRow | null> {
    const rows = await this.robleService.read<PvpMatchRow>(
      accessToken,
      this.matchesTable,
      { external_match_id: externalMatchId },
    );
    return rows?.[0] ?? null;
  }

  private async findPlayer(
    matchId: string | number,
    userId: string,
    accessToken: string,
  ): Promise<PvpMatchPlayerRow | null> {
    const rows = await this.robleService.read<PvpMatchPlayerRow>(
      accessToken,
      this.playersTable,
      {
        match_id: typeof matchId === 'number' ? matchId : String(matchId),
        user_id: userId,
      },
    );
    return rows?.[0] ?? null;
  }

  async syncSnapshot(dto: SyncPvpHistoryDto, accessToken: string) {
    try {
      const matchPayload = this.buildMatchRow(dto);
      const existingMatch = await this.findMatch(dto.externalMatchId, accessToken);

      let matchId: string | number | null = null;
      if (!existingMatch) {
        const resp = await this.robleService.insert<PvpMatchRow>(
          accessToken,
          this.matchesTable,
          [matchPayload],
        );
        const inserted = resp.inserted?.[0];
        const identity = inserted
          ? this.extractRecordIdentity(inserted)
          : null;
        matchId = identity?.idValue ?? inserted?.id ?? inserted?._id ?? null;
        if (matchId === null) {
          const insertedMatch = await this.findMatch(
            dto.externalMatchId,
            accessToken,
          );
          matchId = insertedMatch?.id ?? insertedMatch?._id ?? null;
        }
      } else {
        const identity = this.extractRecordIdentity(existingMatch);
        if (!identity) {
          throw new HttpException(
            'El registro de pvp_matches no tiene un identificador utilizable.',
            HttpStatus.BAD_REQUEST,
          );
        }
        await this.robleService.update<PvpMatchRow>(
          accessToken,
          this.matchesTable,
          identity.idColumn,
          identity.idValue,
          matchPayload,
        );
        matchId = existingMatch.id ?? existingMatch._id ?? null;
      }

      if (matchId === null) {
        throw new HttpException(
          'No se pudo resolver el id de pvp_matches para sincronizar jugadores.',
          HttpStatus.BAD_REQUEST,
        );
      }

      for (const player of dto.players) {
        const playerPayload = this.buildPlayerRow(matchId, player);
        const existingPlayer = await this.findPlayer(
          matchId,
          player.userId,
          accessToken,
        );
        if (!existingPlayer) {
          await this.robleService.insert<PvpMatchPlayerRow>(
            accessToken,
            this.playersTable,
            [playerPayload],
          );
          continue;
        }

        const identity = this.extractRecordIdentity(existingPlayer);
        if (!identity) {
          this.logger.warn(
            `No se pudo actualizar pvp_match_players para match=${dto.externalMatchId} user=${player.userId}: registro sin id/_id`,
          );
          continue;
        }

        await this.robleService.update<PvpMatchPlayerRow>(
          accessToken,
          this.playersTable,
          identity.idColumn,
          identity.idValue,
          playerPayload,
        );
      }

      return {
        ok: true,
        externalMatchId: dto.externalMatchId,
        matchId,
        playersSynced: dto.players.length,
      };
    } catch (error) {
      this.logger.error(
        `Error sincronizando historial PvP para match=${dto.externalMatchId}`,
        error instanceof Error ? error.stack : String(error),
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'No se pudo sincronizar el historial PvP en Cerebro',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
