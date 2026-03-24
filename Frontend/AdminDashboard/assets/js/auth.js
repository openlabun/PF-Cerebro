(function bootstrapAdminAuth() {
  const STORAGE_KEY = 'cerebro.admin.session';
  const FLASH_KEY = 'cerebro.admin.flash';

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function readSession() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return { accessToken: '', refreshToken: '' };
      const parsed = JSON.parse(raw);
      return {
        accessToken: normalizeText(parsed?.accessToken),
        refreshToken: normalizeText(parsed?.refreshToken),
      };
    } catch {
      return { accessToken: '', refreshToken: '' };
    }
  }

  function writeSession(session) {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        accessToken: normalizeText(session?.accessToken),
        refreshToken: normalizeText(session?.refreshToken),
      }),
    );
  }

  function clearSession() {
    window.localStorage.removeItem(STORAGE_KEY);
  }

  function setFlashMessage(message) {
    const normalized = normalizeText(message);
    if (!normalized) return;
    window.sessionStorage.setItem(FLASH_KEY, normalized);
  }

  function consumeFlashMessage() {
    const message = normalizeText(window.sessionStorage.getItem(FLASH_KEY));
    if (message) {
      window.sessionStorage.removeItem(FLASH_KEY);
    }
    return message;
  }

  function decodeJwtPayload(token) {
    const rawToken = normalizeText(token);
    if (!rawToken) return null;
    const parts = rawToken.split('.');
    if (parts.length < 2) return null;

    try {
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      return JSON.parse(window.atob(padded));
    } catch {
      return null;
    }
  }

  function isTokenExpired(token) {
    const payload = decodeJwtPayload(token);
    if (!payload || typeof payload.exp !== 'number') {
      return false;
    }
    return Date.now() >= payload.exp * 1000 - 5000;
  }

  function normalizeNextPath(nextPath) {
    const raw = normalizeText(nextPath);
    if (!raw || !raw.startsWith('/') || raw.startsWith('//')) {
      return '/tabs/datos.html';
    }
    return raw;
  }

  function buildLoginUrl(nextPath) {
    const normalizedNext = normalizeNextPath(nextPath);
    if (!normalizedNext || normalizedNext === '/tabs/datos.html') {
      return '/';
    }
    return `/?next=${encodeURIComponent(normalizedNext)}`;
  }

  function redirectToLogin(message) {
    if (message) {
      setFlashMessage(message);
    }
    const current =
      window.location.pathname === '/'
        ? '/tabs/datos.html'
        : `${window.location.pathname}${window.location.search}`;
    window.location.replace(buildLoginUrl(current));
  }

  async function parseResponse(response) {
    const raw = await response.text();
    let payload = null;

    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = null;
      }
    }

    return { response, raw, payload };
  }

  function buildError(result) {
    const detail =
      result.payload?.message ||
      result.payload?.error ||
      (result.raw && !result.payload
        ? `HTTP ${result.response.status} (respuesta no JSON)`
        : `HTTP ${result.response.status}`);
    const error = new Error(Array.isArray(detail) ? detail.join(', ') : String(detail));
    error.status = result.response.status;
    return error;
  }

  function extractTokens(payload) {
    const source = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
    return {
      accessToken: normalizeText(source?.accessToken),
      refreshToken: normalizeText(source?.refreshToken),
    };
  }

  async function fetchJson(url, options = {}) {
    const authRequired = options.auth !== false;
    const session = readSession();
    const headers = new Headers(options.headers || {});
    headers.set('Accept', 'application/json');

    if (authRequired) {
      const accessToken = normalizeText(session.accessToken);
      if (!accessToken || isTokenExpired(accessToken)) {
        clearSession();
        redirectToLogin('Inicia sesion para continuar.');
        throw new Error('Missing or expired session');
      }
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    const result = await parseResponse(
      await fetch(url, {
        ...options,
        headers,
      }),
    );

    if (!result.response.ok) {
      const error = buildError(result);
      if (authRequired && (result.response.status === 401 || result.response.status === 403)) {
        clearSession();
        redirectToLogin(
          result.response.status === 403
            ? 'Tu cuenta no tiene permisos de administrador.'
            : 'Tu sesion expiro. Inicia sesion de nuevo.',
        );
      }
      throw error;
    }

    if (result.raw && !result.payload) {
      throw new Error('Respuesta invalida del servidor (no JSON)');
    }

    return result.payload;
  }

  function requireSession(options = {}) {
    const redirectOnFail = options.redirectOnFail !== false;
    const session = readSession();
    const accessToken = normalizeText(session.accessToken);
    if (!accessToken || isTokenExpired(accessToken)) {
      clearSession();
      if (redirectOnFail) {
        redirectToLogin('Inicia sesion para continuar.');
      }
      return null;
    }

    return session;
  }

  async function login(email, password) {
    const payload = await fetchJson('/api/admin/auth/login', {
      method: 'POST',
      auth: false,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const session = extractTokens(payload);
    if (!session.accessToken) {
      throw new Error('No fue posible iniciar sesion.');
    }

    writeSession(session);
    return session;
  }

  async function logout(options = {}) {
    const redirect = options.redirect !== false;

    try {
      const session = readSession();
      if (normalizeText(session.accessToken)) {
        await fetchJson('/api/admin/auth/logout', {
          method: 'POST',
        });
      }
    } catch {
      // Siempre limpiamos la sesion local, incluso si ROBLE ya invalido el token.
    } finally {
      clearSession();
    }

    if (redirect) {
      window.location.replace('/');
    }
  }

  function bindLogoutButtons() {
    document.querySelectorAll('[data-admin-logout]').forEach((button) => {
      if (button.dataset.authBound === '1') return;
      button.dataset.authBound = '1';
      button.addEventListener('click', async () => {
        button.disabled = true;
        try {
          await logout();
        } finally {
          button.disabled = false;
        }
      });
    });
  }

  window.AdminAuth = {
    readSession,
    requireSession,
    fetchJson,
    login,
    logout,
    bindLogoutButtons,
    consumeFlashMessage,
    redirectToLogin,
    normalizeNextPath,
  };
})();
