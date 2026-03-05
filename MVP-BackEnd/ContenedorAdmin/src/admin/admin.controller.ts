import {
  BadGatewayException,
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { UpdateTorneoEstadoDto } from './dto/update-torneo-estado.dto';

@ApiTags('admin')
@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  @ApiOperation({ summary: 'Resumen de salud de plataforma' })
  getOverview() {
    return this.adminService.buildOverview();
  }

  @Get('users/total')
  @ApiOperation({ summary: 'Total de usuarios' })
  getUsersTotal() {
    return this.adminService.getTotalUsers();
  }

  @Get('users/timeseries')
  @ApiOperation({ summary: 'Serie temporal de usuarios' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  getUsersTimeSeries(@Query('from') from?: string, @Query('to') to?: string) {
    return this.adminService.getUsersTimeSeries(from, to);
  }

  @Get('games/by-user')
  @ApiOperation({ summary: 'Juegos jugados por usuario' })
  getGamesByUser() {
    return this.adminService.getGamesByUser();
  }

  @Get('users/:userId/games')
  @ApiOperation({ summary: 'Juegos de un usuario específico' })
  @ApiParam({ name: 'userId', type: String })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUserGames(@Param('userId') userId: string) {
    const payload = this.adminService.getUserGames(userId);
    if (!payload) {
      throw new NotFoundException({ message: 'User not found' });
    }
    return payload;
  }

  @Get('torneos')
  @ApiOperation({ summary: 'Listar torneos desde Contenedor1' })
  @ApiResponse({ status: 503, description: 'Contenedor1 no disponible o sin permisos' })
  async getTorneos() {
    try {
      const data = await this.adminService.getTorneos();
      return { source: 'contenedor1', data };
    } catch (error) {
      throw new BadGatewayException({
        message:
          'No fue posible consultar torneos en este momento. Revisa CONTENEDOR1_BASE_URL y ADMIN_API_TOKEN.',
        details: error instanceof Error ? error.message : String(error),
        source: 'contenedor-admin',
      });
    }
  }

  @Patch('torneos/:id/estado')
  @HttpCode(200)
  @ApiOperation({ summary: 'Actualizar estado de torneo en Contenedor1' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 503, description: 'Contenedor1 no disponible o sin permisos' })
  async patchTorneoEstado(
    @Param('id') id: string,
    @Body() dto: UpdateTorneoEstadoDto,
  ) {
    try {
      const data = await this.adminService.patchTorneoEstado(id, dto);
      return { source: 'contenedor1', data };
    } catch (error) {
      throw new BadGatewayException({
        message:
          'No fue posible cambiar el estado del torneo. Integra permisos de admin en Contenedor1 para habilitarlo.',
        details: error instanceof Error ? error.message : String(error),
        source: 'contenedor-admin',
      });
    }
  }
}
