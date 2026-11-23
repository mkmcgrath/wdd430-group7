import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestApp } from '../test/helpers.js';

let distDir: string;

beforeAll(() => {
  distDir = mkdtempSync(path.join(tmpdir(), 'kc-dist-'));
  mkdirSync(path.join(distDir, 'assets'));
  writeFileSync(path.join(distDir, 'index.html'), '<!doctype html><title>KeyClashr</title>');
  writeFileSync(path.join(distDir, 'assets', 'index-abc123.js'), 'console.log(1)');
  writeFileSync(path.join(distDir, 'robots.txt'), 'User-agent: *');
});

afterAll(() => {
  rmSync(distDir, { recursive: true, force: true });
});

const app = () => createTestApp({ clientDistDir: distDir });

describe('client static serving', () => {
  it('serves hashed assets with an immutable 1-year cache', async () => {
    const res = await request(app()).get('/assets/index-abc123.js');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
  });

  it('serves other public files with no-cache', async () => {
    const res = await request(app()).get('/robots.txt');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-cache');
  });

  it('returns 404 (not index.html) for a missing asset', async () => {
    const res = await request(app()).get('/assets/missing-xyz.js');
    expect(res.status).toBe(404);
    expect(res.text).not.toContain('<title>KeyClashr</title>');
  });
});

describe('SPA fallback', () => {
  it.each(['/', '/practice', '/r/ABC234', '/races/6f1c3d2e-8a4b-4c5d-9e6f-7a8b9c0d1e2f', '/nope'])(
    'GET %s → index.html with no-cache',
    async (route) => {
      const res = await request(app()).get(route);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/html/);
      expect(res.headers['cache-control']).toBe('no-cache');
      expect(res.text).toContain('<title>KeyClashr</title>');
    },
  );

  it('still returns JSON 404 for unknown /api routes', async () => {
    const res = await request(app()).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });

  it('does not serve index.html for non-GET requests', async () => {
    const res = await request(app()).delete('/practice');
    expect(res.status).toBe(404);
  });
});
