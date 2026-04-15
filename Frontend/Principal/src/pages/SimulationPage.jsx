import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DifficultySelect from '../components/DifficultySelect.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useLiveHeartbeat } from '../hooks/useLiveHeartbeat.js'
import { difficultyLevels, getDifficultyByKey, getHintLimit } from '../lib/sudoku.js'
import { apiClient } from '../services/apiClient.js'

const pvpFeatures = [
  'El host crea una sala y recibe un código corto.',
  'El invitado se une escribiendo ese código desde esta misma pantalla.',
  'Ambos resuelven el mismo sudoku y gana quien termine primero.',
]

function SimulationPage() {
  const navigate = useNavigate()
  const { isAuthenticated, session, user } = useAuth()
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [status, setStatus] = useState('')
  const [difficultyKey, setDifficultyKey] = useState(difficultyLevels[2].key)
  const [joinCode, setJoinCode] = useState('')
  const difficultyOptions = difficultyLevels.map((level) => ({
    value: level.key,
    label: level.label,
  }))

  const difficulty = getDifficultyByKey(difficultyKey)
  const hintLimit = getHintLimit(difficulty)
  const displayName = String(user?.name || user?.email || 'Jugador').trim() || 'Jugador'
  const normalizedJoinCode = joinCode.replace(/\D/g, '').slice(0, 5)

  useLiveHeartbeat(
    {
      mode: 'pvp_lobby',
      difficulty: difficulty.label,
      state: creating ? 'creating' : joining ? 'joining' : 'ready',
    },
    { enabled: isAuthenticated },
  )

  if (!isAuthenticated) return null

  async function handleCreateMatch() {
    if (!session?.c2AccessToken) {
      setStatus('No hay sesión activa para crear la partida.')
      return
    }

    setCreating(true)
    setStatus(`Creando match PvP en dificultad ${difficulty.label}...`)

    try {
      const created = await apiClient.createPvpMatch(
        { difficultyKey, displayName },
        session.c2AccessToken,
      )
      navigate(`/pvp/${created._id}`, { replace: true })
    } catch (error) {
      setStatus(error.message || 'No se pudo crear el match.')
    } finally {
      setCreating(false)
    }
  }

  async function handleJoinByCode() {
    if (!session?.c2AccessToken) {
      setStatus('No hay sesión activa para unirte a la partida.')
      return
    }

    if (normalizedJoinCode.length < 4) {
      setStatus('Ingresa un código PvP válido de 4 o 5 dígitos.')
      return
    }

    setJoining(true)
    setStatus(`Buscando la sala ${normalizedJoinCode}...`)

    try {
      const joined = await apiClient.joinPvpMatchByCode(
        { joinCode: normalizedJoinCode, displayName },
        session.c2AccessToken,
      )
      navigate(`/pvp/${joined._id}`, { replace: true })
    } catch (error) {
      setStatus(error.message || 'No se pudo encontrar una partida con ese código.')
    } finally {
      setJoining(false)
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
              Ambos resuelven el mismo sudoku. Gana quien termine primero con mejor precisión.
            </p>
          </div>

          <ul className="simulation-feature-list">
            {pvpFeatures.map((feature) => (
              <li key={feature}>{feature}</li>
            ))}
          </ul>

          <div className="simulation-pvp-layout">
            <section className="simulation-pvp-panel">
              <p className="section-kicker">Crear sala</p>
              <h2 className="simulation-subtitle">Tu tablero, tu código</h2>
              <div className="difficulty-wrap">
                <label htmlFor="pvp-difficulty-select">Dificultad:</label>
                <DifficultySelect
                  id="pvp-difficulty-select"
                  value={difficultyKey}
                  options={difficultyOptions}
                  onChange={setDifficultyKey}
                  disabled={creating || joining}
                />
                <span className="difficulty-label">Tablero PvP: {difficulty.label}</span>
                <span className="difficulty-label">
                  En single player esta dificultad permite {hintLimit} pista(s). En PvP las pistas siguen deshabilitadas para ambos jugadores.
                </span>
              </div>

              <button
                className="btn primary simulation-cta"
                type="button"
                disabled={creating || joining}
                onClick={handleCreateMatch}
              >
                {creating ? 'Creando...' : 'Crear partida'}
              </button>
            </section>

            <section className="simulation-pvp-panel simulation-pvp-panel--join">
              <p className="section-kicker">Unirse rápido</p>
              <h2 className="simulation-subtitle">Ingresa el código del host</h2>
              <p className="simulation-panel-copy">
                Escribe el código que te compartieron para unirte a la partida.
              </p>

              <label className="simulation-field" htmlFor="pvp-join-code">
                <span>Código PvP</span>
                <input
                  id="pvp-join-code"
                  className="simulation-code-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="48217"
                  maxLength={5}
                  value={normalizedJoinCode}
                  disabled={creating || joining}
                  onChange={(event) => setJoinCode(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      handleJoinByCode()
                    }
                  }}
                />
              </label>

              <button
                className="btn light simulation-cta"
                type="button"
                disabled={creating || joining || normalizedJoinCode.length < 4}
                onClick={handleJoinByCode}
              >
                {joining ? 'Uniéndote...' : 'Unirme con código'}
              </button>
            </section>
          </div>

          {status ? <p className="status">{status}</p> : null}
        </article>
      </section>
    </main>
  )
}

export default SimulationPage
