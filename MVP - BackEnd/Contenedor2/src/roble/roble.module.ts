import { Module } from '@nestjs/common';
import { RobleService } from './roble.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [RobleService],
  exports: [RobleService],
})
export class RobleModule {}
