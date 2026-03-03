import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({
    example: 'usuario@correo.com',
    description: 'Correo electronico asociado a la cuenta',
  })
  @IsEmail({}, { message: 'El correo no es valido' })
  @IsNotEmpty({ message: 'El correo es obligatorio' })
  email!: string;
}
