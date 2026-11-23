import { apiErrorSchema } from '@keyclashr/shared';
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { silentLogger } from '../../test/helpers.js';
import { AppError } from '../errors.js';
import { createErrorHandler } from './errorHandler.js';

function appThatThrows(error: unknown) {
  const app = express();
  app.get('/sync', () => {
    throw error;
  });
  app.get('/async', async () => {
    await Promise.resolve();
    throw error;
  });
  app.use(createErrorHandler(silentLogger));
  return app;
}

describe('createErrorHandler', () => {
  it.each([
    ['VALIDATION_ERROR', 400],
    ['UNAUTHORIZED', 401],
    ['FORBIDDEN', 403],
    ['NOT_FOUND', 404],
    ['CONFLICT', 409],
    ['UNSUPPORTED_MEDIA_TYPE', 415],
    ['RATE_LIMITED', 429],
    ['INTERNAL', 500],
  ] as const)('maps AppError %s to %i', async (code, status) => {
    const res = await request(appThatThrows(new AppError(code, 'msg'))).get('/sync');
    expect(res.status).toBe(status);
    expect(res.body).toEqual({ error: { code, message: 'msg' } });
  });

  it('includes details when given', async () => {
    const error = new AppError('CONFLICT', 'Username is taken', { field: 'username' });
    const res = await request(appThatThrows(error)).get('/sync');
    expect(res.body).toEqual({
      error: { code: 'CONFLICT', message: 'Username is taken', details: { field: 'username' } },
    });
  });

  it('honours a status override', async () => {
    const error = new AppError('INTERNAL', 'Database unavailable', undefined, 503);
    const res = await request(appThatThrows(error)).get('/sync');
    expect(res.status).toBe(503);
  });

  it('handles errors thrown from async handlers (Express 5)', async () => {
    const res = await request(appThatThrows(new AppError('NOT_FOUND', 'x'))).get('/async');
    expect(res.status).toBe(404);
  });

  it('hides unexpected errors behind a generic 500 with no stack trace', async () => {
    const res = await request(appThatThrows(new Error('secret db detail'))).get('/sync');
    expect(res.status).toBe(500);
    const body = apiErrorSchema.parse(res.body);
    expect(body.error).toEqual({ code: 'INTERNAL', message: 'Something went wrong' });
    expect(res.text).not.toContain('secret db detail');
    expect(res.text).not.toContain('at ');
  });

  it('treats thrown non-Error values as 500', async () => {
    const res = await request(appThatThrows('a string')).get('/sync');
    expect(res.status).toBe(500);
  });
});
