import { ApiProperty } from '@nestjs/swagger';

export class StreakActionDto {
  @ApiProperty()
  usuarioId!: string;
}
