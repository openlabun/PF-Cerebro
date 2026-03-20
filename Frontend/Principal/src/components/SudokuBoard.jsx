import { useSudokuGame } from '../context/SudokuGameContext.jsx'

function renderNotes(notes, rowIndex, colIndex, selectedValue) {
  return (
    <div className="notes-grid">
      {Array.from({ length: 9 }, (_, offset) => offset + 1).map((note) => (
        <div
          key={note}
          className={`note${selectedValue !== 0 && note === selectedValue ? ' highlight-same-note' : ''}`}
        >
          {notes[rowIndex][colIndex].has(note) ? note : ''}
        </div>
      ))}
    </div>
  )
}

function SudokuBoard({ ariaLabel = 'Tablero Sudoku' }) {
  const {
    puzzle,
    board,
    notes,
    selectedCell,
    selectedValue,
    highlightEnabled,
    isCellError,
    setSelectedCell,
  } = useSudokuGame()

  return (
    <div className="board" role="grid" aria-label={ariaLabel}>
      {board.map((rowValues, rowIndex) =>
        rowValues.map((value, colIndex) => {
          const isPrefilled = puzzle[rowIndex]?.[colIndex] !== 0
          const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex
          const isPeer =
            highlightEnabled &&
            selectedCell &&
            (selectedCell.row === rowIndex || selectedCell.col === colIndex)
          const isSameValue =
            highlightEnabled && selectedValue !== 0 && value !== 0 && value === selectedValue
          const hasNotes = notes[rowIndex]?.[colIndex]?.size > 0

          const classNames = [
            'cell',
            isPrefilled ? 'prefilled' : '',
            isSelected ? 'selected' : '',
            isPeer ? 'highlight-peer' : '',
            isSameValue ? 'highlight-same' : '',
            isCellError(rowIndex, colIndex, value) ? 'error' : '',
            hasNotes ? 'has-notes' : '',
            (colIndex + 1) % 3 === 0 && colIndex !== 8 ? 'block-right' : '',
            (rowIndex + 1) % 3 === 0 && rowIndex !== 8 ? 'block-bottom' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <button
              key={`${rowIndex}-${colIndex}`}
              className={classNames}
              type="button"
              onClick={() => setSelectedCell({ row: rowIndex, col: colIndex })}
            >
              {value !== 0 ? <span>{value}</span> : hasNotes ? renderNotes(notes, rowIndex, colIndex, selectedValue) : null}
            </button>
          )
        }),
      )}
    </div>
  )
}

export default SudokuBoard
