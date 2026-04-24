import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';

import {
  ProfileModeTabs,
  profileModeLabels,
  type ProfileModeKey,
} from './ProfileModeTabs';

type ProfileModeStatsProps = {
  loading?: boolean;
  stats: Record<ProfileModeKey, string[]>;
};

function StatsPanel({
  label,
  rows,
  loading = false,
  compact = false,
}: {
  label: string;
  rows: string[];
  loading?: boolean;
  compact?: boolean;
}) {
  const theme = useTheme();
  const panelPaddingHorizontal = compact ? 14 : 16;
  const panelPaddingVertical = compact ? 12 : 14;
  const titleMarginBottom = compact ? 6 : 8;
  const rowGap = compact ? 4 : 6;

  return (
    <View
      style={[
        styles.panel,
        {
          paddingHorizontal: panelPaddingHorizontal,
          paddingVertical: panelPaddingVertical,
          backgroundColor: theme.dark ? '#363c47' : theme.colors.elevation.level3,
          borderColor: theme.colors.outline,
        },
      ]}
    >
      <Text
        style={[
          styles.panelTitle,
          {
            color: theme.colors.onSurface,
            marginBottom: titleMarginBottom,
            fontSize: compact ? 15 : 16,
            lineHeight: compact ? 20 : 22,
          },
        ]}
      >
        Estadisticas · {label}
      </Text>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      ) : (
        <View style={[styles.list, { gap: rowGap }]}>
          {rows.map((row) => (
            <Text
              key={`${label}-${row}`}
              style={[
                styles.rowText,
                {
                  color: theme.colors.onSurfaceVariant,
                  fontSize: compact ? 14 : 15,
                  lineHeight: compact ? 20 : 22,
                },
              ]}
            >
              • {row}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

export function ProfileModeStats({ loading = false, stats }: ProfileModeStatsProps) {
  const { width } = useWindowDimensions();
  const compact = width < 390;

  return (
    <View style={styles.wrapper}>
      <ProfileModeTabs
        renderScene={(mode) => (
          <StatsPanel
            label={profileModeLabels[mode]}
            rows={stats[mode]}
            loading={loading}
            compact={compact}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 12,
  },
  panel: {
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 12,
  },
  panelTitle: {
    fontWeight: '800',
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72,
  },
  list: {},
  rowText: {
    fontWeight: '500',
  },
});
