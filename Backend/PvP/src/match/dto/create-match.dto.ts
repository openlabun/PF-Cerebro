import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMatchDto {
  @ApiProperty({
    example: 'abc123',
    description: 'ID del torneo PVP en Contenedor1',
  })
  @IsString()
  torneoId: string;

  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Token de Contenedor1 (cerebro_db) para validar torneo y participantes',
  })
  @IsString()
  tokenC1: string;
}