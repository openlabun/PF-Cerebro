import { ApiProperty } from '@nestjs/swagger';

export class AchievementIdDto {
  @ApiProperty()
  id!: string;
}
