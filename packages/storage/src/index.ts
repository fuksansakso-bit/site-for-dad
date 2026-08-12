export {
  StorageError,
  isStorageError,
  storageErrorCodes,
  type StorageErrorCode,
} from './errors.js';
export { createS3ObjectStorage, S3ObjectStorage } from './s3-object-storage.js';
export {
  amigoAuthorizedPreviewObjectSource,
  amigoAuthorizedCatalogObjectSource,
  objectSources,
  objectZones,
  syntheticObjectSource,
  type ObjectLocator,
  type ObjectSource,
  type ObjectStorage,
  type ObjectZone,
  type PutObjectInput,
  type SignedObjectGrant,
  type SignedWriteInput,
  type StorageObjectMetadata,
  type StoredObject,
} from './types.js';
