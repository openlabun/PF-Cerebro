import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { apiClient } from '../services/apiClient.js'
import { ACHIEVEMENT_ID_KEY_MAP } from '../lib/achievementIds.js'
import ProfileCard from '../components/ProfileCard.jsx'
import '../styles/profile.css'

const DEFAULT_PROFILE_NAME = 'Invitado#0001'
const GAME_ID_SUDOKU = 'uVsB-k2rjora'

async function loadAchievementsFromRemote(accessToken) {
  try {
    const myAchievements = await apiClient.getMyAchievements(accessToken)
    if (!Array.isArray(myAchievements)) return new Set()

    const unlockedKeys = myAchievements
      .map((item) => ACHIEVEMENT_ID_KEY_MAP[String(item?.logroId || '').trim()])
      .filter(Boolean)

    return new Set(unlockedKeys)
  } catch {
    return new Set()
  }
}

const DEFAULT_PROFILE_MODE_STATS = {
  sudoku: [
    'Partidas jugadas: -',
    'Elo: -',
    'Liga: -',
  ],
  torneos: [
    'Torneos jugados: -',
    'Participaciones: -',
    'Mejor puntaje: -',
    'Puntaje promedio: -',
  ],
  pvp: [
    'Partidas PvP: -',
    'Victorias: - | Derrotas: -',
    'ELO PvP: -',
    'Win rate: -',
  ],
}

function getUnlockedKeysByRules(partidasJugadas = 0, elo = 0) {
  const unlocked = []
  if (partidasJugadas >= 1) unlocked.push('first-game')
  if (partidasJugadas >= 5) unlocked.push('five-games')
  if (partidasJugadas >= 10) unlocked.push('ten-games')
  if (elo > 500) unlocked.push('score-over-500')
  return unlocked
}

function getFrameByElo(elo = 0) {
  if (elo >= 301) return 'frame-platinum'
  if (elo >= 201) return 'frame-gold'
  if (elo >= 101) return 'frame-silver'
  if (elo >= 0) return 'frame-bronze'
  return 'frame-royal'
}

function getProfileDisplayName(userObj) {
  if (!userObj) return DEFAULT_PROFILE_NAME
  if (userObj.name) return userObj.name
  if (userObj.email) return String(userObj.email).split('@')[0]
  const rawId = userObj.id || userObj.sub
  if (!rawId) return DEFAULT_PROFILE_NAME
  return `Jugador#${String(rawId).slice(-4)}`
}

function ProfilePage() {
  const { isAuthenticated, user, accessToken } = useAuth()
  const currentUserId = String(user?.sub || user?.id || '').trim()

  const [profileData, setProfileData] = useState({
    name: DEFAULT_PROFILE_NAME,
    nivel: 47,
    experiencia: 680,
    rachaActual: 0,
  })
  const [profileModeStats, setProfileModeStats] = useState({ ...DEFAULT_PROFILE_MODE_STATS })
  const [unlockedBadges, setUnlockedBadges] = useState(new Set())
  const [selectedFrame, setSelectedFrame] = useState('frame-royal')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setProfileData({
        name: DEFAULT_PROFILE_NAME,
        nivel: 47,
        experiencia: 680,
        rachaActual: 0,
      })
      setProfileModeStats({ ...DEFAULT_PROFILE_MODE_STATS })
      return
    }

    const displayName = getProfileDisplayName(user)

    setProfileData((prev) => ({
      ...prev,
      name: displayName,
      nivel: user.nivel ?? prev.nivel ?? 47,
      experiencia: user.experiencia ?? prev.experiencia ?? 680,
      rachaActual: prev.rachaActual || Number(user.rachaActual ?? 0),
    }))
  }, [isAuthenticated, user])

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      setUnlockedBadges(new Set())
      return
    }

    loadRemoteAchievements()
  }, [isAuthenticated, accessToken])

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      return
    }

    loadProfileDataFromApi()
  }, [isAuthenticated, accessToken])

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      return
    }

    loadSudokuStats()
  }, [isAuthenticated, accessToken])

  useEffect(() => {
    if (!isAuthenticated || !accessToken || !currentUserId) {
      return
    }

    loadTournamentStats()
    loadPvpStats()
  }, [isAuthenticated, accessToken, currentUserId])

  useEffect(() => {
    const onStatsUpdate = () => {
      if (!isAuthenticated || !accessToken) return

      loadProfileDataFromApi()
      loadSudokuStats()
      loadTournamentStats()
      loadPvpStats()
      loadRemoteAchievements()
    }

    window.addEventListener('sudokuStatsUpdated', onStatsUpdate)
    return () => window.removeEventListener('sudokuStatsUpdated', onStatsUpdate)
  }, [isAuthenticated, accessToken, currentUserId])

  const loadProfileDataFromApi = async () => {
    try {
      const perfil = await apiClient.getMyProfile(accessToken).catch(() => null)

      if (perfil) {
        setProfileData((prev) => ({
          ...prev,
          nivel: perfil.nivel ?? prev.nivel,
          experiencia: perfil.experiencia ?? prev.experiencia,
          rachaActual: perfil.rachaActual ?? prev.rachaActual,
        }))
      }
    } catch {
      // Keep current values on failure.
    }
  }

  const loadRemoteAchievements = async () => {
    const remoteUnlocked = await loadAchievementsFromRemote(accessToken)
    setUnlockedBadges(remoteUnlocked)
  }

  const loadSudokuStats = async () => {
    setLoading(true)
    try {
      const stats = await apiClient.getMyGameStats(accessToken, GAME_ID_SUDOKU).catch(() => null)

      if (stats) {
        const elo = Number(stats.elo ?? 0)
        const partidasJugadas = Number(stats.partidasJugadas ?? 0)
        const liga =
          elo >= 301 && elo <= 400
            ? 'Platino'
            : elo >= 201 && elo <= 300
              ? 'Oro'
              : elo >= 101 && elo <= 200
                ? 'Plata'
                : elo >= 0 && elo <= 100
                  ? 'Bronce'
                  : '-'

        const frame = getFrameByElo(elo)
        const localUnlocked = new Set(getUnlockedKeysByRules(partidasJugadas, elo))

        setUnlockedBadges((prev) => new Set([...prev, ...localUnlocked]))

        setProfileModeStats((prev) => ({
          ...prev,
          sudoku: [
            `Partidas jugadas: ${partidasJugadas}`,
            `Elo: ${elo}`,
            `Liga: ${liga}`,
          ],
        }))

        setSelectedFrame(frame)
      }
    } catch {
      // Keep current values on failure.
    } finally {
      setLoading(false)
    }
  }

  const loadTournamentStats = async () => {
    if (!currentUserId) return

    try {
      const rows = await apiClient
        .getTournamentResultsByUser(currentUserId, accessToken)
        .catch(() => [])

      const results = Array.isArray(rows) ? rows : []
      const uniqueTournamentCount = new Set(
        results.map((item) => String(item?.torneoId || '').trim()).filter(Boolean),
      ).size
      const participaciones = results.length
      const scores = results
        .map((item) => Number(item?.puntaje))
        .filter((value) => Number.isFinite(value))

      const bestScore = scores.length ? Math.max(...scores) : null
      const averageScore = scores.length
        ? Math.round(scores.reduce((acc, value) => acc + value, 0) / scores.length)
        : null

      setProfileModeStats((prev) => ({
        ...prev,
        torneos: [
          `Torneos jugados: ${uniqueTournamentCount}`,
          `Participaciones: ${participaciones}`,
          `Mejor puntaje: ${bestScore ?? '-'}`,
          `Puntaje promedio: ${averageScore ?? '-'}`,
        ],
      }))
    } catch {
      setProfileModeStats((prev) => ({
        ...prev,
        torneos: [...DEFAULT_PROFILE_MODE_STATS.torneos],
      }))
    }
  }

  const loadPvpStats = async () => {
    try {
      const ranking = await apiClient.getMyPvpRanking(accessToken).catch(() => null)
      const elo = Number(ranking?.elo)
      const victorias = Number(ranking?.victorias)
      const derrotas = Number(ranking?.derrotas)

      if (!Number.isFinite(elo) || !Number.isFinite(victorias) || !Number.isFinite(derrotas)) {
        setProfileModeStats((prev) => ({
          ...prev,
          pvp: [...DEFAULT_PROFILE_MODE_STATS.pvp],
        }))
        return
      }

      const total = Math.max(0, victorias + derrotas)
      const winRate = total > 0 ? `${((victorias / total) * 100).toFixed(1)}%` : '-'

      setProfileModeStats((prev) => ({
        ...prev,
        pvp: [
          `Partidas PvP: ${total}`,
          `Victorias: ${victorias} | Derrotas: ${derrotas}`,
          `ELO PvP: ${elo}`,
          `Win rate: ${winRate}`,
        ],
      }))
    } catch {
      setProfileModeStats((prev) => ({
        ...prev,
        pvp: [...DEFAULT_PROFILE_MODE_STATS.pvp],
      }))
    }
  }

  return (
    <main className="profile-page">
      <div className="game-header">
        <h2>Perfil de usuario</h2>
      </div>

      <ProfileCard
        profileData={profileData}
        profileModeStats={profileModeStats}
        isAuthenticated={isAuthenticated}
        loading={loading}
        unlockedBadges={unlockedBadges}
        selectedFrame={selectedFrame}
      />
    </main>
  )
}

export default ProfilePage
