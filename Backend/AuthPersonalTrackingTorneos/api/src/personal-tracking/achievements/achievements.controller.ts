import { Controller, Get, Post, Req, Body, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import * as robleAuthGuard from '../../common/guards/roble-auth.guard';
import { AchievementsService } from './achievements.service';

class UnlockDto {
  logroId!: string;
}

@ApiTags('PersonalTracking - Achievements')
@ApiBearerAuth()
@UseGuards(robleAuthGuard.RobleAuthGuard)
@Controller('achievements')
export class AchievementsController {
  constructor(private readonly service: AchievementsService) {}

  @Get()
  async all(@Req() req: robleAuthGuard.RobleRequest) {
    return this.service.getAllAchievements(req.accessToken);
  }

  @Get('me')
  async my(@Req() req: robleAuthGuard.RobleRequest) {
    const usuarioId = String(req.robleUser.sub);
    return this.service.getUserAchievements(usuarioId, req.accessToken);
  }

  @Post('unlock')
  async unlock(
    @Body() dto: UnlockDto,
    @Req() req: robleAuthGuard.RobleRequest,
  ) {
    const usuarioId = String(req.robleUser.sub);

    return this.service.unlockAchievement(
      usuarioId,
      dto.logroId,
      req.accessToken,
    );
  }
}
