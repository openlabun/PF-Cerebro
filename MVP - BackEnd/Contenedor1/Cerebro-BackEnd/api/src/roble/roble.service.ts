import { Injectable, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
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

  // Verificación de token en ROBLE
  async verifyToken(accessToken: string): Promise<RobleVerifyTokenResponse> {
    try {
      const url = `${this.authBase}/${this.dbName}/verify-token`;

      const response = await firstValueFrom(
        this.http.get<RobleVerifyTokenResponse>(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
      );
      console.log('Respuesta verifyToken:', response.data);
      return response.data;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  //Operacione en la base de datos de ROBLE
  async insert<T extends object>(
    accessToken: string,
    tableName: string,
    records: T[],
  ): Promise<RobleInsertResponse<T>> {
    const url = `${this.dbBase}/${this.dbName}/insert`;

    const response = await firstValueFrom(
      this.http.post<RobleInsertResponse<T>>(
        url,
        { tableName, records },
        { headers: { Authorization: `Bearer ${accessToken}` } },
      ),
    );

    return response.data;
  }

  // Autenticación en ROBLE
  async login(email: string, password: string): Promise<RobleLoginResponse> {
    const url = `${this.authBase}/${this.dbName}/login`;

    const response = await firstValueFrom(
      this.http.post<RobleLoginResponse>(url, { email, password }),
    );

    return response.data;
  }

  // Refrescar token en ROBLE
  async refreshToken(refreshToken: string): Promise<RobleRefreshResponse> {
    const url = `${this.authBase}/${this.dbName}/refresh-token`;

    const response = await firstValueFrom(
      this.http.post<RobleRefreshResponse>(url, { refreshToken }),
    );

    return response.data;
  }

  // Registro de usuario en ROBLE
  async signup(payload: unknown): Promise<unknown> {
    const url = `${this.authBase}/${this.dbName}/signup`;

    const response = await firstValueFrom(this.http.post(url, payload));

    return response.data;
  }

  // Registro directo de usuario en ROBLE (sin verificación de email)
  async signupDirect(payload: unknown): Promise<unknown> {
    const url = `${this.authBase}/${this.dbName}/signup-direct`;

    const response = await firstValueFrom(this.http.post(url, payload));

    return response.data;
  }

  // Cierre de sesión en ROBLE
  async logout(accessToken: string): Promise<unknown> {
    const url = `${this.authBase}/${this.dbName}/logout`;

    const response = await firstValueFrom(
      this.http.post(
        url,
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } },
      ),
    );

    return response.data;
  }

  // Lectura de datos en ROBLE
  async read<T>(
    accessToken: string,
    tableName: string,
    filters?: Record<string, string | number>,
  ): Promise<T[]> {
    const url = `${this.dbBase}/${this.dbName}/read`;

    const response = await firstValueFrom(
      this.http.get<T[]>(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { tableName, ...(filters ?? {}) },
      }),
    );

    return response.data;
  }

  // Actualización de datos en ROBLE
  async update<T>(
    accessToken: string,
    tableName: string,
    idColumn: string,
    idValue: string,
    updates: Record<string, unknown>,
  ): Promise<T> {
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
  }
}
