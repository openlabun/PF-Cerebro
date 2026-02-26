import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { RobleService } from '../../roble/roble.service';
import { Perfil } from '../profiles/interfaces/perfil.interface';

@Injectable()
export class StreaksService {
  constructor(private readonly robleService: RobleService) {}

  // ================================
  // AUMENTAR RACHA
  // ================================
  async increaseStreak(usuarioId: string, accessToken: string) {
    const perfil = await this.getProfile(usuarioId, accessToken);

    const nuevaRacha: number = perfil.rachaActual + 1;

    const nuevaRachaMaxima: number =
      nuevaRacha > perfil.rachaMaxima ? nuevaRacha : perfil.rachaMaxima;

    await this.robleService.update(accessToken, 'Perfil', '_id', perfil._id!, {
      rachaActual: nuevaRacha,
      rachaMaxima: nuevaRachaMaxima,
    });

    return {
      message: 'Racha aumentada correctamente',
      rachaActual: nuevaRacha,
      rachaMaxima: nuevaRachaMaxima,
    };
  }

  // ================================
  // RESETEAR RACHA
  // ================================
  async resetStreak(usuarioId: string, accessToken: string) {
    const perfil = await this.getProfile(usuarioId, accessToken);

    await this.robleService.update(accessToken, 'Perfil', '_id', perfil._id!, {
      rachaActual: 0,
    });

    return { message: 'Racha reseteada correctamente' };
  }

  // ================================
  // USAR SALVADOR
  // ================================
  async useSaver(usuarioId: string, accessToken: string) {
    const perfil = await this.getProfile(usuarioId, accessToken);

    if (perfil.salvadoresRacha <= 0) {
      throw new HttpException(
        'No hay salvadores disponibles',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.robleService.update(accessToken, 'Perfil', '_id', perfil._id!, {
      salvadoresRacha: perfil.salvadoresRacha - 1,
    });

    return { message: 'Salvador utilizado correctamente' };
  }

  // ================================
  // AUMENTAR SALVADORES
  // ================================
  async increaseSavers(
    usuarioId: string,
    cantidad: number,
    accessToken: string,
  ) {
    const perfil = await this.getProfile(usuarioId, accessToken);

    await this.robleService.update(accessToken, 'Perfil', '_id', perfil._id!, {
      salvadoresRacha: perfil.salvadoresRacha + cantidad,
    });

    return { message: 'Salvadores aumentados correctamente' };
  }

  // ================================
  // VALIDAR RACHA MAXIMA
  // ================================
  async updateMaxStreak(usuarioId: string, accessToken: string) {
    const perfil = await this.getProfile(usuarioId, accessToken);

    if (perfil.rachaActual > perfil.rachaMaxima) {
      await this.robleService.update(
        accessToken,
        'Perfil',
        '_id',
        perfil._id!,
        { rachaMaxima: perfil.rachaActual },
      );
    }

    return { message: 'Racha máxima validada' };
  }

  // ================================
  // HELPER PRIVADO
  // ================================
  private async getProfile(
    usuarioId: string,
    accessToken: string,
  ): Promise<Perfil> {
    const perfiles = await this.robleService.read<Perfil>(
      accessToken,
      'Perfil',
      { usuarioId },
    );

    if (!perfiles.length) {
      throw new HttpException('Perfil no encontrado', HttpStatus.NOT_FOUND);
    }

    return perfiles[0];
  }
}
