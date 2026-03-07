import { Module } from '@nestjs/common';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { RobleModule } from 'src/roble/roble.module';
import { TitlesModule } from '../tittles/tittles.module';
import { PersonalTrackingBootstrapModule } from '../bootstrap/personal-tracking-bootstrap.module';

@Module({
  imports: [RobleModule, TitlesModule, PersonalTrackingBootstrapModule],
  controllers: [ProfilesController],
  providers: [ProfilesService],
  exports: [ProfilesService],
})
export class ProfilesModule {}
