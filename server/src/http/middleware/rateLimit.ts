import { API_RATE_LIMIT_PER_MIN, RATE_LIMIT_WINDOW_MS } from '@keyclashr/shared';
import { rateLimit, type RateLimitRequestHandler } from 'express-rate-limit';
import { apiErrorBody } from '../errors.js';

/** Builds a per-IP limiter that answers with the standard `RATE_LIMITED` error body. */
export function createRateLimiter(
  limitPerWindow: number,
  message: string,
): RateLimitRequestHandler {
  return rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    limit: limitPerWindow,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(429).json(apiErrorBody('RATE_LIMITED', message));
    },
  });
}

/** All `/api` routes: 300 requests/min/IP (NFR-SEC-3). */
export const createApiRateLimiter = (): RateLimitRequestHandler =>
  createRateLimiter(API_RATE_LIMIT_PER_MIN, 'Too many requests, try again in a minute');
