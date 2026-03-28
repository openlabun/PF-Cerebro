import { Module } from '@nestjs/common';
import { TorneosController } from './torneos.controller';
import { TorneosService } from './torneos.service';
import { RobleModule } from 'src/roble/roble.module';
import { PersonalTrackingBootstrapModule } from 'src/personal-tracking/bootstrap/personal-tracking-bootstrap.module';

@Module({
  imports: [RobleModule, PersonalTrackingBootstrapModule],
  controllers: [TorneosController],
  providers: [TorneosService],
  exports: [TorneosService],
})
export class TorneosModule {}
