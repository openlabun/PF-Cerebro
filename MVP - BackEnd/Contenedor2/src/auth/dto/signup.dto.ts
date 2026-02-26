import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({
    example: 'usuario@uninorte.edu.co',
    description: 'Correo institucional',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: '12345678Aa!',
    description:
      'Contraseña con al menos 8 caracteres, una mayuscula, una minúscula, un número y un símbolo',
  })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({
    example: 'Juan Pérez',
    description: 'Nombre completo',
  })
  @IsString()
  name!: string;
}
