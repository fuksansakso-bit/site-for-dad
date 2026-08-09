import { CartStoreError, PreviewStoreError, RequestStoreError } from '@project-name/db';
import { describe, expect, it } from 'vitest';

import { cartRouteErrorCode } from '../lib/cart-route.js';
import { previewRouteErrorCode } from '../lib/preview-route.js';
import { pricingSafeFailure } from '../lib/pricing-security.js';
import { requestRouteErrorCode } from '../lib/request-route.js';

describe('Phase 1E safe recovery boundaries', () => {
  it('maps temporary database failures to a retryable safe error', async () => {
    expect(cartRouteErrorCode(new CartStoreError('CART_DATABASE'))).toBe('DEPENDENCY_UNAVAILABLE');
    expect(requestRouteErrorCode(new RequestStoreError('REQUEST_DATABASE'))).toBe(
      'DEPENDENCY_UNAVAILABLE',
    );

    const response = pricingSafeFailure('DEPENDENCY_UNAVAILABLE', 'phase1e-recovery-test');
    const body = await response.text();

    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(body).not.toContain('+7 999 000-00-01');
    expect(body).not.toContain('Тестовый адрес');
  });

  it('keeps a missing preview asset recoverable without exposing internals', () => {
    expect(previewRouteErrorCode(new PreviewStoreError('PREVIEW_NOT_FOUND'))).toBe('NOT_FOUND');
    expect(previewRouteErrorCode(new PreviewStoreError('PREVIEW_DATABASE'))).toBe(
      'DEPENDENCY_UNAVAILABLE',
    );
  });
});
