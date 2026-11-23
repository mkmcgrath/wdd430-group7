import { apiErrorSchema } from '@keyclashr/shared';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createTestApp } from './test/helpers.js';

describe('GET /api/v1/health', () => {
  it('returns 200 { status: "ok" } when the DB answers', async () => {
    const res = await request(createTestApp()).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns 503 with an error body when the DB is down', async () => {
    const app = createTestApp({ pingDb: () => Promise.reject(new Error('ECONNREFUSED')) });
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(503);
    expect(apiErrorSchema.parse(res.body).error.code).toBe('INTERNAL');
    expect(JSON.stringify(res.body)).not.toContain('ECONNREFUSED');
  });
});

describe('unknown API routes', () => {
  it.each(['/api/v1/nope', '/api/nope', '/api'])('GET %s → JSON 404', async (path) => {
    const res = await request(createTestApp()).get(path);
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(apiErrorSchema.parse(res.body).error.code).toBe('NOT_FOUND');
  });

  it('POST to an unknown route with a JSON body → JSON 404', async () => {
    const res = await request(createTestApp()).post('/api/v1/nope').send({ a: 1 });
    expect(res.status).toBe(404);
  });
});

describe('request bodies', () => {
  it('rejects a non-JSON body with 415', async () => {
    const res = await request(createTestApp())
      .post('/api/v1/health')
      .set('Content-Type', 'text/plain')
      .send('hello');
    expect(res.status).toBe(415);
    expect(apiErrorSchema.parse(res.body).error.code).toBe('UNSUPPORTED_MEDIA_TYPE');
  });

  it('rejects a form-encoded body with 415', async () => {
    const res = await request(createTestApp()).post('/api/v1/nope').type('form').send('a=1');
    expect(res.status).toBe(415);
  });

  it('lets bodyless POSTs through (e.g. logout)', async () => {
    const res = await request(createTestApp()).post('/api/v1/nope');
    expect(res.status).toBe(404);
  });

  it('rejects malformed JSON with 400 VALIDATION_ERROR', async () => {
    const res = await request(createTestApp())
      .post('/api/v1/nope')
      .set('Content-Type', 'application/json')
      .send('{"a":');
    expect(res.status).toBe(400);
    expect(apiErrorSchema.parse(res.body).error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects an oversized body with 400', async () => {
    const res = await request(createTestApp())
      .post('/api/v1/nope')
      .send({ big: 'x'.repeat(200 * 1024) });
    expect(res.status).toBe(400);
    expect(apiErrorSchema.parse(res.body).error.message).toMatch(/too large/);
  });
});

describe('security headers', () => {
  it('sets the CSP from NFR-SEC-4', async () => {
    const res = await request(createTestApp()).get('/api/v1/health');
    const csp = String(res.headers['content-security-policy']);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("connect-src 'self' ws: wss:");
    expect(csp).toContain("img-src 'self' data:");
    expect(csp).toContain("style-src 'self'");
    expect(csp).not.toContain('unsafe-inline');
    expect(csp).not.toContain('upgrade-insecure-requests');
  });

  it('does not advertise Express', async () => {
    const res = await request(createTestApp()).get('/api/v1/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('rate limiting', () => {
  it('sends rate-limit headers on API responses', async () => {
    const res = await request(createTestApp()).get('/api/v1/health');
    expect(res.headers.ratelimit).toBeDefined();
  });
});
