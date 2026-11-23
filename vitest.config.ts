import { defineConfig } from 'vitest/config';

// Each workspace has its own vitest.config.ts; this file just runs them together
// so `npm run test -- --coverage` covers the whole repo (§17, §18.1).
export default defineConfig({
  test: {
    projects: ['*/vitest.config.ts'],
    coverage: {
      provider: 'v8',
      include: ['shared/src/**', 'server/src/**', 'client/src/**'],
      exclude: ['**/*.test.ts', '**/*.test.tsx'],
      reporter: ['text-summary', 'text', 'html'],
    },
  },
});
