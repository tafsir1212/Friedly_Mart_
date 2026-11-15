import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import * as express from 'express';
import { SupabaseStorageService } from './storage/supabase-storage.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const corsOrigins = app
    .get(ConfigService)
    .getOrThrow<string>('CORS_ORIGIN')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (corsOrigins.length === 0 || corsOrigins.some((origin) => origin.includes('*'))) {
    throw new Error('CORS_ORIGIN must contain one or more explicit frontend origins.');
  }

  app.use('/uploads', (req, res, next) => {
    const objectPath = req.path.replace(/^\/+/, '');
    if (
      (req.method === 'GET' || req.method === 'HEAD') &&
      !objectPath.includes('/')
    ) {
      return res.sendStatus(404);
    }

    return next();
  });
  app.use('/uploads', express.static('uploads'));
  const imageStorage = app.get(SupabaseStorageService);
  app.use('/uploads', (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }

    const objectPath = req.path.replace(/^\/+/, '');
    const publicUrl = imageStorage.getPublicUrl(objectPath);
    if (!publicUrl) {
      return next();
    }

    return res.redirect(302, publicUrl);
  });

  app.enableCors({
    origin: corsOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
}
bootstrap();
