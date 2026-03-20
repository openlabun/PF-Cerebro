const DEFAULT_CONFIG = Object.freeze({
  AUTH_API_BASE_URL: 'http://localhost:5051/api',
  PVP_API_BASE_URL: '/api/pvp',
  PVP_AUTH_API_BASE_URL: '/api/pvp-auth',
  PVP_WEBHOOK_API_BASE_URL: '/api/pvp-webhook',
  PVP_WEBHOOK_RECEIVER_URL: 'http://frontend/simulation/pvp/api/webhooks',
  AUTH_STORAGE_KEY: 'cerebro_auth_session',
  PVP_DEFAULT_TOURNAMENT_ID: '',
})

export function resolveConfig() {
  const authBaseUrl = import.meta.env.VITE_AUTH_API_BASE_URL
  const defaultTournamentId = import.meta.env.VITE_PVP_TOURNAMENT_ID

  return {
    AUTH_API_BASE_URL:
      typeof authBaseUrl === 'string' && authBaseUrl.trim() !== ''
        ? authBaseUrl.trim().replace(/\/+$/, '')
        : DEFAULT_CONFIG.AUTH_API_BASE_URL,
    PVP_API_BASE_URL: DEFAULT_CONFIG.PVP_API_BASE_URL,
    PVP_AUTH_API_BASE_URL: DEFAULT_CONFIG.PVP_AUTH_API_BASE_URL,
    PVP_WEBHOOK_API_BASE_URL: DEFAULT_CONFIG.PVP_WEBHOOK_API_BASE_URL,
    PVP_WEBHOOK_RECEIVER_URL: DEFAULT_CONFIG.PVP_WEBHOOK_RECEIVER_URL,
    AUTH_STORAGE_KEY: DEFAULT_CONFIG.AUTH_STORAGE_KEY,
    PVP_DEFAULT_TOURNAMENT_ID:
      typeof defaultTournamentId === 'string' ? defaultTournamentId.trim() : DEFAULT_CONFIG.PVP_DEFAULT_TOURNAMENT_ID,
  }
}
