export class CreateProfileDto {
  nivel?: number; // opcional, default 1
  experiencia?: number; // opcional, default 0
  rachaActual?: number; // opcional, default 0
  rachaMaxima?: number; // opcional, default 0
  salvadoresRacha?: number; // opcional, default 0
  tituloActivo?: string | null; // opcional
}
