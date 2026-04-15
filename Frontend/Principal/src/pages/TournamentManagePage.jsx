import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import TournamentForm from '../components/TournamentForm.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  buildTournamentInviteLink,
  canManageTournament,
  describeTournamentConfig,
  formatTournamentDate,
  formatTournamentRecurrence,
  formatTournamentState,
  formatTournamentType,
  getAllowedTournamentTransitions,
  isOfficialTournament,
  getTournamentOwnerLabel,
  getTournamentStatusTone,
  getTournamentVisibilityLabel,
  summarizeTournamentConfig,
} from '../lib/tournaments.js'
import { apiClient } from '../services/apiClient.js'
import '../styles/tournaments.css'

function formatElapsedSeconds(value) {
  const total = Number(value || 0)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`
}

function TournamentManagePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { tournamentId } = useParams()
  const [searchParams] = useSearchParams()
  const { accessToken, isAuthenticated, user } = useAuth()
  const [tournament, setTournament] = useState(null)
  const [participants, setParticipants] = useState([])
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [pageStatus, setPageStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const inviteCodeFromQuery = String(searchParams.get('codigo') || '').trim()
  const loginTarget = {
    pathname: location.pathname,
    search: location.search,
  }

  async function loadTournamentData() {
    if (!tournamentId) {
      setLoading(false)
      return
    }

    if (!accessToken && inviteCodeFromQuery) {
      setTournament(null)
      setParticipants([])
      setRanking([])
      setPageError('')
      setLoading(false)
      return
    }

    setLoading(true)
    setPageError('')

    try {
      const [tournamentPayload, participantsPayload, rankingPayload] = await Promise.all([
        accessToken
          ? apiClient.getTournament(tournamentId, accessToken)
          : apiClient.getPublicTournament(tournamentId),
        accessToken
          ? apiClient.getTournamentParticipants(tournamentId, accessToken).catch(() => [])
          : apiClient.getPublicTournamentParticipants(tournamentId).catch(() => []),
        accessToken
          ? apiClient.getTournamentRanking(tournamentId, accessToken).catch(() => [])
          : apiClient.getPublicTournamentRanking(tournamentId).catch(() => []),
      ])

      setTournament(tournamentPayload)
      setParticipants(participantsPayload || [])
      setRanking(rankingPayload || [])
    } catch (error) {
      setPageError(error.message || 'No se pudo cargar el torneo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTournamentData()
  }, [accessToken, inviteCodeFromQuery, tournamentId])

  useEffect(() => {
    if (inviteCodeFromQuery) {
      setJoinCode(inviteCodeFromQuery)
    }
  }, [inviteCodeFromQuery, tournamentId])

  const isManager = canManageTournament(tournament, user)
  const currentUserId = String(user?.sub || user?.id || '').trim()
  const isParticipant = participants.some((participant) => String(participant?.usuarioId || '').trim() === currentUserId)
  const allowedTransitions = getAllowedTournamentTransitions(tournament?.estado)
  const visibleTransitions = allowedTransitions.filter((state) => state !== 'CANCELADO')
  const configSummary = summarizeTournamentConfig(tournament?.configuracion)
  const configDetails = describeTournamentConfig(tournament?.configuracion)
  const currentState = String(tournament?.estado || '').trim().toUpperCase()
  const currentType = String(tournament?.tipo || '').trim().toUpperCase()
  const isClosedState = currentState === 'FINALIZADO' || currentState === 'CANCELADO'
  const canPlayTournament = isAuthenticated && isParticipant && currentState === 'ACTIVO' && currentType !== 'PVP'
  const inviteLink =
    tournament?.esPublico === false
      ? buildTournamentInviteLink(tournament?._id, tournament?.codigoAcceso)
      : ''
  const inviteJoinAvailable = isAuthenticated && !tournament && Boolean(inviteCodeFromQuery)

  function getParticipantLabel(row) {
    const displayName = String(row?.usuarioNombre || '').trim()
    const userId = String(row?.usuarioId || '').trim()
    if (displayName && displayName !== userId) return displayName
    if (userId && userId === currentUserId) {
      const currentUserName = String(user?.name || '').trim()
      if (currentUserName) return currentUserName
    }
    return userId || 'Usuario'
  }

  async function handleCopyValue(value, successMessage) {
    const normalizedValue = String(value || '').trim()
    if (!normalizedValue) {
      setPageError('No habia informacion para copiar.')
      return
    }

    try {
      await navigator.clipboard.writeText(normalizedValue)
      setPageError('')
      setPageStatus(successMessage)
    } catch {
      setPageStatus('')
      setPageError('No se pudo copiar al portapapeles.')
    }
  }

  async function handleUpdateTournament(payload) {
    setSaving(true)
    setPageStatus('')

    try {
      const updated = await apiClient.updateTournament(tournamentId, payload, accessToken)
      setTournament(updated)
      setPageStatus('Torneo actualizado correctamente.')
    } finally {
      setSaving(false)
    }
  }

  async function handleChangeState(nextState) {
    setActionBusy(true)
    setPageStatus('')
    setPageError('')

    try {
      const updated = await apiClient.updateTournamentState(tournamentId, { estado: nextState }, accessToken)
      setTournament(updated)
      setPageStatus(`Estado actualizado a ${String(nextState || '').toLowerCase()}.`)
    } catch (error) {
      setPageError(error.message || 'No se pudo cambiar el estado del torneo.')
    } finally {
      setActionBusy(false)
    }
  }

  async function handleCancelTournament() {
    const confirmed = window.confirm('Se cancelara el torneo. Esta accion no se puede deshacer.')
    if (!confirmed) return

    setActionBusy(true)
    setPageStatus('')
    setPageError('')

    try {
      await apiClient.deleteTournament(tournamentId, accessToken)
      setPageStatus('Torneo cancelado correctamente.')
      navigate('/torneos', { replace: true })
    } catch (error) {
      setPageError(error.message || 'No se pudo cancelar el torneo.')
    } finally {
      setActionBusy(false)
    }
  }

  async function handleJoinTournament() {
    setActionBusy(true)
    setPageStatus('')
    setPageError('')

    try {
      const requiresCode = tournament?.esPublico === false || Boolean(inviteCodeFromQuery)
      const resolvedJoinCode =
        requiresCode && !joinCode.trim() && isManager ? String(tournament?.codigoAcceso || '').trim() : joinCode.trim()
      await apiClient.joinTournament(
        tournamentId,
        requiresCode ? { codigoAcceso: resolvedJoinCode } : {},
        accessToken,
      )
      setPageStatus('Te uniste al torneo correctamente.')
      setJoinCode('')
      if (inviteCodeFromQuery) {
        navigate(`/torneos/${tournamentId}`, { replace: true })
      }
      await loadTournamentData()
    } catch (error) {
      setPageError(error.message || 'No fue posible unirte al torneo.')
    } finally {
      setActionBusy(false)
    }
  }

  if (loading) {
    return (
      <main className="tournaments-page">
        <section className="board-card tournament-empty">
          <h2>Cargando detalle del torneo...</h2>
          <p>Estamos recuperando participantes, ranking y configuración actual.</p>
        </section>
      </main>
    )
  }

  if (!isAuthenticated && inviteCodeFromQuery) {
    return (
      <main className="tournaments-page">
        <section className="board-card tournament-empty">
          <h2>Esta invitación privada requiere sesión</h2>
          <p>
            Te compartieron un enlace con código precargado. Inicia sesión y volveremos a este
            torneo para que puedas unirte sin perder la invitación.
          </p>
          <button
            className="btn primary"
            type="button"
            onClick={() => navigate('/login', { state: { from: loginTarget } })}
          >
            Iniciar sesión
          </button>
        </section>
      </main>
    )
  }

  if (pageError && !tournament) {
    if (inviteJoinAvailable) {
      return (
        <main className="tournaments-page">
          <section className="board-card tournament-empty">
            <h2>Invitacion privada detectada</h2>
            <p>
              No podemos mostrar el detalle todavía, pero si tienes acceso puedes unirte con el
              código precargado y luego abrir el torneo normalmente.
            </p>
            <div className="tournament-join-box tournament-join-box--narrow">
              <label className="auth-field">
                <span>Codigo de acceso</span>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value)}
                  placeholder="Ingresa el código"
                  disabled={actionBusy}
                />
              </label>
              <button className="btn primary" type="button" disabled={actionBusy} onClick={handleJoinTournament}>
                {actionBusy ? 'Uniéndote...' : 'Unirme con este código'}
              </button>
              <Link className="btn ghost" to="/torneos">
                Volver al panel
              </Link>
            </div>
            {pageError ? <p className="status error">{pageError}</p> : null}
          </section>
        </main>
      )
    }

    return (
      <main className="tournaments-page">
        <section className="board-card tournament-empty">
          <h2>No pudimos abrir este torneo</h2>
          <p>{pageError}</p>
          <Link className="btn primary" to="/torneos">
            Volver al panel
          </Link>
        </section>
      </main>
    )
  }

  return (
    <main className="tournaments-page">
      <section className="board-card tournament-detail-hero">
        <div className="tournament-detail-copy">
          <Link className="tournament-back-link" to="/torneos">
            Volver a torneos
          </Link>
          <p className="eyebrow">Gestión de torneo</p>
          <h1>{tournament?.nombre || 'Torneo sin nombre'}</h1>
          <p className="lead">{tournament?.descripcion || 'Sin descripción.'}</p>

          <div className="tournament-badge-row">
            {isOfficialTournament(tournament) ? (
              <span className="tournament-badge tournament-badge--warning">Oficial</span>
            ) : null}
            <span className={`tournament-badge tournament-badge--${getTournamentStatusTone(tournament?.estado)}`}>
              {formatTournamentState(tournament?.estado)}
            </span>
            <span className="tournament-badge tournament-badge--outline">
              {formatTournamentType(tournament?.tipo)}
            </span>
            <span className="tournament-badge tournament-badge--outline">
              {getTournamentVisibilityLabel(tournament)}
            </span>
          </div>
        </div>

        <aside className="tournament-hero-aside">
          <dl className="tournament-meta-list tournament-meta-list--stacked">
            <div>
              <dt>Creador</dt>
              <dd>{getTournamentOwnerLabel(tournament, user)}</dd>
            </div>
            <div>
              <dt>Inicio</dt>
              <dd>{formatTournamentDate(tournament?.fechaInicio, { kind: 'schedule' })}</dd>
            </div>
            <div>
              <dt>Fin</dt>
              <dd>{formatTournamentDate(tournament?.fechaFin, { kind: 'schedule' })}</dd>
            </div>
            <div>
              <dt>Recurrencia</dt>
              <dd>{formatTournamentRecurrence(tournament?.recurrencia)}</dd>
            </div>
          </dl>

          {isManager && tournament?.esPublico === false && tournament?.codigoAcceso ? (
            <div className="tournament-secret-box tournament-secret-box--large">
              <span>Codigo privado</span>
              <strong>{tournament.codigoAcceso}</strong>
              <div className="tournament-actions-stack">
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() =>
                    handleCopyValue(
                      tournament.codigoAcceso,
                      'Codigo privado copiado al portapapeles.',
                    )
                  }
                >
                  Copiar código
                </button>
                <button
                  className="btn ghost"
                  type="button"
                  onClick={() =>
                    handleCopyValue(
                      inviteLink,
                      'Enlace de invitación copiado al portapapeles.',
                    )
                  }
                >
                  Copiar invitación
                </button>
              </div>
            </div>
          ) : null}
        </aside>
      </section>

      {pageStatus ? <p className="status ok">{pageStatus}</p> : null}
      {pageError ? <p className="status error">{pageError}</p> : null}

      <section className="tournament-detail-grid">
        <article className="board-card tournament-panel">
          <div className="section-heading tournament-panel-heading">
            <div>
              <p className="section-kicker">Configuracion</p>
              <h2>{isManager ? 'Edita tu torneo' : 'Resumen del torneo'}</h2>
            </div>
            <span className="chip">{isManager ? 'Editable' : 'Solo lectura'}</span>
          </div>

          {isManager ? (
            <TournamentForm
              mode="edit"
              initialTournament={tournament}
              busy={saving}
              submitLabel="Guardar cambios"
              onSubmit={handleUpdateTournament}
            />
          ) : (
            <div className="tournament-readonly">
              {configSummary.length ? (
                <div className="tournament-chip-row">
                  {configSummary.map((item) => (
                    <span key={item} className="stat-chip">
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}

              {configDetails.length ? (
                <dl className="tournament-config-list">
                  {configDetails.map((item) => (
                    <div key={item.key} className="tournament-config-item">
                      <dt>{item.label}</dt>
                      <dd>{item.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <div className="tournament-chip-row">
                  <span className="stat-chip">Sin reglas base configuradas</span>
                </div>
              )}
            </div>
          )}
        </article>

        <aside className="board-card tournament-panel tournament-actions-panel">
          <div className="section-heading tournament-panel-heading">
            <div>
              <p className="section-kicker">Acciones</p>
              <h2>{isManager ? 'Administra el torneo' : 'Participación'}</h2>
            </div>
          </div>

          {isManager ? (
            <>
              <p className="mode-copy">
                El backend valida las transiciones permitidas. Solo veras acciones compatibles con
                el estado actual.
              </p>
              <div className="tournament-actions-stack">
                {visibleTransitions.length ? (
                  visibleTransitions.map((nextState) => (
                    <button
                      key={nextState}
                      className="btn ghost"
                      type="button"
                      disabled={actionBusy}
                      onClick={() => handleChangeState(nextState)}
                    >
                      Pasar a {String(nextState).toLowerCase()}
                    </button>
                  ))
                ) : (
                  <p className="status">Este estado ya no admite transiciones manuales.</p>
                )}
                {isClosedState ? null : (
                  <button className="btn danger" type="button" disabled={actionBusy} onClick={handleCancelTournament}>
                    Cancelar torneo
                  </button>
                )}
              </div>
              {isParticipant ? (
                <p className="status ok">Tambien estas inscrito como jugador en este torneo.</p>
              ) : isClosedState ? (
                <p className="status">El torneo ya no admite nuevas inscripciones.</p>
              ) : (
                <button className="btn primary" type="button" disabled={actionBusy} onClick={handleJoinTournament}>
                  {actionBusy ? 'Inscribiendote...' : 'Inscribirme para jugar'}
                </button>
              )}
              {canPlayTournament ? (
                <button className="btn primary" type="button" onClick={() => navigate(`/torneos/${tournamentId}/jugar`)}>
                  Jugar torneo
                </button>
              ) : null}
            </>
          ) : !isAuthenticated ? (
            <>
              <p className="mode-copy">
                Puedes revisar este torneo libremente. Para unirte o crear el tuyo, necesitas iniciar
                sesión.
              </p>
              <button
                className="btn primary"
                type="button"
                onClick={() => navigate('/login', { state: { from: loginTarget } })}
              >
                Iniciar sesión
              </button>
            </>
          ) : (
            <>
              <p className="mode-copy">
                {isParticipant
                  ? canPlayTournament
                    ? 'Ya estas inscrito. Puedes entrar a jugar este torneo ahora mismo.'
                    : 'Ya estas inscrito en este torneo.'
                  : isClosedState
                    ? 'Este torneo ya no acepta nuevas inscripciones.'
                    : 'Puedes unirte si el torneo sigue disponible.'}
              </p>

              {canPlayTournament ? (
                <button className="btn primary" type="button" onClick={() => navigate(`/torneos/${tournamentId}/jugar`)}>
                  Jugar torneo
                </button>
              ) : null}

              {isParticipant || isClosedState ? null : (
                <div className="tournament-join-box">
                  {tournament?.esPublico === false ? (
                    <>
                      <label className="auth-field">
                        <span>Codigo de acceso</span>
                        <input
                          type="text"
                          value={joinCode}
                          onChange={(event) => setJoinCode(event.target.value)}
                          placeholder="Ingresa el código"
                          disabled={actionBusy}
                        />
                      </label>
                      <p className="status">
                        {inviteCodeFromQuery
                          ? 'Abriste una invitación privada: el código ya viene precargado.'
                          : 'Pide al creador el código o el enlace de invitación para poder unirte.'}
                      </p>
                    </>
                  ) : null}

                  <button className="btn primary" type="button" disabled={actionBusy} onClick={handleJoinTournament}>
                    {actionBusy ? 'Uniéndote...' : 'Unirme al torneo'}
                  </button>
                </div>
              )}
            </>
          )}
        </aside>
      </section>

      <section className="tournament-detail-grid">
        <article className="board-card tournament-panel">
          <div className="section-heading tournament-panel-heading">
            <div>
              <p className="section-kicker">Participantes</p>
              <h2>Jugadores inscritos</h2>
            </div>
            <span className="chip">{participants.length}</span>
          </div>

          {participants.length ? (
            <div className="tournament-table-wrap">
              <table className="tournament-table">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Fecha de unión</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((participant) => (
                    <tr key={participant._id || `${participant.usuarioId}-${participant.fechaUnion}`}>
                      <td>{getParticipantLabel(participant)}</td>
                      <td>{formatTournamentDate(participant.fechaUnion)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="tournament-empty tournament-empty--compact">
              <h3>Aún no hay inscripciones</h3>
              <p>Cuando un jugador se una al torneo, aparecerá listado aquí.</p>
            </div>
          )}
        </article>

        <article className="board-card tournament-panel">
          <div className="section-heading tournament-panel-heading">
            <div>
              <p className="section-kicker">Ranking</p>
              <h2>Resultados del torneo</h2>
            </div>
            <span className="chip">{ranking.length}</span>
          </div>

          {ranking.length ? (
            <div className="tournament-table-wrap">
              <table className="tournament-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Usuario</th>
                    <th>Puntaje</th>
                    <th>Tiempo</th>
                    <th>Registro</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((row, index) => (
                    <tr key={row._id || `${row.usuarioId}-${row.fechaRegistro}`}>
                      <td>{index + 1}</td>
                      <td>{getParticipantLabel(row)}</td>
                      <td>{row.puntaje}</td>
                      <td>{formatElapsedSeconds(row.tiempo)}</td>
                      <td>{formatTournamentDate(row.fechaRegistro)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="tournament-empty tournament-empty--compact">
              <h3>No hay resultados todavía</h3>
              <p>El ranking aparecerá automáticamente cuando se registren puntajes.</p>
            </div>
          )}
        </article>
      </section>
    </main>
  )
}

export default TournamentManagePage
