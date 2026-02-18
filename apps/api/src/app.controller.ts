import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // 🔍 Health Endpoint (Dev vs Neon sichtbar)
  @Get('health')
  async health() {
    const count = await this.prisma.course.count();

    const nodeEnv = (process.env.NODE_ENV ?? '').toLowerCase();
    const isProdLike = nodeEnv === 'production';

    // NEON_DATABASE_URL nur in prod-like, sonst DATABASE_URL
    const rawUrl = isProdLike
      ? process.env.NEON_DATABASE_URL
      : process.env.DATABASE_URL;

    let dbHost: string | null = null;
    let dbName: string | null = null;

    // URL sicher parsen (ohne Passwort auszugeben)
    if (rawUrl) {
      try {
        const u = new URL(rawUrl);
        dbHost = u.host || null;
        dbName = u.pathname?.replace(/^\//, '') || null;
      } catch {
        // ignore parsing errors
      }
    }

    return {
      status: 'ok',
      env: process.env.NODE_ENV ?? null,
      mode: isProdLike ? 'neon' : 'local',
      dbHost,
      dbName,
      courses: count,
      now: new Date().toISOString(),
    };
  }
}
