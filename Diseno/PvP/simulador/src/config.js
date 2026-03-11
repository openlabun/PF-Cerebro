const DEFAULT_CONFIG = Object.freeze({
  AUTH_API_BASE_URL: 'http://localhost:5051/api',
  PVP_API_BASE_URL: 'http://localhost:3001/api',
  AUTH_STORAGE_KEY: 'cerebro_auth_session',
})

export function resolveConfig() {
  const authBaseUrl = import.meta.env.VITE_AUTH_API_BASE_URL
  const pvpBaseUrl = import.meta.env.VITE_PVP_API_BASE_URL

  return {
    AUTH_API_BASE_URL:
      typeof authBaseUrl === 'string' && authBaseUrl.trim() !== ''
        ? authBaseUrl.trim().replace(/\/+$/, '')
        : DEFAULT_CONFIG.AUTH_API_BASE_URL,
    PVP_API_BASE_URL:
      typeof pvpBaseUrl === 'string' && pvpBaseUrl.trim() !== ''
        ? pvpBaseUrl.trim().replace(/\/+$/, '')
        : DEFAULT_CONFIG.PVP_API_BASE_URL,
    AUTH_STORAGE_KEY: DEFAULT_CONFIG.AUTH_STORAGE_KEY,
  }
}
