import { useEffect } from 'react'
import { cloneNotes } from '../context/SudokuGameContext.jsx'
import { clearNotesCell } from '../lib/sudoku.js'

function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) return false

  const tagName = target.tagName.toLowerCase()
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable
}

export function useSudokuKeyboardControls({
  board,
  puzzle,
  selectedCell,
  noteMode,
  isEnabled = true,
  onPauseToggle,
  onToggleNoteMode,
  onApplyValue,
  onClearCell,
  setNotes,
  setStatus,
}) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (!board.length || isTypingTarget(event.target)) return

      if (typeof onPauseToggle === 'function' && event.key.toLowerCase() === 'p') {
        event.preventDefault()
        onPauseToggle()
        return
      }

      if (!isEnabled || !selectedCell) return

      const { row, col } = selectedCell

      if (typeof onToggleNoteMode === 'function' && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        onToggleNoteMode()
        return
      }

      if (puzzle[row]?.[col] !== 0) return

      if (/^[1-9]$/.test(event.key)) {
        event.preventDefault()
        onApplyValue(Number(event.key), event.shiftKey || noteMode)
        return
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault()

        if (noteMode) {
          setNotes((currentNotes) => {
            const nextNotes = cloneNotes(currentNotes)
            clearNotesCell(nextNotes, row, col)
            return nextNotes
          })
          setStatus('Notas eliminadas.')
          return
        }

        onClearCell()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    board,
    isEnabled,
    noteMode,
    onApplyValue,
    onClearCell,
    onPauseToggle,
    onToggleNoteMode,
    puzzle,
    selectedCell,
    setNotes,
    setStatus,
  ])
}
