import { StorageError } from './errors.js';
import {
  objectZones,
  syntheticObjectSource,
  type ObjectLocator,
  type ObjectZone,
  type SignedWriteInput,
} from './types.js';

const safeObjectKeyPattern = /^[a-z0-9][a-z0-9/_.-]{0,1023}$/;
const contentTypePattern = /^[a-z0-9][a-z0-9!#$&^_.+-]{0,126}\/[a-z0-9][a-z0-9!#$&^_.+-]{0,126}$/;
const checksumPattern = /^[a-f0-9]{64}$/;

export interface ProviderMetadataShape {
  readonly ContentLength?: number | undefined;
  readonly ContentType?: string | undefined;
  readonly ETag?: string | undefined;
  readonly LastModified?: Date | undefined;
  readonly Metadata?: Readonly<Record<string, string>> | undefined;
}

export const providerMetadataKeys = {
  checksumSha256: 'foundation-sha256',
  contentLength: 'foundation-content-length',
  schemaVersion: 'foundation-schema',
  source: 'foundation-source',
  zone: 'foundation-zone',
} as const;

export function assertObjectLocator(locator: ObjectLocator): void {
  if (!objectZones.includes(locator.zone)) {
    throw new StorageError('STORAGE_VALIDATION_ERROR', 'Object trust zone is invalid.');
  }
  if (
    !safeObjectKeyPattern.test(locator.key) ||
    locator.key.includes('//') ||
    locator.key.split('/').some((segment) => segment === '.' || segment === '..')
  ) {
    throw new StorageError('STORAGE_VALIDATION_ERROR', 'Object key is invalid.');
  }
}

export function assertContentType(contentType: string): void {
  if (!contentTypePattern.test(contentType)) {
    throw new StorageError('STORAGE_VALIDATION_ERROR', 'Object content type is invalid.');
  }
}

export function assertContentLength(contentLength: number, maximumBytes: number): void {
  if (!Number.isSafeInteger(contentLength) || contentLength < 1 || contentLength > maximumBytes) {
    throw new StorageError('STORAGE_VALIDATION_ERROR', 'Object size is outside the allowed range.');
  }
}

export function assertChecksum(checksumSha256: string): void {
  if (!checksumPattern.test(checksumSha256)) {
    throw new StorageError('STORAGE_VALIDATION_ERROR', 'Object checksum is invalid.');
  }
}

export function assertSignedWriteInput(input: SignedWriteInput, maximumBytes: number): void {
  assertObjectLocator(input.locator);
  assertContentType(input.contentType);
  assertContentLength(input.contentLength, maximumBytes);
  assertChecksum(input.checksumSha256);
}

export function assertGrantTtl(ttlSeconds: number, maximumSeconds: number): void {
  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > maximumSeconds) {
    throw new StorageError('STORAGE_VALIDATION_ERROR', 'Signed grant lifetime is invalid.');
  }
}

export function createProviderMetadata(
  zone: ObjectZone,
  contentLength: number,
  checksumSha256: string,
): Record<string, string> {
  return {
    [providerMetadataKeys.checksumSha256]: checksumSha256,
    [providerMetadataKeys.contentLength]: String(contentLength),
    [providerMetadataKeys.schemaVersion]: '1',
    [providerMetadataKeys.source]: syntheticObjectSource,
    [providerMetadataKeys.zone]: zone,
  };
}

export function validateProviderMetadata(
  locator: ObjectLocator,
  providerObject: ProviderMetadataShape,
): {
  readonly checksumSha256: string;
  readonly contentLength: number;
  readonly contentType: string;
  readonly etag?: string;
  readonly lastModified?: Date;
  readonly schemaVersion: 1;
  readonly source: typeof syntheticObjectSource;
  readonly zone: ObjectZone;
} {
  const metadata = providerObject.Metadata ?? {};
  const checksumSha256 = metadata[providerMetadataKeys.checksumSha256];
  const storedLength = Number(metadata[providerMetadataKeys.contentLength]);
  const contentLength = providerObject.ContentLength;
  const contentType = providerObject.ContentType;

  if (
    checksumSha256 === undefined ||
    !checksumPattern.test(checksumSha256) ||
    !Number.isSafeInteger(storedLength) ||
    storedLength < 1 ||
    contentLength !== storedLength ||
    contentType === undefined ||
    !contentTypePattern.test(contentType) ||
    metadata[providerMetadataKeys.schemaVersion] !== '1' ||
    metadata[providerMetadataKeys.source] !== syntheticObjectSource ||
    metadata[providerMetadataKeys.zone] !== locator.zone
  ) {
    throw new StorageError('STORAGE_METADATA_INVALID', 'Stored object metadata is invalid.');
  }

  return {
    checksumSha256,
    contentLength: storedLength,
    contentType,
    ...(providerObject.ETag === undefined ? {} : { etag: providerObject.ETag }),
    ...(providerObject.LastModified === undefined
      ? {}
      : { lastModified: providerObject.LastModified }),
    schemaVersion: 1,
    source: syntheticObjectSource,
    zone: locator.zone,
  };
}
