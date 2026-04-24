import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';

import AuthRequiredPage from '@/pages/AuthRequiredPage';
import { useAuth } from '@/context';
import { apiClient } from '@/services';

type TournamentHistoryItem = Record<string, unknown>;

function toStringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function toNumberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function formatTournamentState(value: unknown) {
  const normalized = toStringValue(value).toUpperCase();
  if (normalized === 'FINALIZADO') return 'Finalizado';
  if (normalized === 'ACTIVO') return 'Activo';
  if (normalized === 'PROGRAMADO') return 'Programado';
  if (normalized === 'PAUSADO') return 'Pausado';
  if (normalized === 'CANCELADO') return 'Cancelado';
  if (normalized === 'BORRADOR') return 'Borrador';
  return normalized || 'Sin estado';
}

function formatElapsedSeconds(value: unknown) {
  const total = toNumberValue(value);
  if (total === null || total < 0) return 'Sin registro';
  const minutes = Math.floor(total / 60);
  const seconds = Math.floor(total % 60);
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

function getTournamentName(item: TournamentHistoryItem) {
  return (
    toStringValue(item.nombre) ||
    toStringValue(item.name) ||
    toStringValue(item.torneoNombre) ||
    'Torneo sin nombre'
  );
}

function getTournamentOwnerLabel(item: TournamentHistoryItem) {
  return (
    toStringValue(item.creadorNombre) ||
    toStringValue(item.creatorName) ||
    toStringValue(item.creadorId) ||
    toStringValue(item.creatorId) ||
    'Sin creador'
  );
}

function getTournamentScoreLabel(item: TournamentHistoryItem) {
  const score =
    toNumberValue(item.miPuntaje) ??
    toNumberValue(item.puntaje) ??
    toNumberValue(item.score);
  return score === null ? 'Sin registro' : String(score);
}

function getTournamentPositionLabel(item: TournamentHistoryItem) {
  const position =
    toNumberValue(item.miPosicion) ??
    toNumberValue(item.posicion) ??
    toNumberValue(item.rank);
  return position === null || position <= 0 ? 'Sin puesto' : `#${position}`;
}

export default function TournamentStatsPage() {
  const { isAuthenticated, accessToken } = useAuth();
  const theme = useTheme();
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<TournamentHistoryItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadTournamentHistory() {
      if (!isAuthenticated || !accessToken) {
        setHistory([]);
        return;
      }

      setHistoryLoading(true);
      try {
        const rows = await apiClient.getMyTournamentHistory(accessToken).catch(() => []);
        if (cancelled) return;
        setHistory(Array.isArray(rows) ? (rows as TournamentHistoryItem[]) : []);
      } finally {
        if (!cancelled) {
          setHistoryLoading(false);
        }
      }
    }

    void loadTournamentHistory();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, accessToken]);

  if (!isAuthenticated) {
    return <AuthRequiredPage />;
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.panel}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>
            Resultados de torneos donde participaste
          </Text>

          {historyLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : history.length ? (
            <View style={styles.cards}>
              {history.map((item, index) => {
                const key = toStringValue(item._id) || `${getTournamentName(item)}-${index}`;
                return (
                  <View
                    key={key}
                    style={[
                      styles.card,
                      { backgroundColor: theme.dark ? '#37414f' : theme.colors.elevation.level2 },
                    ]}
                  >
                    <Text style={[styles.state, { color: theme.colors.primary }]}>
                      {formatTournamentState(item.estado)}
                    </Text>
                    <Text style={[styles.tournamentName, { color: theme.colors.onSurface }]}>
                      {getTournamentName(item)}
                    </Text>

                    <View style={styles.metaGrid}>
                      <View style={styles.metaItem}>
                        <Text style={[styles.metaLabel, { color: theme.colors.onSurfaceVariant }]}>Creador</Text>
                        <Text style={[styles.metaValue, { color: theme.colors.onSurface }]}>
                          {getTournamentOwnerLabel(item)}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Text style={[styles.metaLabel, { color: theme.colors.onSurfaceVariant }]}>Puntaje</Text>
                        <Text style={[styles.metaValue, { color: theme.colors.onSurface }]}>
                          {getTournamentScoreLabel(item)}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Text style={[styles.metaLabel, { color: theme.colors.onSurfaceVariant }]}>Tiempo</Text>
                        <Text style={[styles.metaValue, { color: theme.colors.onSurface }]}>
                          {formatElapsedSeconds(item.miTiempo)}
                        </Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Text style={[styles.metaLabel, { color: theme.colors.onSurfaceVariant }]}>Puesto</Text>
                        <Text style={[styles.metaValue, { color: theme.colors.onSurface }]}>
                          {getTournamentPositionLabel(item)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
              Cuando participes en torneos que ya finalizaron, apareceran aqui.
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    gap: 12,
  },
  panel: {
    gap: 10,
  },
  title: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
  },
  loadingBox: {
    minHeight: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cards: {
    gap: 10,
  },
  card: {
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  state: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
  },
  tournamentName: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '800',
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaItem: {
    width: '47%',
    gap: 2,
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
});
