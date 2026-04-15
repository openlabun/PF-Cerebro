import { useEffect, useRef, useState } from 'react'
import { cloneNotes, useSudokuGame } from '../context/SudokuGameContext.jsx'
import { useSudokuKeyboardControls } from './useSudokuKeyboardControls.js'
import { apiClient } from '../services/apiClient.js'
import {
  calculateProgress,
  clearNotesCell,
  cloneBoard,
  countCorrectByNumber,
  createEmptyNotes,
  createPuzzle,
  generateSolution,
  getDifficultyByKey,
  isBoardSolved,
} from '../lib/sudoku.js'

function normalizeElapsedSeconds(value) {
  const normalized = Math.trunc(Number(value))
  return Number.isFinite(normalized) && normalized >= 0 ? normalized : 0
}

function parseTournamentSessionDate(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) return 0
    return value >= 1e12 ? value : value * 1000
  }

  if (value instanceof Date) {
    const timestamp = value.getTime()
    return Number.isFinite(timestamp) ? timestamp : 0
  }

  const normalized = String(value || '').trim()
  if (!normalized) return 0

  const aspNetMatch = normalized.match(/^\/Date\((\d+)\)\/$/)
  if (aspNetMatch) {
    const timestamp = Number(aspNetMatch[1])
    return Number.isFinite(timestamp) ? timestamp : 0
  }

  if (/^\d+$/.test(normalized)) {
    const timestamp = Number(normalized)
    if (!Number.isFinite(timestamp) || timestamp <= 0) return 0
    return timestamp >= 1e12 ? timestamp : timestamp * 1000
  }

  const withTimeSeparator = normalized.includes(' ') ? normalized.replace(' ', 'T') : normalized
  const withExpandedTimezone = withTimeSeparator.replace(/([+-]\d{2})(\d{2})$/, '$1:$2')
  const trimmedFractions = withExpandedTimezone.replace(/\.(\d{3})\d+/, '.$1')
  const hasExplicitTimezone = /(?:[zZ]|[+-]\d{2}:\d{2})$/.test(trimmedFractions)
  const needsTimezone =
    !hasExplicitTimezone &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(trimmedFractions)

  const timestamp = Date.parse(needsTimezone ? `${trimmedFractions}-05:00` : trimmedFractions)
  return Number.isFinite(timestamp) ? timestamp : 0
}

function getElapsedSecondsFromSessionStart(session, referenceMs = Date.now()) {
  const startedAtMs = parseTournamentSessionDate(session?.fechaInicio)
  if (!startedAtMs) return null

  return normalizeElapsedSeconds(Math.floor((referenceMs - startedAtMs) / 1000))
}

function getElapsedSecondsFromSnapshot(snapshot, referenceMs = Date.now()) {
  if (!snapshot || typeof snapshot !== 'object') return null

  const baseElapsedSeconds = normalizeElapsedSeconds(snapshot.elapsedSeconds)
  const savedAtMs = Number(snapshot.savedAtMs)
  if (!Number.isFinite(savedAtMs) || savedAtMs <= 0) {
    return baseElapsedSeconds
  }

  const extraElapsedSeconds = normalizeElapsedSeconds(Math.floor((referenceMs - savedAtMs) / 1000))
  return baseElapsedSeconds + extraElapsedSeconds
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

function buildSeriesBoards(game, session) {
  const resolvedDifficulty = getDifficultyByKey(game?.difficultyKey)
  const holes = Number(game?.holes || resolvedDifficulty?.holes || 40)
  const baseBoards =
    Array.isArray(game?.boards) && game.boards.length
      ? game.boards
      : [{ index: 1, seed: String(session?.seed || game?.seed || 1) }]

  return baseBoards.map((entry, index) => {
    const seed = String(entry?.seed || index + 1).trim() || String(index + 1)
    const solution = generateSolution(seed)
    const puzzle = createPuzzle(solution, holes, seed)

    return {
      index,
      position: Number(entry?.index) || index + 1,
      seed,
      puzzle,
      solution,
      board: cloneBoard(puzzle),
      notes: createEmptyNotes(),
      solved: false,
    }
  })
}

function cloneSeriesBoardEntry(entry) {
  return {
    ...entry,
    puzzle: cloneBoard(entry.puzzle),
    solution: cloneBoard(entry.solution),
    board: cloneBoard(entry.board),
    notes: cloneNotes(entry.notes),
  }
}

export function useTournamentSudokuGame({ tournamentId, accessToken }) {
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState('')
  const [pageStatus, setPageStatus] = useState('')
  const [tournament, setTournament] = useState(null)
  const [session, setSession] = useState(null)
  const [game, setGame] = useState(null)
  const [errorCount, setErrorCount] = useState(0)
  const [completedOutcome, setCompletedOutcome] = useState(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [submissionRequested, setSubmissionRequested] = useState(false)
  const [seriesBoards, setSeriesBoards] = useState([])
  const [currentBoardIndex, setCurrentBoardIndex] = useState(0)

  const finishInFlightRef = useRef(false)
  const autoSubmittedRef = useRef(false)
  const seriesBoardsRef = useRef([])
  const currentBoardIndexRef = useRef(0)

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

  useEffect(() => {
    seriesBoardsRef.current = seriesBoards
  }, [seriesBoards])

  useEffect(() => {
    currentBoardIndexRef.current = currentBoardIndex
  }, [currentBoardIndex])

  const difficulty = game ? getDifficultyByKey(game.difficultyKey) : getDifficultyByKey('medio')
  const timeLimitSeconds = Number.isFinite(Number(game?.timeLimitSeconds)) ? Number(game.timeLimitSeconds) : null
  const timeRemainingSeconds =
    timeLimitSeconds === null ? null : Math.max(0, timeLimitSeconds - elapsedSeconds)
  const isCompleted = Boolean(completedOutcome)
  const controlsDisabled = loading || submissionRequested || isCompleted

  function hydrateSeriesBoard(series, index, options = {}) {
    const target = series[index]
    if (!target) return

    hydrateGame({
      puzzle: cloneBoard(target.puzzle),
      solution: cloneBoard(target.solution),
      board: cloneBoard(target.board),
      notes: cloneNotes(target.notes),
      selectedCell: null,
      noteMode: options.noteMode ?? noteMode,
      highlightEnabled: options.highlightEnabled ?? highlightEnabled,
      cellErrors: {},
    })
  }

  function getLiveSeriesBoards() {
    return seriesBoardsRef.current.map((entry, index) => {
      if (index !== currentBoardIndexRef.current) {
        return cloneSeriesBoardEntry(entry)
      }

      const liveBoard = isValidBoardShape(board) ? cloneBoard(board) : cloneBoard(entry.board)
      const liveNotes = cloneNotes(notes)

      return {
        ...entry,
        board: liveBoard,
        notes: liveNotes,
        solved: isBoardSolved(liveBoard, entry.solution),
      }
    })
  }

  async function loadTournamentSession() {
    if (!tournamentId || !accessToken) {
      setLoading(false)
      setPageError('Necesitas una sesión válida para jugar este torneo.')
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
        throw new Error('La respuesta del backend no trajo la sesión del torneo.')
      }

      const baseSeriesBoards = buildSeriesBoards(nextGame, nextSession)
      const snapshot = safeReadSnapshot(nextSession._id)
      const snapshotBoards = Array.isArray(snapshot?.boards) ? snapshot.boards : []

      const restoredSeriesBoards = baseSeriesBoards.map((entry, index) => {
        const snapshotEntry = snapshotBoards[index]
        const restoredBoard = isValidBoardShape(snapshotEntry?.board) ? snapshotEntry.board : entry.board
        const restoredNotes = snapshotEntry?.notes ? deserializeNotes(snapshotEntry.notes) : entry.notes
        return {
          ...entry,
          board: restoredBoard,
          notes: restoredNotes,
          solved: isBoardSolved(restoredBoard, entry.solution),
        }
      })

      const snapshotCurrentBoardIndex = Number(snapshot?.currentBoardIndex)
      const firstPendingBoardIndex = restoredSeriesBoards.findIndex((entry) => !entry.solved)
      const resolvedCurrentBoardIndex =
        Number.isInteger(snapshotCurrentBoardIndex) &&
        snapshotCurrentBoardIndex >= 0 &&
        snapshotCurrentBoardIndex < restoredSeriesBoards.length &&
        restoredSeriesBoards[snapshotCurrentBoardIndex] &&
        !restoredSeriesBoards[snapshotCurrentBoardIndex].solved
          ? snapshotCurrentBoardIndex
          : firstPendingBoardIndex >= 0
            ? firstPendingBoardIndex
            : Math.max(0, restoredSeriesBoards.length - 1)
      const restoredErrorCount = Math.max(0, Number(snapshot?.errorCount || 0))
      const restoredNoteMode = snapshot?.noteMode === true
      const restoredHighlightEnabled = snapshot?.highlightEnabled !== false
      const restoredElapsedSeconds = Math.max(
        getElapsedSecondsFromSessionStart(nextSession) ?? 0,
        getElapsedSecondsFromSnapshot(snapshot) ?? 0,
      )

      setTournament(nextTournament)
      setSession(nextSession)
      setGame(nextGame)
      setSeriesBoards(restoredSeriesBoards)
      setCurrentBoardIndex(resolvedCurrentBoardIndex)
      setErrorCount(restoredErrorCount)
      setElapsedSeconds(restoredElapsedSeconds)
      hydrateSeriesBoard(restoredSeriesBoards, resolvedCurrentBoardIndex, {
        noteMode: restoredNoteMode,
        highlightEnabled: restoredHighlightEnabled,
      })
      setPageStatus(
        payload?.resumed
          ? snapshot?.boards?.length
            ? 'Retomaste tu serie activa del torneo.'
            : 'Recuperamos tu sesión activa. La serie reinició desde su estado base porque no había progreso local guardado.'
          : 'Sesión de torneo iniciada. Completa toda la serie oficial antes de que se agote el tiempo.',
      )
    } catch (error) {
      setPageError(error.message || 'No se pudo iniciar la sesión del torneo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTournamentSession()
  }, [accessToken, tournamentId])

  useEffect(() => {
    if (!seriesBoards.length || !board.length || !notes.length) return

    setSeriesBoards((current) =>
      current.map((entry, index) => {
        if (index !== currentBoardIndex) return entry

        const nextBoard = cloneBoard(board)
        const nextNotes = cloneNotes(notes)
        const solved = isBoardSolved(nextBoard, entry.solution)

        return {
          ...entry,
          board: nextBoard,
          notes: nextNotes,
          solved,
        }
      }),
    )
  }, [board, currentBoardIndex, notes, seriesBoards.length])

  useEffect(() => {
    if (!session?._id || !seriesBoards.length || isCompleted) return

    const liveSeriesBoards = getLiveSeriesBoards()
    const payload = {
      currentBoardIndex,
      boards: liveSeriesBoards.map((entry) => ({
        board: entry.board,
        notes: serializeNotes(entry.notes),
        solved: entry.solved,
      })),
      errorCount,
      elapsedSeconds,
      savedAtMs: Date.now(),
      noteMode,
      highlightEnabled,
    }

    window.localStorage.setItem(getStorageKey(session._id), JSON.stringify(payload))
  }, [
    board,
    currentBoardIndex,
    elapsedSeconds,
    errorCount,
    highlightEnabled,
    isCompleted,
    noteMode,
    notes,
    seriesBoards,
    session?._id,
  ])

  useEffect(() => {
    if (!session || isCompleted || submissionRequested) return undefined

    const interval = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1)
    }, 1000)

    return () => window.clearInterval(interval)
  }, [isCompleted, session, submissionRequested])

  async function finalizeGame(providedBoards) {
    if (!accessToken || !tournamentId || !session?._id || finishInFlightRef.current) {
      return
    }

    finishInFlightRef.current = true
    setSubmissionRequested(true)
    setPageError('')

    const boardsToSend = (providedBoards || getLiveSeriesBoards()).map((entry) => cloneBoard(entry.board))

    try {
      const payload = await apiClient.finishTournamentSession(
        tournamentId,
        session._id,
        {
          boards: boardsToSend,
          errorCount,
          hintsUsed: 0,
        },
        accessToken,
      )

      setCompletedOutcome(payload)
      setSession(payload?.session || session)
      if (Number.isFinite(Number(payload?.elapsedSeconds))) {
        setElapsedSeconds(normalizeElapsedSeconds(payload.elapsedSeconds))
      }
      clearSnapshot(session._id)
      setPageStatus(
        payload?.outcome === 'EXPIRADA'
          ? 'El tiempo del torneo se agotó y la serie quedó cerrada.'
          : `Resultado registrado correctamente. Puntaje oficial: ${payload?.score ?? 0}.`,
      )
    } catch (error) {
      setPageError(error.message || 'No se pudo cerrar la partida del torneo.')
    } finally {
      finishInFlightRef.current = false
    }
  }

  useEffect(() => {
    if (!seriesBoards.length || !board.length || !solution.length || submissionRequested || isCompleted) return
    if (!isBoardSolved(board, solution)) return

    const liveSeriesBoards = getLiveSeriesBoards().map((entry, index) =>
      index === currentBoardIndex
        ? {
            ...entry,
            board: cloneBoard(board),
            notes: cloneNotes(notes),
            solved: true,
          }
        : entry,
    )
    const nextPendingBoardIndex = liveSeriesBoards.findIndex((entry) => !entry.solved)

    setSeriesBoards(liveSeriesBoards)

    if (nextPendingBoardIndex === -1) {
      autoSubmittedRef.current = true
      void finalizeGame(liveSeriesBoards)
      return
    }

    setCurrentBoardIndex(nextPendingBoardIndex)
    hydrateSeriesBoard(liveSeriesBoards, nextPendingBoardIndex, {
      noteMode,
      highlightEnabled,
    })
    setPageStatus(
      `Tablero ${currentBoardIndex + 1} completado. Continua con el ${nextPendingBoardIndex + 1} de ${liveSeriesBoards.length}.`,
    )
  }, [
    board,
    currentBoardIndex,
    highlightEnabled,
    isCompleted,
    noteMode,
    notes,
    seriesBoards.length,
    solution,
    submissionRequested,
  ])

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
          setStatus(`Numero incorrecto. Errores acumulados: ${next}.`)
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
    setStatus('Este torneo no permite pistas.')
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

  const completedBoardCount = seriesBoards.reduce((total, entry, index) => {
    if (index === currentBoardIndex && board.length && solution.length) {
      return total + (isBoardSolved(board, solution) ? 1 : 0)
    }

    return total + (entry.solved ? 1 : 0)
  }, 0)
  const totalBoards = Number(game?.boardCount || seriesBoards.length || 0)
  const currentBoardNumber = totalBoards ? Math.min(currentBoardIndex + 1, totalBoards) : 0
  const currentSeriesBoard = seriesBoards[currentBoardIndex] || null
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
    currentBoardNumber,
    totalBoards,
    completedBoardCount,
    currentBoardSeed: currentSeriesBoard?.seed || null,
    loadTournamentSession,
    applyValue,
    applyHint,
    clearSelectedCell,
    setNoteMode,
    setHighlightEnabled,
    finalizeGame,
  }
}
