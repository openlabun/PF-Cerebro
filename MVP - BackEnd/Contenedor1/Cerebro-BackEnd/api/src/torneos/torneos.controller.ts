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

@ApiTags('Torneos')
@ApiBearerAuth()
@Controller('torneos')
@UseGuards(RobleAuthGuard)
export class TorneosController {
  constructor(private readonly service: TorneosService) {}

  private getUserId(req: robleAuthGuard.RobleRequest): string {
    // 👇 Ahora usamos el payload del guard directamente
    return req.robleUser.sub;
  }

  @Get()
  async listar(@Req() req: robleAuthGuard.RobleRequest) {
    return this.service.listarTorneos(req.accessToken);
  }

  @Get('usuarios/:usuarioId/resultados')
  async resultadosPorUsuario(
    @Req() req: robleAuthGuard.RobleRequest,
    @Param('usuarioId') usuarioId: string,
  ) {
    return this.service.obtenerResultadosPorUsuario(req.accessToken, usuarioId);
  }

  @Get(':id')
  async obtener(
    @Req() req: robleAuthGuard.RobleRequest,
    @Param('id') torneoId: string,
  ) {
    return this.service.obtenerTorneoDetalle(req.accessToken, torneoId);
  }

  @Patch(':id/estado')
  async cambiarEstado(
    @Req() req: robleAuthGuard.RobleRequest,
    @Param('id') torneoId: string,
    @Body() dto: UpdateEstadoTorneoDto,
  ) {
    const usuarioId = this.getUserId(req);

    return this.service.actualizarEstadoTorneo(
      req.accessToken,
      torneoId,
      usuarioId,
      dto.estado,
    );
  }

  @Put(':id')
  async editar(
    @Req() req: robleAuthGuard.RobleRequest,
    @Param('id') torneoId: string,
    @Body() dto: UpdateTorneoDto,
  ) {
    const usuarioId = this.getUserId(req);

    return this.service.editarTorneo(req.accessToken, torneoId, usuarioId, dto);
  }

  @Delete(':id')
  async cancelar(
    @Req() req: robleAuthGuard.RobleRequest,
    @Param('id') torneoId: string,
  ) {
    const usuarioId = this.getUserId(req);

    return this.service.cancelarTorneo(req.accessToken, torneoId, usuarioId);
  }

  @Post()
  async crear(
    @Req() req: robleAuthGuard.RobleRequest,
    @Body() dto: CreateTorneoDto,
  ) {
    const usuarioId = this.getUserId(req);

    return this.service.crearTorneo(req.accessToken, usuarioId, dto);
  }

  @Post(':id/unirse')
  async unirse(
    @Req() req: robleAuthGuard.RobleRequest,
    @Param('id') torneoId: string,
    @Body() dto: UnirseTorneoDto,
  ) {
    const usuarioId = this.getUserId(req);

    return this.service.unirseATorneo(
      req.accessToken,
      torneoId,
      usuarioId,
      dto.codigoAcceso,
    );
  }

  @Get(':id/participantes')
  async participantes(
    @Req() req: robleAuthGuard.RobleRequest,
    @Param('id') torneoId: string,
  ) {
    return this.service.listarParticipantes(req.accessToken, torneoId);
  }

  @Post(':id/resultados')
  async registrarResultado(
    @Req() req: robleAuthGuard.RobleRequest,
    @Param('id') torneoId: string,
    @Body() dto: CreateResultadoDto,
  ) {
    const usuarioId = this.getUserId(req);

    return this.service.registrarResultado(
      req.accessToken,
      torneoId,
      usuarioId,
      dto,
    );
  }

  @Get(':id/ranking')
  async ranking(
    @Req() req: robleAuthGuard.RobleRequest,
    @Param('id') torneoId: string,
  ) {
    return this.service.obtenerRanking(req.accessToken, torneoId);
  }
}
