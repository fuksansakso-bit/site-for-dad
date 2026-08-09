export const objectZones = ['public', 'private', 'quarantine'] as const;
export type ObjectZone = (typeof objectZones)[number];

export const syntheticObjectSource = 'SYNTHETIC_TEST' as const;
export const amigoAuthorizedCatalogObjectSource = 'AMIGO_AUTHORIZED_CATALOG' as const;
export const amigoAuthorizedPreviewObjectSource = 'AMIGO_AUTHORIZED_PREVIEW' as const;
export const objectSources = [
  syntheticObjectSource,
  'AMIGO_CATALOG_PILOT',
  amigoAuthorizedCatalogObjectSource,
  amigoAuthorizedPreviewObjectSource,
  'LOCAL_PORTFOLIO',
] as const;
export type ObjectSource = (typeof objectSources)[number];

export interface ObjectLocator {
  readonly key: string;
  readonly zone: ObjectZone;
}

export interface StorageObjectMetadata {
  readonly checksumSha256: string;
  readonly contentLength: number;
  readonly contentType: string;
  readonly etag?: string;
  readonly lastModified?: Date;
  readonly schemaVersion: 1;
  readonly source: ObjectSource;
  readonly zone: ObjectZone;
}

export interface StoredObject extends StorageObjectMetadata {
  readonly body: Uint8Array;
  readonly locator: ObjectLocator;
}

export interface PutObjectInput {
  readonly body: Uint8Array;
  readonly contentType: string;
  readonly locator: ObjectLocator;
  readonly source?: ObjectSource;
}

export interface SignedWriteInput {
  readonly checksumSha256: string;
  readonly contentLength: number;
  readonly contentType: string;
  readonly locator: ObjectLocator;
  readonly source?: ObjectSource;
}

export interface SignedObjectGrant {
  readonly expiresAt: Date;
  readonly method: 'GET' | 'PUT';
  readonly requiredHeaders: Readonly<Record<string, string>>;
  readonly url: string;
}

export interface ObjectStorage {
  checkReadiness(): Promise<'ok' | 'unavailable'>;
  createSignedReadGrant(locator: ObjectLocator, ttlSeconds?: number): Promise<SignedObjectGrant>;
  createSignedWriteGrant(input: SignedWriteInput, ttlSeconds?: number): Promise<SignedObjectGrant>;
  delete(locator: ObjectLocator): Promise<void>;
  get(locator: ObjectLocator): Promise<StoredObject>;
  getPublicReadUrl(locator: ObjectLocator): string;
  head(locator: ObjectLocator): Promise<StorageObjectMetadata>;
  put(input: PutObjectInput): Promise<StorageObjectMetadata>;
}
