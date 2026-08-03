import { CatalogSourceError } from '@project-name/catalog';

const storagePortErrorCodes = new Set([
  'STORAGE_CONFLICT',
  'STORAGE_DEPENDENCY_UNAVAILABLE',
  'STORAGE_METADATA_INVALID',
  'STORAGE_NOT_FOUND',
  'STORAGE_VALIDATION_ERROR',
]);

export function isCatalogStoragePortError(
  error: unknown,
): error is Error & { readonly code: string } {
  return (
    error instanceof Error &&
    error.name === 'StorageError' &&
    'code' in error &&
    typeof error.code === 'string' &&
    storagePortErrorCodes.has(error.code)
  );
}

export const catalogPipelineErrorCodes = [
  'CATALOG_PIPELINE_AUTHORIZATION',
  'CATALOG_PIPELINE_DATABASE',
  'CATALOG_PIPELINE_PAYLOAD_INVALID',
  'CATALOG_PIPELINE_MEDIA_INVALID',
  'CATALOG_PIPELINE_SOURCE_INVALID',
  'CATALOG_PIPELINE_SOURCE_UNAVAILABLE',
  'CATALOG_PIPELINE_STORAGE_UNAVAILABLE',
  'CATALOG_PIPELINE_VERSION_CONFLICT',
  'CATALOG_PIPELINE_VERSION_NOT_READY',
] as const;

export type CatalogPipelineErrorCode = (typeof catalogPipelineErrorCodes)[number];

export class CatalogPipelineError extends Error {
  readonly code: CatalogPipelineErrorCode;
  readonly retryable: boolean;

  constructor(
    code: CatalogPipelineErrorCode,
    options: { readonly cause?: unknown; readonly retryable?: boolean } = {},
  ) {
    super(code, { ...(options.cause === undefined ? {} : { cause: options.cause }) });
    this.name = 'CatalogPipelineError';
    this.code = code;
    this.retryable = options.retryable ?? false;
  }
}

export function toCatalogPipelineError(error: unknown): CatalogPipelineError {
  if (error instanceof CatalogPipelineError) {
    return error;
  }
  if (error instanceof CatalogSourceError) {
    return new CatalogPipelineError(
      error.retryable ? 'CATALOG_PIPELINE_SOURCE_UNAVAILABLE' : 'CATALOG_PIPELINE_SOURCE_INVALID',
      { cause: error, retryable: error.retryable },
    );
  }
  if (isCatalogStoragePortError(error)) {
    return new CatalogPipelineError('CATALOG_PIPELINE_STORAGE_UNAVAILABLE', {
      cause: error,
      retryable: true,
    });
  }
  return new CatalogPipelineError('CATALOG_PIPELINE_DATABASE', {
    cause: error,
    retryable: true,
  });
}
