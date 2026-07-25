import { createApp } from './create-app';

// Long-running server entry point, used by Docker and local development. The
// serverless entry point is api/index.ts at the repository root; both share
// createApp() so they cannot drift apart.
async function bootstrap() {
  const app = await createApp();
  // Lets PgPoolProvider close the connection pool on SIGTERM/SIGINT.
  app.enableShutdownHooks();
  await app.listen(Number(process.env.PORT ?? 3000));
}

bootstrap();
