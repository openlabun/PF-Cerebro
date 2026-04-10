import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, Dialog, Menu, Portal, ProgressBar, Text, useTheme } from 'react-native-paper';

import { formatSudokuTime } from '@/context';
import { useLocalSudokuGame } from '@/hooks/useLocalSudokuGame';
import { difficultyLevels } from '@/services';

import { SudokuBoard } from './SudokuBoard';
import { SudokuControlsPanel } from './SudokuControlsPanel';

const lightPalette = {
  surface: '#ffffff',
  border: '#d0d0d0',
  text: '#222831',
  mutedText: '#576273',
  accent: '#76abae',
  chipBg: '#eef3f4',
};

const darkPalette = {
  surface: '#222831',
  border: '#3d4450',
  text: '#e8edf3',
  mutedText: '#b8c0cc',
  accent: '#76abae',
  chipBg: '#31363f',
};

export function HomeSudokuSection() {
  const theme = useTheme();
  const palette = theme.dark ? darkPalette : lightPalette;
  const [menuVisible, setMenuVisible] = useState(false);
  const {
    difficulty,
    difficultyKey,
    paused,
    completed,
    seconds,
    errorCount,
    hintsUsed,
    score,
    noteMode,
    highlightEnabled,
    status,
    statusOk,
    progress,
    correctCounts,
    hintLimit,
    setPaused,
    setNoteMode,
    setHighlightEnabled,
    startNewGame,
    applyValue,
    applyHint,
    clearSelectedCell,
  } = useLocalSudokuGame();

  const locked = paused || completed;

  return (
    <View style={styles.content}>
      <Text variant="headlineSmall" style={{ color: palette.text }}>
        Sudoku local
      </Text>
      <View style={styles.topRow}>
        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setMenuVisible(true)}
              textColor={palette.text}
              style={{ borderColor: palette.border, backgroundColor: palette.surface }}
            >
              {difficulty.label}
            </Button>
          }
        >
          {difficultyLevels.map((level) => (
            <Menu.Item
              key={level.key}
              title={level.label}
              onPress={() => {
                setMenuVisible(false);
                startNewGame(level.key);
              }}
            />
          ))}
        </Menu>
        <Chip
          icon="timer-outline"
          style={{ backgroundColor: palette.chipBg, borderColor: palette.border, borderWidth: 1 }}
          textStyle={{ color: palette.text }}
        >
          {formatSudokuTime(seconds)}
        </Chip>
      </View>

      <View style={styles.statsRow}>
        <Chip
          icon="alert-circle-outline"
          style={{ backgroundColor: palette.chipBg, borderColor: palette.border, borderWidth: 1 }}
          textStyle={{ color: palette.text }}
        >
          Errores: {errorCount}
        </Chip>
        <Chip
          icon="lightbulb-on-outline"
          style={{ backgroundColor: palette.chipBg, borderColor: palette.border, borderWidth: 1 }}
          textStyle={{ color: palette.text }}
        >
          Pistas: {hintsUsed}/{hintLimit}
        </Chip>
      </View>

      <View style={styles.actionsRow}>
        <Button
          mode="contained"
          onPress={() => setPaused((current) => !current)}
          buttonColor={palette.chipBg}
          textColor={palette.text}
        >
          {paused ? 'Reanudar' : 'Pausar'}
        </Button>
        <Button
          mode="contained"
          onPress={() => startNewGame(difficultyKey)}
          buttonColor={palette.accent}
          textColor="#ffffff"
        >
          Nuevo juego
        </Button>
      </View>

      <SudokuBoard />

      <SudokuControlsPanel
        noteMode={noteMode}
        highlightEnabled={highlightEnabled}
        hintCount={hintsUsed}
        keypadDisabled={locked}
        clearDisabled={locked}
        noteDisabled={locked}
        highlightDisabled={locked}
        hintDisabled={locked}
        onApplyValue={(num) => applyValue(num, noteMode)}
        onClearCell={clearSelectedCell}
        onHint={applyHint}
        onToggleNoteMode={() => setNoteMode((current) => !current)}
        onToggleHighlight={() => setHighlightEnabled((current) => !current)}
        getNumberHidden={(num) => correctCounts[num] >= 9}
        getNumberDisabled={(num) => correctCounts[num] >= 9}
      />

      <View style={styles.progressWrap}>
        <ProgressBar
          progress={progress.percentage / 100}
          color={palette.accent}
          style={{ backgroundColor: palette.chipBg, borderWidth: 1, borderColor: palette.border }}
        />
        <Text variant="bodySmall" style={{ color: palette.mutedText }}>
          {progress.correct}/{progress.editable} celdas correctas ({progress.percentage}%)
        </Text>
      </View>

      {status ? (
        <Text
          variant="bodyMedium"
          style={{ color: statusOk ? palette.accent : palette.mutedText }}
        >
          {status}
        </Text>
      ) : null}

      <Portal>
        <Dialog visible={paused && !completed} onDismiss={() => setPaused(false)}>
          <Dialog.Title>Juego en pausa</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">El tiempo esta detenido. Pulsa reanudar para continuar.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPaused(false)}>Reanudar</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={completed} onDismiss={() => startNewGame(difficultyKey)}>
          <Dialog.Title>Sudoku completado</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Puntaje: {score}</Text>
            <Text variant="bodyMedium">
              Tiempo: {formatSudokuTime(seconds)} | Errores: {errorCount} | Pistas: {hintsUsed}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => startNewGame(difficultyKey)}>Jugar otra vez</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  progressWrap: {
    gap: 6,
  },
});
