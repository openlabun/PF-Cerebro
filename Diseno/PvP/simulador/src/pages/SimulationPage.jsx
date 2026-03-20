import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { apiClient } from '../services/apiClient.js'

const pvpFeatures = [
  'Emparejamiento por nivel.',
  'Chat rapido con mensajes predefinidos.',
  'Modo revancha al finalizar la partida.',
]

function SimulationPage() {
  const navigate = useNavigate()
  const { isAuthenticated, session } = useAuth()
  const [creating, setCreating] = useState(false)
  const [status, setStatus] = useState('')

  if (!isAuthenticated) return null

  function buildAutomaticTournamentPayload() {
    const now = new Date()
    const start = new Date(now.getTime() - 60 * 60 * 1000).toISOString()
    const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const stamp = now.toISOString().replace(/[^\d]/g, '').slice(0, 14)

    return {
      nombre: `Torneo PvP ${stamp}`,
      descripcion: 'Torneo PvP generado automaticamente desde el simulador React.',
      esPublico: true,
      tipo: 'PVP',
      fechaInicio: start,
      fechaFin: end,
      recurrencia: 'NINGUNA',
    }
  }

  function isAlreadyJoinedError(error) {
    const message = String(error?.message || '').toLowerCase()
    return message.includes('ya') && (message.includes('inscrito') || message.includes('registrado') || message.includes('unido'))
  }

  async function ensureTournamentJoined(tournamentId, accessToken) {
    const participants = await apiClient.getTournamentParticipants(tournamentId, accessToken)
    const currentUserId = session?.user?.sub || session?.user?.id
    const alreadyJoined = (participants || []).some((participant) => participant?.usuarioId === currentUserId)
    if (alreadyJoined) return

    try {
      await apiClient.joinTournament(tournamentId, accessToken)
    } catch (error) {
      if (!isAlreadyJoinedError(error)) throw error
    }
  }

  async function handleCreateMatch() {
    if (!session?.c1AccessToken || !session?.c2AccessToken) {
      setStatus('No hay sesion activa para crear la partida.')
      return
    }

    setCreating(true)
    setStatus('Asignando torneo y creando match PvP...')

    try {
      const tournament = await apiClient.createTournament(buildAutomaticTournamentPayload(), session.c1AccessToken)
      await apiClient.updateTournamentState(tournament._id, { estado: 'PROGRAMADO' }, session.c1AccessToken)
      await apiClient.getTournament(tournament._id, session.c1AccessToken)
      await ensureTournamentJoined(tournament._id, session.c1AccessToken)

      const created = await apiClient.createPvpMatch(
        {
          torneoId: tournament._id,
          tokenC1: session.c1AccessToken,
        },
        session.c2AccessToken,
      )

      navigate(`/pvp/${created._id}?torneoId=${encodeURIComponent(tournament._id)}`, { replace: true })
    } catch (error) {
      setStatus(error.message || 'No se pudo crear el match.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <main>
      <section className="games-list">
        <article className="board-card section-card simulation-card simulation-card--pvp">
          <p className="simulation-matchup">1 vs 1</p>

          <div className="simulation-copy">
            <h1 className="simulation-title">Reta a otro jugador</h1>
            <p className="simulation-description">
              Ambos resuelven el mismo sudoku. Gana quien termine primero con mejor precision.
            </p>
          </div>

          <ul className="simulation-feature-list">
            {pvpFeatures.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>

          <button className="btn primary simulation-cta" type="button" disabled={creating} onClick={handleCreateMatch}>
            {creating ? 'Asignando...' : 'Buscar rival'}
          </button>

          {status ? <p className="status">{status}</p> : null}
        </article>
      </section>
    </main>
  )
}

export default SimulationPage
