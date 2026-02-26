import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { RobleService } from '../../roble/roble.service';
import type { Achievement } from './interfaces/achievement.interface';
import type { UserAchievement } from './interfaces/user-achievement.interface';

@Injectable()
export class AchievementsService {
  constructor(private readonly robleService: RobleService) {}

  async getAllAchievements(accessToken: string): Promise<Achievement[]> {
    return this.robleService.read<Achievement>(accessToken, 'Logro', {});
  }

  async getUserAchievements(
    usuarioId: string,
    accessToken: string,
  ): Promise<UserAchievement[]> {
    return this.robleService.read<UserAchievement>(
      accessToken,
      'LogroUsuario',
      { usuarioId },
    );
  }

  async unlockAchievement(
    usuarioId: string,
    logroId: string,
    accessToken: string,
  ): Promise<UserAchievement> {
    const existing = await this.robleService.read<UserAchievement>(
      accessToken,
      'LogroUsuario',
      { usuarioId, logroId },
    );

    if (existing.length > 0) {
      return existing[0];
    }

    const record: UserAchievement = {
      usuarioId,
      logroId,
      desbloqueadoEn: new Date().toISOString(),
    };

    const resp = await this.robleService.insert<UserAchievement>(
      accessToken,
      'LogroUsuario',
      [record],
    );

    if (!resp.inserted || resp.inserted.length === 0) {
      throw new HttpException(
        'No se pudo desbloquear el logro',
        HttpStatus.BAD_REQUEST,
      );
    }

    return resp.inserted[0];
  }
}
