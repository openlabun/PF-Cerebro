import { Image, StyleSheet, Text, View } from "react-native";

import { useThemeMode } from "@/constants/theme";

export function Header() {
  const { isDark } = useThemeMode();
  const logoSource = isDark
    ? require("../assets/logo-cerebro.png")
    : require("../assets/logo-cerebro-light.png");

  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <Image
          source={logoSource}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <Text
          style={[styles.logoBase, { color: isDark ? "#F8FAFC" : "#1E293B" }]}
        >
          Cere
          <Text
            style={[
              styles.logoAccent,
              { color: isDark ? "#7AAEAF" : "#8EB7DF" },
            ]}
          >
            bro
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "flex-start",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  brandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  logoBase: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: "800",
    letterSpacing: -1,
  },
  logoAccent: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: "800",
    letterSpacing: -1,
  },
  logoImage: {
    height: 30,
    width: 36,
  },
});
