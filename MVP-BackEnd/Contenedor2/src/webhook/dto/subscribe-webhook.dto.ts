import { IsUrl, IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubscribeWebhookDto {
  @ApiProperty({
    example: 'https://mi-frontend.com/webhook',
    description: 'URL donde se enviarán los eventos',
  })
  @IsUrl()
  url: string;

  @ApiProperty({
    example: [
      'match.started',
      'player.finished',
      'match.finished',
      'player.forfeit',
      'match.forfeit',
    ],
    description: 'Lista de eventos a los que se suscribe',
  })
  @IsArray()
  @IsString({ each: true })
  eventos: string[];
}
