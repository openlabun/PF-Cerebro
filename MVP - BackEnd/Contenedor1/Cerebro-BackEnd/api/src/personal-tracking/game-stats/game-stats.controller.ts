import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import * as robleAuthGuard from '../../common/guards/roble-auth.guard';
import { GameStatsService } from './game-stats.service';

class GetStatsDto {
  juegoId!: string;
}

@ApiTags('PersonalTracking - GameStats')
@ApiBearerAuth()
@UseGuards(robleAuthGuard.RobleAuthGuard)
@Controller('game-stats')
export class GameStatsController {
  constructor(private readonly gameStatsService: GameStatsService) {}

  @Post('me')
  async myStats(
    @Body() body: GetStatsDto,
    @Req() req: robleAuthGuard.RobleRequest,
  ) {
    const usuarioId = String(req.robleUser.sub);
    const accessToken = req.accessToken;

    return this.gameStatsService.createIfNotExists(
      usuarioId,
      body.juegoId,
      accessToken,
    );
  }
}
