import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { RobleService } from './roble.service';

@Module({
  imports: [HttpModule],
  providers: [RobleService],
  exports: [RobleService],
})
export class RobleModule {}
