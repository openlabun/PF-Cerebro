import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { RobleService } from '../../roble/roble.service';
import { GameStatsService } from '../game-stats/game-stats.service';
import type { GameStat } from '../game-stats/interfaces/game-stat.interface';
import { ProfilesService } from '../profiles/profiles.service';
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
  private readonly eloByDifficulty: Record<string, number> = {
    Principiante: 850,
    Iniciado: 950,
    Intermedio: 1050,
    Avanzado: 1150,
    Experto: 1250,
    Profesional: 1350,
  };

  private readonly scoreBandsByDifficulty: Record<
    string,
    { poor: number; average: number; great: number }
  > = {
    Principiante: { poor: 900, average: 1500, great: 2100 },
    Iniciado: { poor: 1200, average: 2200, great: 3200 },
    Intermedio: { poor: 1400, average: 2500, great: 3600 },
    Avanzado: { poor: 1700, average: 3000, great: 4200 },
    Experto: { poor: 2000, average: 3500, great: 4800 },
    Profesional: { poor: 2300, average: 4000, great: 5600 },
  };

  private readonly xpMultiplierByDifficulty: Record<string, number> = {
    Principiante: 0.9,
    Iniciado: 1,
    Intermedio: 1.1,
    Avanzado: 1.25,
    Experto: 1.45,
    Profesional: 1.7,
  };

  constructor(
    private readonly robleService: RobleService,
    private readonly gameStatsService: GameStatsService,
    private readonly profilesService: ProfilesService,
  ) {}

  private normalizeDifficultyLabel(dificultad: unknown): string | undefined {
    const normalized = String(dificultad ?? '').trim();
    return normalized || undefined;
  }

  private async resolveDifficultyLabel(
    dificultad: unknown,
    seedId: unknown,
    seed: unknown,
    accessToken: string,
  ): Promise<string | undefined> {
    try {
      const explicitDifficulty = this.normalizeDifficultyLabel(dificultad);
      if (explicitDifficulty) {
        return explicitDifficulty;
      }

      const normalizedSeedId = this.normalizeSeedId(seedId);
      if (normalizedSeedId) {
        const byId = await this.robleService.read<SudokuSeedRecord>(
          accessToken,
          'seedsSudoku',
          { id: normalizedSeedId },
        );
        const foundById = this.normalizeDifficultyLabel(byId?.[0]?.dificultad);
        if (foundById) {
          return foundById;
        }

        const byMongoId = await this.robleService.read<SudokuSeedRecord>(
          accessToken,
          'seedsSudoku',
          { _id: normalizedSeedId },
        );
        const foundByMongoId = this.normalizeDifficultyLabel(
          byMongoId?.[0]?.dificultad,
        );
        if (foundByMongoId) {
          return foundByMongoId;
        }
      }

      const normalizedSeed = this.normalizeSeed(seed);
      if (normalizedSeed !== undefined) {
        const bySeed = await this.robleService.read<SudokuSeedRecord>(
          accessToken,
          'seedsSudoku',
          { seed: normalizedSeed },
        );
        return this.normalizeDifficultyLabel(bySeed?.[0]?.dificultad);
      }
    } catch (error) {
      this.logger.warn(
        `No se pudo resolver dificultad para seedId=${String(seedId ?? '')}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return undefined;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private getDifficultyBands(dificultad?: string): {
    opponentElo: number;
    poor: number;
    average: number;
    great: number;
    xpMultiplier: number;
  } {
    const key = this.normalizeDifficultyLabel(dificultad) ?? 'Intermedio';
    const opponentElo = this.eloByDifficulty[key] ?? this.eloByDifficulty.Intermedio;
    const scoreBands =
      this.scoreBandsByDifficulty[key] ?? this.scoreBandsByDifficulty.Intermedio;
    const xpMultiplier =
      this.xpMultiplierByDifficulty[key] ?? this.xpMultiplierByDifficulty.Intermedio;

    return {
      opponentElo,
      poor: scoreBands.poor,
      average: scoreBands.average,
      great: scoreBands.great,
      xpMultiplier,
    };
  }

  private deriveSinglePlayerOutcome(
    puntaje: number,
    dificultad?: string,
  ): number {
    const { poor, average, great } = this.getDifficultyBands(dificultad);
    const score = Number.isFinite(puntaje) ? puntaje : 0;

    if (score <= poor) return 0.25;
    if (score <= average) {
      const progress = (score - poor) / Math.max(1, average - poor);
      return 0.25 + progress * 0.35;
    }
    if (score <= great) {
      const progress = (score - average) / Math.max(1, great - average);
      return 0.6 + progress * 0.3;
    }

    const overflow = Math.min(1, (score - great) / Math.max(1, great));
    return 0.9 + overflow * 0.1;
  }

  private calculateSinglePlayerEloChange(
    currentElo: number,
    puntaje: number,
    dificultad?: string,
  ): number {
    const { opponentElo } = this.getDifficultyBands(dificultad);
    const expectedScore =
      1 / (1 + 10 ** ((opponentElo - currentElo) / 400));
    const actualScore = this.deriveSinglePlayerOutcome(puntaje, dificultad);
    const kFactor = currentElo >= 1400 ? 24 : 32;
    const delta = Math.round(kFactor * (actualScore - expectedScore));
    return this.clamp(delta, -32, 32);
  }

  private calculateEarnedExperience(
    puntaje: number,
    dificultad?: string,
  ): number {
    const { xpMultiplier } = this.getDifficultyBands(dificultad);
    const safeScore = Math.max(0, Number(puntaje) || 0);
    if (safeScore <= 0) {
      return 10;
    }

    const normalizedScore = Math.sqrt(safeScore) * 2.4 + safeScore / 40;
    const xp = Math.round(normalizedScore * xpMultiplier);
    return this.clamp(xp, 10, 300);
  }

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
  ): Promise<GameSession | null> {
    const normalizedJuegoId = String(juegoId || '').trim();
    if (!normalizedJuegoId) {
      throw new HttpException(
        'El parametro juegoId es obligatorio',
        HttpStatus.BAD_REQUEST,
      );
    }

    const normalizedExcludedId = this.normalizeSessionId(excludeSessionId);
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
        const playedAt = new Date(String(row?.jugadoEn || ''));
        return !Number.isNaN(playedAt.getTime());
      })
      .sort((a, b) => {
        const left = new Date(String(a.jugadoEn)).getTime();
        const right = new Date(String(b.jugadoEn)).getTime();
        return right - left;
      });

    // this.logger.log(
    //   `Ultima sesion consultada: usuarioId=${usuarioID}, juegoId=${normalizedJuegoId}, excludeSessionId=${normalizedExcludedId ?? 'none'}, ultimaSesion=${JSON.stringify(
    //     sorted[0] ?? null,
    //   )}`,
    // );

    return sorted[0] ?? null;
  }

  async createSession(
    usuarioID: string,
    juegoId: string,
    puntaje: number,
    resultado: string,
    cambioElo: number | undefined,
    dificultad: string | undefined,
    tiempo: unknown,
    seedId: unknown,
    seed: unknown,
    accessToken: string,
  ): Promise<GameSession> {
    try {
      const normalizedDifficulty = await this.resolveDifficultyLabel(
        dificultad,
        seedId,
        seed,
        accessToken,
      );
      const stats = await this.gameStatsService.createIfNotExists(
        usuarioID,
        juegoId,
        accessToken,
      );
      const currentElo = Number(stats.elo ?? 1000);
      const computedEloChange =
        resultado === 'singlePlayer'
          ? this.calculateSinglePlayerEloChange(
              currentElo,
              Number(puntaje),
              normalizedDifficulty,
            )
          : Number(cambioElo ?? 0);
      const experienceEarned =
        resultado === 'singlePlayer'
          ? this.calculateEarnedExperience(Number(puntaje), normalizedDifficulty)
          : 0;
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
        cambioElo: computedEloChange,
        tiempo: this.normalizeTiempoToSeconds(tiempo),
        idseed: sessionSeedValue,
        jugadoEn: new Date().toISOString(),
      };

      this.logger.log(
        `Creando sesion: usuarioId=${usuarioID}, juegoId=${juegoId}, puntaje=${puntaje}, resultado=${resultado}, dificultad=${normalizedDifficulty ?? 'desconocida'}, cambioElo=${computedEloChange}, xp=${experienceEarned}`,
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
        stats,
        resultado,
        computedEloChange,
        accessToken,
      );

      if (experienceEarned > 0) {
        await this.profilesService.addExperience(
          usuarioID,
          experienceEarned,
          accessToken,
        );
      }

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
    stats: GameStat,
    resultado: string,
    cambioElo: number,
    accessToken: string,
  ): Promise<void> {
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
