import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Text } from "react-native-paper";

import { useAppTheme } from "@/constants/theme";
import { useAuth } from "@/context";
import { useAppStyles } from "@/hooks/useAppStyles";
import AuthRequiredPage from "@/pages/AuthRequiredPage";
import { apiClient } from "@/services";

type PvpMatchRecord = Record<string, unknown>;

function toText(value: unknown, fallback = "-") {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function findJoinCode(match: PvpMatchRecord | null) {
  return (
    toText(match?.codigoIngreso, "") ||
    toText(match?.codigoAcceso, "") ||
    toText(match?.joinCode, "") ||
    toText(match?.inviteCode, "") ||
    "-----"
  );
}

function findState(match: PvpMatchRecord | null) {
  return toText(match?.estado || match?.state, "WAITING").toUpperCase();
}

export default function PvpMatchLobbyPage() {
  const params = useLocalSearchParams<{ matchId?: string | string[] }>();
  const theme = useAppTheme();
  const ui = useAppStyles();
  const { isAuthenticated, isLoading, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [match, setMatch] = useState<PvpMatchRecord | null>(null);

  const rawMatchId = params.matchId;
  const matchId = Array.isArray(rawMatchId) ? rawMatchId[0] ?? "" : rawMatchId ?? "";
  const accessToken = String(session?.c2AccessToken || "").trim();

  useEffect(() => {
    let cancelled = false;

    async function loadMatch() {
      if (!isAuthenticated || !accessToken || !matchId) {
        if (!cancelled) {
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setStatus("Cargando sala PvP...");

      try {
        const response = await apiClient.getPvpMatch(matchId, accessToken);

        if (cancelled) return;

        setMatch((response ?? null) as PvpMatchRecord | null);
        setStatus("");
      } catch (error) {
        if (cancelled) return;

        setStatus(
          error instanceof Error && error.message.trim()
            ? error.message
            : "No se pudo cargar la sala PvP.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadMatch();

    return () => {
      cancelled = true;
    };
  }, [accessToken, isAuthenticated, matchId]);

  if (isLoading) {
    return (
      <LinearGradient
        colors={ui.gradientColors}
        locations={ui.gradientLocations}
        start={ui.gradientStart}
        end={ui.gradientEnd}
        style={[ui.screenStyle, styles.loadingScreen]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </LinearGradient>
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
    <LinearGradient
      colors={ui.gradientColors}
      locations={ui.gradientLocations}
      start={ui.gradientStart}
      end={ui.gradientEnd}
      style={ui.screenStyle}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: theme.colors.elevation.level2 }]}>
          <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>PvP</Text>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>
            Sala cargada
          </Text>
          <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>
            La creacion o union a la sala ya esta conectada al backend. Esta vista
            confirma el match recibido mientras migramos la jugabilidad completa.
          </Text>

          <View style={styles.metaBlock}>
            <Text style={[styles.metaLabel, { color: theme.colors.onSurfaceVariant }]}>
              Match ID
            </Text>
            <Text style={[styles.metaValue, { color: theme.colors.onSurface }]}>
              {toText(matchId)}
            </Text>
          </View>

          <View style={styles.metaBlock}>
            <Text style={[styles.metaLabel, { color: theme.colors.onSurfaceVariant }]}>
              Estado
            </Text>
            <Text style={[styles.metaValue, { color: theme.colors.onSurface }]}>
              {findState(match)}
            </Text>
          </View>

          <View style={styles.metaBlock}>
            <Text style={[styles.metaLabel, { color: theme.colors.onSurfaceVariant }]}>
              Codigo de ingreso
            </Text>
            <Text style={[styles.codeValue, { color: theme.colors.onSurface }]}>
              {findJoinCode(match)}
            </Text>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : null}

          {status ? (
            <Text style={[styles.status, { color: theme.colors.onSurfaceVariant }]}>
              {status}
            </Text>
          ) : null}

          <Button mode="contained" disabled contentStyle={styles.buttonContent}>
            Jugabilidad PvP en migracion
          </Button>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    gap: 14,
  },
  eyebrow: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  metaBlock: {
    gap: 4,
  },
  metaLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  metaValue: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
  },
  codeValue: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
    letterSpacing: 4,
  },
  status: {
    fontSize: 14,
    lineHeight: 20,
  },
  buttonContent: {
    minHeight: 48,
  },
});
