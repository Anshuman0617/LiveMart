import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.js'],
    coverage: {
      exclude: [
        'node_modules/**',
        'server/uploads/**',
      ],
    },
  },
});

