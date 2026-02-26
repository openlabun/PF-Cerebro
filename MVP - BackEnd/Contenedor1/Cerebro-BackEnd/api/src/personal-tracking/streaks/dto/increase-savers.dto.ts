import { ApiProperty } from '@nestjs/swagger';

export class IncreaseSaversDto {
  @ApiProperty()
  usuarioId!: string;

  @ApiProperty()
  cantidad!: number;
}
