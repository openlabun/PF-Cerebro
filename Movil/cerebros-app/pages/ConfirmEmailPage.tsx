import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, HelperText, Text, TextInput } from 'react-native-paper';

import { useAppTheme } from '@/constants/theme';
import { useAuth } from '@/context';
import { useAppStyles } from '@/hooks/useAppStyles';
import { apiClient } from '@/services';
import { appRoutes } from '@/routes';

function normalizeApiError(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'No pudimos confirmar tu correo. Intenta de nuevo.';
}

export default function ConfirmEmailPage() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const ui = useAppStyles();
  const theme = useAppTheme();
  const { isAuthenticated, isVerified, refreshSession, user } = useAuth();
  const initialEmail = useMemo(() => {
    const raw = params.email;
    const paramEmail = Array.isArray(raw) ? raw[0] ?? '' : raw ?? '';
    return paramEmail || String(user?.email || '');
  }, [params.email, user?.email]);
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    if (isAuthenticated && isVerified) {
      router.replace(appRoutes.profile);
    }
  }, [isAuthenticated, isVerified, router]);

  async function handleSubmit() {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = code.trim();

    if (!normalizedEmail || !normalizedCode) {
      setMessage('Ingresa tu correo y el codigo que recibiste.');
      setSuccessMessage('');
      return;
    }

    try {
      setSubmitting(true);
      setMessage('');
      setSuccessMessage('');

      await apiClient.verifyEmail({
        email: normalizedEmail,
        code: normalizedCode,
      });

      const refreshedSession = await refreshSession();

      setSuccessMessage('Tu correo fue confirmado. Ya puedes continuar.');

      if (refreshedSession?.user?.isVerified || isAuthenticated) {
        router.replace(appRoutes.profile);
        return;
      }

      router.replace({
        pathname: appRoutes.login,
        params: { email: normalizedEmail },
      });
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
          <Text style={ui.eyebrowStyle}>Confirmacion</Text>
          <Text style={styles.title}>Confirma tu cuenta</Text>
          <Text style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
            Revisa tu correo, copia el codigo de confirmacion y pegalo aqui para activar tu cuenta.
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
            label="Codigo"
            value={code}
            onChangeText={setCode}
            autoCapitalize="characters"
            autoCorrect={false}
            textContentType="oneTimeCode"
          />

          <HelperText type="error" visible={Boolean(message)}>
            {message || ' '}
          </HelperText>

          <HelperText type="info" visible={Boolean(successMessage)}>
            {successMessage || ' '}
          </HelperText>

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={submitting}
            disabled={submitting}
            contentStyle={styles.primaryActionContent}
          >
            Confirmar correo
          </Button>

          <Button
            mode="text"
            onPress={() =>
              router.push({
                pathname: appRoutes.login,
                params: email.trim() ? { email: email.trim().toLowerCase() } : undefined,
              })
            }
            disabled={submitting}
          >
            Ir a iniciar sesion
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
