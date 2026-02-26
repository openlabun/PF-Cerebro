import { ApiProperty } from '@nestjs/swagger';

export class UsuarioLogro {
  @ApiProperty()
  usuarioId!: string;

  @ApiProperty()
  logroId!: string;
}
