import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class SudokuCellCoordDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(8)
  row!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(8)
  col!: number;
}

export class UpsertSudokuProgressDto {
  @ApiProperty()
  @IsString()
  difficultyKey!: string;

  @ApiProperty()
  @IsString()
  difficultyLabel!: string;

  @ApiProperty({ description: 'Estado actual del tablero 9x9.' })
  @IsArray()
  board!: number[][];

  @ApiProperty({ description: 'Tablero base del rompecabezas (celdas fijas).' })
  @IsArray()
  puzzle!: number[][];

  @ApiProperty({ description: 'Solucion completa del tablero 9x9.' })
  @IsArray()
  solution!: number[][];

  @ApiProperty({ description: 'Notas actuales por celda.' })
  @IsArray()
  notes!: number[][][];

  @ApiProperty({ required: false, type: SudokuCellCoordDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => SudokuCellCoordDto)
  selectedCell?: SudokuCellCoordDto | null;

  @ApiProperty()
  @IsBoolean()
  noteMode!: boolean;

  @ApiProperty()
  @IsBoolean()
  highlightEnabled!: boolean;

  @ApiProperty()
  @IsBoolean()
  paused!: boolean;

  @ApiProperty()
  @IsBoolean()
  completed!: boolean;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  seconds!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  errorCount!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  hintsUsed!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  hintsRemaining!: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  hintLimit!: number;

  @ApiProperty({ required: false })
  @IsOptional()
  seed?: number | string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  seedId?: string | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  statusMessage?: string;

  @ApiProperty({ required: false, type: Object })
  @IsOptional()
  @IsObject()
  extra?: Record<string, unknown>;
}
