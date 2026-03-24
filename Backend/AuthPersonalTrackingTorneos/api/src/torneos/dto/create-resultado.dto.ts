import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateResultadoDto {
  @ApiProperty({
    description: 'Puntaje obtenido por el participante en el torneo',
    example: 800,
  })
  @IsInt()
  @Min(0)
  puntaje!: number;

  @ApiProperty({
    description:
      'Tiempo en segundos que tomó el participante para completar el torneo',
    example: 650,
  })
  @IsInt()
  @Min(0)
  tiempo!: number;
}
