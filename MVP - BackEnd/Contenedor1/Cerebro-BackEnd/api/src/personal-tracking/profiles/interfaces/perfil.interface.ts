// src/personalTracking/profiles/interfaces/perfil.interface.ts
export interface Perfil {
  _id?: string;
  usuarioId: string; // authExternoId de la cookie
  nivel: number;
  experiencia: number;
  rachaActual: number;
  rachaMaxima: number;
  salvadoresRacha: number;
  tituloActivo?: string | null;
}
