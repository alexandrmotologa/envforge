import path from 'node:path';
import fs from 'node:fs';
import { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function registerStaticFrontend(app: FastifyInstance): Promise<void> {
  // Candidate paths for web studio build output
  const candidates = [
    path.resolve(__dirname, '../web'), // when running from dist/server/static.js -> dist/web
    path.resolve(__dirname, '../../web/dist'), // when running via tsx from src/server/static.ts -> web/dist
    path.resolve(process.cwd(), 'web/dist'),
    path.resolve(process.cwd(), 'dist/web'),
  ];

  let webDistPath = '';
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.existsSync(path.join(candidate, 'index.html'))) {
      webDistPath = candidate;
      break;
    }
  }

  if (webDistPath) {
    await app.register(fastifyStatic, {
      root: webDistPath,
      prefix: '/',
    });

    // SPA fallback
    app.setNotFoundHandler((req, reply) => {
      if (req.raw.url && req.raw.url.startsWith('/api')) {
        reply.status(404).send({ error: 'Endpoint not found' });
      } else {
        reply.sendFile('index.html');
      }
    });
  } else {
    // If frontend bundle has not yet been compiled
    app.get('/', async (req, reply) => {
      reply.type('text/html').send(`
        <!DOCTYPE html>
        <html>
        <head><title>EnvForge Studio</title><meta charset="utf-8"></head>
        <body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; text-align: center;">
          <h1>EnvForge Studio</h1>
          <p>Web studio assets are compiling or running in development mode.</p>
          <p>API is active at <a href="/api/matrix" style="color: #38bdf8;">/api/matrix</a>.</p>
        </body>
        </html>
      `);
    });
  }
}
