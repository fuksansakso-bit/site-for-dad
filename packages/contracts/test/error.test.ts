import { describe, expect, it } from 'vitest';

import {
  createSafeErrorResponse,
  foundationErrorCodes,
  foundationErrorDefinitions,
  safeErrorResponseSchema,
} from '../src/index.js';

describe('foundation error contract', () => {
  it('maps every public code to a safe status and severity', () => {
    expect(Object.keys(foundationErrorDefinitions)).toEqual(foundationErrorCodes);
    expect(foundationErrorDefinitions).toMatchObject({
      AUTHENTICATION_REQUIRED: { httpStatus: 401 },
      CONFLICT: { httpStatus: 409 },
      DEPENDENCY_UNAVAILABLE: { httpStatus: 503 },
      INTERNAL_ERROR: { httpStatus: 500 },
      NOT_FOUND: { httpStatus: 404 },
      PERMISSION_DENIED: { httpStatus: 403 },
      RATE_LIMITED: { httpStatus: 429 },
      VALIDATION_ERROR: { httpStatus: 400 },
    });
  });

  it('returns only the safe envelope', () => {
    const response = createSafeErrorResponse('VALIDATION_ERROR', 'test-correlation-1234', [
      { field: 'name', message: 'Required.' },
    ]);

    expect(safeErrorResponseSchema.parse(response)).toEqual(response);
    expect(JSON.stringify(response)).not.toMatch(/stack|select\s|password|connection/i);
  });
});
