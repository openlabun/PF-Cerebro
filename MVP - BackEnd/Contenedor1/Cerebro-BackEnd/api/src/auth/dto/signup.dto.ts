import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({
    example: 'usuario@uninorte.edu.co',
    description: 'Correo institucional',
  })
  email!: string;

  @ApiProperty({
    example: '12345678Aa!',
    description:
      'Contraseña con al menos 8 caracteres, una mayuscula, una minúscula, un número y un símbolo',
  })
  password!: string;

  @ApiProperty({
    example: 'Juan Pérez',
    description: 'Nombre completo',
  })
  name!: string;
}
