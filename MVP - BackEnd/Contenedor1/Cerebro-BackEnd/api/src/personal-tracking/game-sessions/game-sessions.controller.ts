import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
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

  @Post()
  async create(
    @Body() dto: CreateGameSessionDto,
    @Req() req: robleAuthGuard.RobleRequest,
  ) {
    const usuarioId = String(req.robleUser.sub);
    const accessToken = req.accessToken;

    return this.service.createSession(
      usuarioId,
      dto.juegoId,
      dto.puntaje,
      dto.resultado,
      dto.cambioElo,
      accessToken,
    );
  }
}
