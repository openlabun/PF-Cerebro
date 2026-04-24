import AsyncStorage from '@react-native-async-storage/async-storage';

import { resolveConfig } from '@/services/config';

export type ApiBaseUrl = 'auth' | 'pvp' | 'pvp-auth' | 'pvp-webhook';

export type SessionUser = {
  id?: string | number | null;
  sub?: string | number | null;
  email?: string;
  name?: string;
  isVerified?: boolean;
  verified?: boolean;
  emailVerified?: boolean;
  [key: string]: unknown;
};

export type AuthSession = {
  accessToken?: string;
  refreshToken?: string;
  c1AccessToken?: string;
  c1RefreshToken?: string;
  c2AccessToken?: string;
  c2RefreshToken?: string;
  user?: SessionUser | null;
  [key: string]: unknown;
};

export type AuthTokensResponse = {
  accessToken?: string;
  refreshToken?: string;
  user?: SessionUser;
  [key: string]: unknown;
};

export type VerifyTokenResponse = {
  user?: SessionUser;
  [key: string]: unknown;
};

export type ApiError = Error & {
  status?: number;
  payload?: unknown;
};

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  baseUrl?: ApiBaseUrl;
  token?: string | null;
  signal?: AbortSignal;
  skipAuthRefresh?: boolean;
};

function buildUrl(baseUrl: ApiBaseUrl, path: string) {
  const config = resolveConfig();
  const normalizedPath = String(path || '').replace(/^\/+/, '');

  const resolvedBaseUrl =
    baseUrl === 'pvp'
      ? config.PVP_API_BASE_URL
      : baseUrl === 'pvp-auth'
        ? config.PVP_AUTH_API_BASE_URL
        : baseUrl === 'pvp-webhook'
          ? config.PVP_WEBHOOK_API_BASE_URL
          : config.AUTH_API_BASE_URL;

  return normalizedPath ? `${resolvedBaseUrl}/${normalizedPath}` : resolvedBaseUrl;
}

function parseResponse(text: string) {
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function getPayloadErrorMessage(payload: unknown, status: number) {
  if (typeof payload !== 'object' || payload === null) {
    return `Request failed with status ${status}`;
  }

  const rawMessage = Reflect.get(payload, 'message');

  if (Array.isArray(rawMessage)) {
    const normalized = rawMessage
      .map((item) => String(item).trim())
      .filter(Boolean);

    if (normalized.length) return normalized.join('. ');
  }

  if (rawMessage !== undefined && rawMessage !== null) {
    const message = String(rawMessage).trim();
    if (message) return message;
  }

  return `Request failed with status ${status}`;
}

async function getStoredAccessTokenForBase(baseUrl: ApiBaseUrl) {
  const session = await authStorage.getSession();
  if (!session) return null;

  if (baseUrl === 'auth') {
    return session.c1AccessToken || session.accessToken || null;
  }

  if (baseUrl === 'pvp' || baseUrl === 'pvp-auth' || baseUrl === 'pvp-webhook') {
    return session.c2AccessToken || null;
  }

  return null;
}

async function resolveRequestToken(baseUrl: ApiBaseUrl, explicitToken?: string | null) {
  if (!explicitToken) return null;
  return (await getStoredAccessTokenForBase(baseUrl)) || explicitToken;
}

async function performRequest<T>(path: string, options: RequestOptions = {}, tokenOverride: string | null = null) {
  const method = options.method || 'GET';
  const body = options.body;
  const baseUrl = options.baseUrl || 'auth';
  const token = tokenOverride ?? (await resolveRequestToken(baseUrl, options.token));
  const signal = options.signal;

  const headers: HeadersInit = {
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(baseUrl, path), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  const raw = await response.text();
  const payload = parseResponse(raw);

  if (!response.ok) {
    const error = new Error(getPayloadErrorMessage(payload, response.status)) as ApiError;
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload as T;
}

async function refreshSessionForBase(baseUrl: ApiBaseUrl) {
  const session = await authStorage.getSession();
  if (!session) return null;

  if (baseUrl === 'auth') {
    const refreshToken = session.c1RefreshToken || session.refreshToken;
    if (!refreshToken) return null;

    const refreshed = await performRequest<AuthTokensResponse>('auth/refresh', {
      method: 'POST',
      baseUrl: 'auth',
      body: { refreshToken },
    });

    const nextSession: AuthSession = {
      ...session,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken || refreshToken,
      c1AccessToken: refreshed.accessToken,
      c1RefreshToken: refreshed.refreshToken || refreshToken,
      user: refreshed.user || session.user,
    };

    await authStorage.setSession(nextSession);
    return nextSession.c1AccessToken || null;
  }

  if (baseUrl === 'pvp' || baseUrl === 'pvp-auth' || baseUrl === 'pvp-webhook') {
    const refreshToken = session.c2RefreshToken;
    if (!refreshToken) return null;

    const refreshed = await performRequest<AuthTokensResponse>('refresh', {
      method: 'POST',
      baseUrl: 'pvp-auth',
      body: { refreshToken },
    });

    const nextSession: AuthSession = {
      ...session,
      c2AccessToken: refreshed.accessToken,
      c2RefreshToken: refreshed.refreshToken || refreshToken,
      user: refreshed.user || session.user,
    };

    await authStorage.setSession(nextSession);
    return nextSession.c2AccessToken || null;
  }

  return null;
}

export async function request<T = unknown>(path: string, options: RequestOptions = {}) {
  const baseUrl = options.baseUrl || 'auth';

  try {
    return await performRequest<T>(path, options);
  } catch (error) {
    const requestError = error as ApiError;
    const shouldTryRefresh =
      !options.skipAuthRefresh &&
      requestError.status === 401 &&
      Boolean(options.token);

    if (!shouldTryRefresh) {
      throw error;
    }

    const refreshedToken = await refreshSessionForBase(baseUrl).catch(() => null);
    if (!refreshedToken) {
      throw error;
    }

    return performRequest<T>(path, options, refreshedToken);
  }
}

export const authStorage = {
  async getSession() {
    const config = resolveConfig();
    const raw = await AsyncStorage.getItem(config.AUTH_STORAGE_KEY);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      return null;
    }
  },

  async setSession(session: AuthSession) {
    const config = resolveConfig();
    await AsyncStorage.setItem(config.AUTH_STORAGE_KEY, JSON.stringify(session));
  },

  async clearSession() {
    const config = resolveConfig();
    await AsyncStorage.removeItem(config.AUTH_STORAGE_KEY);
  },
};

export const apiClient = {
  login(credentials: Record<string, unknown>) {
    return request<AuthTokensResponse>('auth/login', {
      method: 'POST',
      baseUrl: 'auth',
      body: credentials,
    });
  },

  signup(payload: Record<string, unknown>) {
    return request<AuthTokensResponse>('auth/signup', {
      method: 'POST',
      baseUrl: 'auth',
      body: payload,
    });
  },

  verifyEmail(payload: Record<string, unknown>) {
    return request('auth/verify-email', {
      method: 'POST',
      baseUrl: 'auth',
      body: payload,
    });
  },

  forgotPassword(payload: Record<string, unknown>) {
    return request('auth/forgot-password', {
      method: 'POST',
      baseUrl: 'auth',
      body: payload,
    });
  },

  resetPassword(payload: Record<string, unknown>) {
    return request('auth/reset-password', {
      method: 'POST',
      baseUrl: 'auth',
      body: payload,
    });
  },

  refresh(refreshToken: string) {
    return request<AuthTokensResponse>('auth/refresh', {
      method: 'POST',
      baseUrl: 'auth',
      skipAuthRefresh: true,
      body: { refreshToken },
    });
  },

  logout(accessToken: string) {
    return request('auth/logout', {
      method: 'POST',
      baseUrl: 'auth',
      token: accessToken,
    });
  },

  verifyToken(accessToken: string) {
    return request<VerifyTokenResponse>('auth/verify-token', {
      method: 'GET',
      baseUrl: 'auth',
      token: accessToken,
    });
  },

  pvpLogin(credentials: Record<string, unknown>) {
    return request<AuthTokensResponse>('login', {
      method: 'POST',
      baseUrl: 'pvp-auth',
      body: credentials,
    });
  },

  pvpRefresh(refreshToken: string) {
    return request<AuthTokensResponse>('refresh', {
      method: 'POST',
      baseUrl: 'pvp-auth',
      skipAuthRefresh: true,
      body: { refreshToken },
    });
  },

  pvpVerifyToken(accessToken: string) {
    return request<VerifyTokenResponse>('verify-token', {
      method: 'GET',
      baseUrl: 'pvp-auth',
      token: accessToken,
    });
  },

  pvpLogout(accessToken: string) {
    return request('logout', {
      method: 'POST',
      baseUrl: 'pvp-auth',
      token: accessToken,
    });
  },

  pvpSignupDirect(payload: Record<string, unknown>) {
    return request<AuthTokensResponse>('signup-direct', {
      method: 'POST',
      baseUrl: 'pvp-auth',
      body: payload,
    });
  },

  getPvpWebhookSubscriptions(accessToken: string) {
    return request('subscriptions', {
      method: 'GET',
      baseUrl: 'pvp-webhook',
      token: accessToken,
    });
  },

  subscribePvpWebhook(payload: Record<string, unknown>, accessToken: string) {
    return request('subscribe', {
      method: 'POST',
      baseUrl: 'pvp-webhook',
      token: accessToken,
      body: payload,
    });
  },

  unsubscribePvpWebhook(subscriptionId: string, accessToken: string) {
    return request(`subscribe/${subscriptionId}`, {
      method: 'DELETE',
      baseUrl: 'pvp-webhook',
      token: accessToken,
    });
  },

  createTournament(payload: Record<string, unknown>, accessToken: string) {
    return request('torneos', {
      method: 'POST',
      baseUrl: 'auth',
      token: accessToken,
      body: payload,
    });
  },

  updateTournamentState(
    tournamentId: string,
    payload: Record<string, unknown>,
    accessToken: string,
  ) {
    return request(`torneos/${tournamentId}/estado`, {
      method: 'PATCH',
      baseUrl: 'auth',
      token: accessToken,
      body: payload,
    });
  },

  getTournament(tournamentId: string, accessToken: string) {
    return request(`torneos/${tournamentId}`, {
      method: 'GET',
      baseUrl: 'auth',
      token: accessToken,
    });
  },

  getTournamentParticipants(tournamentId: string, accessToken: string) {
    return request(`torneos/${tournamentId}/participantes`, {
      method: 'GET',
      baseUrl: 'auth',
      token: accessToken,
    });
  },

  joinTournament(tournamentId: string, accessToken: string) {
    return request(`torneos/${tournamentId}/unirse`, {
      method: 'POST',
      baseUrl: 'auth',
      token: accessToken,
      body: {},
    });
  },

  getTournamentResultsByUser(userId: string, accessToken: string) {
    return request(`torneos/usuarios/${userId}/resultados`, {
      method: 'GET',
      baseUrl: 'auth',
      token: accessToken,
    });
  },

  getMyTournamentHistory(accessToken: string) {
    return request('torneos/me/historial', {
      method: 'GET',
      baseUrl: 'auth',
      token: accessToken,
    });
  },

  createPvpMatch(payload: Record<string, unknown> = {}, accessToken: string) {
    return request('match', {
      method: 'POST',
      baseUrl: 'pvp',
      token: accessToken,
      body: payload,
    });
  },

  joinPvpMatch(matchId: string, payload: Record<string, unknown> = {}, accessToken: string) {
    return request(`match/${matchId}/join`, {
      method: 'POST',
      baseUrl: 'pvp',
      token: accessToken,
      body: payload,
    });
  },

  getPvpMatch(matchId: string, accessToken: string, signal?: AbortSignal) {
    return request(`match/${matchId}`, {
      method: 'GET',
      baseUrl: 'pvp',
      token: accessToken,
      signal,
    });
  },

  makePvpMove(matchId: string, payload: Record<string, unknown>, accessToken: string) {
    return request(`match/${matchId}/move`, {
      method: 'POST',
      baseUrl: 'pvp',
      token: accessToken,
      body: payload,
    });
  },

  forfeitPvpMatch(matchId: string, accessToken: string) {
    return request(`match/${matchId}/forfeit`, {
      method: 'POST',
      baseUrl: 'pvp',
      token: accessToken,
    });
  },

  getMyPvpRanking(accessToken: string) {
    return request('ranking/me', {
      method: 'GET',
      baseUrl: 'pvp',
      token: accessToken,
    });
  },

  getMyProfile(accessToken: string) {
    return request('profiles/me', {
      method: 'POST',
      baseUrl: 'auth',
      token: accessToken,
    });
  },

  getMyGameStats(accessToken: string, gameId: string) {
    return request('game-stats/me', {
      method: 'POST',
      baseUrl: 'auth',
      token: accessToken,
      body: { juegoId: gameId },
    });
  },

  getAchievements(accessToken: string) {
    return request('achievements', {
      method: 'GET',
      baseUrl: 'auth',
      token: accessToken,
    });
  },

  getMyAchievements(accessToken: string) {
    return request('my-achievements', {
      method: 'GET',
      baseUrl: 'auth',
      token: accessToken,
    });
  },

  unlockAchievement(accessToken: string, logroId: string) {
    return request(`achievements/${logroId}/unlock`, {
      method: 'POST',
      baseUrl: 'auth',
      token: accessToken,
    });
  },

  createGameSession(accessToken: string, payload: Record<string, unknown>) {
    return request('game-sessions', {
      method: 'POST',
      baseUrl: 'auth',
      token: accessToken,
      body: payload,
    });
  },

  addExperience(accessToken: string, experiencia: number) {
    return request('profiles/add-experience', {
      method: 'POST',
      baseUrl: 'auth',
      token: accessToken,
      body: { experiencia },
    });
  },

  getLatestGameSession(
    accessToken: string,
    gameId: string,
    options: { excludeSessionId?: string } = {},
  ) {
    const normalizedGameId = String(gameId || '').trim();
    const excludeSessionId = String(options.excludeSessionId || '').trim();
    const query = new URLSearchParams({ juegoId: normalizedGameId });

    if (excludeSessionId) {
      query.set('excludeSessionId', excludeSessionId);
    }

    return request(`game-sessions/latest?${query.toString()}`, {
      method: 'GET',
      baseUrl: 'auth',
      token: accessToken,
    });
  },

  getSudokuSeed(accessToken: string, difficultyLabel: string) {
    const query = new URLSearchParams({
      dificultad: String(difficultyLabel || '').trim(),
    });

    return request(`game-sessions/sudoku-seed?${query.toString()}`, {
      method: 'GET',
      baseUrl: 'auth',
      token: accessToken,
    });
  },

  increaseStreak(accessToken: string) {
    return request('streak/increase', {
      method: 'POST',
      baseUrl: 'auth',
      token: accessToken,
    });
  },

  resetStreak(accessToken: string) {
    return request('streak/reset', {
      method: 'POST',
      baseUrl: 'auth',
      token: accessToken,
    });
  },
};
