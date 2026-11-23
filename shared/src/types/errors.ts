import { z } from 'zod';

/** Error codes used by REST responses (§13.1). */
export const HTTP_ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'UNSUPPORTED_MEDIA_TYPE',
  'RATE_LIMITED',
  'INTERNAL',
] as const;

/** Error codes used only by Socket.IO events (§13.1). */
export const SOCKET_ERROR_CODES = [
  'ROOM_NOT_FOUND',
  'ROOM_FULL',
  'RACE_IN_PROGRESS',
  'ALREADY_IN_ROOM',
  'INVALID_SEAT_TOKEN',
  'NOT_IN_ROOM',
  'INVALID_PAYLOAD',
  'SERVER_BUSY',
] as const;

export const errorCodeSchema = z.enum([...HTTP_ERROR_CODES, ...SOCKET_ERROR_CODES]);

export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type HttpErrorCode = (typeof HTTP_ERROR_CODES)[number];
export type SocketErrorCode = (typeof SOCKET_ERROR_CODES)[number];

export const apiErrorSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    details: z.record(z.string(), z.string()).optional(),
  }),
});

/** Body of every non-2xx REST response (§13.1). */
export type ApiError = z.infer<typeof apiErrorSchema>;

export const isErrorCode = (value: unknown): value is ErrorCode =>
  errorCodeSchema.safeParse(value).success;
