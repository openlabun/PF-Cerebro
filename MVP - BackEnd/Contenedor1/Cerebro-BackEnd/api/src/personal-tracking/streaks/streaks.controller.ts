import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StreaksService } from './streaks.service';
import { StreakActionDto } from './dto/streak-action.dto';
import { UseSaverDto } from './dto/use-saver.dto';
import { IncreaseSaversDto } from './dto/increase-savers.dto';
import { RobleAuthGuard } from '../../common/guards/roble-auth.guard';
import * as robleAuthGuard from '../../common/guards/roble-auth.guard';

@ApiTags('streaks')
@ApiBearerAuth()
@Controller('streaks')
@UseGuards(RobleAuthGuard)
export class StreaksController {
  constructor(private readonly service: StreaksService) {}

  @Post('increase')
  @ApiOperation({ summary: 'Aumentar racha' })
  increase(
    @Body() dto: StreakActionDto,
    @Req() req: robleAuthGuard.RobleRequest,
  ) {
    return this.service.increaseStreak(dto.usuarioId, req.accessToken);
  }

  @Post('reset')
  @ApiOperation({ summary: 'Resetear racha' })
  reset(@Body() dto: StreakActionDto, @Req() req: robleAuthGuard.RobleRequest) {
    return this.service.resetStreak(dto.usuarioId, req.accessToken);
  }

  @Post('use-saver')
  @ApiOperation({ summary: 'Usar salvador de racha' })
  useSaver(@Body() dto: UseSaverDto, @Req() req: robleAuthGuard.RobleRequest) {
    return this.service.useSaver(dto.usuarioId, req.accessToken);
  }

  @Post('increase-savers')
  @ApiOperation({ summary: 'Aumentar salvadores de racha' })
  increaseSavers(
    @Body() dto: IncreaseSaversDto,
    @Req() req: robleAuthGuard.RobleRequest,
  ) {
    return this.service.increaseSavers(
      dto.usuarioId,
      dto.cantidad,
      req.accessToken,
    );
  }

  @Post('update-max')
  @ApiOperation({ summary: 'Actualizar racha máxima manualmente' })
  updateMax(
    @Body() dto: StreakActionDto,
    @Req() req: robleAuthGuard.RobleRequest,
  ) {
    return this.service.updateMaxStreak(dto.usuarioId, req.accessToken);
  }
}
