import { Injectable, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import type {
  RobleInsertResponse,
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
