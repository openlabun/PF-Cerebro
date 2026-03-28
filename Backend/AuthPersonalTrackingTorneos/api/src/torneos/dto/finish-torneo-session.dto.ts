import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, Min } from 'class-validator';

export class FinishTorneoSessionDto {
  @ApiProperty({
    example: [
      [
        [5, 3, 4, 6, 7, 8, 9, 1, 2],
        [6, 7, 2, 1, 9, 5, 3, 4, 8],
      ],
      [
        [8, 2, 7, 1, 5, 4, 3, 9, 6],
        [9, 6, 5, 3, 2, 7, 1, 4, 8],
      ],
    ],
    description:
      'Estado final de cada tablero Sudoku de la serie, en el mismo orden entregado al iniciar la sesion.',
    type: [Array],
    required: false,
  })
  @IsArray()
  boards?: unknown[][][];

  @ApiProperty({
    example: [
      [5, 3, 4, 6, 7, 8, 9, 1, 2],
      [6, 7, 2, 1, 9, 5, 3, 4, 8],
    ],
    description:
      'Compatibilidad legado para torneos antiguos de un solo tablero.',
    type: [Array],
    required: false,
  })
  @IsOptional()
  @IsArray()
  board?: unknown[][];

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
    description:
      'Cantidad de pistas consumidas en la partida. En el modo actual debe ser 0.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  hintsUsed?: number;
}
