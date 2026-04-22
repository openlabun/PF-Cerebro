import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RobleService } from 'src/roble/roble.service';
import { CreateTorneoDto } from './dto/create-torneo.dto';
import { CreateResultadoDto } from './dto/create-resultado.dto';
import { EstadoTorneo } from './enums/estado-torneo.enum';
import { generarCodigoAcceso } from 'src/common/utils/codigo-acceso.util';
import { UpdateTorneoDto } from './dto/update-torneo.dto';
import {
  calculateSudokuTournamentScore,
  generateSudokuSolution,
  isSolvedSudokuBoard,
  resolveSudokuTournamentDifficulty,
  resolveSudokuTournamentSeed,
  validateSudokuBoardShape,
} from './utils/sudoku-tournament.util';

type TorneoRecord = {
  _id?: string;
  nombre: string;
  descripcion: string;
  creadorId: string;
  creadorNombre?: string | null;
  inscrito?: boolean;
  codigoAcceso: string | null;
  esPublico: boolean;
  estado: string;
  tipo: string;
  fechaInicio: string;
  fechaFin: string;
  recurrencia: string | null;
  configuracion: Record<string, unknown> | null;
  fechaCreacion: string;
};

type ParticipanteRecord = {
  _id?: string;
  torneoId: string;
  usuarioId: string;
  usuarioNombre?: string | null;
  fechaUnion: string;
};

type ResultadoRecord = {
  _id?: string;
  torneoId: string;
  usuarioId: string;
  usuarioNombre?: string | null;
  puntaje: number;
  tiempo: number;
  fechaRegistro: string;
};

type PerfilBasicoRecord = {
  _id?: string;
  usuarioId: string;
  nombre?: string | null;
};

type SesionTorneoRecord = {
  _id?: string;
  torneoId: string;
  usuarioId: string;
  usuarioNombre?: string | null;
  juegoId: string;
  estado: string;
  seed: string | null;
  seedId: string | null;
  intentoNumero: number;
  fechaInicio: string;
  fechaFin: string | null;
  tiempoTranscurrido: number | null;
  puntajeFinal: number | null;
  errores: number | null;
  pistasUsadas: number | null;
};

type SudokuTournamentBoardDefinition = {
  index: number;
  seed: string;
};

type SudokuTournamentRules = {
  juegoId: 'sudoku';
  difficultyKey: string;
  difficultyLabel: string;
  holes: number;
  seed: string;
  seedId: string | null;
  hintLimit: 0;
  timeLimitSeconds: number;
  attemptLimit: number;
  boardCount: number;
  boards: SudokuTournamentBoardDefinition[];
  torneoTipo: string;
};

type StartTournamentSessionResponse = {
  tournament: TorneoRecord;
  session: SesionTorneoRecord;
  game: SudokuTournamentRules;
  resumed: boolean;
};

type FinishTournamentSessionResponse = {
  tournament: TorneoRecord;
  session: SesionTorneoRecord;
  result: ResultadoRecord | null;
  outcome: 'FINALIZADA' | 'EXPIRADA';
  elapsedSeconds: number;
  score: number;
  timeLimitSeconds: number;
  completedBoards: number;
  totalBoards: number;
};

type HistorialParticipacionRecord = TorneoRecord & {
  fechaUnion: string | null;
  miPosicion: number | null;
  miPuntaje: number | null;
  miTiempo: number | null;
  miFechaRegistro: string | null;
};

@Injectable()
export class TorneosService {
  private readonly TABLE_TORNEOS = 'Torneos';
  private readonly TABLE_PARTICIPANTES = 'Participantes';
  private readonly TABLE_RESULTADOS = 'ResultadosTorneo';
  private readonly TABLE_SESIONES = 'SesionesTorneo';
  private readonly SESSION_STATUS_INICIADA = 'INICIADA';
  private readonly SESSION_STATUS_FINALIZADA = 'FINALIZADA';
  private readonly SESSION_STATUS_ABANDONADA = 'ABANDONADA';
  private readonly SESSION_STATUS_EXPIRADA = 'EXPIRADA';
  private readonly TOURNAMENT_GAME_SUDOKU = 'sudoku';
  private readonly TOURNAMENT_TYPE_SERIE = 'SERIE';
  private readonly DEFAULT_TOURNAMENT_DURATION_MINUTES = 15;
  private readonly DEFAULT_TOURNAMENT_BOARD_COUNT = 1;

  constructor(private readonly roble: RobleService) {}

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  }

  private isAdminRole(userRole?: string): boolean {
    return String(userRole ?? '').trim().toLowerCase() === 'admin';
  }

  private canManageTournament(
    torneo: TorneoRecord,
    usuarioId: string,
    userRole?: string,
  ): boolean {
    return torneo.creadorId === usuarioId || this.isAdminRole(userRole);
  }

  private toUpperSafe(value: unknown): string {
    if (typeof value !== 'string') return '';
    return value.trim().toUpperCase();
  }

  private normalizeUserId(value: unknown): string {
    return String(value ?? '').trim();
  }

  private toSafeInteger(value: unknown): number | null {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    return Math.trunc(parsed);
  }

  private getTournamentConfig(
    torneo: Pick<TorneoRecord, 'configuracion'>,
  ): Record<string, unknown> {
    return this.isPlainObject(torneo.configuracion) ? torneo.configuracion : {};
  }

  private resolvePositiveLimit(value: unknown): number | null {
    const parsed = this.toSafeInteger(value);
    if (parsed === null || parsed <= 0) {
      return null;
    }
    return parsed;
  }

  private sanitizeTournamentConfig(
    value: unknown,
    options: { strict?: boolean } = {},
  ): Record<string, unknown> {
    const config = this.isPlainObject(value) ? value : {};
    const strictMode = options.strict === true;
    const rawDifficulty = String(config.dificultad ?? '').trim();
    const resolvedDurationMinutes = this.resolvePositiveLimit(
      config.duracionMaximaMin,
    );
    const resolvedBoardCount = this.resolvePositiveLimit(
      config.numeroTableros ?? config.cantidadTableros ?? config.tableros,
    );

    if (strictMode && !rawDifficulty) {
      throw new BadRequestException(
        'Debes seleccionar una dificultad para el torneo.',
      );
    }

    if (strictMode && resolvedDurationMinutes === null) {
      throw new BadRequestException(
        'Debes configurar una duracion maxima valida en minutos.',
      );
    }

    if (strictMode && resolvedBoardCount === null) {
      throw new BadRequestException(
        'Debes configurar una cantidad valida de tableros para el torneo.',
      );
    }

    const difficulty = resolveSudokuTournamentDifficulty(rawDifficulty);

    return {
      duracionMaximaMin:
        resolvedDurationMinutes ?? this.DEFAULT_TOURNAMENT_DURATION_MINUTES,
      dificultad: difficulty.label,
      numeroTableros:
        resolvedBoardCount ?? this.DEFAULT_TOURNAMENT_BOARD_COUNT,
      esOficial: config.esOficial === true,
    };
  }

  private buildTournamentBoardDefinitions(
    seriesSeed: string,
    boardCount: number,
  ): SudokuTournamentBoardDefinition[] {
    return Array.from({ length: boardCount }, (_, index) => ({
      index: index + 1,
      seed: resolveSudokuTournamentSeed(
        undefined,
        `${seriesSeed}:${index + 1}`,
      ),
    }));
  }

  private parseTournamentDate(value: unknown): Date | null {
    const raw = String(value ?? '').trim();
    if (!raw) {
      return null;
    }

    const isoWithoutZonePattern =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?$/;
    const normalized = isoWithoutZonePattern.test(raw) ? `${raw}-05:00` : raw;
    const parsed = new Date(normalized);

    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    return parsed;
  }

  private getTournamentRules(torneo: TorneoRecord): SudokuTournamentRules {
    const config = this.sanitizeTournamentConfig(this.getTournamentConfig(torneo));
    const difficulty = resolveSudokuTournamentDifficulty(config.dificultad);
    const timeLimitMinutes =
      this.resolvePositiveLimit(config.duracionMaximaMin) ??
      this.DEFAULT_TOURNAMENT_DURATION_MINUTES;
    const boardCount =
      this.resolvePositiveLimit(config.numeroTableros) ??
      this.DEFAULT_TOURNAMENT_BOARD_COUNT;
    const fallbackSeedSource = [
      torneo._id ?? torneo.nombre,
      torneo.fechaInicio,
      difficulty.label,
    ]
      .filter(Boolean)
      .join(':');
    const seriesSeed = resolveSudokuTournamentSeed(
      config.seedFija,
      fallbackSeedSource,
    );

    return {
      juegoId: this.TOURNAMENT_GAME_SUDOKU,
      difficultyKey: difficulty.key,
      difficultyLabel: difficulty.label,
      holes: difficulty.holes,
      seed: seriesSeed,
      seedId: String(config.seedId ?? '').trim() || null,
      hintLimit: 0,
      timeLimitSeconds: timeLimitMinutes * 60,
      attemptLimit: 1,
      boardCount,
      boards: this.buildTournamentBoardDefinitions(seriesSeed, boardCount),
      torneoTipo: this.TOURNAMENT_TYPE_SERIE,
    };
  }

  private getSessionElapsedSeconds(
    session: Pick<SesionTorneoRecord, 'fechaInicio'>,
    referenceDate = new Date(),
  ): number {
    const startedAt = new Date(session.fechaInicio);
    if (Number.isNaN(startedAt.getTime())) {
      return 0;
    }

    return Math.max(
      0,
      Math.floor((referenceDate.getTime() - startedAt.getTime()) / 1000),
    );
  }

  private normalizeSubmittedBoards(
    payload: { board?: unknown; boards?: unknown },
    expectedBoardCount: number,
  ): number[][][] {
    const rawBoards = Array.isArray(payload.boards)
      ? payload.boards
      : payload.board !== undefined
        ? [payload.board]
        : [];

    if (!rawBoards.length) {
      throw new BadRequestException(
        'Debes enviar los tableros resueltos de la sesion.',
      );
    }

    if (rawBoards.length !== expectedBoardCount) {
      throw new BadRequestException(
        `La sesion requiere ${expectedBoardCount} tablero(s) y se recibieron ${rawBoards.length}.`,
      );
    }

    return rawBoards.map((rawBoard, index) => {
      const board = validateSudokuBoardShape(rawBoard);
      if (!board) {
        throw new BadRequestException(
          `El tablero ${index + 1} enviado no tiene un formato Sudoku valido.`,
        );
      }

      return board;
    });
  }

  private countCompletedTournamentBoards(
    boards: number[][][],
    rules: SudokuTournamentRules,
  ): number {
    return boards.reduce((completed, board, index) => {
      const boardSeed = rules.boards[index]?.seed;
      if (!boardSeed) {
        return completed;
      }

      const solution = generateSudokuSolution(boardSeed);
      return completed + (isSolvedSudokuBoard(board, solution) ? 1 : 0);
    }, 0);
  }

  private sortRankingRows(resultados: ResultadoRecord[]): ResultadoRecord[] {
    return [...resultados].sort((a, b) => {
      if (b.puntaje !== a.puntaje) {
        return b.puntaje - a.puntaje;
      }
      if (a.tiempo !== b.tiempo) {
        return a.tiempo - b.tiempo;
      }
      return (
        new Date(a.fechaRegistro).getTime() -
        new Date(b.fechaRegistro).getTime()
      );
    });
  }

  private normalizeCreatorName(value: unknown): string | null {
    const normalized = String(value ?? '').trim();
    if (
      !normalized ||
      normalized === 'undefined' ||
      normalized === 'null'
    ) {
      return null;
    }
    return normalized;
  }

  private isLikelyOpaqueUserId(value: string): boolean {
    const normalized = String(value ?? '').trim();
    if (!normalized) {
      return false;
    }

    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        normalized,
      )
    ) {
      return true;
    }

    if (/^[A-Za-z0-9_-]{20,}$/.test(normalized) && !/\s/.test(normalized)) {
      return true;
    }

    return false;
  }

  private normalizeDisplayName(
    value: unknown,
    userId?: string | null,
  ): string | null {
    const normalized = this.normalizeCreatorName(value);
    if (!normalized) {
      return null;
    }

    const normalizedUserId = this.normalizeUserId(userId);
    if (normalizedUserId && normalized === normalizedUserId) {
      return null;
    }

    if (this.isLikelyOpaqueUserId(normalized)) {
      return null;
    }

    return normalized;
  }

  private looksLikeAuthUserRow(payload: unknown): payload is Record<string, unknown> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      return false;
    }

    const row = payload as Record<string, unknown>;
    const idCandidates = [
      row.id,
      row.sub,
      row.uid,
      row.user_id,
      row.userId,
      row.usuarioId,
      row._id,
      row.authExternoId,
      row.externalId,
      row.authExternalId,
    ];
    const nameCandidates = [
      row.name,
      row.nombre,
      row.fullName,
      row.displayName,
      row.username,
      row.userName,
      row.email,
    ];

    return (
      idCandidates.some((candidate) => Boolean(this.normalizeUserId(candidate))) ||
      nameCandidates.some((candidate) =>
        Boolean(this.normalizeCreatorName(candidate)),
      )
    );
  }

  private extractAuthUsersRows(payload: unknown): Array<Record<string, unknown>> {
    if (Array.isArray(payload)) {
      return payload as Array<Record<string, unknown>>;
    }

    if (this.looksLikeAuthUserRow(payload)) {
      return [payload];
    }

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
      this.looksLikeAuthUserRow((payload as { data?: unknown }).data)
    ) {
      return [(payload as { data: Record<string, unknown> }).data];
    }

    if (
      payload &&
      typeof payload === 'object' &&
      Array.isArray((payload as { users?: unknown }).users)
    ) {
      return (payload as { users: Array<Record<string, unknown>> }).users;
    }

    if (
      payload &&
      typeof payload === 'object' &&
      this.looksLikeAuthUserRow((payload as { user?: unknown }).user)
    ) {
      return [(payload as { user: Record<string, unknown> }).user];
    }

    const nestedDataUser =
      payload &&
      typeof payload === 'object' &&
      typeof (payload as { data?: unknown }).data === 'object'
        ? ((payload as { data?: { user?: unknown } }).data ?? {}).user
        : undefined;

    if (this.looksLikeAuthUserRow(nestedDataUser)) {
      return [nestedDataUser];
    }

    return [];
  }

  private resolveAuthUserId(row: Record<string, unknown>): string {
    const candidates = [
      row.id,
      row.sub,
      row.uid,
      row.user_id,
      row.userId,
      row.usuarioId,
      row._id,
      row.authExternoId,
      row.externalId,
      row.authExternalId,
    ];

    for (const candidate of candidates) {
      const normalized = this.normalizeUserId(candidate);
      if (normalized) {
        return normalized;
      }
    }

    return '';
  }

  private resolveAuthUserName(row: Record<string, unknown>): string {
    const candidates = [
      row.name,
      row.nombre,
      row.fullName,
      row.displayName,
      row.username,
      row.userName,
    ];

    for (const candidate of candidates) {
      const normalized = this.normalizeCreatorName(candidate);
      if (normalized) {
        return normalized;
      }
    }

    if (typeof row.email === 'string') {
      const email = row.email.trim();
      if (email) {
        return email.split('@')[0] || email;
      }
    }

    return '';
  }

  private async getAuthUserNamesByIdSafe(
    accessToken: string,
    userIds: Set<string>,
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    if (!accessToken || !userIds.size) {
      return map;
    }

    try {
      const payload = await this.roble.listAuthUsers(accessToken);
      const rows = this.extractAuthUsersRows(payload);

      for (const row of rows) {
        const userId = this.resolveAuthUserId(row);
        if (!userId || !userIds.has(userId)) {
          continue;
        }

        const userName = this.normalizeDisplayName(
          this.resolveAuthUserName(row),
          userId,
        );
        if (!userName) {
          continue;
        }

        map.set(userId, userName);
      }
    } catch {
      return map;
    }

    return map;
  }

  private async resolveUserNamesById(
    userIds: Set<string>,
    options: { accessToken?: string; usePublicToken?: boolean } = {},
  ): Promise<Map<string, string>> {
    const map = new Map<string, string>();
    const normalizedIds = Array.from(userIds).filter(Boolean);
    if (!normalizedIds.length) {
      return map;
    }

    const canReadProfiles =
      options.usePublicToken || Boolean(options.accessToken);

    if (canReadProfiles) {
      await Promise.all(
        normalizedIds.map(async (userId) => {
          try {
            const profiles = options.usePublicToken
              ? await this.roble.readWithPublicToken<PerfilBasicoRecord>(
                  'Perfil',
                  {
                    usuarioId: userId,
                  },
                )
              : await this.roble.read<PerfilBasicoRecord>(
                  options.accessToken ?? '',
                  'Perfil',
                  { usuarioId: userId },
                );

            const profileName = this.normalizeDisplayName(
              profiles[0]?.nombre,
              userId,
            );
            if (profileName) {
              map.set(userId, profileName);
            }
          } catch {
            // Si no podemos leer el perfil, mantenemos fallback a auth o id.
          }
        }),
      );
    }

    if (options.accessToken) {
      const authUserNames = await this.getAuthUserNamesByIdSafe(
        options.accessToken,
        new Set(normalizedIds),
      );

      for (const [userId, userName] of authUserNames.entries()) {
        if (!map.has(userId)) {
          map.set(userId, userName);
        }
      }
    }

    return map;
  }

  private toEstadoTorneo(value: string): EstadoTorneo | null {
    // Si el string coincide con algún valor del enum, lo devolvemos como enum
    if ((Object.values(EstadoTorneo) as string[]).includes(value)) {
      return value as EstadoTorneo;
    }
    return null;
  }

  private withComputedEstado(torneo: TorneoRecord): TorneoRecord {
    const nuevoEstado = this.calcularEstadoAutomatico(torneo);
    if (!nuevoEstado) return torneo;
    if (torneo.estado === nuevoEstado) return torneo;
    return {
      ...torneo,
      estado: nuevoEstado,
    };
  }

  private isBrowsableState(value: string): boolean {
    const estado = this.toEstadoTorneo(value);

    return estado === EstadoTorneo.PROGRAMADO || estado === EstadoTorneo.ACTIVO;
  }

  private isParticipantHistoricalState(value: string): boolean {
    return this.toEstadoTorneo(value) === EstadoTorneo.FINALIZADO;
  }

  private canSeeTournamentInList(
    torneo: TorneoRecord,
    usuarioId?: string,
    userRole?: string,
    joinedTournamentIds: Set<string> = new Set(),
  ): boolean {
    const normalizedUserId = String(usuarioId ?? '').trim();

    if (this.canManageTournament(torneo, normalizedUserId, userRole)) {
      return true;
    }

    if (!this.isBrowsableState(torneo.estado)) {
      return false;
    }

    if (torneo.esPublico) {
      return true;
    }

    return Boolean(torneo._id && joinedTournamentIds.has(torneo._id));
  }

  private canOpenTournamentDetail(
    torneo: TorneoRecord,
    usuarioId?: string,
    userRole?: string,
    joinedTournamentIds: Set<string> = new Set(),
  ): boolean {
    const normalizedUserId = String(usuarioId ?? '').trim();
    const isJoined = Boolean(torneo._id && joinedTournamentIds.has(torneo._id));

    if (this.canManageTournament(torneo, normalizedUserId, userRole)) {
      return true;
    }

    if (!this.isBrowsableState(torneo.estado)) {
      return this.isParticipantHistoricalState(torneo.estado) && isJoined;
    }

    if (isJoined) {
      return true;
    }

    return true;
  }

  private async getAuthenticatedReadableTournament(
    accessToken: string,
    torneoId: string,
    usuarioId: string,
    userRole: string,
  ): Promise<TorneoRecord> {
    const torneo = await this.obtenerTorneoPorId(accessToken, torneoId);
    if (!torneo) {
      throw new NotFoundException('Torneo no existe');
    }

    const sincronizado = await this.syncEstadoPorFecha(accessToken, torneo);
    const joinedTournamentIds = await this.getJoinedTournamentIds(
      accessToken,
      usuarioId,
    );

    if (
      !this.canOpenTournamentDetail(
        sincronizado,
        usuarioId,
        userRole,
        joinedTournamentIds,
      )
    ) {
      throw new NotFoundException('Torneo no disponible');
    }

    return sincronizado;
  }

  private sanitizeTournamentForViewer(
    torneo: TorneoRecord,
    usuarioId?: string,
    userRole?: string,
  ): TorneoRecord {
    const normalizedUserId = String(usuarioId ?? '').trim();
    if (this.canManageTournament(torneo, normalizedUserId, userRole)) {
      return torneo;
    }

    return {
      ...torneo,
      codigoAcceso: null,
    };
  }

  private sanitizeTournamentForPublic(torneo: TorneoRecord): TorneoRecord {
    return this.sanitizeTournamentForViewer(torneo);
  }

  private async getJoinedTournamentIds(
    accessToken: string,
    usuarioId: string,
  ): Promise<Set<string>> {
    const normalizedUserId = String(usuarioId ?? '').trim();
    if (!normalizedUserId) {
      return new Set();
    }

    const rows = await this.roble.read<ParticipanteRecord>(
      accessToken,
      this.TABLE_PARTICIPANTES,
      { usuarioId: normalizedUserId },
    );

    return new Set(
      rows
        .map((row) => String(row.torneoId ?? '').trim())
        .filter(Boolean),
    );
  }

  private async obtenerTorneoPublicoPorId(
    torneoId: string,
  ): Promise<TorneoRecord | null> {
    const rows = await this.roble.readWithPublicToken<TorneoRecord>(
      this.TABLE_TORNEOS,
      { _id: torneoId },
    );

    return rows[0] ?? null;
  }

  private async attachCreatorNames(
    torneos: TorneoRecord[],
    options: { accessToken?: string; usePublicToken?: boolean } = {},
  ): Promise<TorneoRecord[]> {
    if (!torneos.length) {
      return torneos;
    }

    const creatorIds = Array.from(
      new Set(
        torneos
          .map((torneo) => this.normalizeUserId(torneo.creadorId))
          .filter(Boolean),
      ),
    );

    if (!creatorIds.length) {
      return torneos;
    }

    const creatorNames = await this.resolveUserNamesById(
      new Set(creatorIds),
      options,
    );

    return torneos.map((torneo) => {
      const creatorId = this.normalizeUserId(torneo.creadorId);
      const creatorName =
        creatorNames.get(creatorId) ||
        this.normalizeDisplayName(torneo.creadorNombre, creatorId);
      if (!creatorName) {
        return torneo;
      }

      return {
        ...torneo,
        creadorNombre: creatorName,
      };
    });
  }

  private async attachUserNames<
    T extends { usuarioId: string; usuarioNombre?: string | null },
  >(
    rows: T[],
    options: { accessToken?: string; usePublicToken?: boolean } = {},
  ): Promise<T[]> {
    if (!rows.length) {
      return rows;
    }

    const userIds = Array.from(
      new Set(
        rows
          .map((row) => this.normalizeUserId(row.usuarioId))
          .filter(Boolean),
      ),
    );

    if (!userIds.length) {
      return rows;
    }

    const userNames = await this.resolveUserNamesById(new Set(userIds), options);

    return rows.map((row) => {
      const userId = this.normalizeUserId(row.usuarioId);
      const userName =
        userNames.get(userId) ||
        this.normalizeDisplayName(row.usuarioNombre, userId);
      if (!userName) {
        return row;
      }

      return {
        ...row,
        usuarioNombre: userName,
      };
    });
  }

  private async listarSesionesUsuario(
    accessToken: string,
    torneoId: string,
    usuarioId: string,
  ): Promise<SesionTorneoRecord[]> {
    const rows = await this.roble.read<SesionTorneoRecord>(
      accessToken,
      this.TABLE_SESIONES,
      { torneoId, usuarioId },
    );

    return [...rows].sort((a, b) => {
      const diffIntento =
        (Number(a.intentoNumero) || 0) - (Number(b.intentoNumero) || 0);
      if (diffIntento !== 0) {
        return diffIntento;
      }

      return (
        new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()
      );
    });
  }

  private async buscarSesionPorId(
    accessToken: string,
    torneoId: string,
    usuarioId: string,
    sessionId: string,
  ): Promise<SesionTorneoRecord | null> {
    const rows = await this.roble.read<SesionTorneoRecord>(
      accessToken,
      this.TABLE_SESIONES,
      {
        _id: sessionId,
        torneoId,
        usuarioId,
      },
    );

    return rows[0] ?? null;
  }

  private buildStartSessionResponse(
    torneo: TorneoRecord,
    session: SesionTorneoRecord,
    rules: SudokuTournamentRules,
    resumed: boolean,
  ): StartTournamentSessionResponse {
    return {
      tournament: torneo,
      session,
      game: rules,
      resumed,
    };
  }

  private async marcarSesionExpirada(
    accessToken: string,
    session: SesionTorneoRecord,
    elapsedSeconds: number,
  ): Promise<SesionTorneoRecord> {
    if (!session._id) {
      throw new BadRequestException(
        'La sesion del torneo no trae id y no puede expirar correctamente.',
      );
    }

    return this.roble.update<SesionTorneoRecord>(
      accessToken,
      this.TABLE_SESIONES,
      '_id',
      session._id,
      {
        estado: this.SESSION_STATUS_EXPIRADA,
        fechaFin: new Date().toISOString(),
        tiempoTranscurrido: elapsedSeconds,
        puntajeFinal: 0,
        errores: session.errores ?? 0,
        pistasUsadas: session.pistasUsadas ?? 0,
      },
    );
  }

  private async upsertResultadoTorneo(
    accessToken: string,
    torneoId: string,
    usuarioId: string,
    puntaje: number,
    tiempo: number,
  ): Promise<ResultadoRecord> {
    const existentes = await this.roble.read<ResultadoRecord>(
      accessToken,
      this.TABLE_RESULTADOS,
      { torneoId, usuarioId },
    );

    const nuevoResultado: ResultadoRecord = {
      torneoId,
      usuarioId,
      puntaje,
      tiempo,
      fechaRegistro: new Date().toISOString(),
    };

    if (!existentes.length) {
      const result = await this.roble.insert<ResultadoRecord>(
        accessToken,
        this.TABLE_RESULTADOS,
        [nuevoResultado],
      );

      const inserted = result.inserted[0];
      if (!inserted) {
        const reason =
          result.skipped?.[0]?.reason ?? 'Sin razón reportada por ROBLE';
        throw new BadRequestException(
          `No se pudo registrar el resultado: ${reason}`,
        );
      }

      const [enrichedInserted] = await this.attachUserNames([inserted], {
        accessToken,
      });
      return enrichedInserted ?? inserted;
    }

    const actual = existentes[0];
    const esMejor =
      puntaje > actual.puntaje ||
      (puntaje === actual.puntaje && tiempo < actual.tiempo);

    if (!esMejor) {
      return actual;
    }

    if (!actual._id) {
      throw new BadRequestException(
        'El resultado existente no trae id y no se puede actualizar.',
      );
    }

    const updated = await this.roble.update<ResultadoRecord>(
      accessToken,
      this.TABLE_RESULTADOS,
      '_id',
      actual._id!,
      {
        puntaje: nuevoResultado.puntaje,
        tiempo: nuevoResultado.tiempo,
        fechaRegistro: nuevoResultado.fechaRegistro,
      },
    );
    const [enrichedUpdated] = await this.attachUserNames([updated], {
      accessToken,
    });
    return enrichedUpdated ?? updated;
  }
  private calcularEstadoAutomatico(torneo: TorneoRecord): EstadoTorneo | null {
    const estado = this.toEstadoTorneo(torneo.estado);

    // Si no coincide con el enum (estado raro), no tocamos nada
    if (!estado) return null;

    // Estados que NO deben ser sobre-escritos por fechas
    if (estado === EstadoTorneo.CANCELADO) return null;
    if (estado === EstadoTorneo.PAUSADO) return null;
    if (estado === EstadoTorneo.BORRADOR) return null;

    const inicio = this.parseTournamentDate(torneo.fechaInicio);
    const fin = this.parseTournamentDate(torneo.fechaFin);
    const ahora = new Date();

    if (!inicio || !fin) {
      return null;
    }

    if (ahora > fin) return EstadoTorneo.FINALIZADO;
    if (ahora >= inicio && ahora <= fin) return EstadoTorneo.ACTIVO;

    return EstadoTorneo.PROGRAMADO;
  }

  private async syncEstadoPorFecha(
    accessToken: string,
    torneo: TorneoRecord,
  ): Promise<TorneoRecord> {
    const nuevoEstado = this.calcularEstadoAutomatico(torneo);
    if (!nuevoEstado) return torneo;

    const estadoActual = this.toEstadoTorneo(torneo.estado);
    if (!estadoActual) {
      throw new BadRequestException('Estado actual invalido en torneo.');
    }
    if (estadoActual === nuevoEstado) return torneo;

    if (!torneo._id) return torneo;

    const actualizado = await this.roble.update<TorneoRecord>(
      accessToken,
      this.TABLE_TORNEOS,
      '_id',
      torneo._id,
      {
        estado: nuevoEstado,
      },
    );

    return actualizado;
  }

  async obtenerTorneoDetalle(
    accessToken: string,
    torneoId: string,
    usuarioId: string,
    userRole: string,
  ): Promise<TorneoRecord> {
    const sincronizado = await this.getAuthenticatedReadableTournament(
      accessToken,
      torneoId,
      usuarioId,
      userRole,
    );

    const [enriched] = await this.attachCreatorNames(
      [
        this.sanitizeTournamentForViewer(
          sincronizado,
          usuarioId,
          userRole,
        ),
      ],
      { accessToken },
    );

    return enriched;
  }

  async actualizarEstadoTorneo(
    accessToken: string,
    torneoId: string,
    usuarioId: string,
    userRole: string,
    nuevoEstado: EstadoTorneo,
  ): Promise<TorneoRecord> {
    const torneoBase = await this.obtenerTorneoPorId(accessToken, torneoId);
    if (!torneoBase) {
      throw new NotFoundException('Torneo no existe');
    }

    const torneo = await this.syncEstadoPorFecha(accessToken, torneoBase);

    // El creador o un admin pueden cambiar el estado del torneo
    if (!this.canManageTournament(torneo, usuarioId, userRole)) {
      throw new ForbiddenException(
        'Solo el creador o un admin pueden cambiar el estado del torneo.',
      );
    }

    // No permitimos cambios de estado si el torneo ya está FINALIZADO o CANCELADO
    const estadoActual = this.toEstadoTorneo(torneo.estado);
    if (!estadoActual) {
      throw new BadRequestException('Estado actual inválido en torneo.');
    }

    if (
      estadoActual === EstadoTorneo.FINALIZADO ||
      estadoActual === EstadoTorneo.CANCELADO
    ) {
      throw new BadRequestException(
        'No se puede cambiar el estado de un torneo FINALIZADO o CANCELADO.',
      );
    }

    // Validación de transiciones permitidas
    const allowed: Record<EstadoTorneo, EstadoTorneo[]> = {
      [EstadoTorneo.BORRADOR]: [
        EstadoTorneo.PROGRAMADO,
        EstadoTorneo.CANCELADO,
      ],
      [EstadoTorneo.PROGRAMADO]: [
        EstadoTorneo.ACTIVO,
        EstadoTorneo.PAUSADO,
        EstadoTorneo.CANCELADO,
      ],
      [EstadoTorneo.ACTIVO]: [EstadoTorneo.PAUSADO, EstadoTorneo.CANCELADO],
      [EstadoTorneo.PAUSADO]: [
        EstadoTorneo.PROGRAMADO,
        EstadoTorneo.ACTIVO,
        EstadoTorneo.CANCELADO,
      ],
      [EstadoTorneo.FINALIZADO]: [],
      [EstadoTorneo.CANCELADO]: [],
    };

    const estadoDestino = this.toUpperSafe(nuevoEstado) as EstadoTorneo;
    if (!this.toEstadoTorneo(estadoDestino)) {
      throw new BadRequestException(`Estado destino inválido: ${estadoDestino}`);
    }
    if (estadoDestino === estadoActual) {
      return torneo;
    }

    const permitidos = allowed[estadoActual] ?? [];
    if (!permitidos.includes(estadoDestino)) {
      throw new BadRequestException(
        `Transición inválida: ${estadoActual} -> ${estadoDestino}`,
      );
    }

    // Guardamos
    if (!torneo._id)
      throw new BadRequestException('Torneo sin _id (no se puede actualizar).');

    const actualizado = await this.roble.update<TorneoRecord>(
      accessToken,
      this.TABLE_TORNEOS,
      '_id',
      torneo._id,
      { estado: estadoDestino },
    );
    const [enriched] = await this.attachCreatorNames([actualizado], {
      accessToken,
    });
    return enriched ?? actualizado;
  }

  async editarTorneo(
    accessToken: string,
    torneoId: string,
    usuarioId: string,
    userRole: string,
    dto: UpdateTorneoDto,
  ): Promise<TorneoRecord> {
    const torneoBase = await this.obtenerTorneoPorId(accessToken, torneoId);
    if (!torneoBase) {
      throw new NotFoundException('Torneo no existe');
    }

    const torneo = await this.syncEstadoPorFecha(accessToken, torneoBase);

    if (!this.canManageTournament(torneo, usuarioId, userRole)) {
      throw new ForbiddenException(
        'Solo el creador o un admin pueden editar el torneo.',
      );
    }

    const estadoActual = this.toEstadoTorneo(torneo.estado);
    if (!estadoActual) {
      throw new BadRequestException('Estado actual invalido en torneo.');
    }

    if (
      (estadoActual === EstadoTorneo.FINALIZADO ||
        estadoActual === EstadoTorneo.CANCELADO) &&
      !this.isAdminRole(userRole)
    ) {
      throw new BadRequestException(
        'No se puede editar un torneo FINALIZADO o CANCELADO.',
      );
    }

    if (estadoActual === EstadoTorneo.ACTIVO && !this.isAdminRole(userRole)) {
      const tipoActual = this.toUpperSafe(torneo.tipo);
      const tipoNuevo =
        dto.tipo !== undefined ? this.TOURNAMENT_TYPE_SERIE : undefined;
      const cambioTipo = Boolean(tipoNuevo && tipoNuevo !== tipoActual);
      const cambioFechaInicio =
        dto.fechaInicio !== undefined &&
        String(dto.fechaInicio).trim() !== String(torneo.fechaInicio).trim();
      const cambioFechaFin =
        dto.fechaFin !== undefined &&
        String(dto.fechaFin).trim() !== String(torneo.fechaFin).trim();
      const cambioConfiguracion = dto.configuracion !== undefined;

      if (
        cambioTipo ||
        cambioFechaInicio ||
        cambioFechaFin ||
        cambioConfiguracion
      ) {
        throw new BadRequestException(
          'No se puede cambiar el formato, las fechas ni las reglas de un torneo ACTIVO.',
        );
      }
    }

    const updates: Record<string, unknown> = {};

    if (dto.nombre !== undefined) updates.nombre = dto.nombre;
    if (dto.descripcion !== undefined) updates.descripcion = dto.descripcion;
    if (dto.tipo !== undefined) {
      updates.tipo = this.TOURNAMENT_TYPE_SERIE;
    }

    if (dto.fechaInicio !== undefined) updates.fechaInicio = dto.fechaInicio;
    if (dto.fechaFin !== undefined) updates.fechaFin = dto.fechaFin;

    if (dto.recurrencia !== undefined) {
      const recurrencia = this.toUpperSafe(dto.recurrencia);
      if (recurrencia) updates.recurrencia = recurrencia;
    }

    if (dto.configuracion !== undefined) {
      updates.configuracion = this.sanitizeTournamentConfig(dto.configuracion, {
        strict: true,
      });
    }

    if (dto.esPublico !== undefined) {
      updates.esPublico = dto.esPublico;

      if (dto.esPublico === false) {
        const codigoExistente = torneo.codigoAcceso;
        const codigo = codigoExistente ?? generarCodigoAcceso(6);
        updates.codigoAcceso = codigo;
      }
    }

    if (!torneo._id) {
      throw new BadRequestException(
        'Torneo sin _id (no se puede actualizar).',
      );
    }

    const actualizado = await this.roble.update<TorneoRecord>(
      accessToken,
      this.TABLE_TORNEOS,
      '_id',
      torneo._id,
      updates,
    );

    const sincronizado = await this.syncEstadoPorFecha(
      accessToken,
      actualizado,
    );
    const [enriched] = await this.attachCreatorNames([sincronizado], {
      accessToken,
    });
    return enriched ?? sincronizado;
  }

  async cancelarTorneo(
    accessToken: string,
    torneoId: string,
    usuarioId: string,
    userRole: string,
  ): Promise<TorneoRecord> {
    const torneoBase = await this.obtenerTorneoPorId(accessToken, torneoId);
    if (!torneoBase) {
      throw new NotFoundException('Torneo no existe');
    }

    const torneo = await this.syncEstadoPorFecha(accessToken, torneoBase);

    // El creador o un admin pueden cancelar el torneo
    if (!this.canManageTournament(torneo, usuarioId, userRole)) {
      throw new ForbiddenException(
        'Solo el creador o un admin pueden cancelar el torneo.',
      );
    }

    const estadoActual = this.toEstadoTorneo(torneo.estado);
    if (!estadoActual) throw new Error('Estado actual inválido en torneo.');

    // Si ya está cancelado, lo devolvemos tal cual
    if (estadoActual === EstadoTorneo.CANCELADO) {
      return torneo;
    }

    // No se puede cancelar si ya finalizó
    if (estadoActual === EstadoTorneo.FINALIZADO) {
      throw new BadRequestException('No se puede cancelar un torneo FINALIZADO.');
      throw new Error('No se puede cancelar un torneo FINALIZADO.');
    }

    if (!torneo._id) {
      throw new BadRequestException('Torneo sin _id (no se puede actualizar).');
      throw new Error('Torneo sin _id (no se puede actualizar).');
    }

    const actualizado = await this.roble.update<TorneoRecord>(
      accessToken,
      this.TABLE_TORNEOS,
      '_id',
      torneo._id,
      { estado: EstadoTorneo.CANCELADO },
    );

    const [enriched] = await this.attachCreatorNames([actualizado], {
      accessToken,
    });
    return enriched ?? actualizado;
  }

  async listarTorneos(
    accessToken: string,
    usuarioId: string,
    userRole: string,
  ): Promise<TorneoRecord[]> {
    const torneos = await this.roble.read<TorneoRecord>(
      accessToken,
      this.TABLE_TORNEOS,
    );
    const joinedTournamentIds = await this.getJoinedTournamentIds(
      accessToken,
      usuarioId,
    );

    const sincronizados = await Promise.all(
      torneos.map(async (t) => {
        try {
          return await this.syncEstadoPorFecha(accessToken, t);
        } catch {
          return t;
        }
      }),
    );

    const visibles = sincronizados
      .filter((torneo) =>
        this.canSeeTournamentInList(
          torneo,
          usuarioId,
          userRole,
          joinedTournamentIds,
        ),
      )
      .map((torneo) =>
        this.sanitizeTournamentForViewer(torneo, usuarioId, userRole),
      )
      .map((torneo) => ({
        ...torneo,
        inscrito: Boolean(torneo._id && joinedTournamentIds.has(torneo._id)),
      }));

    return this.attachCreatorNames(visibles, { accessToken });
  }

  async listarTorneosPublicos(): Promise<TorneoRecord[]> {
    const torneos = await this.roble.readWithPublicToken<TorneoRecord>(
      this.TABLE_TORNEOS,
    );

    const visibles = torneos
      .map((torneo) => this.withComputedEstado(torneo))
      .filter((torneo) => this.canSeeTournamentInList(torneo))
      .map((torneo) => this.sanitizeTournamentForPublic(torneo));

    return this.attachCreatorNames(visibles, { usePublicToken: true });
  }

  // Aqui crearíamos un nuevo torneo, insertando un nuevo registro en la tabla "Torneos" de ROBLE
  async crearTorneo(
    accessToken: string,
    creadorId: string,
    dto: CreateTorneoDto,
  ): Promise<TorneoRecord> {
    const esPublico = dto.esPublico;
    const codigoAcceso = esPublico ? undefined : generarCodigoAcceso(6);
    const configuracion = this.sanitizeTournamentConfig(dto.configuracion, {
      strict: true,
    });
    const torneo: TorneoRecord = {
      nombre: dto.nombre,
      descripcion: dto.descripcion,
      creadorId,
      codigoAcceso: dto.codigoAcceso ?? null,
      esPublico: dto.esPublico,
      estado: EstadoTorneo.BORRADOR,
      tipo: this.TOURNAMENT_TYPE_SERIE,
      fechaInicio: dto.fechaInicio,
      fechaFin: dto.fechaFin,
      recurrencia: this.toUpperSafe(dto.recurrencia ?? 'NINGUNA'),
      configuracion,
      fechaCreacion: new Date().toISOString(),
    };

    if (!esPublico && codigoAcceso) {
      torneo.codigoAcceso = codigoAcceso;
    }

    const result = await this.roble.insert<TorneoRecord>(
      accessToken,
      this.TABLE_TORNEOS,
      [torneo],
    );

    const inserted = result.inserted[0];
    if (!inserted) {
      const reason =
        result.skipped?.[0]?.reason ?? 'Sin razón reportada por ROBLE';
      throw new BadRequestException(
        `No se pudo insertar el resultado por este motivo: ${reason}`,
      );
    }
    const [enriched] = await this.attachCreatorNames([inserted], { accessToken });
    return enriched ?? inserted;
  }

  // Aqui obetenemos la información de un torneo específico
  async obtenerTorneoPorId(
    accessToken: string,
    torneoId: string,
  ): Promise<TorneoRecord | null> {
    const rows = await this.roble.read<TorneoRecord>(
      accessToken,
      this.TABLE_TORNEOS,
      { _id: torneoId },
    );
    return rows[0] ?? null;
  }

  async obtenerTorneoDetallePublico(torneoId: string): Promise<TorneoRecord> {
    const torneo = await this.obtenerTorneoPublicoPorId(torneoId);

    if (!torneo) {
      throw new NotFoundException('Torneo no existe');
    }

    const visible = this.withComputedEstado(torneo);
    if (!this.canSeeTournamentInList(visible)) {
      throw new NotFoundException('Torneo no disponible');
    }

    const [enriched] = await this.attachCreatorNames(
      [this.sanitizeTournamentForPublic(visible)],
      { usePublicToken: true },
    );

    return enriched;
  }

  // Aqui actualizamos la información de un torneo específico
  async usuarioYaInscrito(
    accessToken: string,
    torneoId: string,
    usuarioId: string,
  ): Promise<boolean> {
    const rows = await this.roble.read<ParticipanteRecord>(
      accessToken,
      this.TABLE_PARTICIPANTES,
      { torneoId, usuarioId },
    );
    return rows.length > 0;
  }

  // Aqui unimos a un usuario a un torneo específico
  async unirseATorneo(
    accessToken: string,
    torneoId: string,
    usuarioId: string,
    codigoAcceso?: string,
  ): Promise<ParticipanteRecord> {
    const torneoBase = await this.obtenerTorneoPorId(accessToken, torneoId);
    if (!torneoBase) {
      throw new NotFoundException('Este torneo no existe');
    }

    const torneo = await this.syncEstadoPorFecha(accessToken, torneoBase);
    const estado = this.toEstadoTorneo(torneo.estado);
    if (
      estado === EstadoTorneo.FINALIZADO ||
      estado === EstadoTorneo.CANCELADO
    ) {
      throw new BadRequestException(
        'No se puede unir a un torneo FINALIZADO o CANCELADO.',
      );
    }

    // Evitamos duplicado de inscripción
    const ya = await this.usuarioYaInscrito(accessToken, torneoId, usuarioId);
    if (ya) {
      throw new BadRequestException('El usuario ya esta inscrito en este torneo');
    }
    if (ya) throw new Error('El usuario ya está inscrito en este torneo');

    // Validamos el código de acceso si el torneo es privado
    if (torneo.esPublico === false) {
      if (!codigoAcceso) {
        throw new BadRequestException(
          'Este torneo es privado y requiere un codigo de acceso valido',
        );
      }
      if (!torneo.codigoAcceso || codigoAcceso !== torneo.codigoAcceso) {
        throw new BadRequestException('Codigo de acceso invalido');
      }
      if (!codigoAcceso)
        throw new Error(
          'Este torneo es privado y requiere un código de acceso valido',
        );
      if (!torneo.codigoAcceso || codigoAcceso !== torneo.codigoAcceso) {
        throw new Error('Código de acceso inválido');
      }
    }

    const participante: ParticipanteRecord = {
      torneoId,
      usuarioId,
      fechaUnion: new Date().toISOString(),
    };

    const result = await this.roble.insert<ParticipanteRecord>(
      accessToken,
      this.TABLE_PARTICIPANTES,
      [participante],
    );

    const inserted = result.inserted[0];
    if (!inserted) {
      const reason =
        result.skipped?.[0]?.reason ?? 'Sin razón reportada por ROBLE';
      throw new Error(
        `No se pudo insertar el participante por este motivo: ${reason}`,
      );
    }

    const [enriched] = await this.attachUserNames([inserted], { accessToken });
    return enriched ?? inserted;
  }

  // Aqui listamos los participantes de un torneo específico
  async listarParticipantes(
    accessToken: string,
    torneoId: string,
    usuarioId: string,
    userRole: string,
  ): Promise<ParticipanteRecord[]> {
    await this.getAuthenticatedReadableTournament(
      accessToken,
      torneoId,
      usuarioId,
      userRole,
    );

    const participantes = await this.roble.read<ParticipanteRecord>(
      accessToken,
      this.TABLE_PARTICIPANTES,
      { torneoId },
    );
    return this.attachUserNames(participantes, { accessToken });
  }

  async listarParticipantesPublico(
    torneoId: string,
  ): Promise<ParticipanteRecord[]> {
    const torneo = await this.obtenerTorneoPublicoPorId(torneoId);
    if (!torneo) {
      throw new NotFoundException('Torneo no existe');
    }

    const visible = this.withComputedEstado(torneo);
    if (!this.canSeeTournamentInList(visible)) {
      throw new NotFoundException('Torneo no disponible');
    }

    const participantes = await this.roble.readWithPublicToken<ParticipanteRecord>(
      this.TABLE_PARTICIPANTES,
      { torneoId },
    );
    return this.attachUserNames(participantes, { usePublicToken: true });
  }

  async iniciarSesionTorneo(
    accessToken: string,
    torneoId: string,
    usuarioId: string,
  ): Promise<StartTournamentSessionResponse> {
    const torneoBase = await this.obtenerTorneoPorId(accessToken, torneoId);
    if (!torneoBase) {
      throw new NotFoundException('Torneo no existe');
    }

    const torneo = await this.syncEstadoPorFecha(accessToken, torneoBase);
    const estado = this.toEstadoTorneo(torneo.estado);
    if (estado !== EstadoTorneo.ACTIVO) {
      throw new BadRequestException(
        'Solo puedes jugar un torneo cuando su estado es ACTIVO.',
      );
    }

    if (!(await this.usuarioYaInscrito(accessToken, torneoId, usuarioId))) {
      throw new ForbiddenException(
        'Debes estar inscrito en el torneo antes de jugarlo.',
      );
    }

    const rules = this.getTournamentRules(torneo);

    const sessions = await this.listarSesionesUsuario(
      accessToken,
      torneoId,
      usuarioId,
    );
    const activeSession =
      [...sessions]
        .reverse()
        .find(
          (session) => session.estado === this.SESSION_STATUS_INICIADA,
        ) ?? null;

    if (activeSession) {
      const elapsedSeconds = this.getSessionElapsedSeconds(activeSession);
      const shouldExpire = elapsedSeconds > rules.timeLimitSeconds;

      if (!shouldExpire) {
        return this.buildStartSessionResponse(
          torneo,
          activeSession,
          rules,
          true,
        );
      }

      await this.marcarSesionExpirada(
        accessToken,
        activeSession,
        elapsedSeconds,
      );
    }

    const attemptsUsed = sessions.length;
    if (attemptsUsed >= rules.attemptLimit) {
      throw new BadRequestException(
        `Ya agotaste el maximo de ${rules.attemptLimit} intento(s) permitido(s) para este torneo.`,
      );
    }

    const session: SesionTorneoRecord = {
      torneoId,
      usuarioId,
      juegoId: rules.juegoId,
      estado: this.SESSION_STATUS_INICIADA,
      seed: rules.seed,
      seedId: rules.seedId,
      intentoNumero: attemptsUsed + 1,
      fechaInicio: new Date().toISOString(),
      fechaFin: null,
      tiempoTranscurrido: null,
      puntajeFinal: null,
      errores: null,
      pistasUsadas: null,
    };

    const result = await this.roble.insert<SesionTorneoRecord>(
      accessToken,
      this.TABLE_SESIONES,
      [session],
    );
    const inserted = result.inserted[0];
    if (!inserted) {
      const reason =
        result.skipped?.[0]?.reason ?? 'Sin razon reportada por ROBLE';
      throw new BadRequestException(
        `No se pudo iniciar la sesion del torneo: ${reason}`,
      );
    }

    return this.buildStartSessionResponse(torneo, inserted, rules, false);
  }

  async finalizarSesionTorneo(
    accessToken: string,
    torneoId: string,
    sessionId: string,
    usuarioId: string,
    payload: {
      board?: unknown;
      boards?: unknown;
      errorCount?: number;
      hintsUsed?: number;
    },
  ): Promise<FinishTournamentSessionResponse> {
    const torneoBase = await this.obtenerTorneoPorId(accessToken, torneoId);
    if (!torneoBase) {
      throw new NotFoundException('Torneo no existe');
    }

    const torneo = await this.syncEstadoPorFecha(accessToken, torneoBase);
    const estadoTorneo = this.toEstadoTorneo(torneo.estado);
    if (estadoTorneo === EstadoTorneo.CANCELADO) {
      throw new BadRequestException(
        'No puedes registrar partidas en un torneo cancelado.',
      );
    }

    const session = await this.buscarSesionPorId(
      accessToken,
      torneoId,
      usuarioId,
      sessionId,
    );
    if (!session) {
      throw new NotFoundException('La sesion de torneo no existe.');
    }

    if (session.estado !== this.SESSION_STATUS_INICIADA) {
      throw new BadRequestException(
        'Esta sesion ya fue cerrada y no puede finalizarse de nuevo.',
      );
    }

    const rules = this.getTournamentRules(torneo);
    const elapsedSeconds = this.getSessionElapsedSeconds(session);
    const safeErrorCount = Math.max(
      0,
      Math.trunc(Number(payload.errorCount) || 0),
    );
    const safeHintsUsed = Math.max(
      0,
      Math.trunc(Number(payload.hintsUsed) || 0),
    );

    if (safeHintsUsed > 0) {
      throw new BadRequestException(
        'Este torneo no permite pistas.',
      );
    }

    const limitExceeded = elapsedSeconds > rules.timeLimitSeconds;
    let completedBoards = 0;

    try {
      const submittedBoards = this.normalizeSubmittedBoards(
        payload,
        rules.boardCount,
      );
      completedBoards = this.countCompletedTournamentBoards(
        submittedBoards,
        rules,
      );
    } catch {
      completedBoards = 0;
    }

    if (limitExceeded) {
      const expiredSession = await this.roble.update<SesionTorneoRecord>(
        accessToken,
        this.TABLE_SESIONES,
        '_id',
        sessionId,
        {
          estado: this.SESSION_STATUS_EXPIRADA,
          fechaFin: new Date().toISOString(),
          tiempoTranscurrido: elapsedSeconds,
          puntajeFinal: 0,
          errores: safeErrorCount,
          pistasUsadas: 0,
        },
      );

      return {
        tournament: torneo,
        session: expiredSession,
        result: null,
        outcome: 'EXPIRADA',
        elapsedSeconds,
        score: 0,
        timeLimitSeconds: rules.timeLimitSeconds,
        completedBoards,
        totalBoards: rules.boardCount,
      };
    }

    const submittedBoards = this.normalizeSubmittedBoards(payload, rules.boardCount);
    completedBoards = this.countCompletedTournamentBoards(submittedBoards, rules);

    if (completedBoards < rules.boardCount) {
      throw new BadRequestException(
        'La serie aun no esta resuelta. Completa todos los tableros o espera a que expire el tiempo.',
      );
    }

    const score = calculateSudokuTournamentScore({
      elapsedSeconds,
      timeLimitSeconds: rules.timeLimitSeconds,
    });

    const result = await this.upsertResultadoTorneo(
      accessToken,
      torneoId,
      usuarioId,
      score,
      elapsedSeconds,
    );

    const updatedSession = await this.roble.update<SesionTorneoRecord>(
      accessToken,
      this.TABLE_SESIONES,
      '_id',
      sessionId,
        {
          estado: this.SESSION_STATUS_FINALIZADA,
          fechaFin: new Date().toISOString(),
          tiempoTranscurrido: elapsedSeconds,
          puntajeFinal: score,
          errores: safeErrorCount,
          pistasUsadas: 0,
        },
      );

    return {
      tournament: torneo,
      session: updatedSession,
      result,
      outcome: 'FINALIZADA',
      elapsedSeconds,
      score,
      timeLimitSeconds: rules.timeLimitSeconds,
      completedBoards,
      totalBoards: rules.boardCount,
    };
  }

  // Aqui registramos el resultado de un participante en un torneo
  async registrarResultado(
    accessToken: string,
    torneoId: string,
    usuarioId: string,
    dto: CreateResultadoDto,
  ): Promise<ResultadoRecord> {
    // Verificamos que el usuario esté inscrito en el torneo
    const participantes = await this.roble.read<ParticipanteRecord>(
      accessToken,
      this.TABLE_PARTICIPANTES,
      {
        torneoId,
        usuarioId,
      },
    );

    if (!participantes.length) {
      throw new ForbiddenException('El usuario no esta inscrito en este torneo.');
      throw new Error('El usuario no está inscrito en este torneo.');
    }

    // Verificamos que el torneo esté ACTIVO
    const torneoBase = await this.obtenerTorneoPorId(accessToken, torneoId);
    if (!torneoBase) {
      throw new NotFoundException('Torneo no existe');
    }

    const torneo = await this.syncEstadoPorFecha(accessToken, torneoBase);
    const estado = this.toEstadoTorneo(torneo.estado);
    if (estado !== EstadoTorneo.ACTIVO) {
      throw new BadRequestException(
        'Solo se pueden registrar resultados en torneos ACTIVO.',
      );
      throw new Error('Solo se pueden registrar resultados en torneos ACTIVO.');
    }

    return this.upsertResultadoTorneo(
      accessToken,
      torneoId,
      usuarioId,
      dto.puntaje,
      dto.tiempo,
    );

    // Buscamos el resultado existente
    const existentes = await this.roble.read<ResultadoRecord>(
      accessToken,
      this.TABLE_RESULTADOS,
      { torneoId, usuarioId },
    );

    const nuevoResultado: ResultadoRecord = {
      torneoId,
      usuarioId,
      puntaje: dto.puntaje,
      tiempo: dto.tiempo,
      fechaRegistro: new Date().toISOString(),
    };

    // Si no existe lo instertamos insertar
    if (!existentes.length) {
      const result = await this.roble.insert<ResultadoRecord>(
        accessToken,
        this.TABLE_RESULTADOS,
        [nuevoResultado],
      );

      return result.inserted[0];
    }

    // Si existe verifiacamo si es mejor
    const actual = existentes[0];

    const esMejor =
      dto.puntaje > actual.puntaje ||
      (dto.puntaje === actual.puntaje && dto.tiempo < actual.tiempo);

    if (!esMejor) {
      return actual;
    }

    // Actaulizamos el resultado existente con el nuevo resultado
    if (!actual._id) {
      throw new Error(
        'El resultado existente no trae id (no se puede actualizar).',
      );
    }

    const actualizado = await this.roble.update<ResultadoRecord>(
      accessToken,
      this.TABLE_RESULTADOS,
      '_id',
      actual._id!,
      {
        puntaje: nuevoResultado.puntaje,
        tiempo: nuevoResultado.tiempo,
        fechaRegistro: nuevoResultado.fechaRegistro,
      },
    );

    return actualizado;
  }

  // Aqui obtenemos el ranking del torneo, ordenado
  // por puntaje (desc), tiempo (asc) y fechaRegistro (asc)
  async obtenerRanking(
    accessToken: string,
    torneoId: string,
    usuarioId: string,
    userRole: string,
  ): Promise<ResultadoRecord[]> {
    await this.getAuthenticatedReadableTournament(
      accessToken,
      torneoId,
      usuarioId,
      userRole,
    );

    const resultados = await this.roble.read<ResultadoRecord>(
      accessToken,
      this.TABLE_RESULTADOS,
      { torneoId },
    );

    return this.attachUserNames(this.sortRankingRows(resultados), {
      accessToken,
    });
  }

  async obtenerRankingPublico(torneoId: string): Promise<ResultadoRecord[]> {
    const torneo = await this.obtenerTorneoPublicoPorId(torneoId);
    if (!torneo) {
      throw new NotFoundException('Torneo no existe');
    }

    const visible = this.withComputedEstado(torneo);
    if (!this.canSeeTournamentInList(visible)) {
      throw new NotFoundException('Torneo no disponible');
    }

    const resultados = await this.roble.readWithPublicToken<ResultadoRecord>(
      this.TABLE_RESULTADOS,
      { torneoId },
    );

    return this.attachUserNames(this.sortRankingRows(resultados), {
      usePublicToken: true,
    });
  }

  async listarHistorialParticipacion(
    accessToken: string,
    usuarioId: string,
  ): Promise<HistorialParticipacionRecord[]> {
    const normalizedUserId = this.normalizeUserId(usuarioId);
    if (!normalizedUserId) {
      return [];
    }

    const participaciones = await this.roble.read<ParticipanteRecord>(
      accessToken,
      this.TABLE_PARTICIPANTES,
      { usuarioId: normalizedUserId },
    );

    if (!participaciones.length) {
      return [];
    }

    const fechaUnionPorTorneo = new Map<string, string>();
    for (const row of participaciones) {
      const torneoId = String(row.torneoId ?? '').trim();
      if (!torneoId || fechaUnionPorTorneo.has(torneoId)) {
        continue;
      }
      fechaUnionPorTorneo.set(torneoId, row.fechaUnion);
    }

    const torneos = (
      await Promise.all(
        Array.from(fechaUnionPorTorneo.keys()).map(async (torneoId) => {
          const torneo = await this.obtenerTorneoPorId(accessToken, torneoId);
          if (!torneo) {
            return null;
          }
          return this.syncEstadoPorFecha(accessToken, torneo);
        }),
      )
    ).filter((torneo): torneo is TorneoRecord => Boolean(torneo));

    const finalizados = torneos.filter((torneo) =>
      this.isParticipantHistoricalState(torneo.estado),
    );
    if (!finalizados.length) {
      return [];
    }

    const torneosConNombre = await this.attachCreatorNames(finalizados, {
      accessToken,
    });

    const misResultados = await this.roble.read<ResultadoRecord>(
      accessToken,
      this.TABLE_RESULTADOS,
      { usuarioId: normalizedUserId },
    );
    const misResultadosPorTorneo = new Map<string, ResultadoRecord>();
    for (const row of this.sortRankingRows(misResultados)) {
      const torneoId = String(row.torneoId ?? '').trim();
      if (!torneoId || misResultadosPorTorneo.has(torneoId)) {
        continue;
      }
      misResultadosPorTorneo.set(torneoId, row);
    }

    const rankingPorTorneo = new Map<string, ResultadoRecord[]>();
    await Promise.all(
      torneosConNombre.map(async (torneo) => {
        const torneoId = String(torneo._id ?? '').trim();
        if (!torneoId) {
          return;
        }
        const rows = await this.roble.read<ResultadoRecord>(
          accessToken,
          this.TABLE_RESULTADOS,
          { torneoId },
        );
        rankingPorTorneo.set(torneoId, this.sortRankingRows(rows));
      }),
    );

    return torneosConNombre
      .map((torneo) => {
        const torneoId = String(torneo._id ?? '').trim();
        const miResultado = misResultadosPorTorneo.get(torneoId) ?? null;
        const ranking = rankingPorTorneo.get(torneoId) ?? [];
        const miPosicion = miResultado
          ? ranking.findIndex(
              (row) => this.normalizeUserId(row.usuarioId) === normalizedUserId,
            ) + 1
          : 0;

        return {
          ...this.sanitizeTournamentForViewer(torneo),
          fechaUnion: fechaUnionPorTorneo.get(torneoId) ?? null,
          miPosicion: miPosicion > 0 ? miPosicion : null,
          miPuntaje: miResultado?.puntaje ?? null,
          miTiempo: miResultado?.tiempo ?? null,
          miFechaRegistro: miResultado?.fechaRegistro ?? null,
        };
      })
      .sort((left, right) => {
        const leftTime = new Date(
          left.miFechaRegistro || left.fechaFin || left.fechaUnion || 0,
        ).getTime();
        const rightTime = new Date(
          right.miFechaRegistro || right.fechaFin || right.fechaUnion || 0,
        ).getTime();
        return rightTime - leftTime;
      });
  }

  async obtenerResultadosPorUsuario(
    accessToken: string,
    usuarioId: string,
  ): Promise<ResultadoRecord[]> {
    const resultados = await this.roble.read<ResultadoRecord>(
      accessToken,
      this.TABLE_RESULTADOS,
      {
        usuarioId,
      },
    );
    return this.attachUserNames(this.sortRankingRows(resultados), {
      accessToken,
    });
  }
}


