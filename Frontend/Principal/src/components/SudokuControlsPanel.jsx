import { EraseIcon, HintIcon, NotesIcon } from './SudokuControlIcons.jsx'

function defaultNumberVisibility() {
  return false
}

function defaultNumberDisabled() {
  return false
}

function SudokuControlsPanel({
  noteMode,
  highlightEnabled,
  onApplyValue,
  onClearCell,
  onToggleNoteMode,
  onToggleHighlight,
  onHint,
  keypadDisabled = false,
  clearDisabled = false,
  noteDisabled = false,
  highlightDisabled = false,
  hintDisabled = false,
  hintCount = 0,
  keypadLabel = 'Teclado numerico',
  getNumberHidden = defaultNumberVisibility,
  getNumberDisabled = defaultNumberDisabled,
  children,
}) {
  return (
    <div className="sudoku-controls">
      <div className="keypad-nums" aria-label={keypadLabel}>
        {Array.from({ length: 9 }, (_, index) => index + 1).map((num) => {
          const hidden = getNumberHidden(num)
          const disabled = keypadDisabled || hidden || getNumberDisabled(num)

          return (
            <button
              key={num}
              className={`chip number${hidden ? ' num-unavailable' : ''}`}
              type="button"
              disabled={disabled}
              onClick={() => onApplyValue(num)}
            >
              {num}
            </button>
          )
        })}
      </div>

      <div className="board-actions controls icon-actions">
        <button
          id="clear-cell"
          className="btn-control btn-icon-circle"
          type="button"
          aria-label="Borrar celda"
          title="Borrar"
          disabled={clearDisabled}
          onClick={onClearCell}
        >
          <EraseIcon />
        </button>
        <button
          id="toggle-notes"
          className={`btn-control btn-icon-circle${noteMode ? ' active' : ''}`}
          type="button"
          aria-pressed={noteMode}
          aria-label="Modo notas"
          title="Notas"
          disabled={noteDisabled}
          onClick={onToggleNoteMode}
        >
          <span className="btn-icon-badge notes-badge">{noteMode ? 'ON' : 'OFF'}</span>
          <NotesIcon />
        </button>
        <button
          id="hint"
          className="btn-control btn-icon-circle"
          type="button"
          aria-label="Pista"
          title="Pista"
          disabled={hintDisabled}
          onClick={onHint}
        >
          <span className="btn-icon-badge hint-badge">{hintCount}</span>
          <HintIcon />
        </button>
      </div>

      <div className="board-actions controls notes-actions">
        <button
          id="toggle-highlights"
          className={`btn-control${highlightEnabled ? ' active' : ''}`}
          type="button"
          aria-pressed={highlightEnabled}
          disabled={highlightDisabled}
          onClick={onToggleHighlight}
        >
          Resaltar: {highlightEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {children}
    </div>
  )
}

export default SudokuControlsPanel
