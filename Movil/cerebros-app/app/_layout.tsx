import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { setBackgroundColorAsync } from 'expo-system-ui';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';

import { AuthProvider } from '@/context';
import { ThemeMode, ThemeModeContext, darkTheme, lightTheme } from '@/constants/theme';
import { rootStackScreens } from '@/routes';

export default function RootLayout() {
  const systemColorScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(systemColorScheme === 'dark' ? 'dark' : 'light');

  const isDark = mode === 'dark';
  const theme = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    setBackgroundColorAsync(theme.colors.background).catch(() => undefined);
  }, [theme.colors.background]);

  return (
    <ThemeModeContext.Provider
      value={{
        isDark,
        mode,
        setMode,
        toggleTheme: () => setMode((currentMode) => (currentMode === 'dark' ? 'light' : 'dark')),
      }}
    >
      <AuthProvider>
        <PaperProvider theme={theme}>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: theme.colors.background },
              headerShadowVisible: false,
              headerStyle: { backgroundColor: theme.colors.surface },
              headerTintColor: theme.colors.onSurface,
            }}
          >
            {rootStackScreens.map((screen) => (
              <Stack.Screen key={screen.name} name={screen.name} options={screen.options} />
            ))}
          </Stack>
        </PaperProvider>
      </AuthProvider>
    </ThemeModeContext.Provider>
  );
}
