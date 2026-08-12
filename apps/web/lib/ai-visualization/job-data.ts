import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import type { AiVisualizerServerConfig } from './config';
import { AiVisualizationError } from './errors';
import type { AiVisualizationJobRow } from './types';

type SettingsRow = {
  is_enabled: boolean;
  max_attempts_per_guest_per_day: number;
  global_daily_job_limit: number;
  max_concurrent_jobs: number;
  retention_hours: number;
};

export type EffectiveAiSettings = {
  enabled: boolean;
  maxAttemptsPerGuestPerDay: number;
  globalDailyJobLimit: number;
  maxConcurrentJobs: number;
  retentionHours: number;
};

export async function getEffectiveAiSettings(
  client: SupabaseClient,
  config: AiVisualizerServerConfig,
): Promise<EffectiveAiSettings> {
  const { data, error } = await client
    .from('ai_visualizer_settings')
    .select(
      'is_enabled,max_attempts_per_guest_per_day,global_daily_job_limit,max_concurrent_jobs,retention_hours',
    )
    .eq('id', true)
    .maybeSingle();
  if (error || !data) throw new AiVisualizationError('STORAGE_UNAVAILABLE', { cause: error });
  const settings = data as SettingsRow;
  return {
    enabled: config.effectiveProviderAvailable && settings.is_enabled,
    globalDailyJobLimit: Math.min(
      config.globalDailyJobLimit,
      settings.global_daily_job_limit,
    ),
    maxAttemptsPerGuestPerDay: Math.min(
      config.maxAttemptsPerGuestPerDay,
      settings.max_attempts_per_guest_per_day,
    ),
    maxConcurrentJobs: Math.min(config.maxConcurrentJobs, settings.max_concurrent_jobs),
    retentionHours: Math.min(config.retentionHours, settings.retention_hours),
  };
}

export async function requireAiEnabled(
  client: SupabaseClient,
  config: AiVisualizerServerConfig,
): Promise<EffectiveAiSettings> {
  const settings = await getEffectiveAiSettings(client, config);
  if (!settings.enabled) throw new AiVisualizationError('AI_DISABLED');
  return settings;
}

export async function getOwnedAiJob(
  client: SupabaseClient,
  publicReference: string,
  guestSessionHash: string,
): Promise<AiVisualizationJobRow> {
  const { data, error } = await client
    .from('ai_visualization_jobs')
    .select('*')
    .eq('public_reference', publicReference)
    .eq('guest_session_hash', guestSessionHash)
    .maybeSingle();
  if (error) throw new AiVisualizationError('STORAGE_UNAVAILABLE', { cause: error });
  if (!data) throw new AiVisualizationError('JOB_EXPIRED');
  const job = data as AiVisualizationJobRow;
  if (job.deleted_at || job.status === 'DELETED' || job.status === 'EXPIRED') {
    throw new AiVisualizationError('JOB_EXPIRED');
  }
  return job;
}

