import SudokuBoard from '../components/SudokuBoard.jsx'
import SudokuControlsPanel from '../components/SudokuControlsPanel.jsx'
import DifficultySelect from '../components/DifficultySelect.jsx'
import { SudokuGameProvider } from '../context/SudokuGameContext.jsx'
import { formatSudokuTime } from '../context/SudokuGameContext.jsx'
import { useLocalSudokuGame } from '../hooks/useLocalSudokuGame.js'
import { useLiveHeartbeat } from '../hooks/useLiveHeartbeat.js'
import { difficultyLevels } from '../lib/sudoku.js'

function SudokuPageContent() {
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

  return (
    <main>
      <section className="games-list">
        <div className="game-header">
          <div>
            <h1 className="sudoku-page-title">Partida actual</h1>
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

      {completed ? (
        <div className="sudoku-pause-overlay" role="alertdialog" aria-modal="true">
          <div className="sudoku-pause-card sudoku-completion-card">
            <h3 className="sudoku-pause-title">Sudoku completado</h3>
            <p className="sudoku-pause-text">Puntaje: {score}</p>
            <p className="sudoku-pause-text">
              Tiempo: {formatSudokuTime(seconds)} | Errores: {errorCount} | Pistas: {hintsUsed}
            </p>
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
