const DEFAULT_CONFIG = Object.freeze({
  API_BASE_URL: "/api",
  AUTH_STORAGE_KEY: "cerebro_auth_session",
});

function resolveConfig() {
  const runtimeConfig = window.CEREBRO_CONFIG || {};
  return {
    API_BASE_URL:
      typeof runtimeConfig.API_BASE_URL === "string" && runtimeConfig.API_BASE_URL.trim() !== ""
        ? runtimeConfig.API_BASE_URL.trim().replace(/\/+$/, "")
        : DEFAULT_CONFIG.API_BASE_URL,
    AUTH_STORAGE_KEY:
      typeof runtimeConfig.AUTH_STORAGE_KEY === "string" && runtimeConfig.AUTH_STORAGE_KEY.trim() !== ""
        ? runtimeConfig.AUTH_STORAGE_KEY.trim()
        : DEFAULT_CONFIG.AUTH_STORAGE_KEY,
  };
}

function buildUrl(path) {
  const config = resolveConfig();
  const normalizedPath = String(path || "").replace(/^\/+/, "");
  return normalizedPath ? `${config.API_BASE_URL}/${normalizedPath}` : config.API_BASE_URL;
}

function parseResponse(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getPayloadErrorMessage(payload, status) {
  if (typeof payload !== "object" || payload === null) return `Request failed with status ${status}`;
  if (Array.isArray(payload.message)) {
    const normalized = payload.message.map((item) => String(item).trim()).filter(Boolean);
    if (normalized.length) return normalized.join(". ");
  }
  if (payload.message !== undefined && payload.message !== null) {
    const message = String(payload.message).trim();
    if (message) return message;
  }
  return `Request failed with status ${status}`;
}

async function request(path, options = {}) {
  const headers = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  const response = await fetch(buildUrl(path), {
    method: options.method || "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });
  const raw = await response.text();
  const payload = parseResponse(raw);
  if (!response.ok) {
    const error = new Error(getPayloadErrorMessage(payload, response.status));
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

export const authStorage = {
  getSession() {
    const config = resolveConfig();
    const raw = localStorage.getItem(config.AUTH_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setSession(session) {
    const config = resolveConfig();
    localStorage.setItem(config.AUTH_STORAGE_KEY, JSON.stringify(session));
  },
  clearSession() {
    const config = resolveConfig();
    localStorage.removeItem(config.AUTH_STORAGE_KEY);
  },
  getAccessToken() {
    return this.getSession()?.accessToken || null;
  },
};

export const apiClient = {
  login: (credentials) => request("auth/login", { method: "POST", body: credentials }),
  signup: (payload) => request("auth/signup", { method: "POST", body: payload }),
  verifyEmail: (payload) => request("auth/verify-email", { method: "POST", body: payload }),
  forgotPassword: (payload) => request("auth/forgot-password", { method: "POST", body: payload }),
  resetPassword: (payload) => request("auth/reset-password", { method: "POST", body: payload }),
  refresh: (refreshToken) => request("auth/refresh", { method: "POST", body: { refreshToken } }),
  logout: (accessToken) => request("auth/logout", { method: "POST", token: accessToken }),
  verifyToken: (accessToken) => request("auth/verify-token", { method: "GET", token: accessToken }),
  getMyProfile: (accessToken) => request("profiles/me", { method: "POST", token: accessToken }),
  addExperience: (accessToken, experiencia) =>
    request("profiles/add-experience", { method: "POST", token: accessToken, body: { experiencia } }),
  getMyGameStats: (accessToken, juegoId) =>
    request("game-stats/me", { method: "POST", token: accessToken, body: { juegoId } }),
  createGameSession: (accessToken, payload) =>
    request("game-sessions", { method: "POST", token: accessToken, body: payload }),
  getSudokuSeed: (accessToken, dificultad) => {
    const encoded = encodeURIComponent(String(dificultad || "").trim());
    return request(`game-sessions/sudoku-seed?dificultad=${encoded}&_=${Date.now()}`, {
      method: "GET",
      token: accessToken,
    });
  },
  increaseStreak: (accessToken) =>
    request("streaks/increase", { method: "POST", token: accessToken, body: {} }),
};
