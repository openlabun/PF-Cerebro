import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { resolveConfig } from '../config.js'
import { useAuth } from '../context/AuthContext.jsx'
import { generatePvpBoard } from '../lib/pvpSudoku.js'
import { clearNotesCell, createEmptyNotes, toggleNote } from '../lib/sudoku.js'
import { apiClient } from '../services/apiClient.js'

function cloneNotes(notes) {
  return notes.map((row) => row.map((cell) => new Set(cell)))
}

function formatTime(totalSeconds) {
  const seconds = Math.max(0, Number(totalSeconds) || 0)
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  return `${mm}:${ss}`
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

function buildInviteLinkWithTournament(matchId, tournamentId) {
  const basePath = `${import.meta.env.BASE_URL || '/'}pvp/${matchId}`
  const params = new URLSearchParams({ join: '1' })
  if (tournamentId) params.set('torneoId', tournamentId)
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

function PvpMatchPage() {
  const navigate = useNavigate()
  const { matchId } = useParams()
  const [searchParams] = useSearchParams()
  const { session, user } = useAuth()
  const config = resolveConfig()

  const [match, setMatch] = useState(null)
  const [puzzle, setPuzzle] = useState([])
  const [solution, setSolution] = useState([])
  const [board, setBoard] = useState([])
  const [confirmedBoard, setConfirmedBoard] = useState([])
  const [invalidCells, setInvalidCells] = useState({})
  const [notes, setNotes] = useState(() => createEmptyNotes())
  const [selectedCell, setSelectedCell] = useState(null)
  const [noteMode, setNoteMode] = useState(false)
  const [highlightEnabled, setHighlightEnabled] = useState(true)
  const [status, setStatus] = useState('Conectando con la partida...')
  const [statusOk, setStatusOk] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submittingMove, setSubmittingMove] = useState(false)
  const [forfeiting, setForfeiting] = useState(false)
  const [errorCount, setErrorCount] = useState(0)
  const [clockNow, setClockNow] = useState(Date.now())
  const [redirectScheduled, setRedirectScheduled] = useState(false)
  const initializedBoardRef = useRef(false)
  const pollingInFlightRef = useRef(false)

  const c1AccessToken = session?.c1AccessToken || ''
  const c2AccessToken = session?.c2AccessToken || ''
  const shouldAutoJoin = searchParams.get('join') === '1'
  const tournamentId = searchParams.get('torneoId') || match?.torneoId || ''
  const inviteLink = useMemo(() => buildInviteLinkWithTournament(matchId, tournamentId), [matchId, tournamentId])
  const webhookReceiverUrl = config.PVP_WEBHOOK_RECEIVER_URL

  function setGameStatus(message, ok = false) {
    setStatus(message)
    setStatusOk(ok)
  }

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
    setGameStatus(message, true)
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
      const generated = generatePvpBoard(nextMatch.seed)
      setPuzzle(generated.puzzle)
      setSolution(generated.solution)
      const nextBoard = nextMatch.myGame.boardState.map((row) => [...row])
      setConfirmedBoard(nextBoard.map((row) => [...row]))
      setBoard(nextBoard)
      setNotes(createEmptyNotes())
      setSelectedCell((current) => current || findFirstEditableCell(generated.puzzle, nextBoard))
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
      if (!c1AccessToken || !c2AccessToken) return

      try {
        setLoading(true)
        await ensureWebhookSubscription()
        if (shouldAutoJoin) {
          await ensureTournamentJoined(tournamentId)
          await apiClient.joinPvpMatch(matchId, { tokenC1: c1AccessToken }, c2AccessToken)
          if (mounted) setGameStatus('Rival unido. Preparando partida...', true)
        }

        const nextMatch = await fetchMatch({ updateBoard: true, signal: controller.signal })
        if (!mounted) return

        if (nextMatch.estado === 'WAITING') {
          setGameStatus('Partida creada. Comparte el enlace y espera al rival.', true)
        } else if (nextMatch.estado === 'ACTIVE') {
          setGameStatus('Partida activa. Ya puedes comenzar a jugar.', true)
        }
      } catch (error) {
        if (!mounted || error?.name === 'AbortError') return
        if (shouldAutoJoin && tournamentId && isNotPlayerError(error)) {
          try {
            await ensureTournamentJoined(tournamentId)
            await apiClient.joinPvpMatch(matchId, { tokenC1: c1AccessToken }, c2AccessToken)
            const joinedMatch = await fetchMatch({ updateBoard: true, signal: controller.signal })
            if (!mounted) return
            setGameStatus(
              joinedMatch.estado === 'ACTIVE'
                ? 'Partida activa. Ya puedes comenzar a jugar.'
                : 'Rival unido. Esperando sincronizacion del match.',
              true,
            )
            return
          } catch (joinError) {
            if (!mounted || joinError?.name === 'AbortError') return
            setGameStatus(joinError.message || 'No se pudo unir al match.')
            return
          }
        }

        setGameStatus(error.message || 'No se pudo cargar la partida.')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    return () => {
      mounted = false
      controller.abort()
    }
  }, [c1AccessToken, c2AccessToken, matchId, shouldAutoJoin, tournamentId])

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
      setGameStatus('Enlace copiado al portapapeles.', true)
    } catch {
      setGameStatus('No se pudo copiar el enlace. Copialo manualmente.')
    }
  }

  function handleNoteInput(num) {
    if (!selectedCell || !board.length) return

    const { row, col } = selectedCell
    if (puzzle[row]?.[col] !== 0) {
      setGameStatus('No puedes poner notas en una celda fija.')
      return
    }

    const invalidReason = noteViolatesCurrentBoard(board, row, col, num)
    if (invalidReason) {
      setGameStatus(`No puedes agregar la nota ${num}: ${invalidReason}.`)
      return
    }

    setNotes((currentNotes) => {
      const nextNotes = cloneNotes(currentNotes)
      const result = toggleNote(nextNotes, board, row, col, num)
      if (!result.ok) return currentNotes
      setGameStatus(result.action === 'added' ? `Nota ${num} agregada.` : `Nota ${num} eliminada.`)
      return nextNotes
    })
  }

  async function applyValue(num, asNote = false) {
    if (!match || match.estado !== 'ACTIVE' || submittingMove) return
    if (!selectedCell) {
      setGameStatus('Selecciona una celda editable antes de jugar.')
      return
    }
    if (asNote) {
      handleNoteInput(num)
      return
    }

    const { row, col } = selectedCell
    const cellKey = `${row}-${col}`
    if (puzzle[row]?.[col] !== 0) {
      setGameStatus('No puedes modificar una celda fija.')
      return
    }
    if (confirmedBoard[row]?.[col] !== 0) {
      setGameStatus('Esa celda ya fue resuelta por ti.')
      return
    }

    setBoard((currentBoard) => {
      const nextBoard = currentBoard.map((line) => [...line])
      nextBoard[row][col] = num
      return nextBoard
    })
    setInvalidCells((current) => {
      const next = { ...current }
      delete next[cellKey]
      return next
    })
    setNotes((currentNotes) => {
      const nextNotes = cloneNotes(currentNotes)
      clearNotesCell(nextNotes, row, col)
      return nextNotes
    })

    if (solution[row]?.[col] !== num) {
      setInvalidCells((current) => ({
        ...current,
        [cellKey]: true,
      }))
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
        setGameStatus(error.message || 'No se pudo registrar la jugada.')
        return
      }
      setGameStatus('Movimiento incorrecto.')
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
      setConfirmedBoard((currentBoard) => {
        const nextBoard = currentBoard.map((line) => [...line])
        nextBoard[row][col] = num
        return nextBoard
      })
      setInvalidCells((current) => {
        const next = { ...current }
        delete next[cellKey]
        return next
      })

      if (result?.matchTerminado) {
        scheduleHomeRedirect('Sudoku completado. Volviendo al inicio...')
      } else {
        setGameStatus('Movimiento correcto.', true)
      }
      await fetchMatch()
    } catch (error) {
      setGameStatus(error.message || 'No se pudo registrar la jugada.')
    } finally {
      setSubmittingMove(false)
    }
  }

  async function playTestMove(kind) {
    if (!selectedCell || !match || match.estado !== 'ACTIVE' || submittingMove) return

    const { row, col } = selectedCell
    if (puzzle[row]?.[col] !== 0 || confirmedBoard[row]?.[col] !== 0) {
      setGameStatus('Selecciona una celda editable para la prueba.')
      return
    }

    if (kind === 'correct') {
      await applyValue(solution[row][col], false)
      return
    }

    const wrongValue = Array.from({ length: 9 }, (_, index) => index + 1).find(
      (candidate) => candidate !== solution[row][col],
    )
    if (!wrongValue) {
      setGameStatus('No se pudo generar una jugada incorrecta de prueba.')
      return
    }

    await applyValue(wrongValue, false)
  }

  async function handleForfeit() {
    if (!match || match.estado !== 'ACTIVE' || forfeiting) return

    setForfeiting(true)
    try {
      await apiClient.forfeitPvpMatch(matchId, c2AccessToken)
      setMatch((current) => (current ? { ...current, estado: 'FORFEIT' } : current))
    } catch (error) {
      setGameStatus(error.message || 'No se pudo abandonar la partida.')
    } finally {
      setForfeiting(false)
    }
  }

  const selectedValue = selectedCell ? board[selectedCell.row]?.[selectedCell.col] || 0 : 0
  const myGame = match?.myGame || null
  const opponent = match?.opponent || null
  const startedAt = match?.fechaInicio ? new Date(match.fechaInicio).getTime() : null
  const elapsedSeconds = startedAt ? Math.floor((clockNow - startedAt) / 1000) : 0
  const isWaiting = match?.estado === 'WAITING'
  const isActive = match?.estado === 'ACTIVE'

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
              <span className="difficulty-label">Jugador: {user?.email || 'Sesion activa'}</span>
              <span className="difficulty-label">Estado: {match?.estado || 'Cargando'}</span>
              <span className="difficulty-label">Tu puntaje: {myGame?.score ?? 0}</span>
              <span className="difficulty-label">Errores: {errorCount}</span>
            </div>

            <div className="sudoku-top-right">
              <span className="timer-display">{formatTime(elapsedSeconds)}</span>
              <span className="stat-chip">Rival: {opponent?.score ?? 0}</span>
              <span className="stat-chip">{opponent?.finished ? 'Rival listo' : 'Rival en juego'}</span>
              <button className="btn ghost btn-pause" type="button" onClick={() => navigate('/simulacion')}>
                Salir
              </button>
              <button className="btn btn-new-game" type="button" disabled={!isActive || forfeiting} onClick={handleForfeit}>
                {forfeiting ? 'Abandonando...' : 'Abandonar'}
              </button>
            </div>
          </div>

          {isWaiting ? (
            <div className="pvp-waiting-card">
              <h2>Esperando rival</h2>
              <p>Comparte este enlace para que otro jugador entre desde otro navegador.</p>
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
                <div className="board" role="grid" aria-label="Tablero PvP">
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
                      const isError = Boolean(invalidCells[`${rowIndex}-${colIndex}`])

                      const classNames = [
                        'cell',
                        isPrefilled ? 'prefilled' : '',
                        isSelected ? 'selected' : '',
                        isPeer ? 'highlight-peer' : '',
                        isSameValue ? 'highlight-same' : '',
                        isError ? 'error' : '',
                        notes[rowIndex]?.[colIndex]?.size ? 'has-notes' : '',
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
                          {value !== 0 ? (
                            <span>{value}</span>
                          ) : notes[rowIndex]?.[colIndex]?.size ? (
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
                          ) : null}
                        </button>
                      )
                    }),
                  )}
                </div>
              </div>

              <div className="sudoku-controls">
                <div className="keypad-nums" aria-label="Teclado numerico">
                  {Array.from({ length: 9 }, (_, index) => index + 1).map((num) => (
                    <button
                      key={num}
                      className="chip number"
                      type="button"
                      disabled={!isActive || submittingMove}
                      onClick={() => applyValue(num, noteMode)}
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <div className="board-actions controls icon-actions">
                  <button className="btn-control btn-icon-circle" type="button" onClick={() => setGameStatus('Partida en curso.', true)}>
                    <span className="btn-icon" aria-hidden="true">
                      OK
                    </span>
                  </button>
                  <button
                    className={`btn-control btn-icon-circle${noteMode ? ' active' : ''}`}
                    type="button"
                    aria-pressed={noteMode}
                    onClick={() => setNoteMode((current) => !current)}
                  >
                    <span className="btn-icon-badge notes-badge">{noteMode ? 'ON' : 'OFF'}</span>
                    <span className="btn-icon" aria-hidden="true">
                      N
                    </span>
                  </button>
                  <button
                    className="btn-control btn-icon-circle"
                    type="button"
                    onClick={() => {
                      if (!selectedCell) return
                      const { row, col } = selectedCell
                      if (puzzle[row]?.[col] !== 0 || confirmedBoard[row]?.[col] !== 0) return
                      setBoard((currentBoard) => {
                        const nextBoard = currentBoard.map((line) => [...line])
                        nextBoard[row][col] = 0
                        return nextBoard
                      })
                      setInvalidCells((current) => {
                        const next = { ...current }
                        delete next[`${row}-${col}`]
                        return next
                      })
                      setNotes((currentNotes) => {
                        const nextNotes = cloneNotes(currentNotes)
                        clearNotesCell(nextNotes, row, col)
                        return nextNotes
                      })
                      setGameStatus('Celda limpiada.')
                    }}
                  >
                    <span className="btn-icon" aria-hidden="true">
                      CLR
                    </span>
                  </button>
                </div>

                <div className="board-actions controls notes-actions">
                  <button
                    className={`btn-control${highlightEnabled ? ' active' : ''}`}
                    type="button"
                    aria-pressed={highlightEnabled}
                    onClick={() => setHighlightEnabled((current) => !current)}
                  >
                    Resaltar: {highlightEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="board-actions controls notes-actions">
                  <button className="btn-control" type="button" disabled={!isActive || submittingMove} onClick={() => playTestMove('correct')}>
                    Jugada correcta
                  </button>
                  <button className="btn-control" type="button" disabled={!isActive || submittingMove} onClick={() => playTestMove('incorrect')}>
                    Jugada incorrecta
                  </button>
                </div>

                <div className="pvp-opponent-card">
                  <h3>Rival</h3>
                  <p>Puntaje: {opponent?.score ?? 0}</p>
                  <p>Errores: {opponent?.mistakes ?? 0}</p>
                  <p>Celdas correctas: {opponent?.correctCells ?? 0}</p>
                  <p>{opponent?.finished ? 'Termino su tablero' : 'Sigue jugando'}</p>
                </div>
              </div>
            </div>
          )}

          <div className="sudoku-bottom">
            <p className={`status${statusOk ? ' ok' : ''}`}>{status}</p>
            <p className="mode-copy">
              Completa tu tablero y supera el progreso del rival.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

export default PvpMatchPage
