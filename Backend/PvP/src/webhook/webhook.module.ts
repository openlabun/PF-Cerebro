import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { RobleModule } from '../roble/roble.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [HttpModule, RobleModule, AuthModule],
  controllers: [WebhookController],
  providers: [WebhookService],
  exports: [WebhookService],
})
export class WebhookModule {}
