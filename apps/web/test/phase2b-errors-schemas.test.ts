import { describe, expect, it } from 'vitest';

import { AiVisualizationError, safeAiError } from '../lib/ai-visualization/errors';
import { normalizedProviderFailure } from '../lib/ai-visualization/provider-error-map';
import { PolzaProviderError } from '../lib/ai-visualization/polza-provider';
import {
  createAiJobSchema,
  generateAiVisualizationSchema,
  signedUploadSchema,
} from '../lib/ai-visualization/schemas';
import { cartItemSchema } from '../lib/phase2a/schemas';

describe('Phase 2B safe validation and errors', () => {
  it('requires one server-resolved material selector and idempotency', () => {
    expect(
      createAiJobSchema.safeParse({
        idempotencyKey: 'safe_idempotency_key_123',
        materialSlug: 'linen-sand',
      }).success,
    ).toBe(true);
    expect(
      createAiJobSchema.safeParse({
        idempotencyKey: 'safe_idempotency_key_123',
        materialSlug: 'linen-sand',
        materialId: '00000000-0000-4000-8000-000000000001',
      }).success,
    ).toBe(false);
    expect(createAiJobSchema.safeParse({ materialSlug: 'linen-sand' }).success).toBe(false);
  });

  it('validates upload metadata and forbids client paths or remote URLs', () => {
    const valid = {
      byteSize: 100_000,
      height: 1200,
      idempotencyKey: 'upload_idempotency_key_123',
      mimeType: 'image/jpeg',
      sha256: 'a'.repeat(64),
      width: 1600,
    };
    expect(signedUploadSchema.safeParse(valid).success).toBe(true);
    expect(signedUploadSchema.safeParse({ ...valid, mimeType: 'image/svg+xml' }).success).toBe(
      false,
    );
    expect(
      signedUploadSchema.safeParse({ ...valid, storagePath: '../foreign/window.jpg' }).success,
    ).toBe(false);
    expect(
      signedUploadSchema.safeParse({ ...valid, materialImageUrl: 'https://evil.example/x' })
        .success,
    ).toBe(false);
  });

  it('requires explicit consent and rejects honeypot content', () => {
    expect(
      generateAiVisualizationSchema.safeParse({
        consent: true,
        idempotencyKey: 'generate_idempotency_key',
        website: '',
      }).success,
    ).toBe(true);
    expect(
      generateAiVisualizationSchema.safeParse({
        consent: false,
        idempotencyKey: 'generate_idempotency_key',
      }).success,
    ).toBe(false);
    expect(
      generateAiVisualizationSchema.safeParse({
        consent: true,
        idempotencyKey: 'generate_idempotency_key',
        website: 'bot',
      }).success,
    ).toBe(false);
  });

  it('stores only a safe project reference in cart, never Base64', () => {
    expect(
      cartItemSchema.safeParse({
        aiVisualizationPublicReference: 'a'.repeat(48),
        heightMm: 1600,
        materialSlug: 'linen-sand',
        quantity: 1,
        widthMm: 1200,
      }).success,
    ).toBe(true);
    expect(
      cartItemSchema.safeParse({
        aiVisualizationBase64: 'data:image/jpeg;base64,AAAA',
        heightMm: 1600,
        materialSlug: 'linen-sand',
        quantity: 1,
        widthMm: 1200,
      }).success,
    ).toBe(false);
  });

  it.each([
    ['POLZA_RATE_LIMITED', 'PROVIDER_RATE_LIMITED', true],
    ['POLZA_BALANCE_ERROR', 'PROVIDER_UNAVAILABLE', false],
    ['POLZA_MODEL_UNAVAILABLE', 'PROVIDER_UNAVAILABLE', false],
    ['POLZA_INVALID_REQUEST', 'PROVIDER_REJECTED', false],
    ['POLZA_OUTPUT_INVALID', 'OUTPUT_INVALID', false],
    ['POLZA_TIMEOUT', 'PROVIDER_UNAVAILABLE', true],
  ] as const)('maps %s to a safe client code', (providerCode, clientCode, pollRetry) => {
    const mapped = normalizedProviderFailure(
      new PolzaProviderError(providerCode, 'safe diagnostic'),
    );
    expect(mapped.clientCode).toBe(clientCode);
    expect(mapped.retryableStatusPoll).toBe(pollRetry);
  });

  it('never exposes an unexpected raw provider error', () => {
    const raw = new Error('Authorization: Bearer super-secret SQL select *');
    const safe = safeAiError(raw);
    expect(safe).toBeInstanceOf(AiVisualizationError);
    expect(safe.code).toBe('INTERNAL_ERROR');
    expect(safe.message).not.toMatch(/Bearer|SQL|super-secret/u);
  });
});
