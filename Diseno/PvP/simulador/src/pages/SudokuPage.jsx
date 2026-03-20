import SudokuBoard from '../components/SudokuBoard.jsx'
import { SudokuGameProvider } from '../context/SudokuGameContext.jsx'
import { formatSudokuTime } from '../context/SudokuGameContext.jsx'
import { useLocalSudokuGame } from '../hooks/useLocalSudokuGame.js'

function SudokuPageContent() {
  const {
    difficulty,
    difficultyKey,
    paused,
    completed,
    seconds,
    errorCount,
    hintsUsed,
    score,
    seed,
    noteMode,
    highlightEnabled,
    status,
    statusOk,
    progress,
    correctCounts,
    hintLimit,
    showAchievementPopup,
    achievementPopupItems,
    streakMessage,
    setPaused,
    setNoteMode,
    setHighlightEnabled,
    setShowAchievementPopup,
    startNewGame,
    applyValue,
    applyHint,
    clearSelectedCell,
  } = useLocalSudokuGame()

  return (
    <main>
      <section className="games-list">
        <div className="game-header">
          <div>
            <p className="section-kicker">Simulacion base</p>
            <h1 className="sudoku-page-title">Sudoku listo para integrar en PvP</h1>
          </div>
          <span className="stat-chip">Jugador: tablero local</span>
        </div>

        <div className={`board-card sudoku-game-card${paused ? ' paused' : ''}`}>
          <div className="sudoku-top-row">
            <div className="difficulty-wrap">
              <label htmlFor="difficulty-select">Dificultad:</label>
              <select
                id="difficulty-select"
                className="difficulty-select"
                value={difficultyKey}
                onChange={(event) => startNewGame(event.target.value)}
              >
                {[
                  ['muy-facil', 'Principiante'],
                  ['facil', 'Iniciado'],
                  ['medio', 'Intermedio'],
                  ['dificil', 'Avanzado'],
                  ['experto', 'Experto'],
                  ['maestro', 'Profesional'],
                ].map(([key, label], index) => (
                  <option key={key} value={key}>
                    {index + 1}. {label}
                  </option>
                ))}
              </select>
              <span className="difficulty-label">Dificultad: {difficulty.label}</span>
            </div>

            <div className="sudoku-top-right">
              <span className="timer-display">{formatSudokuTime(seconds)}</span>
              <span className="stat-chip">Errores: {errorCount}</span>
              <span className="stat-chip">Pistas: {hintsUsed}</span>
              <button className="btn ghost btn-pause" type="button" onClick={() => setPaused((current) => !current)}>
                {paused ? 'Reanudar' : 'Pausar'}
              </button>
              <button className="btn btn-new-game" type="button" onClick={() => startNewGame(difficultyKey)}>
                Nuevo Juego
              </button>
            </div>
          </div>

          <div className="sudoku-main">
            <div className="sudoku-grid-wrap">
              <SudokuBoard ariaLabel="Tablero Sudoku" />
            </div>

            <div className="sudoku-controls">
              <div className="keypad-nums" aria-label="Teclado numerico">
                {Array.from({ length: 9 }, (_, index) => index + 1).map((num) => {
                  const unavailable = correctCounts[num] >= 9
                  return (
                    <button
                      key={num}
                      className={`chip number${unavailable ? ' num-unavailable' : ''}`}
                      type="button"
                      disabled={unavailable}
                      onClick={() => applyValue(num, noteMode)}
                    >
                      {num}
                    </button>
                  )
                })}
              </div>

              <div className="board-actions controls icon-actions">
                <button id="clear-cell" className="btn-control btn-icon-circle" type="button" onClick={clearSelectedCell}>
                  <span className="btn-icon" aria-hidden="true">
                    CLR
                  </span>
                </button>
                <button
                  id="toggle-notes"
                  className={`btn-control btn-icon-circle${noteMode ? ' active' : ''}`}
                  type="button"
                  aria-pressed={noteMode}
                  onClick={() => {
                    if (paused || completed) return
                    setNoteMode((current) => !current)
                  }}
                >
                  <span className="btn-icon-badge notes-badge">{noteMode ? 'ON' : 'OFF'}</span>
                  <span className="btn-icon" aria-hidden="true">
                    N
                  </span>
                </button>
                <button id="hint" className="btn-control btn-icon-circle" type="button" onClick={applyHint}>
                  <span className="btn-icon-badge hint-badge">{hintsUsed}</span>
                  <span className="btn-icon" aria-hidden="true">
                    H
                  </span>
                </button>
              </div>

              <div className="board-actions controls notes-actions">
                <button
                  id="toggle-highlights"
                  className={`btn-control${highlightEnabled ? ' active' : ''}`}
                  type="button"
                  aria-pressed={highlightEnabled}
                  onClick={() => {
                    if (paused || completed) return
                    setHighlightEnabled((current) => !current)
                  }}
                >
                  Resaltar: {highlightEnabled ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
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
            <p className="mode-copy">Seed: {seed} | Pistas maximas: {hintLimit} | Atajos: `N` notas, `P` pausa.</p>
          </div>
        </div>
      </section>

      {paused ? (
        <div className="sudoku-pause-overlay" role="dialog" aria-modal="true">
          <div className="sudoku-pause-card">
            <h3 className="sudoku-pause-title">Juego en pausa</h3>
            <p className="sudoku-pause-text">El tiempo esta detenido. Presiona reanudar para continuar.</p>
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
            <button className="btn primary sudoku-pause-resume-btn" type="button" onClick={() => startNewGame(difficultyKey)}>
              Jugar otra vez
            </button>
          </div>
        </div>
      ) : null}

      {streakMessage ? (
        <div className="sudoku-streak-note" role="status" aria-live="polite">
          {streakMessage}
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
