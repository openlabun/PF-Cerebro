import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiProperty,
} from '@nestjs/swagger';
import * as RobleAuthGuard from '../../common/guards/roble-auth.guard';

import { ProfilesService } from './profiles.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import type { Perfil } from './interfaces/perfil.interface';

class AddExperienceSelfDto {
  @ApiProperty()
  experiencia!: number;
}

@ApiTags('PersonalTracking - Profiles')
@ApiBearerAuth()
@UseGuards(RobleAuthGuard.RobleAuthGuard)
@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear perfil del usuario autenticado (si no existe)',
  })
  @ApiResponse({ status: 201, description: 'Perfil creado correctamente' })
  public async createProfile(
    @Body() dto: CreateProfileDto,
    @Req() req: RobleAuthGuard.RobleRequest,
  ): Promise<Perfil> {
    const usuarioId: string = String(req.robleUser.sub);
    const accessToken: string = req.accessToken;

    const resp: Perfil = await this.profilesService.createProfile(
      dto,
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
    const usuarioId: string = String(req.robleUser.sub);
    const accessToken: string = req.accessToken;

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
    const usuarioId: string = String(req.robleUser.sub);
    const accessToken: string = req.accessToken;

    const resp: Perfil = await this.profilesService.addExperience(
      usuarioId,
      body.experiencia,
      accessToken,
    );
    return resp;
  }
}
