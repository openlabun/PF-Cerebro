import { Module } from '@nestjs/common';
import { RobleModule } from 'src/roble/roble.module';
import { GameProgressController } from './game-progress.controller';
import { GameProgressService } from './game-progress.service';

@Module({
  imports: [RobleModule],
  controllers: [GameProgressController],
  providers: [GameProgressService],
})
export class GameProgressModule {}
