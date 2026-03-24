import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface CerebroPvpSyncPlayerSnapshot {
  userId: string;
  slot: number;
  result: string;
  finalScore: number;
  mistakes: number;
  correctCells: number;
  finished: boolean;
  finishedAt: string | null;
  durationMs: number | null;
  eloBefore?: number | null;
  eloAfter?: number | null;
}

export interface CerebroPvpSyncMatchSnapshot {
  externalMatchId: string;
  seed: number;
  difficultyKey: string;
  mode: 'standalone' | 'torneo';
  torneoId: string | null;
  status: 'WAITING' | 'ACTIVE' | 'FINISHED' | 'FORFEIT';
  winnerUserId: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  endedReason: string | null;
  forfeitedByUserId: string | null;
  players: CerebroPvpSyncPlayerSnapshot[];
}

@Injectable()
export class CerebroPvpSyncService {
  private readonly logger = new Logger(CerebroPvpSyncService.name);
  private readonly contenedor1BaseUrl: string;
  private readonly serviceEmail: string;
  private readonly servicePassword: string;
  private cachedAccessToken = '';
  private cachedAccessTokenExpMs = 0;
  private warnedAboutMissingConfig = false;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.contenedor1BaseUrl = String(
      this.config.get<string>('CONTENEDOR1_BASE_URL') || '',
    )
      .trim()
      .replace(/\/+$/, '');
    this.serviceEmail = String(
      this.config.get<string>('CONTENEDOR1_SERVICE_EMAIL') ||
        this.config.get<string>('ADMIN_EMAIL') ||
        '',
    ).trim();
    this.servicePassword =
      this.config.get<string>('CONTENEDOR1_SERVICE_PASSWORD') ||
      this.config.get<string>('ADMIN_PASSWORD') ||
      '';
  }

  private isConfigured() {
    return Boolean(
      this.contenedor1BaseUrl && this.serviceEmail && this.servicePassword,
    );
  }

  private warnMissingConfigOnce() {
    if (this.warnedAboutMissingConfig) return;
    this.warnedAboutMissingConfig = true;
    this.logger.warn(
      'Sincronizacion PvP -> Cerebro deshabilitada: faltan CONTENEDOR1_BASE_URL y/o credenciales de servicio.',
    );
  }

  private extractAccessToken(payload: unknown): string {
    if (!payload || typeof payload !== 'object') return '';
    const direct = (payload as Record<string, unknown>).accessToken;
    if (typeof direct === 'string' && direct.trim()) return direct.trim();

    const data = (payload as { data?: unknown }).data;
    if (!data || typeof data !== 'object') return '';
    const nested = (data as Record<string, unknown>).accessToken;
    return typeof nested === 'string' ? nested.trim() : '';
  }

  private decodeJwtExpMs(token: string) {
    try {
      if (!token) return 0;
      const parts = token.split('.');
      if (parts.length < 2) return 0;
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf8'),
      ) as { exp?: number };
      if (typeof payload.exp !== 'number') return 0;
      return payload.exp * 1000;
    } catch {
      return 0;
    }
  }

  private async getServiceAccessToken() {
    const now = Date.now();
    if (
      this.cachedAccessToken &&
      this.cachedAccessTokenExpMs > now + 10_000
    ) {
      return this.cachedAccessToken;
    }

    const response = await firstValueFrom(
      this.http.post(`${this.contenedor1BaseUrl}/auth/login`, {
        email: this.serviceEmail,
        password: this.servicePassword,
      }),
    );

    const accessToken = this.extractAccessToken(response.data);
    if (!accessToken) {
      throw new Error(
        'No fue posible obtener un accessToken de Cerebro para sincronizar PvP.',
      );
    }

    this.cachedAccessToken = accessToken;
    this.cachedAccessTokenExpMs =
      this.decodeJwtExpMs(accessToken) || Date.now() + 15 * 60 * 1000;
    return accessToken;
  }

  async syncMatchSnapshot(snapshot: CerebroPvpSyncMatchSnapshot) {
    if (!this.isConfigured()) {
      this.warnMissingConfigOnce();
      return { ok: false, skipped: true };
    }

    try {
      const accessToken = await this.getServiceAccessToken();
      const response = await firstValueFrom(
        this.http.post(`${this.contenedor1BaseUrl}/pvp-history/sync`, snapshot, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );
      return response.data;
    } catch (error: any) {
      this.logger.warn(
        `No se pudo sincronizar match PvP ${snapshot.externalMatchId} hacia Cerebro: ${error?.response?.data?.message || error?.message || error}`,
      );
      return { ok: false, skipped: false };
    }
  }
}
