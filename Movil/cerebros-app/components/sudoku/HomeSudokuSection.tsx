import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, Dialog, IconButton, Menu, Portal, ProgressBar, Text, useTheme } from 'react-native-paper';

import { useThemeMode } from '@/constants/theme';
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
  const { isDark, toggleTheme } = useThemeMode();
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
          <View style={styles.playerActionsRow}>
          <IconButton
          icon={paused ? 'play' : 'pause'}
          mode="contained"
          onPress={() => setPaused((current) => !current)}
          containerColor={palette.chipBg}
          iconColor={palette.text}
          accessibilityLabel={paused ? 'Reanudar' : 'Pausar'}
        />
        <IconButton
          icon="plus"
          mode="contained"
          onPress={() => startNewGame(difficultyKey)}
          containerColor={palette.accent}
          iconColor="#ffffff"
          accessibilityLabel="Nuevo juego"
        />
          </View>
      </View>

      <View style={styles.actionsRow}>
        <Chip
          icon="timer-outline"
          style={{ backgroundColor: palette.chipBg, borderColor: palette.border, borderWidth: 1 }}
          textStyle={{ color: palette.text }}
        >
          {formatSudokuTime(seconds)}
        </Chip>
        <Chip
          icon="alert-circle-outline"
          style={{ backgroundColor: palette.chipBg, borderColor: palette.border, borderWidth: 1 }}
          textStyle={{ color: palette.text }}
        >
         {errorCount}
        </Chip>
        <Chip
          icon="lightbulb-on-outline"
          style={{ backgroundColor: palette.chipBg, borderColor: palette.border, borderWidth: 1 }}
          textStyle={{ color: palette.text }}
        >
        {hintsUsed}/{hintLimit}
        </Chip>
      </View>

      <SudokuBoard />

      <SudokuControlsPanel
        noteMode={noteMode}
        highlightEnabled={highlightEnabled}
        hintCount={hintsUsed}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        keypadDisabled={locked}
        clearDisabled={locked}
        noteDisabled={locked}
        highlightDisabled={locked}
        hintDisabled={locked}
        themeToggleDisabled={locked}
        onApplyValue={(num) => applyValue(num, noteMode)}
        onClearCell={clearSelectedCell}
        onHint={applyHint}
        onToggleNoteMode={() => setNoteMode((current) => !current)}
        onToggleHighlight={() => setHighlightEnabled((current) => !current)}
        getNumberHidden={() => false}
        getNumberDisabled={() => false}
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

      <Portal>
        <Dialog visible={paused && !completed} onDismiss={() => setPaused(false)} style={styles.dialogNoRadius}>
          <Dialog.Title>Juego en pausa</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">El tiempo esta detenido. Pulsa reanudar para continuar.</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setPaused(false)}>Reanudar</Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={completed} onDismiss={() => startNewGame(difficultyKey)} style={styles.dialogNoRadius}>
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
    padding: 16
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
    justifyContent: 'space-between',
    gap: 8,
  },
  playerActionsRow: {
    flexDirection: 'row',
  },
  progressWrap: {
    gap: 6,
  },
  dialogNoRadius: {
    borderRadius: 8,
  },
});
