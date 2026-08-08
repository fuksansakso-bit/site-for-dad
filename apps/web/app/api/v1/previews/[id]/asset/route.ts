import { createHash } from 'node:crypto';

import { StorageError, type ObjectStorage } from '@project-name/storage';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getWebCatalogSigningKey,
  getWebObjectStorage,
  getWebStandardPreview,
} from '../../../../../../lib/catalog-runtime';
import { requestTelemetryContext } from '../../../../../../lib/health-handler';
import { previewRouteErrorCode } from '../../../../../../lib/preview-route';
import {
  previewOwnerTokenHash,
  readPreviewOwnerToken,
} from '../../../../../../lib/preview-security';
import { pricingSafeFailure } from '../../../../../../lib/pricing-security';

export const dynamic = 'force-dynamic';
const stateIdSchema = z.string().regex(/^[A-Za-z0-9_-]{32}$/u);

export interface PreviewAssetDependencies {
  readonly preview: ReturnType<typeof getWebStandardPreview>;
  readonly storage: Pick<ObjectStorage, 'get'>;
}

export function createPreviewAssetHandler(
  dependencies: () => PreviewAssetDependencies = () => ({
    preview: getWebStandardPreview(),
    storage: getWebObjectStorage(),
  }),
): (request: NextRequest, previewStateId: string, ownerTokenHash: string) => Promise<NextResponse> {
  return async (request, previewStateId, ownerTokenHash) => {
    const context = requestTelemetryContext(request);
    try {
      const runtime = dependencies();
      const asset = await runtime.preview.getAsset({ ownerTokenHash, previewStateId });
      const etag = `"${asset.checksumSha256}"`;
      if (request.headers.get('if-none-match') === etag) {
        return new NextResponse(null, {
          headers: {
            'Cache-Control': 'private, max-age=300, immutable',
            ETag: etag,
            Vary: 'Cookie, Accept-Encoding',
            'X-Content-Type-Options': 'nosniff',
          },
          status: 304,
        });
      }
      const stored = await runtime.storage.get({ key: asset.objectKey, zone: asset.storageZone });
      const downloadedChecksum = createHash('sha256').update(stored.body).digest('hex');
      if (
        stored.checksumSha256 !== asset.checksumSha256 ||
        downloadedChecksum !== asset.checksumSha256 ||
        stored.contentLength !== asset.byteSize ||
        stored.contentType !== asset.contentType ||
        stored.body.byteLength !== asset.byteSize
      ) {
        return pricingSafeFailure('DEPENDENCY_UNAVAILABLE', context.correlationId);
      }
      const body = new ArrayBuffer(stored.body.byteLength);
      new Uint8Array(body).set(stored.body);
      return new NextResponse(body, {
        headers: {
          'Cache-Control': 'private, max-age=300, immutable',
          'Content-Disposition': 'inline',
          'Content-Length': String(asset.byteSize),
          'Content-Security-Policy': "default-src 'none'; sandbox",
          'Content-Type': asset.contentType,
          ETag: etag,
          Vary: 'Cookie, Accept-Encoding',
          'X-Correlation-ID': context.correlationId,
          'X-Content-Type-Options': 'nosniff',
        },
        status: 200,
      });
    } catch (error) {
      return pricingSafeFailure(
        error instanceof StorageError ? 'DEPENDENCY_UNAVAILABLE' : previewRouteErrorCode(error),
        context.correlationId,
      );
    }
  };
}

const serveAsset = createPreviewAssetHandler();

export async function GET(
  request: NextRequest,
  routeContext: { readonly params: Promise<{ readonly id: string }> },
): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    const id = stateIdSchema.parse((await routeContext.params).id);
    const ownerToken = readPreviewOwnerToken(request);
    if (ownerToken === null) throw new TypeError('PREVIEW_OWNER_REQUIRED');
    return serveAsset(request, id, previewOwnerTokenHash(ownerToken, getWebCatalogSigningKey()));
  } catch (error) {
    return pricingSafeFailure(previewRouteErrorCode(error), context.correlationId);
  }
}
