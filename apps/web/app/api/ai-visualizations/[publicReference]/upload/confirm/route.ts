import { NextResponse } from 'next/server';

import { getAiVisualizerServerConfig } from '../../../../../../lib/ai-visualization/config';
import { AiVisualizationError, safeAiError } from '../../../../../../lib/ai-visualization/errors';
import {
  INPUT_IMAGE_LIMITS,
  validateImageBytes,
} from '../../../../../../lib/ai-visualization/image-validation';
import { getOwnedAiJob, requireAiEnabled } from '../../../../../../lib/ai-visualization/job-data';
import {
  aiErrorResponse,
  assertTrustedMutation,
  correlationId,
  readAiJson,
} from '../../../../../../lib/ai-visualization/route-utils';
import {
  confirmUploadSchema,
  publicReferenceSchema,
} from '../../../../../../lib/ai-visualization/schemas';
import {
  getAiGuestSession,
  hashAiIdempotencyKey,
} from '../../../../../../lib/ai-visualization/session';
import { downloadConfirmedUpload } from '../../../../../../lib/ai-visualization/storage-retry';
import { createSupabaseAdminClient } from '../../../../../../lib/phase2a/supabase';

export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ publicReference: string }> };

export async function POST(request: Request, context: Context) {
  const requestCorrelationId = correlationId(request);
  let jobId: string | null = null;
  let jobPath: string | null = null;
  try {
    assertTrustedMutation(request);
    const { publicReference } = await context.params;
    if (!publicReferenceSchema.safeParse(publicReference).success) {
      throw new AiVisualizationError('JOB_EXPIRED');
    }
    const parsed = confirmUploadSchema.safeParse(await readAiJson(request));
    if (!parsed.success) throw new AiVisualizationError('INVALID_IMAGE');
    const guest = await getAiGuestSession();
    if (!guest) throw new AiVisualizationError('JOB_EXPIRED');
    const client = createSupabaseAdminClient();
    if (!client) throw new AiVisualizationError('AI_DISABLED');
    const config = getAiVisualizerServerConfig();
    await requireAiEnabled(client, config);
    const job = await getOwnedAiJob(client, publicReference, guest.hash);
    jobId = job.id;
    jobPath = job.input_storage_path;
    if (job.status === 'READY' && job.input_sha256 === parsed.data.sha256) {
      return NextResponse.json(
        { publicReference, status: 'READY' },
        { headers: { 'Cache-Control': 'no-store', 'X-Correlation-ID': requestCorrelationId } },
      );
    }
    if (job.status !== 'UPLOAD_PENDING') {
      throw new AiVisualizationError('INVALID_IMAGE', { status: 409 });
    }
    if (
      job.upload_idempotency_hash !== hashAiIdempotencyKey(guest.hash, parsed.data.idempotencyKey)
    ) {
      throw new AiVisualizationError('INVALID_IMAGE', { status: 409 });
    }
    const { data, error } = await downloadConfirmedUpload(() =>
      client.storage.from(config.inputBucket).download(job.input_storage_path),
    );
    if (error || !data) throw new AiVisualizationError('STORAGE_UNAVAILABLE', { cause: error });
    const validated = await validateImageBytes(
      await data.arrayBuffer(),
      parsed.data.mimeType,
      INPUT_IMAGE_LIMITS,
    );
    if (
      validated.sha256 !== parsed.data.sha256 ||
      validated.byteSize !== parsed.data.byteSize ||
      validated.width !== parsed.data.width ||
      validated.height !== parsed.data.height
    ) {
      throw new AiVisualizationError('INVALID_IMAGE');
    }
    const { error: updateError } = await client
      .from('ai_visualization_jobs')
      .update({
        input_byte_size: validated.byteSize,
        input_height: validated.height,
        input_mime_type: validated.mimeType,
        input_sha256: validated.sha256,
        input_width: validated.width,
        status: 'READY',
      })
      .eq('id', job.id)
      .eq('guest_session_hash', guest.hash)
      .eq('status', 'UPLOAD_PENDING');
    if (updateError) throw new AiVisualizationError('STORAGE_UNAVAILABLE', { cause: updateError });
    return NextResponse.json(
      { publicReference, status: 'READY' },
      { headers: { 'Cache-Control': 'no-store', 'X-Correlation-ID': requestCorrelationId } },
    );
  } catch (error) {
    const safe = safeAiError(error);
    if (
      jobId &&
      jobPath &&
      ['INVALID_IMAGE', 'IMAGE_TOO_LARGE', 'IMAGE_TOO_SMALL', 'UNSUPPORTED_IMAGE_TYPE'].includes(
        safe.code,
      )
    ) {
      const client = createSupabaseAdminClient();
      const config = getAiVisualizerServerConfig();
      if (client) {
        await client.storage.from(config.inputBucket).remove([jobPath]);
        await client
          .from('ai_visualization_jobs')
          .update({
            completed_at: new Date().toISOString(),
            error_code: safe.code,
            safe_error_message: safe.message,
            status: 'FAILED',
          })
          .eq('id', jobId);
      }
    }
    return aiErrorResponse(error, requestCorrelationId);
  }
}
