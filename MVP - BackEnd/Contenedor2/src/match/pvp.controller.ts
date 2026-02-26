import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RobleAuthGuard } from '../common/guards/roble-auth.guard';
import type { RobleRequest } from '../common/types/roble-request';
import { getUserIdFromAccessToken } from '../common/utils/jwt.utils';
import { MatchService } from './match.service';
import { CreateMatchDto } from './dto/create-match.dto';
import { JoinMatchDto } from './dto/join-match.dto';
import { MakeMoveDto } from './dto/make-move.dto';

@ApiTags('PvP')
@ApiBearerAuth('access-token')
@UseGuards(RobleAuthGuard)
@Controller('pvp')
export class PvpController {
  constructor(private readonly matchService: MatchService) {}

  private extractUserId(token: string): string {
    const id = getUserIdFromAccessToken(token);
    if (!id) throw new UnauthorizedException('No se pudo obtener el ID del usuario');
    return id;
  }

  @Post('match')
  async createMatch(@Req() req: RobleRequest, @Body() dto: CreateMatchDto) {
    const usuarioId = this.extractUserId(req.accessToken);
    return this.matchService.createMatch(dto.torneoId, usuarioId, req.accessToken, dto.tokenC1);
  }

  @Post('match/:id/join')
  async joinMatch(
    @Req() req: RobleRequest,
    @Param('id') id: string,
    @Body() dto: JoinMatchDto,
  ) {
    const usuarioId = this.extractUserId(req.accessToken);
    return this.matchService.joinMatch(id, usuarioId, req.accessToken, dto.tokenC1);
  }

  @Post('match/:id/move')
  async makeMove(
    @Req() req: RobleRequest,
    @Param('id') id: string,
    @Body() dto: MakeMoveDto,
  ) {
    const usuarioId = this.extractUserId(req.accessToken);
    return this.matchService.makeMove(
      id,
      usuarioId,
      dto.row,
      dto.col,
      dto.value,
      req.accessToken,
    );
  }

  @Get('match/:id')
  async getMatch(@Req() req: RobleRequest, @Param('id') id: string) {
    return this.matchService.getMatch(id, req.accessToken);
  }

  @Post('match/:id/forfeit')
  async forfeit(@Req() req: RobleRequest, @Param('id') id: string) {
    const usuarioId = this.extractUserId(req.accessToken);
    return this.matchService.forfeit(id, usuarioId, req.accessToken);
  }
}