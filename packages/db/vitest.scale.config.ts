import { defineFoundationTestConfig } from '@project-name/tooling/vitest';

export default defineFoundationTestConfig({
  test: {
    include: ['test/integration/catalog-scale.integration.test.ts'],
    testTimeout: 120_000,
  },
});
