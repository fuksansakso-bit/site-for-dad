import { defineFoundationTestConfig } from './src/vitest.js';

export default defineFoundationTestConfig({
  test: {
    include: ['test/**/*.test.ts'],
  },
});
