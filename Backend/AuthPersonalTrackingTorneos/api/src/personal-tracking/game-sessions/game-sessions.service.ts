import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { RobleService } from '../../roble/roble.service';
import { GameStatsService } from '../game-stats/game-stats.service';
import type { GameSession } from './interfaces/game-session.interface';

type SudokuSeedRecord = {
  id?: string;
  _id?: string;
  seed?: string | number;
  dificultad?: string;
  huecos?: string | number;
};

@Injectable()
export class GameSessionsService {
  private readonly logger = new Logger(GameSessionsService.name);

  constructor(
    private readonly robleService: RobleService,
    private readonly gameStatsService: GameStatsService,
  ) {}

  private normalizeSeed(seed: unknown): string | number | undefined {
    if (seed === undefined || seed === null) return undefined;
    if (typeof seed === 'number') {
      return Number.isFinite(seed) ? seed : undefined;
    }
    const normalized = String(seed).trim();
    if (!normalized) return undefined;
    if (/^-?\d+(\.\d+)?$/.test(normalized)) {
      const asNumber = Number(normalized);
      return Number.isFinite(asNumber) ? asNumber : normalized;
    }
    return normalized;
  }

  private normalizeSeedId(seedId: unknown): string | undefined {
    if (seedId === undefined || seedId === null) return undefined;
    const normalized = String(seedId).trim();
    return normalized ? normalized : undefined;
  }

  private normalizeTiempoToSeconds(tiempo: unknown): number | undefined {
    if (tiempo === undefined || tiempo === null) return undefined;
    const parsed = Number(tiempo);
    if (!Number.isFinite(parsed) || parsed < 0) return undefined;
    return Math.floor(parsed);
  }

  private normalizeSessionId(value: unknown): string | undefined {
    if (value === undefined || value === null) return undefined;
    const normalized = String(value).trim();
    return normalized ? normalized : undefined;
  }

  private async resolveSessionSeedValue(
    seedId: unknown,
    seed: unknown,
    accessToken: string,
  ): Promise<string | number | undefined> {
    const normalizedSeedId = this.normalizeSeedId(seedId);
    if (normalizedSeedId) return normalizedSeedId;

    const normalizedSeed = this.normalizeSeed(seed);
    if (normalizedSeed === undefined) return undefined;

    try {
      const rows = await this.robleService.read<SudokuSeedRecord>(
        accessToken,
        'seedsSudoku',
        { seed: normalizedSeed },
      );
      const found = rows?.[0];
      const foundId =
        this.normalizeSeedId(found?.id) ?? this.normalizeSeedId(found?._id);
      return foundId ?? normalizedSeed;
    } catch {
      return normalizedSeed;
    }
  }

  async getRandomSudokuSeedByDifficulty(
    dificultad: string,
    accessToken: string,
  ): Promise<{ seed: string; seedId?: string; huecos: number; dificultad: string }> {
    const normalizedDifficulty = String(dificultad || '').trim();
    if (!normalizedDifficulty) {
      throw new HttpException(
        'El parametro dificultad es obligatorio',
        HttpStatus.BAD_REQUEST,
      );
    }

    const rows = await this.robleService.read<SudokuSeedRecord>(
      accessToken,
      'seedsSudoku',
      { dificultad: normalizedDifficulty },
    );

    if (!rows || rows.length === 0) {
      throw new HttpException(
        `No hay seeds configuradas para dificultad "${normalizedDifficulty}"`,
        HttpStatus.NOT_FOUND,
      );
    }

    const chosen = rows[Math.floor(Math.random() * rows.length)];
    const parsedSeed = this.normalizeSeed(chosen.seed);
    const parsedHuecos = Number(chosen.huecos);

    if (parsedSeed === undefined) {
      throw new HttpException(
        `La seed seleccionada para "${normalizedDifficulty}" es invalida`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!Number.isFinite(parsedHuecos) || parsedHuecos < 0) {
      throw new HttpException(
        `El valor de huecos para "${normalizedDifficulty}" es invalido`,
        HttpStatus.BAD_REQUEST,
      );
    }

    return {
      seed: String(parsedSeed),
      seedId: this.normalizeSeedId(chosen.id) ?? this.normalizeSeedId(chosen._id),
      huecos: Math.floor(parsedHuecos),
      dificultad: normalizedDifficulty,
    };
  }

  async getLatestSession(
    usuarioID: string,
    juegoId: string,
    accessToken: string,
    excludeSessionId?: string,
    excludePlayedAt?: string,
  ): Promise<GameSession | null> {
    const normalizedJuegoId = String(juegoId || '').trim();
    if (!normalizedJuegoId) {
      throw new HttpException(
        'El parametro juegoId es obligatorio',
        HttpStatus.BAD_REQUEST,
      );
    }

    const normalizedExcludedId = this.normalizeSessionId(excludeSessionId);
    const normalizedExcludedPlayedAt = String(excludePlayedAt || '').trim();
    const rows = await this.robleService.read<GameSession>(
      accessToken,
      'SesionJuego',
      { usuarioID, juegoId: normalizedJuegoId },
    );

    const sorted = (Array.isArray(rows) ? rows : [])
      .filter((row) => {
        const sessionId = this.normalizeSessionId(row?._id);
        return !normalizedExcludedId || sessionId !== normalizedExcludedId;
      })
      .filter((row) => {
        const playedAt = String(row?.jugadoEn || '').trim();
        return !normalizedExcludedPlayedAt || playedAt !== normalizedExcludedPlayedAt;
      })
      .filter((row) => {
        const playedAt = new Date(String(row?.jugadoEn || ''));
        return !Number.isNaN(playedAt.getTime());
      })
      .sort((a, b) => {
        const left = new Date(String(a.jugadoEn)).getTime();
        const right = new Date(String(b.jugadoEn)).getTime();
        return right - left;
      });

    return sorted[0] ?? null;
  }

  async createSession(
    usuarioID: string,
    juegoId: string,
    puntaje: number,
    resultado: string,
    cambioElo: number,
    tiempo: unknown,
    seedId: unknown,
    seed: unknown,
    accessToken: string,
  ): Promise<GameSession> {
    try {
      const sessionSeedValue = await this.resolveSessionSeedValue(
        seedId,
        seed,
        accessToken,
      );

      const session: GameSession = {
        usuarioID,
        juegoId,
        puntaje: Number(puntaje),
        resultado,
        cambioElo: Number(cambioElo),
        tiempo: this.normalizeTiempoToSeconds(tiempo),
        idseed: sessionSeedValue,
        jugadoEn: new Date().toISOString(),
      };

      this.logger.log(
        `Creando sesion: usuarioId=${usuarioID}, juegoId=${juegoId}, puntaje=${puntaje}, resultado=${resultado}, cambioElo=${cambioElo}`,
      );

      const resp = await this.robleService.insert<GameSession>(
        accessToken,
        'SesionJuego',
        [session],
      );

      if (!resp.inserted || resp.inserted.length === 0) {
        const reason =
          resp.skipped && resp.skipped.length > 0
            ? String(resp.skipped[0]?.reason || 'sin detalle')
            : 'sin detalle';
        throw new HttpException(
          `No se pudo crear la sesion. Motivo: ${reason}`,
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
      this.logger.error(
        'Error real al crear sesion',
        error instanceof Error ? error.stack : String(error),
      );

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        'Error al crear sesion',
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
    const normalizedGameId = String(juegoId || '').trim();
    const isSinglePlayerSudoku = normalizedGameId === 'uVsB-k2rjora';
    const stats = await this.gameStatsService.createIfNotExists(
      usuarioId,
      juegoId,
      accessToken,
    );

    if (!stats?._id) {
      throw new HttpException(
        'Las estadisticas no tienen _id valido',
        HttpStatus.BAD_REQUEST,
      );
    }

    const updates = {
      partidasJugadas: Number(stats.partidasJugadas ?? 0) + 1,
      elo: Number(stats.elo ?? 0) + Number(cambioElo ?? 0),
      victorias:
        !isSinglePlayerSudoku && resultado === 'victoria'
          ? Number(stats.victorias ?? 0) + 1
          : Number(stats.victorias ?? 0),
      derrotas:
        !isSinglePlayerSudoku && resultado === 'derrota'
          ? Number(stats.derrotas ?? 0) + 1
          : Number(stats.derrotas ?? 0),
      empates:
        !isSinglePlayerSudoku && resultado === 'empate'
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
