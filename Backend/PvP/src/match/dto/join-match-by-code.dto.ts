import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class JoinMatchByCodeDto {
  @ApiProperty({
    example: '48217',
    description:
      'Codigo corto generado por el host para unirse a una partida PvP independiente.',
  })
  @IsString()
  joinCode!: string;

  @ApiPropertyOptional({
    example: 'Maria',
    description:
      'Nombre visible del jugador para mostrar el ganador en la interfaz PvP.',
  })
  @IsOptional()
  @IsString()
  displayName?: string;
}
