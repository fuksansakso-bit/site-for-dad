import 'server-only';

import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

import { isTrustedSameOrigin, readJsonBody } from '../phase2a/request-security';
import { AiVisualizationError, safeAiError } from './errors';
import type { ApiErrorPayload } from './types';

export function correlationId(request: Request): string {
  const incoming = request.headers.get('x-correlation-id');
  return incoming?.match(/^[A-Za-z0-9_-]{8,128}$/u) ? incoming : randomUUID();
}

export function assertTrustedMutation(request: Request): void {
  if (!isTrustedSameOrigin(request)) {
    throw new AiVisualizationError('INTERNAL_ERROR', { status: 403 });
  }
}

export async function readAiJson(request: Request): Promise<unknown> {
  try {
    return await readJsonBody(request);
  } catch (error) {
    throw new AiVisualizationError('INVALID_IMAGE', { cause: error, status: 400 });
  }
}

export function aiErrorResponse(
  error: unknown,
  requestCorrelationId: string,
): NextResponse<ApiErrorPayload> {
  const safe = safeAiError(error);
  return NextResponse.json(
    {
      error: {
        code: safe.code,
        correlationId: requestCorrelationId,
        message: safe.message,
        retryable: safe.retryable,
      },
    },
    {
      headers: {
        'Cache-Control': 'no-store',
        'X-Correlation-ID': requestCorrelationId,
        ...(safe.status === 429 ? { 'Retry-After': '60' } : {}),
      },
      status: safe.status,
    },
  );
}

export async function consumeAiRateLimit(
  client: SupabaseClient,
  input: {
    eventType: 'CREATE_JOB' | 'SIGNED_UPLOAD' | 'START_GENERATION' | 'RESULT_READ';
    guestHash: string;
    ipHash: string;
    windowSeconds: number;
    guestLimit: number;
    ipLimit: number;
  },
): Promise<void> {
  const { data, error } = await client.rpc('consume_ai_visualization_rate_limit', {
    p_event_type: input.eventType,
    p_guest_session_hash: input.guestHash,
    p_guest_limit: input.guestLimit,
    p_ip_hash: input.ipHash,
    p_ip_limit: input.ipLimit,
    p_window_seconds: input.windowSeconds,
  });
  const result = data as { allowed?: boolean } | null;
  if (error) throw new AiVisualizationError('STORAGE_UNAVAILABLE', { cause: error });
  if (result?.allowed !== true) throw new AiVisualizationError('RATE_LIMITED');
}
