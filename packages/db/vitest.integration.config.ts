import { defineFoundationTestConfig } from '@project-name/tooling/vitest';

export default defineFoundationTestConfig({
  test: {
    exclude: ['test/integration/catalog-scale.integration.test.ts'],
    include: ['test/integration/**/*.test.ts'],
    testTimeout: 15_000,
  },
});
