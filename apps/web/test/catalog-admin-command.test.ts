import { describe, expect, it } from 'vitest';

import {
  activateReleaseFormSchema,
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

  it('converts decimal rubles without floating-point arithmetic', () => {
    expect(rublesToMinorUnits('1999,05')).toBe(199_905);
    expect(rublesToMinorUnits('1500')).toBe(150_000);
  });
});
