import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsString } from 'class-validator';

export class CreateGameSessionDto {

  @ApiProperty()
  @IsString()
  juegoId!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  puntaje!: number;

  @ApiProperty({ enum: ['victoria', 'derrota', 'empate','singlePlayer'] })
  @IsString()
  @IsIn(['victoria', 'derrota', 'empate', 'singlePlayer'])
  resultado!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  cambioElo!: number;
}