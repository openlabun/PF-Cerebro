import { Injectable } from '@nestjs/common';
import { UpdateTorneoEstadoDto } from './dto/update-torneo-estado.dto';
import { CreateTorneoDto } from './dto/create-torneo.dto';

type TorneoRecord = {
  _id?: string;
  creadorId?: string;
  creadorNombre?: string;
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
};

type AverageTimeByDifficultyRow = {
  dificultad: string;
  avgSeconds: number;
  sessionsCount: number;
};

type AverageTimeBySeedRow = {
  seedId: string;
  seed: string;
  dificultad: string;
  avgSeconds: number;
  sessionsCount: number;
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
    usersByGame: Record<string, number>;
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
    process.env.CONTENEDOR2_BASE_URL || 'http://contenedor2:3001';
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

  async buildOverview() {
    const snapshot = await this.getAggregatedSnapshot();
    return snapshot.overview;
  }

  async getTotalUsers() {
    const snapshot = await this.getAggregatedSnapshot();
    return snapshot.usersTotal;
  }

  async getDashboardSnapshot(fromInput?: string, toInput?: string, includeTorneos = false) {
    const [overview, usersTotal, gamesByUser, usersTimeseries] = await Promise.all([
      this.buildOverview(),
      this.getTotalUsers(),
      this.getGamesByUser(),
      this.getUsersTimeSeries(fromInput, toInput),
    ]);
    const avgTimeByDifficulty = await this.getAverageTimeByDifficulty();

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

    const torneos = await this.getTorneos();
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

  async getUsersTimeSeries(fromInput?: string, toInput?: string) {
    const snapshot = await this.getAggregatedSnapshot();

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

  async getGamesByUser() {
    const snapshot = await this.getAggregatedSnapshot();
    return {
      data: snapshot.gamesByUser,
      source: 'contenedor1-contenedor2',
    };
  }

  async getAverageTimeByDifficulty() {
    const snapshot = await this.getAggregatedSnapshot();
    return {
      data: snapshot.averageTimeByDifficulty,
      source: 'SesionJuego-seedsSudoku',
    };
  }

  async getAverageTimeBySeedForDifficulty(dificultadInput: string) {
    const dificultad = String(dificultadInput || '').trim();
    if (!dificultad) {
      return {
        dificultad: '',
        data: [] as AverageTimeBySeedRow[],
        source: 'SesionJuego-seedsSudoku',
      };
    }

    try {
      const [sesionesRaw, seedsRaw] = await Promise.all([
        this.requestRobleRead('SesionJuego'),
        this.requestRobleRead('seedsSudoku'),
      ]);

      const sesiones = Array.isArray(sesionesRaw)
        ? (sesionesRaw as SesionJuegoRecord[])
        : [];
      const seeds = Array.isArray(seedsRaw)
        ? (seedsRaw as SeedSudokuRecord[])
        : [];

      const seedsForDifficulty = seeds.filter((row) => {
        return this.normalizeDifficulty(row?.dificultad) === this.normalizeDifficulty(dificultad);
      });

      const seedMetaById = new Map<string, { seed: string; dificultad: string }>();
      for (const row of seedsForDifficulty) {
        const id = this.normalizeUserId(row?.id) || this.normalizeUserId(row?._id);
        if (!id) continue;
        seedMetaById.set(id, {
          seed: String(row?.seed ?? ''),
          dificultad: String(row?.dificultad ?? dificultad),
        });
      }

      const aggregate = new Map<string, { total: number; count: number }>();
      for (const sesion of sesiones) {
        const seedId = this.normalizeUserId(sesion?.idseed);
        if (!seedId || !seedMetaById.has(seedId)) continue;
        const tiempo = Number(sesion?.tiempo);
        if (!Number.isFinite(tiempo) || tiempo < 0) continue;
        const current = aggregate.get(seedId) || { total: 0, count: 0 };
        current.total += tiempo;
        current.count += 1;
        aggregate.set(seedId, current);
      }

      const data = Array.from(seedMetaById.entries())
        .map(([seedId, meta]) => {
          const stats = aggregate.get(seedId) || { total: 0, count: 0 };
          const avgSeconds =
            stats.count > 0 ? Math.round((stats.total / stats.count) * 100) / 100 : 0;
          return {
            seedId,
            seed: meta.seed,
            dificultad: meta.dificultad,
            avgSeconds,
            sessionsCount: stats.count,
          };
        })
        .sort((a, b) => Number(a.seed || 0) - Number(b.seed || 0));

      return {
        dificultad,
        data,
        source: 'SesionJuego-seedsSudoku',
      };
    } catch {
      return {
        dificultad,
        data: [] as AverageTimeBySeedRow[],
        source: 'SesionJuego-seedsSudoku',
      };
    }
  }

  async getUserGames(userId: string) {
    const payload = await this.getGamesByUser();
    const user = payload.data.find((item) => item.userId === userId);
    if (!user) return null;

    return {
      userId: user.userId,
      games: user.games,
      source: 'contenedor1-contenedor2',
    };
  }

  async getTorneos() {
    const snapshot = await this.getAggregatedSnapshot();
    return snapshot.torneos;
  }

  async createTorneo(dto: CreateTorneoDto) {
    const payload = {
      ...dto,
      recurrencia: dto.recurrencia || 'NINGUNA',
      configuracion: dto.configuracion || {},
    };
    const result = await this.requestContenedor1('torneos', 'POST', payload);
    this.invalidateSnapshotCache();
    return result;
  }

  async patchTorneoEstado(torneoId: string, dto: UpdateTorneoEstadoDto) {
    const result = await this.requestContenedor1(`torneos/${torneoId}/estado`, 'PATCH', {
      estado: dto.estado,
      razon: dto.razon || 'Actualizado desde modulo admin',
    });
    this.invalidateSnapshotCache();
    return result;
  }

  async getTorneoById(torneoId: string) {
    return this.requestContenedor1(`torneos/${torneoId}`, 'GET');
  }

  async updateTorneo(torneoId: string, payload: Record<string, unknown>) {
    const result = await this.requestContenedor1(
      `torneos/${torneoId}`,
      'PUT',
      payload,
    );
    this.invalidateSnapshotCache();
    return result;
  }

  async getAuthUsers() {
    return this.requestContenedor1('auth/users', 'GET');
  }

  private async getAggregatedSnapshot() {
    const now = Date.now();
    if (this.snapshotCache && now < this.snapshotCacheExpiresAt) {
      return this.snapshotCache;
    }

    if (this.snapshotInFlight) {
      return this.snapshotInFlight;
    }

    this.snapshotInFlight = this.buildAggregatedSnapshot();
    try {
      const snapshot = await this.snapshotInFlight;
      this.snapshotCache = snapshot;
      this.snapshotCacheExpiresAt = Date.now() + this.cacheTtlMs;
      return snapshot;
    } finally {
      this.snapshotInFlight = null;
    }
  }

  private async buildAggregatedSnapshot() {
    const [torneos, ranking, sudokuMatchesPlayed, totalProfiles, averageTimeByDifficulty] = await Promise.all([
      this.getTorneosListFromContenedor1(),
      this.getTopRankingFromContenedor2(),
      this.getSudokuMatchesPlayed(),
      this.getProfilesCountFromContenedor1(),
      this.getAverageTimeByDifficultyFromRoble(),
    ]);

    const creatorIds = new Set<string>();
    for (const torneo of torneos) {
      const creatorId = this.normalizeUserId(torneo.creadorId);
      if (creatorId) creatorIds.add(creatorId);
    }
    const creatorNames = await this.getAuthUserNamesByIdSafe(creatorIds);
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
          const participantes = await this.getParticipantesByTorneo(torneo._id!);
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

    for (const row of ranking) {
      const userId = this.normalizeUserId(row.usuarioId);
      const date = this.parseDateSafe(row.fechaActualizacion);
      if (!userId) continue;

      this.addUserGame(perUserGames, userId, 'pvp');
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
    const usersByGame = gamesByUser.reduce<Record<string, number>>((acc, row) => {
      for (const game of row.games) {
        acc[game] = (acc[game] || 0) + 1;
      }
      return acc;
    }, {});

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
        usersByGame,
        source: 'contenedor1-contenedor2',
      },
      usersTotal: {
        totalUsers,
        source: 'contenedor1-contenedor2',
      },
    };
  }

  private async getAverageTimeByDifficultyFromRoble() {
    try {
      const [sesionesRaw, seedsRaw] = await Promise.all([
        this.requestRobleRead('SesionJuego'),
        this.requestRobleRead('seedsSudoku'),
      ]);

      const sesiones = Array.isArray(sesionesRaw)
        ? (sesionesRaw as SesionJuegoRecord[])
        : [];
      const seeds = Array.isArray(seedsRaw)
        ? (seedsRaw as SeedSudokuRecord[])
        : [];

      const dificultadBySeedId = new Map<string, string>();
      for (const row of seeds) {
        const id = this.normalizeUserId(row?.id) || this.normalizeUserId(row?._id);
        const dificultad = String(row?.dificultad || '').trim();
        if (!id || !dificultad) continue;
        dificultadBySeedId.set(id, dificultad);
      }

      const aggregate = new Map<string, { total: number; count: number }>();
      for (const sesion of sesiones) {
        const idSeed = this.normalizeUserId(sesion?.idseed);
        if (!idSeed) continue;

        const dificultad = dificultadBySeedId.get(idSeed);
        if (!dificultad) continue;

        const tiempo = Number(sesion?.tiempo);
        if (!Number.isFinite(tiempo) || tiempo < 0) continue;

        const current = aggregate.get(dificultad) || { total: 0, count: 0 };
        current.total += tiempo;
        current.count += 1;
        aggregate.set(dificultad, current);
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
        return (
          found || {
            dificultad,
            avgSeconds: 0,
            sessionsCount: 0,
          }
        );
      });
    } catch {
      return this.sudokuDifficulties.map((dificultad) => ({
        dificultad,
        avgSeconds: 0,
        sessionsCount: 0,
      }));
    }
  }

  private normalizeDifficulty(value: unknown) {
    return String(value || '').trim().toLowerCase();
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
    if (typeof value !== 'string') return null;
    const parsed = new Date(value);
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

  private *iterateDays(from: Date, to: Date) {
    const start = new Date(
      Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()),
    );
    const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
    for (let day = start; day <= end; day = new Date(day.getTime() + 86_400_000)) {
      yield day;
    }
  }

  private async getTorneosListFromContenedor1() {
    const payload = await this.requestContenedor1('torneos', 'GET');
    if (Array.isArray(payload)) return payload as TorneoRecord[];
    if (payload?.data && Array.isArray(payload.data)) return payload.data as TorneoRecord[];
    return [] as TorneoRecord[];
  }

  private async getAuthUserNamesByIdSafe(userIds: Set<string>) {
    const map = new Map<string, string>();
    if (!userIds.size) return map;

    try {
      const payload = await this.requestContenedor1('auth/users', 'GET');
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

  private async getParticipantesByTorneo(torneoId: string) {
    const payload = await this.requestContenedor1(`torneos/${torneoId}/participantes`, 'GET');
    if (Array.isArray(payload)) return payload as ParticipanteRecord[];
    if (payload?.data && Array.isArray(payload.data)) return payload.data as ParticipanteRecord[];
    return [] as ParticipanteRecord[];
  }

  private async getTopRankingFromContenedor2() {
    try {
      const payload = await this.requestContenedor2('pvp/ranking', 'GET');
      if (Array.isArray(payload)) return payload as RankingRecord[];
      if (payload?.data && Array.isArray(payload.data)) return payload.data as RankingRecord[];
      return [] as RankingRecord[];
    } catch {
      return [] as RankingRecord[];
    }
  }

  private async getSudokuMatchesPlayed() {
    try {
      const payload = await this.requestContenedor1(
        'game-stats/summary?juegoId=sudoku',
        'GET',
      );
      return Number(payload?.totalPartidasJugadas || 0);
    } catch {
      return 0;
    }
  }

  private async getProfilesCountFromContenedor1() {
    try {
      const payload = await this.requestContenedor1('profiles/count', 'GET');
      return Number(payload?.totalProfiles || payload?.count || 0);
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
      const token = await this.getAdminApiToken();
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
    const payload = raw ? JSON.parse(raw) : null;

    if (!response.ok) {
      const details =
        payload?.message ||
        payload?.error ||
        `Request failed with status ${response.status}`;
      throw new Error(Array.isArray(details) ? details.join(', ') : String(details));
    }

    return payload;
  }

  private async requestRobleRead(tableName: string) {
    const base = String(process.env.ROBLE_DB_BASE || '').replace(/\/+$/, '');
    const dbName = String(process.env.ROBLE_DBNAME || '').trim();
    if (!base || !dbName) {
      throw new Error('ROBLE_DB_BASE/ROBLE_DBNAME no configurados.');
    }

    const path = `${dbName}/read?tableName=${encodeURIComponent(tableName)}`;
    return this.requestApi(base, path, 'GET', undefined, { requiresAuth: true });
  }
}
