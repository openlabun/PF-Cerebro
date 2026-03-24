import { ApiProperty } from '@nestjs/swagger';

export class CreateGameStatDto {
  @ApiProperty()
  usuarioId!: string;

  @ApiProperty()
  juegoId!: string;

  @ApiProperty({ default: 1000 })
  elo?: number;
}
