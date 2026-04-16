import { Module } from '@nestjs/common';
import { ProfilesModule } from './profiles/profiles.module';
import { StreaksModule } from './streaks/streaks.module';
import { AchievementsModule } from './achievements/achievements.module';
import { TitlesModule } from './tittles/tittles.module';
import { GameSessionsModule } from './game-sessions/game-sessions.module';
import { GameStatsModule } from './game-stats/game-stats.module';
import { PvpHistoryModule } from './pvp-history/pvp-history.module';
import { GameProgressModule } from './game-progress/game-progress.module';

@Module({
  imports: [
    ProfilesModule,
    StreaksModule,
    AchievementsModule,
    TitlesModule,
    GameSessionsModule,
    GameStatsModule,
    PvpHistoryModule,
    GameProgressModule,
  ],
})
export class PersonalTrackingModule {}
