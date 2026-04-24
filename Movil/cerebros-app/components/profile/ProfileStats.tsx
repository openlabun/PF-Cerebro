import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import {
  type ProfileAvatar,
  type ProfileFrameKey,
  profileFramePalette,
} from './profileCustomization';

type ProfileStatsProps = {
  avatar: ProfileAvatar;
  displayName: string;
  level: number;
  experience: number;
  xpGoal: number;
  streak: number;
  frame: ProfileFrameKey;
  onAvatarPress?: () => void;
};

export function ProfileStats({
  avatar,
  displayName,
  level,
  experience,
  xpGoal,
  streak,
  frame,
  onAvatarPress,
}: ProfileStatsProps) {
  const theme = useTheme();
  const progress = Math.min(1, Math.max(0, experience / Math.max(1, xpGoal)));

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Personalizar perfil"
        onPress={onAvatarPress}
        style={styles.avatarPressable}
      >
        <LinearGradient
          colors={profileFramePalette[frame]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarFrame}
        >
        <View
          style={[
            styles.avatarInner,
            {
                backgroundColor: theme.dark ? '#45505d' : theme.colors.elevation.level4,
                borderColor: theme.dark ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.75)',
              },
            ]}
          >
            <Text
              style={[
                styles.avatarGlyph,
                { color: theme.dark ? '#ffffff' : '#000000' },
              ]}
            >
              {avatar}
            </Text>
          </View>

          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeText}>{level}</Text>
          </View>
        </LinearGradient>
      </Pressable>

      <View style={styles.infoColumn}>
        <Text style={styles.eyebrow}>CUENTA ACTIVA</Text>
        <Text style={[styles.name, { color: theme.colors.onSurface }]}>{displayName}</Text>

        <View style={[styles.streakChip, { borderColor: theme.colors.outline }]}>
          <Text style={styles.streakEmoji}>🔥</Text>
          <Text style={styles.streakText}>{streak}</Text>
        </View>

        <View
          style={[
            styles.progressTrack,
            {
              backgroundColor: theme.dark ? '#46505b' : theme.colors.elevation.level4,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          <LinearGradient
            colors={['#56a4ff', '#7f8de6', '#8f5eff']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={[styles.progressFill, { width: `${progress * 100}%` }]}
          />
        </View>

        <Text style={[styles.meta, { color: theme.colors.onSurfaceVariant }]}>
          Nivel {level} - {experience} / {xpGoal} XP
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 6,
  },
  avatarPressable: {
    borderRadius: 20,
  },
  avatarFrame: {
    width: 96,
    height: 96,
    borderRadius: 20,
    padding: 4,
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#3b49a1',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 12,
    elevation: 8,
  },
  avatarInner: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  levelBadge: {
    position: 'absolute',
    right: -10,
    bottom: -10,
    minWidth: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    backgroundColor: '#79aeb0',
    paddingHorizontal: 8,
  },
  levelBadgeText: {
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
  },
  avatarGlyph: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '400',
  },
  infoColumn: {
    flex: 1,
    gap: 6,
    paddingTop: 4,
    paddingRight: 82,
    position: 'relative',
  },
  eyebrow: {
    color: '#6fa8ac',
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    letterSpacing: 1.8,
  },
  name: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    marginBottom: 2,
  },
  progressTrack: {
    height: 12,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  meta: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
  },
  streakChip: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: '#4b3b27',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  streakEmoji: {
    fontSize: 14,
    lineHeight: 18,
  },
  streakText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
  },
});
