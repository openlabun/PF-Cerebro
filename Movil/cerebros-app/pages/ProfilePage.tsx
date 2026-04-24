import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Card, Text } from 'react-native-paper';

import { useAppTheme } from '@/constants/theme';
import { useAuth } from '@/context';
import { useAppStyles } from '@/hooks/useAppStyles';
import { appRoutes } from '@/routes';

import AuthRequiredPage from './AuthRequiredPage';

export default function ProfilePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const theme = useAppTheme();
  const ui = useAppStyles();

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

  return (
    <LinearGradient
      colors={ui.gradientColors}
      locations={ui.gradientLocations}
      start={ui.gradientStart}
      end={ui.gradientEnd}
      style={ui.screenStyle}
    >
      <View style={styles.content}>
        <Text style={ui.eyebrowStyle}>Perfil</Text>
        <Text style={ui.titleStyle}>Profile Page</Text>
        <Text style={ui.bodyStyle}>
          Esta pantalla ahora vive dentro del tab de perfil y puede crecer sin
          mezclar la logica de navegacion con la vista.
        </Text>

        <Card style={ui.cardStyle}>
          <Card.Content style={ui.cardContentStyle}>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              Ruta activa:{' '}
              <Text style={{ color: theme.colors.primary }}>
                {appRoutes.profile}
              </Text>
            </Text>
          </Card.Content>
        </Card>

        <Button
          mode="contained"
          onPress={() => router.replace(appRoutes.home)}
          contentStyle={ui.buttonContentStyle}
        >
          Volver al inicio
        </Button>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 16,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
});
