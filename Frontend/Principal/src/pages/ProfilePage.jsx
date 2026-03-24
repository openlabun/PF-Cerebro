import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { apiClient } from '../services/apiClient.js'
import ProfileCard from '../components/ProfileCard.jsx'
import '../styles/profile.css'

const DEFAULT_PROFILE_NAME = 'Invitado#0001'
const DEFAULT_PROFILE_TITLE = 'Titulo: "El dios de los números"'
const GAME_ID_SUDOKU = 'uVsB-k2rjora'

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

    setProfileData({
      name: displayName,
      title: `Titulo: ${tituloTexto}`,
      nivel: user.nivel ?? 47,
      experiencia: user.experiencia ?? 680,
      rachaActual: user.rachaActual ?? 0,
    })
  }, [isAuthenticated, user, session])

  // Cargar datos completos del perfil desde la API
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
      console.warn('Error cargando perfil desde API:', error)
    }
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
        const unlocked = new Set(getUnlockedKeysByRules(partidasJugadas, elo))

        setProfileModeStats((prev) => ({
          ...prev,
          sudoku: [
            `Partidas jugadas: ${partidasJugadas}`,
            `Elo: ${elo}`,
            `Liga: ${liga}`,
          ],
        }))

        setUnlockedBadges(unlocked)
        setSelectedFrame(frame)
      }
    } catch (error) {
      console.warn('Fallo cargando estadísticas de Sudoku:', error)
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
