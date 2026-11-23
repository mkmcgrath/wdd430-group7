import type { RequestHandler } from 'express';
import { AppError } from '../errors.js';

const hasBody = (headers: { 'content-length'?: string; 'transfer-encoding'?: string }): boolean =>
  headers['transfer-encoding'] !== undefined ||
  (headers['content-length'] !== undefined && headers['content-length'] !== '0');

/**
 * Any request that carries a body must be `application/json`, otherwise 415 (§13, NFR-SEC-5).
 * Bodyless requests (e.g. `POST /auth/logout`) pass through.
 */
export const requireJsonBody: RequestHandler = (req, _res, next) => {
  if (hasBody(req.headers) && !req.is('application/json')) {
    next(new AppError('UNSUPPORTED_MEDIA_TYPE', 'Content-Type must be application/json'));
    return;
  }
  next();
};
