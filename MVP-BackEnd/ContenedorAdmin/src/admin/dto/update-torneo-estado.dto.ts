import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateTorneoEstadoDto {
  @ApiProperty({ example: 'ACTIVO' })
  @IsString()
  estado!: string;

  @ApiProperty({
    example: 'Actualizado desde modulo admin',
    required: false,
  })
  @IsOptional()
  @IsString()
  razon?: string;
}
