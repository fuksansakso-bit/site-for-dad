export const catalogSourceErrorCodes = [
  'SOURCE_CAPTCHA_OR_CHALLENGE',
  'SOURCE_CONTENT_INVALID',
  'SOURCE_CONTENT_TOO_LARGE',
  'SOURCE_HTTP_ERROR',
  'SOURCE_ID_NOT_FOUND',
  'SOURCE_MAPPING_INCOMPLETE',
  'SOURCE_RATE_LIMITED',
  'SOURCE_TIMEOUT',
  'SOURCE_TRANSPORT_UNAVAILABLE',
  'SOURCE_URL_REJECTED',
] as const;

export type CatalogSourceErrorCode = (typeof catalogSourceErrorCodes)[number];

export class CatalogSourceError extends Error {
  readonly code: CatalogSourceErrorCode;
  readonly retryable: boolean;
  readonly safeDetails: Readonly<Record<string, string>>;

  constructor(
    code: CatalogSourceErrorCode,
    message: string,
    options: {
      readonly cause?: unknown;
      readonly retryable?: boolean;
      readonly safeDetails?: Readonly<Record<string, string>>;
    } = {},
  ) {
    super(message, { ...(options.cause === undefined ? {} : { cause: options.cause }) });
    this.name = 'CatalogSourceError';
    this.code = code;
    this.retryable = options.retryable ?? false;
    this.safeDetails = options.safeDetails ?? {};
  }
}
