import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { RobleService } from '../roble/roble.service';
import { SudokuService } from '../sudoku/sudoku.service';
import { WebhookService } from '../webhook/webhook.service';
import { RankingService } from '../ranking/ranking.service';
import { getUserIdFromAccessToken } from '../common/utils/jwt.utils';

// Compatibilidad con registros historicos que usaban sentinels en MovimientosPvP.
const LEGACY_ROW_JOIN = -1;
const LEGACY_ROW_FORFEIT = -2;
const LEGACY_ROW_FINISHED = -3;

interface MatchRecord {
  _id?: string;
  torneoId: string;
  jugador1Id: string;
  jugador2Id: string | null;
  estado: string;
  seed: number;
  solution: number[][];
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
  torneoId: string;
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

@Injectable()
export class MatchService {
  private readonly logger = new Logger(MatchService.name);
  private readonly contenedor1Url: string;

  constructor(
    private readonly roble: RobleService,
    private readonly http: HttpService,
    private readonly config: ConfigService,
    private readonly sudokuService: SudokuService,
    private readonly webhookService: WebhookService,
    private readonly rankingService: RankingService,
  ) {
    this.contenedor1Url =
      this.config.getOrThrow<string>('CONTENEDOR1_BASE_URL');
  }

  private stripSolution(state: MatchState) {
    const { solution, ...rest } = state;
    return rest;
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

  private sanitizeMatchForUser(state: MatchState, usuarioId: string) {
    const safe = this.stripSolution(state);
    const isPlayer1 = state.jugador1Id === usuarioId;
    const isPlayer2 = state.jugador2Id === usuarioId;
    if (!isPlayer1 && !isPlayer2) {
      throw new ForbiddenException('No eres jugador de este match');
    }

    const myGame = isPlayer1 ? state.player1 : state.player2!;
    const opponentGame = isPlayer1 ? state.player2 : state.player1;

    return {
      _id: safe._id,
      torneoId: safe.torneoId,
      jugador1Id: safe.jugador1Id,
      jugador2Id: safe.jugador2Id,
      estado: safe.estado,
      seed: safe.seed,
      puntaje1: safe.puntaje1,
      puntaje2: safe.puntaje2,
      ganadorId: safe.ganadorId,
      fechaCreacion: safe.fechaCreacion,
      fechaInicio: safe.fechaInicio,
      fechaFin: safe.fechaFin,
      myGame,
      opponent: opponentGame ? this.toPublicPlayerSummary(opponentGame) : null,
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
    solution: number[][],
    allMoves: MovimientoRecord[],
    startedAt: string,
  ): PlayerProgress {
    const boardState = this.cloneBoard(baseBoard);
    const emptyCells = baseBoard.flat().filter((c) => c === 0).length;
    let score = 0;
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

      const isCorrect = solution[row][col] === value;
      if (isCorrect) {
        boardState[row][col] = value;
        correctCells += 1;
        score += 1;
        if (!finished && correctCells === emptyCells) {
          finished = true;
          finishedAt = mov.timestamp;
        }
      } else {
        mistakes += 1;
        score -= 1;
      }
    }

    const startedMs = this.parseDateMs(startedAt);
    const finishedMs = this.parseDateMs(finishedAt);
    const durationMs =
      startedMs !== null && finishedMs !== null ? finishedMs - startedMs : null;

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

    const { board } = this.sudokuService.generateBoard(Number(base.seed));
    const startedAt = legacy.fechaInicio ?? base.fechaCreacion;
    const player1 = this.calculatePlayerProgress(
      base.jugador1Id,
      board,
      base.solution,
      movimientos,
      startedAt,
    );
    const player2 = legacy.jugador2Id
      ? this.calculatePlayerProgress(
          legacy.jugador2Id,
          board,
          base.solution,
          movimientos,
          startedAt,
        )
      : null;

    const state: MatchState = {
      _id: base._id!,
      torneoId: base.torneoId,
      jugador1Id: base.jugador1Id,
      jugador2Id: legacy.jugador2Id,
      estado: legacy.estado,
      seed: Number(base.seed),
      solution: base.solution,
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
    torneoId: string,
    usuarioId: string,
    token: string,
    tokenC1: string,
  ) {
    await this.verifyTorneoPvp(torneoId, tokenC1);
    await this.verifyParticipante(torneoId, tokenC1);

    const seed = Math.floor(Math.random() * 1000000);
    const { solution } = this.sudokuService.generateBoard(seed);

    const result = await this.roble.insert<MatchRecord>(token, 'Matches', [
      {
        torneoId,
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
    const state = await this.rebuildState(created._id!, token);
    return this.stripSolution(state);
  }

  async joinMatch(
    matchId: string,
    usuarioId: string,
    token: string,
    tokenC1: string,
  ) {
    const state = await this.rebuildState(matchId, token);
    if (state.estado !== 'WAITING')
      throw new BadRequestException('El match no esta en espera');
    if (state.jugador1Id === usuarioId) {
      throw new BadRequestException('No puedes jugar contra ti mismo');
    }

    await this.verifyParticipante(state.torneoId, tokenC1);

    await this.roble.update<MatchRecord>(token, 'Matches', '_id', matchId, {
      jugador2Id: usuarioId,
      estado: 'ACTIVE',
      fechaInicio: new Date().toISOString(),
    });

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
    return this.stripSolution(updated);
  }

  async makeMove(
    matchId: string,
    usuarioId: string,
    row: number,
    col: number,
    value: number,
    token: string,
  ) {
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

    const { board } = this.sudokuService.generateBoard(state.seed);
    if (board[row][col] !== 0) {
      throw new BadRequestException('No puedes modificar una celda fija');
    }
    if (playerBefore.boardState[row][col] !== 0) {
      throw new BadRequestException('Esa celda ya fue resuelta por ti');
    }

    const esCorrecta = this.sudokuService.validateMove(
      state.solution,
      row,
      col,
      value,
    );

    await this.roble.insert<MovimientoRecord>(token, 'MovimientosPvP', [
      {
        matchId: state._id,
        usuarioId,
        row,
        col,
        value,
        esCorrecta,
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
    }

    if (
      updated.estado === 'ACTIVE' &&
      updated.player2 &&
      updated.player1.finished &&
      updated.player2.finished
    ) {
      const p1 = updated.player1;
      const p2 = updated.player2;

      let ganadorId: string;
      if (p1.score !== p2.score) {
        ganadorId = p1.score > p2.score ? updated.jugador1Id : updated.jugador2Id!;
      } else {
        const p1Time = p1.durationMs ?? Number.MAX_SAFE_INTEGER;
        const p2Time = p2.durationMs ?? Number.MAX_SAFE_INTEGER;
        if (p1Time !== p2Time) {
          ganadorId = p1Time < p2Time ? updated.jugador1Id : updated.jugador2Id!;
        } else {
          ganadorId = updated.jugador1Id;
        }
      }

      const perdedorId =
        ganadorId === updated.jugador1Id ? updated.jugador2Id! : updated.jugador1Id;

      await this.roble.update<MatchRecord>(token, 'Matches', '_id', matchId, {
        estado: 'FINISHED',
        ganadorId,
        fechaFin: new Date().toISOString(),
        puntaje1: p1.score,
        puntaje2: p2.score,
      });

      const eloResult = await this.rankingService.updateElo(
        ganadorId,
        perdedorId,
        token,
      );

      this.webhookService
        .emit(
          'match.finished',
          [updated.jugador1Id, updated.jugador2Id!],
          {
            matchId,
            ganadorId,
            puntajeFinal: {
              [updated.jugador1Id]: p1.score,
              [updated.jugador2Id!]: p2.score,
            },
            duracionMs: {
              [updated.jugador1Id]: p1.durationMs,
              [updated.jugador2Id!]: p2.durationMs,
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
        esCorrecta,
        matchTerminado: true,
        ganadorId,
        puntaje1: p1.score,
        puntaje2: p2.score,
        playerFinished: playerAfter.finished,
      };
    }

    return {
      esCorrecta,
      matchTerminado: false,
      puntaje1: updated.player1.score,
      puntaje2: updated.player2?.score ?? 0,
      playerFinished: playerAfter.finished,
      myScore: playerAfter.score,
      myMistakes: playerAfter.mistakes,
    };
  }

  async getMatch(matchId: string, usuarioId: string, token: string) {
    const state = await this.rebuildState(matchId, token);
    return this.sanitizeMatchForUser(state, usuarioId);
  }

  async forfeit(matchId: string, usuarioId: string, token: string) {
    const state = await this.rebuildState(matchId, token);
    if (state.estado !== 'ACTIVE')
      throw new BadRequestException('El match no esta activo');
    if (state.jugador1Id !== usuarioId && state.jugador2Id !== usuarioId) {
      throw new ForbiddenException('No eres jugador de este match');
    }

    const j2Id = state.jugador2Id!;
    const oponenteId =
      state.jugador1Id === usuarioId ? j2Id : state.jugador1Id;

    await this.roble.update<MatchRecord>(token, 'Matches', '_id', matchId, {
      estado: 'FORFEIT',
      ganadorId: oponenteId,
      fechaFin: new Date().toISOString(),
      puntaje1: state.player1.score,
      puntaje2: state.player2?.score ?? 0,
    });

    await this.rankingService.updateElo(oponenteId, usuarioId, token);

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
