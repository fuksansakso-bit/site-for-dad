import { describe, expect, it } from 'vitest';

import {
  applyPreviewControlPatch,
  buildPreviewRenderModel,
  canonicalPreviewInput,
  defaultPreviewControls,
  horizontalSlatLayout,
  isAllowedPreviewMimeType,
  previewScenes,
  selectPreviewAsset,
  selectPreviewFamily,
  verticalSlatLayout,
  type PreviewAssetCandidate,
  type PreviewRenderInput,
} from '../src/index.js';

const candidates: readonly PreviewAssetCandidate[] = [
  { approved: true, id: 'detail', mimeType: 'image/webp', role: 'DETAIL', sortOrder: 0 },
  { approved: true, id: 'primary', mimeType: 'image/jpeg', role: 'PRIMARY', sortOrder: 1 },
  { approved: true, id: 'swatch-z', mimeType: 'image/png', role: 'SWATCH', sortOrder: 2 },
  { approved: true, id: 'swatch-a', mimeType: 'image/png', role: 'SWATCH', sortOrder: 1 },
];

function renderInput(overrides: Partial<PreviewRenderInput> = {}): PreviewRenderInput {
  return {
    assetQuality: 'PRODUCT_IMAGE_CROP',
    assetUrl: `/api/v1/previews/${'a'.repeat(32)}/asset`,
    controls: defaultPreviewControls(),
    family: 'ROLLER',
    familyParameters: {
      controlSide: 'RIGHT',
      hasCassette: true,
      hasGuides: false,
      horizontalSlatWidthMm: null,
      verticalLamellaWidthMm: null,
      verticalOpeningDirection: null,
    },
    hardwareColor: '#FFFFFF',
    heightMm: 1_100,
    normalizedColor: null,
    rendererVersion: 'standard-svg-v2',
    sceneId: 'WINDOW_CLOSEUP',
    stateChecksum: 'b'.repeat(64),
    widthMm: 700,
    ...overrides,
  };
}

describe('STD-PREV-017 asset quality priority', () => {
  it('chooses an approved exact swatch deterministically before a product crop', () => {
    expect(selectPreviewAsset(candidates, '#abcdef')).toEqual({
      assetId: 'swatch-a',
      normalizedColor: '#ABCDEF',
      quality: 'EXACT_SWATCH',
    });
    expect(selectPreviewAsset([...candidates].reverse(), '#ABCDEF')).toEqual(
      selectPreviewAsset(candidates, '#ABCDEF'),
    );
  });

  it('uses product image, then disclosed normalized color, then unavailable', () => {
    expect(selectPreviewAsset(candidates.slice(0, 2), null).quality).toBe('PRODUCT_IMAGE_CROP');
    expect(selectPreviewAsset([], '#102030')).toEqual({
      assetId: null,
      normalizedColor: '#102030',
      quality: 'NORMALIZED_COLOR_ONLY',
    });
    expect(selectPreviewAsset([], null).quality).toBe('PREVIEW_UNAVAILABLE');
    expect(selectPreviewAsset([], 'red').quality).toBe('PREVIEW_UNAVAILABLE');
  });

  it('rejects non-image and SVG inputs from the preview asset boundary', () => {
    expect(isAllowedPreviewMimeType('image/jpeg')).toBe(true);
    expect(isAllowedPreviewMimeType('image/png')).toBe(true);
    expect(isAllowedPreviewMimeType('image/webp')).toBe(true);
    expect(isAllowedPreviewMimeType('image/svg+xml')).toBe(false);
    expect(isAllowedPreviewMimeType('text/html')).toBe(false);
  });
});

describe('STD-PREV-019 family eligibility and renderer selection', () => {
  it.each(['ROLLER', 'ZEBRA', 'HORIZONTAL_ALUMINUM', 'VERTICAL'] as const)(
    'selects the supported %s family',
    (family) => expect(selectPreviewFamily(family)).toBe(family),
  );

  it('returns an honest unsupported-family sentinel', () => {
    expect(selectPreviewFamily('WOODEN')).toBeNull();
    expect(selectPreviewFamily('')).toBeNull();
  });
});

describe('STD-PREV-020 family-aware preview controls', () => {
  it('clamps opening and zoom without changing price inputs', () => {
    expect(
      applyPreviewControlPatch('ROLLER', defaultPreviewControls(), {
        openingPosition: 140,
        zoom: 99,
      }),
    ).toMatchObject({ openingPosition: 100, zoom: 100 });
  });

  it('applies Zebra alignment and rejects it for Roller', () => {
    expect(
      applyPreviewControlPatch('ZEBRA', defaultPreviewControls(), { zebraAlignment: 81 })
        .zebraAlignment,
    ).toBe(81);
    expect(() =>
      applyPreviewControlPatch('ROLLER', defaultPreviewControls(), { zebraAlignment: 20 }),
    ).toThrow('ZEBRA_ALIGNMENT_UNSUPPORTED');
  });

  it('applies confirmed slat controls only to relevant families', () => {
    expect(
      applyPreviewControlPatch('HORIZONTAL_ALUMINUM', defaultPreviewControls(), {
        slatAngle: -90,
      }).slatAngle,
    ).toBe(-75);
    expect(
      applyPreviewControlPatch('VERTICAL', defaultPreviewControls(), {
        slatAngle: 45,
        verticalSpread: -2,
      }),
    ).toMatchObject({ slatAngle: 45, verticalSpread: 0 });
    expect(() =>
      applyPreviewControlPatch('HORIZONTAL_ALUMINUM', defaultPreviewControls(), {
        verticalSpread: 50,
      }),
    ).toThrow('VERTICAL_SPREAD_UNSUPPORTED');
  });
});

describe('STD-PREV-005 deterministic slat geometry', () => {
  it('derives horizontal slat count from confirmed width and lift position', () => {
    const open = horizontalSlatLayout({
      angleDegrees: 0,
      heightMm: 1_000,
      openingPosition: 100,
      productHeight: 500,
      productY: 20,
      slatWidthMm: 25,
    });
    const raised = horizontalSlatLayout({
      angleDegrees: 60,
      heightMm: 1_000,
      openingPosition: 20,
      productHeight: 500,
      productY: 20,
      slatWidthMm: 25,
    });
    expect(open.count).toBe(40);
    expect(open.slats).toHaveLength(40);
    expect(open.stackBottomY).toBeGreaterThan(raised.stackBottomY);
    expect(raised.slatHeight).toBeLessThan(open.slatHeight);
  });

  it('derives vertical lamella count, angle and confirmed opening direction', () => {
    const closed = verticalSlatLayout({
      angleDegrees: 0,
      lamellaWidthMm: 89,
      openingDirection: 'RIGHT',
      productWidth: 356,
      productX: 100,
      spread: 100,
      widthMm: 890,
    });
    const parked = verticalSlatLayout({
      angleDegrees: 70,
      lamellaWidthMm: 89,
      openingDirection: 'RIGHT',
      productWidth: 356,
      productX: 100,
      spread: 0,
      widthMm: 890,
    });
    expect(closed.count).toBe(10);
    expect(new Set(parked.slats.map((slat) => slat.x)).size).toBe(1);
    expect(closed.slats[0]?.x).toBeLessThan(closed.slats.at(-1)?.x ?? 0);
    expect(parked.lamellaWidth).toBeLessThan(closed.lamellaWidth);
  });

  it('fails safely when confirmed dimensions are absent or invalid', () => {
    expect(() =>
      horizontalSlatLayout({
        angleDegrees: 0,
        heightMm: 1_000,
        openingPosition: 100,
        productHeight: 500,
        productY: 0,
        slatWidthMm: 0,
      }),
    ).toThrow('PREVIEW_LAYOUT_DIMENSION_INVALID');
  });
});

describe('STD-PREV-007/008 deterministic scene model', () => {
  it('publishes exactly two versioned supplier-authorized photoreal scenes', () => {
    expect(previewScenes.map((scene) => scene.id)).toEqual(['WINDOW_CLOSEUP', 'ROOM_WINDOW']);
    expect(previewScenes.every((scene) => scene.version === 2)).toBe(true);
    expect(previewScenes.map((scene) => scene.backgroundAssetId)).toEqual([
      'SCENE_BEDROOM',
      'SCENE_KITCHEN',
    ]);
  });

  it('produces the same canonical state and render model for the same input', () => {
    const first = buildPreviewRenderModel(renderInput());
    const second = buildPreviewRenderModel(renderInput());
    expect(second).toEqual(first);
    expect(first.deterministicKey).toBe(canonicalPreviewInput(renderInput()));
    expect(first.product.width).toBeGreaterThan(0);
    expect(first.product.height).toBeGreaterThan(0);
  });

  it('changes deterministically with scene, opening and Zebra alignment', () => {
    const first = buildPreviewRenderModel(renderInput());
    const second = buildPreviewRenderModel(
      renderInput({
        controls: { ...defaultPreviewControls(), openingPosition: 44, zebraAlignment: 70 },
        family: 'ZEBRA',
        sceneId: 'ROOM_WINDOW',
      }),
    );
    expect(second.deterministicKey).not.toBe(first.deterministicKey);
    expect(second.scene.id).toBe('ROOM_WINDOW');
  });

  it('rejects arbitrary remote and malformed material URLs', () => {
    expect(() =>
      buildPreviewRenderModel(renderInput({ assetUrl: 'https://example.com/a.jpg' })),
    ).toThrow('PREVIEW_ASSET_URL_INVALID');
    expect(() =>
      buildPreviewRenderModel(renderInput({ assetUrl: '/api/v1/catalog/media/x' })),
    ).toThrow('PREVIEW_ASSET_URL_INVALID');
  });
});
