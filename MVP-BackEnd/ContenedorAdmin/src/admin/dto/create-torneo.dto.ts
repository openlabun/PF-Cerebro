import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateTorneoDto {
  @ApiProperty({ example: 'Copa Mente Rapida' })
  @IsString()
  @IsNotEmpty()
  nombre!: string;

  @ApiProperty({ example: 'Torneo semanal de Sudoku contrarreloj' })
  @IsString()
  @IsNotEmpty()
  descripcion!: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  esPublico!: boolean;

  @ApiProperty({ example: 'PUNTOS' })
  @IsString()
  @IsNotEmpty()
  tipo!: string;

  @ApiProperty({ example: '2026-03-10T14:00:00.000Z' })
  @IsDateString()
  fechaInicio!: string;

  @ApiProperty({ example: '2026-03-11T14:00:00.000Z' })
  @IsDateString()
  fechaFin!: string;

  @ApiProperty({ example: 'NINGUNA', required: false })
  @IsOptional()
  @IsString()
  recurrencia?: string;

  @ApiProperty({ example: { dificultad: 'Intermedio' }, required: false })
  @IsOptional()
  @IsObject()
  configuracion?: Record<string, unknown>;
}
