import { ApiProperty } from '@nestjs/swagger';

export class TitleIdDto {
  @ApiProperty()
  id!: string;
}
