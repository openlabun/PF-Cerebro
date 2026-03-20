// src/personalTracking/profiles/dto/perfil.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class PerfilDto {
  @ApiProperty()
  usuarioId!: string;

  @ApiProperty()
  nivel!: number;

  @ApiProperty()
  experiencia!: number;

  @ApiProperty()
  rachaActual!: number;

  @ApiProperty()
  rachaMaxima!: number;

  @ApiProperty()
  salvadoresRacha!: number;

  @ApiProperty({ nullable: true })
  tituloActivo?: string;
}
