import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import TournamentForm from '../components/TournamentForm.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  buildTournamentInviteLink,
  canManageTournament,
  formatTournamentDate,
  getTournamentOwnerLabel,
  formatTournamentState,
  formatTournamentType,
  getTournamentStatusTone,
  getTournamentVisibilityLabel,
  summarizeTournamentConfig,
  tournamentStateOptions,
  tournamentTypeOptions,
} from '../lib/tournaments.js'
import { apiClient } from '../services/apiClient.js'
import '../styles/tournaments.css'

function sortTournaments(rows, user) {
  return [...(rows || [])].sort((left, right) => {
    const leftOwned = canManageTournament(left, user) ? 1 : 0
    const rightOwned = canManageTournament(right, user) ? 1 : 0

    if (leftOwned !== rightOwned) return rightOwned - leftOwned

    const leftDate = new Date(left?.fechaInicio || left?.fechaCreacion || 0).getTime()
    const rightDate = new Date(right?.fechaInicio || right?.fechaCreacion || 0).getTime()
    return rightDate - leftDate
  })
}

function TournamentsPage() {
  const navigate = useNavigate()
  const { accessToken, isAuthenticated, user } = useAuth()
  const [tournaments, setTournaments] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [pageStatus, setPageStatus] = useState('')
  const [creationOpen, setCreationOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [filters, setFilters] = useState({
    scope: 'all',
    search: '',
    state: '',
    type: '',
    visibility: '',
  })

  async function loadTournaments() {
    setLoading(true)
    setFetchError('')
    setPageStatus('')

    try {
      const payload = accessToken
        ? await apiClient.getTournaments(accessToken)
        : await apiClient.getPublicTournaments()
      setTournaments(sortTournaments(payload, user))
    } catch (error) {
      setFetchError(error.message || 'No se pudieron cargar los torneos.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTournaments()
  }, [accessToken, user?.id, user?.sub])

  const effectiveScope = isAuthenticated ? filters.scope : 'all'
  const publicAccessUnavailable =
    !isAuthenticated && fetchError.includes('ROBLE_PUBLIC_READ_TOKEN')
  const myTournaments = tournaments.filter((row) => canManageTournament(row, user))
  const summary = {
    mine: myTournaments.length,
    active: tournaments.filter((row) => String(row?.estado || '').toUpperCase() === 'ACTIVO').length,
    scheduled: tournaments.filter((row) => String(row?.estado || '').toUpperCase() === 'PROGRAMADO').length,
    private: tournaments.filter((row) => row?.esPublico === false).length,
  }

  const filteredTournaments = tournaments.filter((row) => {
    const name = String(row?.nombre || '').toLowerCase()
    const description = String(row?.descripcion || '').toLowerCase()
    const state = String(row?.estado || '').trim().toUpperCase()
    const type = String(row?.tipo || '').trim().toUpperCase()
    const visibility = row?.esPublico === false ? 'PRIVADO' : 'PUBLICO'
    const matchesMine = effectiveScope !== 'mine' || canManageTournament(row, user)
    const matchesSearch =
      !filters.search ||
      name.includes(filters.search.toLowerCase()) ||
      description.includes(filters.search.toLowerCase())
    const matchesState = !filters.state || state === filters.state
    const matchesType = !filters.type || type === filters.type
    const matchesVisibility = !filters.visibility || visibility === filters.visibility

    return matchesMine && matchesSearch && matchesState && matchesType && matchesVisibility
  })

  async function handleCreateTournament(payload) {
    setCreating(true)

    try {
      const created = await apiClient.createTournament(payload, accessToken)
      setTournaments((current) => sortTournaments([created, ...current], user))
      setCreationOpen(false)
      navigate(`/torneos/${created._id}`)
    } finally {
      setCreating(false)
    }
  }

  async function handleCopyValue(value, successMessage) {
    const normalizedValue = String(value || '').trim()
    if (!normalizedValue) {
      setFetchError('No habia informacion para copiar.')
      return
    }

    try {
      await navigator.clipboard.writeText(normalizedValue)
      setFetchError('')
      setPageStatus(successMessage)
    } catch {
      setPageStatus('')
      setFetchError('No se pudo copiar al portapapeles.')
    }
  }

  return (
    <main className="tournaments-page">
      <section className="board-card tournaments-hero">
        <div className="tournaments-hero-copy">
          <p className="eyebrow">Tus torneos</p>
          <h1>Organiza competencias desde la misma app</h1>
          <p className="lead">
            Crea torneos publicos o privados, define reglas, programa fechas y administra el
            ciclo de vida sin salir de la app principal.
          </p>
        </div>

        <div className="tournaments-hero-actions">
          <button
            className="btn primary"
            type="button"
            onClick={() => {
              if (!isAuthenticated) {
                navigate('/login', { state: { from: { pathname: '/torneos' } } })
                return
              }

              setCreationOpen((current) => !current)
            }}
          >
            {isAuthenticated
              ? creationOpen
                ? 'Ocultar formulario'
                : 'Crear torneo'
              : 'Iniciar sesion para crear'}
          </button>
          <button className="btn ghost" type="button" onClick={loadTournaments} disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar lista'}
          </button>
        </div>
      </section>

      {isAuthenticated ? null : (
        <section className="board-card tournament-panel">
          <div className="section-heading tournament-panel-heading">
            <div>
              <p className="section-kicker">Explora libremente</p>
              <h2>Puedes navegar los torneos sin iniciar sesion</h2>
            </div>
          </div>
          <p className="mode-copy">
            La lista, los filtros y el detalle quedan abiertos. Para crear un torneo o unirte a
            uno, primero debes iniciar sesion.
          </p>
        </section>
      )}

      <section className="tournament-summary-grid">
        <article className="board-card tournament-summary-card">
          <span className="section-kicker">Panel propio</span>
          <strong>{summary.mine}</strong>
          <p>Torneos creados por ti</p>
        </article>
        <article className="board-card tournament-summary-card">
          <span className="section-kicker">En curso</span>
          <strong>{summary.active}</strong>
          <p>Torneos activos ahora mismo</p>
        </article>
        <article className="board-card tournament-summary-card">
          <span className="section-kicker">Programados</span>
          <strong>{summary.scheduled}</strong>
          <p>Listos para arrancar</p>
        </article>
        <article className="board-card tournament-summary-card">
          <span className="section-kicker">Privados</span>
          <strong>{summary.private}</strong>
          <p>Con acceso protegido por codigo</p>
        </article>
      </section>

      {isAuthenticated && creationOpen ? (
        <section className="board-card tournament-panel">
          <div className="section-heading tournament-panel-heading">
            <div>
              <p className="section-kicker">Nuevo torneo</p>
              <h2>Crea una competencia a tu medida</h2>
            </div>
          </div>

          <TournamentForm
            mode="create"
            busy={creating}
            submitLabel="Crear torneo"
            onSubmit={handleCreateTournament}
          />
        </section>
      ) : null}

      <section className="board-card tournament-panel">
        <div className="section-heading tournament-panel-heading">
          <div>
            <p className="section-kicker">Gestion</p>
            <h2>Listado de torneos</h2>
          </div>
          <span className="chip">{filteredTournaments.length} visibles</span>
        </div>

        <div className="tournament-filters">
          <label className="auth-field">
            <span>Vista</span>
            <select
              value={effectiveScope}
              onChange={(event) => setFilters((current) => ({ ...current, scope: event.target.value }))}
              disabled={!isAuthenticated}
            >
              <option value="all">Todos</option>
              {isAuthenticated ? <option value="mine">Solo los mios</option> : null}
            </select>
          </label>

          <label className="auth-field tournament-filter-search">
            <span>Buscar</span>
            <input
              type="search"
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="Nombre o descripcion"
            />
          </label>

          <label className="auth-field">
            <span>Estado</span>
            <select
              value={filters.state}
              onChange={(event) => setFilters((current) => ({ ...current, state: event.target.value }))}
            >
              <option value="">Todos</option>
              {tournamentStateOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="auth-field">
            <span>Tipo</span>
            <select
              value={filters.type}
              onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value }))}
            >
              <option value="">Todos</option>
              {tournamentTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="auth-field">
            <span>Visibilidad</span>
            <select
              value={filters.visibility}
              onChange={(event) => setFilters((current) => ({ ...current, visibility: event.target.value }))}
            >
              <option value="">Todas</option>
              <option value="PUBLICO">Publicos</option>
              <option value="PRIVADO">Privados</option>
            </select>
          </label>
        </div>

        {pageStatus ? <p className="status ok">{pageStatus}</p> : null}
        {fetchError && !publicAccessUnavailable ? <p className="status error">{fetchError}</p> : null}

        {loading ? (
          <div className="tournament-empty">
            <h3>Cargando torneos...</h3>
            <p>Traemos la informacion mas reciente para que puedas administrarla.</p>
          </div>
        ) : publicAccessUnavailable ? (
          <div className="tournament-empty">
            <h3>Debes iniciar sesion para ver los torneos en este entorno</h3>
            <p>
              La lectura publica no esta configurada todavia. Si entras con tu cuenta, podras ver
              los torneos disponibles y administrar los tuyos.
            </p>
            <button
              className="btn primary"
              type="button"
              onClick={() => navigate('/login', { state: { from: { pathname: '/torneos' } } })}
            >
              Iniciar sesion
            </button>
          </div>
        ) : filteredTournaments.length ? (
          <div className="tournament-grid">
            {filteredTournaments.map((tournament) => {
              const isOwner = canManageTournament(tournament, user)
              const configSummary = summarizeTournamentConfig(tournament.configuracion)

              return (
                <article key={tournament._id} className="board-card tournament-card">
                  <div className="tournament-card-top">
                    <div>
                      <p className="section-kicker">#{String(tournament._id || '').slice(-6)}</p>
                      <h3>{tournament.nombre || 'Torneo sin nombre'}</h3>
                    </div>

                    <div className="tournament-badge-row">
                      <span className={`tournament-badge tournament-badge--${getTournamentStatusTone(tournament.estado)}`}>
                        {formatTournamentState(tournament.estado)}
                      </span>
                      <span className="tournament-badge tournament-badge--outline">{formatTournamentType(tournament.tipo)}</span>
                    </div>
                  </div>

                  <p className="mode-copy">{tournament.descripcion || 'Sin descripcion.'}</p>

                  <dl className="tournament-meta-list">
                    <div>
                      <dt>Visibilidad</dt>
                      <dd>{getTournamentVisibilityLabel(tournament)}</dd>
                    </div>
                    <div>
                      <dt>Inicio</dt>
                      <dd>{formatTournamentDate(tournament.fechaInicio)}</dd>
                    </div>
                    <div>
                      <dt>Fin</dt>
                      <dd>{formatTournamentDate(tournament.fechaFin)}</dd>
                    </div>
                    <div>
                      <dt>Creador</dt>
                      <dd>{getTournamentOwnerLabel(tournament, user)}</dd>
                    </div>
                  </dl>

                  <div className="tournament-chip-row">
                    {configSummary.length ? (
                      configSummary.map((item) => (
                        <span key={`${tournament._id}-${item}`} className="stat-chip">
                          {item}
                        </span>
                      ))
                    ) : (
                      <span className="stat-chip">Configuracion flexible</span>
                    )}
                  </div>

                  {isOwner && tournament.esPublico === false && tournament.codigoAcceso ? (
                    <div className="tournament-secret-box">
                      <span>Codigo de acceso</span>
                      <strong>{tournament.codigoAcceso}</strong>
                      <div className="tournament-card-actions">
                        <button
                          className="btn ghost"
                          type="button"
                          onClick={() =>
                            handleCopyValue(
                              tournament.codigoAcceso,
                              'Codigo de acceso copiado al portapapeles.',
                            )
                          }
                        >
                          Copiar codigo
                        </button>
                        <button
                          className="btn ghost"
                          type="button"
                          onClick={() =>
                            handleCopyValue(
                              buildTournamentInviteLink(
                                tournament._id,
                                tournament.codigoAcceso,
                              ),
                              'Enlace de invitacion copiado al portapapeles.',
                            )
                          }
                        >
                          Copiar invitacion
                        </button>
                      </div>
                    </div>
                  ) : null}

                  <div className="tournament-card-actions">
                    <Link className="btn primary" to={`/torneos/${tournament._id}`}>
                      {isOwner ? 'Administrar' : 'Ver detalle'}
                    </Link>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="tournament-empty">
            <h3>No hay torneos para ese filtro</h3>
            <p>
              Prueba cambiando el scope o crea uno nuevo para empezar a administrar tu propio
              circuito.
            </p>
          </div>
        )}
      </section>
    </main>
  )
}

export default TournamentsPage
