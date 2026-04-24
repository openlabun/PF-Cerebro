import { FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { useAppTheme } from '@/constants/theme';

export default function TabsLayout() {
  const theme = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          height: 68,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Jugar',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome6
              name="table-cells"
              iconStyle="solid"
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          headerShown: true,
          headerTransparent: true,
          headerTitle: 'Perfil',
          headerTintColor: theme.dark ? '#ffffff' : '#000000',
          headerTitleStyle: {
            color: theme.dark ? '#ffffff' : '#000000',
          },
          headerShadowVisible: false,
          headerStyle: {
            backgroundColor: 'transparent',
          },
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account"
              color={color}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
