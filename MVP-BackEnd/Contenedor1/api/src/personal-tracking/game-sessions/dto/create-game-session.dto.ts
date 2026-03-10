import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateGameSessionDto {

  @ApiProperty()
  @IsString()
  juegoId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  puntaje!: number;

  @ApiProperty({ enum: ['victoria', 'derrota', 'empate','singlePlayer'] })
  @IsString()
  @IsIn(['victoria', 'derrota', 'empate', 'singlePlayer'])
  resultado!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  cambioElo?: number;

  @ApiProperty({
    required: false,
    description: 'Tiempo usado para completar la sesion (en segundos)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  tiempo?: number;

  @ApiProperty({ required: false, description: 'Seed usada en la sesion' })
  @IsOptional()
  seed?: string | number;

  @ApiProperty({
    required: false,
    description: 'ID de la seed en la tabla seedsSudoku',
  })
  @IsOptional()
  @IsString()
  seedId?: string;

  @ApiProperty({
    required: false,
    description: 'Dificultad visible usada para calcular XP y Elo',
  })
  @IsOptional()
  @IsString()
  dificultad?: string;
}
