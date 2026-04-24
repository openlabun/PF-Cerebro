import { LinearGradient } from 'expo-linear-gradient';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { IconButton, Text, useTheme } from 'react-native-paper';

import {
  type ProfileAvatar,
  type ProfileFrameKey,
  profileAvatarOptions,
  profileFrameOptions,
  profileFramePalette,
} from './profileCustomization';

type ProfileCustomizationModalProps = {
  visible: boolean;
  activeTab: 'avatar' | 'frame';
  avatar: ProfileAvatar;
  frame: ProfileFrameKey;
  streak: number;
  onClose: () => void;
  onTabChange: (tab: 'avatar' | 'frame') => void;
  onAvatarChange: (avatar: ProfileAvatar) => void;
  onFrameChange: (frame: ProfileFrameKey) => void;
};

export function ProfileCustomizationModal({
  visible,
  activeTab,
  avatar,
  frame,
  streak,
  onClose,
  onTabChange,
  onAvatarChange,
  onFrameChange,
}: ProfileCustomizationModalProps) {
  const theme = useTheme();

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
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.colors.onSurface }]}>
              Personaliza perfil
            </Text>
            <IconButton
              icon="close"
              size={20}
              iconColor={theme.colors.onSurface}
              onPress={onClose}
              style={styles.closeButton}
            />
          </View>

          <View style={styles.tabs}>
            <Pressable
              onPress={() => onTabChange('avatar')}
              style={[
                styles.tab,
                activeTab === 'avatar' && [
                  styles.tabActive,
                  { borderColor: theme.colors.onSurface },
                ],
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'avatar' ? theme.colors.onSurface : theme.colors.onSurfaceVariant },
                ]}
              >
                Foto
              </Text>
            </Pressable>

            <Pressable
              onPress={() => onTabChange('frame')}
              style={[
                styles.tab,
                activeTab === 'frame' && [
                  styles.tabActive,
                  { borderColor: theme.colors.onSurface },
                ],
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: activeTab === 'frame' ? theme.colors.onSurface : theme.colors.onSurfaceVariant },
                ]}
              >
                Marco
              </Text>
            </Pressable>
          </View>

          {activeTab === 'avatar' ? (
            <View style={styles.grid}>
              {profileAvatarOptions.map((option) => {
                const isActive = avatar === option;

                return (
                  <Pressable
                    key={option}
                    onPress={() => {
                      onAvatarChange(option);
                      onClose();
                    }}
                    style={[
                      styles.avatarOption,
                      {
                        backgroundColor: theme.dark ? '#44505a' : theme.colors.elevation.level3,
                        borderColor: isActive ? theme.colors.primary : 'transparent',
                      },
                    ]}
                  >
                    <Text style={[styles.avatarOptionText, { color: theme.colors.onSurface }]}>
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.grid}>
              {profileFrameOptions
                .filter((option) =>
                  [
                    'frame-royal',
                    'frame-arcane',
                    'frame-neon',
                    'frame-ember',
                    'frame-ice',
                    'frame-inferno',
                  ].includes(option.key),
                )
                .map((option) => {
                  const isUnlocked = streak >= option.minStreak;
                  const isActive = frame === option.key;

                  return (
                    <Pressable
                      key={option.key}
                      disabled={!isUnlocked}
                      onPress={() => {
                        onFrameChange(option.key);
                        onClose();
                      }}
                      style={[
                        styles.frameOptionShell,
                        {
                          borderColor: isActive ? theme.colors.onSurface : 'transparent',
                          opacity: isUnlocked ? 1 : 0.72,
                        },
                      ]}
                    >
                      <LinearGradient
                        colors={profileFramePalette[option.key]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.frameOption}
                      >
                        {!isUnlocked ? (
                          <Text style={styles.lockText}>LOCK</Text>
                        ) : null}
                      </LinearGradient>
                    </Pressable>
                  );
                })}
            </View>
          )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
  },
  closeButton: {
    margin: 0,
  },
  tabs: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  tab: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  tabText: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  avatarOption: {
    width: 88,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  avatarOptionText: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '400',
  },
  frameOptionShell: {
    width: 88,
    height: 52,
    borderRadius: 14,
    padding: 2,
    borderWidth: 2,
  },
  frameOption: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockText: {
    color: '#b8bec8',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
