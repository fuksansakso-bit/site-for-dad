import { describe, expect, it } from 'vitest';

import { StorageError } from '../../src/errors.js';
import {
  assertGrantTtl,
  assertObjectLocator,
  createProviderMetadata,
  validateProviderMetadata,
} from '../../src/validation.js';

describe('object storage boundary validation', () => {
  it('accepts immutable-safe keys and rejects traversal or ambiguous paths', () => {
    expect(() =>
      assertObjectLocator({ key: 'foundation/checks/synthetic.txt', zone: 'private' }),
    ).not.toThrow();

    for (const key of ['/absolute.txt', '../escape.txt', 'a//b.txt', 'a/./b.txt', 'A.txt']) {
      expect(() => assertObjectLocator({ key, zone: 'private' })).toThrowError(StorageError);
    }
  });

  it('enforces short-lived grants', () => {
    expect(() => assertGrantTtl(30, 300)).not.toThrow();
    expect(() => assertGrantTtl(301, 300)).toThrowError(StorageError);
    expect(() => assertGrantTtl(0, 300)).toThrowError(StorageError);
  });

  it('rejects missing, malformed, or cross-zone provider metadata', () => {
    const locator = { key: 'foundation/object.txt', zone: 'private' } as const;
    const metadata = createProviderMetadata('private', 4, 'a'.repeat(64));

    expect(
      validateProviderMetadata(locator, {
        ContentLength: 4,
        ContentType: 'text/plain',
        Metadata: metadata,
      }),
    ).toMatchObject({ contentLength: 4, schemaVersion: 1, zone: 'private' });
    expect(() =>
      validateProviderMetadata(locator, {
        ContentLength: 4,
        ContentType: 'text/plain',
        Metadata: { ...metadata, 'foundation-zone': 'public' },
      }),
    ).toThrowError(StorageError);
  });
});
