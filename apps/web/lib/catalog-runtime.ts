import {
  parseDatabaseEnvironment,
  parseIdentityEnvironment,
  parseStorageEnvironment,
} from '@project-name/config/server';
import {
  createCatalogManagementAdapter,
  createCatalogReadAdapter,
  createCartAdapter,
  createCustomerContactAdapter,
  createPortfolioAdapter,
  createPricingAdapter,
  createRequestAdapter,
  createStandardPreviewAdapter,
  type CatalogManagementAdapter,
  type CartAdapter,
  type CustomerContactAdapter,
  type PortfolioAdapter,
  type PricingAdapter,
  type RequestAdapter,
  type StandardPreviewAdapter,
} from '@project-name/db';
import {
  createSyntheticIdentityAdapter,
  type SyntheticIdentityAdapter,
} from '@project-name/identity/synthetic';
import {
  createPasswordlessIdentityAdapter,
  type PasswordlessIdentityAdapter,
} from '@project-name/identity/passwordless';
import {
  createStaffAdministrationAdapter,
  type StaffAdministrationAdapter,
} from '@project-name/identity/staff';
import { createFoundationJobPool } from '@project-name/jobs';
import { createS3ObjectStorage } from '@project-name/storage';

let catalogManagement: CatalogManagementAdapter | undefined;
let catalogRead: ReturnType<typeof createCatalogReadAdapter> | undefined;
let cart: CartAdapter | undefined;
let customerContacts: CustomerContactAdapter | undefined;
let portfolio: PortfolioAdapter | undefined;
let identity: SyntheticIdentityAdapter | undefined;
let passwordlessIdentity: PasswordlessIdentityAdapter | undefined;
let staffAdministration: StaffAdministrationAdapter | undefined;
let jobPool: ReturnType<typeof createFoundationJobPool> | undefined;
let objectStorage: ReturnType<typeof createS3ObjectStorage> | undefined;
let pricing: PricingAdapter | undefined;
let preview: StandardPreviewAdapter | undefined;
let requests: RequestAdapter | undefined;

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

export function getWebCart(): CartAdapter {
  cart ??= createCartAdapter(databaseEnvironment());
  return cart;
}

export function getWebCustomerContacts(): CustomerContactAdapter {
  customerContacts ??= createCustomerContactAdapter(databaseEnvironment());
  return customerContacts;
}

export function getWebPortfolio(): PortfolioAdapter {
  portfolio ??= createPortfolioAdapter(databaseEnvironment());
  return portfolio;
}

export function getWebIdentity(): SyntheticIdentityAdapter {
  identity ??= createSyntheticIdentityAdapter(
    databaseEnvironment(),
    parseIdentityEnvironment(process.env),
  );
  return identity;
}

export function getWebPasswordlessIdentity(): PasswordlessIdentityAdapter {
  passwordlessIdentity ??= createPasswordlessIdentityAdapter(
    databaseEnvironment(),
    parseIdentityEnvironment(process.env),
  );
  return passwordlessIdentity;
}

export function getWebStaffAdministration(): StaffAdministrationAdapter {
  staffAdministration ??= createStaffAdministrationAdapter(
    databaseEnvironment(),
    parseIdentityEnvironment(process.env),
  );
  return staffAdministration;
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

export function getWebRequests(): RequestAdapter {
  requests ??= createRequestAdapter(databaseEnvironment());
  return requests;
}
