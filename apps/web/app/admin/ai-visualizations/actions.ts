'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { cleanupExpiredAiVisualizations } from '../../../lib/ai-visualization/cleanup';
import { getAiVisualizerServerConfig } from '../../../lib/ai-visualization/config';
import { requireStaff, type Staff } from '../../../lib/phase2a/staff';
import { createSupabaseAdminClient } from '../../../lib/phase2a/supabase';

const uuid = z.string().uuid();

async function audit(
  staff: Staff,
  action: string,
  entityId: string | null,
  safeDiff: Record<string, unknown>,
) {
  const client = createSupabaseAdminClient();
  if (!client) throw new Error('SUPABASE_NOT_CONFIGURED');
  const { error } = await client.from('admin_audit_log').insert({
    action,
    actor_auth_user_id: staff.auth_user_id,
    actor_display_name: staff.display_name,
    entity: entityId ? 'ai_visualization_jobs' : 'ai_visualizer_settings',
    entity_id: entityId,
    safe_diff: safeDiff,
  });
  if (error) throw new Error('AUDIT_WRITE_FAILED');
}

export async function updateAiVisualizerSettings(form: FormData): Promise<void> {
  const staff = await requireStaff(['OWNER', 'ADMIN']);
  const update = {
    global_daily_job_limit: z.coerce.number().int().min(1).max(1_000).parse(form.get('globalLimit')),
    is_enabled: form.get('enabled') === 'on',
    max_attempts_per_guest_per_day: z.coerce
      .number()
      .int()
      .min(1)
      .max(20)
      .parse(form.get('guestLimit')),
    max_concurrent_jobs: z.coerce
      .number()
      .int()
      .min(1)
      .max(20)
      .parse(form.get('concurrentLimit')),
    retention_hours: z.coerce.number().int().min(1).max(168).parse(form.get('retentionHours')),
    updated_by: staff.auth_user_id,
  };
  const client = createSupabaseAdminClient();
  if (!client) throw new Error('SUPABASE_NOT_CONFIGURED');
  const { error } = await client.from('ai_visualizer_settings').update(update).eq('id', true);
  if (error) throw new Error('AI_SETTINGS_UPDATE_FAILED');
  await audit(staff, 'AI_VISUALIZER_SETTINGS_UPDATED', null, {
    global_daily_job_limit: update.global_daily_job_limit,
    is_enabled: update.is_enabled,
    max_attempts_per_guest_per_day: update.max_attempts_per_guest_per_day,
    max_concurrent_jobs: update.max_concurrent_jobs,
    retention_hours: update.retention_hours,
  });
  revalidatePath('/admin/ai-visualizations');
  revalidatePath('/visualizer');
}

export async function runAiCleanup(form: FormData): Promise<void> {
  const staff = await requireStaff(['OWNER', 'ADMIN']);
  if (form.get('confirmation') !== 'expired-only') throw new Error('CLEANUP_NOT_CONFIRMED');
  const client = createSupabaseAdminClient();
  if (!client) throw new Error('SUPABASE_NOT_CONFIGURED');
  await cleanupExpiredAiVisualizations(client, getAiVisualizerServerConfig(), {
    actorAuthUserId: staff.auth_user_id,
    actorDisplayName: staff.display_name,
    maximumBatches: 10,
  });
  revalidatePath('/admin/ai-visualizations');
}

export async function deleteAiVisualizationJob(form: FormData): Promise<void> {
  const staff = await requireStaff(['OWNER', 'ADMIN']);
  const id = uuid.parse(form.get('id'));
  const client = createSupabaseAdminClient();
  if (!client) throw new Error('SUPABASE_NOT_CONFIGURED');
  const { data, error } = await client
    .from('ai_visualization_jobs')
    .select('id,status,input_storage_path,result_storage_path')
    .eq('id', id)
    .single();
  if (error || !data) throw new Error('AI_JOB_NOT_FOUND');
  if (data.status === 'PROCESSING') throw new Error('ACTIVE_AI_JOB_CANNOT_BE_DELETED');
  const config = getAiVisualizerServerConfig();
  const input = await client.storage.from(config.inputBucket).remove([data.input_storage_path]);
  const result = data.result_storage_path
    ? await client.storage.from(config.resultBucket).remove([data.result_storage_path])
    : { error: null };
  if (input.error || result.error) throw new Error('AI_STORAGE_DELETE_FAILED');
  const { error: updateError } = await client
    .from('ai_visualization_jobs')
    .update({
      deleted_at: new Date().toISOString(),
      error_code: null,
      safe_error_message: null,
      status: 'DELETED',
    })
    .eq('id', id)
    .neq('status', 'PROCESSING');
  if (updateError) throw new Error('AI_JOB_DELETE_FAILED');
  await audit(staff, 'AI_VISUALIZATION_JOB_DELETED', id, { previous_status: data.status });
  revalidatePath('/admin/ai-visualizations');
}

