import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { RobleService } from '../../roble/roble.service';
import type {
  PerfilRow,
  JuegoRow,
  EstadisticasJuegoUsuarioRow,
} from './personal-tracking.types';

@Injectable()
export class PersonalTrackingBootstrapService {
  private readonly logger = new Logger(PersonalTrackingBootstrapService.name);

  constructor(private readonly robleService: RobleService) {}

  private isInvalidUserId(userId: string): boolean {
    const normalized = String(userId ?? '').trim();
    return !normalized || normalized === 'undefined' || normalized === 'null';
  }

  public async ensureInitialized(
    accessToken: string,
    userId: string,
    nombre?: string,
    correo?: string,
  ): Promise<void> {
    if (this.isInvalidUserId(userId)) {
      this.logger.error(
        `ensureInitialized abortado: userId invalido (${String(userId)})`,
      );
      throw new HttpException(
        'No se pudo inicializar perfil por usuarioId invalido',
        HttpStatus.BAD_REQUEST,
      );
    }

    let stage = 'read-profile';
    try {
      this.logger.log(`ensureInitialized iniciado para usuarioId=${userId}`);

      const profiles: PerfilRow[] = await this.robleService.read<PerfilRow>(
        accessToken,
        'Perfil',
        { usuarioId: userId },
      );
      const existingProfile: PerfilRow | undefined = profiles[0];

      if (existingProfile) {
        this.logger.log(`Perfil ya existe para usuarioId=${userId}.`);
      } else {
        stage = 'insert-profile';
        this.logger.warn(
          `Perfil no existe para usuarioId=${userId}. Se creara registro base.`,
        );
        await this.robleService.insert<Omit<PerfilRow, '_id'>>(
          accessToken,
          'Perfil',
          [
            {
              usuarioId: userId,
              nombre: String(nombre ?? '').trim() || 'Usuario',
              correo: String(correo ?? '').trim().toLowerCase(),
              nivel: 1,
              experiencia: 0,
              rachaActual: 0,
              rachaMaxima: 0,
              salvadoresRacha: 0,
              tituloActivo: null,
            },
          ],
        );
      }

      stage = 'read-games';
      const juegos: JuegoRow[] = await this.robleService.read<JuegoRow>(
        accessToken,
        'Juego',
        undefined,
      );

      if (!juegos || juegos.length === 0) {
        this.logger.log(
          `No hay juegos para inicializar stats. usuarioId=${userId}`,
        );
        return;
      }

      stage = 'read-existing-game-stats';
      const existingStats =
        await this.robleService.read<EstadisticasJuegoUsuarioRow>(
          accessToken,
          'EstadisticasJuegoUsuario',
          { usuarioId: userId },
        );

      const existingGameIds = new Set(
        (existingStats || [])
          .map((row) => String(row?.juegoId || '').trim())
          .filter(Boolean),
      );

      stage = 'insert-game-stats';
      const statsRecords: Array<Omit<EstadisticasJuegoUsuarioRow, '_id'>> =
        juegos
          .filter((juego) => !existingGameIds.has(String(juego._id || '').trim()))
          .map((juego) => {
            return {
              usuarioId: userId,
              juegoId: juego._id,
              elo: 0,
              partidasJugadas: 0,
              victorias: 0,
              derrotas: 0,
              empates: 0,
              ligaId: null,
            };
          });

      if (statsRecords.length === 0) {
        this.logger.log(
          `Bootstrap sin cambios para usuarioId=${userId}. Estadisticas ya existen para todos los juegos.`,
        );
        return;
      }

      await this.robleService.insert<Omit<EstadisticasJuegoUsuarioRow, '_id'>>(
        accessToken,
        'EstadisticasJuegoUsuario',
        statsRecords,
      );

      this.logger.log(
        `Bootstrap completo para usuarioId=${userId}. stats=${statsRecords.length}`,
      );
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Error desconocido';
      this.logger.error(
        `Fallo ensureInitialized en etapa=${stage} usuarioId=${userId}: ${message}`,
      );
      throw error;
    }
  }
}

