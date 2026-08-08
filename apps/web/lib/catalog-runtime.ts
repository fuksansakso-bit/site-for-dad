import {
  parseDatabaseEnvironment,
  parseIdentityEnvironment,
  parseStorageEnvironment,
} from '@project-name/config/server';
import {
  createCatalogManagementAdapter,
  createCatalogReadAdapter,
  createPricingAdapter,
  createStandardPreviewAdapter,
  type CatalogManagementAdapter,
  type PricingAdapter,
  type StandardPreviewAdapter,
} from '@project-name/db';
import {
  createSyntheticIdentityAdapter,
  type SyntheticIdentityAdapter,
} from '@project-name/identity/synthetic';
import { createFoundationJobPool } from '@project-name/jobs';
import { createS3ObjectStorage } from '@project-name/storage';

let catalogManagement: CatalogManagementAdapter | undefined;
let catalogRead: ReturnType<typeof createCatalogReadAdapter> | undefined;
let identity: SyntheticIdentityAdapter | undefined;
let jobPool: ReturnType<typeof createFoundationJobPool> | undefined;
let objectStorage: ReturnType<typeof createS3ObjectStorage> | undefined;
let pricing: PricingAdapter | undefined;
let preview: StandardPreviewAdapter | undefined;

function databaseEnvironment() {
  return parseDatabaseEnvironment(process.env);
}

export function getWebCatalogManagement(): CatalogManagementAdapter {
  catalogManagement ??= createCatalogManagementAdapter(databaseEnvironment());
  return catalogManagement;
}

export function getWebCatalogRead(): ReturnType<typeof createCatalogReadAdapter> {
  catalogRead ??= createCatalogReadAdapter(databaseEnvironment());
  return catalogRead;
}

export function getWebIdentity(): SyntheticIdentityAdapter {
  identity ??= createSyntheticIdentityAdapter(
    databaseEnvironment(),
    parseIdentityEnvironment(process.env),
  );
  return identity;
}

export function getWebCatalogJobPool(): ReturnType<typeof createFoundationJobPool> {
  jobPool ??= createFoundationJobPool(databaseEnvironment(), 2);
  return jobPool;
}

export function getWebCatalogSigningKey(): string {
  return parseIdentityEnvironment(process.env).SESSION_SIGNING_KEY;
}

export function getWebObjectStorage(): ReturnType<typeof createS3ObjectStorage> {
  objectStorage ??= createS3ObjectStorage(parseStorageEnvironment(process.env));
  return objectStorage;
}

export function getWebPricing(): PricingAdapter {
  pricing ??= createPricingAdapter(databaseEnvironment());
  return pricing;
}

export function getWebStandardPreview(): StandardPreviewAdapter {
  preview ??= createStandardPreviewAdapter(databaseEnvironment());
  return preview;
}
