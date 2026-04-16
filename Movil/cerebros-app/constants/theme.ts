import { createContext, useContext } from 'react';
import { MD3DarkTheme, MD3LightTheme, useTheme } from 'react-native-paper';

export type ThemeMode = 'light' | 'dark';

type ThemeModeContextValue = {
  isDark: boolean;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const palette = {
  sharedGlow: '#eceefe',
  lightBackground: '#ffffff',
  darkBackground: '#222831',
  lightSurface: '#ffffff',
  darkSurface: '#2b313b',
  lightPrimary: '#1a3b7a',
  darkPrimary: '#d8e2ff',
  lightAccent: '#4464a7',
  darkAccent: '#9fb7ff',
};

export const lightTheme = {
  ...MD3LightTheme,
  roundness: 28,
  colors: {
    ...MD3LightTheme.colors,
    primary: palette.lightPrimary,
    onPrimary: '#ffffff',
    secondary: palette.lightAccent,
    onSecondary: '#ffffff',
    background: palette.lightBackground,
    onBackground: '#121826',
    surface: palette.lightSurface,
    onSurface: '#121826',
    surfaceVariant: '#e8ecf7',
    outline: '#c7d0e4',
    elevation: {
      ...MD3LightTheme.colors.elevation,
      level1: '#fdfdff',
      level2: '#f5f7ff',
      level3: '#edf1fb',
      level4: '#e8edf9',
      level5: '#e2e8f6',
    },
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  roundness: 28,
  colors: {
    ...MD3DarkTheme.colors,
    primary: palette.darkPrimary,
    onPrimary: '#17284d',
    secondary: palette.darkAccent,
    onSecondary: '#0f172a',
    background: palette.darkBackground,
    onBackground: '#edf2ff',
    surface: palette.darkSurface,
    onSurface: '#edf2ff',
    surfaceVariant: '#313845',
    outline: '#485466',
    elevation: {
      ...MD3DarkTheme.colors.elevation,
      level1: '#2a303a',
      level2: '#303742',
      level3: '#353d49',
      level4: '#39424f',
      level5: '#3e4755',
    },
  },
};

export const backgroundGlow = palette.sharedGlow;

export const ThemeModeContext = createContext<ThemeModeContextValue>({
  isDark: false,
  mode: 'light',
  setMode: () => undefined,
  toggleTheme: () => undefined,
});

export function useThemeMode() {
  return useContext(ThemeModeContext);
}

export type AppTheme = typeof lightTheme;

export function useAppTheme() {
  return useTheme<AppTheme>();
}
