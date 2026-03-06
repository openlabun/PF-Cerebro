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

  @ApiProperty({ enum: ['victoria', 'derrota', 'empate'] })
  @IsString()
  @IsIn(['victoria', 'derrota', 'empate'])
  resultado!: string;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  cambioElo!: number;
}