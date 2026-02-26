import { Module } from '@nestjs/common';
import { RobleModule } from '../../roble/roble.module';
import { PersonalTrackingBootstrapService } from './personal-tracking-bootstrap.service';

@Module({
  imports: [RobleModule],
  providers: [PersonalTrackingBootstrapService],
  exports: [PersonalTrackingBootstrapService],
})
export class PersonalTrackingBootstrapModule {}
