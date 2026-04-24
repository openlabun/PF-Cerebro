import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import {
  type ProfileBadgeKey,
  profileBadgeOptions,
} from './profileCustomization';

type ProfileBadgesProps = {
  selectedBadges: Array<ProfileBadgeKey | null>;
  unlockedBadges: Set<ProfileBadgeKey>;
  isAuthenticated: boolean;
  onBadgeSlotPress: (slot: number) => void;
};

const badgeEmojiMap: Record<ProfileBadgeKey, string> = Object.fromEntries(
  profileBadgeOptions.map((badge) => [badge.key, badge.icon]),
) as Record<ProfileBadgeKey, string>;

export function ProfileBadges({
  selectedBadges,
  unlockedBadges,
  isAuthenticated,
  onBadgeSlotPress,
}: ProfileBadgesProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 390;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.dark ? '#363c47' : theme.colors.elevation.level3,
          borderColor: theme.colors.outline,
          paddingHorizontal: compact ? 14 : 16,
          paddingVertical: compact ? 14 : 16,
        },
      ]}
    >
      <Text
        style={[
          styles.title,
          {
            color: theme.colors.onSurface,
            fontSize: compact ? 16 : 18,
            lineHeight: compact ? 22 : 24,
          },
        ]}
      >
        Badges
      </Text>

      <Text
        style={[
          styles.subtitle,
          {
            color: theme.colors.onSurfaceVariant,
            fontSize: compact ? 13 : 14,
            lineHeight: compact ? 18 : 20,
          },
        ]}
      >
        {isAuthenticated
          ? 'Selecciona un círculo para elegir una insignia.'
          : 'Inicia sesión para desbloquear insignias.'}
      </Text>

      <View style={[styles.grid, { gap: compact ? 10 : 12 }]}>
        {selectedBadges.map((badgeKey, index) => (
          <Pressable
            key={`badge-slot-${index}`}
            accessibilityRole="button"
            accessibilityLabel={`Badge ${index + 1}`}
            disabled={!isAuthenticated}
            onPress={() => isAuthenticated && onBadgeSlotPress(index)}
            style={[
              styles.badgeSlot,
              {
                width: compact ? 46 : 54,
                height: compact ? 46 : 54,
                borderColor: theme.colors.outline,
                backgroundColor: theme.dark ? '#44505a' : theme.colors.elevation.level4,
              },
              badgeKey ? styles.badgeSelected : null,
            ]}
          >
            <Text style={styles.badgeEmoji}>
              {badgeKey && unlockedBadges.has(badgeKey) ? badgeEmojiMap[badgeKey] : ''}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
  },
  title: {
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 4,
    textAlign: 'center',
  },
  grid: {
    marginTop: 14,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  badgeSlot: {
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeSelected: {
    shadowColor: '#76abae',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 2,
  },
  badgeEmoji: {
    fontSize: 24,
    lineHeight: 28,
  },
});
