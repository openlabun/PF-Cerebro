import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import * as robleAuthGuard from '../../common/guards/roble-auth.guard';
import { GameStatsService } from './game-stats.service';
import { UpdateGameStatsDto } from './dto/update-game-stats.dto';

class GetStatsDto {
  juegoId!: string;
}

@ApiTags('PersonalTracking - GameStats')
@ApiBearerAuth()
@UseGuards(robleAuthGuard.RobleAuthGuard)
@Controller('game-stats')
export class GameStatsController {
  constructor(private readonly gameStatsService: GameStatsService) {}

  @Get('summary')
  async summary(
    @Query('juegoId') juegoId: string = 'sudoku',
    @Req() req: robleAuthGuard.RobleRequest,
  ) {
    const accessToken = req.accessToken;
    const totalPartidasJugadas =
      await this.gameStatsService.getTotalPlayedByGame(juegoId, accessToken);

    return {
      juegoId,
      totalPartidasJugadas,
      source: 'EstadisticasJuegoUsuario',
    };
  }

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

  @Patch('me')
  async updateMyStats(
    @Body() body: UpdateGameStatsDto,
    @Req() req: robleAuthGuard.RobleRequest,
  ) {
    const usuarioId = String(req.robleUser.sub);
    const accessToken = req.accessToken;

    return this.gameStatsService.recordCompletedMatch(
      usuarioId,
      body,
      accessToken,
    );
  }
}
