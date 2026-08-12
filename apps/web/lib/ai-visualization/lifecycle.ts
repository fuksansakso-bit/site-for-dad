import 'server-only';

import { createHash, randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

import { publicImageUrl } from '../phase2a/data';
import { nearestSupportedAspectRatio, numericAspectRatio } from './aspect-ratio';
import {
  AI_VISUALIZATION_CONSENT_VERSION,
  type AiVisualizerServerConfig,
} from './config';
import { AiVisualizationError, safeAiMessage } from './errors';
import {
  INPUT_IMAGE_LIMITS,
  normalizeProviderResult,
  validateImageBytes,
} from './image-validation';
import {
  getEffectiveAiSettings,
  type EffectiveAiSettings,
} from './job-data';
import {
  downloadValidatedMaterialImage,
  resolveAiMaterial,
} from './material';
import { normalizedProviderFailure, type NormalizedProviderFailure } from './provider-error-map';
import { createImageVisualizationProvider } from './provider-factory';
import { buildVisualizationPrompt } from './prompt';
import { combinedRequestHash } from './request-hash';
import { downloadPolzaResult } from './result-fetch';
import { AI_VISUALIZATION_ERROR_CODES } from './types';
import type {
  AiVisualizationErrorCode,
  AiVisualizationJobRow,
  SafeAiVisualizationJob,
} from './types';

type ReservationResult = {
  outcome?: string;
  jobId?: string;
  publicReference?: string;
  attemptNumber?: number;
};

function publicErrorCode(value: string | null): AiVisualizationErrorCode | null {
  return value && AI_VISUALIZATION_ERROR_CODES.includes(value as AiVisualizationErrorCode)
    ? (value as AiVisualizationErrorCode)
    : null;
}

export function safeJobPayload(
  job: AiVisualizationJobRow,
  reused = false,
): SafeAiVisualizationJob & { resultAvailable: boolean } {
  return {
    attemptNumber: job.attempt_number,
    errorCode: publicErrorCode(job.error_code),
    errorMessage: job.safe_error_message,
    expiresAt: job.expires_at,
    material: {
      article: job.article_snapshot,
      availability: job.availability_snapshot,
      categoryName: job.category_snapshot,
      color: job.color_snapshot,
      family: job.product_family,
      imageUrl: publicImageUrl('catalog', job.material_image_path_snapshot) ?? '',
      name: job.material_name_snapshot,
      slug: job.material_slug_snapshot,
    },
    publicReference: job.public_reference,
    resultAvailable: job.status === 'SUCCEEDED' && job.result_storage_path !== null,
    reused,
    status: job.status,
  };
}

async function downloadInput(
  client: SupabaseClient,
  config: AiVisualizerServerConfig,
  job: AiVisualizationJobRow,
) {
  const { data, error } = await client.storage
    .from(config.inputBucket)
    .download(job.input_storage_path);
  if (error || !data) throw new AiVisualizationError('STORAGE_UNAVAILABLE', { cause: error });
  const validated = await validateImageBytes(
    await data.arrayBuffer(),
    job.input_mime_type,
    INPUT_IMAGE_LIMITS,
  );
  if (!job.input_sha256 || validated.sha256 !== job.input_sha256) {
    throw new AiVisualizationError('INVALID_IMAGE');
  }
  return validated;
}

async function reservation(
  client: SupabaseClient,
  input: {
    combinedHash: string;
    config: AiVisualizerServerConfig;
    guestHash: string;
    idempotencyHash: string;
    job: AiVisualizationJobRow;
    settings: EffectiveAiSettings;
  },
): Promise<ReservationResult> {
  const { data, error } = await client.rpc('reserve_ai_visualization_attempt', {
    p_combined_request_hash: input.combinedHash,
    p_dedup_minutes: 30,
    p_global_daily_limit: input.settings.globalDailyJobLimit,
    p_guest_daily_limit: input.settings.maxAttemptsPerGuestPerDay,
    p_guest_session_hash: input.guestHash,
    p_idempotency_hash: input.idempotencyHash,
    p_job_id: input.job.id,
    p_max_concurrent_jobs: input.settings.maxConcurrentJobs,
    p_model_name: input.config.modelName,
    p_output_size: input.config.outputSize,
    p_prompt_version: input.job.prompt_version,
    p_retention_hours: input.settings.retentionHours,
  });
  if (error || !data) throw new AiVisualizationError('STORAGE_UNAVAILABLE', { cause: error });
  return data as ReservationResult;
}

async function ownedJobById(
  client: SupabaseClient,
  jobId: string,
  guestHash: string,
): Promise<AiVisualizationJobRow> {
  const { data, error } = await client
    .from('ai_visualization_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('guest_session_hash', guestHash)
    .maybeSingle();
  if (error) throw new AiVisualizationError('STORAGE_UNAVAILABLE', { cause: error });
  if (!data) throw new AiVisualizationError('JOB_EXPIRED');
  return data as AiVisualizationJobRow;
}

async function finishFailure(
  client: SupabaseClient,
  job: AiVisualizationJobRow,
  attemptNumber: number,
  failure: NormalizedProviderFailure,
  providerStatus: string | null = null,
): Promise<void> {
  const { data, error } = await client.rpc('fail_ai_visualization_attempt', {
    p_attempt_number: attemptNumber,
    p_client_error_code: failure.clientCode,
    p_job_id: job.id,
    p_provider_error_code: failure.providerCode,
    p_provider_status: providerStatus,
    p_rejected: failure.rejected,
    p_safe_diagnostic: failure.safeDiagnostic,
    p_safe_error_message: safeAiMessage(failure.clientCode),
  });
  if (error || data !== true) {
    throw new AiVisualizationError('STORAGE_UNAVAILABLE', { cause: error });
  }
}

async function recordProviderJob(
  client: SupabaseClient,
  input: {
    attemptNumber: number;
    guestHash: string;
    jobId: string;
    modelName: string;
    providerJobId: string;
    providerStatus: string;
  },
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const { data, error } = await client.rpc('record_ai_visualization_provider_job', {
      p_attempt_number: input.attemptNumber,
      p_guest_session_hash: input.guestHash,
      p_job_id: input.jobId,
      p_model_name: input.modelName,
      p_provider_job_id: input.providerJobId,
      p_provider_status: input.providerStatus,
    });
    if (!error && data === true) return;
    lastError = error;
  }
  throw new AiVisualizationError('STORAGE_UNAVAILABLE', { cause: lastError });
}

function reservationError(outcome: string | undefined): AiVisualizationError {
  if (outcome === 'GUEST_DAILY_LIMIT' || outcome === 'GLOBAL_DAILY_LIMIT') {
    return new AiVisualizationError('DAILY_LIMIT_REACHED');
  }
  if (outcome === 'CONCURRENCY_LIMIT') return new AiVisualizationError('RATE_LIMITED');
  if (outcome === 'JOB_ALREADY_RUNNING' || outcome === 'INVALID_STATUS') {
    return new AiVisualizationError('JOB_ALREADY_RUNNING');
  }
  if (outcome === 'NOT_FOUND') return new AiVisualizationError('JOB_EXPIRED');
  return new AiVisualizationError('INTERNAL_ERROR');
}

export async function startAiVisualization(
  client: SupabaseClient,
  input: {
    config: AiVisualizerServerConfig;
    guestHash: string;
    idempotencyHash: string;
    job: AiVisualizationJobRow;
    settings: EffectiveAiSettings;
  },
): Promise<SafeAiVisualizationJob & { resultAvailable: boolean }> {
  if (!['READY', 'FAILED', 'REJECTED'].includes(input.job.status)) {
    throw new AiVisualizationError('JOB_ALREADY_RUNNING');
  }
  const windowImage = await downloadInput(client, input.config, input.job);
  const material = await resolveAiMaterial(client, { materialId: input.job.material_id });
  if (material.storagePath !== input.job.material_image_path_snapshot) {
    throw new AiVisualizationError('MATERIAL_IMAGE_UNAVAILABLE');
  }
  const materialImage = await downloadValidatedMaterialImage(client, material);
  const aspectRatio = nearestSupportedAspectRatio(windowImage.width, windowImage.height);
  const productMetadata = input.job.product_metadata ?? {};
  const prompt = buildVisualizationPrompt({
    article: material.article,
    color: material.color,
    family: material.family,
    materialName: material.name,
    productMetadata,
  });
  const requestHash = combinedRequestHash({
    inputSha256: windowImage.sha256,
    materialId: material.id,
    materialImageSha256: materialImage.sha256,
    modelName: input.config.modelName,
    outputSize: input.config.outputSize,
    productFamily: material.family,
    productMetadata,
    promptVersion: prompt.promptVersion,
  });
  const { error: metadataError } = await client
    .from('ai_visualization_jobs')
    .update({
      consent_version: AI_VISUALIZATION_CONSENT_VERSION,
      material_image_byte_size: materialImage.byteSize,
      material_image_mime_type: materialImage.mimeType,
      material_image_sha256: materialImage.sha256,
      output_aspect_ratio: aspectRatio,
    })
    .eq('id', input.job.id)
    .eq('guest_session_hash', input.guestHash);
  if (metadataError) throw new AiVisualizationError('STORAGE_UNAVAILABLE', { cause: metadataError });

  const reserved = await reservation(client, {
    combinedHash: requestHash,
    config: input.config,
    guestHash: input.guestHash,
    idempotencyHash: input.idempotencyHash,
    job: input.job,
    settings: input.settings,
  });
  if (reserved.outcome === 'IDEMPOTENT' || reserved.outcome === 'REUSED') {
    if (!reserved.jobId) throw new AiVisualizationError('INTERNAL_ERROR');
    if (reserved.outcome === 'REUSED') {
      await client.storage.from(input.config.inputBucket).remove([input.job.input_storage_path]);
    }
    return safeJobPayload(
      await ownedJobById(client, reserved.jobId, input.guestHash),
      true,
    );
  }
  if (reserved.outcome !== 'RESERVED' || !reserved.attemptNumber) {
    throw reservationError(reserved.outcome);
  }

  const processingJob = await ownedJobById(client, input.job.id, input.guestHash);
  try {
    const [windowUrl, materialUrl] = await Promise.all([
      client.storage.from(input.config.inputBucket).createSignedUrl(input.job.input_storage_path, 300),
      client.storage.from('catalog').createSignedUrl(material.storagePath, 300),
    ]);
    if (windowUrl.error || !windowUrl.data || materialUrl.error || !materialUrl.data) {
      throw new AiVisualizationError('STORAGE_UNAVAILABLE', {
        cause: windowUrl.error ?? materialUrl.error,
      });
    }
    const provider = createImageVisualizationProvider(input.config);
    const created = await provider.createJob({
      aspectRatio,
      images: [
        { mimeType: windowImage.mimeType, signedUrl: windowUrl.data.signedUrl },
        { mimeType: materialImage.mimeType, signedUrl: materialUrl.data.signedUrl },
      ],
      modelName: input.config.modelName,
      prompt: prompt.prompt,
    });
    await recordProviderJob(client, {
      attemptNumber: reserved.attemptNumber,
      guestHash: input.guestHash,
      jobId: input.job.id,
      modelName: created.modelName,
      providerJobId: created.providerJobId,
      providerStatus: created.providerStatus,
    });
    return safeJobPayload(
      await ownedJobById(client, input.job.id, input.guestHash),
      false,
    );
  } catch (error) {
    const failure = normalizedProviderFailure(error);
    await finishFailure(client, processingJob, reserved.attemptNumber, failure);
    throw new AiVisualizationError(failure.clientCode, { cause: error });
  }
}

async function pollFailure(
  client: SupabaseClient,
  job: AiVisualizationJobRow,
  failure: NormalizedProviderFailure,
): Promise<void> {
  const failures = Math.min(10, job.provider_poll_failures + 1);
  const timedOut =
    job.started_at !== null && Date.now() - new Date(job.started_at).getTime() > 10 * 60_000;
  if (failure.retryableStatusPoll && failures < 3 && !timedOut) {
    await client
      .from('ai_visualization_jobs')
      .update({
        provider_error_code: failure.providerCode,
        provider_poll_failures: failures,
      })
      .eq('id', job.id)
      .eq('status', 'PROCESSING');
    return;
  }
  await finishFailure(client, job, job.attempt_number, failure);
}

async function persistCompletedResult(
  client: SupabaseClient,
  input: {
    config: AiVisualizerServerConfig;
    job: AiVisualizationJobRow;
    providerStatus: string;
    resultBytes: Uint8Array;
    resultMime: string | null;
    retentionHours: number;
  },
): Promise<void> {
  const aspectRatio = input.job.output_aspect_ratio;
  if (!aspectRatio) throw new AiVisualizationError('OUTPUT_INVALID');
  const normalized = await normalizeProviderResult(
    input.resultBytes,
    input.resultMime,
    numericAspectRatio(aspectRatio),
  );
  const path = `${input.job.id}/result.jpg`;
  const upload = await client.storage.from(input.config.resultBucket).upload(path, normalized.bytes, {
    cacheControl: '300',
    contentType: normalized.mimeType,
    upsert: false,
  });
  if (upload.error) {
    const existing = await client.storage.from(input.config.resultBucket).download(path);
    if (existing.error || !existing.data) {
      throw new AiVisualizationError('STORAGE_UNAVAILABLE', { cause: upload.error });
    }
    const existingBytes = Buffer.from(await existing.data.arrayBuffer());
    const existingHash = createHash('sha256').update(existingBytes).digest('hex');
    if (existingHash !== normalized.sha256) {
      throw new AiVisualizationError('STORAGE_UNAVAILABLE', { cause: upload.error });
    }
  }
  const { data, error } = await client.rpc('complete_ai_visualization_attempt', {
    p_attempt_number: input.job.attempt_number,
    p_job_id: input.job.id,
    p_provider_status: input.providerStatus,
    p_result_byte_size: normalized.byteSize,
    p_result_mime_type: normalized.mimeType,
    p_result_sha256: normalized.sha256,
    p_result_storage_path: path,
    p_retention_hours: input.retentionHours,
  });
  if (error || data !== true) {
    throw new AiVisualizationError('STORAGE_UNAVAILABLE', { cause: error });
  }
}

export async function pollAiVisualization(
  client: SupabaseClient,
  input: {
    config: AiVisualizerServerConfig;
    guestHash: string;
    job: AiVisualizationJobRow;
  },
): Promise<AiVisualizationJobRow> {
  if (input.job.status !== 'PROCESSING' || !input.job.provider_request_id) return input.job;
  const { data: claim, error: claimError } = await client.rpc(
    'claim_ai_visualization_provider_poll',
    {
      p_guest_session_hash: input.guestHash,
      p_job_id: input.job.id,
      p_minimum_interval_seconds: 3,
    },
  );
  const claimed = claim as { claimed?: boolean; providerJobId?: string } | null;
  if (claimError) throw new AiVisualizationError('STORAGE_UNAVAILABLE', { cause: claimError });
  if (claimed?.claimed !== true || !claimed.providerJobId) {
    return ownedJobById(client, input.job.id, input.guestHash);
  }

  try {
    const provider = createImageVisualizationProvider(input.config);
    const status = await provider.getJobStatus(claimed.providerJobId);
    if (status.state === 'PROCESSING') {
      await client
        .from('ai_visualization_jobs')
        .update({
          provider_error_code: null,
          provider_poll_failures: 0,
          provider_status: status.providerStatus,
        })
        .eq('id', input.job.id)
        .eq('status', 'PROCESSING');
    } else if (status.state === 'FAILED' || status.state === 'REJECTED') {
      await finishFailure(
        client,
        input.job,
        input.job.attempt_number,
        {
          clientCode: status.state === 'REJECTED' ? 'PROVIDER_REJECTED' : 'PROVIDER_UNAVAILABLE',
          providerCode: 'POLZA_PROVIDER_ERROR',
          rejected: status.state === 'REJECTED',
          retryableStatusPoll: false,
          safeDiagnostic: `PROVIDER_STATUS_${status.providerStatus}`,
        },
        status.providerStatus,
      );
    } else {
      const result = await provider.getResult(status);
      const source =
        result.kind === 'url'
          ? await downloadPolzaResult(result.url)
          : { bytes: result.bytes, declaredMime: result.mimeType };
      const settings = await getEffectiveAiSettings(client, input.config);
      await persistCompletedResult(client, {
        config: input.config,
        job: input.job,
        providerStatus: status.providerStatus,
        resultBytes: source.bytes,
        resultMime: source.declaredMime,
        retentionHours: settings.retentionHours,
      });
    }
  } catch (error) {
    await pollFailure(client, input.job, normalizedProviderFailure(error));
  }
  return ownedJobById(client, input.job.id, input.guestHash);
}

export async function signedResultUrls(
  client: SupabaseClient,
  config: AiVisualizerServerConfig,
  job: AiVisualizationJobRow,
): Promise<{ inputUrl: string; resultUrl: string; expiresInSeconds: number }> {
  if (job.status !== 'SUCCEEDED' || !job.result_storage_path) {
    throw new AiVisualizationError(job.status === 'EXPIRED' ? 'JOB_EXPIRED' : 'OUTPUT_INVALID');
  }
  const [input, result] = await Promise.all([
    client.storage.from(config.inputBucket).createSignedUrl(job.input_storage_path, 300),
    client.storage.from(config.resultBucket).createSignedUrl(job.result_storage_path, 300),
  ]);
  if (input.error || !input.data || result.error || !result.data) {
    throw new AiVisualizationError('STORAGE_UNAVAILABLE', {
      cause: input.error ?? result.error,
    });
  }
  return {
    expiresInSeconds: 300,
    inputUrl: input.data.signedUrl,
    resultUrl: result.data.signedUrl,
  };
}

export async function deleteOwnedAiJob(
  client: SupabaseClient,
  config: AiVisualizerServerConfig,
  publicReference: string,
  guestHash: string,
): Promise<void> {
  const { data, error } = await client
    .from('ai_visualization_jobs')
    .select('*')
    .eq('public_reference', publicReference)
    .eq('guest_session_hash', guestHash)
    .maybeSingle();
  if (error) throw new AiVisualizationError('STORAGE_UNAVAILABLE', { cause: error });
  if (!data || data.status === 'DELETED') return;
  const job = data as AiVisualizationJobRow;
  const removals = [
    client.storage.from(config.inputBucket).remove([job.input_storage_path]),
    ...(job.result_storage_path
      ? [client.storage.from(config.resultBucket).remove([job.result_storage_path])]
      : []),
  ];
  const results = await Promise.all(removals);
  const storageError = results.find((result) => result.error)?.error;
  if (storageError) {
    await client
      .from('ai_visualization_jobs')
      .update({ cleanup_claimed_at: null, expires_at: new Date().toISOString() })
      .eq('id', job.id);
    throw new AiVisualizationError('STORAGE_UNAVAILABLE', { cause: storageError });
  }
  const { error: updateError } = await client
    .from('ai_visualization_jobs')
    .update({
      completed_at: job.completed_at ?? new Date().toISOString(),
      deleted_at: new Date().toISOString(),
      error_code: null,
      safe_error_message: null,
      status: 'DELETED',
    })
    .eq('id', job.id)
    .eq('guest_session_hash', guestHash);
  if (updateError) throw new AiVisualizationError('STORAGE_UNAVAILABLE', { cause: updateError });
}

export async function cloneSucceededJobForVariant(
  client: SupabaseClient,
  config: AiVisualizerServerConfig,
  source: AiVisualizationJobRow,
  guestHash: string,
  createIdempotencyHash: string,
  retentionHours: number,
): Promise<AiVisualizationJobRow> {
  if (source.status !== 'SUCCEEDED') throw new AiVisualizationError('OUTPUT_INVALID');
  if (
    source.completed_at &&
    Date.now() - new Date(source.completed_at).getTime() <= 30 * 60_000
  ) {
    return source;
  }
  const extension = source.input_storage_path.split('.').at(-1);
  if (!extension?.match(/^(jpg|png|webp)$/u)) throw new AiVisualizationError('INVALID_IMAGE');
  const id = randomUUID();
  const newPath = `${id}/window.${extension}`;
  const { data, error } = await client
    .from('ai_visualization_jobs')
    .insert({
      article_snapshot: source.article_snapshot,
      availability_snapshot: source.availability_snapshot,
      category_snapshot: source.category_snapshot,
      color_snapshot: source.color_snapshot,
      create_idempotency_hash: createIdempotencyHash,
      expires_at: new Date(Date.now() + retentionHours * 3_600_000).toISOString(),
      guest_session_hash: guestHash,
      id,
      input_byte_size: source.input_byte_size,
      input_height: source.input_height,
      input_mime_type: source.input_mime_type,
      input_sha256: source.input_sha256,
      input_storage_path: newPath,
      input_width: source.input_width,
      ip_hash: source.ip_hash,
      material_id: source.material_id,
      material_image_path_snapshot: source.material_image_path_snapshot,
      material_name_snapshot: source.material_name_snapshot,
      material_slug_snapshot: source.material_slug_snapshot,
      model_name: config.modelName,
      output_size: config.outputSize,
      product_family: source.product_family,
      product_metadata: source.product_metadata,
      prompt_version: source.prompt_version,
      status: 'CREATED',
    })
    .select('*')
    .single();
  if (error || !data) {
    if (error?.code === '23505') throw new AiVisualizationError('JOB_ALREADY_RUNNING');
    throw new AiVisualizationError('STORAGE_UNAVAILABLE', { cause: error });
  }
  const copy = await client.storage
    .from(config.inputBucket)
    .copy(source.input_storage_path, newPath);
  if (copy.error) {
    await client
      .from('ai_visualization_jobs')
      .update({ deleted_at: new Date().toISOString(), status: 'DELETED' })
      .eq('id', id);
    throw new AiVisualizationError('STORAGE_UNAVAILABLE', { cause: copy.error });
  }
  const ready = await client
    .from('ai_visualization_jobs')
    .update({ status: 'READY' })
    .eq('id', id)
    .eq('status', 'CREATED')
    .select('*')
    .single();
  if (ready.error || !ready.data) {
    await client.storage.from(config.inputBucket).remove([newPath]);
    throw new AiVisualizationError('STORAGE_UNAVAILABLE', { cause: ready.error });
  }
  return ready.data as AiVisualizationJobRow;
}
