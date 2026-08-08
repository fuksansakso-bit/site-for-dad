import { createHash } from 'node:crypto';

import type { StandardPreviewStateView } from '@project-name/db';
import { StorageError, type ObjectStorage } from '@project-name/storage';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import previewAssetManifestJson from '../../../assets/preview/manifest.json';

import { requestTelemetryContext } from './health-handler';
import { pricingSafeFailure } from './pricing-security';

const manifestAssetSchema = z
  .object({
    byteSize: z.number().int().positive().max(8_388_608),
    contentType: z.literal('image/png'),
    derivation: z
      .object({
        destinationQuad: z.array(z.tuple([z.number().int(), z.number().int()])).length(4),
        method: z.literal('PERSPECTIVE_RECTIFICATION_V1'),
        sourceQuad: z.array(z.tuple([z.number().int(), z.number().int()])).length(4),
        sourceSha256: z.string().regex(/^[a-f0-9]{64}$/u),
      })
      .strict()
      .optional(),
    file: z.string().min(1).max(255),
    height: z.number().int().positive().max(4_096),
    id: z.enum([
      'SCENE_BEDROOM',
      'SCENE_KITCHEN',
      'ZEBRA_MINI_GEOMETRY',
      'ZEBRA_MINI_HARDWARE_WHITE',
      'ROLLER_MINI_2259',
      'ROLLER_MINI_HARDWARE_WHITE',
      'ZEBRA_MINI_5992',
      'HORIZONTAL_ALUMINUM_25_8012',
      'HORIZONTAL_ALUMINUM_25_SYSTEM',
      'VERTICAL_CLOTH_5612',
      'VERTICAL_CLOTH_SYSTEM',
    ]),
    objectKey: z.string().regex(/^preview\/amigo\/[a-f0-9]{2}\/[a-f0-9]{64}\.png$/u),
    publicationStatus: z.literal('PUBLICATION_APPROVED'),
    rightsStatus: z.literal('PARTNER_LICENSE'),
    role: z.enum([
      'MATERIAL_VISUALIZATION',
      'SCENE_BACKGROUND',
      'SYSTEM_GEOMETRY_TEMPLATE',
      'SYSTEM_HARDWARE',
    ]),
    sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    sourceUrl: z
      .string()
      .url()
      .startsWith('https://94467d4a238359fbf34ad21ca461e711.customizer.amigo.ru/storage-new/'),
    width: z.number().int().positive().max(4_096),
  })
  .strict();

const previewAssetManifest = z
  .object({
    assets: z.array(manifestAssetSchema).length(11),
    capturedAt: z.iso.datetime({ offset: true }),
    permissionBasis: z.literal('OWNER_CONFIRMED_AMIGO_PARTNER_PERMISSION_2026-08-08'),
    runtimeRemoteFetch: z.literal(false),
    schemaVersion: z.literal(1),
  })
  .strict()
  .parse(previewAssetManifestJson);

export type PreviewStaticAssetId = (typeof previewAssetManifest.assets)[number]['id'];
export type PreviewSystemLayerRole = 'MATERIAL_VISUALIZATION' | 'SYSTEM_HARDWARE';

export interface PreviewStaticAssetDescriptor {
  readonly byteSize: number;
  readonly checksumSha256: string;
  readonly contentType: 'image/png';
  readonly height: number;
  readonly id: PreviewStaticAssetId;
  readonly objectKey: string;
  readonly storageZone: 'private';
  readonly width: number;
}

const assets = new Map(
  previewAssetManifest.assets.map((asset) => [
    asset.id,
    {
      byteSize: asset.byteSize,
      checksumSha256: asset.sha256,
      contentType: asset.contentType,
      height: asset.height,
      id: asset.id,
      objectKey: asset.objectKey,
      storageZone: 'private' as const,
      width: asset.width,
    } satisfies PreviewStaticAssetDescriptor,
  ]),
);

function asset(id: PreviewStaticAssetId): PreviewStaticAssetDescriptor {
  const selected = assets.get(id);
  if (selected === undefined) throw new TypeError('PREVIEW_STATIC_ASSET_UNKNOWN');
  return selected;
}

export function previewSceneAsset(
  sceneId: 'ROOM_WINDOW' | 'WINDOW_CLOSEUP',
): PreviewStaticAssetDescriptor {
  return asset(sceneId === 'WINDOW_CLOSEUP' ? 'SCENE_BEDROOM' : 'SCENE_KITCHEN');
}

export function previewSystemLayerAsset(
  state: StandardPreviewStateView,
  role: PreviewSystemLayerRole,
): PreviewStaticAssetDescriptor {
  if (!state.eligibility.eligible || state.eligibility.family === null) {
    throw new TypeError('PREVIEW_SYSTEM_LAYER_INCOMPATIBLE');
  }
  const key = [
    state.eligibility.family,
    state.configuration.modelCode,
    state.configuration.materialArticle,
  ].join(':');
  const mapping = {
    'HORIZONTAL_ALUMINUM:CLASSIC_25:8012': {
      MATERIAL_VISUALIZATION: 'HORIZONTAL_ALUMINUM_25_8012',
      SYSTEM_HARDWARE: 'HORIZONTAL_ALUMINUM_25_SYSTEM',
    },
    'ROLLER:MINI:2259': {
      MATERIAL_VISUALIZATION: 'ROLLER_MINI_2259',
      SYSTEM_HARDWARE: 'ROLLER_MINI_HARDWARE_WHITE',
    },
    'VERTICAL:FABRIC:5612': {
      MATERIAL_VISUALIZATION: 'VERTICAL_CLOTH_5612',
      SYSTEM_HARDWARE: 'VERTICAL_CLOTH_SYSTEM',
    },
    'ZEBRA:ZEBRA_MINI:5992': {
      MATERIAL_VISUALIZATION: 'ZEBRA_MINI_5992',
      SYSTEM_HARDWARE: 'ZEBRA_MINI_HARDWARE_WHITE',
    },
  } as const;
  const selected = mapping[key as keyof typeof mapping];
  if (selected === undefined) throw new TypeError('PREVIEW_SYSTEM_LAYER_INCOMPATIBLE');
  return asset(selected[role]);
}

export function createPreviewStaticAssetHandler(
  storage: () => Pick<ObjectStorage, 'get'>,
): (
  request: NextRequest,
  descriptor: PreviewStaticAssetDescriptor,
  cacheScope: 'private' | 'public',
) => Promise<NextResponse> {
  return async (request, descriptor, cacheScope) => {
    const context = requestTelemetryContext(request);
    const cacheControl =
      cacheScope === 'public'
        ? 'public, max-age=31536000, immutable'
        : 'private, max-age=300, immutable';
    try {
      const etag = `"${descriptor.checksumSha256}"`;
      if (request.headers.get('if-none-match') === etag) {
        return new NextResponse(null, {
          headers: {
            'Cache-Control': cacheControl,
            ETag: etag,
            Vary: cacheScope === 'private' ? 'Cookie, Accept-Encoding' : 'Accept-Encoding',
            'X-Correlation-ID': context.correlationId,
            'X-Content-Type-Options': 'nosniff',
          },
          status: 304,
        });
      }
      const stored = await storage().get({
        key: descriptor.objectKey,
        zone: descriptor.storageZone,
      });
      const downloadedChecksum = createHash('sha256').update(stored.body).digest('hex');
      if (
        stored.source !== 'AMIGO_AUTHORIZED_PREVIEW' ||
        stored.checksumSha256 !== descriptor.checksumSha256 ||
        downloadedChecksum !== descriptor.checksumSha256 ||
        stored.contentLength !== descriptor.byteSize ||
        stored.contentType !== descriptor.contentType ||
        stored.body.byteLength !== descriptor.byteSize
      ) {
        return pricingSafeFailure('DEPENDENCY_UNAVAILABLE', context.correlationId);
      }
      const body = new ArrayBuffer(stored.body.byteLength);
      new Uint8Array(body).set(stored.body);
      return new NextResponse(body, {
        headers: {
          'Cache-Control': cacheControl,
          'Content-Disposition': 'inline',
          'Content-Length': String(descriptor.byteSize),
          'Content-Security-Policy': "default-src 'none'; sandbox",
          'Content-Type': descriptor.contentType,
          ETag: etag,
          Vary: cacheScope === 'private' ? 'Cookie, Accept-Encoding' : 'Accept-Encoding',
          'X-Correlation-ID': context.correlationId,
          'X-Content-Type-Options': 'nosniff',
        },
      });
    } catch (error) {
      return pricingSafeFailure(
        error instanceof StorageError ? 'DEPENDENCY_UNAVAILABLE' : 'INTERNAL_ERROR',
        context.correlationId,
      );
    }
  };
}
