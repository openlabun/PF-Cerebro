import { IsEnum } from 'class-validator';
import { EstadoTorneo } from '../enums/estado-torneo.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEstadoTorneoDto {
  @ApiPropertyOptional({
    example: 'PROGRAMADO',
    description:
      'Estado del torneo ( PROGRAMADO | ACTIVO | INACTIVO | FINALIZADO )',
  })
  @IsEnum(EstadoTorneo)
  estado!: EstadoTorneo;
}
