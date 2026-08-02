import { describe, expect, it } from 'vitest';

import { classifyFoundationError } from '../src/errors.js';

describe('safe error classification', () => {
  it('maps dependency errors without preserving their private message', () => {
    const error = Object.assign(new Error('private provider detail'), {
      code: 'STORAGE_DEPENDENCY_UNAVAILABLE',
    });

    expect(classifyFoundationError(error)).toEqual({
      code: 'DEPENDENCY_UNAVAILABLE',
      errorClass: 'Error',
      httpStatus: 503,
      retryable: true,
      severity: 'error',
    });
    expect(JSON.stringify(classifyFoundationError(error))).not.toContain('private provider detail');
  });
});
