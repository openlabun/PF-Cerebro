import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { AdminRoleGuard } from '../common/guards/admin-role.guard';
import {
  RobleAuthGuard,
  type RobleRequest,
} from '../common/guards/roble-auth.guard';

@ApiTags('admin-auth')
@Controller('api/admin/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Iniciar sesion admin usando ROBLE' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('logout')
  @UseGuards(RobleAuthGuard, AdminRoleGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cerrar sesion admin en ROBLE' })
  logout(@Req() req: RobleRequest) {
    return this.authService.logout(req.accessToken);
  }
}
