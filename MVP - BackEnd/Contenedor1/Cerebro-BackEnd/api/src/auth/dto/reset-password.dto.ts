import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'reset-token-recibido-por-correo',
    description: 'Token de recuperación enviado por email',
  })
  token!: string;

  @ApiProperty({
    example: 'ContraseñaNueva123',
    description: 'Nueva contraseña segura',
  })
  newPassword!: string;
}
