import { IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MakeMoveDto {
  @ApiProperty({ example: 2, description: 'Fila (0-8)' })
  @IsInt()
  @Min(0)
  @Max(8)
  row: number;

  @ApiProperty({ example: 5, description: 'Columna (0-8)' })
  @IsInt()
  @Min(0)
  @Max(8)
  col: number;

  @ApiProperty({ example: 7, description: 'Valor (1-9)' })
  @IsInt()
  @Min(1)
  @Max(9)
  value: number;
}
