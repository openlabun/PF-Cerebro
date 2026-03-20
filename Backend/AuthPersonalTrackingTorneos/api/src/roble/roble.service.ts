import {
  HttpException,
  HttpStatus,
  Injectable,
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
  private readonly dbName: string;
  private readonly authBase: string;
  private readonly dbBase: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.dbName = this.config.getOrThrow<string>('ROBLE_DBNAME');
    this.authBase = this.config.getOrThrow<string>('ROBLE_AUTH_BASE');
    this.dbBase = this.config.getOrThrow<string>('ROBLE_DB_BASE');
  }

  private throwRobleRequestError(
    error: unknown,
    fallbackMessage: string,
  ): never {
    if (isAxiosError(error)) {
      const statusCode = error.response?.status ?? HttpStatus.BAD_GATEWAY;
      const responseData = error.response?.data;

      let message: unknown = fallbackMessage;
      if (
        responseData &&
        typeof responseData === 'object' &&
        'message' in responseData
      ) {
        message = (responseData as { message: unknown }).message;
      } else if (error.message) {
        message = error.message;
      }

      throw new HttpException(
        {
          statusCode,
          message,
        },
        statusCode,
      );
    }

    throw new HttpException(
      {
        statusCode: HttpStatus.BAD_GATEWAY,
        message: fallbackMessage,
      },
      HttpStatus.BAD_GATEWAY,
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
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
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
      this.throwRobleRequestError(error, 'Error de autenticacion en ROBLE');
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
      this.throwRobleRequestError(error, 'Error al refrescar token en ROBLE');
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
