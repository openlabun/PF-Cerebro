import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const featureCards = [
  {
    title: 'Sudoku base',
    description: 'Tablero completo en React con notas, pistas, pausa, progreso y validacion.',
    badge: '01',
  },
  {
    title: 'Semilla compartida',
    description: 'El generador local permite reutilizar la misma partida al conectar el flujo PvP.',
    badge: '02',
  },
  {
    title: 'Resultados',
    description: 'El puntaje local sirve como base para precision, desempates y postpartida.',
    badge: '03',
  },
]

function HomePage() {
  const { isAuthenticated, user } = useAuth()

  return (
    <main>
      <section className="hero welcome-banner">
        <div>
          <p className="eyebrow">Diseno / PvP</p>
          <h1>Sudoku React listo para PvP</h1>
          <p className="lead">
            El simulador ahora replica el Sudoku del frontend vanilla de IyR y deja lista la
            base de juego para compartir tablero, cronometro y validaciones en duelos.
          </p>

          <div className="hero-actions">
            <Link className="btn primary" to={isAuthenticated ? '/sudoku' : '/login'}>
              {isAuthenticated ? 'Jugar Sudoku' : 'Iniciar sesion'}
            </Link>
            <Link className="btn light" to="/signup">
              Crear cuenta
            </Link>
            <button className="btn ghost" type="button">
              Preparar PvP
            </button>
          </div>

          <div className="board-actions">
            <span className="chip">Sudoku</span>
            <span className="chip">Semilla comun</span>
            <span className="chip">Tiempo real</span>
            {isAuthenticated ? <span className="chip">Sesion activa: {user?.email}</span> : null}
          </div>
        </div>

        <aside className="board-card mode-visual-card pvp-card">
          <div className="mode-visual-inner">
            <span>Sudoku</span>
            <small>Base de tablero para el flujo competitivo</small>
          </div>
        </aside>
      </section>

      <section id="modos" className="games-list">
        <div className="board-card section-card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Modulos base</p>
              <h2>{isAuthenticated ? 'Sesion habilitada para probar el Sudoku base' : 'Base visual y logica del Sudoku'}</h2>
            </div>
            <span className="stat-chip">React + Vite</span>
          </div>

          <div className="card-grid">
            {featureCards.map((card) => (
              <article key={card.title} className="mode-card">
                <span className="feature-badge">{card.badge}</span>
                <h3>{card.title}</h3>
                <p>{card.description}</p>
              </article>
            ))}
          </div>

          <div className="mode-detail">
            <strong>{isAuthenticated ? `Bienvenido, ${user?.name || user?.email}` : 'Autenticacion integrada'}</strong>
            <p className="mode-copy">
              {isAuthenticated
                ? 'Tu sesion protege la ruta del Sudoku y deja lista la transicion hacia partidas PvP autenticadas.'
                : 'El frontend ya cuenta con cliente API, almacenamiento de sesion y ahora un Sudoku funcional como base del modo competitivo.'}
            </p>
          </div>
        </div>

      </section>
    </main>
  )
}

export default HomePage
