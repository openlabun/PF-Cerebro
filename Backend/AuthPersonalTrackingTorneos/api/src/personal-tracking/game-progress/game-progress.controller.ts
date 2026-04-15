import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import * as robleAuthGuard from '../../common/guards/roble-auth.guard';
import { CloseSudokuProgressDto } from './dto/close-sudoku-progress.dto';
import { UpsertSudokuProgressDto } from './dto/upsert-sudoku-progress.dto';
import { GameProgressService } from './game-progress.service';

@ApiTags('PersonalTracking - GameProgress')
@ApiBearerAuth()
@UseGuards(robleAuthGuard.RobleAuthGuard)
@Controller('game-progress')
export class GameProgressController {
  constructor(private readonly service: GameProgressService) {}

  @Get('sudoku/active')
  async getActiveSudokuProgress(@Req() req: robleAuthGuard.RobleRequest) {
    const usuarioID = String(req.robleUser.sub);
    const accessToken = req.accessToken;
    return this.service.getActiveSudokuProgress(usuarioID, accessToken);
  }

  @Put('sudoku/active')
  async upsertActiveSudokuProgress(
    @Body() dto: UpsertSudokuProgressDto,
    @Req() req: robleAuthGuard.RobleRequest,
  ) {
    const usuarioID = String(req.robleUser.sub);
    const accessToken = req.accessToken;
    return this.service.upsertActiveSudokuProgress(usuarioID, dto, accessToken);
  }

  @Post('sudoku/active/close')
  async closeActiveSudokuProgress(
    @Body() dto: CloseSudokuProgressDto,
    @Req() req: robleAuthGuard.RobleRequest,
  ) {
    const usuarioID = String(req.robleUser.sub);
    const accessToken = req.accessToken;
    return this.service.closeActiveSudokuProgress(
      usuarioID,
      dto.estado,
      accessToken,
    );
  }
}
