import { defineFoundationTestConfig } from '@project-name/tooling/vitest';

export default defineFoundationTestConfig({
  test: {
    include: ['test/integration/**/*.test.ts'],
    testTimeout: 15_000,
  },
});
