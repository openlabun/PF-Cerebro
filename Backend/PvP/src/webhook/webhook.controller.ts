import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RobleAuthGuard } from '../common/guards/roble-auth.guard';
import type { RobleRequest } from '../common/types/roble-request';
import { getUserIdFromAccessToken } from '../common/utils/jwt.utils';
import { WebhookService } from './webhook.service';
import { SubscribeWebhookDto } from './dto/subscribe-webhook.dto';

@ApiTags('Webhooks')
@ApiBearerAuth('access-token')
@UseGuards(RobleAuthGuard)
@Controller('webhook')
export class WebhookController {
  constructor(private readonly webhookService: WebhookService) {}

  private extractUserId(token: string): string {
    const id = getUserIdFromAccessToken(token);
    if (!id) throw new UnauthorizedException('No se pudo obtener el ID del usuario');
    return id;
  }

  @Post('subscribe')
  async subscribe(@Req() req: RobleRequest, @Body() dto: SubscribeWebhookDto) {
    const usuarioId = this.extractUserId(req.accessToken);
    return this.webhookService.subscribe(usuarioId, dto.url, dto.eventos, req.accessToken);
  }

  @Delete('subscribe/:id')
  async unsubscribe(@Req() req: RobleRequest, @Param('id') id: string) {
    const usuarioId = this.extractUserId(req.accessToken);
    return this.webhookService.unsubscribe(id, usuarioId, req.accessToken);
  }

  @Get('subscriptions')
  async getSubscriptions(@Req() req: RobleRequest) {
    const usuarioId = this.extractUserId(req.accessToken);
    return this.webhookService.getMisSuscripciones(usuarioId, req.accessToken);
  }
}
