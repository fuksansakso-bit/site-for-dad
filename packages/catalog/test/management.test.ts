import { describe, expect, it } from 'vitest';

import {
  CatalogManagementError,
  assertBusinessOverlayInput,
  assertCatalogVersionCommand,
  assertLocalPriceOverrideInput,
} from '../src/management.js';

const context = {
  actorId: '00000000-0000-4000-8000-000000000201',
  correlationId: 'catalog-management-unit-001',
} as const;

describe('catalog business management contracts', () => {
  it('accepts explicit inquiry-only publication without inventing availability', () => {
    expect(() =>
      assertBusinessOverlayInput({
        ...context,
        availabilityReason: 'Manager confirmation is required.',
        availabilityStatus: 'INQUIRY_ONLY',
        entityId: '00000000-0000-4000-8000-000000000301',
        entityType: 'MATERIAL_VARIANT',
        localOrder: 10,
        manualReviewState: 'APPROVED',
        publicationReason: 'Owner-approved Phase 1B.2 catalog composition.',
        publicationStatus: 'PUBLISHED',
        visibility: 'VISIBLE',
      }),
    ).not.toThrow();
  });

  it('rejects zero, guessed or invalid local price overrides', () => {
    expect(() =>
      assertLocalPriceOverrideInput({
        ...context,
        amountMinor: 0,
        businessCatalogEntryId: '00000000-0000-4000-8000-000000000301',
        currency: 'RUB',
        effectiveFrom: '2026-08-03T00:00:00.000Z',
        reason: 'Invalid zero override.',
      }),
    ).toThrow(CatalogManagementError);
  });

  it('accepts the discovered full catalog while retaining a defensive upper bound', () => {
    expect(() =>
      assertCatalogVersionCommand({
        ...context,
        catalogSourceId: '00000000-0000-4000-8000-000000000103',
        catalogVersionId: '00000000-0000-4000-8000-000000000302',
        expectedCatalogDifferenceChecksum: 'a'.repeat(64),
        expectedVariantCount: 1_655,
        syncRunId: '00000000-0000-4000-8000-000000000301',
      }),
    ).not.toThrow();
    expect(() =>
      assertCatalogVersionCommand({
        ...context,
        catalogSourceId: '00000000-0000-4000-8000-000000000103',
        catalogVersionId: '00000000-0000-4000-8000-000000000302',
        expectedCatalogDifferenceChecksum: 'a'.repeat(64),
        expectedVariantCount: 100_001,
        syncRunId: '00000000-0000-4000-8000-000000000301',
      }),
    ).toThrow(CatalogManagementError);
  });
});
