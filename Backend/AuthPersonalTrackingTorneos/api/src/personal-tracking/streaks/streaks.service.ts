import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { RobleService } from '../../roble/roble.service';
import { Perfil } from '../profiles/interfaces/perfil.interface';

type GameSessionRecord = {
  _id?: string;
  jugadoEn?: string;
};

@Injectable()
export class StreaksService {
  private readonly logger = new Logger(StreaksService.name);

  constructor(private readonly robleService: RobleService) {}

  // ================================
  // AUMENTAR RACHA
  // ================================
  async increaseStreak(usuarioId: string, accessToken: string) {
    const perfil = await this.getProfile(usuarioId, accessToken);
    const rachaActual = Number(perfil.rachaActual ?? 0);
    const latestSessions = await this.getLatestSessions(usuarioId, accessToken, 2);
    const currentSession = latestSessions[0] ?? null;
    const previousSession = latestSessions[1] ?? null;
    const currentSessionDay = this.getSessionDayKey(currentSession?.jugadoEn);
    const previousSessionDay = this.getSessionDayKey(previousSession?.jugadoEn);
    const isSameSessionDay =
      Boolean(currentSessionDay) &&
      Boolean(previousSessionDay) &&
      currentSessionDay === previousSessionDay;

    if (isSameSessionDay && rachaActual <= 0) {
      const repairedMax = Math.max(Number(perfil.rachaMaxima ?? 0), 1);

      const repaired = await this.robleService.update<Perfil>(
        accessToken,
        'Perfil',
        'usuarioId',
        usuarioId,
        {
          rachaActual: 1,
          rachaMaxima: repairedMax,
        },
      );

      return {
        message: 'Racha reparada para actividad del mismo dia',
        rachaActual: Number(repaired?.rachaActual ?? 1),
        rachaMaxima: Number(repaired?.rachaMaxima ?? repairedMax),
      };
    }

    if (isSameSessionDay) {
      return {
        message: 'La racha no aumenta mas de una vez por dia',
        rachaActual,
        rachaMaxima: Number(perfil.rachaMaxima ?? rachaActual),
      };
    }

    const nuevaRacha: number = rachaActual + 1;

    const nuevaRachaMaxima: number =
      nuevaRacha > perfil.rachaMaxima ? nuevaRacha : perfil.rachaMaxima;

    const updated = await this.robleService.update<Perfil>(
      accessToken,
      'Perfil',
      'usuarioId',
      usuarioId,
      {
        rachaActual: nuevaRacha,
        rachaMaxima: nuevaRachaMaxima,
      },
    );

    const rachaActualActualizada = Number(updated?.rachaActual);
    const rachaMaximaActualizada = Number(updated?.rachaMaxima);

    return {
      message: 'Racha aumentada correctamente',
      rachaActual: Number.isFinite(rachaActualActualizada)
        ? rachaActualActualizada
        : nuevaRacha,
      rachaMaxima: Number.isFinite(rachaMaximaActualizada)
        ? rachaMaximaActualizada
        : nuevaRachaMaxima,
    };
  }

  // ================================
  // RESETEAR RACHA
  // ================================
  async resetStreak(usuarioId: string, accessToken: string) {
    const perfil = await this.getProfile(usuarioId, accessToken);

    await this.robleService.update<Perfil>(
      accessToken,
      'Perfil',
      'usuarioId',
      usuarioId,
      {
        rachaActual: 0,
      },
    );

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

    await this.robleService.update<Perfil>(
      accessToken,
      'Perfil',
      'usuarioId',
      usuarioId,
      {
        salvadoresRacha: perfil.salvadoresRacha - 1,
      },
    );

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

    await this.robleService.update<Perfil>(
      accessToken,
      'Perfil',
      'usuarioId',
      usuarioId,
      {
        salvadoresRacha: perfil.salvadoresRacha + cantidad,
      },
    );

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
        'usuarioId',
        usuarioId,
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

  private getSessionDayKey(value: unknown): string | null {
    const raw = String(value ?? '').trim();
    if (!raw) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;

    return parsed.toISOString().slice(0, 10);
  }

  private async getLatestSessions(
    usuarioId: string,
    accessToken: string,
    limit: number,
  ): Promise<GameSessionRecord[]> {
    const sesiones = await this.robleService.read<GameSessionRecord>(
      accessToken,
      'SesionJuego',
      { usuarioID: usuarioId },
    );

    return (Array.isArray(sesiones) ? sesiones : [])
      .filter((session) => this.getSessionDayKey(session?.jugadoEn))
      .sort((a, b) => {
        const left = new Date(String(a?.jugadoEn ?? '')).getTime();
        const right = new Date(String(b?.jugadoEn ?? '')).getTime();
        return right - left;
      })
      .slice(0, Math.max(0, limit));
  }
}
