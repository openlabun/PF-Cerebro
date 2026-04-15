import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Agent as HttpsAgent } from 'https';
import { RobleService } from './roble.service';

@Module({
  imports: [
    ConfigModule,
    HttpModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const allowSelfSigned =
          config.get<string>('ROBLE_ALLOW_SELF_SIGNED') === 'true';

        if (!allowSelfSigned) {
          return {};
        }

        return {
          httpsAgent: new HttpsAgent({
            rejectUnauthorized: false,
          }),
        };
      },
    }),
  ],
  providers: [RobleService],
  exports: [RobleService],
})
export class RobleModule {}
