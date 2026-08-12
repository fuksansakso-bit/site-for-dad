import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/phase2a/supabase';
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const client = await createSupabaseServerClient();
  if (code && client) await client.auth.exchangeCodeForSession(code);
  return NextResponse.redirect(new URL('/admin', url.origin));
}
