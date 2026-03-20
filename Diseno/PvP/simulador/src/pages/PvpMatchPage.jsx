import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import SudokuBoard from '../components/SudokuBoard.jsx'
import SudokuControlsPanel from '../components/SudokuControlsPanel.jsx'
import { resolveConfig } from '../config.js'
import {
  SudokuGameProvider,
  cloneNotes,
  formatSudokuTime,
  useSudokuGame,
} from '../context/SudokuGameContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { useSudokuKeyboardControls } from '../hooks/useSudokuKeyboardControls.js'
import { generatePvpBoard } from '../lib/pvpSudoku.js'
import { clearNotesCell, createEmptyNotes, getDifficultyByKey, getHintLimit } from '../lib/sudoku.js'
import { apiClient } from '../services/apiClient.js'

function buildInviteLink(matchId, { inviteToken = '', tournamentId = '', difficultyKey = '' } = {}) {
  const basePath = `${import.meta.env.BASE_URL || '/'}pvp/${matchId}`
  const params = new URLSearchParams({ join: '1' })
  const normalizedTournamentId = String(tournamentId || '').trim()
  const normalizedInviteToken = String(inviteToken || '').trim()
  const normalizedDifficultyKey = String(difficultyKey || '').trim()

  if (normalizedTournamentId) {
    params.set('torneoId', normalizedTournamentId)
  } else if (normalizedInviteToken) {
    params.set('inviteToken', normalizedInviteToken)
  }
  if (normalizedDifficultyKey) {
    params.set('difficultyKey', normalizedDifficultyKey)
  }

  return new URL(`${basePath}?${params.toString()}`, window.location.origin).toString()
}

function findFirstEditableCell(puzzle, boardState) {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (puzzle[row]?.[col] === 0 && boardState[row]?.[col] === 0) {
        return { row, col }
      }
    }
  }

  return null
}

function countEditableCells(puzzle) {
  return puzzle.reduce(
    (total, row) => total + row.reduce((rowTotal, value) => rowTotal + (value === 0 ? 1 : 0), 0),
    0,
  )
}

function countResolvedCells(puzzle, boardState) {
  if (!Array.isArray(boardState) || !boardState.length) return 0

  return boardState.reduce(
    (total, row, rowIndex) =>
      total +
      row.reduce(
        (rowTotal, value, colIndex) => rowTotal + (puzzle[rowIndex]?.[colIndex] === 0 && value !== 0 ? 1 : 0),
        0,
      ),
    0,
  )
}

function PvpMatchPageContent({ confirmedBoard, onConfirmedBoardChange }) {
  const navigate = useNavigate()
  const { matchId } = useParams()
  const [searchParams] = useSearchParams()
  const { session, user } = useAuth()
  const config = resolveConfig()

  const [match, setMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submittingMove, setSubmittingMove] = useState(false)
  const [forfeiting, setForfeiting] = useState(false)
  const [errorCount, setErrorCount] = useState(0)
  const [clockNow, setClockNow] = useState(Date.now())
  const [redirectScheduled, setRedirectScheduled] = useState(false)
  const initializedBoardRef = useRef(false)
  const pollingInFlightRef = useRef(false)
  const selectedCellRef = useRef(null)

  const {
    puzzle,
    solution,
    board,
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
    markCellError,
    clearCellError,
  } = useSudokuGame()

  const c1AccessToken = session?.c1AccessToken || ''
  const c2AccessToken = session?.c2AccessToken || ''
  const shouldAutoJoin = searchParams.get('join') === '1'
  const requestedInviteToken = searchParams.get('inviteToken') || ''
  const requestedTournamentId = searchParams.get('torneoId') || ''
  const requestedDifficultyKey = searchParams.get('difficultyKey') || ''
  const tournamentId = requestedTournamentId || match?.torneoId || ''
  const inviteToken = tournamentId ? '' : requestedInviteToken || match?.inviteToken || ''
  const difficultyKey = match?.difficultyKey || requestedDifficultyKey || ''
  const difficulty = difficultyKey ? getDifficultyByKey(difficultyKey) : null
  const hintLimit = difficulty ? getHintLimit(difficulty) : null
  const inviteLink = useMemo(
    () => buildInviteLink(matchId, { inviteToken, tournamentId, difficultyKey }),
    [difficultyKey, inviteToken, matchId, tournamentId],
  )
  const webhookReceiverUrl = config.PVP_WEBHOOK_RECEIVER_URL

  useEffect(() => {
    selectedCellRef.current = selectedCell
  }, [selectedCell])

  function updateLocalMyGame(mutator) {
    setMatch((current) => {
      if (!current?.myGame) return current
      return {
        ...current,
        myGame: mutator(current.myGame),
      }
    })
  }

  function scheduleHomeRedirect(message, delayMs = 300) {
    if (redirectScheduled) return
    setRedirectScheduled(true)
    setStatus(message, true)
    window.setTimeout(() => {
      navigate('/', { replace: true })
    }, delayMs)
  }

  function isAlreadyJoinedError(error) {
    const message = String(error?.message || '').toLowerCase()
    return message.includes('ya') && (message.includes('inscrito') || message.includes('registrado') || message.includes('unido'))
  }

  function isNotPlayerError(error) {
    const message = String(error?.message || '').toLowerCase()
    return message.includes('no eres jugador de este match')
  }

  async function ensureTournamentJoined(nextTournamentId) {
    if (!nextTournamentId) return

    const participants = await apiClient.getTournamentParticipants(nextTournamentId, c1AccessToken)
    const currentUserId = user?.sub || user?.id
    const alreadyJoined = (participants || []).some((participant) => participant?.usuarioId === currentUserId)
    if (alreadyJoined) return

    try {
      await apiClient.joinTournament(nextTournamentId, c1AccessToken)
    } catch (error) {
      if (!isAlreadyJoinedError(error)) throw error
    }
  }

  async function ensureWebhookSubscription() {
    const subscriptions = await apiClient.getPvpWebhookSubscriptions(c2AccessToken)
    const normalizedReceiver = webhookReceiverUrl.trim().replace(/\/+$/, '')
    const desiredEvents = ['match.started', 'player.finished', 'match.finished', 'player.forfeit', 'match.forfeit']

    const alreadySubscribed = (subscriptions || []).some((subscription) => {
      const currentUrl = String(subscription?.url || '').trim().replace(/\/+$/, '')
      const events = Array.isArray(subscription?.eventos) ? subscription.eventos : []
      return currentUrl === normalizedReceiver && desiredEvents.every((eventName) => events.includes(eventName))
    })

    if (alreadySubscribed) return

    await apiClient.subscribePvpWebhook(
      {
        url: normalizedReceiver,
        eventos: desiredEvents,
      },
      c2AccessToken,
    )
  }

  function applyMatchState(nextMatch, updateBoard = false) {
    setMatch(nextMatch)

    if ((!initializedBoardRef.current || updateBoard) && nextMatch?.myGame?.boardState?.length) {
      const matchDifficultyKey = nextMatch?.difficultyKey || requestedDifficultyKey || ''
      const generated = generatePvpBoard(nextMatch.seed, matchDifficultyKey)
      const nextBoard = nextMatch.myGame.boardState.map((row) => [...row])
      const currentSelectedCell = selectedCellRef.current
      const shouldKeepCurrentSelection =
        currentSelectedCell &&
        generated.puzzle[currentSelectedCell.row]?.[currentSelectedCell.col] === 0 &&
        nextBoard[currentSelectedCell.row]?.[currentSelectedCell.col] === 0
      onConfirmedBoardChange(nextBoard.map((row) => [...row]))
      hydrateGame({
        puzzle: generated.puzzle,
        solution: generated.solution,
        board: nextBoard,
        notes: createEmptyNotes(),
        selectedCell: shouldKeepCurrentSelection ? currentSelectedCell : findFirstEditableCell(generated.puzzle, nextBoard),
        noteMode: false,
        highlightEnabled: true,
        cellErrors: {},
      })
      initializedBoardRef.current = true
    }

    if (typeof nextMatch?.myGame?.mistakes === 'number') {
      setErrorCount(nextMatch.myGame.mistakes)
    }
  }

  async function fetchMatch({ updateBoard = false, signal } = {}) {
    const nextMatch = await apiClient.getPvpMatch(matchId, c2AccessToken, signal)
    applyMatchState(nextMatch, updateBoard)
    return nextMatch
  }

  useEffect(() => {
    let mounted = true
    const controller = new AbortController()

    async function init() {
      if (!c2AccessToken) return
      if (shouldAutoJoin && !requestedInviteToken && !requestedTournamentId) {
        if (mounted) {
          setLoading(false)
          setStatus('Este enlace de invitacion no es valido.')
        }
        return
      }

      try {
        setLoading(true)
        await ensureWebhookSubscription()
        if (shouldAutoJoin) {
          if (requestedTournamentId) {
            if (!c1AccessToken) {
              throw new Error('No hay sesion principal disponible para unirse a este match.')
            }
            await ensureTournamentJoined(requestedTournamentId)
            await apiClient.joinPvpMatch(matchId, { tokenC1: c1AccessToken }, c2AccessToken)
          } else {
            await apiClient.joinPvpMatch(matchId, { inviteToken: requestedInviteToken }, c2AccessToken)
          }
          if (mounted) setStatus('Rival unido. Preparando partida...', true)
        }

        const nextMatch = await fetchMatch({ updateBoard: true, signal: controller.signal })
        if (!mounted) return

        if (nextMatch.estado === 'WAITING') {
          setStatus('Partida creada. Comparte el enlace y espera al rival.', true)
        } else if (nextMatch.estado === 'ACTIVE') {
          setStatus('Partida activa. Ya puedes comenzar a jugar.', true)
        }
      } catch (error) {
        if (!mounted || error?.name === 'AbortError') return
        if (shouldAutoJoin && requestedTournamentId && isNotPlayerError(error)) {
          try {
            await ensureTournamentJoined(requestedTournamentId)
            await apiClient.joinPvpMatch(matchId, { tokenC1: c1AccessToken }, c2AccessToken)
            const joinedMatch = await fetchMatch({ updateBoard: true, signal: controller.signal })
            if (!mounted) return
            setStatus(
              joinedMatch.estado === 'ACTIVE'
                ? 'Partida activa. Ya puedes comenzar a jugar.'
                : 'Rival unido. Esperando sincronizacion del match.',
              true,
            )
            return
          } catch (joinError) {
            if (!mounted || joinError?.name === 'AbortError') return
            setStatus(joinError.message || 'No se pudo unir al match.')
            return
          }
        }

        setStatus(error.message || 'No se pudo cargar la partida.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    return () => {
      mounted = false
      controller.abort()
    }
  }, [c1AccessToken, c2AccessToken, matchId, requestedInviteToken, requestedTournamentId, shouldAutoJoin])

  useEffect(() => {
    if (!matchId || !c2AccessToken) return undefined

    const interval = window.setInterval(() => {
      if (pollingInFlightRef.current) return
      pollingInFlightRef.current = true
      fetchMatch()
        .catch(() => {})
        .finally(() => {
          pollingInFlightRef.current = false
        })
    }, 3000)

    return () => window.clearInterval(interval)
  }, [c2AccessToken, matchId])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setClockNow(Date.now())
    }, 1000)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!match || redirectScheduled) return
    if (match.estado !== 'FINISHED' && match.estado !== 'FORFEIT') return

    const isForfeit = match.estado === 'FORFEIT'
    scheduleHomeRedirect(
      isForfeit ? 'La partida termino por abandono. Volviendo al inicio...' : 'Partida finalizada. Volviendo al inicio...',
      isForfeit ? 250 : 2000,
    )
  }, [match, redirectScheduled])

  async function handleCopyInviteLink() {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setStatus('Enlace copiado al portapapeles.', true)
    } catch {
      setStatus('No se pudo copiar el enlace. Copialo manualmente.')
    }
  }

  async function applyValue(num, asNote = false) {
    if (!match || match.estado !== 'ACTIVE' || submittingMove) return
    if (!selectedCell) {
      setStatus('Selecciona una celda editable antes de jugar.')
      return
    }
    if (asNote) {
      toggleSelectedNote(num)
      return
    }

    const { row, col } = selectedCell
    if (puzzle[row]?.[col] !== 0) {
      setStatus('No puedes modificar una celda fija.')
      return
    }
    if (confirmedBoard[row]?.[col] !== 0) {
      setStatus('Esa celda ya fue resuelta por ti.')
      return
    }

    setBoard((currentBoard) => {
      const nextBoard = currentBoard.map((line) => [...line])
      nextBoard[row][col] = num
      return nextBoard
    })
    clearCellError(row, col)
    setNotes((currentNotes) => {
      const nextNotes = cloneNotes(currentNotes)
      clearNotesCell(nextNotes, row, col)
      return nextNotes
    })

    if (solution[row]?.[col] !== num) {
      markCellError(row, col, true)
      updateLocalMyGame((currentMyGame) => ({
        ...currentMyGame,
        score: (currentMyGame.score ?? 0) - 1,
        mistakes: (currentMyGame.mistakes ?? 0) + 1,
      }))
      setErrorCount((current) => current + 1)

      try {
        await apiClient.makePvpMove(
          matchId,
          { row, col, value: num, esCorrecta: false },
          c2AccessToken,
        )
      } catch (error) {
        updateLocalMyGame((currentMyGame) => ({
          ...currentMyGame,
          score: (currentMyGame.score ?? 0) + 1,
          mistakes: Math.max(0, (currentMyGame.mistakes ?? 0) - 1),
        }))
        setErrorCount((current) => Math.max(0, current - 1))
        setStatus(error.message || 'No se pudo registrar la jugada.')
        return
      }
      setStatus('Movimiento incorrecto.')
      return
    }

    setSubmittingMove(true)
    try {
      const result = await apiClient.makePvpMove(matchId, { row, col, value: num, esCorrecta: true }, c2AccessToken)
      updateLocalMyGame((currentMyGame) => ({
        ...currentMyGame,
        score: typeof result?.myScore === 'number' ? result.myScore : (currentMyGame.score ?? 0) + 1,
        mistakes: typeof result?.myMistakes === 'number' ? result.myMistakes : currentMyGame.mistakes ?? 0,
      }))
      if (typeof result?.myMistakes === 'number') {
        setErrorCount(result.myMistakes)
      }
      onConfirmedBoardChange((currentBoard) => {
        const nextBoard = currentBoard.map((line) => [...line])
        nextBoard[row][col] = num
        return nextBoard
      })
      clearCellError(row, col)

      if (result?.matchTerminado) {
        scheduleHomeRedirect('Sudoku completado. Volviendo al inicio...')
      } else {
        setStatus('Movimiento correcto.', true)
      }
      await fetchMatch()
    } catch (error) {
      setStatus(error.message || 'No se pudo registrar la jugada.')
    } finally {
      setSubmittingMove(false)
    }
  }

  async function handleForfeit() {
    if (!match || match.estado !== 'ACTIVE' || forfeiting) return

    setForfeiting(true)
    try {
      await apiClient.forfeitPvpMatch(matchId, c2AccessToken)
      setMatch((current) => (current ? { ...current, estado: 'FORFEIT' } : current))
    } catch (error) {
      setStatus(error.message || 'No se pudo abandonar la partida.')
    } finally {
      setForfeiting(false)
    }
  }

  function handleClearCell() {
    if (!selectedCell) return
    const didClear = clearSelectedCell()
    if (didClear) {
      clearCellError(selectedCell.row, selectedCell.col)
    }
  }

  function handleHintUnavailable() {
    if (!difficulty) {
      setStatus('Las pistas no estan disponibles en PvP.')
      return
    }

    setStatus(
      `Las pistas no estan disponibles en PvP. En single player, ${difficulty.label} permite ${hintLimit} pista(s).`,
    )
  }

  const myGame = match?.myGame || null
  const opponent = match?.opponent || null
  const startedAt = match?.fechaInicio ? new Date(match.fechaInicio).getTime() : null
  const elapsedSeconds = startedAt ? Math.floor((clockNow - startedAt) / 1000) : 0
  const isWaiting = match?.estado === 'WAITING'
  const isActive = match?.estado === 'ACTIVE'
  const editableCellCount = useMemo(() => countEditableCells(puzzle), [puzzle])
  const resolvedCellCount = useMemo(() => {
    if (typeof myGame?.correctCells === 'number') return myGame.correctCells
    return countResolvedCells(puzzle, confirmedBoard)
  }, [confirmedBoard, myGame?.correctCells, puzzle])
  const progressPercentage = editableCellCount > 0 ? Math.round((resolvedCellCount / editableCellCount) * 100) : 0

  useSudokuKeyboardControls({
    board,
    puzzle,
    selectedCell,
    noteMode,
    isEnabled: isActive && !submittingMove && !loading,
    onToggleNoteMode: () => setNoteMode((current) => !current),
    onApplyValue: applyValue,
    onClearCell: handleClearCell,
    setNotes,
    setStatus,
  })

  return (
    <main>
      <section className="games-list">
        <div className="game-header">
          <div>
            <p className="section-kicker">PvP</p>
            <h1 className="sudoku-page-title">Match {matchId}</h1>
          </div>
          <span className="stat-chip">Proxy PvP: {config.PVP_API_BASE_URL}</span>
        </div>

        <div className={`board-card sudoku-game-card pvp-game-card${loading ? ' is-loading' : ''}`}>
          <div className="sudoku-top-row">
            <div className="difficulty-wrap">
              <span className="difficulty-label">Dificultad: {difficulty?.label || 'Clasica'}</span>
              <span className="difficulty-label">
                Pistas en single player: {hintLimit ?? '--'}
              </span>
              <span className="difficulty-label">Jugador: {user?.email || 'Sesion activa'}</span>
              <span className="difficulty-label">Estado: {match?.estado || 'Cargando'}</span>
              <span className="difficulty-label">Tu puntaje: {myGame?.score ?? 0}</span>
              <span className="difficulty-label">Errores: {errorCount}</span>
            </div>

            <div className="sudoku-top-right">
              <span className="timer-display">{formatSudokuTime(elapsedSeconds)}</span>
              <span className="stat-chip">Rival: {opponent?.score ?? 0}</span>
              <span className="stat-chip">{opponent?.finished ? 'Rival listo' : 'Rival en juego'}</span>
              <button className="btn btn-new-game" type="button" disabled={!isActive || forfeiting} onClick={handleForfeit}>
                {forfeiting ? 'Abandonando...' : 'Abandonar'}
              </button>
            </div>
          </div>

          {isWaiting ? (
            <div className="pvp-waiting-card">
              <h2>Esperando rival</h2>
              <p>Comparte este enlace para que otro jugador entre desde otro navegador.</p>
              <p>
                Tablero configurado en {difficulty?.label || 'dificultad clasica'}.
                {difficulty ? ` En single player permite ${hintLimit} pista(s).` : ''}
              </p>
              <div className="pvp-invite-box">
                <code>{inviteLink}</code>
              </div>
              <div className="controls">
                <button className="btn primary" type="button" onClick={handleCopyInviteLink}>
                  Copiar enlace
                </button>
              </div>
            </div>
          ) : !match ? (
            <div className="pvp-waiting-card">
              <h2>Sincronizando match</h2>
              <p>Estamos esperando confirmar tu acceso a la partida.</p>
            </div>
          ) : (
            <div className="sudoku-main">
              <div className="sudoku-grid-wrap">
                <SudokuBoard ariaLabel="Tablero PvP" />
              </div>

              <SudokuControlsPanel
                noteMode={noteMode}
                highlightEnabled={highlightEnabled}
                hintCount={0}
                keypadDisabled={!isActive || submittingMove}
                clearDisabled={!isActive || submittingMove}
                noteDisabled={!isActive || submittingMove}
                onApplyValue={(num) => applyValue(num, noteMode)}
                onClearCell={handleClearCell}
                onHint={handleHintUnavailable}
                onToggleNoteMode={() => setNoteMode((current) => !current)}
                onToggleHighlight={() => setHighlightEnabled((current) => !current)}
              >
                <div className="pvp-opponent-card">
                  <h3>Rival</h3>
                  <p>Puntaje: {opponent?.score ?? 0}</p>
                  <p>Errores: {opponent?.mistakes ?? 0}</p>
                  <p>Celdas correctas: {opponent?.correctCells ?? 0}</p>
                  <p>{opponent?.finished ? 'Termino su tablero' : 'Sigue jugando'}</p>
                </div>
              </SudokuControlsPanel>
            </div>
          )}

          <div className="sudoku-bottom">
            {!isWaiting && match ? (
              <div className="progress-wrapper" aria-label="Progreso del tablero">
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${progressPercentage}%` }} />
                </div>
                <p className="progress-text">
                  {resolvedCellCount}/{editableCellCount} celdas correctas ({progressPercentage}%)
                </p>
              </div>
            ) : null}
            <p className={`status${statusOk ? ' ok' : ''}`}>{status}</p>
            <p className="mode-copy">Completa tu tablero y supera el progreso del rival.</p>
          </div>
        </div>
      </section>
    </main>
  )
}

function PvpMatchPage() {
  const [confirmedBoard, setConfirmedBoard] = useState([])

  function getEditableState({ row, col, puzzle }) {
    if (puzzle[row]?.[col] !== 0) {
      return { editable: false, message: 'No puedes modificar una celda fija.' }
    }
    if (confirmedBoard[row]?.[col] !== 0) {
      return { editable: false, message: 'Esa celda ya fue resuelta por ti.' }
    }

    return { editable: true, message: '' }
  }

  return (
    <SudokuGameProvider errorMode="tracked" getEditableState={getEditableState}>
      <PvpMatchPageContent confirmedBoard={confirmedBoard} onConfirmedBoardChange={setConfirmedBoard} />
    </SudokuGameProvider>
  )
}

export default PvpMatchPage





