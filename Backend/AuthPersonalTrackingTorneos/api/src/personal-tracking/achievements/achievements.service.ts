import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { RobleService } from '../../roble/roble.service';
import type { Achievement } from './interfaces/achievement.interface';
import type { UserAchievement } from './interfaces/user-achievement.interface';

@Injectable()
export class AchievementsService {
  private readonly logger = new Logger(AchievementsService.name);

  constructor(private readonly robleService: RobleService) {}

  async getAllAchievements(accessToken: string): Promise<Achievement[]> {
    this.logger.log('Consultando catalogo de logros (Logro).');
    const rows = await this.robleService.read<Achievement>(accessToken, 'Logro', {});
    this.logger.log(`Catalogo de logros obtenido. cantidad=${rows.length}`);
    return rows;
  }

  async getUserAchievements(
    usuarioId: string,
    accessToken: string,
  ): Promise<UserAchievement[]> {
    this.logger.log(
      `Consultando logros desbloqueados en LogroUsuario. usuarioId=${usuarioId}`,
    );
    const rows = await this.robleService.read<UserAchievement>(
      accessToken,
      'LogroUsuario',
      { usuarioId },
    );
    this.logger.log(
      `Logros desbloqueados consultados. usuarioId=${usuarioId} cantidad=${rows.length}`,
    );
    return rows;
  }

  async unlockAchievement(
    usuarioId: string,
    logroId: string,
    accessToken: string,
  ): Promise<UserAchievement> {
    const normalizedLogroId = String(logroId ?? '').trim();
    if (!normalizedLogroId) {
      this.logger.warn(
        `unlockAchievement recibido con logroId vacio. usuarioId=${usuarioId}`,
      );
      throw new HttpException('logroId es requerido', HttpStatus.BAD_REQUEST);
    }

    this.logger.log(
      `unlockAchievement iniciado. usuarioId=${usuarioId} logroId=${normalizedLogroId}`,
    );

    const existing = await this.robleService.read<UserAchievement>(
      accessToken,
      'LogroUsuario',
      { usuarioId, logroId: normalizedLogroId },
    );

    if (existing.length > 0) {
      this.logger.log(
        `unlockAchievement omitido por duplicado. usuarioId=${usuarioId} logroId=${normalizedLogroId}`,
      );
      return existing[0];
    }

    const record: UserAchievement = {
      usuarioId,
      logroId: normalizedLogroId,
      desbloqueadoEn: new Date().toISOString(),
    };
    this.logger.log(
      `Insertando en LogroUsuario. usuarioId=${usuarioId} logroId=${normalizedLogroId}`,
    );

    const resp = await this.robleService.insert<UserAchievement>(
      accessToken,
      'LogroUsuario',
      [record],
    );

    if (!resp.inserted || resp.inserted.length === 0) {
      this.logger.error(
        `Insert en LogroUsuario sin filas insertadas. usuarioId=${usuarioId} logroId=${normalizedLogroId}`,
      );
      throw new HttpException(
        'No se pudo desbloquear el logro',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.log(
      `Logro desbloqueado e insertado en LogroUsuario. usuarioId=${usuarioId} logroId=${normalizedLogroId}`,
    );
    return resp.inserted[0];
  }
}
