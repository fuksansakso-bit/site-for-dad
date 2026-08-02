import { defineFoundationTestConfig } from '@project-name/tooling/vitest';

export default defineFoundationTestConfig({
  test: {
    fileParallelism: false,
    include: ['test/integration/**/*.integration.test.ts'],
    testTimeout: 30_000,
  },
});
