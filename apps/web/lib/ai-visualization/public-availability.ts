import 'server-only';

import { createSupabaseAdminClient } from '../phase2a/supabase';
import { getAiVisualizerServerConfig } from './config';
import { getEffectiveAiSettings } from './job-data';

export async function isAiVisualizerAvailable(): Promise<boolean> {
  const client = createSupabaseAdminClient();
  if (!client) return false;
  try {
    const config = getAiVisualizerServerConfig();
    const settings = await getEffectiveAiSettings(client, config);
    return settings.enabled;
  } catch {
    return false;
  }
}

