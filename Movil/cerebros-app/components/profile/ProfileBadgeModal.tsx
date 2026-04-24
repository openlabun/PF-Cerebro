import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

import {
  type ProfileBadgeKey,
  profileBadgeOptions,
} from './profileCustomization';

type ProfileBadgeModalProps = {
  visible: boolean;
  activeBadgeSlot: number | null;
  selectedBadges: Array<ProfileBadgeKey | null>;
  unlockedBadges: Set<ProfileBadgeKey>;
  onClose: () => void;
  onBadgeSelect: (badge: ProfileBadgeKey) => void;
};

export function ProfileBadgeModal({
  visible,
  activeBadgeSlot,
  selectedBadges,
  unlockedBadges,
  onClose,
  onBadgeSelect,
}: ProfileBadgeModalProps) {
  const theme = useTheme();

  if (!visible || activeBadgeSlot === null) {
    return null;
  }

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.dark ? '#363c47' : theme.colors.elevation.level4,
              borderColor: theme.colors.outline,
            },
          ]}
        >
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeText, { color: theme.colors.onSurface }]}>✖</Text>
          </Pressable>

          <Text style={[styles.title, { color: theme.colors.onSurface }]}>
            Elige insignia
          </Text>

          <View style={styles.options}>
            {profileBadgeOptions.map((badge) => {
              const unlocked = unlockedBadges.has(badge.key);
              const isSelected = selectedBadges[activeBadgeSlot] === badge.key;

              return (
                <Pressable
                  key={badge.key}
                  accessibilityRole="button"
                  accessibilityLabel={unlocked ? badge.label : `${badge.label} bloqueado`}
                  disabled={!unlocked}
                  onPress={() => unlocked && onBadgeSelect(badge.key)}
                  style={[
                    styles.option,
                    {
                      backgroundColor: theme.dark ? '#44505a' : theme.colors.elevation.level3,
                      borderColor: isSelected ? theme.colors.onSurface : theme.colors.outline,
                      opacity: unlocked ? 1 : 0.45,
                    },
                  ]}
                >
                  <Text style={styles.optionIcon}>{badge.icon}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 18, 56, 0.45)',
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 4,
  },
  closeText: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    marginBottom: 14,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  option: {
    width: 62,
    height: 62,
    borderRadius: 18,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIcon: {
    fontSize: 28,
    lineHeight: 32,
  },
});
