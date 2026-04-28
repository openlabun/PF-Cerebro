import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, Menu, Text } from "react-native-paper";

import { useAppTheme } from "@/constants/theme";
import { useAuth } from "@/context";
import AuthRequiredPage from "@/pages/AuthRequiredPage";
import { apiClient, difficultyLevels, getDifficultyByKey, getHintLimit } from "@/services";

export default function PvpCreateRoomPage() {
  const router = useRouter();
  const theme = useAppTheme();
  const { isAuthenticated, isLoading, session, user } = useAuth();
  const [difficultyMenuVisible, setDifficultyMenuVisible] = useState(false);
  const [selectedDifficultyKey, setSelectedDifficultyKey] = useState("medio");
  const [creating, setCreating] = useState(false);
  const [status, setStatus] = useState("");
  const selectedDifficulty = getDifficultyByKey(selectedDifficultyKey);
  const displayName =
    String(user?.name || user?.email || "Jugador").trim() || "Jugador";
  const accessToken = String(session?.c2AccessToken || "").trim();

  async function handleCreateMatch() {
    if (!accessToken) {
      setStatus("No hay sesion activa para crear la partida.");
      return;
    }

    try {
      setCreating(true);
      setStatus(`Creando match PvP en dificultad ${selectedDifficulty.label}...`);

      const created = await apiClient.createPvpMatch(
        { difficultyKey: selectedDifficultyKey, displayName },
        accessToken,
      );

      const matchId = String((created as Record<string, unknown>)?._id || "").trim();
      if (!matchId) {
        throw new Error("El backend no devolvio un match valido.");
      }

      router.replace({
        pathname: "/pvp/[matchId]",
        params: { matchId },
      });
    } catch (error) {
      setStatus(
        error instanceof Error && error.message.trim()
          ? error.message
          : "No se pudo crear el match.",
      );
    } finally {
      setCreating(false);
    }
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
        title="Debes iniciar sesion para crear una sala PvP."
        subtitle="Crea tu cuenta o inicia sesion para generar un codigo de partida."
      />
    );
  }

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>
            CREAR SALA
          </Text>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>
            Tu tablero, tu codigo
          </Text>

          <View style={styles.fieldBlock}>
            <Text style={[styles.label, { color: theme.colors.onSurface }]}>
              Dificultad:
            </Text>

            <Menu
              visible={difficultyMenuVisible}
              onDismiss={() => setDifficultyMenuVisible(false)}
              anchor={
                <Pressable
                  onPress={() => {
                    if (!creating) {
                      setDifficultyMenuVisible(true);
                    }
                  }}
                  style={[
                    styles.selector,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.outline,
                    },
                  ]}
                >
                  <Text style={[styles.selectorText, { color: theme.colors.onSurface }]}>
                    {selectedDifficulty.label}
                  </Text>
                  <MaterialCommunityIcons
                    name="chevron-down"
                    size={24}
                    color={theme.colors.onSurfaceVariant}
                  />
                </Pressable>
              }
            >
              {difficultyLevels.map((level) => (
                <Menu.Item
                  key={level.key}
                  title={level.label}
                  onPress={() => {
                    if (!creating) {
                      setSelectedDifficultyKey(level.key);
                      setDifficultyMenuVisible(false);
                    }
                  }}
                />
              ))}
            </Menu>

            <Text style={[styles.helperPrimary, { color: theme.colors.primary }]}>
              Tablero PvP: {selectedDifficulty.label}
            </Text>
            <Text
              style={[styles.helperText, { color: theme.colors.onSurfaceVariant }]}
            >
              En single player esta dificultad permite {getHintLimit(selectedDifficulty)} pista(s).
              En PvP las pistas siguen deshabilitadas para ambos jugadores.
            </Text>
          </View>

          <Button
            mode="contained"
            onPress={() => {
              void handleCreateMatch();
            }}
            disabled={creating}
            loading={creating}
            contentStyle={styles.buttonContent}
            style={styles.button}
          >
            {creating ? "Creando..." : "Crear partida"}
          </Button>

          {status ? (
            <Text style={[styles.status, { color: theme.colors.onSurfaceVariant }]}>
              {status}
            </Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  section: {
    gap: 12,
  },
  eyebrow: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "800",
    letterSpacing: 2.2,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "800",
  },
  fieldBlock: {
    gap: 10,
  },
  label: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
  },
  selector: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
  },
  helperPrimary: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
  },
  helperText: {
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    borderRadius: 14,
    marginTop: 6,
  },
  buttonContent: {
    minHeight: 52,
  },
  status: {
    fontSize: 14,
    lineHeight: 20,
  },
});
