import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { RobleService } from '../roble/roble.service';
import { SudokuService } from '../sudoku/sudoku.service';
import { WebhookService } from '../webhook/webhook.service';
import { RankingService } from '../ranking/ranking.service';
import {
  getUserDisplayNameFromAccessToken,
  getUserIdFromAccessToken,
} from '../common/utils/jwt.utils';
import {
  CerebroPvpSyncMatchSnapshot,
  CerebroPvpSyncPlayerSnapshot,
  CerebroPvpSyncService,
} from './cerebro-pvp-sync.service';

// Compatibilidad con registros historicos que usaban sentinels en MovimientosPvP.
const LEGACY_ROW_JOIN = -1;
const LEGACY_ROW_FORFEIT = -2;
const LEGACY_ROW_FINISHED = -3;
const STANDALONE_MATCH_PREFIX = 'standalone:';
const DEFAULT_PVP_DIFFICULTY_KEY = 'medio';
const PVP_JOIN_CODE_LENGTH = 5;
const PVP_JOIN_CODE_MIN = 10 ** (PVP_JOIN_CODE_LENGTH - 1);
const PVP_JOIN_CODE_MAX = 10 ** PVP_JOIN_CODE_LENGTH - 1;

interface MatchRecord {
  _id?: string;
  torneoId: string;
  jugador1Id: string;
  jugador2Id: string | null;
  estado: string;
  seed: number;
  solution: number[][] | string;
  puntaje1: number;
  puntaje2: number;
  ganadorId: string | null;
  fechaCreacion: string;
  fechaInicio: string | null;
  fechaFin: string | null;
}

interface MovimientoRecord {
  _id?: string;
  matchId: string | number;
  usuarioId: string;
  row: number;
  col: number;
  value: number;
  esCorrecta: boolean;
  timestamp: string;
}

interface PlayerProgress {
  playerId: string;
  score: number;
  mistakes: number;
  correctCells: number;
  emptyCells: number;
  finished: boolean;
  finishedAt: string | null;
  durationMs: number | null;
  boardState: number[][];
}

interface MatchState {
  _id: string;
  torneoId: string | null;
  inviteToken: string | null;
  difficultyKey: string | null;
  jugador1Id: string;
  jugador2Id: string | null;
  estado: 'WAITING' | 'ACTIVE' | 'FINISHED' | 'FORFEIT';
  seed: number;
  solution: number[][];
  puntaje1: number;
  puntaje2: number;
  ganadorId: string | null;
  fechaCreacion: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  player1: PlayerProgress;
  player2: PlayerProgress | null;
}

interface PublicPlayerSummary {
  playerId: string;
  displayName?: string | null;
  score: number;
  mistakes: number;
  correctCells: number;
  emptyCells: number;
  finished: boolean;
  finishedAt: string | null;
  durationMs: number | null;
}

interface LegacyInferredState {
  jugador2Id: string | null;
  estado: MatchState['estado'];
  ganadorId: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
}

interface StandaloneMatchScope {
  inviteToken: string;
  difficultyKey: string | null;
}

interface Contenedor1ProfileResponse {
  nombre?: string | null;
}

function normalizeStoredBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  if (typeof value === 'number') return value !== 0;
  return false;
}

@Injectable()
export class MatchService {
  private readonly logger = new Logger(MatchService.name);
  private readonly contenedor1Url: string;
  private readonly matchOwnerToken = new Map<string, string>();
  private readonly userTokenCache = new Map<string, string>();
  private readonly userDisplayNameCache = new Map<string, string>();
  private readonly reservedStandaloneJoinCodes = new Set<string>();
  private reservedStandaloneJoinCodesLoaded = false;

  constructor(
    private readonly roble: RobleService,
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly sudokuService: SudokuService,
    private readonly webhookService: WebhookService,
    private readonly rankingService: RankingService,
    private readonly cerebroPvpSyncService: CerebroPvpSyncService,
  ) {
    this.contenedor1Url =
      this.config.get<string>('CONTENEDOR1_BASE_URL')?.trim() ?? '';
  }

  private stripSolution(state: MatchState) {
    const { solution, ...rest } = state;
    return {
      ...rest,
      joinCode: rest.inviteToken,
    };
  }

  private cacheUserToken(userId: string, token: string) {
    if (!userId || !token) return;
    this.userTokenCache.set(userId, token);
  }

  private normalizeOptionalString(value: unknown): string | null {
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  private normalizeJoinCode(value: unknown): string | null {
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const normalized = String(value).replace(/\D/g, '').trim();
    if (!normalized) return null;
    return /^\d{4,5}$/.test(normalized) ? normalized : null;
  }

  private rememberUserDisplayName(
    userId: string,
    displayName?: string,
  ) {
    if (!userId) return;

    const explicitName = this.normalizeOptionalString(displayName);
    if (explicitName) {
      this.userDisplayNameCache.set(userId, explicitName);
    }
  }

  private resolveUserDisplayName(userId: string | null | undefined): string | null {
    if (!userId) return null;
    return this.userDisplayNameCache.get(userId) ?? userId;
  }

  private getFallbackUserDisplayName(
    token?: string,
    displayName?: string,
  ): string | null {
    const explicitName = this.normalizeOptionalString(displayName);
    if (explicitName) return explicitName;

    return token
      ? this.normalizeOptionalString(getUserDisplayNameFromAccessToken(token))
      : null;
  }

  private async fetchContenedor1ProfileDisplayName(
    token?: string,
  ): Promise<string | null> {
    if (!token || !this.contenedor1Url) return null;

    try {
      const response = await firstValueFrom(
        this.http.post<Contenedor1ProfileResponse>(
          `${this.contenedor1Url}/profiles/me`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        ),
      );

      return this.normalizeOptionalString(response.data?.nombre);
    } catch (error: any) {
      this.logger.warn(
        `No se pudo resolver nombre desde Perfil en Contenedor1: ${error?.response?.data?.message || error?.message || error}`,
      );
      return null;
    }
  }

  private async primeUserDisplayName(
    userId: string,
    token?: string,
    displayName?: string,
  ) {
    if (!userId) return;
    if (this.userDisplayNameCache.has(userId)) return;

    const profileDisplayName = await this.fetchContenedor1ProfileDisplayName(
      token,
    );
    const resolvedDisplayName =
      profileDisplayName || this.getFallbackUserDisplayName(token, displayName);
    if (resolvedDisplayName) {
      this.rememberUserDisplayName(userId, resolvedDisplayName);
    }
  }

  private generateJoinCodeCandidate(): string {
    const randomValue = randomBytes(4).readUInt32BE(0);
    const numericRange = PVP_JOIN_CODE_MAX - PVP_JOIN_CODE_MIN + 1;
    return String(PVP_JOIN_CODE_MIN + (randomValue % numericRange));
  }

  private async ensureReservedJoinCodesLoaded(token: string) {
    if (this.reservedStandaloneJoinCodesLoaded) return;

    let matches: MatchRecord[] = [];
    try {
      matches = await this.roble.read<MatchRecord>(token, 'Matches');
    } catch (error) {
      this.logger.warn(
        `No se pudieron leer matches para cargar codigos PvP reservados: ${(error as Error)?.message || error}`,
      );
      return;
    }

    this.reservedStandaloneJoinCodes.clear();
    for (const match of matches) {
      const joinCode = this.parseStandaloneScope(match?.torneoId || null)?.inviteToken;
      if (joinCode) {
        this.reservedStandaloneJoinCodes.add(joinCode);
      }
    }

    this.reservedStandaloneJoinCodesLoaded = true;
  }

  private rememberReservedJoinCode(joinCode?: string | null) {
    const normalizedJoinCode = this.normalizeOptionalString(joinCode);
    if (normalizedJoinCode) {
      this.reservedStandaloneJoinCodes.add(normalizedJoinCode);
    }
  }

  private async generateUniqueJoinCode(token: string): Promise<string> {
    await this.ensureReservedJoinCodesLoaded(token);

    for (let attempt = 0; attempt < 40; attempt += 1) {
      const candidate = this.generateJoinCodeCandidate();
      if (!this.reservedStandaloneJoinCodes.has(candidate)) {
        return candidate;
      }
    }

    throw new BadRequestException(
      'No se pudo generar un codigo PvP disponible. Intenta de nuevo.',
    );
  }

  private buildStandaloneScopeId(
    inviteToken: string,
    difficultyKey?: string | null,
  ): string {
    const normalizedDifficultyKey =
      this.sudokuService.normalizeDifficultyKey(difficultyKey);
    return normalizedDifficultyKey
      ? `${STANDALONE_MATCH_PREFIX}${inviteToken}:${normalizedDifficultyKey}`
      : `${STANDALONE_MATCH_PREFIX}${inviteToken}`;
  }

  private parseStandaloneScope(
    torneoId: string | null,
  ): StandaloneMatchScope | null {
    const normalized = this.normalizeOptionalString(torneoId);
    if (!normalized?.startsWith(STANDALONE_MATCH_PREFIX)) return null;

    const scope = normalized.slice(STANDALONE_MATCH_PREFIX.length).trim();
    if (!scope) return null;

    const [inviteTokenRaw, difficultyKeyRaw] = scope.split(':', 2);
    const inviteToken = this.normalizeOptionalString(inviteTokenRaw);
    if (!inviteToken) return null;

    return {
      inviteToken,
      difficultyKey: this.sudokuService.normalizeDifficultyKey(difficultyKeyRaw),
    };
  }

  private ensureContenedor1Enabled() {
    if (this.contenedor1Url) return;
    throw new BadRequestException(
      'La integracion con torneos PvP no esta configurada en este entorno.',
    );
  }

  private requireInviteToken(
    expectedInviteToken: string | null,
    providedInviteToken?: string,
  ) {
    const expected =
      this.normalizeJoinCode(expectedInviteToken) ??
      this.normalizeOptionalString(expectedInviteToken);
    const provided =
      this.normalizeJoinCode(providedInviteToken) ??
      this.normalizeOptionalString(providedInviteToken);

    if (!expected) {
      throw new BadRequestException(
        'El match no tiene un token de invitacion valido.',
      );
    }

    if (!provided) {
      throw new ForbiddenException(
        'Se requiere un token de invitacion para unirse a esta partida.',
      );
    }

    if (provided !== expected) {
      throw new ForbiddenException('Token de invitacion invalido.');
    }
  }

  private rememberMatchOwnerToken(matchId: string, ownerId: string, token: string) {
    if (!matchId || !ownerId || !token) return;
    this.matchOwnerToken.set(matchId, token);
    this.userTokenCache.set(ownerId, token);
  }

  private resolveOwnerToken(matchId: string, ownerId: string): string | null {
    const byMatch = this.matchOwnerToken.get(matchId);
    if (byMatch) return byMatch;
    const byUser = this.userTokenCache.get(ownerId);
    return byUser || null;
  }

  private async updateMatchWithFallback(
    matchId: string,
    ownerId: string,
    requesterToken: string,
    updates: Record<string, unknown>,
  ) {
    try {
      return await this.roble.update<MatchRecord>(
        requesterToken,
        'Matches',
        '_id',
        matchId,
        updates,
      );
    } catch (err: any) {
      const status = err?.response?.status;
      if (status !== 403) throw err;

      const ownerToken = this.resolveOwnerToken(matchId, ownerId);
      if (!ownerToken || ownerToken === requesterToken) {
        throw err;
      }

      this.logger.warn(
        `Fallback update token for match=${matchId} owner=${ownerId} due to 403 with requester token`,
      );

      return this.roble.update<MatchRecord>(
        ownerToken,
        'Matches',
        '_id',
        matchId,
        updates,
      );
    }
  }

  private isUpdateMatchesPermissionError(err: any): boolean {
    const status = err?.response?.status ?? err?.status;
    const raw = JSON.stringify(err?.response?.data || err?.message || '')
      .toLowerCase();
    return status === 403 && raw.includes('update') && raw.includes('matches');
  }

  private async insertLegacyJoinEvent(
    matchId: string,
    usuarioId: string,
    token: string,
  ) {
    await this.roble.insert<MovimientoRecord>(token, 'MovimientosPvP', [
      {
        matchId,
        usuarioId,
        row: LEGACY_ROW_JOIN,
        col: 0,
        value: 0,
        esCorrecta: true,
        timestamp: new Date().toISOString(),
      },
    ]);
  }

  private async insertLegacyFinishedEvent(
    matchId: string,
    ganadorId: string,
    token: string,
  ) {
    await this.roble.insert<MovimientoRecord>(token, 'MovimientosPvP', [
      {
        matchId,
        usuarioId: ganadorId,
        row: LEGACY_ROW_FINISHED,
        col: 0,
        value: 0,
        esCorrecta: true,
        timestamp: new Date().toISOString(),
      },
    ]);
  }

  private async insertLegacyForfeitEvent(
    matchId: string,
    usuarioId: string,
    token: string,
  ) {
    await this.roble.insert<MovimientoRecord>(token, 'MovimientosPvP', [
      {
        matchId,
        usuarioId,
        row: LEGACY_ROW_FORFEIT,
        col: 0,
        value: 0,
        esCorrecta: true,
        timestamp: new Date().toISOString(),
      },
    ]);
  }

  private toPublicPlayerSummary(player: PlayerProgress): PublicPlayerSummary {
    return {
      playerId: player.playerId,
      score: player.score,
      mistakes: player.mistakes,
      correctCells: player.correctCells,
      emptyCells: player.emptyCells,
      finished: player.finished,
      finishedAt: player.finishedAt,
      durationMs: player.durationMs,
    };
  }

  private sanitizeMatchForUser(
    state: MatchState,
    usuarioId: string,
    requesterToken?: string,
  ) {
    const safe = this.stripSolution(state);
    const isPlayer1 = state.jugador1Id === usuarioId;
    const isPlayer2 = state.jugador2Id === usuarioId;
    if (!isPlayer1 && !isPlayer2) {
      throw new ForbiddenException('No eres jugador de este match');
    }

    const myGame = isPlayer1 ? state.player1 : state.player2!;
    const opponentGame = isPlayer1 ? state.player2 : state.player1;
    const myDisplayName = this.resolveUserDisplayName(myGame.playerId);
    const opponentDisplayName = opponentGame
      ? this.resolveUserDisplayName(opponentGame.playerId)
      : null;
    const winnerDisplayName = state.ganadorId
      ? this.resolveUserDisplayName(state.ganadorId)
      : null;

    return {
      _id: safe._id,
      torneoId: safe.torneoId,
      inviteToken: safe.inviteToken,
      joinCode: safe.inviteToken,
      difficultyKey: safe.difficultyKey,
      jugador1Id: safe.jugador1Id,
      jugador2Id: safe.jugador2Id,
      estado: safe.estado,
      seed: safe.seed,
      puntaje1: safe.puntaje1,
      puntaje2: safe.puntaje2,
      ganadorId: safe.ganadorId,
      myDisplayName,
      winnerDisplayName,
      fechaCreacion: safe.fechaCreacion,
      fechaInicio: safe.fechaInicio,
      fechaFin: safe.fechaFin,
      myGame,
      opponent: opponentGame
        ? {
            ...this.toPublicPlayerSummary(opponentGame),
            displayName: opponentDisplayName,
          }
        : null,
    };
  }

  private cloneBoard(board: number[][]): number[][] {
    return board.map((row) => [...row]);
  }

  private parseDateMs(isoDate: string | null): number | null {
    if (!isoDate) return null;
    const ms = new Date(isoDate).getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  private calculateDurationMs(
    startedAt: string | null,
    finishedAt: string | null,
  ): number | null {
    const startedMs = this.parseDateMs(startedAt);
    const finishedMs = this.parseDateMs(finishedAt);
    if (startedMs === null || finishedMs === null) return null;
    return Math.max(0, finishedMs - startedMs);
  }

  private getCerebroPlayerResult(
    state: MatchState,
    playerId: string,
    forfeitedByUserId: string | null,
  ): string {
    if (state.estado === 'FINISHED') {
      return state.ganadorId === playerId ? 'WIN' : 'LOSS';
    }
    if (state.estado === 'FORFEIT') {
      if (forfeitedByUserId && forfeitedByUserId === playerId) {
        return 'ABANDONED';
      }
      return state.ganadorId === playerId ? 'WIN' : 'LOSS';
    }
    if (state.estado === 'ACTIVE') {
      return 'IN_PROGRESS';
    }
    return 'PENDING';
  }

  private buildCerebroPlayerSnapshot(
    state: MatchState,
    player: PlayerProgress,
    slot: number,
    forfeitedByUserId: string | null,
    eloAfterByUserId?: Record<string, number | null>,
  ): CerebroPvpSyncPlayerSnapshot {
    return {
      userId: player.playerId,
      slot,
      result: this.getCerebroPlayerResult(
        state,
        player.playerId,
        forfeitedByUserId,
      ),
      finalScore: player.score,
      mistakes: player.mistakes,
      correctCells: player.correctCells,
      finished: player.finished,
      finishedAt: player.finishedAt,
      durationMs: player.durationMs,
      eloBefore: null,
      eloAfter: eloAfterByUserId?.[player.playerId] ?? null,
    };
  }

  private buildCerebroMatchSnapshot(
    state: MatchState,
    options?: {
      endedReason?: string | null;
      forfeitedByUserId?: string | null;
      eloAfterByUserId?: Record<string, number | null>;
    },
  ): CerebroPvpSyncMatchSnapshot {
    const players: CerebroPvpSyncPlayerSnapshot[] = [
      this.buildCerebroPlayerSnapshot(
        state,
        state.player1,
        1,
        options?.forfeitedByUserId ?? null,
        options?.eloAfterByUserId,
      ),
    ];

    if (state.player2) {
      players.push(
        this.buildCerebroPlayerSnapshot(
          state,
          state.player2,
          2,
          options?.forfeitedByUserId ?? null,
          options?.eloAfterByUserId,
        ),
      );
    }

    return {
      externalMatchId: state._id,
      seed: state.seed,
      difficultyKey: this.sudokuService.getDifficultyLabel(
        state.difficultyKey ?? DEFAULT_PVP_DIFFICULTY_KEY,
      ),
      mode: state.torneoId ? 'torneo' : 'standalone',
      torneoId: state.torneoId,
      status: state.estado,
      winnerUserId: state.ganadorId,
      createdAt: state.fechaCreacion,
      startedAt: state.fechaInicio,
      finishedAt: state.fechaFin,
      durationMs: this.calculateDurationMs(state.fechaInicio, state.fechaFin),
      endedReason:
        options?.endedReason ??
        (state.estado === 'FINISHED'
          ? 'completed'
          : state.estado === 'FORFEIT'
            ? 'forfeit'
            : null),
      forfeitedByUserId: options?.forfeitedByUserId ?? null,
      players,
    };
  }

  private async syncCerebroMatch(
    state: MatchState,
    options?: {
      endedReason?: string | null;
      forfeitedByUserId?: string | null;
      eloAfterByUserId?: Record<string, number | null>;
    },
  ) {
    await this.cerebroPvpSyncService.syncMatchSnapshot(
      this.buildCerebroMatchSnapshot(state, options),
    );
  }

  private inferLegacyState(
    base: MatchRecord,
    moves: MovimientoRecord[],
  ): LegacyInferredState {
    let jugador2Id = base.jugador2Id;
    let estado = (base.estado as MatchState['estado']) ?? 'WAITING';
    let ganadorId = base.ganadorId;
    let fechaInicio = base.fechaInicio;
    let fechaFin = base.fechaFin;

    for (const mov of moves) {
      const row = Number(mov.row);
      if (row === LEGACY_ROW_JOIN && !jugador2Id) {
        jugador2Id = mov.usuarioId;
        if (!fechaInicio) fechaInicio = mov.timestamp;
        if (estado === 'WAITING') estado = 'ACTIVE';
      }
      if (row === LEGACY_ROW_FORFEIT) {
        if (jugador2Id) {
          ganadorId =
            mov.usuarioId === base.jugador1Id ? jugador2Id : base.jugador1Id;
        }
        estado = 'FORFEIT';
        if (!fechaFin) fechaFin = mov.timestamp;
      }
      if (row === LEGACY_ROW_FINISHED) {
        estado = 'FINISHED';
        if (!ganadorId) ganadorId = mov.usuarioId;
        if (!fechaFin) fechaFin = mov.timestamp;
      }
    }

    return { jugador2Id, estado, ganadorId, fechaInicio, fechaFin };
  }

  private calculatePlayerProgress(
    playerId: string,
    baseBoard: number[][],
    difficultyKey: string | null,
    allMoves: MovimientoRecord[],
    startedAt: string | null,
    referenceNowMs: number,
    matchEndedAt: string | null = null,
  ): PlayerProgress {
    const boardState = this.cloneBoard(baseBoard);
    const emptyCells = baseBoard.flat().filter((c) => c === 0).length;
    let mistakes = 0;
    let correctCells = 0;
    let finished = false;
    let finishedAt: string | null = null;

    const moves = allMoves
      .filter((m) => m.usuarioId === playerId)
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

    for (const mov of moves) {
      const row = Number(mov.row);
      const col = Number(mov.col);
      const value = Number(mov.value);

      if (row < 0 || row > 8 || col < 0 || col > 8) continue;
      if (value < 1 || value > 9) continue;
      if (baseBoard[row][col] !== 0) continue;
      if (boardState[row][col] !== 0) continue;

      const isCorrect = normalizeStoredBoolean(mov.esCorrecta);
      if (isCorrect) {
        boardState[row][col] = value;
        correctCells += 1;
        if (!finished && correctCells === emptyCells) {
          finished = true;
          finishedAt = mov.timestamp;
        }
      } else {
        mistakes += 1;
      }
    }

    const startedMs = this.parseDateMs(startedAt);
    const finishedMs = this.parseDateMs(finishedAt);
    const matchEndedMs = this.parseDateMs(matchEndedAt);
    const effectiveEndMs = finishedMs ?? matchEndedMs;
    const durationMs =
      startedMs !== null && effectiveEndMs !== null
        ? Math.max(0, effectiveEndMs - startedMs)
        : null;
    const elapsedMsForScore =
      durationMs ??
      (startedMs !== null ? Math.max(0, referenceNowMs - startedMs) : 0);
    const score = this.sudokuService.calculateScoreFromProgress({
      solvedEditableCells: correctCells,
      elapsedMs: elapsedMsForScore,
      errorCount: mistakes,
      hintsUsed: 0,
      difficultyKey,
    });

    return {
      playerId,
      score,
      mistakes,
      correctCells,
      emptyCells,
      finished,
      finishedAt,
      durationMs,
      boardState,
    };
  }

  private async rebuildState(
    matchId: string,
    token: string,
  ): Promise<MatchState> {
    const matches = await this.roble.read<MatchRecord>(token, 'Matches', {
      _id: matchId,
    });
    const base = matches[0];
    if (!base) throw new NotFoundException('Match no encontrado');

    let movimientos: MovimientoRecord[] = [];
    try {
      movimientos = await this.roble.read<MovimientoRecord>(
        token,
        'MovimientosPvP',
        { matchId },
      );
    } catch {
      // Table empty or doesn't have records yet
    }

    movimientos.sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const legacy = this.inferLegacyState(base, movimientos);

    const storedTorneoId = this.normalizeOptionalString(base.torneoId);
    const standaloneScope = this.parseStandaloneScope(storedTorneoId);
    const difficultyKey = standaloneScope?.difficultyKey ?? null;
    const { board, solution } = this.sudokuService.generateBoard(
      Number(base.seed),
      difficultyKey ?? undefined,
    );
    const referenceNowMs = Date.now();
    const startedAt = legacy.fechaInicio ?? base.fechaInicio ?? null;
    const matchEndedAt =
      legacy.estado === 'FINISHED' || legacy.estado === 'FORFEIT'
        ? legacy.fechaFin ?? base.fechaFin ?? null
        : null;
    const player1 = this.calculatePlayerProgress(
      base.jugador1Id,
      board,
      difficultyKey,
      movimientos,
      startedAt,
      referenceNowMs,
      matchEndedAt,
    );
    const player2 = legacy.jugador2Id
      ? this.calculatePlayerProgress(
          legacy.jugador2Id,
          board,
          difficultyKey,
          movimientos,
          startedAt,
          referenceNowMs,
          matchEndedAt,
        )
      : null;

    const state: MatchState = {
      _id: base._id!,
      torneoId: standaloneScope ? null : storedTorneoId,
      inviteToken: standaloneScope?.inviteToken ?? null,
      difficultyKey,
      jugador1Id: base.jugador1Id,
      jugador2Id: legacy.jugador2Id,
      estado: legacy.estado,
      seed: Number(base.seed),
      solution,
      puntaje1: player1.score,
      puntaje2: player2?.score ?? 0,
      ganadorId: null,
      fechaCreacion: base.fechaCreacion,
      fechaInicio: legacy.fechaInicio,
      fechaFin: legacy.fechaFin,
      player1,
      player2,
    };

    state.ganadorId = legacy.ganadorId;

    return state;
  }

  private async verifyTorneoPvp(torneoId: string, tokenC1: string) {
    this.ensureContenedor1Enabled();
    try {
      const res = await firstValueFrom(
        this.http.get(`${this.contenedor1Url}/torneos/${torneoId}`, {
          headers: { Authorization: `Bearer ${tokenC1}` },
        }),
      );
      const torneo = res.data;
      if (torneo.tipo !== 'PVP') {
        throw new BadRequestException('El torneo no es de tipo PVP');
      }
      return torneo;
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      const status = err?.response?.status;
      const data = err?.response?.data;
      const code = err?.code;
      const url = `${this.contenedor1Url}/torneos/${torneoId}`;
      this.logger.error(
        `verifyTorneoPvp failed: url=${url} code=${code} status=${status} data=${JSON.stringify(data)} message=${err?.message} name=${err?.name}`,
      );
      if (status === 404) {
        throw new NotFoundException('Torneo no encontrado en Contenedor1');
      }
      throw new BadRequestException(
        `Error verificando torneo en C1 (${code || err?.name || 'unknown'}): ${data?.message || err?.message || url}`,
      );
    }
  }

  private async verifyParticipante(torneoId: string, tokenC1: string) {
    this.ensureContenedor1Enabled();
    const c1UserId = getUserIdFromAccessToken(tokenC1);
    if (!c1UserId) {
      throw new BadRequestException(
        'No se pudo obtener el userId del tokenC1',
      );
    }
    try {
      const res = await firstValueFrom(
        this.http.get(
          `${this.contenedor1Url}/torneos/${torneoId}/participantes`,
          { headers: { Authorization: `Bearer ${tokenC1}` } },
        ),
      );
      const participantes: any[] = res.data;
      const isParticipant = participantes.some(
        (p) =>
          p.usuarioId === c1UserId ||
          p.userId === c1UserId ||
          p._id === c1UserId,
      );
      if (!isParticipant) {
        throw new ForbiddenException('No estas inscrito en este torneo');
      }
    } catch (err: any) {
      if (err instanceof ForbiddenException) throw err;
      const data = err?.response?.data;
      this.logger.error(
        `verifyParticipante failed: ${JSON.stringify(data)} ${err?.message}`,
      );
      throw new BadRequestException(
        `No se pudo verificar participacion: ${data?.message || err?.message || 'unknown'}`,
      );
    }
  }

  async createMatch(
    torneoId: string | undefined,
    usuarioId: string,
    token: string,
    tokenC1?: string,
    difficultyKey?: string,
    displayName?: string,
  ) {
    this.cacheUserToken(usuarioId, token);
    await this.primeUserDisplayName(usuarioId, token, displayName);
    const normalizedTorneoId = this.normalizeOptionalString(torneoId);
    const normalizedTokenC1 = this.normalizeOptionalString(tokenC1);
    const normalizedDifficultyKey =
      this.sudokuService.normalizeDifficultyKey(difficultyKey) ??
      DEFAULT_PVP_DIFFICULTY_KEY;

    if (normalizedTorneoId) {
      if (!normalizedTokenC1) {
        throw new BadRequestException(
          'Se requiere tokenC1 para crear un match asociado a torneo.',
        );
      }
      await this.verifyTorneoPvp(normalizedTorneoId, normalizedTokenC1);
      await this.verifyParticipante(normalizedTorneoId, normalizedTokenC1);
    }

    const seed = Math.floor(Math.random() * 1000000);
    const { solution } = this.sudokuService.generateBoard(
      seed,
      normalizedDifficultyKey,
    );
    const inviteToken = normalizedTorneoId
      ? null
      : await this.generateUniqueJoinCode(token);
    const storedTorneoId = normalizedTorneoId
      ? normalizedTorneoId
      : this.buildStandaloneScopeId(inviteToken!, normalizedDifficultyKey);

    const result = await this.roble.insert<MatchRecord>(token, 'Matches', [
      {
        torneoId: storedTorneoId,
        jugador1Id: usuarioId,
        jugador2Id: null,
        estado: 'WAITING',
        seed,
        solution,
        puntaje1: 0,
        puntaje2: 0,
        ganadorId: null,
        fechaCreacion: new Date().toISOString(),
        fechaInicio: null,
        fechaFin: null,
      },
    ]);

    const created = result.inserted[0];
    if (!created?._id) {
      const reason =
        result.skipped?.[0]?.reason ?? 'ROBLE no reporto el motivo del rechazo';
      this.logger.error(
        `createMatch skipped by ROBLE: ${JSON.stringify(result.skipped || [])}`,
      );
      throw new BadRequestException(`No se pudo crear el match: ${reason}`);
    }

    this.rememberMatchOwnerToken(created._id!, usuarioId, token);
    this.rememberReservedJoinCode(inviteToken);
    const state = await this.rebuildState(created._id!, token);
    await this.syncCerebroMatch(state);
    return this.stripSolution(state);
  }

  async joinMatch(
    matchId: string,
    usuarioId: string,
    token: string,
    tokenC1?: string,
    inviteToken?: string,
    displayName?: string,
  ) {
    this.cacheUserToken(usuarioId, token);
    await this.primeUserDisplayName(usuarioId, token, displayName);
    const state = await this.rebuildState(matchId, token);
    if (state.estado !== 'WAITING')
      throw new BadRequestException('El match no esta en espera');
    if (state.jugador1Id === usuarioId) {
      throw new BadRequestException('No puedes jugar contra ti mismo');
    }

    if (state.torneoId) {
      const normalizedTokenC1 = this.normalizeOptionalString(tokenC1);
      if (!normalizedTokenC1) {
        throw new BadRequestException(
          'Se requiere tokenC1 para unirse a este match asociado a torneo.',
        );
      }
      await this.verifyParticipante(state.torneoId, normalizedTokenC1);
    } else {
      this.requireInviteToken(state.inviteToken, inviteToken);
    }

    try {
      await this.updateMatchWithFallback(matchId, state.jugador1Id, token, {
        jugador2Id: usuarioId,
        estado: 'ACTIVE',
        fechaInicio: new Date().toISOString(),
      });
    } catch (err) {
      if (!this.isUpdateMatchesPermissionError(err)) throw err;
      this.logger.warn(
        `No permission to UPDATE Matches on join. Falling back to legacy join event for match=${matchId}`,
      );
      await this.insertLegacyJoinEvent(matchId, usuarioId, token);
    }

    this.webhookService
      .emit(
        'match.started',
        [state.jugador1Id, usuarioId],
        {
          matchId,
          seed: state.seed,
          jugadores: [state.jugador1Id, usuarioId],
        },
        token,
      )
      .catch((e) => this.logger.warn(`Webhook emit error: ${e.message}`));

    const updated = await this.rebuildState(matchId, token);
    await this.syncCerebroMatch(updated);
    return this.stripSolution(updated);
  }

  async joinMatchByCode(
    joinCode: string,
    usuarioId: string,
    token: string,
    displayName?: string,
  ) {
    const normalizedJoinCode = this.normalizeJoinCode(joinCode);
    if (!normalizedJoinCode) {
      throw new BadRequestException(
        'Ingresa un codigo PvP valido de 4 o 5 digitos.',
      );
    }

    let matches: MatchRecord[] = [];
    try {
      matches = await this.roble.read<MatchRecord>(token, 'Matches');
    } catch (error) {
      this.logger.warn(
        `No se pudieron leer matches para unirse por codigo PvP: ${(error as Error)?.message || error}`,
      );
      throw new NotFoundException(
        'No hay partidas disponibles con ese codigo.',
      );
    }

    const candidates = matches
      .filter((match) => match?._id)
      .filter((match) => {
        const standaloneScope = this.parseStandaloneScope(match.torneoId);
        return standaloneScope?.inviteToken === normalizedJoinCode;
      })
      .sort(
        (left, right) =>
          new Date(right.fechaCreacion || 0).getTime() -
          new Date(left.fechaCreacion || 0).getTime(),
      );

    for (const candidate of candidates) {
      try {
        const state = await this.rebuildState(candidate._id!, token);
        if (
          !state.torneoId &&
          state.inviteToken === normalizedJoinCode &&
          state.estado === 'WAITING'
        ) {
          return this.joinMatch(
            state._id,
            usuarioId,
            token,
            undefined,
            normalizedJoinCode,
            displayName,
          );
        }
      } catch (error) {
        this.logger.warn(
          `No se pudo evaluar el match ${candidate._id} para join-by-code: ${(error as Error)?.message || error}`,
        );
      }
    }

    throw new NotFoundException('No hay partidas en espera con ese codigo.');
  }

  async makeMove(
    matchId: string,
    usuarioId: string,
    row: number,
    col: number,
    value: number,
    esCorrecta: boolean,
    token: string,
  ) {
    this.cacheUserToken(usuarioId, token);
    const state = await this.rebuildState(matchId, token);
    if (state.estado !== 'ACTIVE')
      throw new BadRequestException('El match no esta activo');
    if (state.jugador1Id !== usuarioId && state.jugador2Id !== usuarioId) {
      throw new ForbiddenException('No eres jugador de este match');
    }
    if (!state.jugador2Id) {
      throw new BadRequestException('El match no tiene segundo jugador');
    }

    const playerBefore =
      usuarioId === state.jugador1Id ? state.player1 : state.player2!;
    if (playerBefore.finished) {
      throw new BadRequestException('Ya terminaste tu partida');
    }

    const { board } = this.sudokuService.generateBoard(
      state.seed,
      state.difficultyKey ?? undefined,
    );
    if (board[row][col] !== 0) {
      throw new BadRequestException('No puedes modificar una celda fija');
    }
    if (playerBefore.boardState[row][col] !== 0) {
      throw new BadRequestException('Esa celda ya fue resuelta por ti');
    }

    const clientReportedCorrectness = normalizeStoredBoolean(esCorrecta);
    const isCorrect = this.sudokuService.validateMove(
      state.solution,
      row,
      col,
      value,
    );
    if (clientReportedCorrectness !== isCorrect) {
      this.logger.warn(
        `Client correctness mismatch for match=${matchId} user=${usuarioId} row=${row} col=${col} value=${value}`,
      );
    }

    await this.roble.insert<MovimientoRecord>(token, 'MovimientosPvP', [
      {
        matchId: state._id,
        usuarioId,
        row,
        col,
        value,
        esCorrecta: isCorrect,
        timestamp: new Date().toISOString(),
      },
    ]);

    const updated = await this.rebuildState(matchId, token);
    const playerAfter =
      usuarioId === updated.jugador1Id ? updated.player1 : updated.player2!;
    const playerFinishedNow = !playerBefore.finished && playerAfter.finished;

    if (playerFinishedNow) {
      this.webhookService
        .emit(
          'player.finished',
          [updated.jugador1Id, updated.jugador2Id!],
          {
            matchId,
            playerId: usuarioId,
            score: playerAfter.score,
            mistakes: playerAfter.mistakes,
            durationMs: playerAfter.durationMs,
            finishedAt: playerAfter.finishedAt,
          },
          token,
        )
        .catch((e) => this.logger.warn(`Webhook emit error: ${e.message}`));
      const ganadorId = usuarioId;
      const perdedorId =
        ganadorId === updated.jugador1Id ? updated.jugador2Id! : updated.jugador1Id;
      const fechaFin = playerAfter.finishedAt ?? new Date().toISOString();

      try {
        await this.updateMatchWithFallback(
          matchId,
          updated.jugador1Id,
          token,
          {
            estado: 'FINISHED',
            ganadorId,
            fechaFin,
            puntaje1: updated.player1.score,
            puntaje2: updated.player2?.score ?? 0,
          },
        );
      } catch (err) {
        if (!this.isUpdateMatchesPermissionError(err)) throw err;
        this.logger.warn(
          `No permission to UPDATE Matches on finish. Falling back to legacy finished event for match=${matchId}`,
        );
        await this.insertLegacyFinishedEvent(matchId, ganadorId, token);
      }

      const eloResult = await this.rankingService.updateElo(
        ganadorId,
        perdedorId,
        token,
      );
      const finishedState = await this.rebuildState(matchId, token);
      const p1 = finishedState.player1;
      const p2 = finishedState.player2!;
      await this.syncCerebroMatch(finishedState, {
        endedReason: 'completed',
        eloAfterByUserId: {
          [eloResult.ganador.usuarioId]: eloResult.ganador.nuevoElo,
          [eloResult.perdedor.usuarioId]: eloResult.perdedor.nuevoElo,
        },
      });

      this.webhookService
        .emit(
          'match.finished',
          [updated.jugador1Id, updated.jugador2Id!],
          {
            matchId,
            ganadorId,
            puntajeFinal: {
              [finishedState.jugador1Id]: p1.score,
              [finishedState.jugador2Id!]: p2.score,
            },
            duracionMs: {
              [finishedState.jugador1Id]: p1.durationMs,
              [finishedState.jugador2Id!]: p2.durationMs,
            },
            nuevoElo: {
              [eloResult.ganador.usuarioId]: eloResult.ganador.nuevoElo,
              [eloResult.perdedor.usuarioId]: eloResult.perdedor.nuevoElo,
            },
          },
          token,
        )
        .catch((e) => this.logger.warn(`Webhook emit error: ${e.message}`));

        return {
          esCorrecta: isCorrect,
          matchTerminado: true,
          ganadorId,
          puntaje1: p1.score,
          puntaje2: p2.score,
          playerFinished: playerAfter.finished,
          myScore: playerAfter.score,
          myMistakes: playerAfter.mistakes,
        };
    }

    return {
      esCorrecta: isCorrect,
      matchTerminado: false,
      puntaje1: updated.player1.score,
      puntaje2: updated.player2?.score ?? 0,
      playerFinished: playerAfter.finished,
      myScore: playerAfter.score,
      myMistakes: playerAfter.mistakes,
    };
  }

  async getMatch(matchId: string, usuarioId: string, token: string) {
    this.cacheUserToken(usuarioId, token);
    await this.primeUserDisplayName(usuarioId, token);
    const state = await this.rebuildState(matchId, token);
    return this.sanitizeMatchForUser(state, usuarioId, token);
  }

  async forfeit(matchId: string, usuarioId: string, token: string) {
    this.cacheUserToken(usuarioId, token);
    const state = await this.rebuildState(matchId, token);
    if (state.estado !== 'ACTIVE')
      throw new BadRequestException('El match no esta activo');
    if (state.jugador1Id !== usuarioId && state.jugador2Id !== usuarioId) {
      throw new ForbiddenException('No eres jugador de este match');
    }

    const j2Id = state.jugador2Id!;
    const oponenteId =
      state.jugador1Id === usuarioId ? j2Id : state.jugador1Id;

    try {
      await this.updateMatchWithFallback(matchId, state.jugador1Id, token, {
        estado: 'FORFEIT',
        ganadorId: oponenteId,
        fechaFin: new Date().toISOString(),
        puntaje1: state.player1.score,
        puntaje2: state.player2?.score ?? 0,
      });
    } catch (err) {
      if (!this.isUpdateMatchesPermissionError(err)) throw err;
      this.logger.warn(
        `No permission to UPDATE Matches on forfeit. Falling back to legacy forfeit event for match=${matchId}`,
      );
      await this.insertLegacyForfeitEvent(matchId, usuarioId, token);
    }

    const eloResult = await this.rankingService.updateElo(
      oponenteId,
      usuarioId,
      token,
    );
    const finalState = await this.rebuildState(matchId, token);
    await this.syncCerebroMatch(finalState, {
      endedReason: 'forfeit',
      forfeitedByUserId: usuarioId,
      eloAfterByUserId: {
        [eloResult.ganador.usuarioId]: eloResult.ganador.nuevoElo,
        [eloResult.perdedor.usuarioId]: eloResult.perdedor.nuevoElo,
      },
    });

    this.webhookService
      .emit(
        'player.forfeit',
        [state.jugador1Id, j2Id],
        {
          matchId,
          playerId: usuarioId,
          ganadorId: oponenteId,
          razon: `El jugador ${usuarioId} abandono la partida`,
        },
        token,
      )
      .catch((e) => this.logger.warn(`Webhook emit error: ${e.message}`));

    this.webhookService
      .emit(
        'match.forfeit',
        [state.jugador1Id, j2Id],
        {
          matchId,
          playerId: usuarioId,
          ganadorId: oponenteId,
          razon: `El jugador ${usuarioId} abandono la partida`,
        },
        token,
      )
      .catch((e) => this.logger.warn(`Webhook emit error: ${e.message}`));

    return { matchId, ganadorId: oponenteId, estado: 'FORFEIT' };
  }
}
