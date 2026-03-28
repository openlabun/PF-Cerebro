import { useEffect, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { apiClient } from '../services/apiClient.js'

const HEARTBEAT_INTERVAL_MS = 15000
const LIVE_SESSION_STORAGE_KEY = 'cerebro_live_session_id'

function normalizeText(value, maxLength = 80) {
  return String(value || '').trim().slice(0, maxLength)
}

function normalizePath(pathname, search) {
  const path = normalizeText(`${pathname || '/'}${search || ''}`, 180)
  if (!path) return '/'
  return path.startsWith('/') ? path : `/${path}`
}

function inferModeFromPath(pathname) {
  if (/^\/pvp\/[^/]+/i.test(pathname)) return 'pvp'
  if (/^\/simulacion(?:\/|$)/i.test(pathname)) return 'pvp_lobby'
  if (/^\/torneos\/[^/]+\/jugar(?:\/|$)/i.test(pathname)) return 'torneo'
  if (pathname === '/' || pathname === '/sudoku') return 'sudoku'
  return 'browsing'
}

function getOrCreateLiveSessionId() {
  try {
    const existing = sessionStorage.getItem(LIVE_SESSION_STORAGE_KEY)
    if (existing) return existing

    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `live-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`

    sessionStorage.setItem(LIVE_SESSION_STORAGE_KEY, generated)
    return generated
  } catch {
    return `live-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
  }
}

export function useLiveHeartbeat(activity, options = {}) {
  const location = useLocation()
  const { session } = useAuth()
  const enabled = options.enabled !== false
  const accessToken = session?.c1AccessToken || session?.accessToken || ''
  const sessionId = useMemo(() => getOrCreateLiveSessionId(), [])
  const mode = activity?.mode
  const difficulty = activity?.difficulty
  const state = activity?.state
  const path = activity?.path
  const matchId = activity?.matchId
  const tournamentId = activity?.tournamentId

  const payload = useMemo(() => {
    const pathname = location.pathname || '/'

    return {
      sessionId,
      mode: normalizeText(mode, 40) || inferModeFromPath(pathname),
      difficulty: normalizeText(difficulty, 60),
      state: normalizeText(state, 40),
      path: normalizePath(path || pathname, path ? '' : location.search),
      matchId: normalizeText(matchId, 80),
      tournamentId: normalizeText(tournamentId, 80),
    }
  }, [
    difficulty,
    location.pathname,
    location.search,
    matchId,
    mode,
    path,
    sessionId,
    state,
    tournamentId,
  ])

  const payloadKey = JSON.stringify(payload)

  useEffect(() => {
    if (!enabled || !accessToken) return undefined

    let cancelled = false

    async function sendHeartbeat() {
      if (cancelled) return

      try {
        await apiClient.sendLiveHeartbeat(payload, accessToken)
      } catch {
        // La presencia live no debe bloquear la experiencia principal del usuario.
      }
    }

    void sendHeartbeat()

    const interval = window.setInterval(() => {
      void sendHeartbeat()
    }, HEARTBEAT_INTERVAL_MS)

    function handleResume() {
      void sendHeartbeat()
    }

    window.addEventListener('focus', handleResume)
    document.addEventListener('visibilitychange', handleResume)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener('focus', handleResume)
      document.removeEventListener('visibilitychange', handleResume)
    }
  }, [accessToken, enabled, payload, payloadKey])
}
