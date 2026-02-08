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

  // CORS for Vite, LAN and ngrok
  app.enableCors({
    origin: (origin: string | undefined, cb: CorsCallback) => {
      if (!origin) return cb(null, true);

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
      'jwt', // <- Name der Security
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Listen on all interfaces (important for LAN access)
  await app.listen(3000, '0.0.0.0');
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed', err);
  process.exit(1);
});
