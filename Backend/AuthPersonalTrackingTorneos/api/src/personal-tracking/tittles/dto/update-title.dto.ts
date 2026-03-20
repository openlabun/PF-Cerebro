import { ApiProperty } from '@nestjs/swagger';

export class UpdateTitleDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ required: false })
  nombre?: string;

  @ApiProperty({ required: false })
  descripcion?: string;

  @ApiProperty({ example: 'epico' })
  rareza!: string;

  @ApiProperty({ required: false })
  iconoUrl?: string | null;
}
