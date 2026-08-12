import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';

import {
  AI_VISUALIZATION_PROMPT_VERSION,
  getAiVisualizerServerConfig,
} from '../../../../lib/ai-visualization/config';
import { AiVisualizationError } from '../../../../lib/ai-visualization/errors';
import { requireAiEnabled } from '../../../../lib/ai-visualization/job-data';
import { resolveAiMaterial } from '../../../../lib/ai-visualization/material';
import {
  aiErrorResponse,
  assertTrustedMutation,
  consumeAiRateLimit,
  correlationId,
  readAiJson,
} from '../../../../lib/ai-visualization/route-utils';
import { createAiJobSchema } from '../../../../lib/ai-visualization/schemas';
import {
  getDailyIpHash,
  getOrCreateAiGuestSession,
  hashAiIdempotencyKey,
} from '../../../../lib/ai-visualization/session';
import { createSupabaseAdminClient } from '../../../../lib/phase2a/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const requestCorrelationId = correlationId(request);
  try {
    assertTrustedMutation(request);
    const parsed = createAiJobSchema.safeParse(await readAiJson(request));
    if (!parsed.success) throw new AiVisualizationError('MATERIAL_NOT_FOUND', { status: 400 });
    const client = createSupabaseAdminClient();
    if (!client) throw new AiVisualizationError('AI_DISABLED');
    const config = getAiVisualizerServerConfig();
    const settings = await requireAiEnabled(client, config);
    const guest = await getOrCreateAiGuestSession();
    const ipHash = getDailyIpHash(request, guest.hash);
    const idempotencyHash = hashAiIdempotencyKey(guest.hash, parsed.data.idempotencyKey);
    const { data: existing, error: existingError } = await client
      .from('ai_visualization_jobs')
      .select('public_reference,status,attempt_number,expires_at,material_id,deleted_at')
      .eq('guest_session_hash', guest.hash)
      .eq('create_idempotency_hash', idempotencyHash)
      .maybeSingle();
    if (existingError) {
      throw new AiVisualizationError('STORAGE_UNAVAILABLE', { cause: existingError });
    }
    if (existing) {
      if (existing.deleted_at || ['DELETED', 'EXPIRED'].includes(existing.status)) {
        throw new AiVisualizationError('JOB_EXPIRED');
      }
      const { storagePath: _existingStoragePath, ...existingMaterial } =
        await resolveAiMaterial(client, { materialId: existing.material_id });
      return NextResponse.json(
        {
          attemptNumber: existing.attempt_number,
          expiresAt: existing.expires_at,
          material: existingMaterial,
          publicReference: existing.public_reference,
          reused: true,
          status: existing.status,
        },
        {
          headers: { 'Cache-Control': 'no-store', 'X-Correlation-ID': requestCorrelationId },
        },
      );
    }
    await consumeAiRateLimit(client, {
      eventType: 'CREATE_JOB',
      guestHash: guest.hash,
      guestLimit: 6,
      ipHash,
      ipLimit: 20,
      windowSeconds: 600,
    });
    const { storagePath: _storagePath, ...material } = await resolveAiMaterial(
      client,
      parsed.data,
    );
    const { data: active, error: activeError } = await client
      .from('ai_visualization_jobs')
      .select('id')
      .eq('guest_session_hash', guest.hash)
      .in('status', ['CREATED', 'UPLOAD_PENDING', 'READY', 'PROCESSING'])
      .limit(1);
    if (activeError) throw new AiVisualizationError('STORAGE_UNAVAILABLE', { cause: activeError });
    if ((active?.length ?? 0) > 0) throw new AiVisualizationError('JOB_ALREADY_RUNNING');

    const id = randomUUID();
    const expiresAt = new Date(Date.now() + settings.retentionHours * 3_600_000).toISOString();
    const { data: job, error } = await client
      .from('ai_visualization_jobs')
      .insert({
        expires_at: expiresAt,
        create_idempotency_hash: idempotencyHash,
        guest_session_hash: guest.hash,
        id,
        input_storage_path: `${id}/window.jpg`,
        ip_hash: ipHash,
        material_id: material.id,
        model_name: config.modelName,
        output_size: config.outputSize,
        prompt_version: AI_VISUALIZATION_PROMPT_VERSION,
        status: 'CREATED',
      })
      .select('public_reference,status,attempt_number,expires_at')
      .single();
    if (error || !job) {
      if (error?.code === '23505') throw new AiVisualizationError('JOB_ALREADY_RUNNING');
      throw new AiVisualizationError('STORAGE_UNAVAILABLE', { cause: error });
    }
    return NextResponse.json(
      {
        attemptNumber: job.attempt_number,
        expiresAt: job.expires_at,
        material,
        publicReference: job.public_reference,
        reused: false,
        status: job.status,
      },
      {
        headers: { 'Cache-Control': 'no-store', 'X-Correlation-ID': requestCorrelationId },
        status: 201,
      },
    );
  } catch (error) {
    return aiErrorResponse(error, requestCorrelationId);
  }
}
