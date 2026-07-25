// Vercel serverless entry point for the whole FieldRelay API.
//
// Deliberately plain CommonJS JavaScript that loads the *already compiled*
// API. NestJS needs `experimentalDecorators` and `emitDecoratorMetadata`, which
// the platform's own TypeScript settings for functions do not provide; letting
// the platform compile the API produced dozens of decorator errors. The build
// command compiles the API with its own tsconfig instead, and this file only
// has to hand requests to the result.
//
// vercel.json rewrites /api/* and /health here, so every route the long-running
// server exposes is reachable. The application is built by the same
// createApp() the Docker image uses, so the deployed security posture cannot
// drift from the tested one.

const { createApp } = require('../apps/fieldrelay-api/dist/create-app.js');

// Held at module scope so a warm invocation reuses the built application and
// its database pool. Concurrent cold requests await one initialisation rather
// than racing to build several.
let ready = null;

async function initialise() {
  const app = await createApp();
  // Never listen(): the platform owns the socket. Nest only needs initialising
  // so its routes, guards and filters are wired.
  await app.init();
  return app.getHttpAdapter().getInstance();
}

module.exports = async function handler(request, response) {
  if (!ready) {
    ready = initialise().catch((error) => {
      // A failed cold start must not be cached, or the function stays broken
      // until the platform recycles it. Clear the gate so the next request
      // retries instead.
      ready = null;
      throw error;
    });
  }

  const expressApp = await ready;
  expressApp(request, response);
};
