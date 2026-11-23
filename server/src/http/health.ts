import { Router } from 'express';
import type { Logger } from '../logger.js';
import { AppError } from './errors.js';

/** Resolves if the database answers `SELECT 1`; rejects otherwise. */
export type PingDb = () => Promise<void>;

/** `GET /api/v1/health` → 200 `{ status: 'ok' }`, or 503 if the DB is down (§13.2). */
export function createHealthRouter(pingDb: PingDb, logger: Logger): Router {
  const router = Router();
  router.get('/health', async (_req, res) => {
    try {
      await pingDb();
    } catch (err: unknown) {
      logger.warn({ err }, 'health check: database unreachable');
      throw new AppError('INTERNAL', 'Database unavailable', undefined, 503);
    }
    res.status(200).json({ status: 'ok' });
  });
  return router;
}
