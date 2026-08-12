import { NextResponse } from 'next/server';

import { getAiVisualizerServerConfig } from '../../../../../../lib/ai-visualization/config';
import { currentStaff } from '../../../../../../lib/phase2a/staff';
import { createSupabaseAdminClient } from '../../../../../../lib/phase2a/supabase';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const staff = await currentStaff();
  if (!staff || !['OWNER', 'ADMIN'].includes(staff.role)) {
    return NextResponse.json({ message: 'Доступ запрещён.' }, { status: 403 });
  }
  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'none') {
    return NextResponse.json({ message: 'Запрос отклонён.' }, { status: 403 });
  }
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/u.test(id)) {
    return NextResponse.json({ message: 'Задача не найдена.' }, { status: 404 });
  }
  const kind = new URL(request.url).searchParams.get('kind');
  if (kind !== 'input' && kind !== 'result') {
    return NextResponse.json({ message: 'Некорректный тип изображения.' }, { status: 400 });
  }
  const client = createSupabaseAdminClient();
  if (!client) return NextResponse.json({ message: 'Supabase недоступен.' }, { status: 503 });
  const { data: job, error } = await client
    .from('ai_visualization_jobs')
    .select('id,status,input_storage_path,result_storage_path,deleted_at')
    .eq('id', id)
    .maybeSingle();
  if (error || !job || job.deleted_at || ['EXPIRED', 'DELETED'].includes(job.status)) {
    return NextResponse.json({ message: 'Изображение больше недоступно.' }, { status: 410 });
  }
  const path = kind === 'input' ? job.input_storage_path : job.result_storage_path;
  if (!path) return NextResponse.json({ message: 'Изображение ещё не создано.' }, { status: 409 });
  const config = getAiVisualizerServerConfig();
  const bucket = kind === 'input' ? config.inputBucket : config.resultBucket;
  const signed = await client.storage.from(bucket).createSignedUrl(path, 60);
  if (signed.error || !signed.data) {
    return NextResponse.json({ message: 'Изображение временно недоступно.' }, { status: 503 });
  }
  const audit = await client.from('admin_audit_log').insert({
    action: 'AI_VISUALIZATION_IMAGE_VIEWED',
    actor_auth_user_id: staff.auth_user_id,
    actor_display_name: staff.display_name,
    entity: 'ai_visualization_jobs',
    entity_id: id,
    safe_diff: { kind, ttl_seconds: 60 },
  });
  if (audit.error) {
    return NextResponse.json({ message: 'Не удалось записать просмотр в аудит.' }, { status: 503 });
  }
  return NextResponse.json(
    { expiresInSeconds: 60, signedUrl: signed.data.signedUrl },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
