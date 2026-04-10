import {
  Body,
  Controller,
  Post,
  Get,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  RobleAuthGuard,
  type RobleRequest,
} from '../common/guards/roble-auth.guard';
import { PersonalTrackingBootstrapService } from '../personal-tracking/bootstrap/personal-tracking-bootstrap.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { SignupDto } from './dto/signup.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly service: AuthService,
    private readonly bootstrapService: PersonalTrackingBootstrapService,
  ) {}

  private resolveDisplayNameHint(req: RobleRequest): string {
    const rawHeader = req?.headers?.['x-user-display-name'];
    const candidate = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    if (typeof candidate !== 'string') {
      return '';
    }

    const normalized = candidate.trim();
    if (
      !normalized ||
      normalized === 'undefined' ||
      normalized === 'null'
    ) {
      return '';
    }

    return normalized;
  }

  private resolveBootstrapUser(req: RobleRequest) {
    const payload = ((req && req.robleUser) ? req.robleUser : {}) as Record<string, unknown>;
    const userIdCandidates = [
      payload.sub,
      payload.id,
      payload.userId,
      payload.usuarioId,
    ];

    const userIdCandidate = userIdCandidates.find(
      (candidate) =>
        typeof candidate === 'string' &&
        candidate.trim() &&
        candidate !== 'undefined' &&
        candidate !== 'null',
    );

    const email =
      typeof payload.email === 'string' ? payload.email.trim() : '';
    const hintName = this.resolveDisplayNameHint(req);
    const combinedTokenName =
      typeof payload.firstName === 'string' || typeof payload.lastName === 'string'
        ? `${String(payload.firstName ?? '').trim()} ${String(payload.lastName ?? '').trim()}`.trim()
        : '';
    const nameCandidates = [
      hintName,
      payload.name,
      payload.nombre,
      payload.displayName,
      payload.fullName,
      combinedTokenName,
    ];
    const nameCandidate = nameCandidates.find(
      (candidate) =>
        typeof candidate === 'string' &&
        candidate.trim() &&
        candidate !== 'undefined' &&
        candidate !== 'null',
    );

    return {
      userId: String(userIdCandidate || '').trim(),
      nombre: String(nameCandidate || (email ? email.split('@')[0] : 'Usuario')).trim(),
      correo: email,
    };
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.service.login(dto.email, dto.password);
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.service.refresh(dto.refreshToken);
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

  @UseGuards(RobleAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  logout(@Req() req: RobleRequest) {
    return this.service.logout(req.accessToken);
  }

  @UseGuards(RobleAuthGuard)
  @ApiBearerAuth()
  @Get('verify-token')
  async verifyToken(@Req() req: RobleRequest) {
    const { userId, nombre, correo } = this.resolveBootstrapUser(req);
    if (userId) {
      await this.bootstrapService.ensureInitialized(
        req.accessToken,
        userId,
        nombre,
        correo,
      );
    }

    return { valid: true, user: req.robleUser };
  }

  @UseGuards(RobleAuthGuard)
  @ApiBearerAuth()
  @Get('users')
  listUsers(@Req() req: RobleRequest) {
    return this.service.listUsers(req.accessToken);
  }
}
