import { ApiProperty } from '@nestjs/swagger';

export class AddExperienceDto {
  @ApiProperty({ description: 'ID del usuario', example: '12345' })
  usuarioId!: string;

  @ApiProperty({ description: 'Cantidad de experiencia a sumar', example: 50 })
  experiencia!: number;
}
