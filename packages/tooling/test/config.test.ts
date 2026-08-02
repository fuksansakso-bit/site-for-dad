import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { foundationTestDefaults } from '../src/vitest.js';

describe('shared tooling configuration', () => {
  it('keeps the TypeScript baseline strict and fail-safe', async () => {
    const rawConfig = await readFile(new URL('../tsconfig/base.json', import.meta.url), 'utf8');
    const config = JSON.parse(rawConfig) as {
      compilerOptions?: Record<string, unknown>;
    };

    expect(config.compilerOptions).toMatchObject({
      exactOptionalPropertyTypes: true,
      noUncheckedIndexedAccess: true,
      strict: true,
      useUnknownInCatchVariables: true,
    });
  });

  it('keeps tests isolated by default', () => {
    expect(foundationTestDefaults.test).toMatchObject({
      clearMocks: true,
      passWithNoTests: false,
      restoreMocks: true,
      unstubEnvs: true,
      unstubGlobals: true,
    });
  });
});
