import { createHash } from 'node:crypto';

import { requestPublicReferenceSchema } from '@project-name/contracts/request';
import { RequestStoreError } from '@project-name/db';
import { StorageError } from '@project-name/storage';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getWebObjectStorage,
  getWebRequests,
} from '../../../../../../../../../lib/catalog-runtime';
import { requestTelemetryContext } from '../../../../../../../../../lib/health-handler';
import { pricingSafeFailure } from '../../../../../../../../../lib/pricing-security';
import { enforcePublicRequestRead } from '../../../../../../../../../lib/request-route';

export const dynamic = 'force-dynamic';
const sequenceSchema = z.coerce.number().int().positive().max(50);

export async function GET(
  request: NextRequest,
  routeContext: {
    readonly params: Promise<{
      readonly publicReference: string;
      readonly sequence: string;
    }>;
  },
): Promise<NextResponse> {
  const context = requestTelemetryContext(request);
  try {
    enforcePublicRequestRead(request);
    const parameters = await routeContext.params;
    const asset = await getWebRequests().getPublicPreviewAsset(
      requestPublicReferenceSchema.parse(parameters.publicReference),
      sequenceSchema.parse(parameters.sequence),
    );
    const stored = await getWebObjectStorage().get({
      key: asset.objectKey,
      zone: asset.storageZone,
    });
    const checksum = createHash('sha256').update(stored.body).digest('hex');
    if (
      checksum !== asset.checksumSha256 ||
      stored.checksumSha256 !== asset.checksumSha256 ||
      stored.contentLength !== asset.byteSize ||
      stored.contentType !== asset.contentType
    ) {
      return pricingSafeFailure('DEPENDENCY_UNAVAILABLE', context.correlationId);
    }
    const body = new ArrayBuffer(stored.body.byteLength);
    new Uint8Array(body).set(stored.body);
    return new NextResponse(body, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Content-Disposition': 'inline',
        'Content-Length': String(asset.byteSize),
        'Content-Security-Policy': "default-src 'none'; sandbox",
        'Content-Type': asset.contentType,
        'X-Correlation-ID': context.correlationId,
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    return pricingSafeFailure(
      error instanceof StorageError ||
        (error instanceof RequestStoreError && error.code === 'REQUEST_DATABASE')
        ? 'DEPENDENCY_UNAVAILABLE'
        : 'NOT_FOUND',
      context.correlationId,
    );
  }
}
