import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SudokuBoard from '../components/SudokuBoard.jsx'
import SudokuControlsPanel from '../components/SudokuControlsPanel.jsx'
import DifficultySelect from '../components/DifficultySelect.jsx'
import { SudokuGameProvider } from '../context/SudokuGameContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { formatSudokuTime } from '../context/SudokuGameContext.jsx'
import { useLocalSudokuGame } from '../hooks/useLocalSudokuGame.js'
import { useLiveHeartbeat } from '../hooks/useLiveHeartbeat.js'
import { difficultyLevels } from '../lib/sudoku.js'
import { canManageTournament, getTournamentTimestamp, isAvailableOfficialTournament } from '../lib/tournaments.js'
import { apiClient } from '../services/apiClient.js'

const TOURNAMENTS_UPDATED_EVENT = 'cerebro:tournaments-updated'

function getOfficialTournamentPriority(tournament) {
  const state = String(tournament?.estado || '').trim().toUpperCase()
  const statePriority = state === 'ACTIVO' ? 0 : 1
  const startTimestamp = tournament?.fechaInicio
    ? getTournamentTimestamp(tournament.fechaInicio, { kind: 'schedule' })
    : Number.MAX_SAFE_INTEGER

  return { statePriority, startTimestamp }
}

function pickAvailableOfficialTournament(rows, user) {
  return [...(rows || [])]
    .filter(
      (tournament) =>
        isAvailableOfficialTournament(tournament) &&
        tournament?.inscrito !== true &&
        !canManageTournament(tournament, user),
    )
    .sort((left, right) => {
      const leftPriority = getOfficialTournamentPriority(left)
      const rightPriority = getOfficialTournamentPriority(right)

      if (leftPriority.statePriority !== rightPriority.statePriority) {
        return leftPriority.statePriority - rightPriority.statePriority
      }

      return leftPriority.startTimestamp - rightPriority.startTimestamp
    })[0] || null
}

function SudokuPageContent() {
  const [completionModalDismissed, setCompletionModalDismissed] = useState(false)
  const [availableOfficialTournament, setAvailableOfficialTournament] = useState(null)
  const { accessToken, isLoading, user } = useAuth()
  const difficultyOptions = difficultyLevels.map((level) => ({
    value: level.key,
    label: level.label,
  }))

  const {
    difficulty,
    difficultyKey,
    paused,
    completed,
    seconds,
    errorCount,
    hintsUsed,
    score,
    completionRewards,
    noteMode,
    highlightEnabled,
    status,
    statusOk,
    progress,
    correctCounts,
    canUndo,
    showResumePrompt,
    pendingResumeSnapshot,
    showAchievementPopup,
    achievementPopupItems,
    setPaused,
    setNoteMode,
    setHighlightEnabled,
    setShowAchievementPopup,
    startNewGame,
    resumeSavedGame,
    discardSavedGame,
    applyValue,
    applyHint,
    undoLastMove,
    clearSelectedCell,
  } = useLocalSudokuGame()

  useLiveHeartbeat({
    mode: 'sudoku',
    difficulty: difficulty.label,
    state: completed ? 'completed' : paused ? 'paused' : 'playing',
  })

  useEffect(() => {
    if (completed) {
      setCompletionModalDismissed(false)
    }
  }, [completed])

  useEffect(() => {
    let mounted = true

    async function loadOfficialTournament() {
      if (isLoading) return

      try {
        const payload = accessToken
          ? await apiClient.getTournaments(accessToken)
          : await apiClient.getPublicTournaments()
        const nextAvailableOfficialTournament = pickAvailableOfficialTournament(payload, user)

        if (mounted) {
          setAvailableOfficialTournament(nextAvailableOfficialTournament)
        }
      } catch {
        if (mounted) {
          setAvailableOfficialTournament(null)
        }
      }
    }

    function handleTournamentRefresh() {
      loadOfficialTournament()
    }

    loadOfficialTournament()
    window.addEventListener(TOURNAMENTS_UPDATED_EVENT, handleTournamentRefresh)

    return () => {
      mounted = false
      window.removeEventListener(TOURNAMENTS_UPDATED_EVENT, handleTournamentRefresh)
    }
  }, [accessToken, isLoading, user?.id, user?.sub])

  function handleDismissCompletionModal() {
    setCompletionModalDismissed(true)
  }

  function getRewardsFromStatusMessage() {
    const match = String(status || '').match(/XP ganada:\s*(-?\d+)\.\s*ELO cambio:\s*(-?\d+)\s*\(([^)]+)\)\./i)
    if (!match) return null

    return {
      xpGain: Number(match[1]),
      eloChange: Number(match[2]),
      result: String(match[3] || '').trim(),
    }
  }

  function formatRewardsCopy({ xpGain, eloChange, result }) {
    const eloSigned = eloChange > 0 ? `+${eloChange}` : String(eloChange)
    return `XP ganada: ${xpGain} | ELO cambio: ${eloSigned}${result ? ` (${result})` : ''}`
  }

  function renderCompletionRewardsCopy() {
    const rewardsFromStatus = getRewardsFromStatusMessage()
    if (rewardsFromStatus) {
      return formatRewardsCopy(rewardsFromStatus)
    }

    if (completionRewards.state === 'ready') {
      return formatRewardsCopy(completionRewards)
    }

    if (completionRewards.state === 'pending') {
      return ''
    }

    if (completionRewards.state === 'unavailable') {
      return 'Inicia sesión para registrar XP y ELO.'
    }

    if (completionRewards.state === 'failed') {
      return 'No se pudo sincronizar XP y ELO en este momento.'
    }

    return ''
  }

  const completionRewardsCopy = renderCompletionRewardsCopy()

  return (
    <main>
      <section className="games-list">
        <div className="game-header">
          <div>
            <h1 className="sudoku-page-title">Partida actual</h1>
            {availableOfficialTournament ? (
              <Link
                className="btn primary btn--tournament-signal sudoku-official-tournament-cta"
                to={`/torneos/${availableOfficialTournament._id}`}
              >
                TORNEO OFICIAL DISPONIBLE: click para inscribirte
              </Link>
            ) : null}
          </div>
        </div>

        <div className={`board-card sudoku-game-card${paused ? ' paused' : ''}`}>
          <div className="sudoku-top-row">
            <div className="difficulty-wrap">
              <label htmlFor="difficulty-select">Dificultad:</label>
              <DifficultySelect
                id="difficulty-select"
                value={difficultyKey}
                options={difficultyOptions}
                onChange={(nextDifficultyKey) => startNewGame(nextDifficultyKey, { closePreviousActive: true })}
              />
            </div>

            <div className="sudoku-top-right">
              <span className="timer-display">{formatSudokuTime(seconds)}</span>
              <span className="stat-chip">Errores: {errorCount}</span>
              <span className="stat-chip">Pistas: {hintsUsed}</span>
              <button className="btn ghost btn-pause" type="button" onClick={() => setPaused((current) => !current)}>
                {paused ? 'Reanudar' : 'Pausar'}
              </button>
              <button
                className="btn btn-new-game"
                type="button"
                onClick={() => startNewGame(difficultyKey, { closePreviousActive: true })}
              >
                Nuevo Juego
              </button>
            </div>
          </div>

          <div className="sudoku-main">
            <div className="sudoku-grid-wrap">
              <SudokuBoard ariaLabel="Tablero Sudoku" />
            </div>

            <SudokuControlsPanel
              noteMode={noteMode}
              highlightEnabled={highlightEnabled}
              hintCount={hintsUsed}
              onApplyValue={(num) => applyValue(num, noteMode)}
              onUndo={undoLastMove}
              onClearCell={clearSelectedCell}
              onHint={applyHint}
              showUndo
              undoDisabled={paused || completed || !canUndo}
              onToggleNoteMode={() => {
                if (paused || completed) return
                setNoteMode((current) => !current)
              }}
              onToggleHighlight={() => {
                if (paused || completed) return
                setHighlightEnabled((current) => !current)
              }}
              getNumberHidden={(num) => correctCounts[num] >= 9}
              getNumberDisabled={(num) => correctCounts[num] >= 9}
            />
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

            <p className={`status${statusOk ? ' ok' : ''}`}>{status}</p>
          </div>
        </div>
      </section>

      {paused ? (
        <div className="sudoku-pause-overlay" role="dialog" aria-modal="true">
          <div className="sudoku-pause-card">
            <h3 className="sudoku-pause-title">Juego en pausa</h3>
            <p className="sudoku-pause-text">El tiempo está detenido. Presiona reanudar para continuar.</p>
            <button className="btn primary sudoku-pause-resume-btn" type="button" onClick={() => setPaused(false)}>
              Reanudar
            </button>
          </div>
        </div>
      ) : null}

      {completed && !completionModalDismissed ? (
        <div
          className="sudoku-pause-overlay"
          role="alertdialog"
          aria-modal="true"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              handleDismissCompletionModal()
            }
          }}
        >
          <div className="sudoku-pause-card sudoku-completion-card">
            <h3 className="sudoku-pause-title">Sudoku completado</h3>
            <p className="sudoku-pause-text">Puntaje: {score}</p>
            <p className="sudoku-pause-text">
              Tiempo: {formatSudokuTime(seconds)} | Errores: {errorCount} | Pistas: {hintsUsed}
            </p>
            {completionRewardsCopy ? <p className="sudoku-pause-text">{completionRewardsCopy}</p> : null}
            <button
              className="btn ghost sudoku-pause-resume-btn"
              type="button"
              onClick={handleDismissCompletionModal}
            >
              Cerrar
            </button>
            <button
              className="btn primary sudoku-pause-resume-btn"
              type="button"
              onClick={() => startNewGame(difficultyKey, { closePreviousActive: false })}
            >
              Jugar otra vez
            </button>
          </div>
        </div>
      ) : null}

      {showResumePrompt ? (
        <div className="sudoku-pause-overlay" role="alertdialog" aria-modal="true">
          <div className="sudoku-pause-card sudoku-completion-card">
            <h3 className="sudoku-pause-title">Partida anterior detectada</h3>
            <p className="sudoku-pause-text">
              Encontramos una partida en curso
              {pendingResumeSnapshot?.difficultyLabel ? ` (${pendingResumeSnapshot.difficultyLabel})` : ''}.
            </p>
            <p className="sudoku-pause-text">
              Tiempo: {formatSudokuTime(Number(pendingResumeSnapshot?.seconds || 0))} | Errores:{' '}
              {Number(pendingResumeSnapshot?.errorCount || 0)} | Pistas usadas:{' '}
              {Number(pendingResumeSnapshot?.hintsUsed || 0)}
            </p>
            <div className="board-actions controls">
              <button className="btn primary" type="button" onClick={resumeSavedGame}>
                Continuar partida
              </button>
              <button className="btn ghost" type="button" onClick={discardSavedGame}>
                Iniciar una nueva
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showAchievementPopup ? (
        <div className="sudoku-pause-overlay" role="dialog" aria-modal="true">
          <div className="sudoku-pause-card sudoku-completion-card">
            <h3 className="sudoku-pause-title">Logros desbloqueados</h3>
            <ul>
              {achievementPopupItems.map((item) => (
                <li key={item.key}>
                  <strong>{item.icon}</strong> {item.title} - {item.description}
                </li>
              ))}
            </ul>
            <button className="btn primary sudoku-pause-resume-btn" type="button" onClick={() => setShowAchievementPopup(false)}>
              Cerrar
            </button>
          </div>
        </div>
      ) : null}
    </main>
  )
}

function SudokuPage() {
  return (
    <SudokuGameProvider>
      <SudokuPageContent />
    </SudokuGameProvider>
  )
}

export default SudokuPage
