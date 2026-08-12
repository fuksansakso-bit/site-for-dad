export const storageErrorCodes = [
  'STORAGE_VALIDATION_ERROR',
  'STORAGE_NOT_FOUND',
  'STORAGE_CONFLICT',
  'STORAGE_METADATA_INVALID',
  'STORAGE_DEPENDENCY_UNAVAILABLE',
] as const;

export type StorageErrorCode = (typeof storageErrorCodes)[number];

export class StorageError extends Error {
  readonly code: StorageErrorCode;

  constructor(code: StorageErrorCode, safeMessage: string) {
    super(safeMessage);
    this.name = 'StorageError';
    this.code = code;
  }
}

export function isStorageError(error: unknown): error is StorageError {
  return error instanceof StorageError;
}
