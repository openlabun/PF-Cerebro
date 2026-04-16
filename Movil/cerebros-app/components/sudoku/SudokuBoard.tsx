import { useMemo, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import { useSudokuGame } from '@/context';

type SudokuBoardProps = {
  ariaLabel?: string;
};

const lightPalette = {
  cellBg: '#ffffff',
  cellPrefilled: '#f5f5f5',
  cellBorder: '#d0d0d0',
  subgridLine: '#404040',
  text: '#222831',
  peerBg: '#e7eef0',
  sameBg: '#cfe0e5',
  errorBg: '#ffdbdb',
  errorText: '#941b1b',
  noteText: '#4a5565',
  noteHighlightText: '#2a6f74',
};

const darkPalette = {
  cellBg: '#222831',
  cellPrefilled: '#31363f',
  cellBorder: '#3d4450',
  subgridLine: '#76abae',
  text: '#e8edf3',
  peerBg: '#2c4048',
  sameBg: '#38535c',
  errorBg: '#5b2a2a',
  errorText: '#ffd4d4',
  noteText: '#aeb7c5',
  noteHighlightText: '#d9f4f6',
};

function renderNotes(notes: Set<number>, selectedValue: number, noteColor: string, highlightColor: string) {
  return Array.from({ length: 9 }, (_, index) => index + 1).map((note) => (
    <View key={note} style={styles.noteSlot}>
      <Text
        style={[
          styles.noteText,
          {
            color: selectedValue !== 0 && selectedValue === note ? highlightColor : noteColor,
          },
        ]}
      >
        {notes.has(note) ? note : ''}
      </Text>
    </View>
  ));
}

export function SudokuBoard({ ariaLabel = 'Tablero Sudoku' }: SudokuBoardProps) {
  const theme = useTheme();
  const palette = theme.dark ? darkPalette : lightPalette;
  const [boardWidth, setBoardWidth] = useState(0);
  const { puzzle, board, notes, selectedCell, selectedValue, highlightEnabled, isCellError, setSelectedCell } =
    useSudokuGame();

  const outerBorderWidth = 2;
  const subgridLineWidth = 2;
  const cellSize = useMemo(
    () => Math.max(24, Math.floor(Math.max(0, boardWidth - outerBorderWidth * 2) / 9)),
    [boardWidth],
  );
  const computedBoardWidth = cellSize * 9 + outerBorderWidth * 2;

  const onLayout = (event: LayoutChangeEvent) => {
    setBoardWidth(event.nativeEvent.layout.width);
  };

  return (
    <View accessibilityLabel={ariaLabel} onLayout={onLayout} style={styles.wrapper}>
      <View style={[styles.grid, { width: computedBoardWidth, borderColor: palette.subgridLine }]}>
        {board.map((rowValues, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.row}>
            {rowValues.map((value, colIndex) => {
            const isPrefilled = puzzle[rowIndex]?.[colIndex] !== 0;
            const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
            const isPeer =
              Boolean(highlightEnabled) &&
              Boolean(selectedCell) &&
              (selectedCell?.row === rowIndex || selectedCell?.col === colIndex);
            const isSameValue =
              Boolean(highlightEnabled) && selectedValue !== 0 && value !== 0 && value === selectedValue;
            const hasNotes = Boolean(notes[rowIndex]?.[colIndex]?.size);
            const showError = isCellError(rowIndex, colIndex, value);

            return (
              <Pressable
                key={`${rowIndex}-${colIndex}`}
                accessibilityRole="button"
                accessibilityLabel={`Celda fila ${rowIndex + 1} columna ${colIndex + 1}`}
                onPress={() => setSelectedCell({ row: rowIndex, col: colIndex })}
                style={[
                  styles.cell,
                  {
                    width: cellSize,
                    height: cellSize,
                    borderColor: palette.cellBorder,
                    borderRightWidth: 1,
                    borderBottomWidth: 1,
                    backgroundColor: palette.cellBg,
                  },
                  isPrefilled && { backgroundColor: palette.cellPrefilled },
                  isPeer && { backgroundColor: palette.peerBg },
                  isSameValue && { backgroundColor: palette.sameBg },
                  showError && { backgroundColor: palette.errorBg },
                ]}
              >
                {value !== 0 ? (
                  <Text
                    style={[
                      styles.valueText,
                      {
                        color: showError
                          ? palette.errorText
                          : isPrefilled
                            ? palette.text
                            : palette.text,
                        fontWeight: isPrefilled ? '700' : '600',
                      },
                    ]}
                  >
                    {value}
                  </Text>
                ) : hasNotes ? (
                  <View style={styles.notesGrid}>
                    {renderNotes(
                      notes[rowIndex][colIndex],
                      selectedValue,
                      palette.noteText,
                      palette.noteHighlightText,
                    )}
                  </View>
                ) : null}

                {isSelected ? (
                  <View
                    pointerEvents="none"
                    style={[styles.selectedOverlay, { borderColor: palette.subgridLine }]}
                  />
                ) : null}
              </Pressable>
            );
            })}
          </View>
        ))}

        {[1, 2].map((section) => (
          <View
            key={`v-${section}`}
            pointerEvents="none"
            style={[
              styles.subgridVertical,
              {
                width: subgridLineWidth,
                backgroundColor: palette.subgridLine,
                left: outerBorderWidth + cellSize * section * 3 - subgridLineWidth / 2,
              },
            ]}
          />
        ))}
        {[1, 2].map((section) => (
          <View
            key={`h-${section}`}
            pointerEvents="none"
            style={[
              styles.subgridHorizontal,
              {
                height: subgridLineWidth,
                backgroundColor: palette.subgridLine,
                top: outerBorderWidth + cellSize * section * 3 - subgridLineWidth / 2,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    width: '100%',
  },
  grid: {
    position: 'relative',
    borderWidth: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderWidth: 1,
    zIndex: 3,
  },
  subgridVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    zIndex: 2,
  },
  subgridHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 2,
  },
  valueText: {
    fontSize: 20,
    lineHeight: 24,
  },
  notesGrid: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 2,
  },
  noteSlot: {
    width: '33.333%',
    height: '33.333%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noteText: {
    fontSize: 9,
    lineHeight: 11,
    textAlign: 'center',
  },
});
