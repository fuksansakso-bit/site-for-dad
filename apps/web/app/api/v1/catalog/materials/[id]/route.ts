import { createHash } from 'node:crypto';

import { CatalogReadError, type CatalogReadPort } from '@project-name/catalog';
import { publicCatalogMaterialResponseSchema } from '@project-name/contracts/catalog';
import {
  createSafeErrorResponse,
  foundationErrorDefinitions,
  type FoundationErrorCode,
} from '@project-name/contracts/error';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { selectCatalogPublicMaterial } from '../../../../../../lib/catalog-public';
import { requestTelemetryContext } from '../../../../../../lib/health-handler';
import { getWebCatalogRead } from '../../../../../../lib/catalog-runtime';

export const dynamic = 'force-dynamic';

const materialIdentifierSchema = z.union([
  z.uuid(),
  z
    .string()
    .min(1)
    .max(128)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
]);

export interface PublicCatalogMaterialDependencies {
  readonly read: Pick<CatalogReadPort, 'getPublicCatalog'>;
}

function safeFailure(code: FoundationErrorCode, correlationId: string): NextResponse {
  return NextResponse.json(createSafeErrorResponse(code, correlationId), {
    headers: {
      'Cache-Control': 'no-store',
      'X-Correlation-ID': correlationId,
      'X-Content-Type-Options': 'nosniff',
    },
    status: foundationErrorDefinitions[code].httpStatus,
  });
}

export function createPublicCatalogMaterialHandler(
  dependencies: () => PublicCatalogMaterialDependencies = () => ({ read: getWebCatalogRead() }),
): (request: NextRequest, identifier: string) => Promise<NextResponse> {
  return async (request, identifier) => {
    const context = requestTelemetryContext(request);
    const parsedIdentifier = materialIdentifierSchema.safeParse(identifier);
    if (!parsedIdentifier.success) return safeFailure('NOT_FOUND', context.correlationId);
    try {
      const snapshot = await dependencies().read.getPublicCatalog();
      const selected = selectCatalogPublicMaterial(snapshot, parsedIdentifier.data);
      if (selected === null) return safeFailure('NOT_FOUND', context.correlationId);
      const body = publicCatalogMaterialResponseSchema.parse({
        ...selected,
        correlationId: context.correlationId,
      });
      const etag = `"${createHash('sha256').update(JSON.stringify(selected)).digest('base64url')}"`;
      const headers = {
        'Cache-Control': 'public, max-age=0, must-revalidate',
        ETag: etag,
        Vary: 'Accept-Encoding',
        'X-Catalog-Version': selected.version.id,
        'X-Correlation-ID': context.correlationId,
        'X-Content-Type-Options': 'nosniff',
        'X-Price-Version': selected.priceVersion.id,
        'X-Request-ID': context.requestId ?? context.correlationId,
      };
      if (request.headers.get('if-none-match') === etag) {
        return new NextResponse(null, { headers, status: 304 });
      }
      return NextResponse.json(body, { headers, status: 200 });
    } catch (error) {
      if (error instanceof CatalogReadError) {
        return safeFailure('DEPENDENCY_UNAVAILABLE', context.correlationId);
      }
      return safeFailure('INTERNAL_ERROR', context.correlationId);
    }
  };
}

const serveMaterial = createPublicCatalogMaterialHandler();

export async function GET(
  request: NextRequest,
  context: { readonly params: Promise<{ readonly id: string }> },
): Promise<NextResponse> {
  const parameters = await context.params;
  return serveMaterial(request, parameters.id);
}
