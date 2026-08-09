import { NextResponse } from 'next/server';

import { getWebBusinessAdministration } from '../../../../lib/catalog-runtime';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const settings = await getWebBusinessAdministration().getActiveSettings();
  return NextResponse.json(settings, {
    headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
  });
}
