// src/personalTracking/profiles/interfaces/perfil.interface.ts
export interface Perfil {
  _id?: string;
  usuarioId: string; // authExternoId de la cookie
  nombre?: string;
  correo?: string;
  nivel: number;
  experiencia: number;
  rachaActual: number;
  rachaMaxima: number;
  salvadoresRacha: number;
  tituloActivo?: string | null;
  tituloActivoTexto?: string | null; // Campo adicional para el texto del título activo
  marco?: string | null; // Campo para el marco seleccionado
}
