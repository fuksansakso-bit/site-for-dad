import { NextResponse } from 'next/server';

import { getAiVisualizerServerConfig } from '../../../../../lib/ai-visualization/config';
import { AiVisualizationError } from '../../../../../lib/ai-visualization/errors';
import { getOwnedAiJob, requireAiEnabled } from '../../../../../lib/ai-visualization/job-data';
import {
  safeJobPayload,
  startAiVisualization,
} from '../../../../../lib/ai-visualization/lifecycle';
import {
  aiErrorResponse,
  assertTrustedMutation,
  consumeAiRateLimit,
  correlationId,
  readAiJson,
} from '../../../../../lib/ai-visualization/route-utils';
import {
  generateAiVisualizationSchema,
  publicReferenceSchema,
} from '../../../../../lib/ai-visualization/schemas';
import {
  getAiGuestSession,
  getDailyIpHash,
  hashAiIdempotencyKey,
} from '../../../../../lib/ai-visualization/session';
import type { AiVisualizationJobRow } from '../../../../../lib/ai-visualization/types';
import { createSupabaseAdminClient } from '../../../../../lib/phase2a/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Context = { params: Promise<{ publicReference: string }> };

export async function POST(request: Request, context: Context) {
  const requestCorrelationId = correlationId(request);
  try {
    assertTrustedMutation(request);
    const { publicReference } = await context.params;
    if (!publicReferenceSchema.safeParse(publicReference).success) {
      throw new AiVisualizationError('JOB_EXPIRED');
    }
    const parsed = generateAiVisualizationSchema.safeParse(await readAiJson(request));
    if (!parsed.success) throw new AiVisualizationError('CONSENT_REQUIRED');
    if (parsed.data.website) throw new AiVisualizationError('RATE_LIMITED');
    const guest = await getAiGuestSession();
    if (!guest) throw new AiVisualizationError('JOB_EXPIRED');
    const client = createSupabaseAdminClient();
    if (!client) throw new AiVisualizationError('AI_DISABLED');
    const config = getAiVisualizerServerConfig();
    const settings = await requireAiEnabled(client, config);
    const idempotencyHash = hashAiIdempotencyKey(guest.hash, parsed.data.idempotencyKey);
    const { data: existingAttempt, error: existingAttemptError } = await client
      .from('ai_visualization_attempts')
      .select('job_id')
      .eq('guest_session_hash', guest.hash)
      .eq('idempotency_hash', idempotencyHash)
      .maybeSingle();
    if (existingAttemptError) {
      throw new AiVisualizationError('STORAGE_UNAVAILABLE', { cause: existingAttemptError });
    }
    if (existingAttempt) {
      const { data: existingJob, error: existingJobError } = await client
        .from('ai_visualization_jobs')
        .select('*')
        .eq('id', existingAttempt.job_id)
        .eq('guest_session_hash', guest.hash)
        .single();
      if (existingJobError || !existingJob) {
        throw new AiVisualizationError('STORAGE_UNAVAILABLE', { cause: existingJobError });
      }
      return NextResponse.json(safeJobPayload(existingJob as AiVisualizationJobRow, true), {
        headers: { 'Cache-Control': 'no-store', 'X-Correlation-ID': requestCorrelationId },
      });
    }
    const ipHash = getDailyIpHash(request, guest.hash);
    await consumeAiRateLimit(client, {
      eventType: 'START_GENERATION',
      guestHash: guest.hash,
      guestLimit: 4,
      ipHash,
      ipLimit: 8,
      windowSeconds: 60,
    });
    const job = await getOwnedAiJob(client, publicReference, guest.hash);
    const result = await startAiVisualization(client, {
      config,
      guestHash: guest.hash,
      idempotencyHash,
      job,
      settings,
    });
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'no-store', 'X-Correlation-ID': requestCorrelationId },
      status: result.status === 'PROCESSING' ? 202 : 200,
    });
  } catch (error) {
    return aiErrorResponse(error, requestCorrelationId);
  }
}
