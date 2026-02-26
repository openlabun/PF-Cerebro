import { ApiProperty } from '@nestjs/swagger';

export class CreateTitleDto {
  @ApiProperty()
  nombre!: string;

  @ApiProperty()
  descripcion!: string;

  @ApiProperty({ example: 'epico' })
  rareza!: string;

  @ApiProperty({ required: false })
  iconoUrl?: string;
}
