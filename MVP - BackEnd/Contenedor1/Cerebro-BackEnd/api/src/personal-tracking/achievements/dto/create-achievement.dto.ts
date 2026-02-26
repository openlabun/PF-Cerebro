import { ApiProperty } from '@nestjs/swagger';

export class CreateAchievementDto {
  @ApiProperty()
  nombre!: string;

  @ApiProperty()
  descripcion!: string;

  @ApiProperty()
  puntos!: number;

  @ApiProperty({ required: false })
  icono?: string;

  @ApiProperty({ default: true })
  esSecreto!: boolean;
}
