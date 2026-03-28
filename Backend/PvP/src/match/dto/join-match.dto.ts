import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class JoinMatchDto {
  @ApiPropertyOptional({
    example: '9e894ca1883d7d892797e52b',
    description:
      'Token de invitacion requerido para unirse a partidas PvP independientes.',
  })
  @IsOptional()
  @IsString()
  inviteToken?: string;

  @ApiPropertyOptional({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description:
      'Token de Contenedor1 (cerebro_db) para validar participacion en el torneo cuando el match pertenece a un torneo.',
  })
  @IsOptional()
  @IsString()
  tokenC1?: string;

  @ApiPropertyOptional({
    example: 'Maria',
    description:
      'Nombre visible del jugador para mostrar el ganador en la interfaz PvP.',
  })
  @IsOptional()
  @IsString()
  displayName?: string;
}
