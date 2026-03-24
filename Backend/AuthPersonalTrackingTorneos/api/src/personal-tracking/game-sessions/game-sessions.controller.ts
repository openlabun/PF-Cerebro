import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import * as robleAuthGuard from '../../common/guards/roble-auth.guard';
import { GameSessionsService } from './game-sessions.service';
import { CreateGameSessionDto } from './dto/create-game-session.dto';

@ApiTags('PersonalTracking - GameSessions')
@ApiBearerAuth()
@UseGuards(robleAuthGuard.RobleAuthGuard)
@Controller('game-sessions')
export class GameSessionsController {
  constructor(private readonly service: GameSessionsService) {}

  @Get('sudoku-seed')
  async getSudokuSeed(
    @Query('dificultad') dificultad: string,
    @Req() req: robleAuthGuard.RobleRequest,
  ) {
    const accessToken = req.accessToken;
    return this.service.getRandomSudokuSeedByDifficulty(
      dificultad,
      accessToken,
    );
  }

  @Get('latest')
  async getLatestSession(
    @Query('juegoId') juegoId: string,
    @Query('excludeSessionId') excludeSessionId: string | undefined,
    @Req() req: robleAuthGuard.RobleRequest,
  ) {
    const usuarioID = String(req.robleUser.sub);
    const accessToken = req.accessToken;
    return this.service.getLatestSession(
      usuarioID,
      juegoId,
      accessToken,
      excludeSessionId,
    );
  }

  @Post()
  async create(
    @Body() dto: CreateGameSessionDto,
    @Req() req: robleAuthGuard.RobleRequest,
  ) {
    const usuarioID = String(req.robleUser.sub);
    const accessToken = req.accessToken;
    return this.service.createSession(
      usuarioID,
      dto.juegoId,
      dto.puntaje,
      dto.resultado,
      dto.cambioElo,
      dto.tiempo,
      dto.seedId,
      dto.seed,
      accessToken,
    );
  }

}
