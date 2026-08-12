import { NextResponse } from 'next/server';
import { publicEnv } from '../../../lib/phase2a/env';
export function GET() {
  return NextResponse.json(
    { status: 'ok', supabaseConfigured: publicEnv().success, service: 'web' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
