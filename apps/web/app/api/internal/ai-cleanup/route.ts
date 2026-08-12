import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

import { cleanupExpiredAiVisualizations } from '../../../../lib/ai-visualization/cleanup';
import { getAiVisualizerServerConfig } from '../../../../lib/ai-visualization/config';
import { createSupabaseAdminClient } from '../../../../lib/phase2a/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function authorized(request: Request): boolean {
  const secret = process.env['CRON_SECRET'];
  const authorization = request.headers.get('authorization');
  if (!secret || secret.length < 16 || !authorization?.startsWith('Bearer ')) return false;
  const received = authorization.slice('Bearer '.length);
  const expectedBytes = Buffer.from(secret);
  const receivedBytes = Buffer.from(received);
  return (
    expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes)
  );
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }
  const client = createSupabaseAdminClient();
  if (!client) {
    return NextResponse.json({ error: 'SERVICE_UNAVAILABLE' }, { status: 503 });
  }
  try {
    const summary = await cleanupExpiredAiVisualizations(client, getAiVisualizerServerConfig(), {
      maximumBatches: 10,
    });
    return NextResponse.json(summary, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'CLEANUP_FAILED' }, { status: 503 });
  }
}
