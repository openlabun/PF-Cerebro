import { Injectable } from '@nestjs/common';
import { RobleService } from '../roble/roble.service';
import { RobleLoginResponse } from '../roble/roble.types';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@Injectable()
export class AuthService {
  constructor(private readonly robleService: RobleService) {}

  async login(email: string, password: string): Promise<RobleLoginResponse> {
    return this.robleService.login(email, password);
  }

  async refresh(refreshToken: string) {
    return this.robleService.refreshToken(refreshToken);
  }

  async signup(payload: unknown) {
    return this.robleService.signup(payload);
  }

  async signupDirect(payload: unknown) {
    return this.robleService.signupDirect(payload);
  }

  async verifyEmail(dto: VerifyEmailDto) {
    return this.robleService.verifyEmail(dto);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    return this.robleService.forgotPassword(dto);
  }

  async resetPassword(dto: ResetPasswordDto) {
    return this.robleService.resetPassword(dto);
  }

  async logout(accessToken: string) {
    return this.robleService.logout(accessToken);
  }

  async verifyToken(authHeader: string) {
    if (!authHeader?.startsWith('Bearer ')) {
      throw new Error('Invalid Authorization header');
    }

    const token = authHeader.substring(7).trim();

    return this.robleService.verifyToken(token);
  }
}
