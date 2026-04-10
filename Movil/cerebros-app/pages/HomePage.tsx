import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, View } from 'react-native';
import { Button, Card, Switch, Text } from 'react-native-paper';

import { HomeSudokuSection } from '@/components/sudoku/HomeSudokuSection';
import { useThemeMode } from '@/constants/theme';
import { useAppStyles } from '@/hooks/useAppStyles';
import { appRoutes } from '@/routes';
import { SudokuGameProvider } from '@/context/SudokuGameContext';

export default function HomePage() {
  const router = useRouter();
  const { isDark, mode, toggleTheme } = useThemeMode();
  const ui = useAppStyles();

  return (
    <LinearGradient
      colors={ui.gradientColors}
      locations={ui.gradientLocations}
      start={ui.gradientStart}
      end={ui.gradientEnd}
      style={ui.screenStyle}
    >

        <SudokuGameProvider>
          <HomeSudokuSection />
        </SudokuGameProvider>
    </LinearGradient>
  );
}
