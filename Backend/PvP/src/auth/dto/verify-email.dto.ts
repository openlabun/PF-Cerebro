import { IsEmail, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({
    example: 'usario@correo.com',
    description: 'Correo electrónico del usuario registrado previamente',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: '123456',
    description:
      'Código de verificación enviado al correo electrónico del usuario',
  })
  @IsString()
  code!: string;
}
