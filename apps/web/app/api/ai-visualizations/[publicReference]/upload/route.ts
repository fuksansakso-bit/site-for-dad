import { NextResponse } from 'next/server';

import { getAiVisualizerServerConfig } from '../../../../../lib/ai-visualization/config';
import { AiVisualizationError } from '../../../../../lib/ai-visualization/errors';
import { getOwnedAiJob, requireAiEnabled } from '../../../../../lib/ai-visualization/job-data';
import {
  aiErrorResponse,
  assertTrustedMutation,
  consumeAiRateLimit,
  correlationId,
  readAiJson,
} from '../../../../../lib/ai-visualization/route-utils';
import {
  publicReferenceSchema,
  signedUploadSchema,
} from '../../../../../lib/ai-visualization/schemas';
import {
  getAiGuestSession,
  getDailyIpHash,
  hashAiIdempotencyKey,
} from '../../../../../lib/ai-visualization/session';
import { createSupabaseAdminClient } from '../../../../../lib/phase2a/supabase';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ publicReference: string }> };

function extensionForMime(mimeType: 'image/jpeg' | 'image/png' | 'image/webp'): string {
  return mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/png' ? 'png' : 'webp';
}

export async function POST(request: Request, context: Context) {
  const requestCorrelationId = correlationId(request);
  try {
    assertTrustedMutation(request);
    const { publicReference } = await context.params;
    if (!publicReferenceSchema.safeParse(publicReference).success) {
      throw new AiVisualizationError('JOB_EXPIRED');
    }
    const parsed = signedUploadSchema.safeParse(await readAiJson(request));
    if (!parsed.success) throw new AiVisualizationError('INVALID_IMAGE');
    const guest = await getAiGuestSession();
    if (!guest) throw new AiVisualizationError('JOB_EXPIRED');
    const client = createSupabaseAdminClient();
    if (!client) throw new AiVisualizationError('AI_DISABLED');
    const config = getAiVisualizerServerConfig();
    await requireAiEnabled(client, config);
    const ipHash = getDailyIpHash(request, guest.hash);
    await consumeAiRateLimit(client, {
      eventType: 'SIGNED_UPLOAD',
      guestHash: guest.hash,
      guestLimit: 8,
      ipHash,
      ipLimit: 24,
      windowSeconds: 600,
    });
    const job = await getOwnedAiJob(client, publicReference, guest.hash);
    if (!['CREATED', 'UPLOAD_PENDING'].includes(job.status)) {
      throw new AiVisualizationError('INVALID_IMAGE', { status: 409 });
    }
    const uploadIdempotencyHash = hashAiIdempotencyKey(guest.hash, parsed.data.idempotencyKey);
    if (job.upload_idempotency_hash && job.upload_idempotency_hash !== uploadIdempotencyHash) {
      throw new AiVisualizationError('INVALID_IMAGE', { status: 409 });
    }
    const path = `${job.id}/window.${extensionForMime(parsed.data.mimeType)}`;
    if (job.status === 'UPLOAD_PENDING' && job.input_storage_path !== path) {
      throw new AiVisualizationError('INVALID_IMAGE', { status: 409 });
    }
    if (job.status === 'CREATED') {
      const { error: updateError } = await client
        .from('ai_visualization_jobs')
        .update({
          input_storage_path: path,
          status: 'UPLOAD_PENDING',
          upload_idempotency_hash: uploadIdempotencyHash,
        })
        .eq('id', job.id)
        .eq('guest_session_hash', guest.hash)
        .eq('status', 'CREATED');
      if (updateError)
        throw new AiVisualizationError('STORAGE_UNAVAILABLE', { cause: updateError });
    }
    const { data, error } = await client.storage
      .from(config.inputBucket)
      .createSignedUploadUrl(path, { upsert: false });
    if (error || !data) throw new AiVisualizationError('STORAGE_UNAVAILABLE', { cause: error });
    return NextResponse.json(
      {
        bucket: config.inputBucket,
        expiresInSeconds: 7200,
        path: data.path,
        signedUrl: data.signedUrl,
        token: data.token,
      },
      { headers: { 'Cache-Control': 'no-store', 'X-Correlation-ID': requestCorrelationId } },
    );
  } catch (error) {
    return aiErrorResponse(error, requestCorrelationId);
  }
}
