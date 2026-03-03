const DEFAULT_CONFIG = Object.freeze({
  API_BASE_URL: "/api",
  AUTH_STORAGE_KEY: "cerebro_auth_session",
});

function resolveConfig() {
  const runtimeConfig = window.CEREBRO_CONFIG || {};

  return {
    API_BASE_URL:
      typeof runtimeConfig.API_BASE_URL === "string" &&
      runtimeConfig.API_BASE_URL.trim() !== ""
        ? runtimeConfig.API_BASE_URL.trim().replace(/\/+$/, "")
        : DEFAULT_CONFIG.API_BASE_URL,
    AUTH_STORAGE_KEY:
      typeof runtimeConfig.AUTH_STORAGE_KEY === "string" &&
      runtimeConfig.AUTH_STORAGE_KEY.trim() !== ""
        ? runtimeConfig.AUTH_STORAGE_KEY.trim()
        : DEFAULT_CONFIG.AUTH_STORAGE_KEY,
  };
}

function buildUrl(path) {
  const config = resolveConfig();
  const normalizedPath = String(path || "").replace(/^\/+/, "");
  return normalizedPath
    ? `${config.API_BASE_URL}/${normalizedPath}`
    : config.API_BASE_URL;
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
  if (typeof payload !== "object" || payload === null) {
    return `Request failed with status ${status}`;
  }

  const rawMessage = payload.message;

  if (Array.isArray(rawMessage)) {
    const normalized = rawMessage
      .map((item) => String(item).trim())
      .filter(Boolean);
    if (normalized.length) return normalized.join(". ");
  }

  if (rawMessage !== undefined && rawMessage !== null) {
    const message = String(rawMessage).trim();
    if (message) return message;
  }

  return `Request failed with status ${status}`;
}

async function request(path, options = {}) {
  const method = options.method || "GET";
  const body = options.body;
  const token = options.token;
  const signal = options.signal;

  const headers = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(buildUrl(path), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  const raw = await response.text();
  const payload = parseResponse(raw);

  if (!response.ok) {
    const message = getPayloadErrorMessage(payload, response.status);

    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

const authStorage = {
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
    const session = this.getSession();
    return session?.accessToken || null;
  },

  getRefreshToken() {
    const session = this.getSession();
    return session?.refreshToken || null;
  },
};

const apiClient = {
  ping() {
    return request("");
  },

  login(credentials) {
    return request("auth/login", {
      method: "POST",
      body: credentials,
    });
  },

  signup(payload) {
    return request("auth/signup", {
      method: "POST",
      body: payload,
    });
  },

  verifyEmail(payload) {
    return request("auth/verify-email", {
      method: "POST",
      body: payload,
    });
  },

  forgotPassword(payload) {
    return request("auth/forgot-password", {
      method: "POST",
      body: payload,
    });
  },

  resetPassword(payload) {
    return request("auth/reset-password", {
      method: "POST",
      body: payload,
    });
  },

  refresh(refreshToken) {
    return request("auth/refresh", {
      method: "POST",
      body: { refreshToken },
    });
  },

  logout(accessToken) {
    return request("auth/logout", {
      method: "POST",
      token: accessToken,
    });
  },

  verifyToken(accessToken) {
    return request("auth/verify-token", {
      method: "GET",
      token: accessToken,
    });
  },

  getMyProfile(accessToken) {
    return request("profiles/me", {
      method: "POST",
      token: accessToken,
    });
  },

  getTorneos(accessToken) {
    return request("torneos", {
      method: "GET",
      token: accessToken,
    });
  },
};

export { apiClient, authStorage, request };
