import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UnirseTorneoDto {
  @ApiProperty({
    description:
      'Código de acceso para unirse al torneo (Solo en caso de torneos privados)',
    example: 'ABC123',
  })
  @IsOptional()
  @IsString()
  codigoAcceso?: string;
}
