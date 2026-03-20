import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class PatchEstadoTorneoDto {
  @ApiProperty({
    description:
      'BORRADOR | PROGRAMADO | ACTIVO | PAUSADO | FINALIZADO | CANCELADO',
  })
  @IsString()
  estado!: string;
}
