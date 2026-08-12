import 'server-only';

import { setTimeout as delay } from 'node:timers/promises';

import type { PolzaProviderErrorCode } from './types';
import type {
  CreatedProviderJob,
  CreateProviderJobInput,
  ImageVisualizationProvider,
  ProviderHealth,
  ProviderImageResult,
  ProviderJobStatus,
} from './provider';

const MAX_RESPONSE_BYTES = 32 * 1024;
const REQUEST_TIMEOUT_MS = 15_000;
const PROVIDER_ID = /^[A-Za-z0-9_-]{3,200}$/u;

export class PolzaProviderError extends Error {
  readonly code: PolzaProviderErrorCode;
  readonly safeDiagnostic: string;

  constructor(code: PolzaProviderErrorCode, safeDiagnostic: string, cause?: unknown) {
    super(code, cause === undefined ? undefined : { cause });
    this.name = 'PolzaProviderError';
    this.code = code;
    this.safeDiagnostic = safeDiagnostic.slice(0, 500);
  }
}

type JsonRecord = Record<string, unknown>;

function object(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function string(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function requestId(headers: Headers): string | null {
  const value = headers.get('x-request-id') ?? headers.get('x-correlation-id');
  return value?.match(/^[A-Za-z0-9_-]{3,200}$/u) ? value : null;
}

async function limitedJson(response: Response): Promise<JsonRecord> {
  const declared = Number.parseInt(response.headers.get('content-length') ?? '0', 10);
  if (declared > MAX_RESPONSE_BYTES) return {};
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) return {};
  try {
    return object(JSON.parse(text) as unknown) ?? {};
  } catch {
    return {};
  }
}

function diagnosticText(body: JsonRecord): string {
  const error = object(body['error']);
  return [
    string(body['code']),
    string(body['message']),
    string(error?.['code']),
    string(error?.['message']),
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .slice(0, 500);
}

function mediaResultUrl(value: unknown): string | null {
  const direct = object(value);
  if (direct) return string(direct['url']);
  if (!Array.isArray(value) || value.length !== 1) return null;
  const item = object(value[0]);
  return string(item?.['url']);
}

function normalizeHttpError(status: number, body: JsonRecord): PolzaProviderError {
  const diagnostic = diagnosticText(body).toLocaleLowerCase('en-US');
  if (status === 401 || status === 403) {
    return new PolzaProviderError('POLZA_AUTH_ERROR', `HTTP_${status}`);
  }
  if (status === 429) return new PolzaProviderError('POLZA_RATE_LIMITED', 'HTTP_429');
  if (status === 402 || /balance|insufficient|credit|fund/u.test(diagnostic)) {
    return new PolzaProviderError('POLZA_BALANCE_ERROR', `HTTP_${status}`);
  }
  if (/model.*(unavailable|not found|disabled)|unknown model/u.test(diagnostic)) {
    return new PolzaProviderError('POLZA_MODEL_UNAVAILABLE', `HTTP_${status}`);
  }
  if (status === 400 || status === 404 || status === 409 || status === 422) {
    return new PolzaProviderError('POLZA_INVALID_REQUEST', `HTTP_${status}`);
  }
  return new PolzaProviderError('POLZA_PROVIDER_ERROR', `HTTP_${status}`);
}

function normalizeThrown(error: unknown): PolzaProviderError {
  if (error instanceof PolzaProviderError) return error;
  if (error instanceof DOMException && error.name === 'AbortError') {
    return new PolzaProviderError('POLZA_TIMEOUT', 'REQUEST_TIMEOUT', error);
  }
  return new PolzaProviderError('POLZA_PROVIDER_ERROR', 'NETWORK_ERROR', error);
}

function validateSourceUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password || value.length > 4_096) {
    throw new PolzaProviderError('POLZA_INVALID_REQUEST', 'INVALID_SOURCE_URL');
  }
  return url.toString();
}

function parseProviderStatus(body: JsonRecord, fallbackModel: string): ProviderJobStatus {
  const providerJobId = string(body['id']);
  const providerStatus = string(body['status']);
  const modelName = string(body['model']) ?? fallbackModel;
  if (!providerJobId?.match(PROVIDER_ID) || !providerStatus) {
    throw new PolzaProviderError('POLZA_OUTPUT_INVALID', 'INVALID_STATUS_RESPONSE');
  }
  const normalized = providerStatus.toLocaleLowerCase('en-US');
  const resultUrl = mediaResultUrl(body['data']);
  if (normalized === 'completed') {
    if (!resultUrl) throw new PolzaProviderError('POLZA_OUTPUT_INVALID', 'MISSING_RESULT_URL');
    return {
      modelName,
      providerJobId,
      providerRequestId: null,
      providerStatus,
      resultUrl: validateSourceUrl(resultUrl),
      state: 'SUCCEEDED',
    };
  }
  if (normalized === 'pending' || normalized === 'processing') {
    return {
      modelName,
      providerJobId,
      providerRequestId: null,
      providerStatus,
      resultUrl: null,
      state: 'PROCESSING',
    };
  }
  if (normalized === 'failed') {
    return {
      modelName,
      providerJobId,
      providerRequestId: null,
      providerStatus,
      resultUrl: null,
      state: 'FAILED',
    };
  }
  if (normalized === 'cancelled') {
    return {
      modelName,
      providerJobId,
      providerRequestId: null,
      providerStatus,
      resultUrl: null,
      state: 'REJECTED',
    };
  }
  throw new PolzaProviderError('POLZA_OUTPUT_INVALID', 'UNKNOWN_PROVIDER_STATUS');
}

export class PolzaImageVisualizationProvider implements ImageVisualizationProvider {
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #modelName: string;

  constructor(input: { apiKey: string; baseUrl: string; modelName: string }) {
    if (input.apiKey.length < 12) {
      throw new PolzaProviderError('POLZA_AUTH_ERROR', 'KEY_NOT_CONFIGURED');
    }
    this.#apiKey = input.apiKey;
    this.#baseUrl = input.baseUrl.replace(/\/$/u, '');
    this.#modelName = input.modelName;
  }

  async #request(
    path: string,
    init: RequestInit,
    retryStatusRead = false,
  ): Promise<{
    body: JsonRecord;
    requestId: string | null;
  }> {
    const attempts = retryStatusRead ? 2 : 1;
    let lastError: unknown;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = globalThis.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(`${this.#baseUrl}${path}`, {
          ...init,
          cache: 'no-store',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${this.#apiKey}`,
            ...init.headers,
          },
          redirect: 'error',
          signal: controller.signal,
        });
        const body = await limitedJson(response);
        if (!response.ok) {
          const normalized = normalizeHttpError(response.status, body);
          if (
            attempt + 1 < attempts &&
            (normalized.code === 'POLZA_RATE_LIMITED' || response.status >= 500)
          ) {
            await delay(250);
            continue;
          }
          throw normalized;
        }
        return { body, requestId: requestId(response.headers) };
      } catch (error) {
        const normalized = normalizeThrown(error);
        lastError = normalized;
        if (
          attempt + 1 < attempts &&
          ['POLZA_RATE_LIMITED', 'POLZA_PROVIDER_ERROR', 'POLZA_TIMEOUT'].includes(normalized.code)
        ) {
          await delay(250);
          continue;
        }
        throw normalized;
      } finally {
        globalThis.clearTimeout(timeout);
      }
    }
    throw normalizeThrown(lastError);
  }

  async createJob(input: CreateProviderJobInput): Promise<CreatedProviderJob> {
    if (
      input.prompt.length < 50 ||
      input.prompt.length > 5_000 ||
      input.modelName !== this.#modelName
    ) {
      throw new PolzaProviderError('POLZA_INVALID_REQUEST', 'INVALID_CREATE_INPUT');
    }
    const { body, requestId: responseRequestId } = await this.#request('/media', {
      body: JSON.stringify({
        async: true,
        input: {
          aspect_ratio: input.aspectRatio,
          images: input.images.map((image) => ({
            data: validateSourceUrl(image.signedUrl),
            type: 'url',
          })),
          max_images: 1,
          prompt: input.prompt,
        },
        model: input.modelName,
      }),
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    const providerJobId = string(body['id']);
    const providerStatus = string(body['status']);
    const modelName = string(body['model']) ?? input.modelName;
    if (!providerJobId?.match(PROVIDER_ID) || !providerStatus || modelName !== input.modelName) {
      throw new PolzaProviderError('POLZA_OUTPUT_INVALID', 'INVALID_CREATE_RESPONSE');
    }
    return {
      modelName,
      providerJobId,
      providerRequestId: responseRequestId,
      providerStatus,
    };
  }

  async getJobStatus(providerJobId: string): Promise<ProviderJobStatus> {
    if (!providerJobId.match(PROVIDER_ID)) {
      throw new PolzaProviderError('POLZA_INVALID_REQUEST', 'INVALID_PROVIDER_JOB_ID');
    }
    const { body, requestId: responseRequestId } = await this.#request(
      `/media/${encodeURIComponent(providerJobId)}`,
      { method: 'GET' },
      true,
    );
    const result = parseProviderStatus(body, this.#modelName);
    if (result.providerJobId !== providerJobId) {
      throw new PolzaProviderError('POLZA_OUTPUT_INVALID', 'PROVIDER_JOB_ID_MISMATCH');
    }
    return { ...result, providerRequestId: responseRequestId };
  }

  async getResult(status: ProviderJobStatus): Promise<ProviderImageResult> {
    if (status.state !== 'SUCCEEDED' || !status.resultUrl) {
      throw new PolzaProviderError('POLZA_OUTPUT_INVALID', 'RESULT_NOT_READY');
    }
    return { kind: 'url', url: validateSourceUrl(status.resultUrl) };
  }

  async healthCheck(): Promise<ProviderHealth> {
    return { configured: true, modelName: this.#modelName, provider: 'Polza AI' };
  }
}

export function normalizePolzaProviderError(error: unknown): PolzaProviderError {
  return normalizeThrown(error);
}
