import { defineFoundationTestConfig } from '@project-name/tooling/vitest';

export default defineFoundationTestConfig({
  test: {
    include: ['test/integration/**/*.integration.test.ts'],
    testTimeout: 10_000,
  },
});
