// src/personalTracking/achievements/dto/update-achievement.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class UpdateAchievementDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ required: false })
  nombre?: string;

  @ApiProperty({ required: false })
  descripcion?: string;

  @ApiProperty({ required: false })
  puntos?: number;

  @ApiProperty({ required: false })
  icono?: string;

  @ApiProperty({ required: false })
  esSecreto?: boolean;
}
