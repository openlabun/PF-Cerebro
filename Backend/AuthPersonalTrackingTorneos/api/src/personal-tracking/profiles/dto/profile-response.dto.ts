import { ApiProperty } from '@nestjs/swagger';

export class ProfileResponseDto {
  @ApiProperty({ example: '8d958f97-e962-4808-958a-7414c953fb2a' })
  usuarioId!: string;

  @ApiProperty({ example: 5 })
  nivel!: number;

  @ApiProperty({ example: 1200 })
  experiencia!: number;

  @ApiProperty({ example: 10 })
  rachaActual!: number;

  @ApiProperty({ example: 20 })
  rachaMaxima!: number;

  @ApiProperty({ example: 2 })
  salvadoresRacha!: number;

  @ApiProperty({ example: 'titulo-uuid' })
  tituloActivo!: string;
}
