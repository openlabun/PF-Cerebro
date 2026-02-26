import {
  Body,
  Controller,
  Post,
  Get,
  Headers,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  RobleAuthGuard,
  type RobleRequest,
} from '../common/guards/roble-auth.guard';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { SignupDto } from './dto/signup.dto';

@ApiTags('Autenticación')
@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}

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

  @UseGuards(RobleAuthGuard)
  @ApiBearerAuth()
  @Post('logout')
  logout(@Req() req: RobleRequest) {
    return this.service.logout(req.accessToken);
  }

  @UseGuards(RobleAuthGuard)
  @ApiBearerAuth()
  @Get('verify-token')
  verifyToken(@Req() req: RobleRequest) {
    return { valid: true, user: req.robleUser };
  }
}
