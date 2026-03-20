import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PvpController } from './pvp.controller';
import { MatchService } from './match.service';
import { RobleModule } from '../roble/roble.module';
import { AuthModule } from '../auth/auth.module';
import { SudokuModule } from '../sudoku/sudoku.module';
import { WebhookModule } from '../webhook/webhook.module';
import { RankingModule } from '../ranking/ranking.module';

@Module({
  imports: [HttpModule, RobleModule, AuthModule, SudokuModule, WebhookModule, RankingModule],
  controllers: [PvpController],
  providers: [MatchService],
})
export class MatchModule {}
