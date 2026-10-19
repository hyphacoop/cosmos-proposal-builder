import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import fastifyStatic from '@fastify/static';
import Fastify, { type FastifyServerOptions } from 'fastify';
import type { Config } from './config.js';

// Serves the built frontend. The app itself runs in the browser.
export async function buildServer(config: Config, options: FastifyServerOptions = {}) {
  const app = Fastify(options);

  app.get('/healthz', async () => ({ status: 'ok' }));

  const staticDir = resolve(config.staticDir);
  if (!existsSync(staticDir)) {
    app.log.warn(`No built frontend at ${staticDir}; run npm run build first`);
    return app;
  }
  await app.register(fastifyStatic, {
    root: staticDir,
    // npm run build writes .br and .gz copies next to each text asset
    preCompressed: true,
    setHeaders(reply, path) {
      // Vite fingerprints everything under assets/, so only index.html needs revalidating
      reply.header('cache-control', path.includes('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
    },
  });

  return app;
}
