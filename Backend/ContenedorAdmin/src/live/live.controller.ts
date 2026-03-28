import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AdminRoleGuard } from '../common/guards/admin-role.guard';
import {
  RobleAuthGuard,
  type RobleRequest,
} from '../common/guards/roble-auth.guard';
import { LiveHeartbeatDto } from './dto/live-heartbeat.dto';
import { LiveService } from './live.service';

@ApiTags('admin-live')
@ApiBearerAuth('access-token')
@Controller('api/admin/live')
@UseGuards(RobleAuthGuard)
export class LiveController {
  constructor(private readonly liveService: LiveService) {}

  @Post('heartbeat')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Registrar heartbeat de actividad en vivo desde la app principal',
  })
  recordHeartbeat(
    @Req() req: RobleRequest,
    @Body() heartbeat: LiveHeartbeatDto,
  ) {
    return this.liveService.recordHeartbeat(req.robleUser, heartbeat);
  }

  @Get('snapshot')
  @UseGuards(AdminRoleGuard)
  @ApiOperation({ summary: 'Snapshot en vivo para dashboard admin' })
  getSnapshot() {
    return this.liveService.getSnapshot();
  }

  @Get('stream')
  @UseGuards(AdminRoleGuard)
  @ApiOperation({ summary: 'Stream en vivo para dashboard admin' })
  stream(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const sendEvent = (event: string, payload: unknown) => {
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    sendEvent('snapshot', this.liveService.getSnapshot());

    const unsubscribe = this.liveService.subscribe((snapshot) => {
      sendEvent('snapshot', snapshot);
    });

    const keepAlive = setInterval(() => {
      sendEvent('ping', { timestamp: new Date().toISOString() });
    }, 20_000);

    keepAlive.unref?.();

    res.on('close', () => {
      clearInterval(keepAlive);
      unsubscribe();
      res.end();
    });
  }
}
