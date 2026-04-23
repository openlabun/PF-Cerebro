import {
  Body,
  Controller,
  Get,
  Patch,
  HttpException,
  HttpStatus,
  Logger,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiProperty,
} from '@nestjs/swagger';
import * as RobleAuthGuard from '../../common/guards/roble-auth.guard';
import { Type } from 'class-transformer';
import { IsNumber } from 'class-validator';
import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import type { Perfil } from './interfaces/perfil.interface';
import { PersonalTrackingBootstrapService } from '../bootstrap/personal-tracking-bootstrap.service';
import { UpdateMarcoDto } from './dto/update-marco.dto';

class AddExperienceSelfDto {
  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  experiencia!: number;
}

@ApiTags('PersonalTracking - Profiles')
@ApiBearerAuth()
@UseGuards(RobleAuthGuard.RobleAuthGuard)
@Controller('profiles')
export class ProfilesController {
  private readonly logger = new Logger(ProfilesController.name);

  constructor(
    private readonly profilesService: ProfilesService,
    private readonly bootstrapService: PersonalTrackingBootstrapService,
  ) {}

  private resolveUsuarioId(req: RobleAuthGuard.RobleRequest): string {
    const payload = (req?.robleUser ?? {}) as unknown as Record<string, unknown>;
    const candidates = [
      payload.sub,
      payload.id,
      payload.userId,
      payload.usuarioId,
    ];

    for (const candidate of candidates) {
      if (typeof candidate !== 'string') {
        continue;
      }

      const normalized = candidate.trim();
      if (
        normalized &&
        normalized !== 'undefined' &&
        normalized !== 'null'
      ) {
        return normalized;
      }
    }

    this.logger.error(
      `No se pudo resolver usuarioId en controller. payloadKeys=${Object.keys(payload).join(',')}`,
    );
    throw new HttpException(
      'No se pudo resolver el usuario autenticado',
      HttpStatus.UNAUTHORIZED,
    );
  }

  private resolveNombre(req: RobleAuthGuard.RobleRequest): string {
    const payload = (req?.robleUser ?? {}) as unknown as Record<string, unknown>;
    const fromPayload = [payload.name, payload.nombre];

    for (const candidate of fromPayload) {
      if (typeof candidate !== 'string') {
        continue;
      }

      const normalized = candidate.trim();
      if (
        normalized &&
        normalized !== 'undefined' &&
        normalized !== 'null'
      ) {
        return normalized;
      }
    }

    if (typeof payload.email === 'string') {
      const email = payload.email.trim();
      if (email) {
        return email.split('@')[0] || email;
      }
    }

    return 'Usuario';
  }

  private resolveCorreo(req: RobleAuthGuard.RobleRequest): string {
    const payload = (req?.robleUser ?? {}) as unknown as Record<string, unknown>;
    if (typeof payload.email !== 'string') {
      return '';
    }

    const email = payload.email.trim();
    if (!email || email === 'undefined' || email === 'null') {
      return '';
    }
    return email;
  }

  @Post()
  @ApiOperation({
    summary: 'Crear perfil del usuario autenticado (si no existe)',
  })
  @ApiResponse({ status: 201, description: 'Perfil creado correctamente' })
  public async createProfile(
    @Body() dto: CreateProfileDto,
    @Req() req: RobleAuthGuard.RobleRequest,
  ): Promise<Perfil> {
    const usuarioId: string = this.resolveUsuarioId(req);
    const nombre: string = this.resolveNombre(req);
    const correo: string = this.resolveCorreo(req);
    const accessToken: string = req.accessToken;
    this.logger.log(`createProfile iniciado para usuarioId=${usuarioId}`);

    const resp: Perfil = await this.profilesService.createProfile(
      { ...dto, nombre: dto.nombre ?? nombre, correo: dto.correo ?? correo },
      accessToken,
      usuarioId,
    );
    return resp;
  }

  @Post('me')
  @ApiOperation({ summary: 'Obtener mi perfil (usuario autenticado)' })
  @ApiResponse({ status: 200, description: 'Perfil retornado correctamente' })
  public async me(
    @Req() req: RobleAuthGuard.RobleRequest,
  ): Promise<Perfil | null> {
    const usuarioId: string = this.resolveUsuarioId(req);
    const nombre: string = this.resolveNombre(req);
    const correo: string = this.resolveCorreo(req);
    const accessToken: string = req.accessToken;
    this.logger.log(`profiles/me iniciado para usuarioId=${usuarioId}`);
    await this.bootstrapService.ensureInitialized(
      accessToken,
      usuarioId,
      nombre,
      correo,
    );

    const resp: Perfil | null = await this.profilesService.getProfile(
      usuarioId,
      accessToken,
    );
    return resp;
  }

  @Post('add-experience')
  @ApiOperation({
    summary: 'Sumar experiencia a mi perfil (usuario autenticado)',
  })
  @ApiResponse({ status: 200, description: 'Perfil actualizado correctamente' })
  public async addExperience(
    @Body() body: AddExperienceSelfDto,
    @Req() req: RobleAuthGuard.RobleRequest,
  ): Promise<Perfil> {
    const usuarioId: string = this.resolveUsuarioId(req);
    const nombre: string = this.resolveNombre(req);
    const correo: string = this.resolveCorreo(req);
    const accessToken: string = req.accessToken;
    this.logger.log(`add-experience iniciado para usuarioId=${usuarioId}`);
    await this.bootstrapService.ensureInitialized(
      accessToken,
      usuarioId,
      nombre,
      correo,
    );
    const resp: Perfil = await this.profilesService.addExperience(
      usuarioId,
      body.experiencia,
      accessToken,
    );
    return resp;
  }

  @ApiOperation({ summary: 'Actualizar marco del perfil del usuario autenticado' })
  @ApiResponse({ status: 200, description: 'Marco actualizado correctamente' })
  @ApiResponse({ status: 404, description: 'Perfil no encontrado' })
  @ApiResponse({ status: 400, description: 'Solicitud inválida' })
  @ApiResponse({ status: 500, description: 'Error interno del servidor' })
  @Patch('marco')
  public async updateMarco(
    @Body() body: UpdateMarcoDto,
    @Req() req: RobleAuthGuard.RobleRequest,
  ): Promise<Perfil> {
    const usuarioId: string = this.resolveUsuarioId(req);
    const accessToken: string = req.accessToken;
    this.logger.log(`updateMarco iniciado para usuarioId=${usuarioId}`);
    const resp: Perfil = await this.profilesService.updateMarco(usuarioId, body.marco ?? null, accessToken);
    return resp;
  }

  @Get('count')
  @ApiOperation({ summary: 'Contar total de perfiles creados' })
  @ApiResponse({ status: 200, description: 'Conteo de perfiles retornado' })
  public async count(
    @Req() req: RobleAuthGuard.RobleRequest,
  ): Promise<{ totalProfiles: number }> {
    const totalProfiles = await this.profilesService.countProfiles(
      req.accessToken,
    );
    return { totalProfiles };
  }
}
