import { LinearGradient } from 'expo-linear-gradient';
import { View } from 'react-native';

import { Header } from '@/components/Header';
import { HomeSudokuSection } from '@/components/sudoku/HomeSudokuSection';
import { useAppStyles } from '@/hooks/useAppStyles';
import { SudokuGameProvider } from '@/context/SudokuGameContext';

export default function HomePage() {
  const ui = useAppStyles();

  return (
    <LinearGradient
      colors={ui.gradientColors}
      locations={ui.gradientLocations}
      start={ui.gradientStart}
      end={ui.gradientEnd}
      style={ui.screenStyle}
    >
      <View style={ui.containerPageStyle}>
        <Header />
        <SudokuGameProvider>
          <HomeSudokuSection />
        </SudokuGameProvider>
      </View>
    </LinearGradient>
  );
}
