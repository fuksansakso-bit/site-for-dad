import 'server-only';

import { createSupabaseAdminClient } from '../phase2a/supabase';
import { getAiVisualizerServerConfig } from './config';
import { getEffectiveAiSettings } from './job-data';

export type PublicAiAvailability = {
  enabled: boolean;
  retentionHours: number;
};

export async function getAiVisualizerPublicAvailability(): Promise<PublicAiAvailability> {
  const config = getAiVisualizerServerConfig();
  const fallback = { enabled: false, retentionHours: config.retentionHours };
  const client = createSupabaseAdminClient();
  if (!client) return fallback;
  try {
    const settings = await getEffectiveAiSettings(client, config);
    return {
      enabled: settings.enabled,
      retentionHours: settings.retentionHours,
    };
  } catch {
    return fallback;
  }
}

export async function isAiVisualizerAvailable(): Promise<boolean> {
  return (await getAiVisualizerPublicAvailability()).enabled;
}
