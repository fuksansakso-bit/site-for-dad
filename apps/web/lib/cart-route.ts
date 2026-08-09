import { guestCartResponseSchema, type GuestCartResponse } from '@project-name/contracts/cart';
import { CartStoreError, type CartStateView } from '@project-name/db';
import { ZodError, type ZodType } from 'zod';

import { PricingRequestError } from './pricing-security';

export function cartRouteErrorCode(error: unknown) {
  if (error instanceof ZodError || error instanceof SyntaxError || error instanceof TypeError) {
    return 'VALIDATION_ERROR' as const;
  }
  if (error instanceof PricingRequestError) return error.code;
  if (error instanceof CartStoreError) {
    switch (error.code) {
      case 'CART_AUTHORIZATION':
        return 'PERMISSION_DENIED' as const;
      case 'CART_CONFLICT':
        return 'CONFLICT' as const;
      case 'CART_INVALID_INPUT':
        return 'VALIDATION_ERROR' as const;
      case 'CART_NOT_FOUND':
      case 'CART_QUOTE_UNAVAILABLE':
        return 'NOT_FOUND' as const;
      case 'CART_DATABASE':
        return 'DEPENDENCY_UNAVAILABLE' as const;
    }
  }
  return 'INTERNAL_ERROR' as const;
}

export async function parseCartJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  return schema.parse(await request.json());
}

export function cartResponse(
  state: CartStateView,
  csrfToken: string,
  correlationId: string,
): GuestCartResponse {
  return guestCartResponseSchema.parse({
    ...state,
    correlationId,
    csrfToken,
  });
}
