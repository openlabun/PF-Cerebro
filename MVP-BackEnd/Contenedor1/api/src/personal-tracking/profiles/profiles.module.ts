import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { RobleModule } from 'src/roble/roble.module';
import { TitlesModule } from '../tittles/tittles.module';

@Module({
  imports: [RobleModule,TitlesModule],
  controllers: [ProfilesController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
