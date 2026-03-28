const DEFAULT_CONFIG = Object.freeze({
  AUTH_API_BASE_URL: '/api',
  ADMIN_LIVE_API_BASE_URL: '/api/admin/live',
  PVP_API_BASE_URL: '/api/pvp',
  PVP_AUTH_API_BASE_URL: '/api/pvp-auth',
  PVP_WEBHOOK_API_BASE_URL: '/api/pvp-webhook',
  PVP_WEBHOOK_RECEIVER_URL: '/api/webhooks',
  AUTH_STORAGE_KEY: 'cerebro_auth_session',
})

function normalizeUrlValue(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim().replace(/\/+$/, '') : ''
}

function resolveAbsoluteAppUrl(value) {
  const normalized = normalizeUrlValue(value)
  if (!normalized) return normalized
  if (/^https?:\/\//i.test(normalized)) return normalized
  if (typeof window === 'undefined' || !window.location?.origin) return normalized
  return new URL(normalized, window.location.origin).toString().replace(/\/+$/, '')
}

export function resolveConfig() {
  const authBaseUrl = import.meta.env.VITE_AUTH_API_BASE_URL
  const webhookReceiverUrl = import.meta.env.VITE_PVP_WEBHOOK_RECEIVER_URL

  return {
    AUTH_API_BASE_URL:
      typeof authBaseUrl === 'string' && authBaseUrl.trim() !== ''
        ? authBaseUrl.trim().replace(/\/+$/, '')
        : DEFAULT_CONFIG.AUTH_API_BASE_URL,
    ADMIN_LIVE_API_BASE_URL: DEFAULT_CONFIG.ADMIN_LIVE_API_BASE_URL,
    PVP_API_BASE_URL: DEFAULT_CONFIG.PVP_API_BASE_URL,
    PVP_AUTH_API_BASE_URL: DEFAULT_CONFIG.PVP_AUTH_API_BASE_URL,
    PVP_WEBHOOK_API_BASE_URL: DEFAULT_CONFIG.PVP_WEBHOOK_API_BASE_URL,
    PVP_WEBHOOK_RECEIVER_URL: resolveAbsoluteAppUrl(
      typeof webhookReceiverUrl === 'string' && webhookReceiverUrl.trim() !== ''
        ? webhookReceiverUrl
        : DEFAULT_CONFIG.PVP_WEBHOOK_RECEIVER_URL,
    ),
    AUTH_STORAGE_KEY: DEFAULT_CONFIG.AUTH_STORAGE_KEY,
  }
}
