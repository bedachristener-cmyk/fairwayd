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
  const raw = process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || '';
  try {
    const u = new URL(raw);
    console.log('[DB]', { host: u.host, db: u.pathname.replace('/', '') });
  } catch {
    console.log('[DB] URL missing or invalid');
  }
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
    origin: (origin: string | undefined, cb) => {
      // Allow non-browser tools (Postman, curl)
      if (!origin) return cb(null, true);

      try {
        const host = new URL(origin).hostname;

        // 1️⃣ Allow main production frontend
        if (host === 'fairwayd.vercel.app') {
          return cb(null, true);
        }

        // 2️⃣ Allow ALL Vercel deployments (preview + prod)
        if (host.endsWith('.vercel.app')) {
          return cb(null, true);
        }

        return cb(new Error('Not allowed by CORS'), false);
      } catch {
        return cb(new Error('Invalid origin'), false);
      }
    },

    credentials: true,

    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    allowedHeaders: ['Content-Type', 'Authorization'],

    exposedHeaders: ['Authorization'],
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
