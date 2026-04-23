import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import TournamentForm from '../components/TournamentForm.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import {
  buildTournamentInviteLink,
  canManageTournament,
  formatTournamentDate,
  formatTournamentState,
  formatTournamentType,
  getTournamentTimestamp,
  getTournamentOwnerLabel,
  getTournamentStatusTone,
  getTournamentVisibilityLabel,
  isAvailableOfficialTournament,
  isOfficialTournament,
  summarizeTournamentConfig,
  tournamentStateOptions,
  tournamentTypeOptions,
} from '../lib/tournaments.js'
import { apiClient } from '../services/apiClient.js'
import '../styles/tournaments.css'

function sortTournaments(rows, user) {
  return [...(rows || [])].sort((left, right) => {
    const leftOfficial = isOfficialTournament(left) ? 1 : 0
    const rightOfficial = isOfficialTournament(right) ? 1 : 0
    if (leftOfficial !== rightOfficial) return rightOfficial - leftOfficial

    const leftOwned = canManageTournament(left, user) ? 1 : 0
    const rightOwned = canManageTournament(right, user) ? 1 : 0

    if (leftOwned !== rightOwned) return rightOwned - leftOwned

    const leftDate = left?.fechaInicio
      ? getTournamentTimestamp(left.fechaInicio, { kind: 'schedule' })
      : getTournamentTimestamp(left?.fechaCreacion || 0, { kind: 'system' })
    const rightDate = right?.fechaInicio
      ? getTournamentTimestamp(right.fechaInicio, { kind: 'schedule' })
      : getTournamentTimestamp(right?.fechaCreacion || 0, { kind: 'system' })
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

  const publicAccessUnavailable =
    !isAuthenticated && fetchError.includes('ROBLE_PUBLIC_READ_TOKEN')
  const showGuestPublicIntro = !isAuthenticated && !publicAccessUnavailable
  const showGuestRestrictedState = !isAuthenticated && publicAccessUnavailable

  const filteredTournaments = tournaments.filter((row) => {
    const name = String(row?.nombre || '').toLowerCase()
    const description = String(row?.descripcion || '').toLowerCase()
    const state = String(row?.estado || '').trim().toUpperCase()
    const type = String(row?.tipo || '').trim().toUpperCase()
    const visibility = row?.esPublico === false ? 'PRIVADO' : 'PUBLICO'
    const matchesSearch =
      !filters.search ||
      name.includes(filters.search.toLowerCase()) ||
      description.includes(filters.search.toLowerCase())
    const matchesState = !filters.state || state === filters.state
    const matchesType = !filters.type || type === filters.type
    const matchesVisibility = !filters.visibility || visibility === filters.visibility

    return matchesSearch && matchesState && matchesType && matchesVisibility
  })

  const officialTournaments = filteredTournaments.filter((row) => isOfficialTournament(row))
  const regularTournaments = filteredTournaments.filter((row) => !isOfficialTournament(row))

  const ownTournaments = isAuthenticated
    ? regularTournaments.filter((row) => canManageTournament(row, user))
    : []
  const joinedTournaments = isAuthenticated
    ? regularTournaments.filter((row) => row?.inscrito === true && !canManageTournament(row, user))
    : []
  const otherTournaments = isAuthenticated
    ? regularTournaments.filter((row) => !canManageTournament(row, user) && row?.inscrito !== true)
    : regularTournaments

  function renderTournamentCard(tournament, sectionKey) {
    const isOwner = canManageTournament(tournament, user)
    const configSummary = summarizeTournamentConfig(tournament.configuracion)
    const shouldSignalTournamentAction =
      isAvailableOfficialTournament(tournament) && tournament?.inscrito !== true && !isOwner

    return (
      <article key={`${sectionKey}-${tournament._id}`} className="board-card tournament-card tournament-card--compact">
        <div className="tournament-card-top">
          <div>
            <p className="section-kicker">{formatTournamentType(tournament.tipo)}</p>
            <h3>{tournament.nombre || 'Torneo sin nombre'}</h3>
          </div>

          <div className="tournament-badge-row">
            {isOfficialTournament(tournament) ? (
              <span className="tournament-badge tournament-badge--warning">Oficial</span>
            ) : null}
            {tournament?.inscrito === true && !isOwner ? (
              <span className="tournament-badge tournament-badge--success">Inscrito</span>
            ) : null}
            {isOwner ? <span className="tournament-badge tournament-badge--info">Propio</span> : null}
            <span className={`tournament-badge tournament-badge--${getTournamentStatusTone(tournament.estado)}`}>
              {formatTournamentState(tournament.estado)}
            </span>
          </div>
        </div>

        <p className="mode-copy">{tournament.descripcion || 'Sin descripción.'}</p>

        <dl className="tournament-meta-list">
          <div>
            <dt>Inicio</dt>
            <dd>{formatTournamentDate(tournament.fechaInicio, { kind: 'schedule' })}</dd>
          </div>
          <div>
            <dt>Fin</dt>
            <dd>{formatTournamentDate(tournament.fechaFin, { kind: 'schedule' })}</dd>
          </div>
          <div>
            <dt>Visibilidad</dt>
            <dd>{getTournamentVisibilityLabel(tournament)}</dd>
          </div>
          <div>
            <dt>Creador</dt>
            <dd>{getTournamentOwnerLabel(tournament, user)}</dd>
          </div>
        </dl>

        <div className="tournament-chip-row">
          {configSummary.length ? (
            configSummary.slice(0, 3).map((item) => (
              <span key={`${tournament._id}-${item}`} className="stat-chip">
                {item}
              </span>
            ))
          ) : (
            <span className="stat-chip">Sin reglas resumidas</span>
          )}
        </div>

        {isOwner && tournament.esPublico === false && tournament.codigoAcceso ? (
          <div className="tournament-secret-box">
            <span>Codigo privado</span>
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
                Copiar código
              </button>
              <button
                className="btn ghost"
                type="button"
                onClick={() =>
                  handleCopyValue(
                    buildTournamentInviteLink(tournament._id, tournament.codigoAcceso),
                    'Enlace de invitación copiado al portapapeles.',
                  )
                }
              >
                Copiar invitación
              </button>
            </div>
          </div>
        ) : null}

        <div className="tournament-card-actions">
          <Link
            className={`btn primary${shouldSignalTournamentAction ? ' btn--tournament-signal' : ''}`}
            to={`/torneos/${tournament._id}`}
          >
            {isOwner ? 'Gestionar' : 'Abrir'}
          </Link>
        </div>
      </article>
    )
  }

  function renderTournamentSection({
    sectionKey,
    title,
    kicker,
    rows,
    emptyTitle,
    emptyText,
    panelClassName = '',
  }) {
    const shouldSignalOfficialSection = String(sectionKey || '').startsWith('official') &&
      rows.some(
        (row) =>
          isAvailableOfficialTournament(row) &&
          row?.inscrito !== true &&
          !canManageTournament(row, user),
      )
    const panelClasses = [
      'board-card',
      'tournament-panel',
      'tournament-column-panel',
      shouldSignalOfficialSection ? 'tournament-panel--official-signal' : '',
      panelClassName,
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <section className={panelClasses}>
        <div className="section-heading tournament-panel-heading">
          <div>
            <p className="section-kicker">{kicker}</p>
            <h2>{title}</h2>
          </div>
          <span className="chip">{rows.length}</span>
        </div>

        {rows.length ? (
          <div className="tournament-card-list">
            {rows.map((tournament) => renderTournamentCard(tournament, sectionKey))}
          </div>
        ) : (
          <div className="tournament-empty tournament-empty--compact">
            <h3>{emptyTitle}</h3>
            <p>{emptyText}</p>
          </div>
        )}
      </section>
    )
  }

  return (
    <main className="tournaments-page">
      <section className="board-card tournaments-hero">
        <div className="tournaments-hero-copy">
          <p className="eyebrow">Tus torneos</p>
          <h1>Organiza competencias desde la misma app</h1>
          <p className="lead">
            Consulta solo los torneos programados y activos, separa rápido los tuyos, los que ya
            jugas y el resto del panel.
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
              : 'Iniciar sesión para crear'}
          </button>
          <button className="btn ghost" type="button" onClick={loadTournaments} disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar lista'}
          </button>
        </div>
      </section>

      {showGuestPublicIntro ? (
        <section className="board-card tournament-panel">
          <div className="section-heading tournament-panel-heading">
            <div>
              <p className="section-kicker">Explora libremente</p>
              <h2>Puedes navegar los torneos sin iniciar sesión</h2>
            </div>
          </div>
          <p className="mode-copy">
            Para crear un torneo o unirte a uno, primero debes iniciar sesión.
          </p>
        </section>
      ) : null}

      {showGuestRestrictedState ? (
        <section className="board-card tournament-panel">
          <div className="section-heading tournament-panel-heading">
            <div>
              <p className="section-kicker">Acceso restringido</p>
              <h2>Debes iniciar sesión para ver los torneos en este entorno</h2>
            </div>
          </div>
          <p className="mode-copy">
            La lectura pública no está configurada todavía. Si entras con tu cuenta, podrás ver los
            torneos disponibles y administrar los tuyos.
          </p>
          <div className="tournament-card-actions">
            <button
              className="btn primary"
              type="button"
              onClick={() => navigate('/login', { state: { from: { pathname: '/torneos' } } })}
            >
              Iniciar sesión
            </button>
          </div>
        </section>
      ) : null}

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

      {showGuestRestrictedState ? null : (
        <section className="board-card tournament-panel">
          <div className="section-heading tournament-panel-heading">
            <div>
              <p className="section-kicker">Filtros</p>
              <h2>Ajusta lo que quieres ver</h2>
            </div>
            <span className="chip">{filteredTournaments.length} visibles</span>
          </div>

          <div className="tournament-filters">
            <label className="auth-field tournament-filter-search">
              <span>Buscar</span>
              <input
                type="search"
                value={filters.search}
                onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                placeholder="Nombre o descripción"
              />
            </label>

            <label className="auth-field">
              <span>Estado</span>
              <select
                value={filters.state}
                onChange={(event) => setFilters((current) => ({ ...current, state: event.target.value }))}
              >
                <option value="">Todos</option>
                {tournamentStateOptions
                  .filter((option) => option.value === 'PROGRAMADO' || option.value === 'ACTIVO')
                  .map((option) => (
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
        </section>
      )}

      {loading ? (
        <section className="board-card tournament-empty">
          <h3>Cargando torneos...</h3>
          <p>Traemos la información más reciente para que puedas administrarla.</p>
        </section>
      ) : null}

      {!loading && isAuthenticated ? (
        <section className="tournament-layout">
          {officialTournaments.length
            ? renderTournamentSection({
                sectionKey: 'official',
                title: 'Torneos oficiales',
                kicker: 'Prioridad',
                rows: officialTournaments,
                emptyTitle: 'Aún no hay torneos oficiales visibles',
                emptyText: 'Cuando administración publique uno, aparecerá primero aquí.',
                panelClassName: 'tournament-column-panel--wide',
              })
            : null}

          {renderTournamentSection({
            sectionKey: 'joined',
            title: 'Torneos donde estás inscrito',
            kicker: 'Inscripciones',
            rows: joinedTournaments,
            emptyTitle: 'Aún no tienes inscripciones',
            emptyText: 'Cuando te unas a un torneo activo o programado, aparecerá aquí.',
            panelClassName: 'tournament-column-panel--wide',
          })}

          <div className="tournament-columns tournament-columns--pair">
            {renderTournamentSection({
              sectionKey: 'mine',
              title: 'Torneos propios',
              kicker: 'Gestión',
              rows: ownTournaments,
              emptyTitle: 'No tienes torneos visibles',
              emptyText: 'Crea uno nuevo o programa uno para que aparezca en tu panel.',
            })}

            {renderTournamentSection({
              sectionKey: 'others',
              title: 'Demás torneos',
              kicker: 'Explorar',
              rows: otherTournaments,
              emptyTitle: 'No hay más torneos con este filtro',
              emptyText: 'Prueba quitando filtros o espera nuevos torneos activos o programados.',
            })}
          </div>
        </section>
      ) : null}

      {!loading && !isAuthenticated && !publicAccessUnavailable ? (
        <section className="tournament-layout">
          {officialTournaments.length
            ? renderTournamentSection({
                sectionKey: 'official-public',
                title: 'Torneos oficiales',
                kicker: 'Prioridad',
                rows: officialTournaments,
                emptyTitle: 'Aún no hay torneos oficiales visibles',
                emptyText: 'Cuando administración publique uno, aparecerá primero aquí.',
                panelClassName: 'tournament-column-panel--wide',
              })
            : null}

          <section className="tournament-columns tournament-columns--single">
            {renderTournamentSection({
              sectionKey: 'public',
              title: 'Torneos disponibles',
              kicker: 'Explorar',
              rows: otherTournaments,
              emptyTitle: 'No hay torneos con este filtro',
              emptyText: 'Prueba cambiando los filtros o vuelve más tarde.',
            })}
          </section>
        </section>
      ) : null}
    </main>
  )
}

export default TournamentsPage
