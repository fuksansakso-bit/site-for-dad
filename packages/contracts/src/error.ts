import { z } from 'zod';

export const foundationErrorCodes = [
  'VALIDATION_ERROR',
  'AUTHENTICATION_REQUIRED',
  'PERMISSION_DENIED',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'DEPENDENCY_UNAVAILABLE',
  'INTERNAL_ERROR',
] as const;

export const foundationErrorCodeSchema = z.enum(foundationErrorCodes);
export type FoundationErrorCode = z.infer<typeof foundationErrorCodeSchema>;

export const validationDetailSchema = z
  .object({
    field: z.string().min(1).max(128),
    message: z.string().min(1).max(200),
  })
  .strict();
export type ValidationDetail = z.infer<typeof validationDetailSchema>;

export const safeErrorResponseSchema = z
  .object({
    error: z
      .object({
        code: foundationErrorCodeSchema,
        correlationId: z.string().min(8).max(128),
        details: z.array(validationDetailSchema).max(50).optional(),
        message: z.string().min(1).max(200),
      })
      .strict(),
  })
  .strict();
export type SafeErrorResponse = z.infer<typeof safeErrorResponseSchema>;

export type ErrorSeverity = 'info' | 'warn' | 'error';

export interface FoundationErrorDefinition {
  readonly httpStatus: number;
  readonly safeMessage: string;
  readonly severity: ErrorSeverity;
}

export const foundationErrorDefinitions = {
  VALIDATION_ERROR: {
    httpStatus: 400,
    safeMessage: 'The request is invalid.',
    severity: 'info',
  },
  AUTHENTICATION_REQUIRED: {
    httpStatus: 401,
    safeMessage: 'Authentication is required.',
    severity: 'info',
  },
  PERMISSION_DENIED: {
    httpStatus: 403,
    safeMessage: 'Permission denied.',
    severity: 'warn',
  },
  NOT_FOUND: {
    httpStatus: 404,
    safeMessage: 'The requested resource was not found.',
    severity: 'info',
  },
  CONFLICT: {
    httpStatus: 409,
    safeMessage: 'The request conflicts with the current state.',
    severity: 'info',
  },
  RATE_LIMITED: {
    httpStatus: 429,
    safeMessage: 'Too many requests.',
    severity: 'warn',
  },
  DEPENDENCY_UNAVAILABLE: {
    httpStatus: 503,
    safeMessage: 'A required dependency is unavailable.',
    severity: 'error',
  },
  INTERNAL_ERROR: {
    httpStatus: 500,
    safeMessage: 'An internal error occurred.',
    severity: 'error',
  },
} as const satisfies Record<FoundationErrorCode, FoundationErrorDefinition>;

export function createSafeErrorResponse(
  code: FoundationErrorCode,
  correlationId: string,
  details?: readonly ValidationDetail[],
): SafeErrorResponse {
  const definition = foundationErrorDefinitions[code];
  return safeErrorResponseSchema.parse({
    error: {
      code,
      correlationId,
      ...(details === undefined ? {} : { details }),
      message: definition.safeMessage,
    },
  });
}
