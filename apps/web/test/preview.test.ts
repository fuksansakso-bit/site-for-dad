import { createHash } from 'node:crypto';

import type { StandardPreviewStateView } from '@project-name/db';
import { StorageError } from '@project-name/storage';
import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

import { createPreviewAssetHandler } from '../app/api/v1/previews/[id]/asset/route';
import { previewStateResponse } from '../lib/preview-route';
import {
  createPreviewStaticAssetHandler,
  previewSceneAsset,
  previewSystemLayerAsset,
} from '../lib/preview-static-assets';
import {
  createPreviewOwnerToken,
  previewOwnerTokenHash,
  readPreviewOwnerToken,
} from '../lib/preview-security';

const body = new TextEncoder().encode('local-approved-preview-asset');
const checksum = createHash('sha256').update(body).digest('hex');
const stateId = 's'.repeat(32);
const ownerHash = 'f'.repeat(64);

function state(overrides: Partial<StandardPreviewStateView> = {}): StandardPreviewStateView {
  return {
    assetId: '00000000-0000-4000-8000-000000000010',
    assetQuality: 'EXACT_SWATCH',
    configuration: {
      additionalOptionIds: [],
      catalogVersionId: '00000000-0000-4000-8000-000000000001',
      controlTypeId: 'right',
      familyCode: 'ROLLER',
      familyId: '00000000-0000-4000-8000-000000000002',
      familyName: 'Рулонные шторы',
      hardwareOptionId: 'white',
      hardwareOptionName: 'Белая фурнитура',
      heightMm: 1_100,
      materialArticle: 'A-1',
      materialColorName: 'Молочный',
      materialName: 'Лина',
      materialVariantId: '00000000-0000-4000-8000-000000000003',
      modelCode: 'MINI',
      modelId: '00000000-0000-4000-8000-000000000004',
      modelName: 'MINI',
      mountingTypeId: 'wall',
      priceVersionId: '00000000-0000-4000-8000-000000000005',
      systemId: '00000000-0000-4000-8000-000000000006',
      systemName: 'ROLLA',
      widthMm: 700,
    },
    controls: {
      openingPosition: 100,
      slatAngle: 0,
      verticalSpread: 100,
      zebraAlignment: 50,
      zoom: 100,
    },
    createdAt: '2026-08-08T12:00:00.000Z',
    eligibility: { eligible: true, family: 'ROLLER', reason: 'ELIGIBLE', warnings: [] },
    familyParameters: {
      controlSide: 'RIGHT',
      hasCassette: true,
      hasGuides: false,
      horizontalSlatWidthMm: null,
      verticalLamellaWidthMm: null,
      verticalOpeningDirection: null,
    },
    hardwareColor: '#FFFFFF',
    id: stateId,
    normalizedColor: null,
    rendererVersion: 'standard-svg-v2',
    sceneId: 'WINDOW_CLOSEUP',
    stateChecksum: 'a'.repeat(64),
    stateVersion: 1,
    updatedAt: '2026-08-08T12:00:00.000Z',
    ...overrides,
  };
}

describe('STD-PREV-018 private state security boundary', () => {
  it('uses random owner tokens and signing-key-scoped non-reversible hashes', () => {
    const first = createPreviewOwnerToken();
    const second = createPreviewOwnerToken();
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    expect(second).not.toBe(first);
    expect(previewOwnerTokenHash(first, 'k'.repeat(64))).toMatch(/^[0-9a-f]{64}$/u);
    expect(previewOwnerTokenHash(first, 'l'.repeat(64))).not.toBe(
      previewOwnerTokenHash(first, 'k'.repeat(64)),
    );
    expect(readPreviewOwnerToken(new NextRequest('http://localhost/preview'))).toBeNull();
  });

  it('does not expose an asset after material hiding or stale eligibility', () => {
    const unavailable = previewStateResponse(
      state({
        eligibility: {
          eligible: false,
          family: 'ROLLER',
          reason: 'MATERIAL_UNAVAILABLE',
          warnings: ['CATALOG_VERSION_CHANGED', 'PRICE_VERSION_CHANGED'],
        },
      }),
      'x'.repeat(64),
      'preview-recovery-test',
    );
    expect(unavailable.asset.url).toBeNull();
    expect(unavailable.eligibility.warnings).toEqual([
      'CATALOG_VERSION_CHANGED',
      'PRICE_VERSION_CHANGED',
    ]);
  });
});

describe('STD-PREV-003/004 StoragePort asset delivery', () => {
  const descriptor = {
    byteSize: body.byteLength,
    checksumSha256: checksum,
    contentType: 'image/webp' as const,
    height: 500,
    id: '00000000-0000-4000-8000-000000000010',
    objectKey: 'catalog/private/approved-preview.webp',
    storageZone: 'private' as const,
    width: 500,
  };

  it('returns only the pinned local object with private immutable caching', async () => {
    const get = vi.fn(async () => ({
      body,
      checksumSha256: checksum,
      contentLength: body.byteLength,
      contentType: 'image/webp',
      locator: { key: descriptor.objectKey, zone: 'private' as const },
      schemaVersion: 1 as const,
      source: 'AMIGO_CATALOG_PILOT' as const,
      zone: 'private' as const,
    }));
    const handler = createPreviewAssetHandler(() => ({
      preview: { getAsset: async () => descriptor },
      storage: { get },
    }));
    const response = await handler(
      new NextRequest(`http://localhost/api/v1/previews/${stateId}/asset`),
      stateId,
      ownerHash,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('private, max-age=300, immutable');
    expect(response.headers.get('content-type')).toBe('image/webp');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(body);
    expect(get).toHaveBeenCalledWith({ key: descriptor.objectKey, zone: 'private' });
  });

  it('fails safely for a corrupted image without leaking its object key', async () => {
    const handler = createPreviewAssetHandler(() => ({
      preview: { getAsset: async () => descriptor },
      storage: {
        get: async () => ({
          body: new TextEncoder().encode('corrupted'),
          checksumSha256: checksum,
          contentLength: body.byteLength,
          contentType: 'image/webp',
          locator: { key: descriptor.objectKey, zone: 'private' as const },
          schemaVersion: 1 as const,
          source: 'AMIGO_CATALOG_PILOT' as const,
          zone: 'private' as const,
        }),
      },
    }));
    const response = await handler(
      new NextRequest(`http://localhost/api/v1/previews/${stateId}/asset`),
      stateId,
      ownerHash,
    );
    expect(response.status).toBe(503);
    expect(await response.text()).not.toMatch(/approved-preview|stack|private\//iu);
  });

  it('maps temporary storage failure to a safe recoverable response', async () => {
    const handler = createPreviewAssetHandler(() => ({
      preview: { getAsset: async () => descriptor },
      storage: {
        get: async () => {
          throw new StorageError('STORAGE_DEPENDENCY_UNAVAILABLE', 'private credential leaked');
        },
      },
    }));
    const response = await handler(
      new NextRequest(`http://localhost/api/v1/previews/${stateId}/asset`),
      stateId,
      ownerHash,
    );
    expect(response.status).toBe(503);
    expect(await response.text()).not.toMatch(/credential leaked|stack/iu);
  });
});

describe('STD-PREV-003/007 authorized photoreal scene and system layers', () => {
  it('maps only allowlisted scenes and the four exact active configurations', () => {
    expect(previewSceneAsset('WINDOW_CLOSEUP')).toMatchObject({
      contentType: 'image/png',
      id: 'SCENE_BEDROOM',
      storageZone: 'private',
    });
    expect(previewSceneAsset('ROOM_WINDOW')).toMatchObject({ id: 'SCENE_KITCHEN' });
    const roller = state({
      configuration: { ...state().configuration, materialArticle: '2259' },
    });
    expect(previewSystemLayerAsset(roller, 'MATERIAL_VISUALIZATION')).toMatchObject({
      id: 'ROLLER_MINI_2259',
    });
    expect(previewSystemLayerAsset(roller, 'SYSTEM_HARDWARE')).toMatchObject({
      id: 'ROLLER_MINI_HARDWARE_WHITE',
    });
    const zebra = state({
      configuration: {
        ...roller.configuration,
        familyCode: 'ZEBRA',
        materialArticle: '5992',
        modelCode: 'ZEBRA_MINI',
      },
      eligibility: { eligible: true, family: 'ZEBRA', reason: 'ELIGIBLE', warnings: [] },
    });
    expect(previewSystemLayerAsset(zebra, 'MATERIAL_VISUALIZATION')).toMatchObject({
      id: 'ZEBRA_MINI_5992',
    });
    expect(previewSystemLayerAsset(zebra, 'SYSTEM_HARDWARE')).toMatchObject({
      id: 'ZEBRA_MINI_HARDWARE_WHITE',
    });
    const horizontal = state({
      configuration: {
        ...roller.configuration,
        familyCode: 'HORIZONTAL_ALUMINUM',
        materialArticle: '8012',
        modelCode: 'CLASSIC_25',
      },
      eligibility: {
        eligible: true,
        family: 'HORIZONTAL_ALUMINUM',
        reason: 'ELIGIBLE',
        warnings: [],
      },
    });
    expect(previewSystemLayerAsset(horizontal, 'MATERIAL_VISUALIZATION')).toMatchObject({
      id: 'HORIZONTAL_ALUMINUM_25_8012',
    });
    const vertical = state({
      configuration: {
        ...roller.configuration,
        familyCode: 'VERTICAL',
        materialArticle: '5612',
        modelCode: 'FABRIC',
      },
      eligibility: { eligible: true, family: 'VERTICAL', reason: 'ELIGIBLE', warnings: [] },
    });
    expect(previewSystemLayerAsset(vertical, 'SYSTEM_HARDWARE')).toMatchObject({
      id: 'VERTICAL_CLOTH_SYSTEM',
    });
    expect(() =>
      previewSystemLayerAsset(
        state({ configuration: { ...roller.configuration, materialArticle: 'unknown' } }),
        'MATERIAL_VISUALIZATION',
      ),
    ).toThrow('PREVIEW_SYSTEM_LAYER_INCOMPATIBLE');
  });

  it('serves a verified local supplier layer with immutable caching', async () => {
    const descriptor = {
      byteSize: body.byteLength,
      checksumSha256: checksum,
      contentType: 'image/png' as const,
      height: 937,
      id: 'SCENE_BEDROOM' as const,
      objectKey: `preview/amigo/${checksum.slice(0, 2)}/${checksum}.png`,
      storageZone: 'private' as const,
      width: 1_500,
    };
    const get = vi.fn(async () => ({
      body,
      checksumSha256: checksum,
      contentLength: body.byteLength,
      contentType: 'image/png',
      locator: { key: descriptor.objectKey, zone: 'private' as const },
      schemaVersion: 1 as const,
      source: 'AMIGO_AUTHORIZED_PREVIEW' as const,
      zone: 'private' as const,
    }));
    const handler = createPreviewStaticAssetHandler(() => ({ get }));
    const response = await handler(
      new NextRequest('http://localhost/api/v1/previews/scenes/WINDOW_CLOSEUP/asset?v=2'),
      descriptor,
      'public',
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(body);
    expect(get).toHaveBeenCalledWith({ key: descriptor.objectKey, zone: 'private' });
  });
});
