import { DEFAULT_RACE_TIMINGS } from '@keyclashr/shared';
import { describe, expect, it } from 'vitest';
import { EnvError, loadEnv, raceTimingsFromEnv } from './env.js';

const DB = 'postgresql://postgres:postgres@localhost:5432/keyclashr';
const minimal = { NODE_ENV: 'development', DATABASE_URL: DB, DIRECT_URL: DB };

describe('loadEnv', () => {
  it('applies defaults for optional vars', () => {
    const env = loadEnv(minimal);
    expect(env.PORT).toBe(3000);
    expect(env.LOG_LEVEL).toBe('info');
    expect(raceTimingsFromEnv(env)).toEqual(DEFAULT_RACE_TIMINGS);
  });

  it('coerces numeric overrides', () => {
    const env = loadEnv({
      ...minimal,
      PORT: '8080',
      RACE_COUNTDOWN_MS: '500',
      DISCONNECT_GRACE_MS: '2000',
      RACE_TIME_CAP_MS: '20000',
    });
    expect(env.PORT).toBe(8080);
    expect(raceTimingsFromEnv(env)).toMatchObject({
      countdownMs: 500,
      disconnectGraceMs: 2000,
      raceTimeCapMs: 20_000,
    });
  });

  it('accepts the postgres:// scheme too', () => {
    expect(() => loadEnv({ ...minimal, DATABASE_URL: 'postgres://u:p@h:5432/db' })).not.toThrow();
  });

  it('fails when required vars are missing, naming each one', () => {
    expect(() => loadEnv({})).toThrow(EnvError);
    expect(() => loadEnv({})).toThrow(/NODE_ENV is required[\s\S]*DATABASE_URL is required/);
  });

  it('never includes the bad value in the error message', () => {
    const secret = 'mysql://admin:hunter2@db:3306/x';
    try {
      loadEnv({ ...minimal, DATABASE_URL: secret });
      expect.unreachable();
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(EnvError);
      expect(String(err)).toContain('DATABASE_URL is invalid');
      expect(String(err)).not.toContain('hunter2');
    }
  });

  it.each([
    ['NODE_ENV', 'staging'],
    ['PORT', 'abc'],
    ['LOG_LEVEL', 'verbose'],
    ['RACE_TIME_CAP_MS', '-5'],
  ])('rejects %s=%s', (name, value) => {
    expect(() => loadEnv({ ...minimal, [name]: value })).toThrow(`${name} is invalid`);
  });
});
