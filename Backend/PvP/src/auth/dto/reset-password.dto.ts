import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'reset-token-recibido-por-correo',
    description: 'Token de recuperación enviado por email',
  })
  @IsString()
  token!: string;

  @ApiProperty({
    example: 'ContraseñaNueva123',
    description: 'Nueva contraseña segura',
  })
  @IsString()
  @MinLength(6)
  newPassword!: string;
}
