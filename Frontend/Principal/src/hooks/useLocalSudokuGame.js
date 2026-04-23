import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { cloneNotes, useSudokuGame } from '../context/SudokuGameContext.jsx'
import { useSudokuKeyboardControls } from './useSudokuKeyboardControls.js'
import { apiClient } from '../services/apiClient.js'
import {
  ACHIEVEMENT_ID_KEY_MAP,
  ACHIEVEMENT_KEY_ID_MAP,
} from '../lib/achievementIds.js'
import {
  calculateProgress,
  calculateScore,
  cloneBoard,
  clearNotesCell,
  countCorrectByNumber,
  createEmptyNotes,
  createPuzzle,
  difficultyLevels,
  generateSolution,
  getDifficultyByKey,
  getHintLimit,
  getRandomHint,
  isBoardSolved,
} from '../lib/sudoku.js'

const GAME_ID_SUDOKU = 'uVsB-k2rjora'
const STREAK_SESSION_WINDOW_MS = 28 * 60 * 60 * 1000
const ACTIVE_PROGRESS_SAVE_INTERVAL_MS = 30000
const UNDO_HISTORY_LIMIT = 200
const INITIAL_COMPLETION_REWARDS = {
  state: 'idle',
  xpGain: 0,
  eloChange: 0,
  result: '',
}

const ACHIEVEMENT_BADGES = [
  { key: 'first-game', label: 'Primera partida', icon: '🏁', description: 'Completa tu primera partida de Sudoku.' },
  { key: 'five-games', label: '5 partidas', icon: '5', description: 'Completa 5 partidas de Sudoku.' },
  { key: 'ten-games', label: '10 partidas', icon: '10', description: 'Completa 10 partidas de Sudoku.' },
  { key: 'score-over-500', label: 'Puntaje >500', icon: '🏆', description: 'Alcanza un puntaje mayor a 500 en una partida.' },
]

function getUnlockedKeysByRules(partidasJugadas = 0, bestScore = 0) {
  const unlocked = []
  if (partidasJugadas >= 1) unlocked.push('first-game')
  if (partidasJugadas >= 5) unlocked.push('five-games')
  if (partidasJugadas >= 10) unlocked.push('ten-games')
  if (bestScore > 500) unlocked.push('score-over-500')
  return unlocked
}

function toAchievementPopupItems(keys) {
  return Array.from(new Set(keys))
    .map((key) => ACHIEVEMENT_BADGES.find((badge) => badge.key === key))
    .filter(Boolean)
    .map((badge) => ({
      key: badge.key,
      icon: badge.icon,
      title: badge.label,
      description: badge.description,
    }))
}

function parseIsoDate(value) {
  const date = new Date(String(value || ''))
  if (Number.isNaN(date.getTime())) return null
  return date
}

function getSessionDayKey(value) {
  const date = parseIsoDate(value)
  if (!date) return null
  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
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

function buildGame(difficultyKey) {
  const difficulty = getDifficultyByKey(difficultyKey)
  const seed = Math.floor(Math.random() * 1_000_000)
  const holes = difficulty.holes
  const solution = generateSolution(seed)
  const puzzle = createPuzzle(solution, holes, seed)

  return {
    difficulty,
    seed,
    seedId: '',
    solution,
    puzzle,
    board: puzzle.map((row) => [...row]),
    notes: createEmptyNotes(),
  }
}

function buildTrackedGame(difficultyKey, remoteSeedConfig = null) {
  const difficulty = getDifficultyByKey(difficultyKey)
  const parsedSeed = Number(remoteSeedConfig?.seed)
  const seed = Number.isFinite(parsedSeed) ? parsedSeed : Math.floor(Math.random() * 1_000_000)
  const parsedHoles = Number(remoteSeedConfig?.huecos)
  const holes = Number.isFinite(parsedHoles) && parsedHoles >= 0 ? Math.floor(parsedHoles) : difficulty.holes
  const solution = generateSolution(seed)
  const puzzle = createPuzzle(solution, holes, seed)

  return {
    difficulty,
    seed,
    seedId: String(remoteSeedConfig?.seedId || '').trim(),
    solution,
    puzzle,
    board: puzzle.map((row) => [...row]),
    notes: createEmptyNotes(),
  }
}

function isValidSudokuMatrix(value) {
  if (!Array.isArray(value) || value.length !== 9) return false
  return value.every(
    (row) =>
      Array.isArray(row) &&
      row.length === 9 &&
      row.every((cell) => Number.isInteger(cell) && cell >= 0 && cell <= 9),
  )
}

function serializeNotes(notes) {
  if (!Array.isArray(notes) || notes.length !== 9) return []
  return notes.map((row) =>
    Array.isArray(row)
      ? row.map((cell) => {
          const values = Array.isArray(cell) ? cell : Array.from(cell || [])
          return values
            .map((value) => Number(value))
            .filter((value) => Number.isInteger(value) && value >= 1 && value <= 9)
            .sort((a, b) => a - b)
        })
      : [],
  )
}

function deserializeNotes(rawNotes) {
  const fallback = createEmptyNotes()
  if (!Array.isArray(rawNotes) || rawNotes.length !== 9) return fallback

  return rawNotes.map((row, rowIndex) =>
    Array.isArray(row) && row.length === 9
      ? row.map((cell, colIndex) => {
          if (!Array.isArray(cell)) return fallback[rowIndex][colIndex]
          const valid = cell
            .map((value) => Number(value))
            .filter((value) => Number.isInteger(value) && value >= 1 && value <= 9)
          return new Set(valid)
        })
      : fallback[rowIndex],
  )
}

function normalizeSelectedCell(cell) {
  if (!cell || typeof cell !== 'object') return null
  const row = Number(cell.row)
  const col = Number(cell.col)
  if (!Number.isInteger(row) || !Number.isInteger(col)) return null
  if (row < 0 || row > 8 || col < 0 || col > 8) return null
  return { row, col }
}

function normalizeProgressSnapshot(record) {
  const rawSnapshot = record?.snapshot
  const snapshot = (() => {
    if (!rawSnapshot) return null
    if (typeof rawSnapshot === 'object') return rawSnapshot
    if (typeof rawSnapshot !== 'string') return null
    try {
      const parsed = JSON.parse(rawSnapshot)
      return parsed && typeof parsed === 'object' ? parsed : null
    } catch {
      return null
    }
  })()

  if (!snapshot || typeof snapshot !== 'object') return null
  if (!isValidSudokuMatrix(snapshot.board)) return null
  if (!isValidSudokuMatrix(snapshot.puzzle)) return null
  if (!isValidSudokuMatrix(snapshot.solution)) return null

  const difficultyKey = String(snapshot.difficultyKey || '').trim() || difficultyLevels[2].key
  const resolvedDifficulty = getDifficultyByKey(difficultyKey)
  const notes = deserializeNotes(snapshot.notes)

  return {
    difficultyKey,
    difficultyLabel: String(snapshot.difficultyLabel || resolvedDifficulty.label).trim() || resolvedDifficulty.label,
    board: snapshot.board.map((row) => [...row]),
    puzzle: snapshot.puzzle.map((row) => [...row]),
    solution: snapshot.solution.map((row) => [...row]),
    notes,
    selectedCell: normalizeSelectedCell(snapshot.selectedCell),
    noteMode: Boolean(snapshot.noteMode),
    highlightEnabled: snapshot.highlightEnabled !== false,
    paused: Boolean(snapshot.paused),
    completed: Boolean(snapshot.completed),
    seconds: Math.max(0, Number(snapshot.seconds || 0)),
    errorCount: Math.max(0, Number(snapshot.errorCount || 0)),
    hintsUsed: Math.max(0, Number(snapshot.hintsUsed || 0)),
    hintLimit: Math.max(0, Number(snapshot.hintLimit || 0)),
    hintsRemaining: Math.max(0, Number(snapshot.hintsRemaining || 0)),
    seed: Number(snapshot.seed || 0) || 0,
    seedId: String(snapshot.seedId || '').trim(),
    statusMessage: String(snapshot.statusMessage || '').trim(),
  }
}

export function useLocalSudokuGame() {
  const [difficultyKey, setDifficultyKey] = useState(difficultyLevels[2].key)
  const [paused, setPaused] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [errorCount, setErrorCount] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [score, setScore] = useState(0)
  const [seed, setSeed] = useState(0)
  const [seedId, setSeedId] = useState('')
  const [showResumePrompt, setShowResumePrompt] = useState(false)
  const [pendingResumeSnapshot, setPendingResumeSnapshot] = useState(null)
  const difficulty = getDifficultyByKey(difficultyKey)
  const { isAuthenticated, accessToken, isVerified, user, isLoading } = useAuth()
  const latestMetricsRef = useRef({ seconds: 0, errorCount: 0, hintsUsed: 0 })
  const bestSudokuScoreRef = useRef(0)
  const gameLoadRequestRef = useRef(0)
  const didBootstrapGameRef = useRef(false)
  const prefetchedSeedByDifficultyRef = useRef(new Map())
  const seedPrefetchInFlightRef = useRef(new Map())
  const activeProgressStateRef = useRef({
    isAuthenticated: false,
    accessToken: '',
    difficultyKey: difficultyLevels[2].key,
    difficultyLabel: getDifficultyByKey(difficultyLevels[2].key).label,
    board: [],
    puzzle: [],
    solution: [],
    notes: [],
    selectedCell: null,
    noteMode: false,
    highlightEnabled: true,
    paused: false,
    completed: false,
    seconds: 0,
    errorCount: 0,
    hintsUsed: 0,
    seed: 0,
    seedId: '',
    status: '',
  })
  const undoHistoryRef = useRef([])
  const [canUndo, setCanUndo] = useState(false)
  const [completionRewards, setCompletionRewards] = useState(INITIAL_COMPLETION_REWARDS)

  const [unlockedBadges, setUnlockedBadges] = useState(new Set())
  const [showAchievementPopup, setShowAchievementPopup] = useState(false)
  const [achievementPopupItems, setAchievementPopupItems] = useState([])
  const [streakMessage, setStreakMessage] = useState('')

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
    setSelectedCell,
    setNoteMode,
    setHighlightEnabled,
    setStatus,
    clearSelectedCell,
    toggleSelectedNote,
  } = useSudokuGame()

  function clearUndoHistory() {
    undoHistoryRef.current = []
    setCanUndo(false)
  }

  function resetCompletionRewards() {
    setCompletionRewards({ ...INITIAL_COMPLETION_REWARDS })
  }

  function captureUndoSnapshot() {
    if (!board.length || !notes.length) return null
    return {
      board: cloneBoard(board),
      notes: cloneNotes(notes),
      selectedCell: selectedCell ? { row: selectedCell.row, col: selectedCell.col } : null,
    }
  }

  function pushUndoSnapshot(snapshot) {
    if (!snapshot) return
    const nextHistory = [...undoHistoryRef.current, snapshot]
    if (nextHistory.length > UNDO_HISTORY_LIMIT) {
      nextHistory.splice(0, nextHistory.length - UNDO_HISTORY_LIMIT)
    }
    undoHistoryRef.current = nextHistory
    setCanUndo(nextHistory.length > 0)
  }

  function undoLastMove() {
    if (paused || completed) return

    const previousSnapshot = undoHistoryRef.current[undoHistoryRef.current.length - 1]
    if (!previousSnapshot) {
      setCanUndo(false)
      setStatus('No hay movimientos para deshacer.')
      return
    }

    const nextHistory = undoHistoryRef.current.slice(0, -1)
    undoHistoryRef.current = nextHistory
    setCanUndo(nextHistory.length > 0)

    setBoard(cloneBoard(previousSnapshot.board))
    setNotes(cloneNotes(previousSnapshot.notes))
    setSelectedCell(previousSnapshot.selectedCell ? { ...previousSnapshot.selectedCell } : null)
    setStatus('Movimiento deshecho.', true)
  }

  function canPersistActiveProgressFromSnapshot(snapshot) {
    return Boolean(
      snapshot?.isAuthenticated &&
        snapshot?.accessToken &&
        Array.isArray(snapshot?.board) &&
        Array.isArray(snapshot?.puzzle) &&
        Array.isArray(snapshot?.solution) &&
        snapshot.board.length === 9 &&
        snapshot.puzzle.length === 9 &&
        snapshot.solution.length === 9 &&
        !snapshot?.completed,
    )
  }

  function canPersistActiveProgress() {
    return canPersistActiveProgressFromSnapshot({
      isAuthenticated,
      accessToken,
      board,
      puzzle,
      solution,
      completed,
    })
  }

  function buildActiveProgressPayload(snapshot = activeProgressStateRef.current) {
    const resolvedDifficulty = getDifficultyByKey(snapshot?.difficultyKey || difficultyLevels[2].key)
    const resolvedHintLimit = getHintLimit(resolvedDifficulty)
    const payload = {
      difficultyKey: snapshot?.difficultyKey || difficultyLevels[2].key,
      difficultyLabel: snapshot?.difficultyLabel || resolvedDifficulty.label,
      board: Array.isArray(snapshot?.board) ? snapshot.board.map((row) => [...row]) : [],
      puzzle: Array.isArray(snapshot?.puzzle) ? snapshot.puzzle.map((row) => [...row]) : [],
      solution: Array.isArray(snapshot?.solution) ? snapshot.solution.map((row) => [...row]) : [],
      notes: serializeNotes(snapshot?.notes),
      selectedCell: snapshot?.selectedCell ? { row: snapshot.selectedCell.row, col: snapshot.selectedCell.col } : null,
      noteMode: Boolean(snapshot?.noteMode),
      highlightEnabled: Boolean(snapshot?.highlightEnabled),
      paused: Boolean(snapshot?.paused),
      completed: Boolean(snapshot?.completed),
      seconds: Number(snapshot?.seconds || 0),
      errorCount: Number(snapshot?.errorCount || 0),
      hintsUsed: Number(snapshot?.hintsUsed || 0),
      hintLimit: Number(resolvedHintLimit || 0),
      hintsRemaining: Math.max(0, Number(resolvedHintLimit || 0) - Number(snapshot?.hintsUsed || 0)),
      seed: Number(snapshot?.seed || 0) || 0,
      seedId: String(snapshot?.seedId || '').trim(),
      statusMessage: String(snapshot?.status || ''),
    }

    return payload
  }

  async function saveActiveProgress(options = {}) {
    const snapshot = activeProgressStateRef.current
    if (!canPersistActiveProgressFromSnapshot(snapshot)) return
    const payload = buildActiveProgressPayload(snapshot)
    try {
      await apiClient.upsertActiveSudokuProgress(snapshot.accessToken, payload, {
        keepalive: Boolean(options.keepalive),
        skipAuthRefresh: Boolean(options.skipAuthRefresh),
      })
    } catch (error) {
      if (!options.silent) {
        console.warn('No se pudo guardar la partida activa de Sudoku:', error)
      }
    }
  }

  async function closeActiveProgress(estado = 'descartada', options = {}) {
    const snapshot = activeProgressStateRef.current
    if (!snapshot?.isAuthenticated || !snapshot?.accessToken) return
    try {
      await apiClient.closeActiveSudokuProgress(snapshot.accessToken, estado, {
        keepalive: Boolean(options.keepalive),
        skipAuthRefresh: Boolean(options.skipAuthRefresh),
      })
    } catch (error) {
      if (!options.silent) {
        console.warn(`No se pudo cerrar la partida activa (${estado}):`, error)
      }
    }
  }

  async function prefetchOfficialSeed(difficultyEntry) {
    if (!accessToken || !difficultyEntry?.key) return
    const difficultyKeyToFetch = String(difficultyEntry.key).trim()
    if (!difficultyKeyToFetch) return
    if (prefetchedSeedByDifficultyRef.current.has(difficultyKeyToFetch)) return
    if (seedPrefetchInFlightRef.current.has(difficultyKeyToFetch)) return

    const prefetchPromise = apiClient
      .getSudokuSeed(accessToken, difficultyEntry.label)
      .then((remoteSeedConfig) => {
        if (remoteSeedConfig) {
          prefetchedSeedByDifficultyRef.current.set(difficultyKeyToFetch, remoteSeedConfig)
        }
      })
      .catch(() => {
        // La seed oficial es opcional para no bloquear fluidez.
      })
      .finally(() => {
        seedPrefetchInFlightRef.current.delete(difficultyKeyToFetch)
      })

    seedPrefetchInFlightRef.current.set(difficultyKeyToFetch, prefetchPromise)
    await prefetchPromise
  }

  function hydrateFromSavedSnapshot(snapshot) {
    hydrateGame({
      puzzle: snapshot.puzzle,
      solution: snapshot.solution,
      board: snapshot.board,
      notes: snapshot.notes,
      selectedCell: snapshot.selectedCell,
      noteMode: snapshot.noteMode,
      highlightEnabled: snapshot.highlightEnabled,
      cellErrors: {},
    })

    setDifficultyKey(snapshot.difficultyKey)
    setPaused(Boolean(snapshot.paused))
    setCompleted(false)
    setSeconds(Number(snapshot.seconds || 0))
    setErrorCount(Number(snapshot.errorCount || 0))
    setHintsUsed(Number(snapshot.hintsUsed || 0))
    setScore(0)
    setSeed(Number(snapshot.seed || 0) || 0)
    setSeedId(String(snapshot.seedId || ''))
    setStatus(snapshot.statusMessage || 'Partida anterior reanudada.')
    clearUndoHistory()
    resetCompletionRewards()
  }

  function resumeSavedGame() {
    if (!pendingResumeSnapshot) return
    hydrateFromSavedSnapshot(pendingResumeSnapshot)
    setPendingResumeSnapshot(null)
    setShowResumePrompt(false)
    setStatus('Partida anterior reanudada.', true)
  }

  async function discardSavedGame() {
    setPendingResumeSnapshot(null)
    setShowResumePrompt(false)
    await closeActiveProgress('descartada', { silent: true })
    await startNewGame(difficultyLevels[2].key, { closePreviousActive: false })
  }

  async function getUnlockedKeysFromRemote() {
    if (!accessToken) return []

    try {
      const myAchievements = await apiClient.getMyAchievements(accessToken)
      if (!Array.isArray(myAchievements)) return []

      return myAchievements
        .map((item) => ACHIEVEMENT_ID_KEY_MAP[String(item?.logroId || '').trim()])
        .filter(Boolean)
    } catch (error) {
      console.warn('No se pudieron consultar los logros del usuario:', error)
      return []
    }
  }

  async function unlockRemoteAchievements(unlockedKeys) {
    if (!accessToken) return

    const promises = Array.from(new Set(unlockedKeys))
      .map((badgeKey) => ACHIEVEMENT_KEY_ID_MAP[badgeKey])
      .filter(Boolean)
      .map((logroId) =>
        apiClient.unlockAchievement(accessToken, logroId).catch((error) => {
          console.warn(`No se pudo desbloquear logro remoto ${logroId}:`, error)
          return null
        }),
      )

    await Promise.all(promises)
  }

  async function registerSudokuActivity(nextScore, gameSession) {
    if (!accessToken || !isAuthenticated) {
      return { recorded: false, newlyUnlockedAchievements: [] }
    }

    // Obtener logros antes de la partida desde backend
    let achievementsBefore = []
    try {
      achievementsBefore = await apiClient.getMyAchievements(accessToken)
    } catch (e) {
      achievementsBefore = []
    }
    const beforeIds = new Set(
      Array.isArray(achievementsBefore)
        ? achievementsBefore.map((item) => ACHIEVEMENT_ID_KEY_MAP[String(item?.logroId || '').trim()]).filter(Boolean)
        : []
    )

    bestSudokuScoreRef.current = Math.max(bestSudokuScoreRef.current, nextScore)
    const nextUnlocked = new Set(unlockedBadges)
    if (bestSudokuScoreRef.current > 500) nextUnlocked.add('score-over-500')

    try {
      const stats = await apiClient.getMyGameStats(accessToken, GAME_ID_SUDOKU)
      const partidasJugadas = Number(stats?.partidasJugadas || 0)
      const byRules = getUnlockedKeysByRules(partidasJugadas, bestSudokuScoreRef.current)
      byRules.forEach((key) => nextUnlocked.add(key))

      await unlockRemoteAchievements(nextUnlocked)

      // Obtener logros después de la partida desde backend
      let achievementsAfter = []
      try {
        achievementsAfter = await apiClient.getMyAchievements(accessToken)
      } catch (e) {
        achievementsAfter = []
      }
      const afterIds = new Set(
        Array.isArray(achievementsAfter)
          ? achievementsAfter.map((item) => ACHIEVEMENT_ID_KEY_MAP[String(item?.logroId || '').trim()]).filter(Boolean)
          : []
      )

      setUnlockedBadges(afterIds)

      // Solo mostrar popup si hay logros realmente nuevos
      const newlyUnlockedKeys = [...afterIds].filter((key) => !beforeIds.has(key))
      const newlyUnlockedAchievements = toAchievementPopupItems(newlyUnlockedKeys)
      if (newlyUnlockedAchievements.length > 0) {
        setAchievementPopupItems(newlyUnlockedAchievements)
        setShowAchievementPopup(true)
      }

      if (gameSession?.jugadoEn) {
        try {
          const currentPlayedAt = parseIsoDate(gameSession.jugadoEn) || new Date()
          const previousSession = await apiClient.getLatestGameSession(accessToken, GAME_ID_SUDOKU, {
            excludeSessionId: String(gameSession._id || ''),
          })

          const previousPlayedAt = parseIsoDate(previousSession?.jugadoEn)
          const currentSessionDayKey = getSessionDayKey(gameSession.jugadoEn)
          const previousSessionDayKey = getSessionDayKey(previousSession?.jugadoEn)
          const isSameSessionDay = currentSessionDayKey && previousSessionDayKey && currentSessionDayKey === previousSessionDayKey
          const elapsedMs = previousPlayedAt ? currentPlayedAt.getTime() - previousPlayedAt.getTime() : null
          const isWithinStreakWindow = elapsedMs !== null && elapsedMs <= STREAK_SESSION_WINDOW_MS

          const shouldReset = elapsedMs !== null && !isSameSessionDay && elapsedMs > STREAK_SESSION_WINDOW_MS
          const shouldIncrease = elapsedMs === null || shouldReset || (!isSameSessionDay && isWithinStreakWindow)

          if (shouldReset) {
            await apiClient.resetStreak(accessToken)
          }
          if (shouldIncrease) {
            await apiClient.increaseStreak(accessToken)
          }

          const refreshedProfile = await apiClient.getMyProfile(accessToken)
          const streak = Number(refreshedProfile?.rachaActual)
          if (!Number.isNaN(streak)) {
            setStreakMessage(`Racha actual: ${streak}`)
          }
        } catch (err) {
          console.warn('Error sincronizando racha:', err)
        }
      }

      return { recorded: true, newlyUnlockedAchievements }
    } catch (error) {
      console.warn('Error registrando actividad de Sudoku:', error)
      if (isVerified === false) {
        setStatus(`No se pudo sincronizar tu progreso porque la cuenta ${user?.email || 'actual'} no está verificada.`)
      }
      return { recorded: false, newlyUnlockedAchievements: [] }
    }
  }

  function getXpByDifficulty(nextScore, nextDifficulty) {
    const baseXp = Math.max(0, Math.floor(nextScore / 10))
    const multipliers = {
      Principiante: 1.0,
      Iniciado: 1.2,
      Intermedio: 1.5,
      Avanzado: 1.8,
      Experto: 2.1,
      Profesional: 2.5,
    }
    const multiplier = multipliers[nextDifficulty?.label] ?? 1.0
    return Math.max(1, Math.floor(baseXp * multiplier))
  }

  function getVirtualOpponentRating(nextDifficulty) {
    const map = {
      Principiante: 300,
      Iniciado: 500,
      Intermedio: 700,
      Avanzado: 900,
      Experto: 1100,
      Profesional: 1300,
    }
    return map[nextDifficulty?.label] ?? 700
  }

  function calculateExpectedScore(playerElo, opponentElo) {
    const diff = (opponentElo - playerElo) / 400
    return 1 / (1 + 10 ** diff)
  }

  function calculateEloDelta(playerElo, opponentElo, result) {
    const k = playerElo < 1200 ? 40 : playerElo < 1800 ? 30 : 20
    const expected = calculateExpectedScore(playerElo, opponentElo)
    const actual = result === 'victoria' ? 1 : result === 'derrota' ? 0 : 0.5
    return Math.round(k * (actual - expected))
  }

  function calculatePerformanceState({ seconds: totalSeconds, errorCount: totalErrors, hintsUsed: totalHints }, nextDifficulty) {
    const timeFactor = Math.min(1, 1 - totalSeconds / 900)
    const errorFactor = Math.max(0, 1 - totalErrors / 30)
    const hintFactor = Math.max(0, 1 - totalHints / 10)
    const basePerformance = (timeFactor + errorFactor + hintFactor) / 3

    const difficultyPenalty = {
      Principiante: 0.0,
      Iniciado: 0.04,
      Intermedio: 0.08,
      Avanzado: 0.12,
      Experto: 0.16,
      Profesional: 0.20,
    }

    return Math.max(0, basePerformance - (difficultyPenalty[nextDifficulty?.label] ?? 0.08))
  }

  async function handleSudokuCompletion(nextScore) {
    if (!isAuthenticated || !accessToken) {
      setCompletionRewards({
        state: 'unavailable',
        xpGain: 0,
        eloChange: 0,
        result: '',
      })
      return
    }

    let gameSession = null
    let eloChange = 0
    let resultado = 'victoria'
    let xpGain = 0
    let persistenceOk = false
    let computedRewards = false

    try {
      const stats = await apiClient.getMyGameStats(accessToken, GAME_ID_SUDOKU).catch(() => null)
      const currentElo = Number(stats?.elo || 0)
      const opponentElo = getVirtualOpponentRating(difficulty)
      const performance = calculatePerformanceState({ seconds, errorCount, hintsUsed }, difficulty)

      const isBadInPrincipiante = difficulty?.label === 'Principiante' && currentElo >= 500 && performance < 0.54
      resultado = performance < 0.5 || isBadInPrincipiante ? 'derrota' : 'victoria'

      eloChange = calculateEloDelta(currentElo, opponentElo, resultado)
      if (difficulty?.label === 'Principiante' && performance < 0.35 && currentElo > 600) {
        eloChange = Math.min(-5, eloChange)
        resultado = 'derrota'
      }

      xpGain = getXpByDifficulty(nextScore, difficulty)
      computedRewards = true
      setCompletionRewards({
        state: 'ready',
        xpGain,
        eloChange,
        result: resultado,
      })

      gameSession = await apiClient.createGameSession(accessToken, {
        juegoId: GAME_ID_SUDOKU,
        puntaje: nextScore,
        resultado,
        cambioElo: eloChange,
        tiempo: seconds,
        seedId: seedId || undefined,
        seed,
      })

      await apiClient.addExperience(accessToken, xpGain)
      persistenceOk = true
    } catch (error) {
      console.warn('No se pudo persistir la sesión de Sudoku:', error)
      if (error?.status === 401) {
        setStatus('No se pudo guardar la partida porque tu sesión expiró. Intenta iniciar sesión de nuevo.')
      } else if (isVerified === false) {
        setStatus(`No se pudo sincronizar puntaje, XP o ELO porque la cuenta ${user?.email || 'actual'} no está verificada.`)
      } else {
        setStatus('No se pudo sincronizar la partida en este momento. Intenta de nuevo en unos segundos.')
      }
    }

    await registerSudokuActivity(nextScore, gameSession)
    if (persistenceOk && (xpGain > 0 || eloChange !== 0)) {
      setStatus(`XP ganada: ${xpGain}. ELO cambio: ${eloChange} (${resultado}).`, true)
    }

    if (!computedRewards) {
      setCompletionRewards({
        state: 'failed',
        xpGain: 0,
        eloChange: 0,
        result: '',
      })
    }
  }

  async function startNewGame(nextDifficultyKey = difficultyKey, options = {}) {
    const closePreviousActive = options.closePreviousActive === true
    if (closePreviousActive && canPersistActiveProgress()) {
      void closeActiveProgress('descartada', { silent: true })
    }

    const requestId = gameLoadRequestRef.current + 1
    gameLoadRequestRef.current = requestId
    const nextDifficulty = getDifficultyByKey(nextDifficultyKey)

    setDifficultyKey(nextDifficultyKey)
    setStatus('Cargando tablero...')

    const cachedOfficialSeed = prefetchedSeedByDifficultyRef.current.get(nextDifficultyKey) || null
    if (cachedOfficialSeed) {
      prefetchedSeedByDifficultyRef.current.delete(nextDifficultyKey)
    }
    const nextGame = cachedOfficialSeed
      ? buildTrackedGame(nextDifficultyKey, cachedOfficialSeed)
      : buildGame(nextDifficultyKey)

    if (requestId !== gameLoadRequestRef.current) {
      return
    }

    hydrateGame({
      puzzle: nextGame.puzzle,
      solution: nextGame.solution,
      board: nextGame.board,
      notes: nextGame.notes,
      selectedCell: null,
      noteMode: false,
      highlightEnabled: true,
      cellErrors: {},
    })
    setPaused(false)
    setCompleted(false)
    setSeconds(0)
    setErrorCount(0)
    setHintsUsed(0)
    setScore(0)
    setSeed(nextGame.seed)
    setSeedId(nextGame.seedId || '')
    setPendingResumeSnapshot(null)
    setShowResumePrompt(false)
    clearUndoHistory()
    resetCompletionRewards()
    setStatus(`Selecciona una celda para comenzar. Limite de pistas: ${getHintLimit(nextGame.difficulty)}.`)

    if (accessToken) {
      void prefetchOfficialSeed(nextDifficulty)
    }
  }

  function finishGame(nextBoard = board) {
    const metrics = latestMetricsRef.current
    const nextScore = calculateScore({
      puzzle,
      board: nextBoard,
      solution,
      seconds: metrics.seconds,
      errorCount: metrics.errorCount,
      hintsUsed: metrics.hintsUsed,
      difficulty,
    })

    setCompleted(true)
    setScore(nextScore)
    setStatus(
      `Sudoku completado. Puntaje final: ${nextScore} (tiempo: ${metrics.seconds}s, errores: ${metrics.errorCount}, pistas: ${metrics.hintsUsed}).`,
      true,
    )
    setCompletionRewards({
      state: 'pending',
      xpGain: 0,
      eloChange: 0,
      result: '',
    })

    void closeActiveProgress('completada', { silent: true })
    void handleSudokuCompletion(nextScore)
  }

  useEffect(() => {
    if (isLoading) return
    if (didBootstrapGameRef.current) return
    didBootstrapGameRef.current = true

    let cancelled = false

    async function bootstrapGame() {
      if (isAuthenticated && accessToken) {
        try {
          const progressRecord = await apiClient.getActiveSudokuProgress(accessToken)
          const snapshot = normalizeProgressSnapshot(progressRecord)
          if (!cancelled && snapshot && !snapshot.completed) {
            setPendingResumeSnapshot(snapshot)
            setShowResumePrompt(true)
            setStatus('Encontramos una partida anterior pendiente. ¿Deseas continuarla?')
            return
          }
        } catch (error) {
          console.warn('No se pudo consultar partida activa de Sudoku:', error)
        }
      }

      if (!cancelled) {
        await startNewGame(difficultyLevels[2].key, { closePreviousActive: false })
      }
    }

    void bootstrapGame()

    return () => {
      cancelled = true
    }
  }, [isLoading, isAuthenticated, accessToken])

  useEffect(() => {
    latestMetricsRef.current = { seconds, errorCount, hintsUsed }
  }, [seconds, errorCount, hintsUsed])

  useEffect(() => {
    activeProgressStateRef.current = {
      isAuthenticated: Boolean(isAuthenticated),
      accessToken: accessToken || '',
      difficultyKey,
      difficultyLabel: difficulty.label,
      board,
      puzzle,
      solution,
      notes,
      selectedCell,
      noteMode: Boolean(noteMode),
      highlightEnabled: Boolean(highlightEnabled),
      paused: Boolean(paused),
      completed: Boolean(completed),
      seconds: Number(seconds || 0),
      errorCount: Number(errorCount || 0),
      hintsUsed: Number(hintsUsed || 0),
      seed: Number(seed || 0) || 0,
      seedId: String(seedId || '').trim(),
      status: String(status || ''),
    }
  }, [
    difficultyKey,
    difficulty.label,
    board,
    puzzle,
    solution,
    notes,
    selectedCell,
    noteMode,
    highlightEnabled,
    paused,
    completed,
    seconds,
    errorCount,
    hintsUsed,
    seed,
    seedId,
    status,
    isAuthenticated,
    accessToken,
  ])

  useEffect(() => {
    if (paused || completed || board.length === 0) return undefined

    const interval = window.setInterval(() => {
      setSeconds((current) => current + 1)
    }, 1000)

    return () => window.clearInterval(interval)
  }, [paused, completed, board.length])

  useEffect(() => {
    if (!board.length || completed || !solution.length) return
    if (!isBoardSolved(board, solution)) return
    finishGame(board)
  }, [board, completed, solution])

  useEffect(() => {
    if (!canPersistActiveProgress()) return undefined

    const interval = window.setInterval(() => {
      void saveActiveProgress({ silent: true })
    }, ACTIVE_PROGRESS_SAVE_INTERVAL_MS)

    return () => {
      window.clearInterval(interval)
    }
  }, [
    board.length,
    completed,
    isAuthenticated,
    accessToken,
    difficultyKey,
  ])

  useEffect(() => {
    if (!isAuthenticated || !accessToken) return undefined

    function handleBeforeUnload() {
      if (!canPersistActiveProgressFromSnapshot(activeProgressStateRef.current)) return
      void saveActiveProgress({
        keepalive: true,
        skipAuthRefresh: true,
        silent: true,
      })
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('pagehide', handleBeforeUnload)

    function handleVisibilityChange() {
      if (document.visibilityState !== 'hidden') return
      handleBeforeUnload()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('pagehide', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (canPersistActiveProgressFromSnapshot(activeProgressStateRef.current)) {
        void saveActiveProgress({ silent: true })
      }
    }
  }, [isAuthenticated, accessToken, board.length, completed, difficultyKey])

  useSudokuKeyboardControls({
    board,
    puzzle,
    selectedCell,
    setSelectedCell,
    noteMode,
    isEnabled: !paused && !completed,
    onPauseToggle: () => setPaused((current) => !current),
    onToggleNoteMode: () => setNoteMode((current) => !current),
    onUndo: undoLastMove,
    onApplyValue: applyValue,
    onClearCell: handleClearCell,
    onClearNotes: handleClearNotes,
    setNotes,
    setStatus,
  })

  function handleClearCell() {
    if (!selectedCell || paused || completed) return false
    const snapshot = captureUndoSnapshot()
    const didClear = clearSelectedCell()
    if (didClear) {
      pushUndoSnapshot(snapshot)
    }
    return didClear
  }

  function handleClearNotes() {
    if (!selectedCell || paused || completed) return false

    const { row, col } = selectedCell
    if (puzzle[row]?.[col] !== 0) return false
    const hadNotes = notes[row]?.[col]?.size > 0

    const snapshot = captureUndoSnapshot()

    setNotes((currentNotes) => {
      const nextNotes = cloneNotes(currentNotes)
      clearNotesCell(nextNotes, row, col)
      return nextNotes
    })

    if (hadNotes) {
      pushUndoSnapshot(snapshot)
      setStatus('Notas eliminadas.')
    }
    return hadNotes
  }

  function applyValue(num, asNote = false) {
    if (!selectedCell || paused || completed) return
    if (asNote) {
      const snapshot = captureUndoSnapshot()
      const updated = toggleSelectedNote(num)
      if (updated) {
        pushUndoSnapshot(snapshot)
      }
      return
    }

    const { row, col } = selectedCell

    if (puzzle[row][col] !== 0) {
      setStatus('No puedes modificar una celda fija.')
      return
    }

    const snapshot = captureUndoSnapshot()
    pushUndoSnapshot(snapshot)

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
    if (paused || completed) return

    const hintLimit = getHintLimit(difficulty)
    if (hintLimit <= 0) {
      setStatus('Esta dificultad no permite pistas.')
      return
    }

    if (hintsUsed >= hintLimit) {
      setStatus(`Ya alcanzaste el límite de ${hintLimit} pista(s) para esta dificultad.`)
      return
    }

    const result = getRandomHint(board, solution, seed + seconds + hintsUsed + 1)
    if (!result.ok) {
      setStatus(result.message)
      return
    }

    clearUndoHistory()

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

  const progress = puzzle.length
    ? calculateProgress(puzzle, board, solution)
    : { correct: 0, editable: 0, percentage: 0 }
  const correctCounts = solution.length ? countCorrectByNumber(board, solution) : Array(10).fill(0)
  const hintLimit = getHintLimit(difficulty)

  return {
    difficulty,
    difficultyKey,
    paused,
    completed,
    seconds,
    errorCount,
    hintsUsed,
    score,
    seed,
    completionRewards,
    noteMode,
    highlightEnabled,
    status,
    statusOk,
    progress,
    correctCounts,
    hintLimit,
    canUndo,
    showResumePrompt,
    pendingResumeSnapshot,
    showAchievementPopup,
    achievementPopupItems,
    streakMessage,
    setPaused,
    setNoteMode,
    setHighlightEnabled,
    setShowAchievementPopup,
    setShowResumePrompt,
    startNewGame,
    resumeSavedGame,
    discardSavedGame,
    applyValue,
    applyHint,
    undoLastMove,
    clearSelectedCell: handleClearCell,
  }
}

