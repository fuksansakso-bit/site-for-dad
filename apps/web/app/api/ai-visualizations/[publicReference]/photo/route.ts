import { NextResponse } from 'next/server';

import { getAiVisualizerServerConfig } from '../../../../../lib/ai-visualization/config';
import { AiVisualizationError } from '../../../../../lib/ai-visualization/errors';
import { getOwnedAiJob } from '../../../../../lib/ai-visualization/job-data';
import {
  aiErrorResponse,
  assertTrustedMutation,
  consumeAiRateLimit,
  correlationId,
} from '../../../../../lib/ai-visualization/route-utils';
import { publicReferenceSchema } from '../../../../../lib/ai-visualization/schemas';
import { getAiGuestSession, getDailyIpHash } from '../../../../../lib/ai-visualization/session';
import { createSupabaseAdminClient } from '../../../../../lib/phase2a/supabase';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ publicReference: string }> };

export async function GET(request: Request, context: Context) {
  const requestCorrelationId = correlationId(request);
  try {
    assertTrustedMutation(request);
    const { publicReference } = await context.params;
    if (!publicReferenceSchema.safeParse(publicReference).success) {
      throw new AiVisualizationError('JOB_EXPIRED');
    }
    const guest = await getAiGuestSession();
    if (!guest) throw new AiVisualizationError('JOB_EXPIRED');
    const client = createSupabaseAdminClient();
    if (!client) throw new AiVisualizationError('STORAGE_UNAVAILABLE');
    const ipHash = getDailyIpHash(request, guest.hash);
    await consumeAiRateLimit(client, {
      eventType: 'RESULT_READ',
      guestHash: guest.hash,
      guestLimit: 30,
      ipHash,
      ipLimit: 60,
      windowSeconds: 600,
    });
    const config = getAiVisualizerServerConfig();
    const job = await getOwnedAiJob(client, publicReference, guest.hash);
    const { data, error } = await client.storage
      .from(config.inputBucket)
      .createSignedUrl(job.input_storage_path, 300);
    if (error || !data) throw new AiVisualizationError('STORAGE_UNAVAILABLE', { cause: error });
    return NextResponse.json(
      { expiresInSeconds: 300, inputUrl: data.signedUrl },
      { headers: { 'Cache-Control': 'no-store', 'X-Correlation-ID': requestCorrelationId } },
    );
  } catch (error) {
    return aiErrorResponse(error, requestCorrelationId);
  }
}
