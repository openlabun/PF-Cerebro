import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { applyTheme, getNextTheme, getStoredTheme, getThemeLabel } from '../lib/theme.js'
import { canManageTournament, isAvailableOfficialTournament } from '../lib/tournaments.js'
import { apiClient } from '../services/apiClient.js'
import logoCerebroDark from '../assets/logo-cerebro.png'
import logoCerebroLight from '../assets/logo-cerebro-light.png'

const TOURNAMENTS_UPDATED_EVENT = 'cerebro:tournaments-updated'

function Header() {
  const navigate = useNavigate()
  const { accessToken, isAuthenticated, isLoading, user, logout } = useAuth()
  const [theme, setTheme] = useState(() => getStoredTheme())
  const [hasAvailableOfficialTournament, setHasAvailableOfficialTournament] = useState(false)
  const logoCerebro = theme === 'dark' ? logoCerebroDark : logoCerebroLight

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    let mounted = true

    async function loadTournamentSignal() {
      if (isLoading) return

      try {
        const payload = accessToken
          ? await apiClient.getTournaments(accessToken)
          : await apiClient.getPublicTournaments()
        const nextHasAvailableOfficialTournament = (payload || []).some(
          (tournament) =>
            isAvailableOfficialTournament(tournament) &&
            tournament?.inscrito !== true &&
            !canManageTournament(tournament, user),
        )

        if (mounted) {
          setHasAvailableOfficialTournament(nextHasAvailableOfficialTournament)
        }
      } catch {
        if (mounted) {
          setHasAvailableOfficialTournament(false)
        }
      }
    }

    function handleTournamentSignalRefresh() {
      loadTournamentSignal()
    }

    loadTournamentSignal()
    window.addEventListener(TOURNAMENTS_UPDATED_EVENT, handleTournamentSignalRefresh)

    return () => {
      mounted = false
      window.removeEventListener(TOURNAMENTS_UPDATED_EVENT, handleTournamentSignalRefresh)
    }
  }, [accessToken, isLoading, user?.id, user?.sub])

  async function handleSessionAction() {
    if (!isAuthenticated) {
      navigate('/login')
      return
    }

    await logout()
    navigate('/')
  }

  return (
    <header className="topbar">
      <NavLink className="logo" to="/">
        <img className="logo-mark" src={logoCerebro} alt="" />
        <span className="logo-word">
          Cere<span>bro</span>
        </span>
      </NavLink>
      <nav>
        <NavLink
          to="/"
          end
          className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}
        >
          Jugar Sudoku
        </NavLink>
        <NavLink
          to="/simulacion"
          className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}
        >
          PvP
        </NavLink>
        <NavLink
          to="/torneos"
          className={({ isActive }) =>
            `nav-btn${isActive ? ' active' : ''}${
              hasAvailableOfficialTournament ? ' nav-btn--tournament-signal' : ''
            }`
          }
        >
          Torneos
        </NavLink>
      </nav>
      <div className="session-actions">
        <button
          id="theme-toggle"
          className="btn ghost theme-toggle-btn"
          type="button"
          onClick={() => setTheme((currentTheme) => getNextTheme(currentTheme))}
        >
          Tema: {getThemeLabel(theme)}
        </button>
        {isAuthenticated && user?.name ? (
          <>
            <NavLink to="/profile" className="nav-btn session-btn">
              Mi perfil
            </NavLink>
            <span className="session-pill">{user.name}</span>
          </>
        ) : null}
        <button
          className={isAuthenticated ? 'nav-btn session-btn' : 'btn ghost theme-toggle-btn session-btn'}
          onClick={handleSessionAction}
          type="button"
        >
          {isAuthenticated ? 'Cerrar sesión' : 'Iniciar sesión'}
        </button>
      </div>
    </header>
  )
}

export default Header
