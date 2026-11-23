import { pino, type Logger, type LevelWithSilent } from 'pino';

export type { Logger };

/** Paths that must never be logged (§10: no passwords, tokens or cookies). */
const REDACT_PATHS = [
  'req.headers.cookie',
  'req.headers.authorization',
  'res.headers["set-cookie"]',
  'password',
  '*.password',
  'seatToken',
  '*.seatToken',
  'token',
  '*.token',
];

export function createLogger(level: LevelWithSilent): Logger {
  return pino({
    level,
    redact: { paths: REDACT_PATHS, censor: '[redacted]' },
  });
}
