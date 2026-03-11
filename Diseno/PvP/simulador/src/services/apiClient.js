import { resolveConfig } from '../config.js'

function buildUrl(baseUrl, path) {
  const config = resolveConfig()
  const normalizedPath = String(path || '').replace(/^\/+/, '')
  const resolvedBaseUrl = baseUrl === 'pvp' ? config.PVP_API_BASE_URL : config.AUTH_API_BASE_URL
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
}
