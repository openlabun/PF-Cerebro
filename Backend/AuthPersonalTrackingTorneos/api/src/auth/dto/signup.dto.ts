import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class SignupDto {
  @ApiProperty({
    example: 'usuario@uninorte.edu.co',
    description: 'Correo institucional',
  })
  @IsEmail({}, { message: 'El correo no es valido' })
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  email!: string;

  @ApiProperty({
    example: '12345678Aa!',
    description:
      'Contrasena con al menos 8 caracteres, una mayuscula, una minuscula, un numero y un simbolo',
  })
  @IsString({ message: 'La contrasena debe ser texto' })
  @IsNotEmpty({ message: 'La contrasena es obligatoria' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$_.-])[A-Za-z\d!@#$_.-]{8,}$/, {
    message:
      'La contrasena debe tener minimo 8 caracteres, una mayuscula, una minuscula, un numero y un simbolo permitido (!, @, #, $, _, -, .)',
  })
  password!: string;

  @ApiProperty({
    example: 'Juan Perez',
    description: 'Nombre completo',
  })
  @IsString({ message: 'El nombre debe ser texto' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  name!: string;
}
