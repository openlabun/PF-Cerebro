import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { isAxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';
import type {
  RobleInsertResponse,
  RobleLoginResponse,
  RobleRefreshResponse,
  RobleVerifyTokenResponse,
} from './roble.types';

@Injectable()
export class RobleService {
  private readonly logger = new Logger(RobleService.name);
  private readonly dbName: string;
  private readonly authBase: string;
  private readonly dbBase: string;
  private readonly publicReadToken: string | null;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.dbName = this.config.getOrThrow<string>('ROBLE_DBNAME');
    this.authBase = this.config.getOrThrow<string>('ROBLE_AUTH_BASE');
    this.dbBase = this.config.getOrThrow<string>('ROBLE_DB_BASE');
    this.publicReadToken =
      this.config.get<string>('ROBLE_PUBLIC_READ_TOKEN')?.trim() || null;
  }

  private getPublicReadTokenOrThrow(): string {
    if (this.publicReadToken) {
      return this.publicReadToken;
    }

    throw new HttpException(
      {
        statusCode: HttpStatus.SERVICE_UNAVAILABLE,
        message:
          'ROBLE_PUBLIC_READ_TOKEN no esta configurado para lecturas publicas.',
      },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }

  private isGenericAxiosStatusMessage(message: string): boolean {
    return /^Request failed with status code \d+$/i.test(message.trim());
  }

  private summarizeRobleResponseData(responseData: unknown): string | null {
    if (typeof responseData === 'string') {
      const normalized = responseData.replace(/\s+/g, ' ').trim();
      return normalized ? normalized.slice(0, 220) : null;
    }

    if (!responseData || typeof responseData !== 'object') {
      return null;
    }

    try {
      const serialized = JSON.stringify(responseData);
      return serialized ? serialized.slice(0, 220) : null;
    } catch {
      return null;
    }
  }

  private buildFriendlyRobleMessage(
    statusCode: number,
    fallbackMessage: string,
  ): string {
    if (statusCode === HttpStatus.UNAUTHORIZED) {
      if (fallbackMessage.includes('refrescar token')) {
        return 'La sesion en ROBLE expiro o fue invalidada. Inicia sesion nuevamente.';
      }
      return 'ROBLE no acepto la autenticacion actual. Intenta iniciar sesion nuevamente.';
    }

    if (statusCode === HttpStatus.FORBIDDEN) {
      if (fallbackMessage.includes('autenticacion')) {
        return 'ROBLE rechazo la autenticacion (403). Revisa tu red, VPN o filtros de seguridad.';
      }
      if (fallbackMessage.includes('refrescar token')) {
        return 'ROBLE rechazo el refresco de sesion (403). Intenta iniciar sesion de nuevo.';
      }
      if (fallbackMessage.includes('validar token')) {
        return 'ROBLE rechazo la validacion de la sesion (403). Intenta iniciar sesion nuevamente.';
      }
      return `${fallbackMessage}. ROBLE rechazo la solicitud (403).`;
    }

    if (
      statusCode === HttpStatus.BAD_GATEWAY ||
      statusCode === HttpStatus.SERVICE_UNAVAILABLE ||
      statusCode === HttpStatus.GATEWAY_TIMEOUT
    ) {
      return `${fallbackMessage}. No se pudo comunicar correctamente con ROBLE.`;
    }

    return fallbackMessage;
  }

  private resolveRobleErrorInfo(
    error: unknown,
    fallbackMessage: string,
  ): {
    statusCode: number;
    message: string;
    detail: string | null;
  } {
    if (!isAxiosError(error)) {
      return {
        statusCode: HttpStatus.BAD_GATEWAY,
        message: fallbackMessage,
        detail: error instanceof Error ? error.message : null,
      };
    }

    const statusCode = error.response?.status ?? HttpStatus.BAD_GATEWAY;
    const responseData = error.response?.data;
    const detail = this.summarizeRobleResponseData(responseData);

    const objectMessage =
      responseData &&
      typeof responseData === 'object' &&
      'message' in responseData
        ? String((responseData as { message?: unknown }).message ?? '').trim()
        : '';

    const axiosMessage = String(error.message || '').trim();
    const message =
      objectMessage ||
      (axiosMessage && !this.isGenericAxiosStatusMessage(axiosMessage)
        ? axiosMessage
        : this.buildFriendlyRobleMessage(statusCode, fallbackMessage));

    return { statusCode, message, detail };
  }

  private logRobleFailure(
    fallbackMessage: string,
    error: unknown,
    context?: Record<string, string | number | boolean | undefined>,
  ) {
    const info = this.resolveRobleErrorInfo(error, fallbackMessage);
    const contextSummary = Object.entries(context ?? {})
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .map(([key, value]) => `${key}=${String(value)}`)
      .join(' | ');

    this.logger.warn(
      [
        fallbackMessage,
        `status=${info.statusCode}`,
        `message=${info.message}`,
        info.detail ? `detail=${info.detail}` : '',
        contextSummary,
      ]
        .filter(Boolean)
        .join(' | '),
    );

    return info;
  }

  private throwRobleRequestError(
    error: unknown,
    fallbackMessage: string,
    context?: Record<string, string | number | boolean | undefined>,
  ): never {
    const info = this.logRobleFailure(fallbackMessage, error, context);
    throw new HttpException(
      {
        statusCode: info.statusCode,
        message: info.message,
      },
      info.statusCode,
    );
  }

  async verifyToken(accessToken: string): Promise<RobleVerifyTokenResponse> {
    try {
      const url = `${this.authBase}/${this.dbName}/verify-token`;

      const response = await firstValueFrom(
        this.http.get<RobleVerifyTokenResponse>(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );
      return response.data;
    } catch (error) {
      const info = this.logRobleFailure(
        'Error al validar token en ROBLE',
        error,
        { flow: 'verify-token' },
      );

      if (info.statusCode === HttpStatus.UNAUTHORIZED) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      throw new UnauthorizedException(
        'No se pudo validar la sesion con ROBLE. Intenta iniciar sesion nuevamente.',
      );
    }
  }

  async listAuthUsers(accessToken: string): Promise<unknown> {
    const configuredPaths =
      this.config.get<string>('ROBLE_AUTH_USERS_PATHS') ||
      'users,users/list,admin/users,all-users,accounts';
    const paths = configuredPaths
      .split(',')
      .map((p) => p.trim().replace(/^\/+/, ''))
      .filter(Boolean);

    let lastError: unknown = null;
    for (const path of paths) {
      try {
        const resolvedPath = path.includes('{dbName}')
          ? path.replaceAll('{dbName}', this.dbName)
          : path;
        const url = resolvedPath.startsWith('http://') ||
          resolvedPath.startsWith('https://')
          ? resolvedPath
          : `${this.authBase}/${this.dbName}/${resolvedPath}`;
        const response = await firstValueFrom(
          this.http.get<unknown>(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
          }),
        );
        return response.data;
      } catch (error) {
        lastError = error;
        if (isAxiosError(error) && error.response?.status === 404) {
          continue;
        }
        this.throwRobleRequestError(
          error,
          'Error consultando usuarios en AUTH ROBLE',
        );
      }
    }

    if (lastError) {
      throw new HttpException(
        {
          statusCode: HttpStatus.NOT_FOUND,
          message:
            'No se encontro endpoint de listado de usuarios en ROBLE. Configura ROBLE_AUTH_USERS_PATHS.',
        },
        HttpStatus.NOT_FOUND,
      );
    }

    throw new HttpException(
      {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'No hay rutas configuradas para listado de usuarios en ROBLE.',
      },
      HttpStatus.NOT_FOUND,
    );
  }

  async insert<T extends object>(
    accessToken: string,
    tableName: string,
    records: T[],
  ): Promise<RobleInsertResponse<T>> {
    try {
      const url = `${this.dbBase}/${this.dbName}/insert`;

      const response = await firstValueFrom(
        this.http.post<RobleInsertResponse<T>>(
          url,
          { tableName, records },
          { headers: { Authorization: `Bearer ${accessToken}` } },
        ),
      );

      return response.data;
    } catch (error) {
      this.throwRobleRequestError(error, 'Error al insertar datos en ROBLE');
    }
  }

  async login(email: string, password: string): Promise<RobleLoginResponse> {
    try {
      const url = `${this.authBase}/${this.dbName}/login`;

      const response = await firstValueFrom(
        this.http.post<RobleLoginResponse>(url, { email, password }),
      );

      return response.data;
    } catch (error) {
      this.throwRobleRequestError(error, 'Error de autenticacion en ROBLE', {
        flow: 'login',
        email,
      });
    }
  }

  async refreshToken(refreshToken: string): Promise<RobleRefreshResponse> {
    try {
      const url = `${this.authBase}/${this.dbName}/refresh-token`;

      const response = await firstValueFrom(
        this.http.post<RobleRefreshResponse>(url, { refreshToken }),
      );

      return response.data;
    } catch (error) {
      this.throwRobleRequestError(
        error,
        'Error al refrescar token en ROBLE',
        { flow: 'refresh' },
      );
    }
  }

  async signup(payload: unknown): Promise<unknown> {
    try {
      const url = `${this.authBase}/${this.dbName}/signup`;

      const response = await firstValueFrom(this.http.post(url, payload));

      return response.data;
    } catch (error) {
      this.throwRobleRequestError(error, 'Error en registro de usuario');
    }
  }

  async signupDirect(payload: unknown): Promise<unknown> {
    try {
      const url = `${this.authBase}/${this.dbName}/signup-direct`;

      const response = await firstValueFrom(this.http.post(url, payload));

      return response.data;
    } catch (error) {
      this.throwRobleRequestError(
        error,
        'Error en registro directo de usuario',
      );
    }
  }

  async verifyEmail(payload: unknown): Promise<unknown> {
    try {
      const url = `${this.authBase}/${this.dbName}/verify-email`;

      const response = await firstValueFrom(this.http.post(url, payload));

      return response.data;
    } catch (error) {
      this.throwRobleRequestError(error, 'Error en verificacion de correo');
    }
  }

  async forgotPassword(payload: unknown): Promise<unknown> {
    try {
      const url = `${this.authBase}/${this.dbName}/forgot-password`;

      const response = await firstValueFrom(this.http.post(url, payload));

      return response.data;
    } catch (error) {
      this.throwRobleRequestError(
        error,
        'Error al solicitar recuperacion de contrasena',
      );
    }
  }

  async resetPassword(payload: unknown): Promise<unknown> {
    try {
      const url = `${this.authBase}/${this.dbName}/reset-password`;

      const response = await firstValueFrom(this.http.post(url, payload));

      return response.data;
    } catch (error) {
      this.throwRobleRequestError(error, 'Error al restablecer contrasena');
    }
  }

  async logout(accessToken: string): Promise<unknown> {
    try {
      const url = `${this.authBase}/${this.dbName}/logout`;

      const response = await firstValueFrom(
        this.http.post(
          url,
          {},
          { headers: { Authorization: `Bearer ${accessToken}` } },
        ),
      );

      return response.data;
    } catch (error) {
      this.throwRobleRequestError(error, 'Error al cerrar sesion en ROBLE');
    }
  }

  async read<T>(
    accessToken: string,
    tableName: string,
    filters?: Record<string, string | number>,
  ): Promise<T[]> {
    try {
      const url = `${this.dbBase}/${this.dbName}/read`;

      const response = await firstValueFrom(
        this.http.get<T[]>(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
          params: { tableName, ...(filters ?? {}) },
        }),
      );

      return response.data;
    } catch (error) {
      this.throwRobleRequestError(error, 'Error al leer datos en ROBLE');
    }
  }

  async readWithPublicToken<T>(
    tableName: string,
    filters?: Record<string, string | number>,
  ): Promise<T[]> {
    return this.read<T>(this.getPublicReadTokenOrThrow(), tableName, filters);
  }

  async update<T>(
    accessToken: string,
    tableName: string,
    idColumn: string,
    idValue: string,
    updates: Record<string, unknown>,
  ): Promise<T> {
    try {
      const url = `${this.dbBase}/${this.dbName}/update`;

      const response = await firstValueFrom(
        this.http.put<T>(
          url,
          {
            tableName,
            idColumn,
            idValue,
            updates,
          },
          { headers: { Authorization: `Bearer ${accessToken}` } },
        ),
      );

      return response.data;
    } catch (error) {
      this.throwRobleRequestError(error, 'Error al actualizar datos en ROBLE');
    }
  }
}
