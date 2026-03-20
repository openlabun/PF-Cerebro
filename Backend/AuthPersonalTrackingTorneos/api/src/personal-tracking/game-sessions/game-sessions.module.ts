import { Module } from '@nestjs/common';
import { GameSessionsController } from './game-sessions.controller';
import { GameSessionsService } from './game-sessions.service';
import { GameStatsModule } from '../game-stats/game-stats.module';
import { RobleModule } from 'src/roble/roble.module';

@Module({
  imports: [GameStatsModule, RobleModule],
  controllers: [GameSessionsController],
  providers: [GameSessionsService],
})
export class GameSessionsModule {}
