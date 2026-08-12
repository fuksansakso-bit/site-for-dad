import { NextResponse } from 'next/server';

import { getAiVisualizerServerConfig } from '../../../../lib/ai-visualization/config';
import { AiVisualizationError } from '../../../../lib/ai-visualization/errors';
import { getOwnedAiJob } from '../../../../lib/ai-visualization/job-data';
import {
  deleteOwnedAiJob,
  pollAiVisualization,
  safeJobPayload,
} from '../../../../lib/ai-visualization/lifecycle';
import {
  aiErrorResponse,
  assertTrustedMutation,
  correlationId,
} from '../../../../lib/ai-visualization/route-utils';
import { publicReferenceSchema } from '../../../../lib/ai-visualization/schemas';
import { getAiGuestSession } from '../../../../lib/ai-visualization/session';
import { createSupabaseAdminClient } from '../../../../lib/phase2a/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type Context = { params: Promise<{ publicReference: string }> };

async function contextValues(request: Request, context: Context) {
  const { publicReference } = await context.params;
  if (!publicReferenceSchema.safeParse(publicReference).success) {
    throw new AiVisualizationError('JOB_EXPIRED');
  }
  const guest = await getAiGuestSession();
  if (!guest) throw new AiVisualizationError('JOB_EXPIRED');
  const client = createSupabaseAdminClient();
  if (!client) throw new AiVisualizationError('STORAGE_UNAVAILABLE');
  assertTrustedMutation(request);
  return { client, guest, publicReference };
}

export async function GET(request: Request, context: Context) {
  const requestCorrelationId = correlationId(request);
  try {
    const { client, guest, publicReference } = await contextValues(request, context);
    let job = await getOwnedAiJob(client, publicReference, guest.hash);
    if (job.status === 'PROCESSING') {
      job = await pollAiVisualization(client, {
        config: getAiVisualizerServerConfig(),
        guestHash: guest.hash,
        job,
      });
    }
    return NextResponse.json(safeJobPayload(job), {
      headers: { 'Cache-Control': 'no-store', 'X-Correlation-ID': requestCorrelationId },
    });
  } catch (error) {
    return aiErrorResponse(error, requestCorrelationId);
  }
}

export async function DELETE(request: Request, context: Context) {
  const requestCorrelationId = correlationId(request);
  try {
    const { client, guest, publicReference } = await contextValues(request, context);
    await deleteOwnedAiJob(client, getAiVisualizerServerConfig(), publicReference, guest.hash);
    return new NextResponse(null, {
      headers: { 'Cache-Control': 'no-store', 'X-Correlation-ID': requestCorrelationId },
      status: 204,
    });
  } catch (error) {
    return aiErrorResponse(error, requestCorrelationId);
  }
}
