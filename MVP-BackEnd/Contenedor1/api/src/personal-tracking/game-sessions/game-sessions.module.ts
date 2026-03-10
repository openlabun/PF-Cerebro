import { Module } from '@nestjs/common';
import { GameSessionsController } from './game-sessions.controller';
import { GameSessionsService } from './game-sessions.service';
import { GameStatsModule } from '../game-stats/game-stats.module';
import { RobleModule } from 'src/roble/roble.module';
import { ProfilesModule } from '../profiles/profiles.module';

@Module({
  imports: [GameStatsModule, RobleModule, ProfilesModule],
  controllers: [GameSessionsController],
  providers: [GameSessionsService],
})
export class GameSessionsModule {}
