import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { apiClient } from '../services/apiClient.js'
import ProfileCard from '../components/ProfileCard.jsx'
import '../styles/profile.css'

const DEFAULT_PROFILE_NAME = 'Invitado#0001'
const DEFAULT_PROFILE_TITLE = 'Titulo: "El dios de los números"'
const GAME_ID_SUDOKU = 'uVsB-k2rjora'

const ACHIEVEMENT_ID_KEY_MAP = {
  'jNVlXBxVZ4Ik': 'first-game',
  'eKdjK4OKd_qV': 'five-games',
  '_8uXFa1YZV-d': 'ten-games',
  'pLHLX9-29oIY': 'score-over-500',
}

async function loadAchievementsFromRemote(accessToken) {
  try {
    const catalog = await apiClient.getAchievements(accessToken)
    const myAchievements = await apiClient.getMyAchievements(accessToken)
    if (!Array.isArray(catalog) || !Array.isArray(myAchievements)) return new Set()

    const byId = new Map()
    catalog.forEach((item) => {
      const logroId = String(item?._id || '')
      if (!logroId) return

      const key = ACHIEVEMENT_ID_KEY_MAP[logroId]
      if (!key) return

      byId.set(logroId, key)
    })

    const unlockedKeys = myAchievements
      .map((item) => byId.get(String(item?.logroId || '')))
      .filter(Boolean)

    return new Set(unlockedKeys)
  } catch (error) {
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
    'Torneos jugados: 12',
    'Top 3 alcanzado: 5 veces',
    'Mejor posicion: #2',
    'Puntaje promedio: 1,240',
  ],
  pvp: [
    'Partidas PvP: 33',
    'Victorias: 20 · Derrotas: 13',
    'Racha maxima: 6 victorias',
    'Precision en duelos: 90%',
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
  const { isAuthenticated, user, session, accessToken } = useAuth()
  const [profileData, setProfileData] = useState({
    name: DEFAULT_PROFILE_NAME,
    title: DEFAULT_PROFILE_TITLE,
    nivel: 47,
    experiencia: 680,
    rachaActual: 0,
  })
  const [profileModeStats, setProfileModeStats] = useState({ ...DEFAULT_PROFILE_MODE_STATS })
  const [unlockedBadges, setUnlockedBadges] = useState(new Set())
  const [selectedFrame, setSelectedFrame] = useState('frame-royal')
  const [loading, setLoading] = useState(false)

  // Sincronizar datos de identidad desde la sesión y cargar datos completos
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setProfileData({
        name: DEFAULT_PROFILE_NAME,
        title: DEFAULT_PROFILE_TITLE,
        nivel: 47,
        experiencia: 680,
        rachaActual: 0,
      })
      setProfileModeStats({ ...DEFAULT_PROFILE_MODE_STATS })
      return
    }

    // Sincronizar los datos básicos del usuario desde la sesión
    const displayName = getProfileDisplayName(user)
    const tituloTexto = user.tituloActivoTexto || session?.profile?.tituloActivoTexto || `Correo: ${user.email || 'usuario'}`

    setProfileData((prev) => ({
      ...prev,
      name: displayName,
      title: `Titulo: ${tituloTexto}`,
      nivel: user.nivel ?? prev.nivel ?? 47,
      experiencia: user.experiencia ?? prev.experiencia ?? 680,
      // Evita pisar una racha ya refrescada desde API con un valor stale de la sesion.
      rachaActual: prev.rachaActual || Number(user.rachaActual ?? 0),
    }))
  }, [isAuthenticated, user, session])

  // Cargar logros desde la base de datos al iniciar sesión
  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      return
    }

    loadRemoteAchievements()
  }, [isAuthenticated, accessToken])

  // Cargar datos completos del perfil desde la API (nivel/experiencia/racha)
  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      return
    }

    loadProfileDataFromApi()
  }, [isAuthenticated, accessToken])

  // Cargar estadísticas del juego
  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      return
    }

    loadSudokuStats()
  }, [isAuthenticated, accessToken])

  // Escuchar evento post-partida PvP para recargar datos de perfil
  useEffect(() => {
    const onStatsUpdate = () => {
      if (!isAuthenticated || !accessToken) return

      loadProfileDataFromApi()
      loadSudokuStats()
      loadRemoteAchievements()
    }

    window.addEventListener('sudokuStatsUpdated', onStatsUpdate)
    return () => window.removeEventListener('sudokuStatsUpdated', onStatsUpdate)
  }, [isAuthenticated, accessToken])

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
    } catch (error) {
      // Error loading profile removed
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
        const elo = stats.elo ?? 0
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
    } catch (error) {
      // Error loading sudoku stats removed
    } finally {
      setLoading(false)
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
