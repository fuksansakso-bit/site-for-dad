import { RequestStoreError } from '@project-name/db';
import { ZodError } from 'zod';

import { PricingRequestError } from './pricing-security';

export function requestRouteErrorCode(error: unknown) {
  if (error instanceof ZodError || error instanceof SyntaxError || error instanceof TypeError) {
    return 'VALIDATION_ERROR' as const;
  }
  if (error instanceof PricingRequestError) return error.code;
  if (error instanceof RequestStoreError) {
    switch (error.code) {
      case 'REQUEST_AUTHORIZATION':
        return 'PERMISSION_DENIED' as const;
      case 'REQUEST_CART_EMPTY':
      case 'REQUEST_CONFLICT':
        return 'CONFLICT' as const;
      case 'REQUEST_INVALID_INPUT':
        return 'VALIDATION_ERROR' as const;
      case 'REQUEST_NOT_FOUND':
        return 'NOT_FOUND' as const;
      case 'REQUEST_DATABASE':
        return 'DEPENDENCY_UNAVAILABLE' as const;
    }
  }
  return 'INTERNAL_ERROR' as const;
}
