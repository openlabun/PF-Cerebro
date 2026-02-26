import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RobleModule } from './roble/roble.module';
import { AuthModule } from './auth/auth.module';
import { RobleAuthGuard } from './common/guards/roble-auth.guard';
import { PersonalTrackingModule } from './personal-tracking/personal-tracking.module';
import { TorneosModule } from './torneos/torneos.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RobleModule,
    AuthModule,
    PersonalTrackingModule,
    TorneosModule,
  ],
  providers: [RobleAuthGuard],
  exports: [RobleAuthGuard],
})
export class AppModule {}
