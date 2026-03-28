import { IsIn, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

const PVP_DIFFICULTY_KEYS = [
  'muy-facil',
  'facil',
  'medio',
  'dificil',
  'experto',
  'maestro',
] as const;

export class CreateMatchDto {
  @ApiPropertyOptional({
    example: 'abc123',
    description: 'ID del torneo PVP en Contenedor1. Opcional para partidas PvP independientes.',
  })
  @IsOptional()
  @IsString()
  torneoId?: string;

  @ApiPropertyOptional({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description:
      'Token de Contenedor1 (cerebro_db) para validar torneo y participantes cuando el match pertenece a un torneo.',
  })
  @IsOptional()
  @IsString()
  tokenC1?: string;

  @ApiPropertyOptional({
    example: 'medio',
    description:
      'Dificultad deseada para el tablero PvP. Usa las mismas claves del modo single player.',
    enum: PVP_DIFFICULTY_KEYS,
  })
  @IsOptional()
  @IsString()
  @IsIn(PVP_DIFFICULTY_KEYS)
  difficultyKey?: string;

  @ApiPropertyOptional({
    example: 'Jose',
    description:
      'Nombre visible del jugador para mostrar el ganador en la interfaz PvP.',
  })
  @IsOptional()
  @IsString()
  displayName?: string;
}
