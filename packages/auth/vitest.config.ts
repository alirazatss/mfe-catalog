import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: '@mf-mono/auth',
    environment: 'happy-dom',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
      exclude: [
        'dist/**',
        'node_modules/**',
        '**/*.test.ts',
        '**/*.config.ts',
        '**/test/**',
      ],
    },
  },
});
