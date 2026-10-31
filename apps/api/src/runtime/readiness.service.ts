import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const READINESS_TIMEOUT_MS = 1500;

@Injectable()
export class ReadinessService {
  private draining = false;
  private databaseCheck?: Promise<boolean>;

  constructor(private readonly prisma: PrismaService) {}

  beginShutdown() { this.draining = true; }

  async isReady(): Promise<boolean> {
    if (this.draining) return false;
    // Reuse even a slow outstanding query: readiness probes must not pile up DB queries.
    if (!this.databaseCheck) {
      this.databaseCheck = Promise.resolve()
        .then(() => this.prisma.$queryRawUnsafe('SELECT 1'))
        .then(() => true, () => false)
        .finally(() => { this.databaseCheck = undefined; });
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const reachable = await Promise.race([
        this.databaseCheck,
        new Promise<false>(resolve => { timer = setTimeout(() => resolve(false), READINESS_TIMEOUT_MS); }),
      ]);
      return reachable && !this.draining;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}
