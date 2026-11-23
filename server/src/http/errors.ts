import type { ApiError, HttpErrorCode } from '@keyclashr/shared';

/** HTTP status for each REST error code (§13.1). */
export const HTTP_STATUS: Readonly<Record<HttpErrorCode, number>> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNSUPPORTED_MEDIA_TYPE: 415,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

type ErrorDetails = Record<string, string>;

/**
 * An expected, client-facing error. Throw it from routes/services; the central
 * error handler turns it into an `ApiError` response with the mapped status.
 */
export class AppError extends Error {
  override readonly name = 'AppError';
  readonly status: number;

  constructor(
    readonly code: HttpErrorCode,
    message: string,
    readonly details?: ErrorDetails,
    /** Override the default status for this code (e.g. 503 for INTERNAL on /health). */
    status?: number,
  ) {
    super(message);
    this.status = status ?? HTTP_STATUS[code];
  }

  toBody(): ApiError {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}

export const apiErrorBody = (code: HttpErrorCode, message: string): ApiError => ({
  error: { code, message },
});
