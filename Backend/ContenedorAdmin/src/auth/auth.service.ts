import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

export interface RobleUserPayload {
  sub: string;
  email: string;
  name?: string;
  nombre?: string;
  role?: string;
  dbName?: string;
}

type RobleVerifyTokenResponse = {
  valid?: boolean;
  user?: unknown;
};

@Injectable()
export class AuthService {
  private readonly robleAuthBase = String(process.env.ROBLE_AUTH_BASE || '').replace(
    /\/+$/,
    '',
  );
  private readonly dbName = String(process.env.ROBLE_DBNAME || '').trim();

  private ensureRobleConfig() {
    if (!this.robleAuthBase || !this.dbName) {
      throw new Error('ROBLE_AUTH_BASE/ROBLE_DBNAME no configurados.');
    }
  }

  private resolveUserId(user: unknown): string | null {
    if (!user || typeof user !== 'object') {
      return null;
    }

    const userRecord = user as Record<string, unknown>;
    const candidates = [
      userRecord.sub,
      userRecord.id,
      userRecord.userId,
      userRecord.usuarioId,
    ];

    for (const candidate of candidates) {
      if (typeof candidate !== 'string') {
        continue;
      }

      const normalized = candidate.trim();
      if (
        normalized &&
        normalized !== 'undefined' &&
        normalized !== 'null'
      ) {
        return normalized;
      }
    }

    return null;
  }

  private normalizeUser(user: unknown): RobleUserPayload {
    if (!user || typeof user !== 'object') {
      throw new UnauthorizedException('Token payload invalido');
    }

    const record = user as Record<string, unknown>;
    const sub = this.resolveUserId(record);
    if (!sub) {
      throw new UnauthorizedException('Token payload invalido');
    }

    const email = typeof record.email === 'string' ? record.email.trim() : '';
    if (!email) {
      throw new UnauthorizedException('Token payload invalido');
    }

    return {
      sub,
      email,
      name: typeof record.name === 'string' ? record.name : undefined,
      nombre: typeof record.nombre === 'string' ? record.nombre : undefined,
      role: typeof record.role === 'string' ? record.role : undefined,
      dbName: typeof record.dbName === 'string' ? record.dbName : undefined,
    };
  }

  private ensureAdminRole(user: RobleUserPayload) {
    if (String(user.role ?? '').trim().toLowerCase() !== 'admin') {
      throw new ForbiddenException(
        'La cuenta autenticada no tiene permisos de administrador.',
      );
    }
    return user;
  }

  private extractToken(payload: unknown, key: 'accessToken' | 'refreshToken') {
    if (!payload || typeof payload !== 'object') return '';

    const direct = (payload as Record<string, unknown>)[key];
    if (typeof direct === 'string' && direct.trim()) {
      return direct.trim();
    }

    const nestedData = (payload as { data?: unknown }).data;
    if (!nestedData || typeof nestedData !== 'object') return '';

    const nested = (nestedData as Record<string, unknown>)[key];
    if (typeof nested === 'string' && nested.trim()) {
      return nested.trim();
    }

    return '';
  }

  private extractMessage(payload: unknown, raw: string, status: number) {
    if (payload && typeof payload === 'object') {
      const detail =
        (payload as { message?: unknown; error?: unknown }).message ??
        (payload as { message?: unknown; error?: unknown }).error;
      if (Array.isArray(detail)) {
        return detail.join(', ');
      }
      if (detail != null) {
        return String(detail);
      }
    }

    const fallback = raw.trim();
    return fallback || `Request failed with status ${status}`;
  }

  private async requestRoble(
    path: string,
    method: 'GET' | 'POST',
    body?: unknown,
    accessToken?: string,
  ) {
    this.ensureRobleConfig();
    const endpoint = String(path).replace(/^\/+/, '');
    const url = `${this.robleAuthBase}/${this.dbName}/${endpoint}`;

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const raw = await response.text();
    let payload: unknown = null;
    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      const message = this.extractMessage(payload, raw, response.status);
      if (response.status === 401) {
        throw new UnauthorizedException(message);
      }
      if (response.status === 403) {
        throw new ForbiddenException(message);
      }
      throw new Error(message);
    }

    return payload;
  }

  async authenticate(accessToken: string): Promise<RobleUserPayload> {
    if (!accessToken) {
      throw new UnauthorizedException('Empty token');
    }

    const payload = (await this.requestRoble(
      'verify-token',
      'GET',
      undefined,
      accessToken,
    )) as RobleVerifyTokenResponse | null;

    if (!payload?.valid) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return this.normalizeUser(payload.user);
  }

  async login(email: string, password: string) {
    const payload = await this.requestRoble('login', 'POST', { email, password });
    const accessToken = this.extractToken(payload, 'accessToken');
    if (!accessToken) {
      throw new UnauthorizedException(
        'No fue posible obtener access token desde ROBLE.',
      );
    }

    const user = await this.authenticate(accessToken);
    this.ensureAdminRole(user);
    return payload;
  }

  async logout(accessToken: string) {
    return this.requestRoble('logout', 'POST', {}, accessToken);
  }

  assertAdmin(user: RobleUserPayload) {
    return this.ensureAdminRole(user);
  }
}
