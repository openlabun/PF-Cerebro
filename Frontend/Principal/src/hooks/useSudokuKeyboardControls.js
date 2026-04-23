import { useEffect } from 'react'
import { cloneNotes } from '../context/SudokuGameContext.jsx'
import { clearNotesCell } from '../lib/sudoku.js'

function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) return false

  const tagName = target.tagName.toLowerCase()
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable
}

function shouldIgnoreKeyboardShortcut(target) {
  if (!(target instanceof HTMLElement)) return false
  if (target.closest('.board')) return false

  const tagName = target.tagName.toLowerCase()
  if (tagName === 'button' || tagName === 'a') return true

  const role = String(target.getAttribute('role') || '').toLowerCase()
  return role === 'button' || role === 'textbox' || role === 'combobox' || role === 'listbox'
}

function clampIndex(value, max) {
  return Math.max(0, Math.min(max, value))
}

function getInitialSelectedCell(board, puzzle) {
  for (let row = 0; row < board.length; row += 1) {
    const currentRow = board[row]
    if (!Array.isArray(currentRow)) continue
    for (let col = 0; col < currentRow.length; col += 1) {
      if (puzzle[row]?.[col] === 0) return { row, col }
    }
  }

  return { row: 0, col: 0 }
}

export function useSudokuKeyboardControls({
  board,
  puzzle,
  selectedCell,
  setSelectedCell,
  noteMode,
  isEnabled = true,
  onPauseToggle,
  onToggleNoteMode,
  onUndo,
  onApplyValue,
  onClearCell,
  onClearNotes,
  setNotes,
  setStatus,
}) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (!board.length || isTypingTarget(event.target) || shouldIgnoreKeyboardShortcut(event.target)) return

      if (typeof onPauseToggle === 'function' && event.key.toLowerCase() === 'p') {
        event.preventDefault()
        onPauseToggle()
        return
      }

      if (!isEnabled) return

      if (
        typeof onUndo === 'function' &&
        event.key.toLowerCase() === 'z' &&
        (event.ctrlKey || event.metaKey) &&
        !event.shiftKey &&
        !event.altKey
      ) {
        event.preventDefault()
        onUndo()
        return
      }

      if (
        (event.key === 'ArrowUp' ||
          event.key === 'ArrowDown' ||
          event.key === 'ArrowLeft' ||
          event.key === 'ArrowRight') &&
        typeof setSelectedCell === 'function'
      ) {
        event.preventDefault()
        const maxRow = Math.max(0, board.length - 1)
        const maxCol = Math.max(0, (board[0]?.length || 1) - 1)
        const current = selectedCell || getInitialSelectedCell(board, puzzle)

        let nextRow = current.row
        let nextCol = current.col
        if (event.key === 'ArrowUp') nextRow -= 1
        if (event.key === 'ArrowDown') nextRow += 1
        if (event.key === 'ArrowLeft') nextCol -= 1
        if (event.key === 'ArrowRight') nextCol += 1

        setSelectedCell({
          row: clampIndex(nextRow, maxRow),
          col: clampIndex(nextCol, maxCol),
        })
        return
      }

      if (typeof onToggleNoteMode === 'function' && event.key.toLowerCase() === 'n') {
        event.preventDefault()
        onToggleNoteMode()
        return
      }

      if (!selectedCell) return

      const { row, col } = selectedCell

      if (puzzle[row]?.[col] !== 0) return

      if (/^[1-9]$/.test(event.key)) {
        event.preventDefault()
        onApplyValue(Number(event.key), event.shiftKey || noteMode)
        return
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault()

        if (noteMode) {
          if (typeof onClearNotes === 'function') {
            onClearNotes()
            return
          }

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
    onClearNotes,
    onApplyValue,
    onClearCell,
    onUndo,
    onPauseToggle,
    onToggleNoteMode,
    puzzle,
    selectedCell,
    setSelectedCell,
    setNotes,
    setStatus,
  ])
}
