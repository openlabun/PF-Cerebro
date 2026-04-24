import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useHeaderHeight } from "@react-navigation/elements";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ActivityIndicator, Button } from "react-native-paper";

import { useAppTheme } from "@/constants/theme";
import { useAuth } from "@/context";
import { useAppStyles } from "@/hooks/useAppStyles";
import { appRoutes } from "@/routes";
import { apiClient } from "@/services";

import { ProfileBadgeModal } from "@/components/profile/ProfileBadgeModal";
import { ProfileBadges } from "@/components/profile/ProfileBadges";
import { ProfileCustomizationModal } from "@/components/profile/ProfileCustomizationModal";
import { ProfileModeStats } from "@/components/profile/ProfileModeStats";
import { ProfileStats } from "@/components/profile/ProfileStats";
import {
  achievementIdKeyMap,
  type ProfileAvatar,
  type ProfileBadgeKey,
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
  frame: ProfileFrameKey;
};

type ProfileModeStatsState = {
  sudoku: string[];
  torneos: string[];
  pvp: string[];
};

const DEFAULT_PROFILE_MODE_STATS: ProfileModeStatsState = {
  sudoku: ["Partidas jugadas: -", "Elo: -", "Liga: -"],
  torneos: [
    "Torneos jugados: -",
    "Participaciones: -",
    "Mejor puntaje: -",
    "Puntaje promedio: -",
  ],
  pvp: [
    "Partidas PvP: -",
    "Victorias: - | Derrotas: -",
    "ELO PvP: -",
    "Win rate: -",
  ],
};

const DEFAULT_SELECTED_BADGES: Array<ProfileBadgeKey | null> =
  Array(6).fill(null);

function getUnlockedKeysByRules(
  partidasJugadas = 0,
  elo = 0,
): ProfileBadgeKey[] {
  const unlocked: ProfileBadgeKey[] = [];
  if (partidasJugadas >= 1) unlocked.push("first-game");
  if (partidasJugadas >= 5) unlocked.push("five-games");
  if (partidasJugadas >= 10) unlocked.push("ten-games");
  if (elo > 500) unlocked.push("score-over-500");
  return unlocked;
}

function toNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function xpParaSiguienteNivel(nivel: number) {
  const lvl = Number(nivel) || 1;
  if (lvl >= 1 && lvl <= 10) return lvl * 100;
  if (lvl >= 11 && lvl <= 30) return lvl * 150;
  return lvl * 250;
}

function getFrameByElo(elo = 0): ProfileFrameKey {
  if (elo >= 301) return "frame-platinum";
  if (elo >= 201) return "frame-gold";
  if (elo >= 101) return "frame-silver";
  if (elo >= 1) return "frame-bronze";
  return "frame-royal";
}

function getLeagueByElo(elo = 0) {
  if (elo >= 301) return "Platino";
  if (elo >= 201) return "Oro";
  if (elo >= 101) return "Plata";
  if (elo >= 0) return "Bronce";
  return "-";
}

function isProfileFrame(value: unknown): value is ProfileFrameKey {
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

function getStringCandidate(
  source: Record<string, unknown> | null,
  keys: string[],
) {
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
  return `${firstName} ${lastName}`.trim();
}

function normalizeComparableName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function namesMatch(a: string, b: string) {
  return (
    Boolean(a && b) && normalizeComparableName(a) === normalizeComparableName(b)
  );
}

function getTemporaryAppDisplayName(
  sessionUser: Record<string, unknown> | null,
) {
  return getStringCandidate(sessionUser, ["temporaryProfileName"]);
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

function getPreferredProfileDisplayName(
  profile: Record<string, unknown> | null,
  sessionUser: Record<string, unknown> | null,
) {
  const backendDisplayName = getProfileDisplayName(profile, null);
  const temporaryAppDisplayName = getTemporaryAppDisplayName(sessionUser);

  if (
    temporaryAppDisplayName &&
    (!backendDisplayName ||
      !namesMatch(backendDisplayName, temporaryAppDisplayName))
  ) {
    return temporaryAppDisplayName;
  }

  return backendDisplayName || getProfileDisplayName(null, sessionUser);
}

export default function ProfilePage() {
  const router = useRouter();
  const { accessToken, isAuthenticated, isLoading, logout, user } = useAuth();
  const theme = useAppTheme();
  const ui = useAppStyles();
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const compact = width < 390;
  const currentUserId = String(user?.sub || user?.id || "").trim();
  const sessionDisplayName = getPreferredProfileDisplayName(
    null,
    (user ?? null) as Record<string, unknown> | null,
  );
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState<ProfileAvatar>("♔");
  const [selectedBadges, setSelectedBadges] = useState<
    Array<ProfileBadgeKey | null>
  >(DEFAULT_SELECTED_BADGES);
  const [unlockedBadges, setUnlockedBadges] = useState<Set<ProfileBadgeKey>>(
    new Set(),
  );
  const [badgeModalVisible, setBadgeModalVisible] = useState(false);
  const [activeBadgeSlot, setActiveBadgeSlot] = useState<number | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<ProfileFrameKey | null>(
    null,
  );
  const [customizationVisible, setCustomizationVisible] = useState(false);
  const [customizationTab, setCustomizationTab] = useState<"avatar" | "frame">(
    "avatar",
  );
  const [modeStats, setModeStats] = useState<ProfileModeStatsState>(
    DEFAULT_PROFILE_MODE_STATS,
  );
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
    if (!isAuthenticated) {
      setModeStats(DEFAULT_PROFILE_MODE_STATS);
      setUnlockedBadges(new Set());
      setSelectedBadges(DEFAULT_SELECTED_BADGES);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      if (!isAuthenticated || !accessToken) return;

      try {
        setProfileLoading(true);
        const [
          profileResponseRaw,
          sudokuStatsRaw,
          tournamentResultsRaw,
          pvpRankingRaw,
        ] = await Promise.all([
          apiClient.getMyProfile(accessToken).catch(() => null),
          apiClient
            .getMyGameStats(accessToken, GAME_ID_SUDOKU)
            .catch(() => null),
          currentUserId
            ? apiClient
                .getTournamentResultsByUser(currentUserId, accessToken)
                .catch(() => [])
            : Promise.resolve([]),
          apiClient.getMyPvpRanking(accessToken).catch(() => null),
        ]);

        const profileResponse = (profileResponseRaw ?? null) as Record<
          string,
          unknown
        > | null;
        const sudokuStats = (sudokuStatsRaw ?? null) as Record<
          string,
          unknown
        > | null;
        const tournamentResults = Array.isArray(tournamentResultsRaw)
          ? tournamentResultsRaw
          : [];
        const pvpRanking = (pvpRankingRaw ?? null) as Record<
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
        const sudokuElo = Math.max(
          0,
          Math.floor(toNumber(sudokuStats?.elo, 0)),
        );
        const sudokuGamesPlayed = Math.max(
          0,
          Math.floor(toNumber(sudokuStats?.partidasJugadas, 0)),
        );

        const uniqueTournamentCount = new Set(
          tournamentResults
            .map((item) =>
              String((item as Record<string, unknown>)?.torneoId || "").trim(),
            )
            .filter(Boolean),
        ).size;
        const participaciones = tournamentResults.length;
        const tournamentScores = tournamentResults
          .map((item) => Number((item as Record<string, unknown>)?.puntaje))
          .filter((value) => Number.isFinite(value));
        const bestTournamentScore = tournamentScores.length
          ? Math.max(...tournamentScores)
          : null;
        const averageTournamentScore = tournamentScores.length
          ? Math.round(
              tournamentScores.reduce((total, value) => total + value, 0) /
                tournamentScores.length,
            )
          : null;

        const pvpElo = Number(pvpRanking?.elo);
        const pvpVictories = Number(pvpRanking?.victorias);
        const pvpDefeats = Number(pvpRanking?.derrotas);
        const hasValidPvpStats =
          Number.isFinite(pvpElo) &&
          Number.isFinite(pvpVictories) &&
          Number.isFinite(pvpDefeats);
        const pvpTotal = hasValidPvpStats
          ? Math.max(0, pvpVictories + pvpDefeats)
          : 0;
        const pvpWinRate =
          hasValidPvpStats && pvpTotal > 0
            ? `${((pvpVictories / pvpTotal) * 100).toFixed(1)}%`
            : "-";
        const localUnlocked = new Set(
          getUnlockedKeysByRules(sudokuGamesPlayed, sudokuElo),
        );

        setUnlockedBadges((current) => {
          const next = new Set([...current, ...localUnlocked]);

          setSelectedBadges((previous) => {
            const updated = [...previous];
            const unlockedArray = Array.from(next);

            for (let index = 0; index < updated.length; index += 1) {
              if (!updated[index] && unlockedArray[index]) {
                updated[index] = unlockedArray[index];
              }
            }

            return updated;
          });

          return next;
        });

        setProfile({
          displayName:
            getPreferredProfileDisplayName(
              profileResponse,
              (user ?? null) as Record<string, unknown> | null,
            ) || sessionDisplayName,
          level,
          experience,
          xpGoal: xpParaSiguienteNivel(level),
          streak,
          frame: getProfileFrame(profileResponse, sudokuStats),
        });

        setModeStats({
          sudoku: [
            `Partidas jugadas: ${sudokuGamesPlayed}`,
            `Elo: ${sudokuElo}`,
            `Liga: ${getLeagueByElo(sudokuElo)}`,
          ],
          torneos: [
            `Torneos jugados: ${uniqueTournamentCount}`,
            `Participaciones: ${participaciones}`,
            `Mejor puntaje: ${bestTournamentScore ?? "-"}`,
            `Puntaje promedio: ${averageTournamentScore ?? "-"}`,
          ],
          pvp: hasValidPvpStats
            ? [
                `Partidas PvP: ${pvpTotal}`,
                `Victorias: ${pvpVictories} | Derrotas: ${pvpDefeats}`,
                `ELO PvP: ${pvpElo}`,
                `Win rate: ${pvpWinRate}`,
              ]
            : DEFAULT_PROFILE_MODE_STATS.pvp,
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
  }, [accessToken, currentUserId, isAuthenticated, sessionDisplayName, user]);

  useEffect(() => {
    let cancelled = false;

    async function loadRemoteAchievements() {
      if (!isAuthenticated || !accessToken) {
        return;
      }

      try {
        const myAchievements = await apiClient.getMyAchievements(accessToken);
        if (!Array.isArray(myAchievements) || cancelled) {
          return;
        }

        const remoteUnlocked = new Set<ProfileBadgeKey>(
          myAchievements
            .map(
              (item) =>
                achievementIdKeyMap[
                  String(
                    (item as Record<string, unknown>)?.logroId || "",
                  ).trim()
                ],
            )
            .filter(Boolean) as ProfileBadgeKey[],
        );

        setUnlockedBadges((current) => {
          const next = new Set([...current, ...remoteUnlocked]);

          setSelectedBadges((previous) => {
            const updated = [...previous];
            const unlockedArray = Array.from(next);

            for (let index = 0; index < updated.length; index += 1) {
              if (!updated[index] && unlockedArray[index]) {
                updated[index] = unlockedArray[index];
              }
            }

            return updated;
          });

          return next;
        });
      } catch {
        // Keep local badge state on failure.
      }
    }

    void loadRemoteAchievements();

    return () => {
      cancelled = true;
    };
  }, [accessToken, isAuthenticated]);

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
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            gap: compact ? 14 : 16,
            paddingHorizontal: compact ? 12 : 16,
            paddingTop: headerHeight + Math.max(8, insets.top * 0.15),
            paddingBottom: compact ? 16 : 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
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

        <ProfileBadges
          selectedBadges={selectedBadges}
          unlockedBadges={unlockedBadges}
          isAuthenticated={isAuthenticated}
          onBadgeSlotPress={(slot) => {
            setActiveBadgeSlot(slot);
            setBadgeModalVisible(true);
          }}
        />

        <ProfileModeStats
          loading={profileLoading}
          stats={modeStats}
          onPressTournamentStats={() => router.push(appRoutes.tournamentStats)}
        />

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
      </ScrollView>

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

      <ProfileBadgeModal
        visible={badgeModalVisible}
        activeBadgeSlot={activeBadgeSlot}
        selectedBadges={selectedBadges}
        unlockedBadges={unlockedBadges}
        onClose={() => setBadgeModalVisible(false)}
        onBadgeSelect={(badgeKey) => {
          if (activeBadgeSlot === null) {
            return;
          }

          setSelectedBadges((current) => {
            const next = [...current];
            next[activeBadgeSlot] = badgeKey;
            return next;
          });
          setBadgeModalVisible(false);
        }}
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
  scroll: {
    flex: 1,
  },
  content: {
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 32,
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
