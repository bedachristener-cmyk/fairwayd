import { Logger } from '@nestjs/common';
import type { Server } from 'node:http';

type ShutdownApp = { getHttpServer(): Server; close(): Promise<void> };
const logger = new Logger('GracefulShutdown');
export const SHUTDOWN_TIMEOUT_MS = 25000;

export function installGracefulShutdown(
  app: ShutdownApp,
  readiness: { beginShutdown(): void },
  timeoutMs = SHUTDOWN_TIMEOUT_MS,
) {
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    readiness.beginShutdown();
    logger.log('Shutdown started; waiting for active HTTP requests.');
    const server = app.getHttpServer();
    const deadline = setTimeout(() => {
      logger.error('Shutdown deadline exceeded; closing remaining connections.');
      server.closeAllConnections?.();
      process.exit(1);
    }, timeoutMs);
    deadline.unref();
    // Close HTTP first. Nest module destruction disconnects Prisma, so it must run
    // after requests finish, rather than before Express closes its listener.
    void new Promise<void>((resolve, reject) => {
      server.close(error => error && (error as NodeJS.ErrnoException).code !== 'ERR_SERVER_NOT_RUNNING'
        ? reject(error) : resolve());
      server.closeIdleConnections?.();
    }).then(() => app.close()).then(() => {
      clearTimeout(deadline);
      logger.log('Shutdown complete; HTTP requests drained and application closed.');
      process.exit(0);
    }).catch(() => {
      clearTimeout(deadline);
      logger.error('Application shutdown failed.');
      process.exit(1);
    });
  };
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
  return () => { process.off('SIGTERM', stop); process.off('SIGINT', stop); };
}
