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
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminRoleGuard } from '../common/guards/admin-role.guard';
import {
  RobleAuthGuard,
  type RobleRequest,
} from '../common/guards/roble-auth.guard';
import { AdminService } from './admin.service';
import { CreateTorneoDto } from './dto/create-torneo.dto';
import { UpdateTorneoEstadoDto } from './dto/update-torneo-estado.dto';

@ApiTags('admin')
@ApiBearerAuth('access-token')
@Controller('api/admin')
@UseGuards(RobleAuthGuard, AdminRoleGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private observabilityUnavailable(error: unknown): BadGatewayException {
    return new BadGatewayException({
      message:
        'No fue posible obtener observabilidad desde contenedor1/contenedor2. Revisa CONTENEDOR1_BASE_URL, CONTENEDOR2_BASE_URL y que la sesion admin siga activa.',
      details: error instanceof Error ? error.message : String(error),
      source: 'contenedor1-contenedor2',
    });
  }

  @Get('overview')
  @ApiOperation({ summary: 'Resumen de salud de plataforma' })
  async getOverview(@Req() req: RobleRequest) {
    try {
      return await this.adminService.buildOverview(req.accessToken);
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
    @Req() req: RobleRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('includeTorneos') includeTorneos?: string,
  ) {
    try {
      const withTorneos =
        includeTorneos === 'true' ||
        includeTorneos === '1' ||
        includeTorneos === 'yes';
      return await this.adminService.getDashboardSnapshot(
        req.accessToken,
        from,
        to,
        withTorneos,
      );
    } catch (error) {
      throw this.observabilityUnavailable(error);
    }
  }

  @Get('users/total')
  @ApiOperation({ summary: 'Total de usuarios' })
  async getUsersTotal(@Req() req: RobleRequest) {
    try {
      return await this.adminService.getTotalUsers(req.accessToken);
    } catch (error) {
      throw this.observabilityUnavailable(error);
    }
  }

  @Get('users/timeseries')
  @ApiOperation({ summary: 'Serie temporal de usuarios' })
  @ApiQuery({ name: 'from', required: false, type: String })
  @ApiQuery({ name: 'to', required: false, type: String })
  async getUsersTimeSeries(
    @Req() req: RobleRequest,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    try {
      return await this.adminService.getUsersTimeSeries(req.accessToken, from, to);
    } catch (error) {
      throw this.observabilityUnavailable(error);
    }
  }

  @Get('games/by-user')
  @ApiOperation({ summary: 'Juegos jugados por usuario' })
  async getGamesByUser(@Req() req: RobleRequest) {
    try {
      return await this.adminService.getGamesByUser(req.accessToken);
    } catch (error) {
      throw this.observabilityUnavailable(error);
    }
  }

  @Get('sudoku/seeds-times')
  @ApiOperation({ summary: 'Promedio de tiempo por seed para una dificultad de Sudoku' })
  @ApiQuery({ name: 'dificultad', required: true, type: String })
  async getSudokuSeedsTimes(
    @Req() req: RobleRequest,
    @Query('dificultad') dificultad: string,
  ) {
    try {
      return await this.adminService.getAverageTimeBySeedForDifficulty(
        req.accessToken,
        dificultad,
      );
    } catch (error) {
      throw this.observabilityUnavailable(error);
    }
  }

  @Get('users/:userId/games')
  @ApiOperation({ summary: 'Juegos de un usuario especifico' })
  @ApiParam({ name: 'userId', type: String })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserGames(
    @Req() req: RobleRequest,
    @Param('userId') userId: string,
  ) {
    try {
      const payload = await this.adminService.getUserGames(req.accessToken, userId);
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
  async getTorneos(@Req() req: RobleRequest) {
    try {
      const data = await this.adminService.getTorneos(req.accessToken);
      return { source: 'contenedor1', data };
    } catch (error) {
      throw new BadGatewayException({
        message:
          'No fue posible consultar torneos en este momento. Revisa CONTENEDOR1_BASE_URL y los permisos de la cuenta admin autenticada.',
        details: error instanceof Error ? error.message : String(error),
        source: 'contenedor-admin',
      });
    }
  }

  @Post('torneos')
  @ApiOperation({ summary: 'Crear torneo en Contenedor1' })
  @ApiResponse({ status: 503, description: 'Contenedor1 no disponible o sin permisos' })
  async createTorneo(@Req() req: RobleRequest, @Body() dto: CreateTorneoDto) {
    try {
      const data = await this.adminService.createTorneo(req.accessToken, dto);
      return { source: 'contenedor1', data };
    } catch (error) {
      throw new BadGatewayException({
        message:
          'No fue posible crear el torneo. Verifica permisos de la cuenta admin actual y el payload enviado.',
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
    @Req() req: RobleRequest,
    @Param('id') id: string,
    @Body() dto: UpdateTorneoEstadoDto,
  ) {
    try {
      const data = await this.adminService.patchTorneoEstado(
        req.accessToken,
        id,
        dto,
      );
      return { source: 'contenedor1', data };
    } catch (error) {
      throw new BadGatewayException({
        message: 'No fue posible cambiar el estado del torneo.',
        details: error instanceof Error ? error.message : String(error),
        source: 'contenedor-admin',
      });
    }
  }

  @Get('torneos/:id')
  @ApiOperation({ summary: 'Obtener detalle de torneo por id desde Contenedor1' })
  @ApiParam({ name: 'id', type: String })
  async getTorneoById(@Req() req: RobleRequest, @Param('id') id: string) {
    try {
      const data = await this.adminService.getTorneoById(req.accessToken, id);
      return { source: 'contenedor1', data };
    } catch (error) {
      throw new BadGatewayException({
        message:
          'No fue posible consultar el torneo solicitado. Revisa permisos de la cuenta admin autenticada.',
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
    @Req() req: RobleRequest,
    @Param('id') id: string,
    @Body() payload: Record<string, unknown>,
  ) {
    try {
      const data = await this.adminService.updateTorneo(
        req.accessToken,
        id,
        payload,
      );
      return { source: 'contenedor1', data };
    } catch (error) {
      throw new BadGatewayException({
        message:
          'No fue posible actualizar el torneo. Verifica que la cuenta admin tenga permisos de edicion sobre el torneo.',
        details: error instanceof Error ? error.message : String(error),
        source: 'contenedor-admin',
      });
    }
  }

  @Get('auth/users')
  @ApiOperation({ summary: 'Listar usuarios desde Auth de Contenedor1/ROBLE' })
  async getAuthUsers(@Req() req: RobleRequest) {
    try {
      const data = await this.adminService.getAuthUsers(req.accessToken);
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
