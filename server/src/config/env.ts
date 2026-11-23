import { DEFAULT_RACE_TIMINGS, type RaceTimings } from '@keyclashr/shared';
import { z } from 'zod';

const positiveIntWithDefault = (fallback: number) =>
  z.coerce.number().int().positive().default(fallback);

/** `process.env` schema (§18.3). The server refuses to start if this fails (NFR-SEC-8). */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  DIRECT_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  RACE_COUNTDOWN_MS: positiveIntWithDefault(DEFAULT_RACE_TIMINGS.countdownMs),
  RACE_TIME_CAP_MS: positiveIntWithDefault(DEFAULT_RACE_TIMINGS.raceTimeCapMs),
  DISCONNECT_GRACE_MS: positiveIntWithDefault(DEFAULT_RACE_TIMINGS.disconnectGraceMs),
  ROOM_IDLE_TIMEOUT_MS: positiveIntWithDefault(DEFAULT_RACE_TIMINGS.roomIdleTimeoutMs),
});

export type Env = z.infer<typeof envSchema>;

export class EnvError extends Error {
  override readonly name = 'EnvError';
}

/**
 * Parses env vars. Throws an `EnvError` listing every bad variable by name only,
 * never by value, so secrets like DATABASE_URL don't end up in logs.
 */
export function loadEnv(source: Readonly<Record<string, string | undefined>> = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (parsed.success) return parsed.data;
  const problems = parsed.error.issues.map((issue) => {
    const name = issue.path.join('.');
    return source[name] === undefined ? `${name} is required` : `${name} is invalid`;
  });
  throw new EnvError(`Invalid environment configuration:\n  - ${problems.join('\n  - ')}`);
}

export const raceTimingsFromEnv = (env: Env): RaceTimings => ({
  countdownMs: env.RACE_COUNTDOWN_MS,
  raceTimeCapMs: env.RACE_TIME_CAP_MS,
  disconnectGraceMs: env.DISCONNECT_GRACE_MS,
  roomIdleTimeoutMs: env.ROOM_IDLE_TIMEOUT_MS,
});
