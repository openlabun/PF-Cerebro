import { Link, useNavigate, useParams } from 'react-router-dom'
import SudokuBoard from '../components/SudokuBoard.jsx'
import SudokuControlsPanel from '../components/SudokuControlsPanel.jsx'
import { SudokuGameProvider, formatSudokuTime } from '../context/SudokuGameContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useTournamentSudokuGame } from '../hooks/useTournamentSudokuGame.js'
import {
  formatTournamentDate,
  formatTournamentState,
  formatTournamentType,
  getTournamentVisibilityLabel,
  summarizeTournamentConfig,
} from '../lib/tournaments.js'
import '../styles/tournaments.css'

function TournamentSudokuPageContent() {
  const navigate = useNavigate()
  const { tournamentId } = useParams()
  const { accessToken } = useAuth()
  const {
    tournament,
    session,
    game,
    difficulty,
    loading,
    pageError,
    pageStatus,
    status,
    statusOk,
    errorCount,
    hintsUsed,
    hintLimit,
    elapsedSeconds,
    timeLimitSeconds,
    timeRemainingSeconds,
    progress,
    correctCounts,
    noteMode,
    highlightEnabled,
    submissionRequested,
    completedOutcome,
    isCompleted,
    controlsDisabled,
    loadTournamentSession,
    applyValue,
    applyHint,
    clearSelectedCell,
    setNoteMode,
    setHighlightEnabled,
    finalizeGame,
  } = useTournamentSudokuGame({
    tournamentId,
    accessToken,
  })

  const configSummary = summarizeTournamentConfig(tournament?.configuracion)
  const timerCopy =
    timeLimitSeconds === null
      ? formatSudokuTime(elapsedSeconds)
      : formatSudokuTime(timeRemainingSeconds)
  const timerLabel = timeLimitSeconds === null ? 'Tiempo oficial' : 'Tiempo restante'
  const closingError = Boolean(pageError) && submissionRequested && !completedOutcome

  if (loading) {
    return (
      <main className="tournaments-page">
        <section className="board-card tournament-empty">
          <h2>Preparando partida de torneo...</h2>
          <p>Estamos validando tu inscripcion y cargando la configuracion oficial.</p>
        </section>
      </main>
    )
  }

  if (pageError && !tournament) {
    return (
      <main className="tournaments-page">
        <section className="board-card tournament-empty">
          <h2>No pudimos iniciar esta partida</h2>
          <p>{pageError}</p>
          <div className="tournament-actions-stack">
            <button className="btn primary" type="button" onClick={loadTournamentSession}>
              Reintentar
            </button>
            <Link className="btn ghost" to={`/torneos/${tournamentId}`}>
              Volver al torneo
            </Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="tournaments-page">
      <section className="board-card tournament-detail-hero tournament-play-hero">
        <div className="tournament-detail-copy">
          <Link className="tournament-back-link" to={`/torneos/${tournamentId}`}>
            Volver al detalle
          </Link>
          <p className="eyebrow">Modo torneo</p>
          <h1>{tournament?.nombre || 'Torneo Sudoku'}</h1>
          <p className="lead">
            Juegas bajo reglas oficiales del torneo. Este resultado no impacta single player ni
            PvP.
          </p>

          <div className="tournament-badge-row">
            <span className="tournament-badge tournament-badge--success">
              {formatTournamentState(tournament?.estado)}
            </span>
            <span className="tournament-badge tournament-badge--outline">
              {formatTournamentType(tournament?.tipo)}
            </span>
            <span className="tournament-badge tournament-badge--outline">
              {getTournamentVisibilityLabel(tournament)}
            </span>
          </div>

          <div className="tournament-chip-row">
            {configSummary.map((item) => (
              <span key={item} className="stat-chip">
                {item}
              </span>
            ))}
            <span className="stat-chip">Juego: Sudoku</span>
            <span className="stat-chip">
              Intento: {session?.intentoNumero || 1}/{game?.attemptLimit || 1}
            </span>
          </div>
        </div>

        <aside className="tournament-hero-aside">
          <dl className="tournament-meta-list tournament-meta-list--stacked">
            <div>
              <dt>{timerLabel}</dt>
              <dd>{timerCopy}</dd>
            </div>
            <div>
              <dt>Dificultad</dt>
              <dd>{difficulty.label}</dd>
            </div>
            <div>
              <dt>Inicio del intento</dt>
              <dd>{formatTournamentDate(session?.fechaInicio)}</dd>
            </div>
            <div>
              <dt>Pistas permitidas</dt>
              <dd>{hintLimit}</dd>
            </div>
          </dl>
        </aside>
      </section>

      {pageStatus ? <p className="status ok">{pageStatus}</p> : null}
      {pageError && !closingError ? <p className="status error">{pageError}</p> : null}

      <section className={`board-card sudoku-game-card tournament-play-card${submissionRequested ? ' paused' : ''}`}>
        <div className="sudoku-top-row">
          <div className="difficulty-wrap tournament-play-meta">
            <span className="difficulty-label">Juego: Sudoku competitivo</span>
            <span className="difficulty-label">Dificultad: {difficulty.label}</span>
            <span className="difficulty-label">Semilla oficial: {session?.seed || game?.seed}</span>
          </div>

          <div className="sudoku-top-right">
            <span className="timer-display">{timerCopy}</span>
            <span className="stat-chip">Errores: {errorCount}</span>
            <span className="stat-chip">
              Pistas: {hintsUsed}/{hintLimit}
            </span>
            <button className="btn ghost" type="button" onClick={() => navigate(`/torneos/${tournamentId}`)}>
              Volver
            </button>
          </div>
        </div>

        <div className="sudoku-main">
          <div className="sudoku-grid-wrap">
            <SudokuBoard ariaLabel="Tablero Sudoku del torneo" />
          </div>

          <SudokuControlsPanel
            noteMode={noteMode}
            highlightEnabled={highlightEnabled}
            hintCount={hintsUsed}
            onApplyValue={(num) => applyValue(num, noteMode)}
            onClearCell={clearSelectedCell}
            onHint={applyHint}
            onToggleNoteMode={() => {
              if (controlsDisabled) return
              setNoteMode((current) => !current)
            }}
            onToggleHighlight={() => {
              if (controlsDisabled) return
              setHighlightEnabled((current) => !current)
            }}
            getNumberHidden={(num) => correctCounts[num] >= 9}
            getNumberDisabled={(num) => correctCounts[num] >= 9}
            keypadDisabled={controlsDisabled}
            clearDisabled={controlsDisabled}
            noteDisabled={controlsDisabled}
            highlightDisabled={controlsDisabled}
            hintDisabled={controlsDisabled || hintsUsed >= hintLimit}
          >
            {closingError ? (
              <div className="tournament-actions-stack tournament-play-actions">
                <button className="btn primary" type="button" onClick={finalizeGame}>
                  Reintentar envio del resultado
                </button>
              </div>
            ) : null}
          </SudokuControlsPanel>
        </div>

        <div className="sudoku-bottom">
          <div className="progress-wrapper" aria-label="Progreso del tablero">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress.percentage}%` }} />
            </div>
            <p className="progress-text">
              {progress.correct}/{progress.editable} celdas correctas ({progress.percentage}%)
            </p>
          </div>

          <p className={`status${statusOk ? ' ok' : ''}`}>
            {submissionRequested && !isCompleted
              ? 'Estamos cerrando tu intento con el backend oficial del torneo.'
              : status}
          </p>
        </div>
      </section>

      {completedOutcome ? (
        <div className="sudoku-pause-overlay" role="alertdialog" aria-modal="true">
          <div className="sudoku-pause-card sudoku-completion-card">
            <h3 className="sudoku-pause-title">
              {completedOutcome.outcome === 'EXPIRADA' ? 'Tiempo agotado' : 'Resultado registrado'}
            </h3>
            <p className="sudoku-pause-text">
              {completedOutcome.outcome === 'EXPIRADA'
                ? 'Tu intento se cerro por limite de tiempo.'
                : `Puntaje oficial: ${completedOutcome.score}`}
            </p>
            <p className="sudoku-pause-text">
              Tiempo oficial: {formatSudokuTime(completedOutcome.elapsedSeconds)}
            </p>
            <div className="tournament-actions-stack tournament-play-actions">
              <Link className="btn primary" to={`/torneos/${tournamentId}`}>
                Volver al torneo
              </Link>
              <button className="btn ghost" type="button" onClick={loadTournamentSession}>
                Revisar si queda otro intento
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

function TournamentSudokuPage() {
  return (
    <SudokuGameProvider>
      <TournamentSudokuPageContent />
    </SudokuGameProvider>
  )
}

export default TournamentSudokuPage
