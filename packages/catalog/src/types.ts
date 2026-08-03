export const catalogSourceTypes = [
  'PARTNER_API',
  'PARTNER_EXPORT',
  'PARTNER_FILE',
  'PARTNER_PORTAL',
  'AUTHORIZED_PUBLIC_WEB',
  'MANUAL_MANIFEST',
  'FIXTURE',
] as const;

export type CatalogSourceType = (typeof catalogSourceTypes)[number];

export const sourceEntityTypes = [
  'CATEGORY',
  'FAMILY',
  'SYSTEM',
  'MODEL',
  'MATERIAL',
  'MATERIAL_VARIANT',
  'COLOR',
  'PROPERTY',
  'MEDIA',
  'PRICE',
] as const;

export type SourceEntityType = (typeof sourceEntityTypes)[number];

export interface SourceIdentity {
  readonly sourceCapturedAt: string;
  readonly sourceCategory?: string;
  readonly sourceEntityType: SourceEntityType;
  readonly sourceHash: string;
  readonly sourceId: string;
  readonly sourceLastVerifiedAt: string;
  readonly sourceSlug: string;
  readonly sourceType: CatalogSourceType;
  readonly sourceUrl: string;
  readonly supplierSlug: string;
}

export interface SourceCaptureMetadata {
  readonly capturedAt: string;
  readonly contentHash: string;
  readonly httpStatus: number;
  readonly mappingVersion: string;
  readonly parserVersion: string;
  readonly sourceUrl: string;
  readonly sourceVersion?: string;
  readonly status: 'CAPTURED';
}

export interface CapturedSource<T> {
  readonly capture: SourceCaptureMetadata;
  readonly data: T;
}

export interface SourceFamilyReference {
  readonly code: string;
  readonly name: string;
  readonly slug: string;
  readonly sourceId: string;
}

export interface SourceCategory {
  readonly family: SourceFamilyReference;
  readonly identity: SourceIdentity;
  readonly materialSourceIds: readonly string[];
  readonly name: string;
  readonly systemSourceIds: readonly string[];
}

export interface SourceSystem {
  readonly categorySourceId: string;
  readonly description?: string;
  readonly family: SourceFamilyReference;
  readonly identity: SourceIdentity;
  readonly mediaSourceUrl?: string;
  readonly name: string;
}

export interface SourceMaterialProperty {
  readonly key: string;
  readonly name: string;
  readonly unit?: string;
  readonly value: string;
}

export interface SourceMaterial {
  readonly article: string;
  readonly categorySourceId: string;
  readonly color: string;
  readonly family: SourceFamilyReference;
  readonly identity: SourceIdentity;
  readonly isBlackout: boolean;
  readonly isZebra: boolean;
  readonly materialName: string;
  readonly properties: readonly SourceMaterialProperty[];
  readonly systemSourceIds: readonly string[];
  readonly variantName: string;
  readonly widthMm?: number;
}

export interface SourcePrice {
  readonly amountMinor: number | null;
  readonly currency: 'RUB';
  readonly identity: SourceIdentity;
  readonly kind: 'BASE' | 'FROM';
  readonly sourceContext: Readonly<Record<string, string>>;
  readonly sourcePriceCategory: string | null;
  readonly status: 'AVAILABLE' | 'PRICE_ON_REQUEST';
}

export interface SourceMediaReference {
  readonly contentTypeHint?: string;
  readonly identity: SourceIdentity;
  readonly role: 'DETAIL' | 'PRIMARY' | 'SWATCH' | 'SYSTEM';
}

export interface SourceMediaManifest {
  readonly identity: SourceIdentity;
  readonly materialSourceId: string;
  readonly media: readonly SourceMediaReference[];
}

export interface SourceMediaFile {
  readonly body: Uint8Array;
  readonly capturedAt: string;
  readonly contentHash: string;
  readonly contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  readonly httpStatus: number;
  readonly originalFilename: string;
  readonly sourceUrl: string;
}

export interface CatalogSourceVersion {
  readonly capturedAt: string;
  readonly sourceType: CatalogSourceType;
  readonly version: string;
}

export interface CatalogSourceHealth {
  readonly checkedAt: string;
  readonly latencyMs: number;
  readonly status: 'healthy' | 'unavailable';
}

export interface CatalogSourceAdapter {
  discoverCategories(): Promise<readonly CapturedSource<SourceCategory>[]>;
  fetchCategory(sourceId: string): Promise<CapturedSource<SourceCategory>>;
  fetchMaterial(sourceId: string): Promise<CapturedSource<SourceMaterial>>;
  fetchMediaManifest(sourceId: string): Promise<CapturedSource<SourceMediaManifest>>;
  fetchMedia(sourceUrl: string): Promise<SourceMediaFile>;
  fetchPrice(sourceId: string): Promise<CapturedSource<SourcePrice>>;
  fetchProduct(sourceId: string): Promise<CapturedSource<SourceSystem>>;
  getSourceVersion(): Promise<CatalogSourceVersion>;
  healthCheck(): Promise<CatalogSourceHealth>;
}

export interface FixtureCatalogDataset {
  readonly categories: readonly CapturedSource<SourceCategory>[];
  readonly healthy?: boolean;
  readonly materials: readonly CapturedSource<SourceMaterial>[];
  readonly mediaManifests: readonly CapturedSource<SourceMediaManifest>[];
  readonly mediaFiles: readonly SourceMediaFile[];
  readonly prices: readonly CapturedSource<SourcePrice>[];
  readonly sourceVersion: CatalogSourceVersion;
  readonly systems: readonly CapturedSource<SourceSystem>[];
}
