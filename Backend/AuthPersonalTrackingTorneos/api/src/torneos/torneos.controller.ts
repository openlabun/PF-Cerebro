import {
  Body,
  Post,
  Controller,
  Get,
  Req,
  UseGuards,
  Param,
  Patch,
  Put,
  Delete,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TorneosService } from './torneos.service';
import { CreateTorneoDto } from './dto/create-torneo.dto';
import { UnirseTorneoDto } from './dto/unirse-torneo.dto';
import { CreateResultadoDto } from './dto/create-resultado.dto';
import { UpdateEstadoTorneoDto } from './dto/update-estado-torneo.dto';
import { UpdateTorneoDto } from './dto/update-torneo.dto';
import { RobleAuthGuard } from 'src/common/guards/roble-auth.guard';
import * as robleAuthGuard from 'src/common/guards/roble-auth.guard';
import { FinishTorneoSessionDto } from './dto/finish-torneo-session.dto';
import { PersonalTrackingBootstrapService } from 'src/personal-tracking/bootstrap/personal-tracking-bootstrap.service';

@ApiTags('Torneos')
@Controller('torneos')
export class TorneosController {
  constructor(
    private readonly service: TorneosService,
    private readonly bootstrapService: PersonalTrackingBootstrapService,
  ) {}

  private getUserId(req: robleAuthGuard.RobleRequest): string {
    return req.robleUser.sub;
  }

  private getUserRole(req: robleAuthGuard.RobleRequest): string {
    return String(req.robleUser.role ?? '').trim();
  }

  private getUserName(req: robleAuthGuard.RobleRequest): string {
    const candidates = [req.robleUser.name, req.robleUser.nombre];

    for (const candidate of candidates) {
      const normalized = String(candidate ?? '').trim();
      if (
        normalized &&
        normalized !== 'undefined' &&
        normalized !== 'null'
      ) {
        return normalized;
      }
    }

    const email = String(req.robleUser.email ?? '').trim();
    if (email) {
      return email.split('@')[0] || email;
    }

    return 'Usuario';
  }

  private getUserEmail(req: robleAuthGuard.RobleRequest): string {
    const email = String(req.robleUser.email ?? '').trim();
    if (!email || email === 'undefined' || email === 'null') {
      return '';
    }
    return email;
  }

  private async ensureCurrentUserProfile(
    req: robleAuthGuard.RobleRequest,
  ): Promise<void> {
    await this.bootstrapService.ensureInitialized(
      req.accessToken,
      this.getUserId(req),
      this.getUserName(req),
      this.getUserEmail(req),
    );
  }

  @Get('public')
  async listarPublico() {
    return this.service.listarTorneosPublicos();
  }

  @Get('public/:id')
  async obtenerPublico(@Param('id') torneoId: string) {
    return this.service.obtenerTorneoDetallePublico(torneoId);
  }

  @Get('public/:id/participantes')
  async participantesPublico(@Param('id') torneoId: string) {
    return this.service.listarParticipantesPublico(torneoId);
  }

  @Get('public/:id/ranking')
  async rankingPublico(@Param('id') torneoId: string) {
    return this.service.obtenerRankingPublico(torneoId);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(RobleAuthGuard)
  async listar(@Req() req: robleAuthGuard.RobleRequest) {
    await this.ensureCurrentUserProfile(req);
    const usuarioId = this.getUserId(req);
    const userRole = this.getUserRole(req);

    return this.service.listarTorneos(req.accessToken, usuarioId, userRole);
  }

  @Get('usuarios/:usuarioId/resultados')
  @ApiBearerAuth()
  @UseGuards(RobleAuthGuard)
  async resultadosPorUsuario(
    @Req() req: robleAuthGuard.RobleRequest,
    @Param('usuarioId') usuarioId: string,
  ) {
    await this.ensureCurrentUserProfile(req);
    return this.service.obtenerResultadosPorUsuario(req.accessToken, usuarioId);
  }

  @Get('me/historial')
  @ApiBearerAuth()
  @UseGuards(RobleAuthGuard)
  async historialParticipacion(@Req() req: robleAuthGuard.RobleRequest) {
    await this.ensureCurrentUserProfile(req);
    return this.service.listarHistorialParticipacion(
      req.accessToken,
      this.getUserId(req),
    );
  }

  @Get(':id')
  @ApiBearerAuth()
  @UseGuards(RobleAuthGuard)
  async obtener(
    @Req() req: robleAuthGuard.RobleRequest,
    @Param('id') torneoId: string,
  ) {
    await this.ensureCurrentUserProfile(req);
    const usuarioId = this.getUserId(req);
    const userRole = this.getUserRole(req);

    return this.service.obtenerTorneoDetalle(
      req.accessToken,
      torneoId,
      usuarioId,
      userRole,
    );
  }

  @Patch(':id/estado')
  @ApiBearerAuth()
  @UseGuards(RobleAuthGuard)
  async cambiarEstado(
    @Req() req: robleAuthGuard.RobleRequest,
    @Param('id') torneoId: string,
    @Body() dto: UpdateEstadoTorneoDto,
  ) {
    await this.ensureCurrentUserProfile(req);
    const usuarioId = this.getUserId(req);
    const userRole = this.getUserRole(req);

    return this.service.actualizarEstadoTorneo(
      req.accessToken,
      torneoId,
      usuarioId,
      userRole,
      dto.estado,
    );
  }

  @Put(':id')
  @ApiBearerAuth()
  @UseGuards(RobleAuthGuard)
  async editar(
    @Req() req: robleAuthGuard.RobleRequest,
    @Param('id') torneoId: string,
    @Body() dto: UpdateTorneoDto,
  ) {
    await this.ensureCurrentUserProfile(req);
    const usuarioId = this.getUserId(req);
    const userRole = this.getUserRole(req);

    return this.service.editarTorneo(
      req.accessToken,
      torneoId,
      usuarioId,
      userRole,
      dto,
    );
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(RobleAuthGuard)
  async cancelar(
    @Req() req: robleAuthGuard.RobleRequest,
    @Param('id') torneoId: string,
  ) {
    await this.ensureCurrentUserProfile(req);
    const usuarioId = this.getUserId(req);
    const userRole = this.getUserRole(req);

    return this.service.cancelarTorneo(
      req.accessToken,
      torneoId,
      usuarioId,
      userRole,
    );
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(RobleAuthGuard)
  async crear(
    @Req() req: robleAuthGuard.RobleRequest,
    @Body() dto: CreateTorneoDto,
  ) {
    await this.ensureCurrentUserProfile(req);
    const usuarioId = this.getUserId(req);

    return this.service.crearTorneo(req.accessToken, usuarioId, dto);
  }

  @Post(':id/unirse')
  @ApiBearerAuth()
  @UseGuards(RobleAuthGuard)
  async unirse(
    @Req() req: robleAuthGuard.RobleRequest,
    @Param('id') torneoId: string,
    @Body() dto: UnirseTorneoDto,
  ) {
    await this.ensureCurrentUserProfile(req);
    const usuarioId = this.getUserId(req);

    return this.service.unirseATorneo(
      req.accessToken,
      torneoId,
      usuarioId,
      dto.codigoAcceso,
    );
  }

  @Post(':id/sesiones/iniciar')
  @ApiBearerAuth()
  @UseGuards(RobleAuthGuard)
  async iniciarSesion(
    @Req() req: robleAuthGuard.RobleRequest,
    @Param('id') torneoId: string,
  ) {
    await this.ensureCurrentUserProfile(req);
    const usuarioId = this.getUserId(req);

    return this.service.iniciarSesionTorneo(req.accessToken, torneoId, usuarioId);
  }

  @Post(':id/sesiones/:sessionId/finalizar')
  @ApiBearerAuth()
  @UseGuards(RobleAuthGuard)
  async finalizarSesion(
    @Req() req: robleAuthGuard.RobleRequest,
    @Param('id') torneoId: string,
    @Param('sessionId') sessionId: string,
    @Body() dto: FinishTorneoSessionDto,
  ) {
    await this.ensureCurrentUserProfile(req);
    const usuarioId = this.getUserId(req);

    return this.service.finalizarSesionTorneo(
      req.accessToken,
      torneoId,
      sessionId,
      usuarioId,
      dto,
    );
  }

  @Get(':id/participantes')
  @ApiBearerAuth()
  @UseGuards(RobleAuthGuard)
  async participantes(
    @Req() req: robleAuthGuard.RobleRequest,
    @Param('id') torneoId: string,
  ) {
    await this.ensureCurrentUserProfile(req);
    const usuarioId = this.getUserId(req);
    const userRole = this.getUserRole(req);
    return this.service.listarParticipantes(
      req.accessToken,
      torneoId,
      usuarioId,
      userRole,
    );
  }

  @Post(':id/resultados')
  @ApiBearerAuth()
  @UseGuards(RobleAuthGuard)
  async registrarResultado(
    @Req() req: robleAuthGuard.RobleRequest,
    @Param('id') torneoId: string,
    @Body() dto: CreateResultadoDto,
  ) {
    await this.ensureCurrentUserProfile(req);
    const usuarioId = this.getUserId(req);

    return this.service.registrarResultado(
      req.accessToken,
      torneoId,
      usuarioId,
      dto,
    );
  }

  @Get(':id/ranking')
  @ApiBearerAuth()
  @UseGuards(RobleAuthGuard)
  async ranking(
    @Req() req: robleAuthGuard.RobleRequest,
    @Param('id') torneoId: string,
  ) {
    await this.ensureCurrentUserProfile(req);
    const usuarioId = this.getUserId(req);
    const userRole = this.getUserRole(req);
    return this.service.obtenerRanking(
      req.accessToken,
      torneoId,
      usuarioId,
      userRole,
    );
  }
}
