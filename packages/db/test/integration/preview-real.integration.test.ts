import { createHash, randomUUID } from 'node:crypto';

import { parseDatabaseEnvironment } from '@project-name/config/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createPricingAdapter, type PricingAdapter } from '../../src/pricing.js';
import { createStandardPreviewAdapter, type StandardPreviewAdapter } from '../../src/preview.js';

const enabled = process.env['PHASE1D_REAL_CATALOG'] === 'true';

describe.skipIf(!enabled)('QG-292 Phase 1D real PostgreSQL preview integration', () => {
  let pricing: PricingAdapter | undefined;
  let preview: StandardPreviewAdapter | undefined;

  beforeAll(() => {
    const environment = parseDatabaseEnvironment(process.env);
    pricing = createPricingAdapter(environment);
    preview = createStandardPreviewAdapter(environment);
  });

  afterAll(async () => {
    await Promise.all([pricing?.close(), preview?.close()]);
  });

  it('persists all four confirmed families, revalidates compatibility and isolates owners', async () => {
    if (pricing === undefined || preview === undefined) throw new Error('PREVIEW_ADAPTER_REQUIRED');
    const pricingAdapter = pricing;
    const previewAdapter = preview;
    const bootstrap = await pricingAdapter.getBootstrap();
    const familyCodes = new Map(bootstrap.families.map((family) => [family.id, family.code]));
    const required = new Set(['ROLLER', 'ZEBRA', 'HORIZONTAL_ALUMINUM', 'VERTICAL']);
    const profiles = bootstrap.profiles.filter((profile) =>
      required.has(familyCodes.get(profile.productFamilyId) ?? ''),
    );
    expect(new Set(profiles.map((profile) => familyCodes.get(profile.productFamilyId)))).toEqual(
      required,
    );
    const createdIds: string[] = [];
    const ownerTokenHash = createHash('sha256').update(`owner:${randomUUID()}`).digest('hex');
    try {
      for (const profile of profiles) {
        const suffix = randomUUID();
        const calculation = await pricingAdapter.calculate({
          correlationId: `phase1d-integration-${suffix}`,
          idempotencyKey: `phase1d:calculation:${suffix}`,
          selection: {
            additionalOptionIds: [],
            catalogVersionId: bootstrap.catalogVersionId,
            configuratorModelId: profile.configuratorModelId,
            controlTypeId: profile.optionData.controlTypes[0]?.id ?? '',
            hardwareOptionId: profile.optionData.hardwareOptions[0]?.id ?? '',
            heightMm: profile.minimumHeightMm,
            materialVariantId: profile.materialVariantId,
            mountingTypeId: profile.optionData.mountingTypes[0]?.id ?? '',
            productFamilyId: profile.productFamilyId,
            productSystemId: profile.productSystemId,
            quantity: 1,
            widthMm: profile.minimumWidthMm,
          },
        });
        const created = await previewAdapter.create({
          correlationId: `phase1d-integration-${suffix}`,
          idempotencyKey: `phase1d:preview:${suffix}`,
          ownerTokenHash,
          source: { calculationToken: calculation.calculationToken },
        });
        createdIds.push(created.id);
        expect(created.eligibility).toMatchObject({ eligible: true, reason: 'ELIGIBLE' });
        expect(created.familyParameters).toBeDefined();
        expect(
          (await previewAdapter.getAsset({ ownerTokenHash, previewStateId: created.id })).objectKey,
        ).not.toMatch(/^https?:/u);
        const updated = await previewAdapter.update({
          controls: { openingPosition: 44, zoom: 125 },
          correlationId: `phase1d-update-${suffix}`,
          ownerTokenHash,
          previewStateId: created.id,
          sceneId: 'ROOM_WINDOW',
        });
        expect(updated).toMatchObject({
          controls: { openingPosition: 44, zoom: 125 },
          sceneId: 'ROOM_WINDOW',
        });
        expect(updated.stateChecksum).not.toBe(created.stateChecksum);
        expect(await previewAdapter.get({ ownerTokenHash, previewStateId: created.id })).toEqual(
          updated,
        );
        await expect(
          previewAdapter.get({ ownerTokenHash: '0'.repeat(64), previewStateId: created.id }),
        ).rejects.toMatchObject({ code: 'PREVIEW_NOT_FOUND' });
      }
    } finally {
      await Promise.all(
        createdIds.map((previewStateId) =>
          previewAdapter.delete({ ownerTokenHash, previewStateId }),
        ),
      );
    }
  });
});
