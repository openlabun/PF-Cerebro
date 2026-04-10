import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, IconButton, Text, useTheme } from 'react-native-paper';

type SudokuControlsPanelProps = {
  noteMode: boolean;
  highlightEnabled: boolean;
  onApplyValue: (value: number) => void;
  onClearCell: () => void;
  onToggleNoteMode: () => void;
  onToggleHighlight: () => void;
  onHint: () => void;
  keypadDisabled?: boolean;
  clearDisabled?: boolean;
  noteDisabled?: boolean;
  highlightDisabled?: boolean;
  hintDisabled?: boolean;
  hintCount?: number;
  keypadLabel?: string;
  getNumberHidden?: (num: number) => boolean;
  getNumberDisabled?: (num: number) => boolean;
  children?: ReactNode;
};

function defaultNumberVisibility() {
  return false;
}

function defaultNumberDisabled() {
  return false;
}

const lightPalette = {
  surface: '#ffffff',
  border: '#d0d0d0',
  text: '#222831',
  accent: '#76abae',
  accentDark: '#5f9497',
  mutedSurface: '#eef3f4',
};

const darkPalette = {
  surface: '#2a313d',
  border: '#3d4450',
  text: '#e8edf3',
  accent: '#76abae',
  accentDark: '#5f9497',
  mutedSurface: '#31363f',
};

export function SudokuControlsPanel({
  noteMode,
  highlightEnabled,
  onApplyValue,
  onClearCell,
  onToggleNoteMode,
  onToggleHighlight,
  onHint,
  keypadDisabled = false,
  clearDisabled = false,
  noteDisabled = false,
  highlightDisabled = false,
  hintDisabled = false,
  hintCount = 0,
  keypadLabel = 'Teclado numerico',
  getNumberHidden = defaultNumberVisibility,
  getNumberDisabled = defaultNumberDisabled,
  children,
}: SudokuControlsPanelProps) {
  const theme = useTheme();
  const palette = theme.dark ? darkPalette : lightPalette;

  return (
    <View style={styles.container}>
      <Text variant="titleSmall" style={{ color: palette.text }}>
        {keypadLabel}
      </Text>
      <View style={styles.keypadRow}>
        {Array.from({ length: 9 }, (_, index) => index + 1).map((num) => {
          const hidden = getNumberHidden(num);
          const disabled = keypadDisabled || hidden || getNumberDisabled(num);

          return (
            <Button
              key={num}
              mode="contained"
              compact
              disabled={disabled}
              onPress={() => onApplyValue(num)}
              style={[
                styles.numberButton,
                { borderColor: palette.border, backgroundColor: palette.surface },
                hidden && styles.numberHidden,
              ]}
              contentStyle={styles.numberButtonContent}
              buttonColor={palette.surface}
              textColor={palette.text}
              labelStyle={[
                styles.numberButtonLabel,
                hidden && { color: theme.colors.onSurfaceDisabled },
              ]}
            >
              {num}
            </Button>
          );
        })}
      </View>

      <View style={styles.actionsRow}>
        <IconButton
          icon="eraser"
          mode="contained"
          disabled={clearDisabled}
          onPress={onClearCell}
          containerColor={palette.mutedSurface}
          iconColor={palette.text}
          accessibilityLabel="Borrar celda"
        />
        <IconButton
          icon="pencil"
          mode="contained"
          disabled={noteDisabled}
          onPress={onToggleNoteMode}
          containerColor={noteMode ? palette.accent : palette.mutedSurface}
          iconColor={noteMode ? '#ffffff' : palette.text}
          accessibilityLabel="Modo notas"
        />
        <IconButton
          icon="lightbulb-on-outline"
          mode="contained"
          disabled={hintDisabled}
          onPress={onHint}
          containerColor={palette.mutedSurface}
          iconColor={palette.text}
          accessibilityLabel="Pista"
        />
        <View style={[styles.hintBadge, { backgroundColor: palette.accentDark }]}>
          <Text variant="labelSmall" style={{ color: '#ffffff' }}>
            {hintCount}
          </Text>
        </View>
      </View>

      <Button
        mode="contained"
        disabled={highlightDisabled}
        onPress={onToggleHighlight}
        buttonColor={highlightEnabled ? palette.accent : palette.mutedSurface}
        textColor={highlightEnabled ? '#ffffff' : palette.text}
      >
        Resaltar: {highlightEnabled ? 'ON' : 'OFF'}
      </Button>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  keypadRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  numberButton: {
    width: '30%',
    minWidth: 84,
    borderRadius: 16,
    borderWidth: 1,
  },
  numberHidden: {
    opacity: 0,
  },
  numberButtonContent: {
    minHeight: 42,
  },
  numberButtonLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  hintBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 13,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
