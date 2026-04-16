import { StyleSheet } from 'react-native';

import { backgroundGlow, useAppTheme, useThemeMode } from '@/constants/theme';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  container_page: {
    flex: 1,
    paddingTop: 20
  },
  eyebrow: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '800',
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  card: {
    borderRadius: 28,
  },
  cardContent: {
    paddingVertical: 8,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  switchCopy: {
    flex: 1,
    gap: 6,
  },
  buttonContent: {
    minHeight: 52,
  },
});

export function useAppStyles() {
  const theme = useAppTheme();
  const { isDark } = useThemeMode();

  const gradientColors = isDark
    ? (['#dfe3f3', '#98a0b8', 'rgba(34, 40, 49, 0.92)', 'rgba(34, 40, 49, 0.96)'] as const)
    : ([backgroundGlow, theme.colors.background] as const);

  const gradientLocations = isDark ? ([0, 0.05, 0.16, 1] as const) : ([0, 0.35] as const);

  return {
    gradientColors,
    gradientLocations,
    gradientStart: { x: 0, y: 0 } as const,
    gradientEnd: { x: 0.28, y: 1 } as const,
    screenStyle: [styles.screen, { backgroundColor: theme.colors.background }],
    containerStyle: styles.container,
    containerPageStyle: styles.container_page,
    eyebrowStyle: [styles.eyebrow, { color: theme.colors.primary }],
    titleStyle: [styles.title, { color: theme.colors.onBackground }],
    bodyStyle: [styles.body, { color: theme.colors.onSurfaceVariant }],
    cardStyle: [styles.card, { backgroundColor: theme.colors.elevation.level2 }],
    cardContentStyle: styles.cardContent,
    switchRowStyle: styles.switchRow,
    switchCopyStyle: styles.switchCopy,
    switchTitleStyle: { color: theme.colors.onSurface },
    switchDescriptionStyle: { color: theme.colors.onSurfaceVariant },
    buttonContentStyle: styles.buttonContent,
  };
}
