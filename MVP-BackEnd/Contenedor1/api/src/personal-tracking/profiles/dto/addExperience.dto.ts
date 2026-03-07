import { ApiProperty} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsString } from 'class-validator';

export class AddExperienceDto {
  @ApiProperty({ description: 'ID del usuario', example: '12345' })
  @Type(() => String)
  usuarioId!: string;

  @ApiProperty({ description: 'Cantidad de experiencia a sumar', example: 50 })
  @Type(() => Number)
  experiencia!: number;
}
