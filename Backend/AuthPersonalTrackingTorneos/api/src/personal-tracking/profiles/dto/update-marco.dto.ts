import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateMarcoDto {
  @ApiProperty({ description: 'Nuevo marco seleccionado', nullable: true })
  @IsOptional()
  @IsString()
  marco?: string | null;
}
