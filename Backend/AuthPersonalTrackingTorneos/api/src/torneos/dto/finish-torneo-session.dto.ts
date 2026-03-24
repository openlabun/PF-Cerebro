import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, Min } from 'class-validator';

export class FinishTorneoSessionDto {
  @ApiProperty({
    example: [
      [5, 3, 4, 6, 7, 8, 9, 1, 2],
      [6, 7, 2, 1, 9, 5, 3, 4, 8],
    ],
    description: 'Estado final del tablero Sudoku 9x9.',
    type: [Array],
  })
  @IsArray()
  board!: unknown[][];

  @ApiProperty({
    example: 2,
    required: false,
    description: 'Cantidad de errores cometidos durante la partida.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  errorCount?: number;

  @ApiProperty({
    example: 1,
    required: false,
    description: 'Cantidad de pistas consumidas en la partida.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  hintsUsed?: number;
}
