// src/personalTracking/profiles/dto/perfil.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class UsuarioIdDto {
  @ApiProperty()
  usuarioId!: string;
}
