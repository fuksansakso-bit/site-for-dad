import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { AiVisualizerServerConfig } from './config';
import { AiVisualizationError } from './errors';

type CleanupClaim = {
  id: string;
  input_storage_path: string;
  result_storage_path: string | null;
  public_reference: string;
};

export type CleanupSummary = {
  batches: number;
  claimed: number;
  deleted: number;
  failed: number;
};

export async function cleanupExpiredAiVisualizations(
  client: SupabaseClient,
  config: AiVisualizerServerConfig,
  options: {
    actorAuthUserId?: string | null;
    actorDisplayName?: string | null;
    maximumBatches?: number;
  } = {},
): Promise<CleanupSummary> {
  const summary: CleanupSummary = { batches: 0, claimed: 0, deleted: 0, failed: 0 };
  const maximumBatches = Math.min(20, Math.max(1, options.maximumBatches ?? 10));

  for (let batch = 0; batch < maximumBatches; batch += 1) {
    const { data, error } = await client.rpc('claim_expired_ai_visualization_jobs', {
      p_batch_size: 50,
    });
    if (error) throw new AiVisualizationError('STORAGE_UNAVAILABLE', { cause: error });
    const claims = (data ?? []) as CleanupClaim[];
    if (claims.length === 0) break;
    summary.batches += 1;
    summary.claimed += claims.length;

    for (const claim of claims) {
      const input = await client.storage
        .from(config.inputBucket)
        .remove([claim.input_storage_path]);
      const result = claim.result_storage_path
        ? await client.storage.from(config.resultBucket).remove([claim.result_storage_path])
        : { error: null };
      if (input.error || result.error) {
        summary.failed += 1;
        await client
          .from('ai_visualization_jobs')
          .update({ cleanup_claimed_at: null })
          .eq('id', claim.id);
        continue;
      }
      const { error: updateError } = await client
        .from('ai_visualization_jobs')
        .update({
          cleanup_claimed_at: null,
          completed_at: new Date().toISOString(),
          deleted_at: new Date().toISOString(),
          error_code: null,
          safe_error_message: null,
          status: 'EXPIRED',
        })
        .eq('id', claim.id)
        .neq('status', 'PROCESSING');
      if (updateError) {
        summary.failed += 1;
      } else {
        summary.deleted += 1;
      }
    }
    if (claims.length < 50) break;
  }

  await client.from('admin_audit_log').insert({
    action: 'AI_EXPIRED_FILES_CLEANED',
    actor_auth_user_id: options.actorAuthUserId ?? null,
    actor_display_name: options.actorDisplayName ?? 'Vercel Cron',
    entity: 'ai_visualization_jobs',
    entity_id: null,
    safe_diff: summary,
  });
  return summary;
}
