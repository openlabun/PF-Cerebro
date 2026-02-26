import { ApiProperty } from '@nestjs/swagger';

export class CreateGameSessionDto {
  @ApiProperty()
  usuarioId!: string;

  @ApiProperty()
  juegoId!: string;

  @ApiProperty()
  puntaje!: number;

  @ApiProperty()
  resultado!: string; // victoria | derrota | empate

  @ApiProperty()
  cambioElo!: number;
}
