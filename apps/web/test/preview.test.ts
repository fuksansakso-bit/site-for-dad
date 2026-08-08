import { createHash } from 'node:crypto';

import type { StandardPreviewStateView } from '@project-name/db';
import { StorageError } from '@project-name/storage';
import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

import { createPreviewAssetHandler } from '../app/api/v1/previews/[id]/asset/route';
import { previewStateResponse } from '../lib/preview-route';
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
      openingPosition: 76,
      slatAngle: 18,
      verticalSpread: 86,
      zebraAlignment: 32,
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
    rendererVersion: 'standard-svg-v1',
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
