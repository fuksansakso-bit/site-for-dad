import { describe, expect, it } from 'vitest';

import {
  previewCreateResponseSchema,
  previewSourceRequestSchema,
  previewStateUpdateSchema,
  standardPreviewStateResponseSchema,
} from '../src/preview.js';

describe('STD-PREV-018/020 preview HTTP contracts', () => {
  it('accepts exactly one opaque server-side source ID and no trusted price', () => {
    expect(previewSourceRequestSchema.parse({ calculationToken: 'a'.repeat(32) })).toEqual({
      calculationToken: 'a'.repeat(32),
    });
    expect(() =>
      previewSourceRequestSchema.parse({ calculationToken: 'a'.repeat(32), price: 1 }),
    ).toThrow();
    expect(() =>
      previewSourceRequestSchema.parse({
        calculationToken: 'a'.repeat(32),
        quoteToken: 'b'.repeat(32),
      }),
    ).toThrow();
  });

  it('allows only scene and bounded family controls in an update', () => {
    expect(
      previewStateUpdateSchema.parse({ controls: { openingPosition: 0 }, sceneId: 'ROOM_WINDOW' }),
    ).toEqual({ controls: { openingPosition: 0 }, sceneId: 'ROOM_WINDOW' });
    expect(() => previewStateUpdateSchema.parse({ controls: { zoom: 181 } })).toThrow();
    expect(() =>
      previewStateUpdateSchema.parse({ controls: { remoteUrl: 'http://localhost' } }),
    ).toThrow();
    expect(() => previewStateUpdateSchema.parse({})).toThrow();
  });

  it('limits generated navigation to a safe /preview state URL', () => {
    expect(
      previewCreateResponseSchema.parse({
        correlationId: 'preview-contract',
        href: `/preview?state=${'c'.repeat(32)}`,
        previewStateId: 'c'.repeat(32),
      }).href,
    ).toBe(`/preview?state=${'c'.repeat(32)}`);
    expect(() =>
      previewCreateResponseSchema.parse({
        correlationId: 'preview-contract',
        href: 'https://example.com',
        previewStateId: 'c'.repeat(32),
      }),
    ).toThrow();
  });

  it('rejects internal storage credentials and undeclared response fields', () => {
    const response = {
      asset: { normalizedColor: null, quality: 'PREVIEW_UNAVAILABLE', url: null },
      configuration: {
        dimensions: { heightMm: 1_100, widthMm: 700 },
        family: { code: 'WOODEN', id: '00000000-0000-4000-8000-000000000001', name: 'Дерево' },
        hardware: { color: '#FFFFFF', label: 'Белая', optionId: 'white' },
        material: {
          article: 'A1',
          colorName: 'Белый',
          id: '00000000-0000-4000-8000-000000000002',
          name: 'Материал',
        },
        model: { code: 'M1', id: '00000000-0000-4000-8000-000000000003', name: 'Модель' },
        system: { id: '00000000-0000-4000-8000-000000000004', name: 'Система' },
      },
      controls: {
        openingPosition: 76,
        slatAngle: 18,
        verticalSpread: 86,
        zebraAlignment: 32,
        zoom: 100,
      },
      correlationId: 'preview-contract',
      createdAt: '2026-08-08T12:00:00.000Z',
      csrfToken: 'x'.repeat(32),
      eligibility: { eligible: false, reason: 'UNSUPPORTED_FAMILY', warnings: [] },
      family: null,
      familyParameters: {
        controlSide: null,
        hasCassette: false,
        hasGuides: false,
        horizontalSlatWidthMm: null,
        verticalLamellaWidthMm: null,
        verticalOpeningDirection: null,
      },
      id: 'd'.repeat(32),
      rendererVersion: 'standard-svg-v1',
      sceneId: 'WINDOW_CLOSEUP',
      stateChecksum: 'e'.repeat(64),
      stateVersion: 1,
      updatedAt: '2026-08-08T12:00:00.000Z',
    } as const;
    expect(standardPreviewStateResponseSchema.parse(response).asset.url).toBeNull();
    expect(() =>
      standardPreviewStateResponseSchema.parse({ ...response, storageCredentials: 'secret' }),
    ).toThrow();
  });
});
