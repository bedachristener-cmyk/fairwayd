import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import { join } from 'path';

type CorsCallback = (err: Error | null, allow?: boolean) => void;

function normalizeOrigin(origin: string) {
  // ensure no trailing slash
  return origin.replace(/\/$/, '');
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Behind reverse proxies (Railway, ngrok, Cloudflare, etc.)
  // Needed for correct req.ip, secure cookies, OAuth callbacks, etc.
  app.set('trust proxy', 1);

  // Serve uploaded files under /uploads
  // Note: process.cwd() is fine for local; in containers ensure uploads path exists.
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // Global validation
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

  /**
   * FRONTEND_URL
   * - set this in Railway to your production frontend URL (e.g. https://fairwayd.vercel.app or https://fairwayd.ch)
   *
   * VERCEL_PROJECT_URL (optional)
   * - you can also set it to "fairwayd.vercel.app" if you want an explicit host check
   */
  const frontendUrl = process.env.FRONTEND_URL
    ? normalizeOrigin(process.env.FRONTEND_URL)
    : undefined;

  const allowVercelPreviews =
    (process.env.ALLOW_VERCEL_PREVIEWS ?? 'true').toLowerCase() === 'true';

  // CORS
  app.enableCors({
    origin: (origin: string | undefined, cb: CorsCallback) => {
      // Non-browser requests (curl, server-to-server, mobile apps, same-origin) often have no Origin
      if (!origin) return cb(null, true);

      const o = normalizeOrigin(origin);

      // 1) Explicit production frontend
      if (frontendUrl && o === frontendUrl) return cb(null, true);

      // 2) Vercel production + preview deployments
      //    - production: https://<project>.vercel.app
      //    - preview:    https://<something>-<project>.vercel.app
      //    - also covers custom vercel preview domains
      if (
        allowVercelPreviews &&
        /^https:\/\/([a-z0-9-]+\.)?vercel\.app$/i.test(new URL(o).hostname)
      ) {
        return cb(null, true);
      }

      // Optional: allow only your project on vercel (stricter)
      // const host = new URL(o).hostname;
      // if (allowVercelPreviews && (host === 'fairwayd.vercel.app' || host.endsWith('.fairwayd.vercel.app'))) {
      //   return cb(null, true);
      // }

      // 3) Localhost Vite ports (5173..5179)
      if (/^http:\/\/(localhost|127\.0\.0\.1):517[3-9]$/i.test(o)) {
        return cb(null, true);
      }

      // 4) LAN Vite (http://192.168.x.x:5173)
      if (/^http:\/\/192\.168\.\d+\.\d+:5173$/i.test(o)) {
        return cb(null, true);
      }

      // 5) ngrok dev frontends
      if (/^https:\/\/[a-z0-9-]+\.ngrok-free\.dev$/i.test(o)) {
        return cb(null, true);
      }

      // In production, it's nicer to *not* hard-fail with an Error (some clients/logs get noisy).
      // Instead: block by returning cb(null, false).
      // In development, a clear error is helpful.
      const isProd = (process.env.NODE_ENV ?? 'development') === 'production';
      if (isProd) return cb(null, false);

      return cb(new Error(`CORS blocked for origin ${o}`), false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Swagger (often you want it only in non-prod; keep it always if you prefer)
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

  // Railway provides PORT; fallback for local dev
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;

  // Listen on all interfaces (important for containers/LAN)
  await app.listen(port, '0.0.0.0');

  console.log(`Fairwayd API listening on http://0.0.0.0:${port}`);
  if (frontendUrl) console.log(`CORS primary frontend: ${frontendUrl}`);
  console.log(`ALLOW_VERCEL_PREVIEWS=${String(allowVercelPreviews)}`);
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed', err);
  process.exit(1);
});
