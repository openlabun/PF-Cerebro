import { jwtDecode } from 'jwt-decode';

type RobleJwtPayload = {
  sub?: string;
  email?: string;
  name?: string;
  dbName?: string;
  role?: string;
};

function decodeAccessToken(accessToken: string): RobleJwtPayload | null {
  try {
    return jwtDecode<RobleJwtPayload>(accessToken);
  } catch {
    return null;
  }
}

export function getUserIdFromAccessToken(accessToken: string): string | null {
  return decodeAccessToken(accessToken)?.sub ?? null;
}

export function getUserDisplayNameFromAccessToken(
  accessToken: string,
): string | null {
  const payload = decodeAccessToken(accessToken);
  const directName =
    typeof payload?.name === 'string' ? payload.name.trim() : '';
  if (directName) return directName;

  const email = typeof payload?.email === 'string' ? payload.email.trim() : '';
  if (!email) return null;

  return email.split('@')[0]?.trim() || null;
}
