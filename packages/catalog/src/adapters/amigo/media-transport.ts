import { setTimeout as sleepTimer } from 'node:timers/promises';

import { CatalogSourceError } from '../../errors.js';
import { sha256 } from '../../hash.js';
import { type SourceMediaFile } from '../../types.js';
import {
  assertAmigoHostResolvesPublicly,
  defaultAmigoHostResolver,
  type AmigoHostResolver,
  validateAmigoUrl,
} from './security.js';

const supportedMediaTypes = ['image/jpeg', 'image/png', 'image/webp'] as const;

export interface AmigoMediaTransportOptions {
  readonly fetchImplementation?: typeof globalThis.fetch;
  readonly hostResolver?: AmigoHostResolver;
  readonly maximumAttempts?: number;
  readonly maximumMediaBytes?: number;
  readonly minimumDelayMs?: number;
  readonly now?: () => number;
  readonly sleep?: (milliseconds: number) => Promise<void>;
  readonly timeoutMs?: number;
}

async function readBoundedMedia(response: Response, maximumBytes: number): Promise<Uint8Array> {
  const declaredLength = response.headers.get('content-length');
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 1 || parsedLength > maximumBytes) {
      throw new CatalogSourceError(
        'SOURCE_CONTENT_TOO_LARGE',
        'AMIGO media exceeds the configured size limit.',
      );
    }
  }
  if (response.body === null) {
    throw new CatalogSourceError('SOURCE_CONTENT_INVALID', 'AMIGO media body is missing.');
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    receivedBytes += result.value.byteLength;
    if (receivedBytes > maximumBytes) {
      await reader.cancel();
      throw new CatalogSourceError(
        'SOURCE_CONTENT_TOO_LARGE',
        'AMIGO media exceeds the configured size limit.',
      );
    }
    chunks.push(result.value);
  }
  if (receivedBytes < 1) {
    throw new CatalogSourceError('SOURCE_CONTENT_INVALID', 'AMIGO media body is empty.');
  }
  const body = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function normalizeMediaError(error: unknown): CatalogSourceError {
  if (error instanceof CatalogSourceError) return error;
  return new CatalogSourceError('SOURCE_TRANSPORT_UNAVAILABLE', 'AMIGO media is unavailable.', {
    cause: error,
    retryable: true,
  });
}

export class AmigoMediaTransport {
  readonly #fetch: typeof globalThis.fetch;
  readonly #hostResolver: AmigoHostResolver;
  readonly #maximumAttempts: number;
  readonly #maximumMediaBytes: number;
  readonly #minimumDelayMs: number;
  readonly #now: () => number;
  readonly #sleep: (milliseconds: number) => Promise<void>;
  readonly #timeoutMs: number;
  #hostValidation: Promise<void> | undefined;
  #lastRequestStartedAt = Number.NEGATIVE_INFINITY;
  #queue: Promise<void> = Promise.resolve();

  constructor(options: AmigoMediaTransportOptions = {}) {
    this.#fetch = options.fetchImplementation ?? globalThis.fetch;
    this.#hostResolver = options.hostResolver ?? defaultAmigoHostResolver;
    this.#maximumAttempts = options.maximumAttempts ?? 3;
    this.#maximumMediaBytes = options.maximumMediaBytes ?? 8 * 1024 * 1024;
    this.#minimumDelayMs = options.minimumDelayMs ?? 1200;
    this.#now = options.now ?? Date.now;
    this.#sleep = options.sleep ?? (async (milliseconds) => void (await sleepTimer(milliseconds)));
    this.#timeoutMs = options.timeoutMs ?? 15_000;
    if (
      !Number.isSafeInteger(this.#maximumAttempts) ||
      this.#maximumAttempts < 1 ||
      this.#maximumAttempts > 5 ||
      !Number.isSafeInteger(this.#maximumMediaBytes) ||
      this.#maximumMediaBytes < 1024 ||
      !Number.isSafeInteger(this.#minimumDelayMs) ||
      this.#minimumDelayMs < 0 ||
      !Number.isSafeInteger(this.#timeoutMs) ||
      this.#timeoutMs < 100
    ) {
      throw new CatalogSourceError(
        'SOURCE_CONTENT_INVALID',
        'AMIGO media transport configuration is invalid.',
      );
    }
  }

  fetchMedia(input: string): Promise<SourceMediaFile> {
    const sourceUrl = validateAmigoUrl(input, 'media').href;
    const operation = this.#queue.then(() => this.#fetchWithRetry(sourceUrl));
    this.#queue = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }

  async #fetchWithRetry(sourceUrl: string): Promise<SourceMediaFile> {
    this.#hostValidation ??= assertAmigoHostResolvesPublicly(this.#hostResolver);
    await this.#hostValidation;
    let lastError: CatalogSourceError | undefined;
    for (let attempt = 1; attempt <= this.#maximumAttempts; attempt += 1) {
      try {
        const remaining = this.#minimumDelayMs - (this.#now() - this.#lastRequestStartedAt);
        if (remaining > 0) await this.#sleep(remaining);
        this.#lastRequestStartedAt = this.#now();
        return await this.#fetchOnce(sourceUrl);
      } catch (error) {
        lastError = normalizeMediaError(error);
        if (!lastError.retryable || attempt === this.#maximumAttempts) throw lastError;
        await this.#sleep(Math.min(4000, 250 * 2 ** (attempt - 1)));
      }
    }
    throw lastError ?? new CatalogSourceError('SOURCE_TRANSPORT_UNAVAILABLE', 'Media failed.');
  }

  async #fetchOnce(sourceUrl: string): Promise<SourceMediaFile> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.#timeoutMs);
    try {
      let requestUrl = sourceUrl;
      for (let redirects = 0; redirects <= 2; redirects += 1) {
        const response = await this.#fetch(requestUrl, {
          headers: {
            accept: supportedMediaTypes.join(','),
            'user-agent': 'PROJECT_NAME-partner-catalog-pilot/1.0 (owner-authorized; low-rate)',
          },
          redirect: 'manual',
          signal: controller.signal,
        });
        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (location === null || redirects === 2) {
            throw new CatalogSourceError('SOURCE_HTTP_ERROR', 'AMIGO media redirect is invalid.');
          }
          requestUrl = validateAmigoUrl(new URL(location, requestUrl).href, 'media').href;
          continue;
        }
        if (response.status === 401 || response.status === 403) {
          throw new CatalogSourceError(
            'SOURCE_CAPTCHA_OR_CHALLENGE',
            'AMIGO media requires access that the pilot adapter does not bypass.',
          );
        }
        if (response.status === 408 || response.status === 429 || response.status >= 500) {
          throw new CatalogSourceError(
            response.status === 429 ? 'SOURCE_RATE_LIMITED' : 'SOURCE_HTTP_ERROR',
            'AMIGO media returned a retryable response.',
            { retryable: true, safeDetails: { status: String(response.status) } },
          );
        }
        if (!response.ok) {
          throw new CatalogSourceError('SOURCE_HTTP_ERROR', 'AMIGO media returned an HTTP error.', {
            safeDetails: { status: String(response.status) },
          });
        }
        const contentType = response.headers
          .get('content-type')
          ?.split(';')[0]
          ?.trim()
          .toLowerCase();
        if (!supportedMediaTypes.includes(contentType as (typeof supportedMediaTypes)[number])) {
          throw new CatalogSourceError(
            'SOURCE_CONTENT_INVALID',
            'AMIGO media returned an unsupported content type.',
            { safeDetails: { contentType: (contentType ?? 'missing').slice(0, 128) } },
          );
        }
        const body = await readBoundedMedia(response, this.#maximumMediaBytes);
        const originalFilename = new URL(sourceUrl).pathname.split('/').at(-1);
        if (originalFilename === undefined || originalFilename.length > 255) {
          throw new CatalogSourceError(
            'SOURCE_CONTENT_INVALID',
            'AMIGO media filename metadata is invalid.',
          );
        }
        return {
          body,
          capturedAt: new Date().toISOString(),
          contentHash: sha256(body),
          contentType: contentType as SourceMediaFile['contentType'],
          httpStatus: response.status,
          originalFilename,
          sourceUrl,
        };
      }
      throw new CatalogSourceError('SOURCE_HTTP_ERROR', 'AMIGO media redirect limit exceeded.');
    } catch (error) {
      if (controller.signal.aborted) {
        throw new CatalogSourceError('SOURCE_TIMEOUT', 'AMIGO media request timed out.', {
          cause: error,
          retryable: true,
        });
      }
      throw normalizeMediaError(error);
    } finally {
      clearTimeout(timeout);
    }
  }
}
