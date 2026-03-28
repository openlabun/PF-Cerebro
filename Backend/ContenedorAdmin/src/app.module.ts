import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminController } from './admin/admin.controller';
import { AdminService } from './admin/admin.service';
import { AuthModule } from './auth/auth.module';
import { AdminRoleGuard } from './common/guards/admin-role.guard';
import { RobleAuthGuard } from './common/guards/roble-auth.guard';
import { HealthController } from './health/health.controller';
import { LiveController } from './live/live.controller';
import { LiveService } from './live/live.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule],
  controllers: [HealthController, AdminController, LiveController],
  providers: [AdminService, RobleAuthGuard, AdminRoleGuard, LiveService],
})
export class AppModule {}
