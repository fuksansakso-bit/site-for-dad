import { randomUUID } from 'node:crypto';

import { enqueuePortfolioMediaProcessing } from '@project-name/jobs';
import { NextResponse, type NextRequest } from 'next/server';

import { trustedRequestOrigin } from '../../../../../../../lib/account-session';
import {
  getWebCatalogJobPool,
  getWebObjectStorage,
  getWebPortfolio,
} from '../../../../../../../lib/catalog-runtime';
import { preparePortfolioImage } from '../../../../../../../lib/portfolio-image';
import {
  requestAdminRole,
  requireRequestAdminPrincipal,
} from '../../../../../../../lib/request-admin-session';

function redirectWith(request: NextRequest, notice: string): NextResponse {
  return NextResponse.redirect(
    new URL(`/admin/portfolio?notice=${encodeURIComponent(notice)}`, request.url),
    303,
  );
}

export async function POST(
  request: NextRequest,
  context: { readonly params: Promise<{ readonly itemId: string }> },
): Promise<NextResponse> {
  const correlationId = randomUUID();
  try {
    const origin = request.headers.get('origin');
    const contentType = request.headers.get('content-type') ?? '';
    const configuredLimit = Number(process.env['REQUEST_BODY_LIMIT_BYTES'] ?? '1048576');
    const maximumBytes = Number.isSafeInteger(configuredLimit) ? configuredLimit : 1_048_576;
    const contentLength = Number(request.headers.get('content-length') ?? '0');
    if (
      origin !== trustedRequestOrigin(request) ||
      !contentType.toLowerCase().startsWith('multipart/form-data;') ||
      !Number.isSafeInteger(contentLength) ||
      contentLength < 1 ||
      contentLength > maximumBytes + 64_000
    ) {
      return redirectWith(request, 'PORTFOLIO_IMAGE_REJECTED');
    }
    const principal = await requireRequestAdminPrincipal();
    const form = await request.formData();
    const file = form.get('image');
    if (!(file instanceof File) || file.size < 1 || file.size > maximumBytes) {
      return redirectWith(request, 'PORTFOLIO_IMAGE_REJECTED');
    }
    const prepared = await preparePortfolioImage(
      file.name,
      new Uint8Array(await file.arrayBuffer()),
    );
    await getWebObjectStorage().put({
      body: prepared.body,
      contentType: 'image/webp',
      locator: { key: prepared.objectKey, zone: 'private' },
      source: 'LOCAL_PORTFOLIO',
    });
    const mediaId = await getWebPortfolio().registerMedia({
      actorId: principal.actorId,
      byteSize: prepared.body.byteLength,
      correlationId: `portfolio-upload-${correlationId}`,
      detectedMimeType: prepared.detectedMimeType,
      fileHash: prepared.fileHash,
      height: prepared.height,
      itemId: (await context.params).itemId,
      objectKey: prepared.objectKey,
      originalSha256: prepared.originalSha256,
      role: requestAdminRole(principal),
      safeName: prepared.safeName,
      width: prepared.width,
    });
    await enqueuePortfolioMediaProcessing(getWebCatalogJobPool(), {
      correlationId: `portfolio-process-${correlationId}`,
      idempotencyKey: `portfolio-media:process:${mediaId}`,
      portfolioMediaId: mediaId,
    });
    return redirectWith(request, 'PORTFOLIO_IMAGE_ACCEPTED');
  } catch {
    return redirectWith(request, 'PORTFOLIO_IMAGE_REJECTED');
  }
}
