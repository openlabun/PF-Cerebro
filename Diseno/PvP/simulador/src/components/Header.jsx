import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function Header() {
  const navigate = useNavigate()
  const { isAuthenticated, user, logout } = useAuth()

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
        Cerebro<span>PvP</span>
      </NavLink>
      <nav>
        <NavLink
          to="/"
          end
          className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}
        >
          Inicio
        </NavLink>
        <NavLink
          to="/simulacion"
          className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}
        >
          Simulacion
        </NavLink>
        <NavLink
          to="/sudoku"
          className={({ isActive }) => `nav-btn${isActive ? ' active' : ''}`}
        >
          Sudoku
        </NavLink>
      </nav>
      <div className="session-actions">
        {isAuthenticated && user?.name ? (
          <>
            <NavLink to="/profile" className="nav-btn session-btn">
              Mi perfil
            </NavLink>
            <span className="session-pill">{user.name}</span>
          </>
        ) : null}
        <button className="nav-btn session-btn" onClick={handleSessionAction} type="button">
          {isAuthenticated ? 'Cerrar sesion' : 'Iniciar sesion'}
        </button>
      </div>
    </header>
  )
}

export default Header
