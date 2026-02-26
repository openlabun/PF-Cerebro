import { Body, Controller, Post, Get, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { SignupDto } from './dto/signup.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { Req } from '@nestjs/common';
import type { RobleRequest } from 'src/common/types/roble-request';

@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.service.login(dto);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.service.refresh(dto);
  }

  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.service.signup(dto);
  }

  @Post('signup-direct')
  signupDirect(@Body() dto: SignupDto) {
    return this.service.signupDirect(dto);
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.service.verifyEmail(dto);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.service.forgotPassword(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.service.resetPassword(dto);
  }

  @ApiBearerAuth()
  @Post('logout')
  logout(@Req() req: RobleRequest) {
    return this.service.logout(req.accessToken);
  }

  @Get('verify-token')
  verifyToken(@Headers('authorization') auth: string) {
    return this.service.verifyToken(auth);
  }
}
