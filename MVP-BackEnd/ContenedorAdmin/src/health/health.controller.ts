import { Controller, Get, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

@ApiTags('health')
@Controller()
export class HealthController {
  @Get('health')
  @ApiOperation({ summary: 'Health check del contenedor admin' })
  health(@Req() req: Request) {
    const host = req.headers.host || `localhost:${process.env.PORT || 3001}`;
    const docs = `${req.protocol}://${host}/api/admin/docs`;

    return {
      service: 'contenedor-admin',
      status: 'ok',
      timestamp: new Date().toISOString(),
      docs,
    };
  }
}
