import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'usuario@uninorte.edu.co',
  })
  email!: string;

  @ApiProperty({
    example: '12345678Aa!',
  })
  password!: string;
}
