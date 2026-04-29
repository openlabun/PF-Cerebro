import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  ActivityIndicator,
  Button,
  Chip,
  Dialog,
  Portal,
  ProgressBar,
  Text,
  useTheme,
} from "react-native-paper";

import { SudokuBoard } from "@/components/sudoku/SudokuBoard";
import { SudokuControlsPanel } from "@/components/sudoku/SudokuControlsPanel";
import { useAppTheme } from "@/constants/theme";
import {
  SudokuGameProvider,
  cloneNotes,
  formatSudokuTime,
  noteViolatesCurrentBoard,
  useSudokuGame,
} from "@/context";
import { useAuth } from "@/context";
import AuthRequiredPage from "@/pages/AuthRequiredPage";
import { appRoutes } from "@/routes";
import {
  apiClient,
  clearNotesCell,
  countCorrectByNumber,
  createEmptyNotes,
  generatePvpBoard,
  getDifficultyByKey,
  getHintLimit,
  type SudokuBoard as SudokuBoardType,
} from "@/services";

type PvpMatchRecord = Record<string, unknown>;
const MATCH_FETCH_TIMEOUT_MS = 8000;

function toRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseJsonLike<T = unknown>(value: T) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return value;
  }
}

function normalizeBoard(value: unknown): SudokuBoardType {
  const parsed = parseJsonLike(value);

  if (Array.isArray(parsed) && parsed.length === 9) {
    const normalizedRows = parsed.map((row) => {
      if (!Array.isArray(row) || row.length !== 9) {
        return null;
      }

      const normalizedRow = row.map((cell) => {
        const numericValue = Number(cell);
        return Number.isFinite(numericValue) ? numericValue : NaN;
      });

      return normalizedRow.every((cell) => Number.isFinite(cell)) ? normalizedRow : null;
    });

    if (normalizedRows.every((row) => Array.isArray(row))) {
      return normalizedRows as SudokuBoardType;
    }
  }

  const record = toRecord(parsed);
  if (!record) {
    return [];
  }

  return normalizeBoard(
    record.boardState ??
      record.board ??
      record.tablero ??
      record.currentBoard ??
      record.grid ??
      [],
  );
}

function findFirstEditableCell(puzzle: SudokuBoardType, boardState: SudokuBoardType) {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (puzzle[row]?.[col] === 0 && boardState[row]?.[col] === 0) {
        return { row, col };
      }
    }
  }

  return null;
}

function countEditableCells(puzzle: SudokuBoardType) {
  return puzzle.reduce(
    (total, row) =>
      total + row.reduce((rowTotal, value) => rowTotal + (value === 0 ? 1 : 0), 0),
    0,
  );
}

function countResolvedCells(puzzle: SudokuBoardType, boardState: SudokuBoardType) {
  if (!Array.isArray(boardState) || !boardState.length) return 0;

  return boardState.reduce(
    (total, row, rowIndex) =>
      total +
      row.reduce(
        (rowTotal, value, colIndex) =>
          rowTotal + (puzzle[rowIndex]?.[colIndex] === 0 && value !== 0 ? 1 : 0),
        0,
      ),
    0,
  );
}

function removeCandidateFromPeerNotes(
  notes: ReturnType<typeof createEmptyNotes>,
  row: number,
  col: number,
  num: number,
) {
  for (let currentCol = 0; currentCol < 9; currentCol += 1) {
    if (currentCol !== col) notes[row]?.[currentCol]?.delete(num);
  }

  for (let currentRow = 0; currentRow < 9; currentRow += 1) {
    if (currentRow !== row) notes[currentRow]?.[col]?.delete(num);
  }

  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let currentRow = startRow; currentRow < startRow + 3; currentRow += 1) {
    for (let currentCol = startCol; currentCol < startCol + 3; currentCol += 1) {
      if (currentRow === row && currentCol === col) continue;
      notes[currentRow]?.[currentCol]?.delete(num);
    }
  }
}

function revalidateAllNotes(
  puzzle: SudokuBoardType,
  board: SudokuBoardType,
  notes: ReturnType<typeof createEmptyNotes>,
) {
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      if (puzzle[row]?.[col] !== 0) continue;
      for (const note of Array.from(notes[row]?.[col] ?? [])) {
        if (noteViolatesCurrentBoard(board, row, col, note)) {
          notes[row]?.[col]?.delete(note);
        }
      }
    }
  }
}

function toText(value: unknown, fallback = "") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function unwrapMatchPayload(payload: unknown): PvpMatchRecord | null {
  const parsed = parseJsonLike(payload);
  const record = toRecord(parsed);

  if (!record) {
    return null;
  }

  if (toText(record._id) || toText(record.id)) {
    return record;
  }

  const nestedCandidates = [
    record.match,
    record.partida,
    record.payload,
    record.result,
    record.data,
  ];

  for (const candidate of nestedCandidates) {
    const nestedMatch = unwrapMatchPayload(candidate);
    if (nestedMatch) {
      return nestedMatch;
    }
  }

  return record;
}

function getMyGameRecord(match: PvpMatchRecord | null) {
  return (
    toRecord(match?.myGame) ??
    toRecord(match?.miJuego) ??
    toRecord(match?.playerGame) ??
    toRecord(match?.game)
  );
}

function getOpponentRecord(match: PvpMatchRecord | null) {
  return (
    toRecord(match?.opponent) ??
    toRecord(match?.rival) ??
    toRecord(match?.oponente)
  );
}

function getMatchStatus(match: PvpMatchRecord | null) {
  const rawStatus = toText(match?.estado || match?.status || match?.matchStatus).toUpperCase();

  if (["WAITING", "PENDING", "ESPERANDO"].includes(rawStatus)) {
    return "WAITING";
  }
  if (["ACTIVE", "ACTIVO", "IN_PROGRESS"].includes(rawStatus)) {
    return "ACTIVE";
  }
  if (["FINISHED", "FINALIZADO", "COMPLETED"].includes(rawStatus)) {
    return "FINISHED";
  }
  if (["FORFEIT", "ABANDONED", "ABANDONO"].includes(rawStatus)) {
    return "FORFEIT";
  }

  return rawStatus;
}

function getMatchDifficultyKey(match: PvpMatchRecord | null) {
  const difficultyRecord =
    toRecord(match?.difficulty) ??
    toRecord(match?.nivel) ??
    toRecord(match?.difficultyLevel);

  return toText(
    match?.difficultyKey ||
      match?.dificultadClave ||
      match?.difficultySlug ||
      difficultyRecord?.key ||
      difficultyRecord?.difficultyKey ||
      difficultyRecord?.slug,
  );
}

function getMatchSeed(match: PvpMatchRecord | null) {
  const candidates = [
    match?.seed,
    match?.sudokuSeed,
    getMyGameRecord(match)?.seed,
    getMyGameRecord(match)?.sudokuSeed,
  ];

  for (const candidate of candidates) {
    const numericValue = Number(candidate);
    if (Number.isFinite(numericValue) && numericValue > 0) {
      return numericValue;
    }
  }

  return 1;
}

function findJoinCode(match: PvpMatchRecord | null) {
  return (
    toText(match?.joinCode) ||
    toText(match?.inviteToken) ||
    toText(match?.codigoIngreso) ||
    toText(match?.codigoAcceso)
  );
}

function getMyBoardState(match: PvpMatchRecord | null) {
  const myGame = getMyGameRecord(match);
  const candidates = [
    normalizeBoard(myGame?.boardState),
    normalizeBoard(myGame?.board),
    normalizeBoard(match?.boardState),
    normalizeBoard(match?.board),
  ];

  return candidates.find((board) => board.length > 0) ?? [];
}

function getMyGameMistakes(match: PvpMatchRecord | null) {
  const myGame = getMyGameRecord(match);
  return Number(myGame?.mistakes ?? myGame?.errores ?? match?.mistakes ?? match?.errores) || 0;
}

function getMyGameScore(match: PvpMatchRecord | null) {
  const myGame = getMyGameRecord(match);
  return Number(myGame?.score ?? myGame?.puntaje ?? match?.score ?? match?.puntaje) || 0;
}

function PvpMatchPageContent({
  confirmedBoard,
  onConfirmedBoardChange,
}: {
  confirmedBoard: SudokuBoardType;
  onConfirmedBoardChange: React.Dispatch<React.SetStateAction<SudokuBoardType>>;
}) {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ matchId?: string | string[] }>();
  const theme = useAppTheme();
  const paperTheme = useTheme();
  const { isAuthenticated, isLoading, session, user } = useAuth();

  const [match, setMatch] = useState<PvpMatchRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingMove, setSubmittingMove] = useState(false);
  const [forfeiting, setForfeiting] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [clockNow, setClockNow] = useState(Date.now());
  const [winnerDialogVisible, setWinnerDialogVisible] = useState(false);

  const initializedBoardRef = useRef(false);
  const pollingInFlightRef = useRef(false);
  const selectedCellRef = useRef<{ row: number; col: number } | null>(null);
  const winnerDialogShownRef = useRef(false);
  const allowExitRef = useRef(false);

  const {
    puzzle,
    solution,
    board,
    notes,
    selectedCell,
    selectedValue,
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
    markCellError,
    clearCellError,
  } = useSudokuGame();

  const rawMatchId = params.matchId;
  const matchId = Array.isArray(rawMatchId) ? rawMatchId[0] ?? "" : rawMatchId ?? "";
  const accessToken = String(session?.c2AccessToken || "").trim();
  const currentUserId = String(user?.sub || user?.id || "").trim();
  const currentUserDisplayName =
    String(user?.name || user?.email || "Jugador").trim() || "Jugador";

  useEffect(() => {
    selectedCellRef.current = selectedCell;
  }, [selectedCell]);

  const matchDifficultyKey = getMatchDifficultyKey(match);
  const difficulty = matchDifficultyKey ? getDifficultyByKey(matchDifficultyKey) : null;
  const hintLimit = difficulty ? getHintLimit(difficulty) : 0;
  const myGame = getMyGameRecord(match);
  const opponent = getOpponentRecord(match);
  const myDisplayName = toText(match?.myDisplayName, currentUserDisplayName);
  const opponentDisplayName = toText(opponent?.displayName, "Rival");
  const winnerDisplayName = toText(
    match?.winnerDisplayName ||
      (toText(match?.ganadorId) && toText(match?.ganadorId) === currentUserId
        ? myDisplayName
        : opponentDisplayName),
    "Jugador",
  );
  const matchStatus = getMatchStatus(match);
  const isWaiting = matchStatus === "WAITING";
  const isActive = matchStatus === "ACTIVE";
  const isFinished = matchStatus === "FINISHED";
  const isForfeit = matchStatus === "FORFEIT";
  const iAmWinner = Boolean(toText(match?.ganadorId) && toText(match?.ganadorId) === currentUserId);
  const joinCode = findJoinCode(match);
  const startedAt = toText(match?.fechaInicio)
    ? new Date(toText(match?.fechaInicio)).getTime()
    : null;
  const elapsedSeconds = startedAt ? Math.max(0, Math.floor((clockNow - startedAt) / 1000)) : 0;

  const editableCellCount = useMemo(() => countEditableCells(puzzle), [puzzle]);
  const localResolvedCellCount = useMemo(
    () => countResolvedCells(puzzle, confirmedBoard),
    [confirmedBoard, puzzle],
  );
  const correctCounts = useMemo(
    () => (solution.length ? countCorrectByNumber(board, solution) : Array(10).fill(0)),
    [board, solution],
  );
  const resolvedCellCount = useMemo(() => {
    const serverResolved = typeof myGame?.correctCells === "number" ? myGame.correctCells : 0;
    return Math.max(serverResolved, localResolvedCellCount);
  }, [localResolvedCellCount, myGame?.correctCells]);
  const progressPercentage =
    editableCellCount > 0 ? Math.round((resolvedCellCount / editableCellCount) * 100) : 0;

  function applyMatchState(nextMatch: PvpMatchRecord | null, updateBoard = false) {
    setMatch(nextMatch);
    if (!nextMatch) return;

    if ((!initializedBoardRef.current || updateBoard) && getMyBoardState(nextMatch).length) {
      const generated = generatePvpBoard(getMatchSeed(nextMatch), getMatchDifficultyKey(nextMatch));
      const nextBoard = getMyBoardState(nextMatch).map((row) => [...row]);
      const currentSelectedCell = selectedCellRef.current;
      const shouldKeepSelection =
        Boolean(currentSelectedCell) &&
        generated.puzzle[currentSelectedCell!.row]?.[currentSelectedCell!.col] === 0 &&
        nextBoard[currentSelectedCell!.row]?.[currentSelectedCell!.col] === 0;

      onConfirmedBoardChange(nextBoard.map((row) => [...row]));
      hydrateGame({
        puzzle: generated.puzzle,
        solution: generated.solution,
        board: nextBoard,
        notes: createEmptyNotes(),
        selectedCell: shouldKeepSelection
          ? currentSelectedCell
          : findFirstEditableCell(generated.puzzle, nextBoard),
        noteMode: false,
        highlightEnabled: true,
        cellErrors: {},
      });
      initializedBoardRef.current = true;
    }

    setErrorCount(getMyGameMistakes(nextMatch));
  }

  async function fetchMatch({
    updateBoard = false,
    signal,
  }: {
    updateBoard?: boolean;
    signal?: AbortSignal;
  } = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, MATCH_FETCH_TIMEOUT_MS);

    function relayAbort() {
      controller.abort();
    }

    if (signal) {
      if (signal.aborted) {
        relayAbort();
      } else {
        signal.addEventListener("abort", relayAbort, { once: true });
      }
    }

    try {
      const response = await apiClient.getPvpMatch(matchId, accessToken, controller.signal);
      const nextMatch = unwrapMatchPayload(response);
      applyMatchState(nextMatch, updateBoard);
      return nextMatch;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("La partida tarda demasiado en responder. Intenta de nuevo.");
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
      if (signal) {
        signal.removeEventListener("abort", relayAbort);
      }
    }
  }

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    async function init() {
      if (!isAuthenticated || !accessToken || !matchId) {
        if (mounted) {
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        const nextMatch = await fetchMatch({ updateBoard: true, signal: controller.signal });
        if (!mounted) return;

        if (getMatchStatus(nextMatch) === "WAITING") {
          setStatus("Partida creada. Comparte el codigo y espera al rival.", true);
        } else if (getMatchStatus(nextMatch) === "ACTIVE") {
          setStatus("Partida activa. Ya puedes comenzar a jugar.", true);
        } else if (getMatchStatus(nextMatch) === "FINISHED") {
          setStatus("La partida ya finalizo.", true);
        } else if (!getMyBoardState(nextMatch).length) {
          setStatus("La sala se conecto, pero el tablero aun no llega. Reintentando...");
        }
      } catch (error) {
        if (mounted && !(error instanceof Error && error.name === "AbortError")) {
          setStatus(
            error instanceof Error && error.message.trim()
              ? error.message
              : "No se pudo cargar la partida.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void init();

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [accessToken, isAuthenticated, matchId]);

  useEffect(() => {
    if (!matchId || !accessToken) return undefined;

    const interval = setInterval(() => {
      if (pollingInFlightRef.current) return;
      pollingInFlightRef.current = true;
      fetchMatch()
        .catch(() => undefined)
        .finally(() => {
          pollingInFlightRef.current = false;
        });
    }, isActive ? 1000 : 3000);

    return () => clearInterval(interval);
  }, [accessToken, isActive, matchId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setClockNow(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isFinished && !winnerDialogShownRef.current) {
      winnerDialogShownRef.current = true;
      setWinnerDialogVisible(true);
      setStatus(
        iAmWinner
          ? "Terminaste primero y ganaste la partida."
          : `${winnerDisplayName} completo el tablero primero y gano la partida.`,
        iAmWinner,
      );
    }
  }, [iAmWinner, isFinished, setStatus, winnerDisplayName]);

  useEffect(() => {
    if (isForfeit) {
      setStatus("La partida termino por abandono.", true);
    }
  }, [isForfeit, setStatus]);

  useEffect(() => {
    if (isFinished || isForfeit || winnerDialogVisible) {
      return undefined;
    }

    const unsubscribe = navigation.addListener("beforeRemove", (event) => {
      if (allowExitRef.current) {
        return;
      }

      if (forfeiting) {
        event.preventDefault();
        return;
      }

      event.preventDefault();

      Alert.alert(
        "Abandonar partida",
        "Si sales de esta partida, se abandonara tu progreso actual.",
        [
          {
            text: "Cancelar",
            style: "cancel",
          },
          {
            text: "Abandonar",
            style: "destructive",
            onPress: () => {
              void (async () => {
                if (isActive) {
                  try {
                    setForfeiting(true);
                    await apiClient.forfeitPvpMatch(matchId, accessToken);
                  } catch (error) {
                    setStatus(
                      error instanceof Error && error.message.trim()
                        ? error.message
                        : "No se pudo abandonar la partida.",
                    );
                    setForfeiting(false);
                    return;
                  }
                }

                allowExitRef.current = true;
                navigation.dispatch(event.data.action);
              })();
            },
          },
        ],
      );
    });

    return unsubscribe;
  }, [
    accessToken,
    forfeiting,
    isActive,
    isFinished,
    isForfeit,
    matchId,
    navigation,
    setStatus,
    winnerDialogVisible,
  ]);

  async function applyValue(num: number, asNote = false) {
    if (!match || !isActive || submittingMove) return;
    if (!selectedCell) {
      setStatus("Selecciona una celda editable antes de jugar.");
      return;
    }

    if (asNote) {
      toggleSelectedNote(num);
      return;
    }

    const { row, col } = selectedCell;
    const previousValue = board[row]?.[col] ?? 0;
    if (puzzle[row]?.[col] !== 0) {
      setStatus("No puedes modificar una celda fija.");
      return;
    }
    if (confirmedBoard[row]?.[col] !== 0) {
      setStatus("Esa celda ya fue resuelta por ti.");
      return;
    }

    const isCorrect = solution[row]?.[col] === num;
    const nextBoard = board.map((line) => [...line]);
    nextBoard[row][col] = num;

    setBoard(nextBoard);
    clearCellError(row, col);
    setNotes((currentNotes) => {
      const nextNotes = cloneNotes(currentNotes);
      clearNotesCell(nextNotes, row, col);
      if (isCorrect) {
        removeCandidateFromPeerNotes(nextNotes, row, col, num);
        revalidateAllNotes(puzzle, nextBoard, nextNotes);
      }
      return nextNotes;
    });

    if (!isCorrect) {
      markCellError(row, col, true);
    }

    setSubmittingMove(true);
    try {
      const result = await apiClient.makePvpMove(
        matchId,
        { row, col, value: num, esCorrecta: isCorrect },
        accessToken,
      );
      const resultRecord = (result ?? {}) as Record<string, unknown>;

      setMatch((current) => {
        if (!current?.myGame || typeof current.myGame !== "object") return current;
        return {
          ...current,
          myGame: {
            ...current.myGame,
            score:
              typeof resultRecord.myScore === "number"
                ? resultRecord.myScore
                : getMyGameScore(current),
            mistakes:
              typeof resultRecord.myMistakes === "number"
                ? resultRecord.myMistakes
                : getMyGameMistakes(current),
          },
        };
      });

      if (typeof resultRecord.myMistakes === "number") {
        setErrorCount(resultRecord.myMistakes);
      }

      if (resultRecord.esCorrecta) {
        onConfirmedBoardChange((currentBoard) => {
          const updatedBoard = currentBoard.map((line) => [...line]);
          if (!updatedBoard[row]) {
            return currentBoard;
          }
          updatedBoard[row][col] = num;
          return updatedBoard;
        });
        clearCellError(row, col);
      } else {
        markCellError(row, col, true);
      }

      if (resultRecord.matchTerminado) {
        setStatus(
          toText(resultRecord.ganadorId) === currentUserId
            ? "Completaste tu tablero primero. Confirmando victoria..."
            : "La partida termino. Confirmando resultado final...",
          toText(resultRecord.ganadorId) === currentUserId,
        );
      } else {
        setStatus(
          resultRecord.esCorrecta ? "Movimiento correcto." : "Movimiento incorrecto.",
          Boolean(resultRecord.esCorrecta),
        );
      }

      await fetchMatch();
    } catch (error) {
      setBoard((currentBoard) => {
        const reverted = currentBoard.map((line) => [...line]);
        if (reverted[row]) {
          reverted[row][col] = previousValue;
        }
        return reverted;
      });
      clearCellError(row, col);
      setStatus(
        error instanceof Error && error.message.trim()
          ? error.message
          : "No se pudo registrar la jugada.",
      );
    } finally {
      setSubmittingMove(false);
    }
  }

  function handleClearCell() {
    if (!selectedCell || !isActive || submittingMove) return;
    const didClear = clearSelectedCell();
    if (didClear) {
      clearCellError(selectedCell.row, selectedCell.col);
    }
  }

  function handleHintUnavailable() {
    if (!difficulty) {
      setStatus("Las pistas no estan disponibles en PvP.");
      return;
    }

    setStatus(
      `Las pistas no estan disponibles en PvP. En single player, ${difficulty.label} permite ${hintLimit} pista(s).`,
    );
  }

  function handleCloseWinnerDialog() {
    setWinnerDialogVisible(false);
    router.replace(appRoutes.pvp);
  }

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingScreen,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <AuthRequiredPage
        title="Debes iniciar sesion para entrar a una sala PvP."
        subtitle="Crea tu cuenta o inicia sesion para continuar con la partida."
      />
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <View style={styles.screen}>
        <View style={styles.content}>
          <View style={styles.topRow}>
            <View style={styles.headerCopy}>
              <Text style={[styles.kicker, { color: theme.colors.primary }]}>PvP</Text>
              <Text style={[styles.matchTitle, { color: theme.colors.onSurface }]}>
                Match {matchId}
              </Text>
              <Text style={[styles.modeCopy, { color: theme.colors.onSurfaceVariant }]}>
                {difficulty ? `Dificultad: ${difficulty.label}` : "Sin dificultad"}
              </Text>
              <Text style={[styles.modeCopy, { color: theme.colors.onSurfaceVariant }]}>
                Estado: {loading ? "Cargando" : matchStatus || "Sincronizando"}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <Chip icon="timer-outline">{formatSudokuTime(elapsedSeconds)}</Chip>
            <Chip icon="alert-circle-outline">{errorCount}</Chip>
            <Chip icon="sword-cross">{opponentDisplayName}</Chip>
          </View>

          {!match ? (
            <View
              style={[
                styles.waitingBox,
                loading ? { backgroundColor: paperTheme.colors.elevation.level2 } : null,
              ]}
            >
              {loading ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
              <Text style={[styles.waitingTitle, { color: theme.colors.onSurface }]}>
                Sincronizando match
              </Text>
              <Text style={[styles.waitingBody, { color: theme.colors.onSurfaceVariant }]}>
                {loading
                  ? "Estamos cargando el estado del tablero PvP."
                  : "Estamos esperando confirmar tu acceso a la partida."}
              </Text>
            </View>
          ) : (
            <>
              {isWaiting ? (
                <View
                  style={[
                    styles.waitingBox,
                    { backgroundColor: paperTheme.colors.elevation.level2 },
                  ]}
                >
                  <Text style={[styles.waitingTitle, { color: theme.colors.onSurface }]}>
                    Esperando rival
                  </Text>
                  <Text
                    style={[styles.waitingBody, { color: theme.colors.onSurfaceVariant }]}
                  >
                    Comparte este codigo para que otro jugador lo escriba en su pagina PvP.
                  </Text>
                  <Text
                    style={[styles.waitingCodeLabel, { color: theme.colors.primary }]}
                  >
                    Codigo de ingreso
                  </Text>
                  <Text
                    style={[styles.waitingCodeValue, { color: theme.colors.onSurface }]}
                  >
                    {joinCode || "-----"}
                  </Text>
                </View>
              ) : null}

              {!isWaiting ? (
                <>
                  <SudokuBoard ariaLabel="Tablero PvP" />

                  <SudokuControlsPanel
                    noteMode={noteMode}
                    highlightEnabled={highlightEnabled}
                    hintCount={0}
                    keypadDisabled={!isActive || submittingMove || loading}
                    clearDisabled={!isActive || submittingMove || loading}
                    noteDisabled={!isActive || submittingMove || loading}
                    highlightDisabled={!isActive || submittingMove || loading}
                    hintDisabled
                    onApplyValue={(num) => {
                      void applyValue(num, noteMode);
                    }}
                    onClearCell={handleClearCell}
                    onHint={handleHintUnavailable}
                    onToggleNoteMode={() => setNoteMode((current) => !current)}
                    onToggleHighlight={() => setHighlightEnabled((current) => !current)}
                    getNumberHidden={(num) => correctCounts[num] >= 9}
                    getNumberDisabled={(num) => correctCounts[num] >= 9}
                  >
                    <View
                      style={[
                        styles.opponentCard,
                        { backgroundColor: paperTheme.colors.elevation.level2 },
                      ]}
                    >
                      <Text style={[styles.opponentTitle, { color: theme.colors.onSurface }]}>
                        Rival
                      </Text>
                      <Text
                        style={[styles.opponentBody, { color: theme.colors.onSurfaceVariant }]}
                      >
                        {isFinished
                          ? `${winnerDisplayName} gano la partida al completar primero el tablero.`
                          : opponent?.finished
                            ? "Tu rival ya termino su tablero. Estamos cerrando la partida."
                            : "Recibiras un aviso cuando tu rival termine."}
                      </Text>
                    </View>
                  </SudokuControlsPanel>

                  {editableCellCount > 0 ? (
                    <View style={styles.progressWrap}>
                      <ProgressBar
                        progress={progressPercentage / 100}
                        color={theme.colors.primary}
                        style={styles.progressBar}
                      />
                      <Text
                        style={[styles.progressText, { color: theme.colors.onSurfaceVariant }]}
                      >
                        {resolvedCellCount}/{editableCellCount} celdas correctas ({progressPercentage}
                        %)
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : null}
            </>
          )}

          <Text
            style={[
              styles.status,
              { color: statusOk ? theme.colors.primary : theme.colors.onSurfaceVariant },
            ]}
          >
            {status}
          </Text>
          <Text style={[styles.bottomCopy, { color: theme.colors.onSurfaceVariant }]}>
            Gana quien complete primero su tablero.
          </Text>
        </View>
      </View>

      <Portal>
        <Dialog
          visible={winnerDialogVisible && isFinished}
          onDismiss={handleCloseWinnerDialog}
          style={styles.dialogNoRadius}
        >
          <Dialog.Title>{iAmWinner ? "Ganaste el match" : "Tenemos un ganador"}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{winnerDisplayName}</Text>
            <Text variant="bodyMedium">
              {iAmWinner
                ? "Completaste tu tablero antes que tu rival y cerraste la partida."
                : `${winnerDisplayName} completo el tablero primero y se llevo la victoria.`}
            </Text>
            <Text variant="bodyMedium">
              Tu puntaje: {getMyGameScore(match)} | Puntaje rival:{" "}
              {typeof opponent?.score === "number" ? opponent.score : 0}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={handleCloseWinnerDialog}>Volver a PvP</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

export default function PvpMatchLobbyPage() {
  const [confirmedBoard, setConfirmedBoard] = useState<SudokuBoardType>([]);

  function getEditableState({
    row,
    col,
    puzzle,
  }: {
    row: number;
    col: number;
    puzzle: SudokuBoardType;
  }) {
    if (puzzle[row]?.[col] !== 0) {
      return { editable: false, message: "No puedes modificar una celda fija." };
    }
    if (confirmedBoard[row]?.[col] !== 0) {
      return { editable: false, message: "Esa celda ya fue resuelta por ti." };
    }

    return { editable: true, message: "" };
  }

  return (
    <SudokuGameProvider errorMode="tracked" getEditableState={getEditableState}>
      <PvpMatchPageContent
        confirmedBoard={confirmedBoard}
        onConfirmedBoardChange={setConfirmedBoard}
      />
    </SudokuGameProvider>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    alignItems: "center",
    justifyContent: "center",
  },
  screen: {
    flex: 1,
  },
  content: {
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  kicker: {
    fontSize: 13,
    lineHeight: 16,
    fontWeight: "800",
    letterSpacing: 1.8,
    textTransform: "uppercase",
  },
  matchTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
  },
  modeCopy: {
    fontSize: 14,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  waitingBox: {
    gap: 8,
    borderRadius: 18,
    padding: 16,
  },
  waitingTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
  },
  waitingBody: {
    fontSize: 15,
    lineHeight: 22,
  },
  waitingCodeLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  waitingCodeValue: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    letterSpacing: 4,
  },
  opponentCard: {
    borderRadius: 14,
    padding: 12,
    gap: 4,
  },
  opponentTitle: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "800",
  },
  opponentBody: {
    fontSize: 14,
    lineHeight: 20,
  },
  progressWrap: {
    gap: 4,
    paddingBottom: 2,
  },
  progressBar: {
    borderRadius: 999,
  },
  progressText: {
    fontSize: 13,
    lineHeight: 18,
  },
  status: {
    fontSize: 14,
    lineHeight: 20,
  },
  bottomCopy: {
    fontSize: 13,
    lineHeight: 18,
  },
  dialogNoRadius: {
    borderRadius: 8,
  },
});
