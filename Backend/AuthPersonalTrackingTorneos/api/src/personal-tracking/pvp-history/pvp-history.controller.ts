import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import * as robleAuthGuard from '../../common/guards/roble-auth.guard';
import { PvpHistoryService } from './pvp-history.service';
import { SyncPvpHistoryDto } from './dto/sync-pvp-history.dto';

@ApiTags('PersonalTracking - PvPHistory')
@ApiBearerAuth()
@UseGuards(robleAuthGuard.RobleAuthGuard)
@Controller('pvp-history')
export class PvpHistoryController {
  constructor(private readonly service: PvpHistoryService) {}

  @Post('sync')
  async sync(
    @Body() dto: SyncPvpHistoryDto,
    @Req() req: robleAuthGuard.RobleRequest,
  ) {
    return this.service.syncSnapshot(dto, req.accessToken);
  }
}
