import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class CloseSudokuProgressDto {
  @ApiProperty({ enum: ['completada', 'descartada'] })
  @IsString()
  @IsIn(['completada', 'descartada'])
  estado!: 'completada' | 'descartada';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  motivo?: string;
}
