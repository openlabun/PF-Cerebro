
import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { RobleService } from '../../roble/roble.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import type { Perfil } from './interfaces/perfil.interface';
import { TitlesService } from '../tittles/tittles.service';
import { Title } from '../tittles/interfaces/title.interface';

@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(
    private readonly robleService: RobleService,
    private readonly titlesService: TitlesService,
  ) {}

  private isInvalidUserId(usuarioId: string): boolean {
    const normalized = String(usuarioId ?? '').trim();
    return !normalized || normalized === 'undefined' || normalized === 'null';
  }

  private ensureValidUserId(usuarioId: string, stage: string): void {
    if (!this.isInvalidUserId(usuarioId)) {
      return;
    }

    this.logger.error(
      `usuarioId invalido en ${stage}: valor=${String(usuarioId)}`,
    );
    throw new HttpException('usuarioId invalido', HttpStatus.BAD_REQUEST);
  }

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

  private normalizarNombre(nombre?: string | null): string {
    const normalized = String(nombre ?? '').trim();
    if (!normalized || normalized === 'undefined' || normalized === 'null') {
      return 'Usuario';
    }
    return normalized;
  }

  private normalizarCorreo(correo?: string | null): string {
    const normalized = String(correo ?? '').trim().toLowerCase();
    if (
      !normalized ||
      normalized === 'undefined' ||
      normalized === 'null' ||
      !normalized.includes('@')
    ) {
      return '';
    }
    return normalized;
  }

  private hasInvalidContactColumns(
    skipped?: Array<{ index: number; reason: string }>,
  ): boolean {
    if (!skipped || skipped.length === 0) return false;
    return skipped.some((item) => {
      const reason = String(item?.reason ?? '').toLowerCase();
      return (
        reason.includes('columnas inválidas') ||
        reason.includes('columnas invalidas')
      ) && reason.includes('correo');
    });
  }

  private async hidratarTituloActivo(
    perfil: Perfil,
    accessToken: string,
  ): Promise<Perfil> {
    const tituloId = perfil.tituloActivo ?? null;
    if (!tituloId) {
      return { ...perfil, tituloActivoTexto: null };
    }

    const title: Title | null = await this.titlesService.getById(
      accessToken,
      tituloId,
    );
    const texto = (title as { nombre?: string } | null)?.nombre ?? null;
    return { ...perfil, tituloActivoTexto: texto };
  }

  public async getProfile(
    usuarioId: string,
    accessToken: string,
  ): Promise<Perfil | null> {
    this.ensureValidUserId(usuarioId, 'getProfile');

    try {
      const perfiles: Perfil[] = await this.robleService.read<Perfil>(
        accessToken,
        'Perfil',
        { usuarioId },
      );

      if (!perfiles || perfiles.length === 0) {
        this.logger.warn(`No existe perfil para usuarioId=${usuarioId}`);
        return null;
      }

      const base: Perfil = this.normalizarPerfil(perfiles[0]);
      return this.hidratarTituloActivo(base, accessToken);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Error al consultar perfil usuarioId=${usuarioId}: ${message}`,
      );
      throw new HttpException(
        'Error al consultar perfil',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  public async countProfiles(accessToken: string): Promise<number> {
    try {
      const perfiles: Perfil[] = await this.robleService.read<Perfil>(
        accessToken,
        'Perfil',
      );
      return Array.isArray(perfiles) ? perfiles.length : 0;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(`Error al contar perfiles: ${message}`);
      throw new HttpException(
        'Error al contar perfiles',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  public async createProfile(
    createDto: CreateProfileDto,
    accessToken: string,
    usuarioId: string,
  ): Promise<Perfil> {
    this.ensureValidUserId(usuarioId, 'createProfile');

    try {
      const existingProfile = await this.getProfile(usuarioId, accessToken);
      if (existingProfile) {
        this.logger.warn(
          `createProfile llamado con perfil existente. usuarioId=${usuarioId}`,
        );
        return existingProfile;
      }

      const record: Perfil = {
        usuarioId,
        nombre: this.normalizarNombre(createDto.nombre),
        correo: this.normalizarCorreo(createDto.correo),
        nivel: createDto.nivel ?? 1,
        experiencia: createDto.experiencia ?? 0,
        rachaActual: createDto.rachaActual ?? 0,
        rachaMaxima: createDto.rachaMaxima ?? 0,
        salvadoresRacha: createDto.salvadoresRacha ?? 0,
        tituloActivo: createDto.tituloActivo ?? null,
      };

      this.logger.log(`Intentando crear perfil para usuarioId=${usuarioId}`);
      let resp = await this.robleService.insert<Perfil>(
        accessToken,
        'Perfil',
        [record],
      );

      if (
        (!resp.inserted || resp.inserted.length === 0) &&
        this.hasInvalidContactColumns(resp.skipped) &&
        record.correo
      ) {
        this.logger.warn(
          `Perfil sin columna correo en ROBLE. Se reintenta insercion sin ese campo. usuarioId=${usuarioId}`,
        );
        const fallbackRecord: Perfil = { ...record };
        delete fallbackRecord.correo;
        resp = await this.robleService.insert<Perfil>(
          accessToken,
          'Perfil',
          [fallbackRecord],
        );
      }

      if (resp.inserted && resp.inserted.length > 0) {
        const created: Perfil = this.normalizarPerfil(resp.inserted[0]);
        return this.hidratarTituloActivo(created, accessToken);
      }

      this.logger.error(
        `Insercion de perfil sin resultados para usuarioId=${usuarioId}. skipped=${JSON.stringify(resp.skipped ?? [])}`,
      );
      throw new HttpException(
        `No se pudo crear el perfil: ${JSON.stringify(resp.skipped ?? [])}`,
        HttpStatus.BAD_REQUEST,
      );
    } catch (error: unknown) {
      if (error instanceof HttpException) {
        throw error;
      }

      const msg =
        error instanceof Error ? error.message : 'Error al conectar con ROBLE';
      this.logger.error(
        `Fallo createProfile usuarioId=${usuarioId}: ${msg}`,
      );
      throw new HttpException(msg, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  
  public async updateMarco(
    usuarioId: string,
    marco: string | null,
    accessToken: string,
  ): Promise<Perfil> {
    this.ensureValidUserId(usuarioId, 'updateMarco');
    const perfil: Perfil | null = await this.getProfile(usuarioId, accessToken);
    if (!perfil) {
      throw new HttpException('Perfil no encontrado', HttpStatus.NOT_FOUND);
    }
    try {
      const updated: Perfil = await this.robleService.update<Perfil>(
        accessToken,
        'Perfil',
        'usuarioId',
        usuarioId,
        {
          marco,
        },
      );
      const resp: Perfil = this.normalizarPerfil({ ...perfil, ...updated });
      return resp;
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Error al actualizar marco usuarioId=${usuarioId}: ${message}`,
      );
      throw new HttpException(
        'Error al actualizar marco en ROBLE',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
    this.ensureValidUserId(usuarioId, 'addExperience');

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
          tituloActivo: perfil.tituloActivo ?? null,
        },
      );

      const resp: Perfil = this.normalizarPerfil(updated);
      return this.hidratarTituloActivo(resp, accessToken);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Error al actualizar experiencia usuarioId=${usuarioId}: ${message}`,
      );
      throw new HttpException(
        'Error al actualizar experiencia en ROBLE',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}

