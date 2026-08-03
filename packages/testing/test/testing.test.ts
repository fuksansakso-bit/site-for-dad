import { describe, expect, it } from 'vitest';

import { createSyntheticFoundationEnvironment, waitForCondition } from '../src/index.js';

describe('PLAN-1A-AC-001 synthetic testing harness', () => {
  it('creates isolated generated credentials without public secret variables', () => {
    const first = createSyntheticFoundationEnvironment({
      databasePort: 55432,
      storagePort: 54569,
      workerHealthPort: 59464,
    });
    const second = createSyntheticFoundationEnvironment({
      databasePort: 55432,
      storagePort: 54569,
      workerHealthPort: 59464,
    });

    expect(first['DATABASE_URL']).not.toBe(second['DATABASE_URL']);
    expect(first['S3_SECRET_ACCESS_KEY']).not.toBe(second['S3_SECRET_ACCESS_KEY']);
    expect(Object.keys(first).filter((key) => key.startsWith('NEXT_PUBLIC_'))).toEqual([
      'NEXT_PUBLIC_APP_ENV',
    ]);
  });

  it('waits only within explicit bounds', async () => {
    let attempts = 0;
    await waitForCondition(
      () => {
        attempts += 1;
        return attempts === 2;
      },
      { intervalMs: 1, timeoutMs: 100 },
    );
    expect(attempts).toBe(2);
  });
});
