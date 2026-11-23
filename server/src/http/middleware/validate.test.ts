import { apiErrorSchema, raceIdParamsSchema, statsQuerySchema } from '@keyclashr/shared';
import express, { Router } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { silentLogger } from '../../test/helpers.js';
import { createErrorHandler } from './errorHandler.js';
import { validate, type ValidatedResponse } from './validate.js';

const bodySchema = z.object({ name: z.string().min(3), count: z.int() });

function buildApp() {
  const router = Router();

  const statsSchemas = { query: statsQuerySchema };
  router.get(
    '/stats',
    validate(statsSchemas),
    (_req, res: ValidatedResponse<typeof statsSchemas>) => {
      // Typed: range is '7d' | '30d' | 'all', defaults applied.
      const { range, mode } = res.locals.validated.query;
      res.json({ range, mode });
    },
  );

  const raceSchemas = { params: raceIdParamsSchema };
  router.get(
    '/races/:id',
    validate(raceSchemas),
    (_req, res: ValidatedResponse<typeof raceSchemas>) => {
      res.json({ id: res.locals.validated.params.id });
    },
  );

  const bodySchemas = { body: bodySchema };
  router.post(
    '/things',
    validate(bodySchemas),
    (_req, res: ValidatedResponse<typeof bodySchemas>) => {
      const { name, count } = res.locals.validated.body;
      res.status(201).json({ name, count });
    },
  );

  const app = express();
  app.use(express.json());
  app.use(router);
  app.use(createErrorHandler(silentLogger));
  return app;
}

describe('validate()', () => {
  it('parses the query with defaults applied', async () => {
    const res = await request(buildApp()).get('/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ range: '30d', mode: 'all' });
  });

  it('rejects an invalid query with 400 and the field name', async () => {
    const res = await request(buildApp()).get('/stats?range=1y');
    expect(res.status).toBe(400);
    const body = apiErrorSchema.parse(res.body);
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.details).toEqual({ field: 'range' });
  });

  it('validates route params (bad uuid → 400, never 500)', async () => {
    const ok = await request(buildApp()).get('/races/6f1c3d2e-8a4b-4c5d-9e6f-7a8b9c0d1e2f');
    expect(ok.status).toBe(200);
    const bad = await request(buildApp()).get('/races/not-a-uuid');
    expect(bad.status).toBe(400);
    expect(apiErrorSchema.parse(bad.body).error.details).toEqual({ field: 'id' });
  });

  it('validates the body', async () => {
    const ok = await request(buildApp()).post('/things').send({ name: 'abc', count: 2 });
    expect(ok.status).toBe(201);
    expect(ok.body).toEqual({ name: 'abc', count: 2 });

    const bad = await request(buildApp()).post('/things').send({ name: 'ab', count: 2 });
    expect(bad.status).toBe(400);
    expect(apiErrorSchema.parse(bad.body).error.details).toEqual({ field: 'name' });
  });

  it('rejects a missing body', async () => {
    const res = await request(buildApp()).post('/things');
    expect(res.status).toBe(400);
  });
});
