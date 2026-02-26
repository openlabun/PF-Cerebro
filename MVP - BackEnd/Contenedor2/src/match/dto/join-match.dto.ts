import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class JoinMatchDto {
  @ApiProperty({
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    description: 'Token de Contenedor1 (cerebro_db) para validar participacion en el torneo',
  })
  @IsString()
  tokenC1: string;
}