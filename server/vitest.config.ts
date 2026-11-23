import { defineProject } from 'vitest/config';

export default defineProject({
  resolve: { conditions: ['@keyclashr/source'] },
  ssr: { resolve: { conditions: ['@keyclashr/source'] } },
  test: {
    name: 'server',
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
