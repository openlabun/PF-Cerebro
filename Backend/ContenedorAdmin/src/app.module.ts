import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminController } from './admin/admin.controller';
import { AdminService } from './admin/admin.service';
import { AuthModule } from './auth/auth.module';
import { AdminRoleGuard } from './common/guards/admin-role.guard';
import { RobleAuthGuard } from './common/guards/roble-auth.guard';
import { HealthController } from './health/health.controller';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), AuthModule],
  controllers: [HealthController, AdminController],
  providers: [AdminService, RobleAuthGuard, AdminRoleGuard],
})
export class AppModule {}
