import { Injectable } from '@nestjs/common';
import { UpdateTorneoEstadoDto } from './dto/update-torneo-estado.dto';
import { CreateTorneoDto } from './dto/create-torneo.dto';

type TorneoRecord = {
  _id?: string;
  nombre?: string;
  descripcion?: string;
  creadorId?: string;
  creadorNombre?: string;
  codigoAcceso?: string | null;
  esPublico?: boolean;
  estado?: string;
  tipo?: string;
  fechaInicio?: string;
  fechaFin?: string;
  recurrencia?: string | null;
  configuracion?: Record<string, unknown> | null;
  fechaCreacion?: string;
};

type ParticipanteRecord = {
  usuarioId?: string;
  fechaUnion?: string;
};

type RankingRecord = {
  usuarioId?: string;
  fechaActualizacion?: string;
};

type PvpMatchRecord = {
  id?: string | number;
  _id?: string;
  seed?: string | number | null;
  difficulty_key?: string | null;
  status?: string;
  created_at?: string | number | null;
  started_at?: string | number | null;
  finished_at?: string | number | null;
  duration_ms?: string | number | null;
};

type PvpMatchPlayerRecord = {
  match_id?: string | number;
  user_id?: string;
};

type SesionJuegoRecord = {
  idseed?: string;
  tiempo?: string | number | null;
  juegoId?: string;
};

type SeedSudokuRecord = {
  id?: string;
  _id?: string;
  seed?: string | number;
  dificultad?: string;
};

type GamesByUserRow = {
  userId: string;
  games: string[];
  gamesPlayedCount: number;
};

type RequestOptions = {
  requiresAuth?: boolean;
  accessToken?: string;
};

type AverageTimeByDifficultyRow = {
  dificultad: string;
  avgSeconds: number;
  sessionsCount: number;
  pvpMatchesCount?: number;
  totalUsagesCount?: number;
};

type AverageTimeBySeedRow = {
  seedId: string;
  seed: string;
  dificultad: string;
  avgSeconds: number;
  sessionsCount: number;
  singlePlayerAvgSeconds?: number;
  singlePlayerSessionsCount?: number;
  pvpAvgSeconds?: number;
  pvpMatchesCount?: number;
  totalUsagesCount?: number;
};

type AggregatedSnapshot = {
  generatedAtIso: string;
  torneos: TorneoRecord[];
  gamesByUser: GamesByUserRow[];
  averageTimeByDifficulty: AverageTimeByDifficultyRow[];
  firstSeenByUser: Array<{ userId: string; date: Date }>;
  overview: {
    totalUsers: number;
    totalGameParticipations: number;
    sudokuMatchesPlayed: number;
    pvpMatchesPlayed: number;
    usersByGame: Record<string, number>;
    activityByGame: Record<string, number>;
    source: string;
  };
  usersTotal: {
    totalUsers: number;
    source: string;
  };
};

@Injectable()
export class AdminService {
  private readonly contenedor1BaseUrl =
    process.env.CONTENEDOR1_BASE_URL || 'http://cerebro-api:3000/api';
  private readonly contenedor2BaseUrl =
    process.env.CONTENEDOR2_BASE_URL || 'http://backend-pvp:3001';
  private readonly cacheTtlMs = Number(process.env.ADMIN_CACHE_TTL_MS || 15000);

  private readonly initialAdminApiToken = process.env.ADMIN_API_TOKEN || '';
  private readonly adminEmail = String(process.env.ADMIN_EMAIL || '').trim();
  private readonly adminPassword = process.env.ADMIN_PASSWORD || '';
  private adminRefreshToken = process.env.ADMIN_REFRESH_TOKEN || '';
  private currentAdminApiToken = this.initialAdminApiToken;
  private accessTokenExpMs = this.decodeJwtExpMs(this.initialAdminApiToken);
  private refreshInFlight: Promise<string> | null = null;
  private loginInFlight: Promise<string> | null = null;

  private snapshotCache: AggregatedSnapshot | null = null;
  private snapshotCacheExpiresAt = 0;
  private snapshotInFlight: Promise<AggregatedSnapshot> | null = null;
  private readonly sudokuDifficulties = [
    'Principiante',
    'Iniciado',
    'Intermedio',
    'Avanzado',
    'Experto',
    'Profesional',
  ];
  private readonly pvpDifficultyLabelsByKey: Record<string, string> = {
    'muy-facil': 'Principiante',
    facil: 'Iniciado',
    medio: 'Intermedio',
    dificil: 'Avanzado',
    experto: 'Experto',
    maestro: 'Profesional',
  };
  private readonly tournamentTypeSerie = 'SERIE';

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  private normalizeText(value: unknown) {
    return String(value ?? '').trim();
  }

  private resolvePositiveInteger(value: unknown) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
    return Math.trunc(parsed);
  }

  private resolveTournamentDifficulty(value: unknown) {
    const normalized = this.normalizeDifficulty(value);
    const match = this.sudokuDifficulties.find(
      (difficulty) => this.normalizeDifficulty(difficulty) === normalized,
    );
    return match || 'Intermedio';
  }

  private normalizeTournamentRecurrence(value: unknown) {
    const normalized = this.normalizeText(value).toUpperCase();
    const allowed = ['NINGUNA', 'DIARIA', 'SEMANAL', 'MENSUAL'];
    return allowed.includes(normalized) ? normalized : 'NINGUNA';
  }

  private sanitizeTournamentConfig(value: unknown): Record<string, unknown> {
    const config = this.isPlainObject(value) ? value : {};
    return {
      duracionMaximaMin:
        this.resolvePositiveInteger(config.duracionMaximaMin) ?? 20,
      dificultad: this.resolveTournamentDifficulty(config.dificultad),
      numeroTableros:
        this.resolvePositiveInteger(
          config.numeroTableros ?? config.cantidadTableros ?? config.tableros,
        ) ?? 3,
      esOficial: config.esOficial === true,
    };
  }

  private sanitizeTournamentPayload(
    value: CreateTorneoDto | Record<string, unknown>,
    options: { forceOfficial?: boolean } = {},
  ): Record<string, unknown> {
    const source = this.isPlainObject(value) ? value : {};
    const config = this.sanitizeTournamentConfig(source.configuracion);
    if (options.forceOfficial) {
      config.esOficial = true;
    }
    const payload: Record<string, unknown> = {
      tipo: this.tournamentTypeSerie,
      recurrencia: this.normalizeTournamentRecurrence(source.recurrencia),
      configuracion: config,
    };

    if ('nombre' in source) payload.nombre = source.nombre;
    if ('descripcion' in source) payload.descripcion = source.descripcion;
    if ('esPublico' in source) payload.esPublico = source.esPublico;
    if ('fechaInicio' in source) payload.fechaInicio = source.fechaInicio;
    if ('fechaFin' in source) payload.fechaFin = source.fechaFin;

    return payload;
  }

  async buildOverview(accessToken: string) {
    const snapshot = await this.getAggregatedSnapshot(accessToken);
    return snapshot.overview;
  }

  async getTotalUsers(accessToken: string) {
    const snapshot = await this.getAggregatedSnapshot(accessToken);
    return snapshot.usersTotal;
  }

  async getDashboardSnapshot(
    accessToken: string,
    fromInput?: string,
    toInput?: string,
    includeTorneos = false,
  ) {
    const [overview, usersTotal, gamesByUser, usersTimeseries] = await Promise.all([
      this.buildOverview(accessToken),
      this.getTotalUsers(accessToken),
      this.getGamesByUser(accessToken),
      this.getUsersTimeSeries(accessToken, fromInput, toInput),
    ]);
    const avgTimeByDifficulty = await this.getAverageTimeByDifficulty(accessToken);

    if (!includeTorneos) {
      return {
        overview,
        usersTotal,
        gamesByUser,
        avgTimeByDifficulty,
        usersTimeseries,
        source: 'contenedor1-contenedor2',
      };
    }

    const torneos = await this.getTorneos(accessToken);
      return {
        overview,
        usersTotal,
        gamesByUser,
        avgTimeByDifficulty,
        usersTimeseries,
        torneos: {
          data: torneos,
          count: torneos.length,
        source: 'contenedor1',
      },
      source: 'contenedor1-contenedor2',
    };
  }

  async getUsersTimeSeries(accessToken: string, fromInput?: string, toInput?: string) {
    const snapshot = await this.getAggregatedSnapshot(accessToken);

    const now = new Date();
    const fromFallback = new Date(now);
    fromFallback.setDate(now.getDate() - 30);

    const from = this.parseDateInput(fromInput, fromFallback);
    const to = this.parseDateInput(toInput, now);

    const newUsersByDay = new Map<string, number>();
    for (const row of snapshot.firstSeenByUser) {
      const key = row.date.toISOString().slice(0, 10);
      newUsersByDay.set(key, (newUsersByDay.get(key) || 0) + 1);
    }

    const usersBeforeFrom = snapshot.firstSeenByUser.reduce((acc, row) => {
      if (row.date < from) return acc + 1;
      return acc;
    }, 0);

    let cumulativeUsers = usersBeforeFrom;
    const data: Array<{ date: string; users: number }> = [];
    for (const day of this.iterateDays(from, to)) {
      const key = day.toISOString().slice(0, 10);
      cumulativeUsers += newUsersByDay.get(key) || 0;
      data.push({ date: key, users: cumulativeUsers });
    }

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      bucket: 'day',
      data,
      source: 'contenedor1-contenedor2',
    };
  }

  async getGamesByUser(accessToken: string) {
    const snapshot = await this.getAggregatedSnapshot(accessToken);
    return {
      data: snapshot.gamesByUser,
      source: 'contenedor1-contenedor2',
    };
  }

  async getAverageTimeByDifficulty(accessToken: string) {
    const snapshot = await this.getAggregatedSnapshot(accessToken);
    return {
      data: snapshot.averageTimeByDifficulty,
      source: 'SesionJuego-seedsSudoku-pvp_matches',
    };
  }

  async getAverageTimeBySeedForDifficulty(accessToken: string, dificultadInput: string) {
    const dificultad = String(dificultadInput || '').trim();
    if (!dificultad) {
      return {
        dificultad: '',
        data: [] as AverageTimeBySeedRow[],
        source: 'SesionJuego-seedsSudoku-pvp_matches',
      };
    }

    try {
      const [sesionesRaw, seedsRaw, pvpMatchesRaw] = await Promise.all([
        this.requestRobleRead(accessToken, 'SesionJuego'),
        this.requestRobleRead(accessToken, 'seedsSudoku'),
        this.requestRobleRead(accessToken, 'pvp_matches'),
      ]);

      const sesiones = Array.isArray(sesionesRaw)
        ? (sesionesRaw as SesionJuegoRecord[])
        : [];
      const seeds = Array.isArray(seedsRaw)
        ? (seedsRaw as SeedSudokuRecord[])
        : [];
      const pvpMatches = Array.isArray(pvpMatchesRaw)
        ? (pvpMatchesRaw as PvpMatchRecord[])
        : [];

      const normalizedRequestedDifficulty = this.normalizeBoardDifficulty(dificultad);
      const resolvedDifficultyLabel =
        this.resolveBoardDifficultyLabel(dificultad) || dificultad;

      const seedsForDifficulty = seeds.filter((row) => {
        return (
          this.normalizeBoardDifficulty(row?.dificultad) ===
          normalizedRequestedDifficulty
        );
      });

      const seedMetaById = new Map<string, { seed: string; dificultad: string }>();
      const seedMetaBySeed = new Map<string, { seedId: string; seed: string; dificultad: string }>();
      for (const row of seedsForDifficulty) {
        const id = this.normalizeUserId(row?.id) || this.normalizeUserId(row?._id);
        const seedValue = this.normalizeSeedValue(row?.seed);
        if (!id) continue;
        seedMetaById.set(id, {
          seed: seedValue,
          dificultad: this.resolveBoardDifficultyLabel(row?.dificultad) || resolvedDifficultyLabel,
        });
        if (seedValue) {
          seedMetaBySeed.set(seedValue, {
            seedId: id,
            seed: seedValue,
            dificultad:
              this.resolveBoardDifficultyLabel(row?.dificultad) ||
              resolvedDifficultyLabel,
          });
        }
      }

      const singlePlayerAggregate = new Map<string, { total: number; count: number }>();
      for (const sesion of sesiones) {
        const sessionSeedRef = this.normalizeUserId(sesion?.idseed);
        const sessionSeedValue = this.normalizeSeedValue(sesion?.idseed);
        const seedMeta =
          seedMetaById.get(sessionSeedRef) ||
          seedMetaBySeed.get(sessionSeedValue);
        if (!seedMeta) continue;
        const tiempo = Number(sesion?.tiempo);
        if (!Number.isFinite(tiempo) || tiempo < 0) continue;
        const seedValue = this.normalizeSeedValue(seedMeta.seed);
        if (!seedValue) continue;
        const current = singlePlayerAggregate.get(seedValue) || { total: 0, count: 0 };
        current.total += tiempo;
        current.count += 1;
        singlePlayerAggregate.set(seedValue, current);
      }

      const pvpAggregate = new Map<
        string,
        { matchesCount: number; durationTotalMs: number; durationCount: number }
      >();
      for (const match of pvpMatches) {
        if (!this.isPlayedPvpMatch(match)) continue;
        if (
          this.normalizeBoardDifficulty(match?.difficulty_key) !==
          normalizedRequestedDifficulty
        ) {
          continue;
        }

        const seedValue = this.normalizeSeedValue(match?.seed);
        if (!seedValue) continue;

        const current = pvpAggregate.get(seedValue) || {
          matchesCount: 0,
          durationTotalMs: 0,
          durationCount: 0,
        };
        current.matchesCount += 1;

        const durationMs = Number(match?.duration_ms);
        if (Number.isFinite(durationMs) && durationMs >= 0) {
          current.durationTotalMs += durationMs;
          current.durationCount += 1;
        }

        pvpAggregate.set(seedValue, current);
      }

      const allSeedValues = new Set<string>([
        ...seedMetaBySeed.keys(),
        ...singlePlayerAggregate.keys(),
        ...pvpAggregate.keys(),
      ]);

      const data = Array.from(allSeedValues)
        .map((seedValue) => {
          const meta = seedMetaBySeed.get(seedValue) || {
            seedId: '',
            seed: seedValue,
            dificultad: resolvedDifficultyLabel,
          };
          const singleStats = singlePlayerAggregate.get(seedValue) || { total: 0, count: 0 };
          const pvpStats = pvpAggregate.get(seedValue) || {
            matchesCount: 0,
            durationTotalMs: 0,
            durationCount: 0,
          };
          const singlePlayerAvgSeconds =
            singleStats.count > 0
              ? Math.round((singleStats.total / singleStats.count) * 100) / 100
              : 0;
          const pvpAvgSeconds =
            pvpStats.durationCount > 0
              ? Math.round(
                  ((pvpStats.durationTotalMs / pvpStats.durationCount) / 1000) * 100,
                ) / 100
              : 0;

          return {
            seedId: meta.seedId,
            seed: meta.seed,
            dificultad: meta.dificultad,
            avgSeconds: singlePlayerAvgSeconds,
            sessionsCount: singleStats.count,
            singlePlayerAvgSeconds,
            singlePlayerSessionsCount: singleStats.count,
            pvpAvgSeconds,
            pvpMatchesCount: pvpStats.matchesCount,
            totalUsagesCount: singleStats.count + pvpStats.matchesCount,
          };
        })
        .sort((a, b) => {
          const numericA = Number(a.seed || 0);
          const numericB = Number(b.seed || 0);
          if (Number.isFinite(numericA) && Number.isFinite(numericB)) {
            return numericA - numericB;
          }
          return String(a.seed || '').localeCompare(String(b.seed || ''));
        });

      return {
        dificultad: resolvedDifficultyLabel,
        data,
        source: 'SesionJuego-seedsSudoku-pvp_matches',
      };
    } catch {
      return {
        dificultad,
        data: [] as AverageTimeBySeedRow[],
        source: 'SesionJuego-seedsSudoku-pvp_matches',
      };
    }
  }

  async getUserGames(accessToken: string, userId: string) {
    const payload = await this.getGamesByUser(accessToken);
    const user = payload.data.find((item) => item.userId === userId);
    if (!user) return null;

    return {
      userId: user.userId,
      games: user.games,
      source: 'contenedor1-contenedor2',
    };
  }

  async getTorneos(accessToken: string) {
    const snapshot = await this.getAggregatedSnapshot(accessToken);
    return snapshot.torneos;
  }

  async createTorneo(accessToken: string, dto: CreateTorneoDto) {
    const payload = this.sanitizeTournamentPayload(dto, { forceOfficial: true });
    const result = await this.requestContenedor1('torneos', 'POST', payload, {
      accessToken,
    });
    this.invalidateSnapshotCache();
    return result;
  }

  async patchTorneoEstado(
    accessToken: string,
    torneoId: string,
    dto: UpdateTorneoEstadoDto,
  ) {
    const result = await this.requestContenedor1(
      `torneos/${torneoId}/estado`,
      'PATCH',
      {
        estado: dto.estado,
        razon: dto.razon || 'Actualizado desde modulo admin',
      },
      { accessToken },
    );
    this.invalidateSnapshotCache();
    return result;
  }

  async getTorneoById(accessToken: string, torneoId: string) {
    return this.requestContenedor1(`torneos/${torneoId}`, 'GET', undefined, {
      accessToken,
    });
  }

  async updateTorneo(
    accessToken: string,
    torneoId: string,
    payload: Record<string, unknown>,
  ) {
    let forceOfficial = false;
    try {
      const currentPayload = await this.requestContenedor1(
        `torneos/${torneoId}`,
        'GET',
        undefined,
        { accessToken },
      );
      const currentRecord =
        currentPayload &&
        typeof currentPayload === 'object' &&
        !Array.isArray(currentPayload) &&
        typeof (currentPayload as { data?: unknown }).data === 'object' &&
        (currentPayload as { data?: unknown }).data !== null &&
        !Array.isArray((currentPayload as { data?: unknown }).data)
          ? ((currentPayload as { data: TorneoRecord }).data ?? null)
          : currentPayload &&
              typeof currentPayload === 'object' &&
              !Array.isArray(currentPayload)
            ? (currentPayload as TorneoRecord)
            : null;
      forceOfficial =
        currentRecord?.configuracion?.esOficial === true;
    } catch {
      forceOfficial = false;
    }

    const sanitizedPayload = this.sanitizeTournamentPayload(payload, {
      forceOfficial,
    });
    const result = await this.requestContenedor1(
      `torneos/${torneoId}`,
      'PUT',
      sanitizedPayload,
      { accessToken },
    );
    this.invalidateSnapshotCache();
    return result;
  }

  async getAuthUsers(accessToken: string) {
    return this.requestContenedor1('auth/users', 'GET', undefined, {
      accessToken,
    });
  }

  private async getAggregatedSnapshot(accessToken: string) {
    const now = Date.now();
    if (this.snapshotCache && now < this.snapshotCacheExpiresAt) {
      return this.snapshotCache;
    }

    if (this.snapshotInFlight) {
      return this.snapshotInFlight;
    }

    this.snapshotInFlight = this.buildAggregatedSnapshot(accessToken);
    try {
      const snapshot = await this.snapshotInFlight;
      this.snapshotCache = snapshot;
      this.snapshotCacheExpiresAt = Date.now() + this.cacheTtlMs;
      return snapshot;
    } finally {
      this.snapshotInFlight = null;
    }
  }

  private async buildAggregatedSnapshot(accessToken: string) {
    const [
      torneos,
      pvpMatches,
      pvpMatchPlayers,
      sudokuMatchesPlayed,
      totalProfiles,
      averageTimeByDifficulty,
    ] = await Promise.all([
      this.getTorneosListFromContenedor1(accessToken),
      this.getPvpMatchesFromRoble(accessToken),
      this.getPvpMatchPlayersFromRoble(accessToken),
      this.getSudokuMatchesPlayed(accessToken),
      this.getProfilesCountFromContenedor1(accessToken),
      this.getAverageTimeByDifficultyFromRoble(accessToken),
    ]);

    const creatorIds = new Set<string>();
    for (const torneo of torneos) {
      const creatorId = this.normalizeUserId(torneo.creadorId);
      if (creatorId) creatorIds.add(creatorId);
    }
    const creatorNames = await this.getAuthUserNamesByIdSafe(accessToken, creatorIds);
    for (const torneo of torneos) {
      const creatorId = this.normalizeUserId(torneo.creadorId);
      if (!creatorId) continue;
      const creatorName = creatorNames.get(creatorId);
      if (creatorName) torneo.creadorNombre = creatorName;
    }

    // Paraleliza el fetch de participantes por torneo.
    const participantesEntries = await Promise.all(
      torneos
        .filter((t) => Boolean(t?._id))
        .map(async (torneo) => {
          const participantes = await this.getParticipantesByTorneo(
            accessToken,
            torneo._id!,
          );
          return { torneoId: torneo._id!, participantes };
        }),
    );

    const participantesByTorneo = new Map<string, ParticipanteRecord[]>();
    for (const entry of participantesEntries) {
      participantesByTorneo.set(entry.torneoId, entry.participantes);
    }

    const perUserGames = new Map<string, Set<string>>();
    const firstSeenByUserMap = new Map<string, Date>();

    for (const torneo of torneos) {
      const creatorId = this.normalizeUserId(torneo.creadorId);
      const torneoDate = this.parseDateSafe(torneo.fechaCreacion);
      if (creatorId) {
        this.addUserGame(perUserGames, creatorId, 'torneos');
        if (torneoDate) this.setMinDate(firstSeenByUserMap, creatorId, torneoDate);
      }

      if (!torneo?._id) continue;
      const participantes = participantesByTorneo.get(torneo._id) || [];
      for (const participante of participantes) {
        const userId = this.normalizeUserId(participante.usuarioId);
        const joinedAt = this.parseDateSafe(participante.fechaUnion);
        if (!userId) continue;

        this.addUserGame(perUserGames, userId, 'torneos');
        if (joinedAt) this.setMinDate(firstSeenByUserMap, userId, joinedAt);
      }
    }

    const playedPvpMatchIds = new Set<string>();
    const pvpMatchDateById = new Map<string, Date>();

    for (const match of pvpMatches) {
      const matchId = this.normalizeRecordId(match.id) || this.normalizeRecordId(match._id);
      if (!matchId) continue;

      const matchDate =
        this.parseDateSafe(match.started_at) ||
        this.parseDateSafe(match.finished_at) ||
        this.parseDateSafe(match.created_at);
      if (matchDate) {
        pvpMatchDateById.set(matchId, matchDate);
      }

      if (!this.isPlayedPvpMatch(match)) continue;
      playedPvpMatchIds.add(matchId);
    }

    for (const row of pvpMatchPlayers) {
      const matchId = this.normalizeRecordId(row.match_id);
      if (!matchId || !playedPvpMatchIds.has(matchId)) continue;

      const userId = this.normalizeUserId(row.user_id);
      if (!userId) continue;

      this.addUserGame(perUserGames, userId, 'pvp');
      const date = pvpMatchDateById.get(matchId);
      if (date) this.setMinDate(firstSeenByUserMap, userId, date);
    }

    const gamesByUser: GamesByUserRow[] = Array.from(perUserGames.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([userId, gamesSet]) => {
        const games = Array.from(gamesSet).sort((a, b) => a.localeCompare(b));
        return { userId, games, gamesPlayedCount: games.length };
      });

    const totalUsers = totalProfiles;
    const totalGameParticipations = gamesByUser.reduce(
      (acc, row) => acc + row.gamesPlayedCount,
      0,
    );
    const pvpMatchesPlayed = playedPvpMatchIds.size;
    const usersByGame = gamesByUser.reduce<Record<string, number>>((acc, row) => {
      for (const game of row.games) {
        acc[game] = (acc[game] || 0) + 1;
      }
      return acc;
    }, {});
    const activityByGame: Record<string, number> = {
      sudoku: sudokuMatchesPlayed,
      pvp: pvpMatchesPlayed,
      torneos: torneos.length,
    };

    const firstSeenByUser = Array.from(firstSeenByUserMap.entries()).map(
      ([userId, date]) => ({ userId, date }),
    );

    return {
      generatedAtIso: new Date().toISOString(),
      torneos,
      gamesByUser,
      averageTimeByDifficulty,
      firstSeenByUser,
      overview: {
        totalUsers,
        totalGameParticipations,
        sudokuMatchesPlayed,
        pvpMatchesPlayed,
        usersByGame,
        activityByGame,
        source: 'contenedor1-contenedor2',
      },
      usersTotal: {
        totalUsers,
        source: 'contenedor1-contenedor2',
      },
    };
  }

  private async getAverageTimeByDifficultyFromRoble(accessToken: string) {
    try {
      const [sesionesRaw, seedsRaw, pvpMatchesRaw] = await Promise.all([
        this.requestRobleRead(accessToken, 'SesionJuego'),
        this.requestRobleRead(accessToken, 'seedsSudoku'),
        this.requestRobleRead(accessToken, 'pvp_matches'),
      ]);

      const sesiones = Array.isArray(sesionesRaw)
        ? (sesionesRaw as SesionJuegoRecord[])
        : [];
      const seeds = Array.isArray(seedsRaw)
        ? (seedsRaw as SeedSudokuRecord[])
        : [];
      const pvpMatches = Array.isArray(pvpMatchesRaw)
        ? (pvpMatchesRaw as PvpMatchRecord[])
        : [];

      const dificultadBySeedId = new Map<string, string>();
      const dificultadBySeedValue = new Map<string, string>();
      for (const row of seeds) {
        const id = this.normalizeUserId(row?.id) || this.normalizeUserId(row?._id);
        const seedValue = this.normalizeSeedValue(row?.seed);
        const dificultad = this.resolveBoardDifficultyLabel(row?.dificultad);
        if (!id || !dificultad) continue;
        dificultadBySeedId.set(id, dificultad);
        if (seedValue) {
          dificultadBySeedValue.set(seedValue, dificultad);
        }
      }

      const aggregate = new Map<string, { total: number; count: number }>();
      for (const sesion of sesiones) {
        const idSeed = this.normalizeUserId(sesion?.idseed);
        const seedValue = this.normalizeSeedValue(sesion?.idseed);
        if (!idSeed && !seedValue) continue;

        const dificultad =
          dificultadBySeedId.get(idSeed) ||
          dificultadBySeedValue.get(seedValue);
        if (!dificultad) continue;

        const tiempo = Number(sesion?.tiempo);
        if (!Number.isFinite(tiempo) || tiempo < 0) continue;

        const current = aggregate.get(dificultad) || { total: 0, count: 0 };
        current.total += tiempo;
        current.count += 1;
        aggregate.set(dificultad, current);
      }

      const pvpByDifficulty = new Map<string, number>();
      for (const match of pvpMatches) {
        if (!this.isPlayedPvpMatch(match)) continue;
        const dificultad = this.resolveBoardDifficultyLabel(match?.difficulty_key);
        if (!dificultad) continue;
        pvpByDifficulty.set(dificultad, (pvpByDifficulty.get(dificultad) || 0) + 1);
      }

      const rows = Array.from(aggregate.entries()).map(([dificultad, stats]) => ({
        dificultad,
        avgSeconds:
          stats.count > 0
            ? Math.round((stats.total / stats.count) * 100) / 100
            : 0,
        sessionsCount: stats.count,
      }));

      const byDifficulty = new Map(rows.map((row) => [this.normalizeDifficulty(row.dificultad), row]));
      return this.sudokuDifficulties.map((dificultad) => {
        const found = byDifficulty.get(this.normalizeDifficulty(dificultad));
        const sessionsCount = found?.sessionsCount ?? 0;
        const pvpMatchesCount = pvpByDifficulty.get(dificultad) || 0;
        return {
          dificultad,
          avgSeconds: found?.avgSeconds ?? 0,
          sessionsCount,
          pvpMatchesCount,
          totalUsagesCount: sessionsCount + pvpMatchesCount,
        };
      });
    } catch {
      return this.sudokuDifficulties.map((dificultad) => ({
        dificultad,
        avgSeconds: 0,
        sessionsCount: 0,
        pvpMatchesCount: 0,
        totalUsagesCount: 0,
      }));
    }
  }

  private normalizeDifficulty(value: unknown) {
    return String(value || '').trim().toLowerCase();
  }

  private resolveBoardDifficultyLabel(value: unknown) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const normalized = this.normalizeDifficulty(raw);
    return this.pvpDifficultyLabelsByKey[normalized] || raw;
  }

  private normalizeBoardDifficulty(value: unknown) {
    return this.normalizeDifficulty(this.resolveBoardDifficultyLabel(value));
  }

  private normalizeSeedValue(value: unknown) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(Math.trunc(value));
    }
    if (typeof value === 'string') {
      const normalized = value.trim();
      return normalized;
    }
    return '';
  }

  private invalidateSnapshotCache() {
    this.snapshotCache = null;
    this.snapshotCacheExpiresAt = 0;
  }

  private addUserGame(map: Map<string, Set<string>>, userId: string, game: string) {
    const current = map.get(userId) || new Set<string>();
    current.add(game);
    map.set(userId, current);
  }

  private setMinDate(map: Map<string, Date>, userId: string, date: Date) {
    const current = map.get(userId);
    if (!current || date < current) {
      map.set(userId, date);
    }
  }

  private parseDateInput(value: string | undefined, fallback: Date) {
    if (!value) return fallback;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed;
  }

  private parseDateSafe(value: unknown) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      const parsedFromNumber = new Date(value);
      return Number.isNaN(parsedFromNumber.getTime()) ? null : parsedFromNumber;
    }

    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    if (!normalized) return null;

    if (/^\d+$/.test(normalized)) {
      const numericValue = Number(normalized);
      if (Number.isFinite(numericValue)) {
        const parsedFromNumericString = new Date(numericValue);
        if (!Number.isNaN(parsedFromNumericString.getTime())) {
          return parsedFromNumericString;
        }
      }
    }

    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
  }

  private normalizeUserId(value: unknown) {
    if (typeof value !== 'string') return '';
    const normalized = value.trim();
    if (!normalized || normalized === 'undefined' || normalized === 'null') {
      return '';
    }
    return normalized;
  }

  private normalizeRecordId(value: unknown) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(Math.trunc(value));
    }
    if (typeof value === 'string') {
      const normalized = value.trim();
      if (normalized) return normalized;
    }
    return '';
  }

  private isPlayedPvpMatch(match: PvpMatchRecord) {
    const status = String(match?.status || '')
      .trim()
      .toUpperCase();
    if (status && status !== 'WAITING') {
      return true;
    }
    return Boolean(this.parseDateSafe(match?.started_at));
  }

  private *iterateDays(from: Date, to: Date) {
    const start = new Date(
      Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
    );
    const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
    for (let day = start; day <= end; day = new Date(day.getTime() + 86_400_000)) {
      yield day;
    }
  }

  private async getTorneosListFromContenedor1(accessToken: string) {
    const payload = await this.requestContenedor1('torneos', 'GET', undefined, {
      accessToken,
    });
    const payloadRecord = payload as { data?: unknown } | null;
    if (Array.isArray(payload)) return payload as TorneoRecord[];
    if (payloadRecord?.data && Array.isArray(payloadRecord.data)) {
      return payloadRecord.data as TorneoRecord[];
    }
    return [] as TorneoRecord[];
  }

  private async getAuthUserNamesByIdSafe(accessToken: string, userIds: Set<string>) {
    const map = new Map<string, string>();
    if (!userIds.size) return map;

    try {
      const payload = await this.requestContenedor1('auth/users', 'GET', undefined, {
        accessToken,
      });
      const rows = this.extractAuthUsersRows(payload);
      for (const row of rows) {
        const id = this.resolveAuthUserId(row);
        if (!id || !userIds.has(id)) continue;
        const name = this.resolveAuthUserName(row);
        if (!name) continue;
        map.set(id, name);
      }
    } catch {
      return map;
    }

    return map;
  }

  private extractAuthUsersRows(payload: unknown) {
    if (Array.isArray(payload)) return payload as Array<Record<string, unknown>>;
    if (
      payload &&
      typeof payload === 'object' &&
      Array.isArray((payload as { data?: unknown }).data)
    ) {
      return (payload as { data: Array<Record<string, unknown>> }).data;
    }
    if (
      payload &&
      typeof payload === 'object' &&
      Array.isArray((payload as { users?: unknown }).users)
    ) {
      return (payload as { users: Array<Record<string, unknown>> }).users;
    }
    return [] as Array<Record<string, unknown>>;
  }

  private resolveAuthUserId(row: Record<string, unknown>) {
    const candidates = [
      row.id,
      row.sub,
      row.uid,
      row.userId,
      row.usuarioId,
      row._id,
    ];
    for (const candidate of candidates) {
      const normalized = this.normalizeUserId(candidate);
      if (normalized) return normalized;
    }
    return '';
  }

  private resolveAuthUserName(row: Record<string, unknown>) {
    const rawName = [row.name, row.nombre, row.fullName];
    for (const candidate of rawName) {
      if (typeof candidate !== 'string') continue;
      const normalized = candidate.trim();
      if (
        normalized &&
        normalized !== 'undefined' &&
        normalized !== 'null'
      ) {
        return normalized;
      }
    }

    if (typeof row.email === 'string') {
      const email = row.email.trim();
      if (email) return email.split('@')[0] || email;
    }

    return '';
  }

  private async getParticipantesByTorneo(accessToken: string, torneoId: string) {
    const payload = await this.requestContenedor1(
      `torneos/${torneoId}/participantes`,
      'GET',
      undefined,
      { accessToken },
    );
    const payloadRecord = payload as { data?: unknown } | null;
    if (Array.isArray(payload)) return payload as ParticipanteRecord[];
    if (payloadRecord?.data && Array.isArray(payloadRecord.data)) {
      return payloadRecord.data as ParticipanteRecord[];
    }
    return [] as ParticipanteRecord[];
  }

  private async getTopRankingFromContenedor2(accessToken: string) {
    try {
      const payload = await this.requestContenedor2('pvp/ranking', 'GET', undefined, {
        accessToken,
      });
      const payloadRecord = payload as { data?: unknown } | null;
      if (Array.isArray(payload)) return payload as RankingRecord[];
      if (payloadRecord?.data && Array.isArray(payloadRecord.data)) {
        return payloadRecord.data as RankingRecord[];
      }
      return [] as RankingRecord[];
    } catch {
      return [] as RankingRecord[];
    }
  }

  private async getPvpMatchesFromRoble(accessToken: string) {
    try {
      const payload = await this.requestRobleRead(accessToken, 'pvp_matches');
      return Array.isArray(payload) ? (payload as PvpMatchRecord[]) : [];
    } catch {
      return [] as PvpMatchRecord[];
    }
  }

  private async getPvpMatchPlayersFromRoble(accessToken: string) {
    try {
      const payload = await this.requestRobleRead(accessToken, 'pvp_match_players');
      return Array.isArray(payload) ? (payload as PvpMatchPlayerRecord[]) : [];
    } catch {
      return [] as PvpMatchPlayerRecord[];
    }
  }

  private async getSudokuMatchesPlayed(accessToken: string) {
    try {
      const payload = await this.requestContenedor1(
        'game-stats/summary?juegoId=sudoku',
        'GET',
        undefined,
        { accessToken },
      );
      const payloadRecord = payload as { totalPartidasJugadas?: unknown } | null;
      return Number(payloadRecord?.totalPartidasJugadas || 0);
    } catch {
      return 0;
    }
  }

  private async getProfilesCountFromContenedor1(accessToken: string) {
    try {
      const payload = await this.requestContenedor1('profiles/count', 'GET', undefined, {
        accessToken,
      });
      const payloadRecord = payload as
        | { totalProfiles?: unknown; count?: unknown }
        | null;
      return Number(payloadRecord?.totalProfiles || payloadRecord?.count || 0);
    } catch {
      return 0;
    }
  }

  private async requestContenedor1(
    path: string,
    method: string,
    body?: unknown,
    options?: RequestOptions,
  ) {
    const base = this.contenedor1BaseUrl.replace(/\/+$/, '');
    return this.requestApi(base, path, method, body, options);
  }

  private async requestContenedor2(
    path: string,
    method: string,
    body?: unknown,
    options?: RequestOptions,
  ) {
    const base = this.contenedor2BaseUrl.replace(/\/+$/, '');
    return this.requestApi(base, path, method, body, options);
  }

  private async getAdminApiToken() {
    if (
      this.currentAdminApiToken &&
      !this.shouldRefreshCurrentToken(this.currentAdminApiToken)
    ) {
      return this.currentAdminApiToken;
    }

    if (!this.adminRefreshToken) {
      if (!this.hasAdminCredentials()) {
        return this.currentAdminApiToken;
      }
      return this.loginAdminWithLock();
    }

    if (this.refreshInFlight) {
      return this.refreshInFlight;
    }

    this.refreshInFlight = this.refreshAdminTokenWithFallback();
    try {
      return await this.refreshInFlight;
    } finally {
      this.refreshInFlight = null;
    }
  }

  private shouldRefreshCurrentToken(token: string) {
    if (!token) return true;
    if (!this.accessTokenExpMs) return false;
    const now = Date.now();
    return now >= this.accessTokenExpMs - 60_000;
  }

  private async refreshAdminToken() {
    if (!this.adminRefreshToken) {
      throw new Error('ADMIN_REFRESH_TOKEN no esta configurado.');
    }

    const payload = await this.requestContenedor1(
      'auth/refresh',
      'POST',
      { refreshToken: this.adminRefreshToken },
      { requiresAuth: false },
    );

    const accessToken = this.extractToken(payload, 'accessToken');
    const nextRefreshToken = this.extractToken(payload, 'refreshToken');

    if (!accessToken) {
      throw new Error('No fue posible refrescar ADMIN_API_TOKEN.');
    }

    this.currentAdminApiToken = accessToken;
    if (nextRefreshToken) {
      this.adminRefreshToken = nextRefreshToken;
    }
    this.accessTokenExpMs = this.decodeJwtExpMs(accessToken);
    return accessToken;
  }

  private async refreshAdminTokenWithFallback() {
    try {
      return await this.refreshAdminToken();
    } catch {
      if (this.hasAdminCredentials()) {
        return this.loginAdminWithLock();
      }

      if (this.currentAdminApiToken) {
        return this.currentAdminApiToken;
      }

      throw new Error(
        'No fue posible autenticar admin. Define ADMIN_REFRESH_TOKEN/ADMIN_API_TOKEN o ADMIN_EMAIL/ADMIN_PASSWORD.',
      );
    }
  }

  private hasAdminCredentials() {
    return Boolean(this.adminEmail && this.adminPassword);
  }

  private async loginAdminWithLock() {
    if (this.loginInFlight) {
      return this.loginInFlight;
    }

    this.loginInFlight = this.loginAsAdmin();
    try {
      return await this.loginInFlight;
    } finally {
      this.loginInFlight = null;
    }
  }

  private async loginAsAdmin() {
    if (!this.hasAdminCredentials()) {
      throw new Error('ADMIN_EMAIL/ADMIN_PASSWORD no estan configurados.');
    }

    const payload = await this.requestContenedor1(
      'auth/login',
      'POST',
      {
        email: this.adminEmail,
        password: this.adminPassword,
      },
      { requiresAuth: false },
    );

    const accessToken = this.extractToken(payload, 'accessToken');
    const refreshToken = this.extractToken(payload, 'refreshToken');
    if (!accessToken) {
      throw new Error('No fue posible obtener ADMIN_API_TOKEN desde /auth/login.');
    }

    this.currentAdminApiToken = accessToken;
    if (refreshToken) {
      this.adminRefreshToken = refreshToken;
    }
    this.accessTokenExpMs = this.decodeJwtExpMs(accessToken);
    return accessToken;
  }

  private extractToken(payload: unknown, key: 'accessToken' | 'refreshToken') {
    if (!payload || typeof payload !== 'object') return '';

    const direct = (payload as Record<string, unknown>)[key];
    if (typeof direct === 'string' && direct.trim()) {
      return direct.trim();
    }

    const nestedData = (payload as { data?: unknown }).data;
    if (!nestedData || typeof nestedData !== 'object') return '';

    const nested = (nestedData as Record<string, unknown>)[key];
    if (typeof nested === 'string' && nested.trim()) {
      return nested.trim();
    }
    return '';
  }

  private decodeJwtExpMs(token: string) {
    try {
      if (!token) return 0;
      const parts = token.split('.');
      if (parts.length < 2) return 0;
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf8'),
      ) as { exp?: number };
      if (!payload?.exp || typeof payload.exp !== 'number') return 0;
      return payload.exp * 1000;
    } catch {
      return 0;
    }
  }

  private async requestApi(
    baseUrl: string,
    path: string,
    method: string,
    body?: unknown,
    options?: RequestOptions,
  ) {
    const endpoint = String(path).replace(/^\/+/, '');
    const url = `${baseUrl}/${endpoint}`;

    const headers: Record<string, string> = { Accept: 'application/json' };

    const requiresAuth = options?.requiresAuth ?? true;
    if (requiresAuth) {
      const token = String(options?.accessToken || '').trim() || (await this.getAdminApiToken());
      if (!token) {
        throw new Error(
          'No hay token disponible. Define ADMIN_REFRESH_TOKEN/ADMIN_API_TOKEN o ADMIN_EMAIL/ADMIN_PASSWORD.',
        );
      }
      headers.Authorization = `Bearer ${token}`;
    }

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const raw = await response.text();
    let payload: unknown = null;
    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      const details =
        (payload as { message?: unknown; error?: unknown } | null)?.message ||
        (payload as { message?: unknown; error?: unknown } | null)?.error ||
        (raw && !payload
          ? `HTTP ${response.status} (respuesta no JSON)`
          : `Request failed with status ${response.status}`);
      throw new Error(Array.isArray(details) ? details.join(', ') : String(details));
    }

    return payload;
  }

  private async requestRobleRead(accessToken: string, tableName: string) {
    const base = String(process.env.ROBLE_DB_BASE || '').replace(/\/+$/, '');
    const dbName = String(process.env.ROBLE_DBNAME || '').trim();
    if (!base || !dbName) {
      throw new Error('ROBLE_DB_BASE/ROBLE_DBNAME no configurados.');
    }

    const path = `${dbName}/read?tableName=${encodeURIComponent(tableName)}`;
    return this.requestApi(base, path, 'GET', undefined, {
      requiresAuth: true,
      accessToken,
    });
  }
}
