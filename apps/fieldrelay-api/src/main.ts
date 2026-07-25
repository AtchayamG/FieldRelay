import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });
  const configuredOrigins = process.env.FRONTEND_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins =
    configuredOrigins && configuredOrigins.length > 0
      ? configuredOrigins
      : ['http://localhost:4200', 'http://localhost:4173'];

  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    allowedHeaders: [
      'Content-Type',
      'Idempotency-Key',
      'x-fieldrelay-timestamp',
      'x-fieldrelay-signature'
    ],
    exposedHeaders: ['Idempotency-Replayed'],
    credentials: false,
    maxAge: 600
  });
  // Lets PgPoolProvider close the connection pool on SIGTERM/SIGINT.
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3000));
}
bootstrap();
