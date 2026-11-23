import path from 'node:path';
import express, { Router, type Response } from 'express';

const IMMUTABLE = 'public, max-age=31536000, immutable';
const NO_CACHE = 'no-cache';

/** Vite writes content-hashed files to `dist/assets/`; only those are safe to cache forever. */
const isHashedAsset = (filePath: string, distDir: string): boolean =>
  path.relative(distDir, filePath).split(path.sep)[0] === 'assets';

/**
 * Serves the built client (NFR-PERF-5) plus the SPA fallback (§9): any GET that is not
 * `/api/*` and doesn't look like a file gets `index.html`. Missing files get a plain 404.
 */
export function createClientRouter(distDir: string): Router {
  const router = Router();
  const indexHtml = path.join(distDir, 'index.html');

  router.use(
    express.static(distDir, {
      index: false,
      setHeaders: (res: Response, filePath: string) => {
        res.setHeader('Cache-Control', isHashedAsset(filePath, distDir) ? IMMUTABLE : NO_CACHE);
      },
    }),
  );

  router.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api/') || req.path === '/api' || path.extname(req.path) !== '') {
      next();
      return;
    }
    res.setHeader('Cache-Control', NO_CACHE);
    res.sendFile(indexHtml, (err: unknown) => {
      if (err) next(err);
    });
  });

  return router;
}
