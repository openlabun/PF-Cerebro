import { Injectable } from '@nestjs/common';
import { UpdateTorneoEstadoDto } from './dto/update-torneo-estado.dto';

type UserSeed = { id: string; createdAt: string; games: string[] };

@Injectable()
export class AdminService {
  private readonly contenedor1BaseUrl =
    process.env.CONTENEDOR1_BASE_URL || 'http://cerebro-api:3000/api';

  private readonly adminApiToken = process.env.ADMIN_API_TOKEN || '';

  private readonly seedData: { users: UserSeed[] } = {
    users: [
      { id: 'u1', createdAt: '2026-01-01T10:00:00Z', games: ['sudoku', 'pvp'] },
      { id: 'u2', createdAt: '2026-01-03T11:30:00Z', games: ['sudoku'] },
      {
        id: 'u3',
        createdAt: '2026-01-07T08:00:00Z',
        games: ['sudoku', 'torneos'],
      },
      { id: 'u4', createdAt: '2026-01-10T14:40:00Z', games: ['pvp'] },
      {
        id: 'u5',
        createdAt: '2026-01-14T09:10:00Z',
        games: ['sudoku', 'torneos', 'pvp'],
      },
    ],
  };

  buildOverview() {
    const totalUsers = this.seedData.users.length;
    const totalGameParticipations = this.seedData.users.reduce(
      (acc, user) => acc + user.games.length,
      0,
    );

    const usersByGame = this.seedData.users.reduce<Record<string, number>>(
      (acc, user) => {
        for (const game of user.games) {
          acc[game] = (acc[game] || 0) + 1;
        }
        return acc;
      },
      {},
    );

    return {
      totalUsers,
      totalGameParticipations,
      usersByGame,
      source: 'observability-seed',
    };
  }

  getTotalUsers() {
    return {
      totalUsers: this.seedData.users.length,
      source: 'observability-seed',
    };
  }

  getUsersTimeSeries(fromInput?: string, toInput?: string) {
    const now = new Date();
    const fromFallback = new Date(now);
    fromFallback.setDate(now.getDate() - 30);

    const from = this.parseDateInput(fromInput, fromFallback);
    const to = this.parseDateInput(toInput, now);

    const seriesMap = new Map<string, number>();

    for (const user of this.seedData.users) {
      const createdAt = new Date(user.createdAt);
      if (createdAt < from || createdAt > to) continue;

      const key = createdAt.toISOString().slice(0, 10);
      seriesMap.set(key, (seriesMap.get(key) || 0) + 1);
    }

    const data = Array.from(seriesMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, users]) => ({ date, users }));

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      bucket: 'day',
      data,
      source: 'observability-seed',
    };
  }

  getGamesByUser() {
    return {
      data: this.seedData.users.map((user) => ({
        userId: user.id,
        games: user.games,
        gamesPlayedCount: user.games.length,
      })),
      source: 'observability-seed',
    };
  }

  getUserGames(userId: string) {
    const user = this.seedData.users.find((item) => item.id === userId);
    if (!user) return null;
    return {
      userId: user.id,
      games: user.games,
      source: 'observability-seed',
    };
  }

  async getTorneos() {
    return this.requestContenedor1('torneos', 'GET');
  }

  async patchTorneoEstado(torneoId: string, dto: UpdateTorneoEstadoDto) {
    return this.requestContenedor1(`torneos/${torneoId}/estado`, 'PATCH', {
      estado: dto.estado,
      razon: dto.razon || 'Actualizado desde modulo admin',
    });
  }

  private parseDateInput(value: string | undefined, fallback: Date) {
    if (!value) return fallback;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed;
  }

  private async requestContenedor1(path: string, method: string, body?: unknown) {
    const base = this.contenedor1BaseUrl.replace(/\/+$/, '');
    const endpoint = String(path).replace(/^\/+/, '');
    const url = `${base}/${endpoint}`;

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (this.adminApiToken) {
      headers.Authorization = `Bearer ${this.adminApiToken}`;
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
      throw new Error(`Contenedor1 responded ${response.status}`);
    }

    return payload;
  }
}
