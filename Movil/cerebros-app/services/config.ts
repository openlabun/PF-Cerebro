import Constants from 'expo-constants';

export type AppConfig = {
  API_ORIGIN: string;
  AUTH_API_BASE_URL: string;
  PVP_API_BASE_URL: string;
  PVP_AUTH_API_BASE_URL: string;
  PVP_WEBHOOK_API_BASE_URL: string;
  PVP_WEBHOOK_RECEIVER_URL: string;
  AUTH_STORAGE_KEY: string;
};

type ExpoExtra = {
  authApiBaseUrl?: string;
  cerebroBaseUrl?: string;
};

const DEFAULT_API_ORIGIN = 'https://cerebro.openlab.uninorte.edu.co';

const DEFAULT_CONFIG: AppConfig = Object.freeze({
  API_ORIGIN: DEFAULT_API_ORIGIN,
  AUTH_API_BASE_URL: `${DEFAULT_API_ORIGIN}/api`,
  PVP_API_BASE_URL: `${DEFAULT_API_ORIGIN}/api/pvp`,
  PVP_AUTH_API_BASE_URL: `${DEFAULT_API_ORIGIN}/api/pvp-auth`,
  PVP_WEBHOOK_API_BASE_URL: `${DEFAULT_API_ORIGIN}/api/pvp-webhook`,
  PVP_WEBHOOK_RECEIVER_URL: `${DEFAULT_API_ORIGIN}/api/webhooks`,
  AUTH_STORAGE_KEY: 'cerebro_auth_session',
});

function normalizeUrl(value: string | undefined) {
  const trimmed = String(value ?? '').trim();
  return trimmed ? trimmed.replace(/\/+$/, '') : '';
}

export function resolveConfig(): AppConfig {
  const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra;

  const apiOrigin =
    normalizeUrl(process.env.EXPO_PUBLIC_CEREBRO_BASE_URL) ||
    normalizeUrl(extra.cerebroBaseUrl) ||
    DEFAULT_CONFIG.API_ORIGIN;

  const authApiBaseUrl =
    normalizeUrl(process.env.EXPO_PUBLIC_AUTH_API_BASE_URL) ||
    normalizeUrl(extra.authApiBaseUrl) ||
    `${apiOrigin}/api`;

  return {
    API_ORIGIN: apiOrigin,
    AUTH_API_BASE_URL: authApiBaseUrl,
    PVP_API_BASE_URL: `${apiOrigin}/api/pvp`,
    PVP_AUTH_API_BASE_URL: `${apiOrigin}/api/pvp-auth`,
    PVP_WEBHOOK_API_BASE_URL: `${apiOrigin}/api/pvp-webhook`,
    PVP_WEBHOOK_RECEIVER_URL: `${apiOrigin}/api/webhooks`,
    AUTH_STORAGE_KEY: DEFAULT_CONFIG.AUTH_STORAGE_KEY,
  };
}
