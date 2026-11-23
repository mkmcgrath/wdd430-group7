# Local setup

> **Status:** scaffold only (T-F-1). The full step-by-step guide for Windows, macOS and Linux,
> including the database and troubleshooting, is part of T-C-6.

## Prerequisites

- **Node.js 22** (see `.nvmrc`). With nvm: `nvm install && nvm use`.
- npm (bundled with Node).

## Quick start (what works today)

```sh
nvm use
npm install
cp .env.example .env
npm run dev            # server on http://localhost:3000
```

Check it: `curl http://localhost:3000/api/v1/health` → `{"status":"ok"}`.

## Scripts

| Script                                                      | What it does                                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| `npm run dev`                                               | Server (`tsx watch`) and, once it exists, the Vite client together       |
| `npm run build`                                             | Builds `shared` → `server` → `client`                                    |
| `npm run start:prod`                                        | Runs migrations, then `node server/dist/index.js`                        |
| `npm run lint`                                              | ESLint over the whole repo                                               |
| `npm run typecheck`                                         | `tsc` for every workspace                                                |
| `npm run format` / `format:check`                           | Prettier write / check                                                   |
| `npm run test`                                              | Vitest across all workspaces (`npm run test -- --coverage` for coverage) |
| `npm run test:e2e`                                          | Playwright (added in T-D-3)                                              |
| `npm run db:migrate` / `db:deploy` / `db:seed` / `db:reset` | Prisma (added in T-F-4)                                                  |

## How `shared` is resolved

`shared/package.json` exports a custom condition, `@keyclashr/source`, that points at
`shared/src/index.ts`. Typecheck, Vitest and `npm run dev` (tsx) use it, so changes in `shared/`
show up immediately without a rebuild. The production build ignores the condition and compiles
against `shared/dist`, which is why `npm run build` builds `shared` first.

## Pinned versions

Exact versions are locked in `package-lock.json`. Recorded at scaffold time (2026-11-23):

| Package                   | Version         | Notes                                                                          |
| ------------------------- | --------------- | ------------------------------------------------------------------------------ |
| Node.js                   | 22.x            | `.nvmrc`, `engines`                                                            |
| typescript                | 6.0.3           | TS 7 is out, but `typescript-eslint` 8 only supports TypeScript `<6.1`         |
| eslint                    | 9.39.5          | ESLint 10 is out, but `eslint-plugin-jsx-a11y` 6.10 only supports ESLint `<=9` |
| typescript-eslint         | 8.74.0          |                                                                                |
| eslint-plugin-jsx-a11y    | 6.10.2          |                                                                                |
| eslint-plugin-react-hooks | 7.1.1           |                                                                                |
| prettier                  | 3.10.1          |                                                                                |
| vitest (+ coverage-v8)    | 5.1.1           |                                                                                |
| zod                       | 4.6.7           |                                                                                |
| express                   | 5.3.0           |                                                                                |
| helmet                    | 8.3.0           |                                                                                |
| express-rate-limit        | 8.7.5           |                                                                                |
| pino / pino-http          | 10.4.0 / 11.0.0 |                                                                                |
| supertest                 | 7.3.2           |                                                                                |
| tsx                       | 4.23.15         |                                                                                |

Client, Prisma and Playwright versions are added by T-F-5, T-F-4 and T-D-3.
