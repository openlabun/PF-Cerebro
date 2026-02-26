import { Module } from '@nestjs/common';
import { RankingController } from './ranking.controller';
import { RankingService } from './ranking.service';
import { RobleModule } from '../roble/roble.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [RobleModule, AuthModule],
  controllers: [RankingController],
  providers: [RankingService],
  exports: [RankingService],
})
export class RankingModule {}
