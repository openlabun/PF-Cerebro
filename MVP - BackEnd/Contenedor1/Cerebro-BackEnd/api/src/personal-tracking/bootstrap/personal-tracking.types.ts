export interface PerfilRow {
  _id: string;
  usuarioId: string;
  nivel: number;
  experiencia: number;
  rachaActual: number;
  rachaMaxima: number;
  salvadoresRacha: number;
  tituloActivo?: string | null;
}

export interface JuegoRow {
  _id: string;
  nombre: string;
  descripcion?: string | null;
  esRankeado?: boolean | null;
}

export interface EstadisticasJuegoUsuarioRow {
  _id: string;
  usuarioId: string;
  juegoId: string; // FK a Juego._id
  elo: number;
  partidasJugadas: number;
  victorias: number;
  derrotas: number;
  empates: number;
  ligaId: string | null;
}
