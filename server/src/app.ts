import express, { type Express } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import type { Logger } from './logger.js';
import { createHealthRouter, type PingDb } from './http/health.js';
import { apiNotFound, createErrorHandler } from './http/middleware/errorHandler.js';
import { createApiRateLimiter } from './http/middleware/rateLimit.js';
import { requireJsonBody } from './http/middleware/requireJson.js';
import { createClientRouter } from './http/static.js';

export type AppOptions = {
  logger: Logger;
  pingDb: PingDb;
  /** Trust Render's proxy (NFR-SEC-7). True in production. */
  trustProxy: boolean;
  /** Absolute path to `client/dist`. Omit when the client is served by Vite (dev) or in API tests. */
  clientDistDir?: string;
};

/** Express app factory (§10). No `listen()` here, so tests can use supertest. */
export function createApp({ logger, pingDb, trustProxy, clientDistDir }: AppOptions): Express {
  const app = express();

  if (trustProxy) app.set('trust proxy', 1);

  app.use(
    helmet({
      // NFR-SEC-4, on top of helmet's safe defaults (object-src 'none', frame-ancestors 'self', …).
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          connectSrc: ["'self'", 'ws:', 'wss:'],
          imgSrc: ["'self'", 'data:'],
          styleSrc: ["'self'"],
          // Render terminates TLS already; upgrading would break plain-http local/E2E runs.
          upgradeInsecureRequests: null,
        },
      },
    }),
  );
  app.use(pinoHttp({ logger }));

  const api = express.Router();
  api.use(createApiRateLimiter());
  api.use(requireJsonBody);
  api.use(express.json({ limit: '100kb' }));
  api.use(createHealthRouter(pingDb, logger));
  api.use(apiNotFound);
  app.use('/api/v1', api);
  app.use('/api', apiNotFound);

  if (clientDistDir) app.use(createClientRouter(clientDistDir));

  app.use(createErrorHandler(logger));
  return app;
}
