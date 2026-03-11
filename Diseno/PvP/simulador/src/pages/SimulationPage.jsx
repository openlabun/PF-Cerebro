import { useAuth } from '../context/AuthContext.jsx'

function SimulationPage() {
  const { user } = useAuth()

  return (
    <main>
      <section className="games-list">
        <div className="board-card section-card simulation-card">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Simulacion</p>
              <h2>Aqui va la simulacion</h2>
            </div>
            <span className="chip">Sesion activa</span>
          </div>

          <div className="mode-detail">
            <strong>Jugador autenticado</strong>
            <p className="mode-copy">
              {user?.name || 'Usuario'} {user?.email ? `(${user.email})` : ''} ya puede entrar al
              flujo PvP protegido.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

export default SimulationPage
