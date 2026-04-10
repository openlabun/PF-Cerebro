import { resolveConfig } from '../config.js'

function buildUrl(baseUrl, path) {
  const config = resolveConfig()
  const normalizedPath = String(path || '').replace(/^\/+/, '')
  let resolvedBaseUrl = config.AUTH_API_BASE_URL

  if (baseUrl === 'pvp') {
    resolvedBaseUrl = config.PVP_API_BASE_URL
  } else if (baseUrl === 'pvp-auth') {
    resolvedBaseUrl = config.PVP_AUTH_API_BASE_URL
  } else if (baseUrl === 'pvp-webhook') {
    resolvedBaseUrl = config.PVP_WEBHOOK_API_BASE_URL
  } else if (baseUrl === 'admin-live') {
    resolvedBaseUrl = config.ADMIN_LIVE_API_BASE_URL
  }

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

function getFriendlyStatusMessage(status) {
  if (status === 401) {
    return 'Tu sesión no es válida o expiró. Inicia sesión nuevamente.'
  }

  if (status === 403) {
    return 'La solicitud fue rechazada por el servicio (403). Si estabas iniciando sesión, revisa tu red, VPN o filtros de seguridad.'
  }

  if (status === 502 || status === 503 || status === 504) {
    return 'No se pudo comunicar correctamente con el servicio externo. Intenta de nuevo.'
  }

  return `Request failed with status ${status}`
}

function getPayloadErrorMessage(payload, status) {
  if (typeof payload !== 'object' || payload === null) {
    return getFriendlyStatusMessage(status)
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
    if (message) {
      if (/^Request failed with status code \d+$/i.test(message)) {
        return getFriendlyStatusMessage(status)
      }

      return message
    }
  }

  return getFriendlyStatusMessage(status)
}

function getStoredAccessTokenForBase(baseUrl) {
  const session = authStorage.getSession()
  if (!session) return null

  if (baseUrl === 'auth' || baseUrl === 'admin-live') {
    return session.c1AccessToken || session.accessToken || null
  }

  if (baseUrl === 'pvp' || baseUrl === 'pvp-auth' || baseUrl === 'pvp-webhook') {
    return session.c2AccessToken || null
  }

  return null
}

function resolveRequestToken(baseUrl, explicitToken) {
  if (!explicitToken) return null
  return getStoredAccessTokenForBase(baseUrl) || explicitToken
}

async function performRequest(path, options = {}, tokenOverride = null) {
  const method = options.method || 'GET'
  const body = options.body
  const baseUrl = options.baseUrl || 'auth'
  const token = tokenOverride ?? resolveRequestToken(baseUrl, options.token)
  const signal = options.signal
  const extraHeaders =
    options.headers && typeof options.headers === 'object' && !Array.isArray(options.headers)
      ? options.headers
      : {}

  const headers = {
    Accept: 'application/json',
    ...extraHeaders,
  }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(buildUrl(baseUrl, path), {
    method,
    cache: 'no-store',
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

async function refreshSessionForBase(baseUrl) {
  const session = authStorage.getSession()
  if (!session) return null

  if (baseUrl === 'auth' || baseUrl === 'admin-live') {
    const refreshToken = session.c1RefreshToken || session.refreshToken
    if (!refreshToken) return null

    const refreshed = await performRequest('auth/refresh', {
      method: 'POST',
      baseUrl: 'auth',
      body: { refreshToken },
    })

    const nextSession = {
      ...session,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken || refreshToken,
      c1AccessToken: refreshed.accessToken,
      c1RefreshToken: refreshed.refreshToken || refreshToken,
      user: refreshed.user || session.user,
    }
    authStorage.setSession(nextSession)
    return nextSession.c1AccessToken
  }

  if (baseUrl === 'pvp' || baseUrl === 'pvp-auth' || baseUrl === 'pvp-webhook') {
    const refreshToken = session.c2RefreshToken
    if (!refreshToken) return null

    const refreshed = await performRequest('refresh', {
      method: 'POST',
      baseUrl: 'pvp-auth',
      body: { refreshToken },
    })

    const nextSession = {
      ...session,
      c2AccessToken: refreshed.accessToken,
      c2RefreshToken: refreshed.refreshToken || refreshToken,
      user: refreshed.user || session.user,
    }
    authStorage.setSession(nextSession)
    return nextSession.c2AccessToken
  }

  return null
}

export async function request(path, options = {}) {
  const baseUrl = options.baseUrl || 'auth'

  try {
    return await performRequest(path, options)
  } catch (error) {
    const shouldTryRefresh =
      !options.skipAuthRefresh &&
      error?.status === 401 &&
      Boolean(options.token)

    if (!shouldTryRefresh) {
      throw error
    }

    const refreshedToken = await refreshSessionForBase(baseUrl).catch(() => null)
    if (!refreshedToken) {
      throw error
    }

    return performRequest(path, options, refreshedToken)
  }
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
      skipAuthRefresh: true,
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

  verifyToken(accessToken, options = {}) {
    return request('auth/verify-token', {
      method: 'GET',
      baseUrl: 'auth',
      token: accessToken,
      headers: options.headers,
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
      skipAuthRefresh: true,
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

  getTournaments(accessToken) {
    return request('torneos', {
      method: 'GET',
      baseUrl: 'auth',
      token: accessToken,
    })
  },

  getPublicTournaments() {
    return request('torneos/public', {
      method: 'GET',
      baseUrl: 'auth',
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

  updateTournament(tournamentId, payload, accessToken) {
    return request(`torneos/${tournamentId}`, {
      method: 'PUT',
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

  getPublicTournament(tournamentId) {
    return request(`torneos/public/${tournamentId}`, {
      method: 'GET',
      baseUrl: 'auth',
    })
  },

  getTournamentParticipants(tournamentId, accessToken) {
    return request(`torneos/${tournamentId}/participantes`, {
      method: 'GET',
      baseUrl: 'auth',
      token: accessToken,
    })
  },

  getPublicTournamentParticipants(tournamentId) {
    return request(`torneos/public/${tournamentId}/participantes`, {
      method: 'GET',
      baseUrl: 'auth',
    })
  },

  getTournamentRanking(tournamentId, accessToken) {
    return request(`torneos/${tournamentId}/ranking`, {
      method: 'GET',
      baseUrl: 'auth',
      token: accessToken,
    })
  },

  getPublicTournamentRanking(tournamentId) {
    return request(`torneos/public/${tournamentId}/ranking`, {
      method: 'GET',
      baseUrl: 'auth',
    })
  },

  getTournamentResultsByUser(userId, accessToken) {
    return request(`torneos/usuarios/${userId}/resultados`, {
      method: 'GET',
      baseUrl: 'auth',
      token: accessToken,
    })
  },

  deleteTournament(tournamentId, accessToken) {
    return request(`torneos/${tournamentId}`, {
      method: 'DELETE',
      baseUrl: 'auth',
      token: accessToken,
    })
  },

  joinTournament(tournamentId, payloadOrToken = {}, maybeAccessToken) {
    const legacySignature = typeof payloadOrToken === 'string' && maybeAccessToken === undefined
    const body = legacySignature ? {} : payloadOrToken || {}
    const accessToken = legacySignature ? payloadOrToken : maybeAccessToken

    return request(`torneos/${tournamentId}/unirse`, {
      method: 'POST',
      baseUrl: 'auth',
      token: accessToken,
      body,
    })
  },

  startTournamentSession(tournamentId, accessToken) {
    return request(`torneos/${tournamentId}/sesiones/iniciar`, {
      method: 'POST',
      baseUrl: 'auth',
      token: accessToken,
    })
  },

  finishTournamentSession(tournamentId, sessionId, payload, accessToken) {
    return request(`torneos/${tournamentId}/sesiones/${sessionId}/finalizar`, {
      method: 'POST',
      baseUrl: 'auth',
      token: accessToken,
      body: payload,
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

  joinPvpMatchByCode(payload = {}, accessToken) {
    return request('match/join-by-code', {
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

  getMyPvpRanking(accessToken) {
    return request('ranking/me', {
      method: 'GET',
      baseUrl: 'pvp',
      token: accessToken,
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
    return request('achievements/me', {
      method: 'GET',
      baseUrl: 'auth',
      token: accessToken,
    })
  },

  unlockAchievement(accessToken, logroId) {
    return request('achievements/unlock', {
      method: 'POST',
      baseUrl: 'auth',
      token: accessToken,
      body: { logroId },
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
    const excludePlayedAt = String(options.excludePlayedAt || '').trim()
    const query = new URLSearchParams({ juegoId: normalizedGameId })
    if (excludeSessionId) query.set('excludeSessionId', excludeSessionId)
    if (excludePlayedAt) query.set('excludePlayedAt', excludePlayedAt)

    return request(`game-sessions/latest?${query.toString()}`, {
      method: 'GET',
      baseUrl: 'auth',
      token: accessToken,
    })
  },

  getSudokuSeed(accessToken, difficultyLabel) {
    const query = new URLSearchParams({
      dificultad: String(difficultyLabel || '').trim(),
    })

    return request(`game-sessions/sudoku-seed?${query.toString()}`, {
      method: 'GET',
      baseUrl: 'auth',
      token: accessToken,
    })
  },

  increaseStreak(accessToken) {
    return request('streaks/increase', {
      method: 'POST',
      baseUrl: 'auth',
      token: accessToken,
    })
  },

  sendLiveHeartbeat(payload, accessToken) {
    return request('heartbeat', {
      method: 'POST',
      baseUrl: 'admin-live',
      token: accessToken,
      body: payload,
    })
  },

  resetStreak(accessToken) {
    return request('streaks/reset', {
      method: 'POST',
      baseUrl: 'auth',
      token: accessToken,
    })
  },
}
