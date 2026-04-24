import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Button } from "react-native-paper";

import { useAppTheme } from "@/constants/theme";
import { useAuth } from "@/context";
import { useAppStyles } from "@/hooks/useAppStyles";
import { apiClient } from "@/services";

import { ProfileCustomizationModal } from "@/components/profile/ProfileCustomizationModal";
import { ProfileStats } from "@/components/profile/ProfileStats";
import {
  type ProfileAvatar,
  type ProfileFrameKey,
} from "@/components/profile/profileCustomization";
import AuthRequiredPage from "./AuthRequiredPage";

const GAME_ID_SUDOKU = "uVsB-k2rjora";

type ProfileState = {
  displayName: string;
  level: number;
  experience: number;
  xpGoal: number;
  streak: number;
  frame:
    | "frame-royal"
    | "frame-arcane"
    | "frame-neon"
    | "frame-ember"
    | "frame-ice"
    | "frame-inferno"
    | "frame-bronze"
    | "frame-silver"
    | "frame-gold"
    | "frame-platinum";
};

function toNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function xpParaSiguienteNivel(nivel: number) {
  const lvl = Number(nivel) || 1;
  if (lvl >= 1 && lvl <= 10) return lvl * 100;
  if (lvl >= 11 && lvl <= 30) return lvl * 150;
  return lvl * 250;
}

function getFrameByElo(elo = 0): ProfileState["frame"] {
  if (elo >= 301) return "frame-platinum";
  if (elo >= 201) return "frame-gold";
  if (elo >= 101) return "frame-silver";
  if (elo >= 1) return "frame-bronze";
  return "frame-royal";
}

function isProfileFrame(value: unknown): value is ProfileState["frame"] {
  return (
    value === "frame-royal" ||
    value === "frame-arcane" ||
    value === "frame-neon" ||
    value === "frame-ember" ||
    value === "frame-ice" ||
    value === "frame-inferno" ||
    value === "frame-bronze" ||
    value === "frame-silver" ||
    value === "frame-gold" ||
    value === "frame-platinum"
  );
}

function getProfileFrame(
  profile: Record<string, unknown> | null,
  sudokuStats: Record<string, unknown> | null,
) {
  const nestedUser =
    profile?.user && typeof profile.user === "object"
      ? (profile.user as Record<string, unknown>)
      : null;

  const explicitFrameCandidates = [
    profile?.frame,
    profile?.marco,
    profile?.selectedFrame,
    profile?.avatarFrame,
    nestedUser?.frame,
    nestedUser?.marco,
    nestedUser?.selectedFrame,
    nestedUser?.avatarFrame,
    sudokuStats?.frame,
    sudokuStats?.marco,
  ];

  for (const candidate of explicitFrameCandidates) {
    if (isProfileFrame(candidate)) {
      return candidate;
    }
  }

  return getFrameByElo(Math.floor(toNumber(sudokuStats?.elo, 0)));
}

function getStringCandidate(source: Record<string, unknown> | null, keys: string[]) {
  if (!source) return "";

  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function getJoinedName(
  source: Record<string, unknown> | null,
  firstNameKeys: string[],
  lastNameKeys: string[],
) {
  if (!source) return "";

  const firstName = getStringCandidate(source, firstNameKeys);
  const lastName = getStringCandidate(source, lastNameKeys);
  const joined = `${firstName} ${lastName}`.trim();

  return joined;
}

function getProfileDisplayName(
  profile: Record<string, unknown> | null,
  sessionUser: Record<string, unknown> | null,
) {
  const nestedUser =
    profile?.user && typeof profile.user === "object"
      ? (profile.user as Record<string, unknown>)
      : null;

  const name =
    getStringCandidate(profile, [
      "name",
      "nombre",
      "displayName",
      "username",
      "userName",
      "nombreUsuario",
      "usuarioNombre",
      "fullName",
      "nombreCompleto",
    ]) ||
    getJoinedName(
      profile,
      ["firstName", "nombre", "givenName", "nombres"],
      ["lastName", "apellido", "familyName", "apellidos"],
    ) ||
    getStringCandidate(nestedUser, [
      "name",
      "nombre",
      "displayName",
      "username",
      "userName",
      "nombreUsuario",
      "usuarioNombre",
      "fullName",
      "nombreCompleto",
    ]) ||
    getJoinedName(
      nestedUser,
      ["firstName", "nombre", "givenName", "nombres"],
      ["lastName", "apellido", "familyName", "apellidos"],
    ) ||
    getStringCandidate(sessionUser, [
      "name",
      "nombre",
      "displayName",
      "username",
      "userName",
      "nombreUsuario",
      "usuarioNombre",
      "fullName",
      "nombreCompleto",
    ]) ||
    getJoinedName(
      sessionUser,
      ["firstName", "nombre", "givenName", "nombres"],
      ["lastName", "apellido", "familyName", "apellidos"],
    );
  if (name) return name;

  const email =
    getStringCandidate(profile, ["email"]) ||
    getStringCandidate(nestedUser, ["email"]) ||
    getStringCandidate(sessionUser, ["email"]);
  if (email) return email.split("@")[0];

  const rawId =
    profile?.id ||
    profile?.sub ||
    nestedUser?.id ||
    nestedUser?.sub ||
    sessionUser?.id ||
    sessionUser?.sub;
  if (typeof rawId === "string" || typeof rawId === "number") {
    return `Jugador#${String(rawId).slice(-4)}`;
  }

  return "Jugador";
}

export default function ProfilePage() {
  const { accessToken, isAuthenticated, isLoading, logout, user } = useAuth();
  const theme = useAppTheme();
  const ui = useAppStyles();
  const sessionDisplayName = getProfileDisplayName(
    null,
    (user ?? null) as Record<string, unknown> | null,
  );
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<ProfileAvatar>("♔");
  const [selectedFrame, setSelectedFrame] = useState<ProfileFrameKey | null>(null);
  const [customizationVisible, setCustomizationVisible] = useState(false);
  const [customizationTab, setCustomizationTab] = useState<"avatar" | "frame">("avatar");
  const [profile, setProfile] = useState<ProfileState>({
    displayName: sessionDisplayName,
    level: 1,
    experience: 0,
    xpGoal: 100,
    streak: 0,
    frame: "frame-royal",
  });

  useEffect(() => {
    setProfile((current) => {
      if (!sessionDisplayName || current.displayName === sessionDisplayName) {
        return current;
      }

      return {
        ...current,
        displayName: sessionDisplayName,
      };
    });
  }, [sessionDisplayName]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!isAuthenticated || !accessToken) return;

      try {
        setProfileLoading(true);
        const [profileResponseRaw, sudokuStatsRaw] = await Promise.all([
          apiClient.getMyProfile(accessToken).catch(() => null),
          apiClient
            .getMyGameStats(accessToken, GAME_ID_SUDOKU)
            .catch(() => null),
        ]);
        const profileResponse = (profileResponseRaw ?? null) as Record<
          string,
          unknown
        > | null;
        const sudokuStats = (sudokuStatsRaw ?? null) as Record<
          string,
          unknown
        > | null;

        if (cancelled) return;

        const level = Math.max(
          1,
          Math.floor(toNumber(profileResponse?.nivel, 1)),
        );
        const experience = Math.max(
          0,
          Math.floor(toNumber(profileResponse?.experiencia, 0)),
        );
        const streak = Math.max(
          0,
          Math.floor(toNumber(profileResponse?.rachaActual, 0)),
        );
        setProfile({
          displayName:
            getProfileDisplayName(
              profileResponse,
              (user ?? null) as Record<string, unknown> | null,
            ) || sessionDisplayName,
          level,
          experience,
          xpGoal: xpParaSiguienteNivel(level),
          streak,
          frame: getProfileFrame(profileResponse, sudokuStats),
        });
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [accessToken, isAuthenticated, sessionDisplayName, user]);

  if (isLoading) {
    return (
      <LinearGradient
        colors={ui.gradientColors}
        locations={ui.gradientLocations}
        start={ui.gradientStart}
        end={ui.gradientEnd}
        style={styles.loadingScreen}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </LinearGradient>
    );
  }

  if (!isAuthenticated) {
    return <AuthRequiredPage />;
  }

  async function handleLogout() {
    try {
      setIsLoggingOut(true);
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <LinearGradient
      colors={ui.gradientColors}
      locations={ui.gradientLocations}
      start={ui.gradientStart}
      end={ui.gradientEnd}
      style={ui.screenStyle}
    >
      <View style={styles.content}>
        {profileLoading ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : (
          <ProfileStats
            avatar={selectedAvatar}
            displayName={profile.displayName}
            level={profile.level}
            experience={profile.experience}
            xpGoal={profile.xpGoal}
            streak={profile.streak}
            frame={selectedFrame ?? profile.frame}
            onAvatarPress={() => setCustomizationVisible(true)}
          />
        )}

        <Button
          mode="outlined"
          onPress={handleLogout}
          loading={isLoggingOut}
          disabled={isLoggingOut}
          style={[styles.logoutButton, { borderColor: theme.colors.outline }]}
          textColor={theme.colors.onSurface}
          contentStyle={styles.logoutButtonContent}
          icon="logout"
        >
          Cerrar sesion
        </Button>
      </View>

      <ProfileCustomizationModal
        visible={customizationVisible}
        activeTab={customizationTab}
        avatar={selectedAvatar}
        frame={selectedFrame ?? profile.frame}
        streak={profile.streak}
        onClose={() => setCustomizationVisible(false)}
        onTabChange={setCustomizationTab}
        onAvatarChange={setSelectedAvatar}
        onFrameChange={setSelectedFrame}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  inlineLoading: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120,
  },
  logoutButton: {
    width: "100%",
    borderRadius: 999,
  },
  logoutButtonContent: {
    minHeight: 44,
    paddingHorizontal: 6,
  },
});
