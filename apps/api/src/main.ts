import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import { join } from 'path';

type CorsCallback = (err: Error | null, allow?: boolean) => void;

async function bootstrap() {
  // IMPORTANT: Use NestExpressApplication
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Needed when running behind ngrok / proxy (Google OAuth, cookies, etc.)
  app.set('trust proxy', 1);

  // Serve uploaded files under /uploads
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // Global validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const frontendUrl = process.env.FRONTEND_URL; // in Railway später z.B. https://fairwayd.ch

  // CORS for Vite, LAN and ngrok (+ optional prod frontend)
  app.enableCors({
    origin: (origin: string | undefined, cb: CorsCallback) => {
      if (!origin) return cb(null, true);

      // allow configured frontend (prod)
      if (frontendUrl && origin === frontendUrl) {
        return cb(null, true);
      }

      // localhost vite ports
      if (/^http:\/\/(localhost|127\.0\.0\.1):517[3-9]$/.test(origin)) {
        return cb(null, true);
      }

      // LAN vite (http://192.168.x.x:5173)
      if (/^http:\/\/192\.168\.\d+\.\d+:5173$/.test(origin)) {
        return cb(null, true);
      }

      // any ngrok frontend
      if (/^https:\/\/[a-z0-9-]+\.ngrok-free\.dev$/.test(origin)) {
        return cb(null, true);
      }

      return cb(new Error(`CORS blocked for origin ${origin}`), false);
    },
    credentials: true,
  });

  // Swagger
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
  const port = Number(process.env.PORT) || 3000;

  // Listen on all interfaces (important for containers/LAN)
  await app.listen(port, '0.0.0.0');

  console.log(`Fairwayd API listening on http://0.0.0.0:${port}`);
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed', err);
  process.exit(1);
});
