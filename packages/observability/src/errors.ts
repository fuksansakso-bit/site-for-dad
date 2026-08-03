import {
  foundationErrorCodes,
  foundationErrorDefinitions,
  type ErrorSeverity,
  type FoundationErrorCode,
} from '@project-name/contracts/error';

const foundationErrorCodeSet = new Set<string>(foundationErrorCodes);
const safeErrorClassPattern = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;

export interface ClassifiedFoundationError {
  readonly code: FoundationErrorCode;
  readonly errorClass: string;
  readonly httpStatus: number;
  readonly retryable: boolean;
  readonly severity: ErrorSeverity;
}

function candidateCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  return typeof error.code === 'string' ? error.code : undefined;
}

function safeErrorClass(error: unknown): string {
  if (!(error instanceof Error) || !safeErrorClassPattern.test(error.name)) return 'UnknownError';
  return error.name;
}

function mapCode(error: unknown): FoundationErrorCode {
  const code = candidateCode(error);
  if (code !== undefined && foundationErrorCodeSet.has(code)) {
    return code as FoundationErrorCode;
  }
  const errorClass = safeErrorClass(error);
  if (errorClass === 'ZodError' || code?.includes('VALIDATION') === true) {
    return 'VALIDATION_ERROR';
  }
  if (code?.includes('AUTHENTICATION') === true || code?.includes('SESSION') === true) {
    return 'AUTHENTICATION_REQUIRED';
  }
  if (code?.includes('PERMISSION') === true) return 'PERMISSION_DENIED';
  if (code?.includes('NOT_FOUND') === true) return 'NOT_FOUND';
  if (code?.includes('CONFLICT') === true) return 'CONFLICT';
  if (code?.includes('RATE_LIMIT') === true) return 'RATE_LIMITED';
  if (code?.includes('UNAVAILABLE') === true || code?.includes('TIMEOUT') === true) {
    return 'DEPENDENCY_UNAVAILABLE';
  }
  return 'INTERNAL_ERROR';
}

export function classifyFoundationError(error: unknown): ClassifiedFoundationError {
  const code = mapCode(error);
  const definition = foundationErrorDefinitions[code];
  return {
    code,
    errorClass: safeErrorClass(error),
    httpStatus: definition.httpStatus,
    retryable: code === 'DEPENDENCY_UNAVAILABLE' || code === 'RATE_LIMITED',
    severity: definition.severity,
  };
}
