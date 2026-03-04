import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { RobleService } from '../../roble/roble.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import type { Perfil } from './interfaces/perfil.interface';
import { TitlesService } from '../tittles/tittles.service';
import { Title } from '../tittles/interfaces/title.interface';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly robleService: RobleService,
    private readonly titlesService: TitlesService,
  ) {}

  private normalizarPerfil(perfil: Perfil): Perfil {
    return {
      ...perfil,
      nivel: Number(perfil.nivel),
      experiencia: Number(perfil.experiencia),
      rachaActual: Number(perfil.rachaActual),
      rachaMaxima: Number(perfil.rachaMaxima),
      salvadoresRacha: Number(perfil.salvadoresRacha),
    };
  }

  // NUEVO: hidratar título (ID -> texto)
  private async hidratarTituloActivo(
    perfil: Perfil,
    accessToken: string,
  ): Promise<Perfil> {
    const tituloId = perfil.tituloActivo ?? null;
    if (!tituloId) {
      return { ...perfil, tituloActivoTexto: null };
    }

    try {
      const title: Title | null = await this.titlesService.getById(accessToken, tituloId);

      const texto =(title as any)?.nombre ?? null;

      return { ...perfil, tituloActivoTexto: texto };
    } catch (e) {
      // return { ...perfil, tituloActivoTexto: null };

      // fallar fuerte, re-lanza:
      throw e;
    }
  }

  public async getProfile(
    usuarioId: string,
    accessToken: string,
  ): Promise<Perfil | null> {
    try {
      const perfiles: Perfil[] = await this.robleService.read<Perfil>(
        accessToken,
        'Perfil',
        { usuarioId },
      );

      if (!perfiles || perfiles.length === 0) {
        return null;
      }

      const base: Perfil = this.normalizarPerfil(perfiles[0]);
      const hydrated: Perfil = await this.hidratarTituloActivo(base, accessToken);
      return hydrated;
    } catch {
      throw new HttpException(
        'Error al consultar perfil',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  public async createProfile(
    createDto: CreateProfileDto,
    accessToken: string,
    usuarioId: string,
  ): Promise<Perfil> {
    const record: Perfil = {
      usuarioId,
      nivel: createDto.nivel ?? 1,
      experiencia: createDto.experiencia ?? 0,
      rachaActual: createDto.rachaActual ?? 0,
      rachaMaxima: createDto.rachaMaxima ?? 0,
      salvadoresRacha: createDto.salvadoresRacha ?? 0,
      tituloActivo: createDto.tituloActivo ?? null,
    };

    try {
      const resp = await this.robleService.insert<Perfil>(
        accessToken,
        'Perfil',
        [record],
      );

      if (resp.inserted && resp.inserted.length > 0) {
        const created: Perfil = this.normalizarPerfil(resp.inserted[0]);
        const hydrated: Perfil = await this.hidratarTituloActivo(created, accessToken);
        return hydrated;
      }

      throw new HttpException(
        `No se pudo crear el perfil: ${JSON.stringify(resp.skipped ?? [])}`,
        HttpStatus.BAD_REQUEST,
      );
    } catch (error: unknown) {
      const msg: string =
        error instanceof Error ? error.message : 'Error al conectar con ROBLE';
      throw new HttpException(msg, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private xpParaSiguienteNivel(nivel: number): number {
    if (nivel >= 1 && nivel <= 10) return nivel * 100;
    if (nivel >= 11 && nivel <= 30) return nivel * 150;
    if (nivel >= 31 && nivel <= 50) return nivel * 250;
    return nivel + 250;
  }

  public async addExperience(
    usuarioId: string,
    experienciaGanada: number,
    accessToken: string,
  ): Promise<Perfil> {
    const perfil: Perfil | null = await this.getProfile(usuarioId, accessToken);
    if (!perfil) {
      throw new HttpException('Perfil no encontrado', HttpStatus.NOT_FOUND);
    }

    let nivel: number = Number(perfil.nivel);
    let experienciaTotal: number =
      Number(perfil.experiencia) + Number(experienciaGanada);

    while (experienciaTotal >= this.xpParaSiguienteNivel(nivel)) {
      experienciaTotal -= this.xpParaSiguienteNivel(nivel);
      nivel += 1;
    }

    try {
      const updated: Perfil = await this.robleService.update<Perfil>(
        accessToken,
        'Perfil',
        'usuarioId',
        usuarioId,
        {
          nivel,
          experiencia: experienciaTotal,
          rachaActual: Number(perfil.rachaActual),
          rachaMaxima: Number(perfil.rachaMaxima),
          salvadoresRacha: Number(perfil.salvadoresRacha),

          // OJO: aquí tenías "tituloActivoId" pero el campo se llama "tituloActivo"
          // Si ROBLE realmente usa "tituloActivoId" déjalo, pero en tu interfaz es tituloActivo.
          tituloActivo: perfil.tituloActivo ?? null,
        },
      );

      const resp: Perfil = this.normalizarPerfil(updated);
      const hydrated: Perfil = await this.hidratarTituloActivo(resp, accessToken);
      return hydrated;
    } catch {
      throw new HttpException(
        'Error al actualizar experiencia en ROBLE',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}