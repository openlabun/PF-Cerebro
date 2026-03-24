import { useEffect, useRef, useState } from 'react'
import { cloneNotes, useSudokuGame } from '../context/SudokuGameContext.jsx'
import { useSudokuKeyboardControls } from './useSudokuKeyboardControls.js'
import { apiClient } from '../services/apiClient.js'
import {
  calculateProgress,
  clearNotesCell,
  countCorrectByNumber,
  createEmptyNotes,
  createPuzzle,
  generateSolution,
  getDifficultyByKey,
  getHintLimit,
  getRandomHint,
  isBoardSolved,
} from '../lib/sudoku.js'

function parseTournamentSessionDate(value) {
  if (value instanceof Date) {
    const timestamp = value.getTime()
    return Number.isFinite(timestamp) ? timestamp : 0
  }

  const normalized = String(value || '').trim()
  if (!normalized) return 0

  const withTimeSeparator = normalized.includes(' ') ? normalized.replace(' ', 'T') : normalized
  const needsTimezone =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?$/.test(withTimeSeparator)

  const timestamp = Date.parse(needsTimezone ? `${withTimeSeparator}-05:00` : withTimeSeparator)
  return Number.isFinite(timestamp) ? timestamp : 0
}

function noteViolatesCurrentBoard(board, row, col, num) {
  for (let currentCol = 0; currentCol < 9; currentCol += 1) {
    if (currentCol !== col && board[row][currentCol] === num) return 'ya existe en la fila'
  }

  for (let currentRow = 0; currentRow < 9; currentRow += 1) {
    if (currentRow !== row && board[currentRow][col] === num) return 'ya existe en la columna'
  }

  const startRow = Math.floor(row / 3) * 3
  const startCol = Math.floor(col / 3) * 3
  for (let currentRow = startRow; currentRow < startRow + 3; currentRow += 1) {
    for (let currentCol = startCol; currentCol < startCol + 3; currentCol += 1) {
      if (currentRow === row && currentCol === col) continue
      if (board[currentRow][currentCol] === num) return 'ya existe en el bloque 3x3'
    }
  }

  return null
}

function removeCandidateFromPeerNotes(notes, row, col, num) {
  for (let currentCol = 0; currentCol < 9; currentCol += 1) {
    if (currentCol !== col) notes[row][currentCol].delete(num)
  }

  for (let currentRow = 0; currentRow < 9; currentRow += 1) {
    if (currentRow !== row) notes[currentRow][col].delete(num)
  }

  const startRow = Math.floor(row / 3) * 3
  const startCol = Math.floor(col / 3) * 3
  for (let currentRow = startRow; currentRow < startRow + 3; currentRow += 1) {
    for (let currentCol = startCol; currentCol < startCol + 3; currentCol += 1) {
      if (currentRow === row && currentCol === col) continue
      notes[currentRow][currentCol].delete(num)
    }
  }
}

function revalidateAllNotes(puzzle, board, notes) {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (puzzle[row][col] !== 0) continue
      for (const note of Array.from(notes[row][col])) {
        if (noteViolatesCurrentBoard(board, row, col, note)) {
          notes[row][col].delete(note)
        }
      }
    }
  }
}

function isValidBoardShape(board) {
  return (
    Array.isArray(board) &&
    board.length === 9 &&
    board.every(
      (row) =>
        Array.isArray(row) &&
        row.length === 9 &&
        row.every((cell) => Number.isInteger(cell) && cell >= 0 && cell <= 9),
    )
  )
}

function serializeNotes(notes) {
  return notes.map((row) => row.map((cell) => Array.from(cell)))
}

function deserializeNotes(value) {
  if (!Array.isArray(value) || value.length !== 9) {
    return createEmptyNotes()
  }

  return value.map((row) =>
    Array.isArray(row) && row.length === 9
      ? row.map((cell) => new Set(Array.isArray(cell) ? cell.map((item) => Number(item)).filter((item) => item >= 1 && item <= 9) : []))
      : Array.from({ length: 9 }, () => new Set()),
  )
}

function getStorageKey(sessionId) {
  return `cerebro:tournament-session:${sessionId}`
}

function safeReadSnapshot(sessionId) {
  if (!sessionId || typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(getStorageKey(sessionId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return parsed
  } catch {
    return null
  }
}

function clearSnapshot(sessionId) {
  if (!sessionId || typeof window === 'undefined') return
  window.localStorage.removeItem(getStorageKey(sessionId))
}

export function useTournamentSudokuGame({ tournamentId, accessToken }) {
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [pageStatus, setPageStatus] = useState('')
  const [tournament, setTournament] = useState(null)
  const [session, setSession] = useState(null)
  const [game, setGame] = useState(null)
  const [errorCount, setErrorCount] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [completedOutcome, setCompletedOutcome] = useState(null)
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [submissionRequested, setSubmissionRequested] = useState(false)

  const finishInFlightRef = useRef(false)
  const autoSubmittedRef = useRef(false)

  const {
    puzzle,
    solution,
    board,
    notes,
    selectedCell,
    noteMode,
    highlightEnabled,
    status,
    statusOk,
    hydrateGame,
    setBoard,
    setNotes,
    setNoteMode,
    setHighlightEnabled,
    setStatus,
    clearSelectedCell,
    toggleSelectedNote,
  } = useSudokuGame()

  const difficulty = game ? getDifficultyByKey(game.difficultyKey) : getDifficultyByKey('medio')
  const hintLimit = Number.isFinite(Number(game?.hintLimit)) ? Number(game.hintLimit) : getHintLimit(difficulty)
  const startedAtMs = parseTournamentSessionDate(session?.fechaInicio)
  const elapsedSeconds = startedAtMs ? Math.max(0, Math.floor((nowMs - startedAtMs) / 1000)) : 0
  const timeLimitSeconds = Number.isFinite(Number(game?.timeLimitSeconds)) ? Number(game.timeLimitSeconds) : null
  const timeRemainingSeconds =
    timeLimitSeconds === null ? null : Math.max(0, timeLimitSeconds - elapsedSeconds)
  const isCompleted = Boolean(completedOutcome)
  const controlsDisabled = loading || submissionRequested || isCompleted

  async function loadTournamentSession() {
    if (!tournamentId || !accessToken) {
      setLoading(false)
      setPageError('Necesitas una sesion valida para jugar este torneo.')
      return
    }

    setLoading(true)
    setPageError('')
    setPageStatus('')
    setSubmissionRequested(false)
    setCompletedOutcome(null)
    autoSubmittedRef.current = false
    finishInFlightRef.current = false

    try {
      const payload = await apiClient.startTournamentSession(tournamentId, accessToken)
      const nextTournament = payload?.tournament || null
      const nextSession = payload?.session || null
      const nextGame = payload?.game || null

      if (!nextTournament || !nextSession || !nextGame) {
        throw new Error('La respuesta del backend no trajo la sesion del torneo.')
      }

      const seed = String(nextSession.seed || nextGame.seed || '').trim()
      const solutionBoard = generateSolution(seed)
      const puzzleBoard = createPuzzle(solutionBoard, Number(nextGame.holes || difficulty.holes), seed)
      const snapshot = safeReadSnapshot(nextSession._id)

      const restoredBoard = isValidBoardShape(snapshot?.board) ? snapshot.board : puzzleBoard
      const restoredNotes = snapshot?.notes ? deserializeNotes(snapshot.notes) : createEmptyNotes()
      const restoredErrorCount = Math.max(0, Number(snapshot?.errorCount || 0))
      const restoredHintsUsed = Math.max(0, Number(snapshot?.hintsUsed || 0))
      const restoredNoteMode = snapshot?.noteMode === true
      const restoredHighlightEnabled = snapshot?.highlightEnabled !== false

      hydrateGame({
        puzzle: puzzleBoard,
        solution: solutionBoard,
        board: restoredBoard,
        notes: restoredNotes,
        selectedCell: null,
        noteMode: restoredNoteMode,
        highlightEnabled: restoredHighlightEnabled,
        cellErrors: {},
      })

      setTournament(nextTournament)
      setSession(nextSession)
      setGame(nextGame)
      setErrorCount(restoredErrorCount)
      setHintsUsed(restoredHintsUsed)
      setNowMs(Date.now())
      setPageStatus(
        payload?.resumed
          ? snapshot?.board
            ? 'Retomaste tu intento activo del torneo.'
            : 'Recuperamos tu sesion activa. El tablero reinicio desde la base porque no habia progreso local guardado.'
          : 'Sesion de torneo iniciada. Juega con las reglas oficiales del torneo.',
      )
    } catch (error) {
      setPageError(error.message || 'No se pudo iniciar la sesion del torneo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTournamentSession()
  }, [accessToken, tournamentId])

  useEffect(() => {
    if (!session?._id || !board.length || isCompleted) return

    const payload = {
      board,
      notes: serializeNotes(notes),
      errorCount,
      hintsUsed,
      noteMode,
      highlightEnabled,
    }

    window.localStorage.setItem(getStorageKey(session._id), JSON.stringify(payload))
  }, [board, errorCount, highlightEnabled, hintsUsed, isCompleted, noteMode, notes, session?._id])

  useEffect(() => {
    if (!session || isCompleted) return undefined

    const interval = window.setInterval(() => {
      setNowMs(Date.now())
    }, 1000)

    return () => window.clearInterval(interval)
  }, [isCompleted, session])

  async function finalizeGame() {
    if (!accessToken || !tournamentId || !session?._id || finishInFlightRef.current) {
      return
    }

    finishInFlightRef.current = true
    setSubmissionRequested(true)
    setPageError('')

    try {
      const payload = await apiClient.finishTournamentSession(
        tournamentId,
        session._id,
        {
          board,
          errorCount,
          hintsUsed,
        },
        accessToken,
      )

      setCompletedOutcome(payload)
      setSession(payload?.session || session)
      clearSnapshot(session._id)
      setPageStatus(
        payload?.outcome === 'EXPIRADA'
          ? 'El tiempo del torneo se agoto y el intento quedo cerrado.'
          : `Resultado registrado correctamente. Puntaje oficial: ${payload?.score ?? 0}.`,
      )
    } catch (error) {
      setPageError(error.message || 'No se pudo cerrar la partida del torneo.')
    } finally {
      finishInFlightRef.current = false
    }
  }

  useEffect(() => {
    if (!board.length || !solution.length || submissionRequested || isCompleted) return
    if (!isBoardSolved(board, solution)) return
    autoSubmittedRef.current = true
    void finalizeGame()
  }, [board, isCompleted, solution, submissionRequested])

  useEffect(() => {
    if (timeLimitSeconds === null || submissionRequested || isCompleted) return
    if (elapsedSeconds <= timeLimitSeconds) return
    if (autoSubmittedRef.current) return
    autoSubmittedRef.current = true
    void finalizeGame()
  }, [elapsedSeconds, isCompleted, submissionRequested, timeLimitSeconds])

  function applyValue(num, asNote = false) {
    if (!selectedCell || controlsDisabled) return
    if (asNote) {
      toggleSelectedNote(num)
      return
    }

    const { row, col } = selectedCell

    if (puzzle[row][col] !== 0) {
      setStatus('No puedes modificar una celda fija.')
      return
    }

    setBoard((currentBoard) => {
      const previousValue = currentBoard[row][col]
      const nextBoard = currentBoard.map((line) => [...line])
      nextBoard[row][col] = num

      setNotes((currentNotes) => {
        const nextNotes = cloneNotes(currentNotes)
        clearNotesCell(nextNotes, row, col)

        if (num === solution[row][col]) {
          removeCandidateFromPeerNotes(nextNotes, row, col, num)
          revalidateAllNotes(puzzle, nextBoard, nextNotes)
        }

        return nextNotes
      })

      if (num !== solution[row][col]) {
        setErrorCount((current) => {
          const next = previousValue !== num ? current + 1 : current
          setStatus(`Numero incorrecto. Errores: ${next}.`)
          return next
        })
        return nextBoard
      }

      setStatus('Movimiento aplicado')
      return nextBoard
    })
  }

  function applyHint() {
    if (controlsDisabled) return

    if (hintLimit <= 0) {
      setStatus('Este torneo no permite pistas.')
      return
    }

    if (hintsUsed >= hintLimit) {
      setStatus(`Ya alcanzaste el limite de ${hintLimit} pista(s) para este torneo.`)
      return
    }

    const result = getRandomHint(board, solution, Number(game?.seed || session?.seed || 1) + elapsedSeconds + hintsUsed + 1)
    if (!result.ok) {
      setStatus(result.message)
      return
    }

    setBoard((currentBoard) => {
      const nextBoard = currentBoard.map((line) => [...line])
      nextBoard[result.row][result.col] = result.value
      return nextBoard
    })

    setNotes((currentNotes) => {
      const nextNotes = cloneNotes(currentNotes)
      clearNotesCell(nextNotes, result.row, result.col)
      removeCandidateFromPeerNotes(nextNotes, result.row, result.col, result.value)
      const hintedBoard = board.map((line) => [...line])
      hintedBoard[result.row][result.col] = result.value
      revalidateAllNotes(puzzle, hintedBoard, nextNotes)
      return nextNotes
    })

    setHintsUsed((current) => current + 1)
    setStatus(`Pista aplicada. Pistas usadas: ${hintsUsed + 1}/${hintLimit}.`)
  }

  useSudokuKeyboardControls({
    board,
    puzzle,
    selectedCell,
    noteMode,
    isEnabled: !controlsDisabled,
    onToggleNoteMode: () => setNoteMode((current) => !current),
    onApplyValue: applyValue,
    onClearCell: clearSelectedCell,
    setNotes,
    setStatus,
  })

  const progress = puzzle.length ? calculateProgress(puzzle, board, solution) : { correct: 0, editable: 0, percentage: 0 }
  const correctCounts = solution.length ? countCorrectByNumber(board, solution) : Array(10).fill(0)

  return {
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
  }
}
