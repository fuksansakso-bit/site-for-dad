import { createHash } from 'node:crypto';

import { CatalogReadError, type CatalogReadPort } from '@project-name/catalog';
import {
  createSafeErrorResponse,
  foundationErrorDefinitions,
  type FoundationErrorCode,
} from '@project-name/contracts/error';
import { StorageError, type ObjectStorage } from '@project-name/storage';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getWebCatalogRead, getWebObjectStorage } from '../../../../../../lib/catalog-runtime';
import { requestTelemetryContext } from '../../../../../../lib/health-handler';

export const dynamic = 'force-dynamic';

export interface PublicCatalogMediaDependencies {
  readonly read: Pick<CatalogReadPort, 'getPublicCatalog'>;
  readonly storage: Pick<ObjectStorage, 'get'>;
}

function safeFailure(code: FoundationErrorCode, correlationId: string): NextResponse {
  return NextResponse.json(createSafeErrorResponse(code, correlationId), {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'X-Correlation-ID': correlationId,
      'X-Content-Type-Options': 'nosniff',
    },
    status: foundationErrorDefinitions[code].httpStatus,
  });
}

function requestedVersion(request: NextRequest): string | null {
  const keys = [...new Set(request.nextUrl.searchParams.keys())];
  if (keys.length !== 1 || keys[0] !== 'v') return null;
  const versions = request.nextUrl.searchParams.getAll('v');
  if (versions.length !== 1) return null;
  const parsed = z.uuid().safeParse(versions[0]);
  return parsed.success ? parsed.data : null;
}

export function createPublicCatalogMediaHandler(
  dependencies: () => PublicCatalogMediaDependencies = () => ({
    read: getWebCatalogRead(),
    storage: getWebObjectStorage(),
  }),
): (request: NextRequest, assetId: string) => Promise<NextResponse> {
  return async (request, assetId) => {
    const context = requestTelemetryContext(request);
    const parsedAssetId = z.uuid().safeParse(assetId);
    const versionId = requestedVersion(request);
    if (!parsedAssetId.success || versionId === null) {
      return safeFailure('NOT_FOUND', context.correlationId);
    }
    try {
      const runtime = dependencies();
      const snapshot = await runtime.read.getPublicCatalog();
      if (snapshot === null || snapshot.catalogVersion.id !== versionId) {
        return safeFailure('NOT_FOUND', context.correlationId);
      }
      const material = snapshot.items.find((item) => item.media.id === parsedAssetId.data);
      if (material === undefined) return safeFailure('NOT_FOUND', context.correlationId);
      const media = material.media;
      const stored = await runtime.storage.get({ key: media.objectKey, zone: media.storageZone });
      const downloadedChecksum = createHash('sha256').update(stored.body).digest('hex');
      if (
        stored.checksumSha256 !== media.checksumSha256 ||
        downloadedChecksum !== media.checksumSha256 ||
        stored.contentLength !== media.byteSize ||
        stored.contentType !== media.contentType ||
        stored.body.byteLength !== media.byteSize
      ) {
        return safeFailure('DEPENDENCY_UNAVAILABLE', context.correlationId);
      }
      const body = new ArrayBuffer(stored.body.byteLength);
      new Uint8Array(body).set(stored.body);
      return new NextResponse(body, {
        headers: {
          'Cache-Control': 'public, max-age=300, must-revalidate',
          'Content-Disposition': 'inline',
          'Content-Length': String(media.byteSize),
          'Content-Security-Policy': "default-src 'none'; sandbox",
          'Content-Type': media.contentType,
          ETag: `"${media.checksumSha256}"`,
          Vary: 'Accept-Encoding',
          'X-Catalog-Version': snapshot.catalogVersion.id,
          'X-Content-Type-Options': 'nosniff',
        },
        status: 200,
      });
    } catch (error) {
      if (error instanceof CatalogReadError || error instanceof StorageError) {
        return safeFailure('DEPENDENCY_UNAVAILABLE', context.correlationId);
      }
      return safeFailure('INTERNAL_ERROR', context.correlationId);
    }
  };
}

const serveMedia = createPublicCatalogMediaHandler();

export async function GET(
  request: NextRequest,
  context: { readonly params: Promise<{ readonly id: string }> },
): Promise<NextResponse> {
  const parameters = await context.params;
  return serveMedia(request, parameters.id);
}
