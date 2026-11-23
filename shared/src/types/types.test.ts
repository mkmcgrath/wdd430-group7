import { describe, expect, it } from 'vitest';
import { apiErrorSchema, isErrorCode } from './errors.js';
import { err, ok, type Result } from './result.js';

describe('Result helpers', () => {
  it('ok() wraps data', () => {
    const result: Result<number> = ok(5);
    expect(result).toEqual({ ok: true, data: 5 });
  });

  it('err() wraps a code and message', () => {
    const result: Result<number, 'ROOM_FULL'> = err(
      'ROOM_FULL',
      'This race already has two players',
    );
    expect(result).toEqual({
      ok: false,
      error: { code: 'ROOM_FULL', message: 'This race already has two players' },
    });
  });
});

describe('isErrorCode', () => {
  it('recognises REST and socket codes', () => {
    expect(isErrorCode('VALIDATION_ERROR')).toBe(true);
    expect(isErrorCode('ROOM_NOT_FOUND')).toBe(true);
    expect(isErrorCode('TEAPOT')).toBe(false);
    expect(isErrorCode(404)).toBe(false);
  });
});

describe('apiErrorSchema', () => {
  it('accepts the §13.1 error envelope with optional details', () => {
    expect(
      apiErrorSchema.safeParse({
        error: { code: 'CONFLICT', message: 'Taken', details: { field: 'username' } },
      }).success,
    ).toBe(true);
    expect(
      apiErrorSchema.safeParse({ error: { code: 'NOT_FOUND', message: 'Nope' } }).success,
    ).toBe(true);
  });

  it('rejects unknown codes and bare messages', () => {
    expect(apiErrorSchema.safeParse({ error: { code: 'OOPS', message: 'x' } }).success).toBe(false);
    expect(apiErrorSchema.safeParse({ message: 'x' }).success).toBe(false);
  });
});
