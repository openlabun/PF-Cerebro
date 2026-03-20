import { resolveConfig } from '../config.js'

function buildUrl(baseUrl, path) {
  const config = resolveConfig()
  const normalizedPath = String(path || '').replace(/^\/+/, '')
  const resolvedBaseUrl =
    baseUrl === 'pvp'
      ? config.PVP_API_BASE_URL
      : baseUrl === 'pvp-auth'
        ? config.PVP_AUTH_API_BASE_URL
        : baseUrl === 'pvp-webhook'
          ? config.PVP_WEBHOOK_API_BASE_URL
        : config.AUTH_API_BASE_URL
  return normalizedPath ? `${resolvedBaseUrl}/${normalizedPath}` : resolvedBaseUrl
}

function parseResponse(text) {
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function getPayloadErrorMessage(payload, status) {
  if (typeof payload !== 'object' || payload === null) {
    return `Request failed with status ${status}`
  }

  const rawMessage = payload.message

  if (Array.isArray(rawMessage)) {
    const normalized = rawMessage
      .map((item) => String(item).trim())
      .filter(Boolean)

    if (normalized.length) return normalized.join('. ')
  }

  if (rawMessage !== undefined && rawMessage !== null) {
    const message = String(rawMessage).trim()
    if (message) return message
  }

  return `Request failed with status ${status}`
}

export async function request(path, options = {}) {
  const method = options.method || 'GET'
  const body = options.body
  const token = options.token
  const signal = options.signal
  const baseUrl = options.baseUrl || 'auth'

  const headers = {
    Accept: 'application/json',
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(buildUrl(baseUrl, path), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  })

  const raw = await response.text()
  const payload = parseResponse(raw)

  if (!response.ok) {
    const error = new Error(getPayloadErrorMessage(payload, response.status))
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload
}

export const authStorage = {
  getSession() {
    const config = resolveConfig()
    const raw = localStorage.getItem(config.AUTH_STORAGE_KEY)
    if (!raw) return null

    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  },

  setSession(session) {
    const config = resolveConfig()
    localStorage.setItem(config.AUTH_STORAGE_KEY, JSON.stringify(session))
  },

  clearSession() {
    const config = resolveConfig()
    localStorage.removeItem(config.AUTH_STORAGE_KEY)
  },
}

export const apiClient = {
  login(credentials) {
    return request('auth/login', {
      method: 'POST',
      baseUrl: 'auth',
      body: credentials,
    })
  },

  signup(payload) {
    return request('auth/signup', {
      method: 'POST',
      baseUrl: 'auth',
      body: payload,
    })
  },

  verifyEmail(payload) {
    return request('auth/verify-email', {
      method: 'POST',
      baseUrl: 'auth',
      body: payload,
    })
  },

  forgotPassword(payload) {
    return request('auth/forgot-password', {
      method: 'POST',
      baseUrl: 'auth',
      body: payload,
    })
  },

  resetPassword(payload) {
    return request('auth/reset-password', {
      method: 'POST',
      baseUrl: 'auth',
      body: payload,
    })
  },

  refresh(refreshToken) {
    return request('auth/refresh', {
      method: 'POST',
      baseUrl: 'auth',
      body: { refreshToken },
    })
  },

  logout(accessToken) {
    return request('auth/logout', {
      method: 'POST',
      baseUrl: 'auth',
      token: accessToken,
    })
  },

  verifyToken(accessToken) {
    return request('auth/verify-token', {
      method: 'GET',
      baseUrl: 'auth',
      token: accessToken,
    })
  },

  pvpLogin(credentials) {
    return request('login', {
      method: 'POST',
      baseUrl: 'pvp-auth',
      body: credentials,
    })
  },

  pvpRefresh(refreshToken) {
    return request('refresh', {
      method: 'POST',
      baseUrl: 'pvp-auth',
      body: { refreshToken },
    })
  },

  pvpVerifyToken(accessToken) {
    return request('verify-token', {
      method: 'GET',
      baseUrl: 'pvp-auth',
      token: accessToken,
    })
  },

  pvpLogout(accessToken) {
    return request('logout', {
      method: 'POST',
      baseUrl: 'pvp-auth',
      token: accessToken,
    })
  },

  pvpSignupDirect(payload) {
    return request('signup-direct', {
      method: 'POST',
      baseUrl: 'pvp-auth',
      body: payload,
    })
  },

  getPvpWebhookSubscriptions(accessToken) {
    return request('subscriptions', {
      method: 'GET',
      baseUrl: 'pvp-webhook',
      token: accessToken,
    })
  },

  subscribePvpWebhook(payload, accessToken) {
    return request('subscribe', {
      method: 'POST',
      baseUrl: 'pvp-webhook',
      token: accessToken,
      body: payload,
    })
  },

  unsubscribePvpWebhook(subscriptionId, accessToken) {
    return request(`subscribe/${subscriptionId}`, {
      method: 'DELETE',
      baseUrl: 'pvp-webhook',
      token: accessToken,
    })
  },

  createTournament(payload, accessToken) {
    return request('torneos', {
      method: 'POST',
      baseUrl: 'auth',
      token: accessToken,
      body: payload,
    })
  },

  updateTournamentState(tournamentId, payload, accessToken) {
    return request(`torneos/${tournamentId}/estado`, {
      method: 'PATCH',
      baseUrl: 'auth',
      token: accessToken,
      body: payload,
    })
  },

  getTournament(tournamentId, accessToken) {
    return request(`torneos/${tournamentId}`, {
      method: 'GET',
      baseUrl: 'auth',
      token: accessToken,
    })
  },

  getTournamentParticipants(tournamentId, accessToken) {
    return request(`torneos/${tournamentId}/participantes`, {
      method: 'GET',
      baseUrl: 'auth',
      token: accessToken,
    })
  },

  joinTournament(tournamentId, accessToken) {
    return request(`torneos/${tournamentId}/unirse`, {
      method: 'POST',
      baseUrl: 'auth',
      token: accessToken,
      body: {},
    })
  },

  createPvpMatch(payload = {}, accessToken) {
    return request('match', {
      method: 'POST',
      baseUrl: 'pvp',
      token: accessToken,
      body: payload,
    })
  },

  joinPvpMatch(matchId, payload = {}, accessToken) {
    return request(`match/${matchId}/join`, {
      method: 'POST',
      baseUrl: 'pvp',
      token: accessToken,
      body: payload,
    })
  },

  getPvpMatch(matchId, accessToken, signal) {
    return request(`match/${matchId}`, {
      method: 'GET',
      baseUrl: 'pvp',
      token: accessToken,
      signal,
    })
  },

  makePvpMove(matchId, payload, accessToken) {
    return request(`match/${matchId}/move`, {
      method: 'POST',
      baseUrl: 'pvp',
      token: accessToken,
      body: payload,
    })
  },

  forfeitPvpMatch(matchId, accessToken) {
    return request(`match/${matchId}/forfeit`, {
      method: 'POST',
      baseUrl: 'pvp',
      token: accessToken,
    })
  },

  getMyProfile(accessToken) {
    return request('profiles/me', {
      method: 'POST',
      baseUrl: 'auth',
      token: accessToken,
    })
  },

  getMyGameStats(accessToken, gameId) {
    return request('game-stats/me', {
      method: 'POST',
      baseUrl: 'auth',
      token: accessToken,
      body: { juegoId: gameId },
    })
  },

  getAchievements(accessToken) {
    return request('achievements', {
      method: 'GET',
      baseUrl: 'auth',
      token: accessToken,
    })
  },

  getMyAchievements(accessToken) {
    return request('my-achievements', {
      method: 'GET',
      baseUrl: 'auth',
      token: accessToken,
    })
  },

  unlockAchievement(accessToken, logroId) {
    return request(`achievements/${logroId}/unlock`, {
      method: 'POST',
      baseUrl: 'auth',
      token: accessToken,
    })
  },

  createGameSession(accessToken, payload) {
    return request('game-sessions', {
      method: 'POST',
      baseUrl: 'auth',
      token: accessToken,
      body: payload,
    })
  },

  addExperience(accessToken, experiencia) {
    return request('profiles/add-experience', {
      method: 'POST',
      baseUrl: 'auth',
      token: accessToken,
      body: { experiencia },
    })
  },

  getLatestGameSession(accessToken, gameId, options = {}) {
    const normalizedGameId = String(gameId || '').trim()
    const excludeSessionId = String(options.excludeSessionId || '').trim()
    const query = new URLSearchParams({ juegoId: normalizedGameId })
    if (excludeSessionId) query.set('excludeSessionId', excludeSessionId)

    return request(`game-sessions/latest?${query.toString()}`, {
      method: 'GET',
      baseUrl: 'auth',
      token: accessToken,
    })
  },

  increaseStreak(accessToken) {
    return request('streak/increase', {
      method: 'POST',
      baseUrl: 'auth',
      token: accessToken,
    })
  },

  resetStreak(accessToken) {
    return request('streak/reset', {
      method: 'POST',
      baseUrl: 'auth',
      token: accessToken,
    })
  },
}
