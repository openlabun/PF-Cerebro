import { IsBoolean, IsISO8601, IsOptional, IsString } from 'class-validator';

export class UpdateTorneoDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  esPublico?: boolean;

  @IsOptional()
  @IsString()
  tipo?: string; // Actualmente se normaliza al tipo unico SERIE.

  @IsOptional()
  @IsISO8601()
  fechaInicio?: string;

  @IsOptional()
  @IsISO8601()
  fechaFin?: string;

  @IsOptional()
  @IsString()
  recurrencia?: string; // NINGUNA | SEMANAL | MENSUAL

  @IsOptional()
  // Configuracion vigente: duracionMaximaMin, dificultad y numeroTableros.
  configuracion?: Record<string, unknown>;
}
