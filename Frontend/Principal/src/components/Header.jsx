import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { applyTheme, getNextTheme, getStoredTheme, getThemeLabel } from '../lib/theme.js'
import logoCerebroDark from '../assets/logo-cerebro.png'
import logoCerebroLight from '../assets/logo-cerebro-light.png'

function Header() {
  const navigate = useNavigate()
  const { isAuthenticated, user, logout } = useAuth()
  const [theme, setTheme] = useState(() => getStoredTheme())
  const logoCerebro = theme === 'dark' ? logoCerebroDark : logoCerebroLight

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

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
          className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}
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
