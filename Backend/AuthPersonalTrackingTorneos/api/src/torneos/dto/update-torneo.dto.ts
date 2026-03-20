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
  tipo?: string; // puntos | tiempo | pvp (si quieres validarlo con enum luego)

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
  configuracion?: Record<string, unknown>;
}
