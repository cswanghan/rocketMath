import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/engine/**/*.ts', 'src/practice/**/*.ts'],
      exclude: [
        'src/engine/**/*.test.ts',
        'src/engine/index.ts',
        'src/engine/types.ts',
        'src/engine/__fixtures__/**',
        'src/practice/**/*.test.ts',
        'src/practice/index.ts',
        'src/practice/types.ts',
      ],
      thresholds: {
        statements: 90,
        branches: 90,
        functions: 90,
        lines: 90,
      },
    },
  },
});
