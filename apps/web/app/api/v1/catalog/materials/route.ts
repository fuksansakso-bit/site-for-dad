import { CatalogReadError, type CatalogReadPort } from '@project-name/catalog';
import {
  createSafeErrorResponse,
  foundationErrorDefinitions,
  type FoundationErrorCode,
} from '@project-name/contracts/error';
import { publicCatalogResponseSchema } from '@project-name/contracts/catalog';
import { type NextRequest, NextResponse } from 'next/server';

import {
  CatalogPublicQueryError,
  catalogPublicEtag,
  parseCatalogPublicQuery,
  selectCatalogPublicPage,
} from '../../../../../lib/catalog-public';
import { getWebCatalogRead, getWebCatalogSigningKey } from '../../../../../lib/catalog-runtime';
import { requestTelemetryContext } from '../../../../../lib/health-handler';

export const dynamic = 'force-dynamic';

export interface PublicCatalogMaterialsDependencies {
  readonly read: Pick<CatalogReadPort, 'getPublicCatalog'>;
  readonly signingKey: string;
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

export function createPublicCatalogMaterialsHandler(
  dependencies: () => PublicCatalogMaterialsDependencies = () => ({
    read: getWebCatalogRead(),
    signingKey: getWebCatalogSigningKey(),
  }),
): (request: NextRequest) => Promise<NextResponse> {
  return async (request) => {
    const context = requestTelemetryContext(request);
    try {
      const query = parseCatalogPublicQuery(request.nextUrl.searchParams);
      const runtime = dependencies();
      const snapshot = await runtime.read.getPublicCatalog();
      const page = selectCatalogPublicPage(snapshot, query, runtime.signingKey);
      const body = publicCatalogResponseSchema.parse({
        ...page,
        correlationId: context.correlationId,
      });
      const etag = catalogPublicEtag(page);
      const headers = {
        'Cache-Control': 'public, max-age=0, must-revalidate',
        ETag: etag,
        Vary: 'Accept-Encoding',
        'X-Catalog-Version': page.version?.id ?? 'none',
        'X-Correlation-ID': context.correlationId,
        'X-Content-Type-Options': 'nosniff',
        'X-Price-Version': page.priceVersion?.id ?? 'none',
        'X-Request-ID': context.requestId ?? context.correlationId,
      };
      if (request.headers.get('if-none-match') === etag) {
        return new NextResponse(null, { headers, status: 304 });
      }
      return NextResponse.json(body, { headers, status: 200 });
    } catch (error) {
      if (error instanceof CatalogPublicQueryError) {
        return safeFailure('VALIDATION_ERROR', context.correlationId);
      }
      if (error instanceof CatalogReadError) {
        return safeFailure('DEPENDENCY_UNAVAILABLE', context.correlationId);
      }
      return safeFailure('INTERNAL_ERROR', context.correlationId);
    }
  };
}

export const GET = createPublicCatalogMaterialsHandler();
