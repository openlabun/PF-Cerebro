import { createContext, useContext, useEffect, useState } from 'react'
import { apiClient, authStorage } from '../services/apiClient.js'

const AuthContext = createContext(null)

function normalizeSessionUser(sessionUser = {}, verifiedUser = {}) {
  const fallbackEmail = verifiedUser.email || sessionUser.email || ''
  const fallbackName = sessionUser.name || (fallbackEmail ? fallbackEmail.split('@')[0] : '')

  return {
    ...sessionUser,
    id: sessionUser.id || verifiedUser.sub || null,
    sub: verifiedUser.sub || sessionUser.sub || sessionUser.id || null,
    email: fallbackEmail,
    name: sessionUser.name || fallbackName,
  }
}

async function hydrateSession(session) {
  if (!session?.accessToken) {
    throw new Error('Session without access token')
  }

  const verification = await apiClient.verifyToken(session.accessToken)
  const verifiedUser = verification?.user || {}

  return {
    ...session,
    user: normalizeSessionUser(session.user, verifiedUser),
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    async function restoreSession() {
      const stored = authStorage.getSession()
      if (!stored?.accessToken) {
        if (mounted) setIsLoading(false)
        return
      }

      try {
        const hydrated = await hydrateSession(stored)
        if (!mounted) return
        authStorage.setSession(hydrated)
        setSession(hydrated)
      } catch (verifyError) {
        if (stored?.refreshToken) {
          try {
            const refreshed = await apiClient.refresh(stored.refreshToken)
            const hydrated = await hydrateSession({
              ...stored,
              accessToken: refreshed.accessToken,
              refreshToken: refreshed.refreshToken || stored.refreshToken,
              user: refreshed.user || stored.user,
            })

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
    const response = await apiClient.login(credentials)

    if (!response?.accessToken) {
      throw new Error('Respuesta de login sin accessToken.')
    }

    const hydrated = await hydrateSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken || '',
      user: response.user || { email: credentials.email },
    })

    authStorage.setSession(hydrated)
    setSession(hydrated)
    return hydrated
  }

  async function signup(payload) {
    const response = await apiClient.signup(payload)

    if (!response?.accessToken) {
      return { response, session: null }
    }

    const hydrated = await hydrateSession({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken || '',
      user: response.user || { name: payload.name, email: payload.email },
    })

    authStorage.setSession(hydrated)
    setSession(hydrated)
    return { response, session: hydrated }
  }

  async function logout() {
    const accessToken = session?.accessToken

    try {
      if (accessToken) {
        await apiClient.logout(accessToken)
      }
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
    isAuthenticated: Boolean(session?.accessToken),
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
