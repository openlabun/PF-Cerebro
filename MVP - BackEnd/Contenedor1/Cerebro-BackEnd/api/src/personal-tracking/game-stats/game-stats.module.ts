import { Module } from '@nestjs/common';
import { GameStatsController } from './game-stats.controller';
import { GameStatsService } from './game-stats.service';
import { RobleModule } from 'src/roble/roble.module';

@Module({
  imports: [RobleModule],
  controllers: [GameStatsController],
  providers: [GameStatsService],
  exports: [GameStatsService],
})
export class GameStatsModule {}
