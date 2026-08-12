import { describe, expect, it } from 'vitest';

import {
  CatalogReadError,
  assertCatalogAdminDifferenceQuery,
  assertCatalogAdminVariantQuery,
} from '../src/index.js';

const categoryId = '00000000-0000-4000-8000-000000000701';
const systemId = '00000000-0000-4000-8000-000000000702';
const runId = '00000000-0000-4000-8000-000000000703';

describe('full catalog admin read queries', () => {
  it('normalizes exact full-catalog variant filters and bounded pagination', () => {
    expect(
      assertCatalogAdminVariantQuery({
        availability: 'INQUIRY_ONLY',
        categoryId,
        limit: 50,
        media: 'READY',
        offset: 1_650,
        price: 'PRICE_ON_REQUEST',
        publication: 'PUBLISHED',
        query: '  blackout  ',
        review: 'APPROVED',
        sourceStatus: 'ACTIVE',
        systemId,
        visibility: 'VISIBLE',
      }),
    ).toEqual({
      availability: 'INQUIRY_ONLY',
      categoryId,
      limit: 50,
      media: 'READY',
      offset: 1_650,
      price: 'PRICE_ON_REQUEST',
      publication: 'PUBLISHED',
      query: 'blackout',
      review: 'APPROVED',
      sourceStatus: 'ACTIVE',
      state: 'ALL',
      systemId,
      visibility: 'VISIBLE',
    });
  });

  it('rejects untyped filters, invalid identifiers and unbounded offsets', () => {
    expect(() => assertCatalogAdminVariantQuery({ categoryId: 'all', offset: 100_001 })).toThrow(
      CatalogReadError,
    );
    expect(() => assertCatalogAdminVariantQuery({ media: 'READY OR TRUE' as 'READY' })).toThrow(
      CatalogReadError,
    );
  });

  it('normalizes a safe difference page bound to one exact run', () => {
    expect(
      assertCatalogAdminDifferenceQuery({
        limit: 100,
        offset: 200,
        resolution: 'DEFERRED',
        scope: 'PRICE',
        syncRunId: runId,
        type: 'PRICE_CHANGED',
      }),
    ).toEqual({
      limit: 100,
      offset: 200,
      resolution: 'DEFERRED',
      scope: 'PRICE',
      syncRunId: runId,
      type: 'PRICE_CHANGED',
    });
    expect(() =>
      assertCatalogAdminDifferenceQuery({ scope: 'RAW' as 'ALL', syncRunId: 'latest' }),
    ).toThrow(CatalogReadError);
  });
});
