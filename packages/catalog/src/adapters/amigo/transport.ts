import { setTimeout as sleepTimer } from 'node:timers/promises';

import { CatalogSourceError } from '../../errors.js';
import { sha256 } from '../../hash.js';
import { amigoAdapterVersions } from './config.js';
import {
  assertAmigoHostResolvesPublicly,
  defaultAmigoHostResolver,
  type AmigoHostResolver,
  validateAmigoUrl,
} from './security.js';

const defaultMaximumHtmlBytes = 4 * 1024 * 1024;

export interface AmigoHttpTransportOptions {
  readonly fetchImplementation?: typeof globalThis.fetch;
  readonly hostResolver?: AmigoHostResolver;
  readonly maximumAttempts?: number;
  readonly maximumHtmlBytes?: number;
  readonly minimumDelayMs?: number;
  readonly now?: () => number;
  readonly sleep?: (milliseconds: number) => Promise<void>;
  readonly timeoutMs?: number;
}

export interface AmigoHtmlPage {
  readonly capturedAt: string;
  readonly contentHash: string;
  readonly html: string;
  readonly httpStatus: number;
  readonly sourceUrl: string;
  readonly sourceVersion: string;
}

async function readBoundedBody(response: Response, maximumBytes: number): Promise<Uint8Array> {
  const declaredLength = response.headers.get('content-length');
  if (declaredLength !== null) {
    const parsedLength = Number(declaredLength);
    if (!Number.isSafeInteger(parsedLength) || parsedLength < 0 || parsedLength > maximumBytes) {
      throw new CatalogSourceError(
        'SOURCE_CONTENT_TOO_LARGE',
        'AMIGO response exceeds the configured size limit.',
      );
    }
  }

  if (response.body === null) {
    return new Uint8Array();
  }
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;
  const reader = response.body.getReader();
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    receivedBytes += result.value.byteLength;
    if (receivedBytes > maximumBytes) {
      await reader.cancel();
      throw new CatalogSourceError(
        'SOURCE_CONTENT_TOO_LARGE',
        'AMIGO response exceeds the configured size limit.',
      );
    }
    chunks.push(result.value);
  }
  const body = new Uint8Array(receivedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function containsAccessChallenge(html: string): boolean {
  const challengeTitle =
    /<title>[^<]*(?:access denied|доступ ограничен|проверка браузера)[^<]*<\/title>/iu.test(html);
  const challengeMarkup =
    /<(?:div|form|iframe)[^>]+(?:captcha|g-recaptcha|hcaptcha|cf-chl|challenge)/iu.test(html);
  const expectedCatalogMarkup =
    /class=["'][^"']*(?:catalog_all__item|windows__item)[^"']*["']/iu.test(html);
  return challengeTitle || (challengeMarkup && !expectedCatalogMarkup);
}

function normalizeTransportError(error: unknown): CatalogSourceError {
  if (error instanceof CatalogSourceError) {
    return error;
  }
  return new CatalogSourceError('SOURCE_TRANSPORT_UNAVAILABLE', 'AMIGO transport is unavailable.', {
    cause: error,
    retryable: true,
  });
}

export class AmigoHttpTransport {
  readonly #fetch: typeof globalThis.fetch;
  readonly #hostResolver: AmigoHostResolver;
  readonly #maximumAttempts: number;
  readonly #maximumHtmlBytes: number;
  readonly #minimumDelayMs: number;
  readonly #now: () => number;
  readonly #sleep: (milliseconds: number) => Promise<void>;
  readonly #timeoutMs: number;
  #hostValidation: Promise<void> | undefined;
  #lastRequestStartedAt = Number.NEGATIVE_INFINITY;
  #queue: Promise<void> = Promise.resolve();

  constructor(options: AmigoHttpTransportOptions = {}) {
    this.#fetch = options.fetchImplementation ?? globalThis.fetch;
    this.#hostResolver = options.hostResolver ?? defaultAmigoHostResolver;
    this.#maximumAttempts = options.maximumAttempts ?? 3;
    this.#maximumHtmlBytes = options.maximumHtmlBytes ?? defaultMaximumHtmlBytes;
    this.#minimumDelayMs = options.minimumDelayMs ?? 1200;
    this.#now = options.now ?? Date.now;
    this.#sleep = options.sleep ?? (async (milliseconds) => void (await sleepTimer(milliseconds)));
    this.#timeoutMs = options.timeoutMs ?? 15_000;

    if (
      !Number.isSafeInteger(this.#maximumAttempts) ||
      this.#maximumAttempts < 1 ||
      this.#maximumAttempts > 5 ||
      !Number.isSafeInteger(this.#maximumHtmlBytes) ||
      this.#maximumHtmlBytes < 1024 ||
      !Number.isSafeInteger(this.#minimumDelayMs) ||
      this.#minimumDelayMs < 0 ||
      !Number.isSafeInteger(this.#timeoutMs) ||
      this.#timeoutMs < 100
    ) {
      throw new CatalogSourceError(
        'SOURCE_CONTENT_INVALID',
        'AMIGO transport configuration is invalid.',
      );
    }
  }

  fetchPage(input: string): Promise<AmigoHtmlPage> {
    const sourceUrl = validateAmigoUrl(input, 'page').href;
    const operation = this.#queue.then(() => this.#fetchWithRetry(sourceUrl));
    this.#queue = operation.then(
      () => undefined,
      () => undefined,
    );
    return operation;
  }

  async #fetchWithRetry(sourceUrl: string): Promise<AmigoHtmlPage> {
    this.#hostValidation ??= assertAmigoHostResolvesPublicly(this.#hostResolver);
    await this.#hostValidation;

    let lastError: CatalogSourceError | undefined;
    for (let attempt = 1; attempt <= this.#maximumAttempts; attempt += 1) {
      try {
        await this.#waitForRateLimit();
        return await this.#fetchOnce(sourceUrl);
      } catch (error) {
        lastError = normalizeTransportError(error);
        if (!lastError.retryable || attempt === this.#maximumAttempts) {
          throw lastError;
        }
        await this.#sleep(Math.min(4000, 250 * 2 ** (attempt - 1)));
      }
    }
    throw (
      lastError ??
      new CatalogSourceError('SOURCE_TRANSPORT_UNAVAILABLE', 'AMIGO transport is unavailable.')
    );
  }

  async #waitForRateLimit(): Promise<void> {
    const remaining = this.#minimumDelayMs - (this.#now() - this.#lastRequestStartedAt);
    if (remaining > 0) {
      await this.#sleep(remaining);
    }
    this.#lastRequestStartedAt = this.#now();
  }

  async #fetchOnce(sourceUrl: string): Promise<AmigoHtmlPage> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.#timeoutMs);
    try {
      let requestUrl = sourceUrl;
      for (let redirects = 0; redirects <= 2; redirects += 1) {
        const response = await this.#fetch(requestUrl, {
          headers: {
            accept: 'text/html,application/xhtml+xml',
            'user-agent': 'PROJECT_NAME-partner-catalog-pilot/1.0 (owner-authorized; low-rate)',
          },
          redirect: 'manual',
          signal: controller.signal,
        });

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get('location');
          if (location === null || redirects === 2) {
            throw new CatalogSourceError(
              'SOURCE_HTTP_ERROR',
              'AMIGO returned an invalid redirect.',
              { safeDetails: { status: String(response.status) } },
            );
          }
          requestUrl = validateAmigoUrl(new URL(location, requestUrl).href, 'page').href;
          continue;
        }
        if (response.status === 401 || response.status === 403) {
          throw new CatalogSourceError(
            'SOURCE_CAPTCHA_OR_CHALLENGE',
            'AMIGO requires access that the pilot adapter does not bypass.',
            { safeDetails: { status: String(response.status) } },
          );
        }
        if (response.status === 408 || response.status === 429 || response.status >= 500) {
          throw new CatalogSourceError(
            response.status === 429 ? 'SOURCE_RATE_LIMITED' : 'SOURCE_HTTP_ERROR',
            'AMIGO returned a retryable HTTP response.',
            { retryable: true, safeDetails: { status: String(response.status) } },
          );
        }
        if (!response.ok) {
          throw new CatalogSourceError('SOURCE_HTTP_ERROR', 'AMIGO returned an HTTP error.', {
            safeDetails: { status: String(response.status) },
          });
        }
        const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
        if (!contentType.startsWith('text/html')) {
          throw new CatalogSourceError(
            'SOURCE_CONTENT_INVALID',
            'AMIGO returned an unexpected content type.',
            { safeDetails: { contentType: contentType.slice(0, 128) } },
          );
        }
        const body = await readBoundedBody(response, this.#maximumHtmlBytes);
        const html = new TextDecoder('utf-8', { fatal: false }).decode(body);
        if (containsAccessChallenge(html)) {
          throw new CatalogSourceError(
            'SOURCE_CAPTCHA_OR_CHALLENGE',
            'AMIGO returned an access challenge that the pilot adapter does not bypass.',
          );
        }
        const contentHash = sha256(body);
        const capturedAt = new Date().toISOString();
        return {
          capturedAt,
          contentHash,
          html,
          httpStatus: response.status,
          sourceUrl: requestUrl,
          sourceVersion:
            response.headers.get('etag') ??
            response.headers.get('last-modified') ??
            `sha256:${contentHash}`,
        };
      }
      throw new CatalogSourceError('SOURCE_HTTP_ERROR', 'AMIGO redirect limit was exceeded.');
    } catch (error) {
      if (controller.signal.aborted) {
        throw new CatalogSourceError('SOURCE_TIMEOUT', 'AMIGO request timed out.', {
          cause: error,
          retryable: true,
        });
      }
      throw normalizeTransportError(error);
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const amigoRawSnapshotMetadata = {
  mappingVersion: amigoAdapterVersions.mapping,
  parserVersion: amigoAdapterVersions.parser,
} as const;
