import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const featureCards = [
  {
    title: 'Salas PvP',
    description: 'Crea una base para listar partidas activas, privadas o por matchmaking.',
    badge: '01',
  },
  {
    title: 'Estado de partida',
    description: 'Reserva este espacio para sincronizar turnos, cronometro y tablero.',
    badge: '02',
  },
  {
    title: 'Resultados',
    description: 'Prepara una vista ligera para ranking, revancha y resumen del duelo.',
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
          <h1>Simulador React + Vite</h1>
          <p className="lead">
            Base visual alineada con IyR para mantener consistencia grafica en los frontends
            de la aplicacion.
          </p>

          <div className="hero-actions">
            <Link className="btn primary" to={isAuthenticated ? '/simulacion' : '/login'}>
              {isAuthenticated ? 'Entrar al simulador' : 'Iniciar sesion'}
            </Link>
            <Link className="btn light" to="/signup">
              Crear cuenta
            </Link>
            <button className="btn ghost" type="button">
              Configurar duelo
            </button>
          </div>

          <div className="board-actions">
            <span className="chip">Matchmaking</span>
            <span className="chip">1v1</span>
            <span className="chip">Tiempo real</span>
            {isAuthenticated ? <span className="chip">Sesion activa: {user?.email}</span> : null}
          </div>
        </div>

        <aside className="board-card mode-visual-card pvp-card">
          <div className="mode-visual-inner">
            <span>PvP</span>
            <small>Frontend listo para flujo competitivo</small>
          </div>
        </aside>
      </section>

      <section id="modos" className="games-list">
        <div className="board-card section-card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Modulos base</p>
              <h2>{isAuthenticated ? 'Sesion habilitada para flujo PvP' : 'Bloques iniciales del simulador'}</h2>
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
                ? 'Tu sesion se guarda en localStorage y la ruta de simulacion queda protegida por token.'
                : 'El simulador ya cuenta con cliente API, almacenamiento de sesion y vistas dedicadas para login y registro.'}
            </p>
          </div>
        </div>

      </section>
    </main>
  )
}

export default HomePage
