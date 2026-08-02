import { CatalogSourceError } from '@project-name/catalog';

export const catalogPipelineErrorCodes = [
  'CATALOG_PIPELINE_AUTHORIZATION',
  'CATALOG_PIPELINE_DATABASE',
  'CATALOG_PIPELINE_PAYLOAD_INVALID',
  'CATALOG_PIPELINE_SOURCE_INVALID',
  'CATALOG_PIPELINE_SOURCE_UNAVAILABLE',
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
  return new CatalogPipelineError('CATALOG_PIPELINE_DATABASE', {
    cause: error,
    retryable: true,
  });
}
