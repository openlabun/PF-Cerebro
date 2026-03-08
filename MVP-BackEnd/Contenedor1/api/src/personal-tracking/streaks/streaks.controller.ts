import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StreaksService } from './streaks.service';
import { IncreaseSaversDto } from './dto/increase-savers.dto';
import { RobleAuthGuard } from '../../common/guards/roble-auth.guard';
import * as robleAuthGuard from '../../common/guards/roble-auth.guard';

@ApiTags('streaks')
@ApiBearerAuth()
@Controller('streaks')
@UseGuards(RobleAuthGuard)
export class StreaksController {
  constructor(private readonly service: StreaksService) {}

  private getUserId(req: robleAuthGuard.RobleRequest): string {
    return String(req.robleUser.sub);
  }

  @Post('increase')
  @ApiOperation({ summary: 'Aumentar racha' })
  increase(@Req() req: robleAuthGuard.RobleRequest) {
    return this.service.increaseStreak(this.getUserId(req), req.accessToken);
  }

  @Post('reset')
  @ApiOperation({ summary: 'Resetear racha' })
  reset(@Req() req: robleAuthGuard.RobleRequest) {
    return this.service.resetStreak(this.getUserId(req), req.accessToken);
  }

  @Post('use-saver')
  @ApiOperation({ summary: 'Usar salvador de racha' })
  useSaver(@Req() req: robleAuthGuard.RobleRequest) {
    return this.service.useSaver(this.getUserId(req), req.accessToken);
  }

  @Post('increase-savers')
  @ApiOperation({ summary: 'Aumentar salvadores de racha' })
  increaseSavers(
    @Body() dto: IncreaseSaversDto,
    @Req() req: robleAuthGuard.RobleRequest,
  ) {
    return this.service.increaseSavers(
      this.getUserId(req),
      dto.cantidad,
      req.accessToken,
    );
  }

  @Post('update-max')
  @ApiOperation({ summary: 'Actualizar racha máxima manualmente' })
  updateMax(@Req() req: robleAuthGuard.RobleRequest) {
    return this.service.updateMaxStreak(this.getUserId(req), req.accessToken);
  }
}
