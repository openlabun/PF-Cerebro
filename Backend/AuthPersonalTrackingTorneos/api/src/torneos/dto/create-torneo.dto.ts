import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsObject,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTorneoDto {
  @ApiProperty({
    example: 'Torneo de Sudoku',
    description: 'Nombre visible del torneo',
  })
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @ApiProperty({
    example: 'Competencia de sudoku mensual',
    description: 'Descripción del torneo',
  })
  @IsString()
  @IsNotEmpty()
  descripcion!: string;

  @ApiProperty({
    example: 'true',
    description: 'Indica si el torneo es público (true) o privado (false)',
  })
  @IsBoolean()
  esPublico!: boolean;

  @IsOptional()
  @IsString()
  codigoAcceso?: string;

  @ApiProperty({
    example: 'SERIE',
    description: 'Tipo unico de torneo soportado actualmente: SERIE',
  })
  @IsString()
  tipo!: string;

  @ApiProperty({
    example: '2026-03-01T00:00:00.000Z',
    description: 'Fecha y hora de inicio en formato ISO',
  })
  @IsDateString()
  fechaInicio!: string;

  @ApiProperty({
    example: '2026-03-31T23:59:59.000Z',
    description: 'Fecha y hora de finalización en formato ISO',
  })
  @IsString()
  @IsDateString()
  fechaFin!: string;

  @ApiProperty({
    example: 'NINGUNA',
    description:
      'Tipo de recurrencia (NINGUNA | DIARIA | SEMANAL | MENSUAL). Si no pone nada por defecto la recurrencia sera NINGUNA',
  })
  @IsOptional()
  @IsString()
  recurrencia?: string;

  @IsOptional()
  @IsObject()
  @ApiProperty({
    example: {
      duracionMaximaMin: 20,
      dificultad: 'Intermedio',
      numeroTableros: 3,
    },
    description:
      'Configuracion de la serie Sudoku. Debe incluir duracionMaximaMin, dificultad y numeroTableros.',
    required: false,
  })
  configuracion?: Record<string, unknown>;
}
