import { Module } from '@nestjs/common';
import { RobleModule } from '../roble/roble.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PersonalTrackingBootstrapModule } from 'src/personal-tracking/bootstrap/personal-tracking-bootstrap.module';

@Module({
  imports: [RobleModule, PersonalTrackingBootstrapModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
