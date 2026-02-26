import { Module } from '@nestjs/common';
import { TitlesController } from './tittles.controller';
import { TitlesService } from './tittles.service';
import { RobleModule } from 'src/roble/roble.module';

@Module({
  imports: [RobleModule],
  controllers: [TitlesController],
  providers: [TitlesService],
  exports: [TitlesService],
})
export class TitlesModule {}
