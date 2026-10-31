import { Controller, Get, Header, ServiceUnavailableException } from '@nestjs/common';
import { AppService } from './app.service';
import { ReadinessService } from './runtime/readiness.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService, private readonly readiness: ReadinessService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return { status: 'ok' };
  }

  @Get('ready')
  @Header('Cache-Control', 'no-store')
  async getReady() {
    if (!await this.readiness.isReady()) {
      throw new ServiceUnavailableException({ status: 'unavailable' });
    }
    return {
      status: 'ok',
      // A non-secret release identifier lets deployment probes verify a real cutover.
      ...(process.env.RAILWAY_DEPLOYMENT_ID ? { deployment: process.env.RAILWAY_DEPLOYMENT_ID } : {}),
    };
  }
}
