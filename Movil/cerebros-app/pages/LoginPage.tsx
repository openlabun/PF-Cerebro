import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';

import { useAppTheme } from '@/constants/theme';
import { useAuth } from '@/context';
import { useAppStyles } from '@/hooks/useAppStyles';
import { appRoutes } from '@/routes';

function normalizeApiError(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'No pudimos iniciar sesion. Intenta de nuevo.';
}

export default function LoginPage() {
  const router = useRouter();
  const ui = useAppStyles();
  const theme = useAppTheme();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(appRoutes.profile);
    }
  }, [isAuthenticated, router]);

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setMessage('Ingresa tu correo y tu contrasena.');
      return;
    }

    try {
      setSubmitting(true);
      setMessage('');
      await login({
        email: email.trim().toLowerCase(),
        password,
      });
      router.replace(appRoutes.profile);
    } catch (error) {
      setMessage(normalizeApiError(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <LinearGradient
      colors={ui.gradientColors}
      locations={ui.gradientLocations}
      start={ui.gradientStart}
      end={ui.gradientEnd}
      style={ui.screenStyle}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.screen}
      >
        <View style={[styles.card, { backgroundColor: theme.colors.elevation.level2 }]}>
          <Text style={ui.eyebrowStyle}>Acceso</Text>
          <Text style={styles.title}>Iniciar sesion</Text>
          <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
            Entra con tu cuenta para continuar en Cerebro.
          </Text>

          <TextInput
            mode="outlined"
            label="Correo"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
          />

          <TextInput
            mode="outlined"
            label="Contrasena"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
          />

          <HelperText type="error" visible={Boolean(message)}>
            {message || ' '}
          </HelperText>

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
            contentStyle={styles.primaryActionContent}
          >
            Iniciar sesion
          </Button>

          <Button
            mode="text"
            onPress={() => router.push(appRoutes.signup)}
            disabled={submitting}
          >
            Crear cuenta
          </Button>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  card: {
    borderRadius: 28,
    padding: 20,
    gap: 14,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
  },
  primaryActionContent: {
    minHeight: 52,
  },
});
