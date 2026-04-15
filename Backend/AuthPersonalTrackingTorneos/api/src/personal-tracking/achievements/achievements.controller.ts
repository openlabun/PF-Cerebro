import { Controller, Get, Post, Req, Body, UseGuards, Logger } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';
import * as robleAuthGuard from '../../common/guards/roble-auth.guard';
import { AchievementsService } from './achievements.service';

class UnlockDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => String(value ?? '').trim())
  logroId!: string;
}

@ApiTags('PersonalTracking - Achievements')
@ApiBearerAuth()
@UseGuards(robleAuthGuard.RobleAuthGuard)
@Controller('achievements')
export class AchievementsController {
  private readonly logger = new Logger(AchievementsController.name);

  constructor(private readonly service: AchievementsService) {}

  @Get()
  async all(@Req() req: robleAuthGuard.RobleRequest) {
    this.logger.log('GET /achievements llamado');
    return this.service.getAllAchievements(req.accessToken);
  }

  @Get('me')
  async my(@Req() req: robleAuthGuard.RobleRequest) {
    const usuarioId = String(req.robleUser.sub);
    this.logger.log(`GET /achievements/me llamado. usuarioId=${usuarioId}`);
    return this.service.getUserAchievements(usuarioId, req.accessToken);
  }

  @Post('unlock')
  async unlock(
    @Body() dto: UnlockDto,
    @Req() req: robleAuthGuard.RobleRequest,
  ) {
    const usuarioId = String(req.robleUser.sub);
    const logroId = String(dto?.logroId ?? '').trim();
    this.logger.log(
      `POST /achievements/unlock llamado. usuarioId=${usuarioId} logroId=${logroId || '(vacio)'}`,
    );

    return this.service.unlockAchievement(
      usuarioId,
      logroId,
      req.accessToken,
    );
  }
}
