import { PricingStoreError } from '@project-name/db';
import { IdentityError } from '@project-name/identity';
import { ZodError, type ZodType } from 'zod';

import { PricingRequestError } from './pricing-security';

export function pricingRouteErrorCode(error: unknown) {
  if (error instanceof ZodError || error instanceof SyntaxError) return 'VALIDATION_ERROR' as const;
  if (error instanceof PricingRequestError) return error.code;
  if (error instanceof IdentityError) {
    return error.code === 'IDENTITY_AUTHENTICATION_REQUIRED'
      ? ('AUTHENTICATION_REQUIRED' as const)
      : ('PERMISSION_DENIED' as const);
  }
  if (error instanceof PricingStoreError) {
    switch (error.code) {
      case 'PRICING_AUTHORIZATION': return 'PERMISSION_DENIED' as const;
      case 'PRICING_CONFLICT':
      case 'PRICING_PARITY_BLOCKED': return 'CONFLICT' as const;
      case 'PRICING_INVALID_INPUT': return 'VALIDATION_ERROR' as const;
      case 'PRICING_NOT_FOUND': return 'NOT_FOUND' as const;
      case 'PRICING_DATABASE': return 'DEPENDENCY_UNAVAILABLE' as const;
    }
  }
  return 'INTERNAL_ERROR' as const;
}

export async function parsePricingJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  return schema.parse(await request.json());
}
