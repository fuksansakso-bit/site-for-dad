export const foundationJobErrorCodes = [
  'FOUNDATION_JOB_VALIDATION',
  'FOUNDATION_JOB_TIMEOUT',
  'FOUNDATION_JOB_ABORTED',
  'FOUNDATION_JOB_FORCED_FAILURE',
  'FOUNDATION_JOB_IDEMPOTENCY_CONFLICT',
  'FOUNDATION_JOB_IDEMPOTENCY_FAILED',
  'FOUNDATION_JOB_DEPENDENCY_UNAVAILABLE',
] as const;

export type FoundationJobErrorCode = (typeof foundationJobErrorCodes)[number];

export class FoundationJobError extends Error {
  readonly code: FoundationJobErrorCode;

  constructor(code: FoundationJobErrorCode) {
    super(code);
    this.name = 'FoundationJobError';
    this.code = code;
  }
}

export function toFoundationJobError(error: unknown): FoundationJobError {
  return error instanceof FoundationJobError
    ? error
    : new FoundationJobError('FOUNDATION_JOB_DEPENDENCY_UNAVAILABLE');
}
