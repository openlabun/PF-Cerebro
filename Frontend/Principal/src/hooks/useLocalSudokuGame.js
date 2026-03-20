import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { cloneNotes, useSudokuGame } from '../context/SudokuGameContext.jsx'
import { useSudokuKeyboardControls } from './useSudokuKeyboardControls.js'
import { apiClient } from '../services/apiClient.js'
import {
  calculateProgress,
  calculateScore,
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

const ACHIEVEMENT_BADGES = [
  { key: 'first-game', label: 'Primera partida', icon: '🏁', description: 'Completa tu primera partida de Sudoku.' },
  { key: 'five-games', label: '5 partidas', icon: '5', description: 'Completa 5 partidas de Sudoku.' },
  { key: 'ten-games', label: '10 partidas', icon: '10', description: 'Completa 10 partidas de Sudoku.' },
  { key: 'score-over-500', label: 'Puntaje >500', icon: '🏆', description: 'Alcanza un puntaje mayor a 500 en una partida.' },
]

function normalizeText(value) {
  return String(value || '').trim().toLowerCase()
}

function mapAchievementNameToBadgeKey(name) {
  const normalized = normalizeText(name)
  if (!normalized) return null
  if (normalized.includes('primera') && normalized.includes('partida')) return 'first-game'
  if (normalized.includes('5') && normalized.includes('partida')) return 'five-games'
  if (normalized.includes('10') && normalized.includes('partida')) return 'ten-games'
  if (normalized.includes('500') && normalized.includes('puntaje')) return 'score-over-500'
  return null
}

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
  const solution = generateSolution(seed)
  const puzzle = createPuzzle(solution, difficulty.holes, seed)

  return {
    difficulty,
    seed,
    solution,
    puzzle,
    board: puzzle.map((row) => [...row]),
    notes: createEmptyNotes(),
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
  const difficulty = getDifficultyByKey(difficultyKey)
  const { isAuthenticated, accessToken, isVerified, user } = useAuth()
  const latestMetricsRef = useRef({ seconds: 0, errorCount: 0, hintsUsed: 0 })
  const bestSudokuScoreRef = useRef(0)
  const achievementCatalogRef = useRef(new Map())

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
    setNoteMode,
    setHighlightEnabled,
    setStatus,
    clearSelectedCell,
    toggleSelectedNote,
  } = useSudokuGame()

  async function syncRemoteAchievementCatalog() {
    if (!accessToken) return

    try {
      const catalog = await apiClient.getAchievements(accessToken)
      const map = new Map()
      if (!Array.isArray(catalog)) {
        achievementCatalogRef.current = map
        return
      }

      catalog.forEach((item) => {
        const key = mapAchievementNameToBadgeKey(item?.nombre)
        if (!key || !item?._id) return
        map.set(key, String(item._id))
      })

      achievementCatalogRef.current = map
    } catch (error) {
      console.warn('No se pudo cargar el catalogo de logros:', error)
    }
  }

  async function getUnlockedKeysFromRemote() {
    if (!accessToken) return []

    try {
      if (achievementCatalogRef.current.size === 0) {
        await syncRemoteAchievementCatalog()
      }

      const myAchievements = await apiClient.getMyAchievements(accessToken)
      if (!Array.isArray(myAchievements)) return []

      const byId = new Map()
      achievementCatalogRef.current.forEach((logroId, key) => {
        byId.set(logroId, key)
      })

      return myAchievements
        .map((item) => byId.get(String(item?.logroId || '')))
        .filter(Boolean)
    } catch (error) {
      console.warn('No se pudieron consultar los logros del usuario:', error)
      return []
    }
  }

  async function unlockRemoteAchievements(unlockedKeys) {
    if (!accessToken) return
    const map = achievementCatalogRef.current
    if (map.size === 0) return

    const promises = Array.from(new Set(unlockedKeys))
      .map((badgeKey) => map.get(badgeKey))
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

    const previousUnlocked = new Set(unlockedBadges)
    bestSudokuScoreRef.current = Math.max(bestSudokuScoreRef.current, nextScore)

    const nextUnlocked = new Set(unlockedBadges)
    if (bestSudokuScoreRef.current > 500) nextUnlocked.add('score-over-500')

    try {
      const stats = await apiClient.getMyGameStats(accessToken, GAME_ID_SUDOKU)
      const partidasJugadas = Number(stats?.partidasJugadas || 0)
      const byRules = getUnlockedKeysByRules(partidasJugadas, bestSudokuScoreRef.current)
      byRules.forEach((key) => nextUnlocked.add(key))

      await syncRemoteAchievementCatalog()
      await unlockRemoteAchievements(nextUnlocked)

      const remoteKeys = await getUnlockedKeysFromRemote()
      remoteKeys.forEach((key) => nextUnlocked.add(key))

      setUnlockedBadges(nextUnlocked)

      const newlyUnlockedKeys = [...nextUnlocked].filter((key) => !previousUnlocked.has(key))
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
        setStatus(`No se pudo sincronizar tu progreso porque la cuenta ${user?.email || 'actual'} no esta verificada.`)
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
    if (!isAuthenticated || !accessToken) return

    let gameSession = null
    let eloChange = 0
    let resultado = 'victoria'
    let xpGain = 0
    let persistenceOk = false

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

      gameSession = await apiClient.createGameSession(accessToken, {
        juegoId: GAME_ID_SUDOKU,
        puntaje: nextScore,
        resultado,
        cambioElo: eloChange,
        tiempo: seconds,
        seedId: undefined,
        seed,
      })

      await apiClient.addExperience(accessToken, xpGain)
      persistenceOk = true
    } catch (error) {
      console.warn('No se pudo persistir la sesion de Sudoku:', error)
      if (isVerified === false) {
        setStatus(`No se pudo sincronizar puntaje, XP o ELO porque la cuenta ${user?.email || 'actual'} no esta verificada.`)
      }
    }

    await registerSudokuActivity(nextScore, gameSession)
    if (persistenceOk && (xpGain > 0 || eloChange !== 0)) {
      setStatus(`XP ganada: ${xpGain}. ELO cambio: ${eloChange} (${resultado}).`, true)
    }
  }

  function startNewGame(nextDifficultyKey = difficultyKey) {
    const nextGame = buildGame(nextDifficultyKey)
    setDifficultyKey(nextDifficultyKey)
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
    setStatus(`Selecciona una celda para comenzar. Limite de pistas: ${getHintLimit(nextGame.difficulty)}.`)
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

    void handleSudokuCompletion(nextScore)
  }

  useEffect(() => {
    startNewGame(difficultyLevels[2].key)
  }, [])

  useEffect(() => {
    latestMetricsRef.current = { seconds, errorCount, hintsUsed }
  }, [seconds, errorCount, hintsUsed])

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

  useSudokuKeyboardControls({
    board,
    puzzle,
    selectedCell,
    noteMode,
    isEnabled: !paused && !completed,
    onPauseToggle: () => setPaused((current) => !current),
    onToggleNoteMode: () => setNoteMode((current) => !current),
    onApplyValue: applyValue,
    onClearCell: clearSelectedCell,
    setNotes,
    setStatus,
  })

  function applyValue(num, asNote = false) {
    if (!selectedCell || paused || completed) return
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
    if (paused || completed) return

    const hintLimit = getHintLimit(difficulty)
    if (hintLimit <= 0) {
      setStatus('Esta dificultad no permite pistas.')
      return
    }

    if (hintsUsed >= hintLimit) {
      setStatus(`Ya alcanzaste el limite de ${hintLimit} pista(s) para esta dificultad.`)
      return
    }

    const result = getRandomHint(board, solution, seed + seconds + hintsUsed + 1)
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
  }
}

