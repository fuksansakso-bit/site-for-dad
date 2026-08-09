import { NextResponse, type NextRequest } from 'next/server';

import { getWebObjectStorage, getWebPortfolio } from '../../../../../../lib/catalog-runtime';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { readonly params: Promise<{ readonly mediaId: string }> },
): Promise<NextResponse> {
  const variant =
    request.nextUrl.searchParams.get('variant') === 'thumbnail' ? 'thumbnail' : 'display';
  const descriptor = await getWebPortfolio().getPublishedMedia(
    (await context.params).mediaId,
    variant,
  );
  if (descriptor === null) {
    return NextResponse.json(
      { code: 'NOT_FOUND', message: 'Изображение недоступно.' },
      { headers: { 'Cache-Control': 'no-store' }, status: 404 },
    );
  }
  const stored = await getWebObjectStorage().get({ key: descriptor.objectKey, zone: 'private' });
  return new NextResponse(Buffer.from(stored.body), {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      'Content-Length': String(stored.body.byteLength),
      'Content-Type': descriptor.mimeType,
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
