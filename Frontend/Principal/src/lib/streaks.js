import { apiClient } from '../services/apiClient.js'

export const STREAK_SESSION_WINDOW_MS = 28 * 60 * 60 * 1000

export function parseIsoDate(value) {
  const date = new Date(String(value || ''))
  if (Number.isNaN(date.getTime())) return null
  return date
}

export function getSessionDayKey(value) {
  const date = parseIsoDate(value)
  if (!date) return null
  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export async function syncSudokuStreak(accessToken, gameId, gameSession) {
  if (!accessToken || !gameId || !gameSession?.jugadoEn) {
    return null
  }

  try {
    const profileBeforeSync = await apiClient.getMyProfile(accessToken)
    const currentStreakValue = Number(profileBeforeSync?.rachaActual || 0)

    const currentPlayedAt = parseIsoDate(gameSession.jugadoEn) || new Date()
    const previousSession = await apiClient.getLatestGameSession(accessToken, gameId, {
      excludeSessionId: String(gameSession._id || ''),
      excludePlayedAt: String(gameSession.jugadoEn || ''),
    })

    const previousPlayedAt = parseIsoDate(previousSession?.jugadoEn)
    const currentSessionDayKey = getSessionDayKey(gameSession.jugadoEn)
    const previousSessionDayKey = getSessionDayKey(previousSession?.jugadoEn)
    const isSameSessionDay =
      currentSessionDayKey &&
      previousSessionDayKey &&
      currentSessionDayKey === previousSessionDayKey
    const elapsedMs = previousPlayedAt ? currentPlayedAt.getTime() - previousPlayedAt.getTime() : null
    const isWithinStreakWindow = elapsedMs !== null && elapsedMs <= STREAK_SESSION_WINDOW_MS

    const shouldReset = elapsedMs !== null && !isSameSessionDay && elapsedMs > STREAK_SESSION_WINDOW_MS
    const shouldRepairSameDayZero = Boolean(isSameSessionDay) && currentStreakValue <= 0
    const shouldIncrease =
      elapsedMs === null ||
      shouldRepairSameDayZero ||
      shouldReset ||
      (!isSameSessionDay && isWithinStreakWindow)

    if (shouldReset) {
      await apiClient.resetStreak(accessToken)
    }
    if (shouldIncrease) {
      await apiClient.increaseStreak(accessToken)
    }

    return apiClient.getMyProfile(accessToken)
  } catch (error) {
    throw error
  }
}
