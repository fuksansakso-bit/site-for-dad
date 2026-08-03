import { describe, expect, it } from 'vitest';

import {
  activateReleaseFormSchema,
  composePublicationFormSchema,
  parseCatalogBulkPreviewForm,
  parseReviewDifferencesForm,
  preparePublicationFormSchema,
  rublesToMinorUnits,
} from '../lib/catalog-admin-command';

const release = {
  catalogDifferenceChecksum: 'a'.repeat(64),
  catalogSourceId: '00000000-0000-4000-8000-000000000103',
  catalogVersionId: '00000000-0000-4000-8000-000000000104',
  expectedVariantCount: '32',
  priceDifferenceChecksum: 'b'.repeat(64),
  priceVersionId: '00000000-0000-4000-8000-000000000105',
  syncRunId: '00000000-0000-4000-8000-000000000106',
};

describe('catalog admin commands', () => {
  it('binds publication confirmation to the exact impact count', () => {
    expect(
      preparePublicationFormSchema.safeParse({ ...release, confirmation: 'ПОДГОТОВИТЬ 31' })
        .success,
    ).toBe(false);
    expect(
      preparePublicationFormSchema.safeParse({ ...release, confirmation: 'ПОДГОТОВИТЬ 32' })
        .success,
    ).toBe(true);
  });

  it('requires an exact activation confirmation and paired price evidence', () => {
    expect(
      activateReleaseFormSchema.safeParse({
        ...release,
        confirmation: 'АКТИВИРОВАТЬ',
        reason: 'Reviewed exact pilot release.',
      }).success,
    ).toBe(true);
    expect(
      activateReleaseFormSchema.safeParse({
        ...release,
        confirmation: 'АКТИВИРОВАТЬ',
        priceDifferenceChecksum: '',
        reason: 'Reviewed exact pilot release.',
      }).success,
    ).toBe(false);
  });

  it('keeps preparation separate from immutable composition', () => {
    expect(
      composePublicationFormSchema.safeParse({
        ...release,
        confirmation: 'ЗАФИКСИРОВАТЬ 32',
      }).success,
    ).toBe(true);
    expect(
      composePublicationFormSchema.safeParse({
        ...release,
        confirmation: 'ПОДГОТОВИТЬ 32',
      }).success,
    ).toBe(false);
  });

  it('binds selected diff review to the exact submitted ids and count', () => {
    const form = new FormData();
    for (const [key, value] of Object.entries(release)) form.set(key, value);
    form.set('confirmation', 'ПРОВЕРИТЬ 2');
    form.set('expectedCount', '2');
    form.set('reason', 'Reviewed two exact catalog differences.');
    form.set('resolution', 'APPROVED');
    form.set('scope', 'CATALOG');
    form.set('selectionMode', 'SELECTED');
    form.append('differenceId', '00000000-0000-4000-8000-000000000111');
    form.append('differenceId', '00000000-0000-4000-8000-000000000112');

    expect(parseReviewDifferencesForm(form).differenceIds).toHaveLength(2);
    form.set('expectedCount', '3');
    expect(() => parseReviewDifferencesForm(form)).toThrow();
  });

  it('constructs only an allowlisted candidate-bound bulk selector and patch', () => {
    const form = new FormData();
    form.set('catalogDifferenceChecksum', 'c'.repeat(64));
    form.set('catalogSourceId', release.catalogSourceId);
    form.set('catalogVersionId', release.catalogVersionId);
    form.set('categoryId', '00000000-0000-4000-8000-000000000121');
    form.set('filterAvailability', '');
    form.set('filterCategoryId', '');
    form.set('filterPrice', '');
    form.set('filterPublication', '');
    form.set('filterReview', '');
    form.set('filterSystemId', '');
    form.set('filterVisibility', '');
    form.set('patchAvailability', 'INQUIRY_ONLY');
    form.set('patchPublication', 'PUBLISHED');
    form.set('patchReview', 'APPROVED');
    form.set('patchVisibility', 'VISIBLE');
    form.set('reason', 'Owner confirmed the full category publication defaults.');
    form.set('selectorMode', 'CATEGORY');
    form.set('syncRunId', release.syncRunId);

    expect(parseCatalogBulkPreviewForm(form)).toMatchObject({
      patch: {
        availabilityStatus: 'INQUIRY_ONLY',
        manualReviewState: 'APPROVED',
        publicationStatus: 'PUBLISHED',
        visibility: 'VISIBLE',
      },
      selector: {
        categoryId: '00000000-0000-4000-8000-000000000121',
        mode: 'CATEGORY',
      },
    });
    form.set('patchAvailability', '');
    form.set('patchPublication', '');
    form.set('patchReview', '');
    form.set('patchVisibility', '');
    expect(() => parseCatalogBulkPreviewForm(form)).toThrow();
  });

  it('converts decimal rubles without floating-point arithmetic', () => {
    expect(rublesToMinorUnits('1999,05')).toBe(199_905);
    expect(rublesToMinorUnits('1500')).toBe(150_000);
  });
});
