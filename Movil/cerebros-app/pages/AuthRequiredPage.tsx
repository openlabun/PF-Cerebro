import { LinearGradient } from "expo-linear-gradient";
import { Image, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";

import { useAppTheme, useThemeMode } from "@/constants/theme";
import { useAppStyles } from "@/hooks/useAppStyles";

type AuthRequiredPageProps = {
  title?: string;
  subtitle?: string;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  dividerText?: string;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
};

export default function AuthRequiredPage({
  title = "Debes iniciar sesión para acceder a esta página.",
  subtitle = "¿Aún no tienes cuenta?",
  primaryActionLabel = "Crear cuenta",
  secondaryActionLabel = "Iniciar sesión",
  dividerText = "o, si ya tienes cuenta",
  onPrimaryAction = () => undefined,
  onSecondaryAction = () => undefined,
}: AuthRequiredPageProps) {
  const theme = useAppTheme();
  const ui = useAppStyles();
  const { isDark } = useThemeMode();
  const gradientColors = isDark
    ? (["#dfe3f3", "#96a0b8", "#2d3440", "#222831"] as const)
    : ui.gradientColors;
  const gradientLocations = isDark
    ? ([0, 0.06, 0.22, 1] as const)
    : ui.gradientLocations;
  const logoSource = isDark
    ? require("../assets/logo-cerebro.png")
    : require("../assets/logo-cerebro-light.png");
  const palette = {
    accent: isDark ? "#76abae" : theme.colors.primary,
    title: theme.colors.onBackground,
    body: isDark ? "#ffffff" : theme.colors.onBackground,
    subtle: isDark ? "#76abae" : theme.colors.primary,
    buttonText: isDark ? "#ffffff" : theme.colors.onPrimary,
  } as const;

  return (
    <LinearGradient
      colors={gradientColors}
      locations={gradientLocations}
      start={ui.gradientStart}
      end={ui.gradientEnd}
      style={styles.screen}
    >
      <View style={styles.content}>
        <Image source={logoSource} style={styles.logo} resizeMode="contain" />

        <Text style={[styles.title, { color: palette.title }]}>{title}</Text>

        <Text style={[styles.subtitle, { color: palette.body }]}>
          {subtitle}
        </Text>

        <Button
          mode="contained"
          onPress={onPrimaryAction}
          buttonColor={palette.accent}
          textColor={palette.buttonText}
          contentStyle={styles.primaryButtonContent}
          style={styles.primaryButton}
          labelStyle={styles.primaryButtonLabel}
        >
          {primaryActionLabel}
        </Button>

        <View style={styles.separatorRow}>
          <View
            style={[styles.separatorLine, { backgroundColor: palette.subtle }]}
          />
          <Text style={[styles.separatorText, { color: palette.subtle }]}>
            {dividerText}
          </Text>
          <View
            style={[styles.separatorLine, { backgroundColor: palette.subtle }]}
          />
        </View>

        <Button
          mode="outlined"
          onPress={onSecondaryAction}
          textColor={palette.subtle}
          contentStyle={styles.secondaryButtonContent}
          style={[styles.secondaryButton, { borderColor: palette.subtle }]}
          labelStyle={styles.secondaryButtonLabel}
        >
          {secondaryActionLabel}
        </Button>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 24,
  },
  logo: {
    width: 320,
    height: 320,
    marginBottom: 18,
  },
  title: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 24,
    textTransform: "none",
  },
  primaryButton: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 28,
    marginBottom: 22,
  },
  primaryButtonContent: {
    minHeight: 58,
  },
  primaryButtonLabel: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
  },
  separatorRow: {
    width: "100%",
    maxWidth: 420,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 22,
  },
  separatorLine: {
    flex: 1,
    height: 1.5,
  },
  separatorText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
  },
  secondaryButton: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 28,
    borderWidth: 1.5,
  },
  secondaryButtonContent: {
    minHeight: 58,
  },
  secondaryButtonLabel: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
  },
});
