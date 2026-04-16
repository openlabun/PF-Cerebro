import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Text, useTheme } from 'react-native-paper';

import { EraseIcon, HintIcon, NotesIcon } from './SudokuControlIcons';

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
  isDark?: boolean;
  onToggleTheme?: () => void;
  themeToggleDisabled?: boolean;
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
  mutedSurface: '#ffffff',
  controlIcon: '#5a8a8d',
  controlIconActive: '#76abae',
};

const darkPalette = {
  surface: '#2a313d',
  border: '#3d4450',
  text: '#e8edf3',
  accent: '#76abae',
  accentDark: '#5f9497',
  mutedSurface: '#31363f',
  controlIcon: '#5a8a8d',
  controlIconActive: '#76abae',
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
  isDark = false,
  onToggleTheme,
  themeToggleDisabled = false,
  keypadLabel = 'Teclado numerico',
  getNumberHidden = defaultNumberVisibility,
  getNumberDisabled = defaultNumberDisabled,
  children,
}: SudokuControlsPanelProps) {
  const theme = useTheme();
  const palette = theme.dark ? darkPalette : lightPalette;

  return (
    <View style={styles.container}>
      <View style={styles.actionsRow}>
        <Pressable
          disabled={clearDisabled}
          onPress={onClearCell}
          style={[
            styles.actionButton,
            { backgroundColor: palette.mutedSurface, borderColor: palette.border },
            clearDisabled && styles.actionButtonDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Borrar celda"
        >
          <EraseIcon size={22} color={palette.controlIcon} />
          <Text variant="labelMedium" style={{ color: palette.controlIcon }}>
            Borrar
          </Text>
        </Pressable>

        <Pressable
          disabled={noteDisabled}
          onPress={onToggleNoteMode}
          style={[
            styles.actionButton,
            {
              backgroundColor: noteMode ? palette.controlIconActive : palette.mutedSurface,
              borderColor: noteMode ? palette.controlIconActive : palette.border,
            },
            noteDisabled && styles.actionButtonDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Modo notas"
        >
          <NotesIcon size={22} color={noteMode ? '#ffffff' : palette.controlIcon} />
          <Text
            variant="labelMedium"
            style={{ color: noteMode ? '#ffffff' : palette.controlIcon }}
          >
            Notas
          </Text>
        </Pressable>

        <Pressable
          disabled={hintDisabled}
          onPress={onHint}
          style={[
            styles.actionButton,
            { backgroundColor: palette.mutedSurface, borderColor: palette.border },
            hintDisabled && styles.actionButtonDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Pista"
        >
          <HintIcon size={22} color={palette.controlIcon} />
          <Text variant="labelMedium" style={{ color: palette.controlIcon }}>
            Pista
          </Text>
          <View style={[styles.hintBadge, { backgroundColor: palette.accentDark }]}>
            <Text variant="labelSmall" style={{ color: '#ffffff' }}>
              {hintCount}
            </Text>
          </View>
        </Pressable>

        {onToggleTheme ? (
          <Pressable
            disabled={themeToggleDisabled}
            onPress={onToggleTheme}
            style={[
              styles.actionButton,
              { backgroundColor: palette.mutedSurface, borderColor: palette.border },
              themeToggleDisabled && styles.actionButtonDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={isDark ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
          >
            <MaterialCommunityIcons
              name={isDark ? 'weather-sunny' : 'weather-night'}
              size={22}
              color={palette.controlIcon}
            />
            <Text variant="labelMedium" style={{ color: palette.controlIcon }}>
              Tema
            </Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.keypadRow}>
        {Array.from({ length: 9 }, (_, index) => index + 1).map((num) => {
          const hidden = getNumberHidden(num);
          const disabled = keypadDisabled || getNumberDisabled(num);

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
    width: '100%',
  },
  keypadRow: {
    width: '100%',
    alignSelf: 'stretch',
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 2,
  },
  numberButton: {
    flex: 1,
    minWidth: 0,
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  numberButtonContent: {
    minHeight: 64,

  },
  numberButtonLabel: {
    fontSize: 24,
    fontWeight: '700',
  },
  actionsRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 6,
  },
  actionButton: {
    position: 'relative',
    flex: 1,
    minHeight: 72,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  actionButtonDisabled: {
    opacity: 0.45,
  },
  hintBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 26,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
