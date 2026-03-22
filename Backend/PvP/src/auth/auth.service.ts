import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import {
  RobleLoginResponse,
  RobleRefreshResponse,
  RobleVerifyTokenResponse,
  RobleGenericSuccess,
} from './interfaces/roble-auth-response.interface';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { SignupDto } from './dto/signup.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly baseUrl: string;
  private readonly refreshPath: string;

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    const contenedor1BaseUrl = this.config
      .get<string>('CONTENEDOR1_BASE_URL')
      ?.trim()
      .replace(/\/+$/, '');

    if (contenedor1BaseUrl) {
      this.baseUrl = `${contenedor1BaseUrl}/auth`;
      this.refreshPath = 'refresh';
      return;
    }

    const robleAuthBase = this.config
      .getOrThrow<string>('ROBLE_AUTH_BASE')
      .trim()
      .replace(/\/+$/, '');
    const robleDbName = this.config.getOrThrow<string>('ROBLE_DBNAME');
    this.baseUrl = `${robleAuthBase}/${robleDbName}`;
    this.refreshPath = 'refresh-token';
  }

  private handleRobleError(err: any): never {
    const response = err?.response;
    if (response) {
      const status = response.status || HttpStatus.BAD_REQUEST;
      const data = response.data || { message: response.statusText };
      this.logger.warn(`ROBLE error ${status}: ${JSON.stringify(data)}`);
      throw new HttpException(data, status);
    }
    this.logger.error(`ROBLE communication error: ${err?.message || err}`);
    throw new HttpException(
      { message: err?.message || 'Error al comunicarse con ROBLE' },
      HttpStatus.BAD_GATEWAY,
    );
  }

  async login(dto: LoginDto): Promise<RobleLoginResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<RobleLoginResponse>(`${this.baseUrl}/login`, dto),
      );
      return response.data;
    } catch (err) {
      this.handleRobleError(err);
    }
  }

  async refresh(dto: RefreshDto): Promise<RobleRefreshResponse> {
    try {
      const response = await firstValueFrom(
        this.http.post<RobleRefreshResponse>(
          `${this.baseUrl}/${this.refreshPath}`,
          dto,
        ),
      );
      return response.data;
    } catch (err) {
      this.handleRobleError(err);
    }
  }

  async signup(dto: SignupDto): Promise<RobleGenericSuccess> {
    try {
      const response = await firstValueFrom(
        this.http.post<RobleGenericSuccess>(`${this.baseUrl}/signup`, dto),
      );
      return response.data;
    } catch (err) {
      this.handleRobleError(err);
    }
  }

  async signupDirect(dto: SignupDto): Promise<RobleGenericSuccess> {
    try {
      const response = await firstValueFrom(
        this.http.post<RobleGenericSuccess>(
          `${this.baseUrl}/signup-direct`,
          dto,
        ),
      );
      return response.data;
    } catch (err) {
      this.handleRobleError(err);
    }
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<RobleGenericSuccess> {
    try {
      const response = await firstValueFrom(
        this.http.post<RobleGenericSuccess>(
          `${this.baseUrl}/verify-email`,
          dto,
        ),
      );
      return response.data;
    } catch (err) {
      this.handleRobleError(err);
    }
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.baseUrl}/forgot-password`, dto),
      );
    } catch (err) {
      this.handleRobleError(err);
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.baseUrl}/reset-password`, dto),
      );
    } catch (err) {
      this.handleRobleError(err);
    }
  }

  async logout(accessToken: string): Promise<void> {
    try {
      const authorization = String(accessToken || '').startsWith('Bearer ')
        ? String(accessToken)
        : `Bearer ${String(accessToken || '').trim()}`;

      await firstValueFrom(
        this.http.post(`${this.baseUrl}/logout`, null, {
          headers: { Authorization: authorization },
        }),
      );
    } catch (err) {
      this.handleRobleError(err);
    }
  }

  async verifyToken(authHeader: string): Promise<RobleVerifyTokenResponse> {
    try {
      const response = await firstValueFrom(
        this.http.get<RobleVerifyTokenResponse>(
          `${this.baseUrl}/verify-token`,
          { headers: { Authorization: authHeader } },
        ),
      );
      return response.data;
    } catch (err) {
      this.handleRobleError(err);
    }
  }
}
