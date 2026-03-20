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

function deriveDisplayName(email = '') {
  const normalized = String(email || '').trim()
  return normalized.includes('@') ? normalized.split('@')[0] : normalized || 'Jugador PvP'
}

async function loginPvpWithFallback(credentials) {
  try {
    return await apiClient.pvpLogin(credentials)
  } catch (error) {
    const message = String(error?.message || '').toLowerCase()
    const shouldProvision =
      message.includes('no existe') ||
      message.includes('not found') ||
      message.includes('usuario') ||
      message.includes('user')

    if (!shouldProvision) throw error

    await apiClient.pvpSignupDirect({
      email: credentials.email,
      password: credentials.password,
      name: deriveDisplayName(credentials.email),
    })
    return apiClient.pvpLogin(credentials)
  }
}

async function hydrateSession(session) {
  if (!session?.c1AccessToken || !session?.c2AccessToken) {
    throw new Error('Session without access token')
  }

  const [verificationC1, verificationC2] = await Promise.all([
    apiClient.verifyToken(session.c1AccessToken),
    apiClient.pvpVerifyToken(session.c2AccessToken),
  ])
  const verifiedUser = verificationC1?.user || verificationC2?.user || {}

  return {
    ...session,
    accessToken: session.c1AccessToken,
    refreshToken: session.c1RefreshToken || '',
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
      if (!stored?.c1AccessToken || !stored?.c2AccessToken) {
        if (mounted) setIsLoading(false)
        return
      }

      try {
        const hydrated = await hydrateSession(stored)
        if (!mounted) return
        authStorage.setSession(hydrated)
        setSession(hydrated)
      } catch (verifyError) {
        if (stored?.c1RefreshToken && stored?.c2RefreshToken) {
          try {
            const [refreshedC1, refreshedC2] = await Promise.all([
              apiClient.refresh(stored.c1RefreshToken),
              apiClient.pvpRefresh(stored.c2RefreshToken),
            ])
            const hydrated = await hydrateSession({
              ...stored,
              c1AccessToken: refreshedC1.accessToken,
              c1RefreshToken: refreshedC1.refreshToken || stored.c1RefreshToken,
              c2AccessToken: refreshedC2.accessToken,
              c2RefreshToken: refreshedC2.refreshToken || stored.c2RefreshToken,
              accessToken: refreshedC1.accessToken,
              refreshToken: refreshedC1.refreshToken || stored.c1RefreshToken,
              user: refreshedC1.user || refreshedC2.user || stored.user,
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
    const [responseC1, responseC2] = await Promise.all([
      apiClient.login(credentials),
      loginPvpWithFallback(credentials),
    ])

    if (!responseC1?.accessToken || !responseC2?.accessToken) {
      throw new Error('Respuesta de login sin accessToken.')
    }

    const hydrated = await hydrateSession({
      accessToken: responseC1.accessToken,
      refreshToken: responseC1.refreshToken || '',
      c1AccessToken: responseC1.accessToken,
      c1RefreshToken: responseC1.refreshToken || '',
      c2AccessToken: responseC2.accessToken,
      c2RefreshToken: responseC2.refreshToken || '',
      user: responseC1.user || responseC2.user || { email: credentials.email },
    })

    authStorage.setSession(hydrated)
    setSession(hydrated)
    return hydrated
  }

  async function signup(payload) {
    const [responseC1, responseC2] = await Promise.allSettled([
      apiClient.signup(payload),
      apiClient.pvpSignupDirect(payload),
    ])

    if (responseC1.status === 'rejected') {
      throw responseC1.reason
    }

    const c1Data = responseC1.value
    if (responseC2.status === 'rejected') {
      const message = String(responseC2.reason?.message || '').toLowerCase()
      const alreadyExists = message.includes('ya') && (message.includes('existe') || message.includes('registrado'))
      if (!alreadyExists) throw responseC2.reason
    }

    if (!c1Data?.accessToken) {
      return { response: c1Data, session: null }
    }

    const pvpLogin = await apiClient.pvpLogin({
      email: payload.email,
      password: payload.password,
    })
    const hydrated = await hydrateSession({
      accessToken: c1Data.accessToken,
      refreshToken: c1Data.refreshToken || '',
      c1AccessToken: c1Data.accessToken,
      c1RefreshToken: c1Data.refreshToken || '',
      c2AccessToken: pvpLogin.accessToken,
      c2RefreshToken: pvpLogin.refreshToken || '',
      user: c1Data.user || { name: payload.name, email: payload.email },
    })

    authStorage.setSession(hydrated)
    setSession(hydrated)
    return { response: c1Data, session: hydrated }
  }

  async function logout() {
    const c1AccessToken = session?.c1AccessToken
    const c2AccessToken = session?.c2AccessToken

    try {
      await Promise.allSettled([
        c1AccessToken ? apiClient.logout(c1AccessToken) : Promise.resolve(),
        c2AccessToken ? apiClient.pvpLogout(c2AccessToken) : Promise.resolve(),
      ])
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


