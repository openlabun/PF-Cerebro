export class CreateProfileDto {
  nombre?: string; // opcional, default desde usuario autenticado
  correo?: string; // opcional, default desde usuario autenticado
  nivel?: number; // opcional, default 1
  experiencia?: number; // opcional, default 0
  rachaActual?: number; // opcional, default 0
  rachaMaxima?: number; // opcional, default 0
  salvadoresRacha?: number; // opcional, default 0
  tituloActivo?: string | null; // opcional
  marco?: string | null; // opcional
}
