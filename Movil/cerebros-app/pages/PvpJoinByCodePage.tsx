import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { ActivityIndicator, Button, Text, TextInput } from "react-native-paper";

import { useAppTheme } from "@/constants/theme";
import { useAuth } from "@/context";
import AuthRequiredPage from "@/pages/AuthRequiredPage";
import { apiClient } from "@/services";

export default function PvpJoinByCodePage() {
  const router = useRouter();
  const theme = useAppTheme();
  const { isAuthenticated, isLoading, session, user } = useAuth();
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [status, setStatus] = useState("");
  const normalizedJoinCode = joinCode.replace(/\D/g, "").slice(0, 5);
  const displayName =
    String(user?.name || user?.email || "Jugador").trim() || "Jugador";
  const accessToken = String(session?.c2AccessToken || "").trim();

  async function handleJoinByCode() {
    if (!accessToken) {
      setStatus("No hay sesion activa para unirte a la partida.");
      return;
    }

    if (normalizedJoinCode.length < 4) {
      setStatus("Ingresa un codigo PvP valido de 4 o 5 digitos.");
      return;
    }

    try {
      setJoining(true);
      setStatus(`Buscando la sala ${normalizedJoinCode}...`);

      const joined = await apiClient.joinPvpMatchByCode(
        { joinCode: normalizedJoinCode, displayName },
        accessToken,
      );

      const matchId = String((joined as Record<string, unknown>)?._id || "").trim();
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
          : "No se pudo encontrar una partida con ese codigo.",
      );
    } finally {
      setJoining(false);
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
        title="Debes iniciar sesion para unirte a una sala PvP."
        subtitle="Crea tu cuenta o inicia sesion para entrar con un codigo."
      />
    );
  }

  return (
    <View
      style={[styles.screen, { backgroundColor: theme.colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.screen}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>
              UNIRSE RAPIDO
            </Text>
            <Text style={[styles.title, { color: theme.colors.onSurface }]}>
              Ingresa el codigo del host
            </Text>
            <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
              Escribe el codigo que te compartieron para unirte a la partida.
            </Text>

            <View style={styles.fieldBlock}>
              <Text style={[styles.label, { color: theme.colors.onSurface }]}>
                Codigo PvP
              </Text>
              <TextInput
                mode="outlined"
                value={normalizedJoinCode}
                onChangeText={setJoinCode}
                placeholder="48217"
                keyboardType="number-pad"
                autoCorrect={false}
                maxLength={5}
                contentStyle={styles.inputContent}
                style={styles.input}
                outlineStyle={styles.inputOutline}
                editable={!joining}
                onSubmitEditing={() => {
                  void handleJoinByCode();
                }}
              />
            </View>

            <Button
              mode="contained"
              onPress={() => {
                void handleJoinByCode();
              }}
              disabled={joining || normalizedJoinCode.length < 4}
              loading={joining}
              contentStyle={styles.buttonContent}
              style={styles.button}
            >
              {joining ? "Uniendote..." : "Unirme con codigo"}
            </Button>

            {status ? (
              <Text style={[styles.status, { color: theme.colors.onSurfaceVariant }]}>
                {status}
              </Text>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  fieldBlock: {
    gap: 10,
    marginTop: 4,
  },
  label: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "700",
  },
  input: {
    backgroundColor: "transparent",
  },
  inputContent: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 4,
  },
  inputOutline: {
    borderRadius: 18,
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
