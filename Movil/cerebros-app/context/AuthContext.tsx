import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import {
  apiClient,
  authStorage,
  type AuthSession,
  type AuthTokensResponse,
  type SessionUser,
} from '@/services';

type LoginCredentials = {
  email: string;
  password: string;
  [key: string]: unknown;
};

type SignupPayload = {
  email: string;
  password: string;
  name?: string;
  [key: string]: unknown;
};

type SignupResult = {
  response: AuthTokensResponse;
  session: AuthSession | null;
};

type AuthContextValue = {
  session: AuthSession | null;
  user: SessionUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isVerified: boolean | undefined;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<AuthSession>;
  refreshSession: () => Promise<AuthSession | null>;
  signup: (payload: SignupPayload) => Promise<SignupResult>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const TEMPORARY_PROFILE_NAME_KEY = 'temporaryProfileName';

function getStringField(source: SessionUser = {}, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
}

function getResolvedUserName(sessionUser: SessionUser = {}, verifiedUser: SessionUser = {}) {
  const sessionName =
    getStringField(sessionUser, ['name', 'nombre', 'displayName', 'fullName']) ||
    `${getStringField(sessionUser, ['firstName', 'nombre'])} ${getStringField(sessionUser, ['lastName', 'apellido'])}`.trim();

  if (sessionName) {
    return sessionName;
  }

  const verifiedName =
    getStringField(verifiedUser, ['name', 'nombre', 'displayName', 'fullName']) ||
    `${getStringField(verifiedUser, ['firstName', 'nombre'])} ${getStringField(verifiedUser, ['lastName', 'apellido'])}`.trim();

  if (verifiedName) {
    return verifiedName;
  }

  const fallbackEmail =
    getStringField(verifiedUser, ['email']) || getStringField(sessionUser, ['email']);

  return fallbackEmail ? fallbackEmail.split('@')[0] : '';
}

function getTemporaryProfileName(sessionUser: SessionUser = {}) {
  return getStringField(sessionUser, [TEMPORARY_PROFILE_NAME_KEY]);
}

function normalizeSessionUser(sessionUser: SessionUser = {}, verifiedUser: SessionUser = {}) {
  const fallbackEmail =
    getStringField(verifiedUser, ['email']) || getStringField(sessionUser, ['email']);
  const verificationFlags = [
    verifiedUser.isVerified,
    verifiedUser.verified,
    verifiedUser.emailVerified,
    sessionUser.isVerified,
    sessionUser.verified,
    sessionUser.emailVerified,
  ];
  const resolvedVerification = verificationFlags.find((value) => typeof value === 'boolean');

  return {
    ...sessionUser,
    id: sessionUser.id || verifiedUser.sub || null,
    sub: verifiedUser.sub || sessionUser.sub || sessionUser.id || null,
    email: fallbackEmail,
    name: getResolvedUserName(sessionUser, verifiedUser),
    isVerified: resolvedVerification,
    [TEMPORARY_PROFILE_NAME_KEY]: getTemporaryProfileName(sessionUser),
  };
}

function buildUnifiedSession(sessionLike: AuthSession, verifiedUser: SessionUser = {}) {
  const accessToken = sessionLike.c1AccessToken || sessionLike.accessToken || '';
  const refreshToken =
    sessionLike.c1RefreshToken ||
    sessionLike.refreshToken ||
    sessionLike.c2RefreshToken ||
    '';

  return {
    ...sessionLike,
    accessToken,
    refreshToken,
    c1AccessToken: accessToken,
    c1RefreshToken: refreshToken,
    c2AccessToken: accessToken,
    c2RefreshToken: refreshToken,
    user: normalizeSessionUser((sessionLike.user ?? {}) as SessionUser, verifiedUser),
  } satisfies AuthSession;
}

async function hydrateSession(session: AuthSession) {
  const accessToken = session.c1AccessToken || session.accessToken;

  if (!accessToken) {
    throw new Error('Session without access token');
  }

  const verification = await apiClient.verifyToken(accessToken);
  return buildUnifiedSession(session, verification?.user || {});
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      const stored = await authStorage.getSession();
      const storedAccessToken = stored?.c1AccessToken || stored?.accessToken;

      if (!storedAccessToken) {
        if (mounted) setIsLoading(false);
        return;
      }

      try {
        const hydrated = await hydrateSession(stored);

        if (!mounted) return;

        await authStorage.setSession(hydrated);
        setSession(hydrated);
      } catch {
        const refreshToken = stored?.c1RefreshToken || stored?.refreshToken || stored?.c2RefreshToken;

        if (refreshToken) {
          try {
            const refreshed = await apiClient.refresh(refreshToken);
            const hydrated = await hydrateSession(
              buildUnifiedSession({
                ...stored,
                c1AccessToken: refreshed.accessToken,
                c1RefreshToken: refreshed.refreshToken || refreshToken,
                accessToken: refreshed.accessToken,
                refreshToken: refreshed.refreshToken || refreshToken,
                user: refreshed.user || stored.user,
              }),
            );

            if (!mounted) return;

            await authStorage.setSession(hydrated);
            setSession(hydrated);
          } catch {
            await authStorage.clearSession();
            if (mounted) setSession(null);
          }
        } else {
          await authStorage.clearSession();
          if (mounted) setSession(null);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    void restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  async function login(credentials: LoginCredentials) {
    const response = await apiClient.login(credentials);

    if (!response?.accessToken) {
      throw new Error('Respuesta de login sin accessToken.');
    }

    const hydrated = await hydrateSession(
      buildUnifiedSession({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken || '',
        c1AccessToken: response.accessToken,
        c1RefreshToken: response.refreshToken || '',
        user: response.user || { email: credentials.email },
      }),
    );

    await authStorage.setSession(hydrated);
    setSession(hydrated);
    return hydrated;
  }

  async function refreshSession() {
    if (!session) {
      return null;
    }

    const hydrated = await hydrateSession(session);
    await authStorage.setSession(hydrated);
    setSession(hydrated);
    return hydrated;
  }

  async function signup(payload: SignupPayload) {
    const c1Data = await apiClient.signup(payload);

    if (!c1Data?.accessToken) {
      return { response: c1Data, session: null };
    }

    const hydrated = await hydrateSession(
      buildUnifiedSession({
        accessToken: c1Data.accessToken,
        refreshToken: c1Data.refreshToken || '',
        c1AccessToken: c1Data.accessToken,
        c1RefreshToken: c1Data.refreshToken || '',
        user: {
          ...(c1Data.user || {}),
          name: getStringField((c1Data.user ?? {}) as SessionUser, ['name', 'nombre']) || payload.name,
          email: getStringField((c1Data.user ?? {}) as SessionUser, ['email']) || payload.email,
          [TEMPORARY_PROFILE_NAME_KEY]: String(payload.name || '').trim(),
        },
      }),
    );

    await authStorage.setSession(hydrated);
    setSession(hydrated);
    return { response: c1Data, session: hydrated };
  }

  async function logout() {
    const c1AccessToken = session?.c1AccessToken;

    try {
      await Promise.allSettled([
        c1AccessToken ? apiClient.logout(c1AccessToken) : Promise.resolve(),
      ]);
    } catch {
      // Aunque el backend falle, conviene limpiar la sesion local.
    } finally {
      await authStorage.clearSession();
      setSession(null);
    }
  }

  const value: AuthContextValue = {
    session,
    user: (session?.user as SessionUser | null) || null,
    accessToken: session?.accessToken || session?.c1AccessToken || null,
    isAuthenticated: Boolean(session?.c1AccessToken && session?.c2AccessToken),
    isVerified: session?.user?.isVerified as boolean | undefined,
    isLoading,
    login,
    refreshSession,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
