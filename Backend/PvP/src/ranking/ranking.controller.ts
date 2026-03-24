import { Controller, Get, Req, UseGuards, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RobleAuthGuard } from '../common/guards/roble-auth.guard';
import type { RobleRequest } from '../common/types/roble-request';
import { getUserIdFromAccessToken } from '../common/utils/jwt.utils';
import { RankingService } from './ranking.service';

@ApiTags('Ranking PvP')
@ApiBearerAuth('access-token')
@UseGuards(RobleAuthGuard)
@Controller('pvp/ranking')
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Get()
  async getTop20(@Req() req: RobleRequest) {
    return this.rankingService.getTop20(req.accessToken);
  }

  @Get('me')
  async getMyRanking(@Req() req: RobleRequest) {
    const usuarioId = getUserIdFromAccessToken(req.accessToken);
    if (!usuarioId) throw new UnauthorizedException('No se pudo obtener el ID del usuario');
    return this.rankingService.getMyRanking(usuarioId, req.accessToken);
  }
}
