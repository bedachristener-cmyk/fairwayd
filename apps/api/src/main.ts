import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import type { Request, Response } from 'express';
import { join } from 'path';

function normalizeOrigin(o: string) {
  return o.replace(/\/$/, '');
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.set('trust proxy', 1);

  // Static uploads
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ✅ Global API prefix
  app.setGlobalPrefix('api');

  // ✅ CORS (Dev + Prod + optional Vercel previews)
  const allowVercelPreviews =
    (process.env.ALLOW_VERCEL_PREVIEWS ?? 'true').toLowerCase() === 'true';

  const allowedExactOrigins = new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'https://fairwayd.vercel.app',
  ]);

  app.enableCors({
    origin: (origin: string | undefined, cb) => {
      if (!origin) return cb(null, true); // curl/postman

      const o = normalizeOrigin(origin);

      if (allowedExactOrigins.has(o)) return cb(null, true);

      try {
        const host = new URL(o).hostname;
        if (allowVercelPreviews && host.endsWith('.vercel.app')) {
          return cb(null, true);
        }
      } catch {}

      return cb(new Error(`CORS blocked for origin ${origin}`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Authorization'],
    optionsSuccessStatus: 204,
  });

  // Ensure preflight OPTIONS never 404
  const server = app.getHttpAdapter().getInstance();
  server.options(/.*/, (_req: Request, res: Response) => {
    res.sendStatus(204);
  });

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Fairwayd API')
    .setDescription('Fairwayd Backend API')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'jwt',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`Fairwayd API listening on http://0.0.0.0:${port}`);
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed', err);
  process.exit(1);
});
