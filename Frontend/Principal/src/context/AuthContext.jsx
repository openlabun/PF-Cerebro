import { createContext, useContext, useEffect, useState } from 'react'
import { apiClient, authStorage } from '../services/apiClient.js'

const AuthContext = createContext(null)

function normalizeSessionUser(sessionUser = {}, verifiedUser = {}) {
  const fallbackEmail = verifiedUser.email || sessionUser.email || ''
  const fallbackName = sessionUser.name || (fallbackEmail ? fallbackEmail.split('@')[0] : '')
  const verificationFlags = [
    verifiedUser.isVerified,
    verifiedUser.verified,
    verifiedUser.emailVerified,
    sessionUser.isVerified,
    sessionUser.verified,
    sessionUser.emailVerified,
  ]
  const resolvedVerification = verificationFlags.find((value) => typeof value === 'boolean')

  return {
    ...sessionUser,
    id: sessionUser.id || verifiedUser.sub || null,
    sub: verifiedUser.sub || sessionUser.sub || sessionUser.id || null,
    email: fallbackEmail,
    name: sessionUser.name || fallbackName,
    isVerified: resolvedVerification,
  }
}

function buildUnifiedSession(sessionLike, verifiedUser = {}) {
  const accessToken = sessionLike?.c1AccessToken || sessionLike?.accessToken || ''
  const refreshToken =
    sessionLike?.c1RefreshToken ||
    sessionLike?.refreshToken ||
    sessionLike?.c2RefreshToken ||
    ''

  return {
    ...sessionLike,
    accessToken,
    refreshToken,
    c1AccessToken: accessToken,
    c1RefreshToken: refreshToken,
    c2AccessToken: accessToken,
    c2RefreshToken: refreshToken,
    user: normalizeSessionUser(sessionLike?.user, verifiedUser),
  }
}

async function hydrateSession(session) {
  const accessToken = session?.c1AccessToken || session?.accessToken
  if (!accessToken) {
    throw new Error('Session without access token')
  }

  const displayNameHint = String(session?.user?.name || '').trim()
  const verification = await apiClient.verifyToken(accessToken, {
    headers: displayNameHint ? { 'X-User-Display-Name': displayNameHint } : undefined,
  })
  return buildUnifiedSession(session, verification?.user || {})
}

// ========== Lógica de Rachas ==========
const GAME_ID_SUDOKU = 'uVsB-k2rjora'
const STREAK_SESSION_WINDOW_MS = 28 * 60 * 60 * 1000 // 28 horas en milisegundos

function parseIsoDate(value) {
  const date = new Date(String(value || ''))
  if (Number.isNaN(date.getTime())) return null
  return date
}

function getSessionDayKey(value) {
  const date = parseIsoDate(value)
  if (!date) return null
  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

async function validateAndResetStreakOnLogin(accessToken) {
  try {
    const previousSession = await apiClient.getLatestGameSession(accessToken, GAME_ID_SUDOKU)
    if (!previousSession?.jugadoEn) {
      // Primera vez que el usuario juega, o no hay sesiones previas
      return
    }

    const previousPlayedAt = parseIsoDate(previousSession.jugadoEn)
    if (!previousPlayedAt) return

    const now = new Date()
    const elapsedMs = now.getTime() - previousPlayedAt.getTime()
    const previousSessionDayKey = getSessionDayKey(previousSession.jugadoEn)
    const currentSessionDayKey = getSessionDayKey(now)

    // Si es el mismo día, no hacer nada
    if (previousSessionDayKey === currentSessionDayKey) {
      return
    }

    // Si pasaron más de 28 horas desde la última partida, resetear racha
    if (elapsedMs > STREAK_SESSION_WINDOW_MS) {
      await apiClient.resetStreak(accessToken).catch((err) => {
        // Error resetting streak removed
      })
    }
  } catch (error) {
    // Silenciosamente ignorar errors al validar racha, no afecta el login
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function restoreSession() {
      const stored = authStorage.getSession()
      const storedAccessToken = stored?.c1AccessToken || stored?.accessToken
      if (!storedAccessToken) {
        if (mounted) setIsLoading(false)
        return
      }

      try {
        const hydrated = await hydrateSession(stored)
        if (!mounted) return
        authStorage.setSession(hydrated)
        setSession(hydrated)
      } catch (verifyError) {
        const refreshToken =
          stored?.c1RefreshToken ||
          stored?.refreshToken ||
          stored?.c2RefreshToken

        if (refreshToken) {
          try {
            const refreshed = await apiClient.refresh(refreshToken)
            const hydrated = await hydrateSession(buildUnifiedSession({
              ...stored,
              c1AccessToken: refreshed.accessToken,
              c1RefreshToken: refreshed.refreshToken || refreshToken,
              accessToken: refreshed.accessToken,
              refreshToken: refreshed.refreshToken || refreshToken,
              user: refreshed.user || stored.user,
            }))

            if (!mounted) return
            authStorage.setSession(hydrated)
            setSession(hydrated)
          } catch {
            authStorage.clearSession()
            if (mounted) setSession(null)
          }
        } else {
          authStorage.clearSession()
          if (mounted) setSession(null)
        }
        void verifyError
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    restoreSession()

    return () => {
      mounted = false
    }
  }, [])

  async function login(credentials) {
    // Si el usuario decide iniciar sesion otra vez, arrancamos desde un estado local limpio
    // para no mezclar tokens viejos con una autenticacion nueva tras reinicios de Docker/ROBLE.
    authStorage.clearSession()
    setSession(null)

    const response = await apiClient.login(credentials)

    if (!response?.accessToken) {
      throw new Error('Respuesta de login sin accessToken.')
    }

    const hydrated = await hydrateSession(
      buildUnifiedSession({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken || '',
        c1AccessToken: response.accessToken,
        c1RefreshToken: response.refreshToken || '',
        user: response.user || { email: credentials.email },
      }),
    )

    authStorage.setSession(hydrated)
    setSession(hydrated)

    // Valida y resetea la racha si fue hace > 28 horas desde última partida
    void validateAndResetStreakOnLogin(hydrated.accessToken)

    return hydrated
  }

  async function signup(payload) {
    const c1Data = await apiClient.signup(payload)

    if (!c1Data?.accessToken) {
      return { response: c1Data, session: null }
    }

    const hydrated = await hydrateSession(
      buildUnifiedSession({
        accessToken: c1Data.accessToken,
        refreshToken: c1Data.refreshToken || '',
        c1AccessToken: c1Data.accessToken,
        c1RefreshToken: c1Data.refreshToken || '',
        user: c1Data.user || { name: payload.name, email: payload.email },
      }),
    )

    authStorage.setSession(hydrated)
    setSession(hydrated)
    return { response: c1Data, session: hydrated }
  }

  async function logout() {
    const c1AccessToken = session?.c1AccessToken

    try {
      await Promise.allSettled([c1AccessToken ? apiClient.logout(c1AccessToken) : Promise.resolve()])
    } catch {
      // El backend puede fallar y aun asi conviene limpiar la sesion local.
    } finally {
      authStorage.clearSession()
      setSession(null)
    }
  }

  const value = {
    session,
    user: session?.user || null,
    accessToken: session?.accessToken || null,
    isAuthenticated: Boolean(session?.c1AccessToken && session?.c2AccessToken),
    isVerified: session?.user?.isVerified,
    isLoading,
    login,
    signup,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}


