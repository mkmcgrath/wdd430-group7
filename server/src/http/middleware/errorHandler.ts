import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { Logger } from '../../logger.js';
import { AppError, apiErrorBody } from '../errors.js';

/** Errors raised by `express.json()` (body-parser) carry a `type` and an HTTP `status`. */
type BodyParserError = { type: string; status: number };

const isBodyParserError = (err: unknown): err is BodyParserError =>
  typeof err === 'object' &&
  err !== null &&
  'type' in err &&
  typeof err.type === 'string' &&
  'status' in err &&
  typeof err.status === 'number';

/** Turns body-parser failures into the matching AppError, or null if it isn't one. */
function fromBodyParserError(err: unknown): AppError | null {
  if (!isBodyParserError(err)) return null;
  switch (err.type) {
    case 'entity.parse.failed':
      return new AppError('VALIDATION_ERROR', 'Request body is not valid JSON');
    case 'entity.too.large':
      return new AppError('VALIDATION_ERROR', 'Request body is too large');
    case 'charset.unsupported':
    case 'encoding.unsupported':
      return new AppError('UNSUPPORTED_MEDIA_TYPE', 'Unsupported request body encoding');
    default:
      return null;
  }
}

/** JSON 404 for any `/api/*` route that doesn't exist (§9). */
export const apiNotFound: RequestHandler = (_req, res) => {
  res.status(404).json(apiErrorBody('NOT_FOUND', 'Route not found'));
};

/**
 * Central error handler (NFR-REL-1). `AppError` → its status and body.
 * Anything else → 500 INTERNAL with a generic message; details go to the log only.
 */
export function createErrorHandler(logger: Logger): ErrorRequestHandler {
  return (err: unknown, req, res, next) => {
    if (res.headersSent) {
      next(err);
      return;
    }
    const appError = err instanceof AppError ? err : fromBodyParserError(err);
    if (appError) {
      res.status(appError.status).json(appError.toBody());
      return;
    }
    logger.error({ err, method: req.method, url: req.originalUrl }, 'unhandled request error');
    res.status(500).json(apiErrorBody('INTERNAL', 'Something went wrong'));
  };
}
