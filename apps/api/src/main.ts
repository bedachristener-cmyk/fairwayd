import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import type { Request, Response } from 'express';
import { join } from 'path';

type CorsCallback = (err: Error | null, allow?: boolean) => void;

function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, '');
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.set('trust proxy', 1);

  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const frontendUrl = process.env.FRONTEND_URL
    ? normalizeOrigin(process.env.FRONTEND_URL)
    : undefined;

  const allowVercelPreviews =
    (process.env.ALLOW_VERCEL_PREVIEWS ?? 'true').toLowerCase() === 'true';

  app.enableCors({
    origin: (origin: string | undefined, cb: CorsCallback) => {
      if (!origin) return cb(null, true);

      const o = normalizeOrigin(origin);

      // 1) Explicit production frontend
      if (frontendUrl && o === frontendUrl) {
        return cb(null, true);
      }

      // 2) Vercel production + preview deployments
      if (allowVercelPreviews) {
        try {
          const host = new URL(o).hostname;

          // allow *.vercel.app (production + previews)
          if (host.endsWith('.vercel.app')) {
            return cb(null, true);
          }
        } catch {
          // ignore malformed origins
        }
      }

      // 3) Localhost (Vite dev)
      if (/^http:\/\/(localhost|127\.0\.0\.1):517[3-9]$/i.test(o)) {
        return cb(null, true);
      }

      // 4) LAN Vite
      if (/^http:\/\/192\.168\.\d+\.\d+:5173$/i.test(o)) {
        return cb(null, true);
      }

      // 5) ngrok dev frontends
      if (/^https:\/\/[a-z0-9-]+\.ngrok-free\.dev$/i.test(o)) {
        return cb(null, true);
      }

      const isProd = (process.env.NODE_ENV ?? 'development') === 'production';

      if (isProd) {
        console.warn(`CORS blocked origin: ${o}`);
        return cb(null, false);
      }

      return cb(new Error(`CORS blocked for origin ${o}`), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  console.log(`OAUTH_DEBUG=${process.env.OAUTH_DEBUG}`);
  console.log(
    `GOOGLE_CLIENT_ID_PREFIX=${(process.env.GOOGLE_CLIENT_ID ?? '').trim().slice(0, 18)}...`,
  );

  // ✅ Ensure preflight OPTIONS requests never 404 (e.g. /auth/oauth)
  // IMPORTANT: Nest app itself has no app.options() type; use the underlying Express instance.
  // CORS headers are applied by enableCors above.
  const server = app.getHttpAdapter().getInstance();
  server.options(/.*/, (req: Request, res: Response) => {
    res.sendStatus(204);
  });

  const config = new DocumentBuilder()
    .setTitle('Fairwayd API')
    .setDescription('Fairwayd Backend API')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'jwt',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;

  await app.listen(port, '0.0.0.0');

  console.log(`Fairwayd API listening on http://0.0.0.0:${port}`);
  if (frontendUrl) console.log(`CORS primary frontend: ${frontendUrl}`);
  console.log(`ALLOW_VERCEL_PREVIEWS=${String(allowVercelPreviews)}`);
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed', err);
  process.exit(1);
});
