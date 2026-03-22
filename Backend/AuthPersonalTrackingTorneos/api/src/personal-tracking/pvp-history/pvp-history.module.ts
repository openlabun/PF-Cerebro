import { Module } from '@nestjs/common';
import { RobleModule } from '../../roble/roble.module';
import { PvpHistoryController } from './pvp-history.controller';
import { PvpHistoryService } from './pvp-history.service';

@Module({
  imports: [RobleModule],
  controllers: [PvpHistoryController],
  providers: [PvpHistoryService],
  exports: [PvpHistoryService],
})
export class PvpHistoryModule {}
