import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: { 'server-only': resolve(import.meta.dirname, 'test/server-only.ts') },
  },
  test: {
    clearMocks: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    passWithNoTests: false,
    restoreMocks: true,
  },
});
