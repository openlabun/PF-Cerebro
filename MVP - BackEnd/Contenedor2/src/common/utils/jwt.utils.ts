import { jwtDecode } from 'jwt-decode';

type RobleJwtPayload = {
  sub?: string;
  email?: string;
  dbName?: string;
  role?: string;
};

export function getUserIdFromAccessToken(accessToken: string): string | null {
  try {
    const payload = jwtDecode<RobleJwtPayload>(accessToken);
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
