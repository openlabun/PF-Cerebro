import {
  BadGatewayException,
  Body,
  Controller,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
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
import { CreateTorneoDto } from './dto/create-torneo.dto';
import { UpdateTorneoEstadoDto } from './dto/update-torneo-estado.dto';

@ApiTags('admin')
@Controller('api/admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private observabilityUnavailable(error: unknown): BadGatewayException {
    return new BadGatewayException({
      message:
        'No fue posible obtener observabilidad desde contenedor1/contenedor2. Revisa CONTENEDOR1_BASE_URL, CONTENEDOR2_BASE_URL y token admin (ADMIN_API_TOKEN o ADMIN_REFRESH_TOKEN).',
      details: error instanceof Error ? error.message : String(error),
      source: 'contenedor1-contenedor2',
    });
  }

  @Get('overview')
  @ApiOperation({ summary: 'Resumen de salud de plataforma' })
  async getOverview() {
    try {
      return await this.adminService.buildOverview();
    } catch (error) {
      throw this.observabilityUnavailable(error);
    }
  }

  @Get('snapshot')
  @ApiOperation({ summary: 'Snapshot agregado para dashboard admin' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  @ApiQuery({ name: 'includeTorneos', required: false, type: Boolean })
  async getSnapshot(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('includeTorneos') includeTorneos?: string,
  ) {
    try {
      const withTorneos =
        includeTorneos === 'true' ||
        includeTorneos === '1' ||
        includeTorneos === 'yes';
      return await this.adminService.getDashboardSnapshot(from, to, withTorneos);
    } catch (error) {
      throw this.observabilityUnavailable(error);
    }
  }

  @Get('users/total')
  @ApiOperation({ summary: 'Total de usuarios' })
  async getUsersTotal() {
    try {
      return await this.adminService.getTotalUsers();
    } catch (error) {
      throw this.observabilityUnavailable(error);
    }
  }

  @Get('users/timeseries')
  @ApiOperation({ summary: 'Serie temporal de usuarios' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  async getUsersTimeSeries(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    try {
      return await this.adminService.getUsersTimeSeries(from, to);
    } catch (error) {
      throw this.observabilityUnavailable(error);
    }
  }

  @Get('games/by-user')
  @ApiOperation({ summary: 'Juegos jugados por usuario' })
  async getGamesByUser() {
    try {
      return await this.adminService.getGamesByUser();
    } catch (error) {
      throw this.observabilityUnavailable(error);
    }
  }

  @Get('sudoku/seeds-times')
  @ApiOperation({ summary: 'Promedio de tiempo por seed para una dificultad de Sudoku' })
  @ApiQuery({ name: 'dificultad', required: true, type: String })
  async getSudokuSeedsTimes(@Query('dificultad') dificultad: string) {
    try {
      return await this.adminService.getAverageTimeBySeedForDifficulty(dificultad);
    } catch (error) {
      throw this.observabilityUnavailable(error);
    }
  }

  @Get('users/:userId/games')
  @ApiOperation({ summary: 'Juegos de un usuario específico' })
  @ApiParam({ name: 'userId', type: String })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserGames(@Param('userId') userId: string) {
    try {
      const payload = await this.adminService.getUserGames(userId);
      if (!payload) {
        throw new NotFoundException({ message: 'User not found' });
      }
      return payload;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw this.observabilityUnavailable(error);
    }
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

  @Post('torneos')
  @ApiOperation({ summary: 'Crear torneo en Contenedor1' })
  @ApiResponse({ status: 503, description: 'Contenedor1 no disponible o sin permisos' })
  async createTorneo(@Body() dto: CreateTorneoDto) {
    try {
      const data = await this.adminService.createTorneo(dto);
      return { source: 'contenedor1', data };
    } catch (error) {
      throw new BadGatewayException({
        message:
          'No fue posible crear el torneo. Verifica token admin, permisos y payload enviado.',
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
          'No fue posible cambiar el estado del torneo.',
        details: error instanceof Error ? error.message : String(error),
        source: 'contenedor-admin',
      });
    }
  }

  @Get('torneos/:id')
  @ApiOperation({ summary: 'Obtener detalle de torneo por id desde Contenedor1' })
  @ApiParam({ name: 'id', type: String })
  async getTorneoById(@Param('id') id: string) {
    try {
      const data = await this.adminService.getTorneoById(id);
      return { source: 'contenedor1', data };
    } catch (error) {
      throw new BadGatewayException({
        message:
          'No fue posible consultar el torneo solicitado. Revisa permisos y token admin.',
        details: error instanceof Error ? error.message : String(error),
        source: 'contenedor-admin',
      });
    }
  }

  @Put('torneos/:id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Editar torneo desde Contenedor1' })
  @ApiParam({ name: 'id', type: String })
  async updateTorneo(
    @Param('id') id: string,
    @Body() payload: Record<string, unknown>,
  ) {
    try {
      const data = await this.adminService.updateTorneo(id, payload);
      return { source: 'contenedor1', data };
    } catch (error) {
      throw new BadGatewayException({
        message:
          'No fue posible actualizar el torneo. Verifica que la cuenta admin tenga permisos de edición sobre el torneo.',
        details: error instanceof Error ? error.message : String(error),
        source: 'contenedor-admin',
      });
    }
  }

  @Get('auth/users')
  @ApiOperation({ summary: 'Listar usuarios desde Auth de Contenedor1/ROBLE' })
  async getAuthUsers() {
    try {
      const data = await this.adminService.getAuthUsers();
      return { source: 'contenedor1-auth', data };
    } catch (error) {
      throw new BadGatewayException({
        message:
          'No fue posible listar usuarios de Auth. Configura ROBLE_AUTH_USERS_PATHS en Contenedor1 con la ruta correcta.',
        details: error instanceof Error ? error.message : String(error),
        source: 'contenedor-admin',
      });
    }
  }
}
