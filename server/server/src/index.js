import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import { tools } from './routes/tools.js';
import { errorHandler } from './lib/errors.js';

export function createApp() {
  const app = express();

  app.use(cors({
    origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()),
  }));
  app.use(express.json({ limit: '100kb' }));

  // Artificial latency in development only, so the client's loading states are
  // visible while building them rather than flashing past on localhost.
  if (process.env.SLOW_MODE === '1') {
    app.use((_req, _res, next) => setTimeout(next, 600));
  }

  app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'toolshed-api' }));
  app.use('/api/tools', tools);

  app.use((_req, res) => res.status(404).json({ error: { message: 'No such endpoint.' } }));
  app.use(errorHandler);
  return app;
}

// Only listen when run directly — tests import createApp instead.
const isEntrypoint = process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isEntrypoint) {
  const port = Number(process.env.PORT || 4000);
  createApp().listen(port, () => console.log(`toolshed-api listening on http://localhost:${port}`));
}
