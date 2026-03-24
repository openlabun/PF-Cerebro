import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'reset-token-recibido-por-correo',
    description: 'Token de recuperacion enviado por email',
  })
  @IsString({ message: 'El token debe ser texto' })
  @IsNotEmpty({ message: 'El token es obligatorio' })
  token!: string;

  @ApiProperty({
    example: 'NuevaClave123!',
    description:
      'Nueva contrasena con minimo 8 caracteres, una mayuscula, una minuscula, un numero y un simbolo permitido',
  })
  @IsString({ message: 'La nueva contrasena debe ser texto' })
  @IsNotEmpty({ message: 'La nueva contrasena es obligatoria' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$_-])[A-Za-z\d!@#$_-]{8,}$/, {
    message:
      'La nueva contrasena debe tener minimo 8 caracteres, una mayuscula, una minuscula, un numero y un simbolo permitido (!, @, #, $, _, -)',
  })
  newPassword!: string;
}
