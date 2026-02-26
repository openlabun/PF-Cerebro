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

// Sentinel row values for non-move events in MovimientosPvP
const ROW_JOIN = -1;
const ROW_FORFEIT = -2;
const ROW_FINISHED = -3;

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
  matchId: string;
  usuarioId: string;
  row: number;
  col: number;
  value: number;
  esCorrecta: boolean;
  timestamp: string;
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

    const state: MatchState = {
      _id: base._id!,
      torneoId: base.torneoId,
      jugador1Id: base.jugador1Id,
      jugador2Id: null,
      estado: 'WAITING',
      seed: Number(base.seed),
      solution: base.solution,
      puntaje1: 0,
      puntaje2: 0,
      ganadorId: null,
      fechaCreacion: base.fechaCreacion,
      fechaInicio: null,
      fechaFin: null,
    };

    for (const mov of movimientos) {
      const row = Number(mov.row);
      if (row === ROW_JOIN) {
        state.jugador2Id = mov.usuarioId;
        state.estado = 'ACTIVE';
        state.fechaInicio = mov.timestamp;
      } else if (row === ROW_FORFEIT) {
        state.estado = 'FORFEIT';
        // The forfeiter is mov.usuarioId; the winner is the other player
        state.ganadorId =
          mov.usuarioId === state.jugador1Id
            ? state.jugador2Id
            : state.jugador1Id;
        state.fechaFin = mov.timestamp;
      } else if (row === ROW_FINISHED) {
        state.estado = 'FINISHED';
        state.ganadorId =
          state.puntaje1 > state.puntaje2
            ? state.jugador1Id
            : state.puntaje2 > state.puntaje1
              ? state.jugador2Id
              : mov.usuarioId;
        state.fechaFin = mov.timestamp;
      } else if (row >= 0) {
        if (String(mov.esCorrecta) === 'true') {
          if (mov.usuarioId === state.jugador1Id) state.puntaje1 += 1;
          else state.puntaje2 += 1;
        }
      }
    }

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

    await this.roble.insert<MovimientoRecord>(token, 'MovimientosPvP', [
      {
        matchId,
        usuarioId,
        row: ROW_JOIN,
        col: 0,
        value: 0,
        esCorrecta: false,
        timestamp: new Date().toISOString(),
      },
    ]);

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

    const esCorrecta = this.sudokuService.validateMove(
      state.solution,
      row,
      col,
      value,
    );

    await this.roble.insert<MovimientoRecord>(token, 'MovimientosPvP', [
      {
        matchId,
        usuarioId,
        row,
        col,
        value,
        esCorrecta,
        timestamp: new Date().toISOString(),
      },
    ]);

    const isJugador1 = state.jugador1Id === usuarioId;
    const puntaje1 = state.puntaje1 + (esCorrecta && isJugador1 ? 1 : 0);
    const puntaje2 = state.puntaje2 + (esCorrecta && !isJugador1 ? 1 : 0);

    const jugador2Id = state.jugador2Id!;
    const oponenteId = isJugador1 ? jugador2Id : state.jugador1Id;
    const puntajeOponente = isJugador1 ? puntaje1 : puntaje2;

    this.webhookService
      .emit(
        'opponent.moved',
        [oponenteId],
        { matchId, row, col, value, esCorrecta, puntajeOponente },
        token,
      )
      .catch((e) => this.logger.warn(`Webhook emit error: ${e.message}`));

    const { board } = this.sudokuService.generateBoard(state.seed);
    const celdasVacias = board.flat().filter((c) => c === 0).length;

    if (puntaje1 + puntaje2 >= celdasVacias) {
      const ganadorId =
        puntaje1 > puntaje2
          ? state.jugador1Id
          : puntaje2 > puntaje1
            ? jugador2Id
            : usuarioId;

      await this.roble.insert<MovimientoRecord>(token, 'MovimientosPvP', [
        {
          matchId,
          usuarioId: ganadorId,
          row: ROW_FINISHED,
          col: 0,
          value: 0,
          esCorrecta: false,
          timestamp: new Date().toISOString(),
        },
      ]);

      const perdedorId =
        ganadorId === state.jugador1Id ? jugador2Id : state.jugador1Id;
      const eloResult = await this.rankingService.updateElo(
        ganadorId,
        perdedorId,
        token,
      );

      this.webhookService
        .emit(
          'match.finished',
          [state.jugador1Id, jugador2Id],
          {
            matchId,
            ganadorId,
            puntajeFinal: {
              [state.jugador1Id]: puntaje1,
              [jugador2Id]: puntaje2,
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
        puntaje1,
        puntaje2,
      };
    }

    return { esCorrecta, matchTerminado: false, puntaje1, puntaje2 };
  }

  async getMatch(matchId: string, token: string) {
    const state = await this.rebuildState(matchId, token);
    return this.stripSolution(state);
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

    await this.roble.insert<MovimientoRecord>(token, 'MovimientosPvP', [
      {
        matchId,
        usuarioId,
        row: ROW_FORFEIT,
        col: 0,
        value: 0,
        esCorrecta: false,
        timestamp: new Date().toISOString(),
      },
    ]);

    await this.rankingService.updateElo(oponenteId, usuarioId, token);

    this.webhookService
      .emit(
        'match.forfeit',
        [state.jugador1Id, j2Id],
        {
          matchId,
          ganadorId: oponenteId,
          razon: `El jugador ${usuarioId} abandono la partida`,
        },
        token,
      )
      .catch((e) => this.logger.warn(`Webhook emit error: ${e.message}`));

    return { matchId, ganadorId: oponenteId, estado: 'FORFEIT' };
  }
}
