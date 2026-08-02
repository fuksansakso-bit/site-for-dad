import { defineFoundationTestConfig } from '@project-name/tooling/vitest';

export default defineFoundationTestConfig({
  test: {
    include: ['test/unit/**/*.test.ts'],
  },
});
