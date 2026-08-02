export const identityErrorCodes = [
  'IDENTITY_VALIDATION_ERROR',
  'IDENTITY_AUTHENTICATION_REQUIRED',
  'IDENTITY_PERMISSION_DENIED',
  'IDENTITY_CONFLICT',
  'IDENTITY_DEPENDENCY_UNAVAILABLE',
] as const;

export type IdentityErrorCode = (typeof identityErrorCodes)[number];

export class IdentityError extends Error {
  readonly code: IdentityErrorCode;

  constructor(code: IdentityErrorCode) {
    super(code);
    this.name = 'IdentityError';
    this.code = code;
  }
}
