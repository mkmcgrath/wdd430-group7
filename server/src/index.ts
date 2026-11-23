import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { EnvError, loadEnv, type Env } from './config/env.js';
import type { PingDb } from './http/health.js';
import { createLogger } from './logger.js';
import { registerGracefulShutdown } from './shutdown.js';

function readEnvOrExit(): Env {
  try {
    return loadEnv();
  } catch (err: unknown) {
    // Fail fast (NFR-SEC-8). The message names bad variables but never their values.
    console.error(err instanceof EnvError ? err.message : err);
    process.exit(1);
  }
}

const env = readEnvOrExit();
const logger = createLogger(env.LOG_LEVEL);

// TODO(T-F-4): replace with a Prisma `SELECT 1` once server/src/db/prisma.ts exists.
// Until then /health reports ok without touching the database.
const pingDb: PingDb = () => Promise.resolve();

// Same relative path from src/ (tsx) and dist/ (node): server/<src|dist>/ → client/dist
const clientDistDir = fileURLToPath(new URL('../../client/dist', import.meta.url));
const hasClientBuild = existsSync(clientDistDir);
if (!hasClientBuild && env.NODE_ENV === 'production') {
  logger.warn({ clientDistDir }, 'client build not found; only the API will be served');
}

const app = createApp({
  logger,
  pingDb,
  trustProxy: env.NODE_ENV === 'production',
  ...(hasClientBuild ? { clientDistDir } : {}),
});

const server = createServer(app);
registerGracefulShutdown(server, logger);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'server listening');
});
