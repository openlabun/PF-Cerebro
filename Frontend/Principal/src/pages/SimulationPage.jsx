import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DifficultySelect from '../components/DifficultySelect.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { difficultyLevels, getDifficultyByKey, getHintLimit } from '../lib/sudoku.js'
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
  const [difficultyKey, setDifficultyKey] = useState(difficultyLevels[2].key)
  const difficultyOptions = difficultyLevels.map((level) => ({
    value: level.key,
    label: level.label,
  }))

  const difficulty = getDifficultyByKey(difficultyKey)
  const hintLimit = getHintLimit(difficulty)

  if (!isAuthenticated) return null

  async function handleCreateMatch() {
    if (!session?.c2AccessToken) {
      setStatus('No hay sesion activa para crear la partida.')
      return
    }

    setCreating(true)
    setStatus(`Creando match PvP en dificultad ${difficulty.label}...`)

    try {
      const created = await apiClient.createPvpMatch({ difficultyKey }, session.c2AccessToken)
      const params = new URLSearchParams()
      if (created?.inviteToken) params.set('inviteToken', created.inviteToken)
      if (created?.difficultyKey) params.set('difficultyKey', created.difficultyKey)

      navigate(`/pvp/${created._id}${params.size ? `?${params.toString()}` : ''}`, {
        replace: true,
      })
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

          <div className="difficulty-wrap">
            <label htmlFor="pvp-difficulty-select">Dificultad:</label>
            <DifficultySelect
              id="pvp-difficulty-select"
              value={difficultyKey}
              options={difficultyOptions}
              onChange={setDifficultyKey}
              disabled={creating}
            />
            <span className="difficulty-label">Tablero PvP: {difficulty.label}</span>
            <span className="difficulty-label">
              En single player esta dificultad permite {hintLimit} pista(s). En PvP las pistas siguen deshabilitadas para ambos jugadores.
            </span>
          </div>

          <button className="btn primary simulation-cta" type="button" disabled={creating} onClick={handleCreateMatch}>
            {creating ? 'Creando...' : 'Buscar rival'}
          </button>

          {status ? <p className="status">{status}</p> : null}
        </article>
      </section>
    </main>
  )
}

export default SimulationPage
