import { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

// Shared by the long-running server (main.ts) and the serverless handler, so a
// deployment can never end up with a different security posture than the one
// that was tested. Anything applied here applies to both.
export async function createApp(): Promise<INestApplication> {
  // rawBody is required for provider callback HMAC verification, which signs
  // the exact request bytes.
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
    // PUT and DELETE are used by the settings routes; omitting them made those
    // routes unreachable from a cross-origin dev server.
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      // Without this the session token cannot be sent cross-origin, which
      // silently breaks every authenticated request from a dev server.
      'Authorization',
      'Idempotency-Key',
      'x-fieldrelay-timestamp',
      'x-fieldrelay-signature',
      'x-calle-webhook-token'
    ],
    exposedHeaders: ['Idempotency-Replayed'],
    credentials: false,
    maxAge: 600
  });

  return app;
}
