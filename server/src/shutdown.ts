import type { Server } from 'node:http';
import type { Logger } from './logger.js';

/** Something to close on shutdown, e.g. Socket.IO (T-A-4) or Prisma (T-F-4). */
export type Closer = { name: string; close: () => Promise<void> };

const FORCE_EXIT_AFTER_MS = 10_000;

/**
 * Graceful shutdown (NFR-REL-4): stop accepting connections, run each closer in order,
 * then exit. Forces exit if anything hangs for more than 10 s.
 */
export function registerGracefulShutdown(
  server: Server,
  logger: Logger,
  closers: readonly Closer[] = [],
): (signal: string) => Promise<void> {
  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'shutting down');
    setTimeout(() => {
      logger.error('shutdown timed out, forcing exit');
      process.exit(1);
    }, FORCE_EXIT_AFTER_MS).unref();

    const serverClosed = new Promise<void>((resolve) => {
      server.close((err) => {
        if (err) logger.error({ err }, 'error closing http server');
        resolve();
      });
      server.closeIdleConnections();
    });

    for (const closer of closers) {
      try {
        await closer.close();
      } catch (err: unknown) {
        logger.error({ err, closer: closer.name }, 'error during shutdown');
      }
    }
    await serverClosed;
    logger.info('shutdown complete');
    process.exit(0);
  };

  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.once(signal, () => void shutdown(signal));
  }
  return shutdown;
}
