import { Injectable } from '@nestjs/common';
import { RobleService } from '../../roble/roble.service';
import type {
  PerfilRow,
  JuegoRow,
  EstadisticasJuegoUsuarioRow,
} from './personal-tracking.types';

@Injectable()
export class PersonalTrackingBootstrapService {
  constructor(private readonly robleService: RobleService) {}

  public async ensureInitialized(
    accessToken: string,
    userId: string,
  ): Promise<void> {
    // Verifiamoc si ya existe perfil
    const profiles: PerfilRow[] = await this.robleService.read<PerfilRow>(
      accessToken,
      'Perfil',
      { usuarioId: userId },
    );

    const existingProfile: PerfilRow | undefined = profiles[0];

    if (existingProfile) {
      // Si ya hay perfil, asumimos que el usuario ya fue inicializado
      return;
    }

    // Ceramo el perfil
    await this.robleService.insert<Omit<PerfilRow, '_id'>>(
      accessToken,
      'Perfil',
      [
        {
          usuarioId: userId,
          nivel: 1,
          experiencia: 0,
          rachaActual: 0,
          rachaMaxima: 0,
          salvadoresRacha: 0,
          tituloActivo: null,
        },
      ],
    );

    // Tramoe todos los juegos existentes
    const juegos: JuegoRow[] = await this.robleService.read<JuegoRow>(
      accessToken,
      'Juego',
      undefined,
    );

    if (!juegos || juegos.length === 0) {
      // No hay juegos todavía entonce solo creamos perfil y salimos
      return;
    }

    // Creamos stats iniciales para cada juego
    const statsRecords: Array<Omit<EstadisticasJuegoUsuarioRow, '_id'>> =
      juegos.map((juego) => {
        return {
          usuarioId: userId,
          juegoId: juego._id,
          elo: 1000,
          partidasJugadas: 0,
          victorias: 0,
          derrotas: 0,
          empates: 0,
          ligaId: null,
        };
      });

    await this.robleService.insert<Omit<EstadisticasJuegoUsuarioRow, '_id'>>(
      accessToken,
      'EstadisticasJuegoUsuario',
      statsRecords,
    );
  }
}
