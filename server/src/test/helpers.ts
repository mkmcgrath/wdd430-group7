import type { Express } from 'express';
import { createApp, type AppOptions } from '../app.js';
import { createLogger } from '../logger.js';

export const silentLogger = createLogger('silent');

/** App with test defaults; override any option per test. */
export const createTestApp = (overrides: Partial<AppOptions> = {}): Express =>
  createApp({
    logger: silentLogger,
    pingDb: () => Promise.resolve(),
    trustProxy: false,
    ...overrides,
  });
