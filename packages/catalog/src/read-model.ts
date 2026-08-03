export const catalogReleaseStatuses = [
  'DRAFT',
  'AWAITING_APPROVAL',
  'APPROVED',
  'ACTIVE',
  'SUPERSEDED',
  'REJECTED',
] as const;
export type CatalogReleaseStatus = (typeof catalogReleaseStatuses)[number];

export const catalogReadErrorCodes = ['CATALOG_READ_DATABASE', 'CATALOG_READ_VALIDATION'] as const;
export type CatalogReadErrorCode = (typeof catalogReadErrorCodes)[number];

export class CatalogReadError extends Error {
  readonly code: CatalogReadErrorCode;

  constructor(code: CatalogReadErrorCode, options: { readonly cause?: unknown } = {}) {
    super(code, { ...(options.cause === undefined ? {} : { cause: options.cause }) });
    this.name = 'CatalogReadError';
    this.code = code;
  }
}

export interface CatalogActiveVersionSummary {
  readonly activatedAt: string;
  readonly differenceChecksum: string;
  readonly id: string;
  readonly versionNumber: number;
}

export interface CatalogAdminRelease {
  readonly catalogDifferenceChecksum: string | null;
  readonly catalogSourceId: string;
  readonly catalogStatus: CatalogReleaseStatus | null;
  readonly catalogVersionId: string | null;
  readonly catalogVersionNumber: number | null;
  readonly compositionCount: number;
  readonly createdAt: string;
  readonly differenceCount: number;
  readonly failedItemCount: number;
  readonly pendingDifferenceCount: number;
  readonly priceDifferenceChecksum: string | null;
  readonly priceStatus: CatalogReleaseStatus | null;
  readonly priceVersionId: string | null;
  readonly priceVersionNumber: number | null;
  readonly sourceVersion: string | null;
  readonly syncRunId: string;
  readonly syncStatus: string;
  readonly variantCount: number;
}

export interface CatalogAdminSyncRun {
  readonly completedAt: string | null;
  readonly correlationId: string;
  readonly createdAt: string;
  readonly discoveredCount: number;
  readonly errorCode: string | null;
  readonly errorCount: number;
  readonly id: string;
  readonly processedCount: number;
  readonly retryOfSyncRunId: string | null;
  readonly sourceVersion: string | null;
  readonly status: string;
  readonly trigger: string;
}

export interface CatalogAdminSummary {
  readonly approvedMediaCount: number;
  readonly businessEntryCount: number;
  readonly materialVariantCount: number;
  readonly publishedEntryCount: number;
  readonly sourcePriceCount: number;
}

export interface CatalogAdminOverview {
  readonly activeCatalogVersion: CatalogActiveVersionSummary | null;
  readonly activePriceVersion: CatalogActiveVersionSummary | null;
  readonly generatedAt: string;
  readonly releases: readonly CatalogAdminRelease[];
  readonly runs: readonly CatalogAdminSyncRun[];
  readonly summary: CatalogAdminSummary;
}

export interface CatalogAdminVariant {
  readonly article: string;
  readonly availabilityStatus: string;
  readonly businessCatalogEntryId: string | null;
  readonly categoryName: string;
  readonly colorHex: string | null;
  readonly colorName: string | null;
  readonly currency: string | null;
  readonly id: string;
  readonly localPriceAmountMinor: number | null;
  readonly manualReviewState: string;
  readonly mediaApproved: boolean;
  readonly mediaCount: number;
  readonly name: string;
  readonly primarySystemName: string | null;
  readonly publicationStatus: string;
  readonly rightsReady: boolean;
  readonly sourceCapturedAt: string | null;
  readonly sourceId: string;
  readonly sourcePriceAmountMinor: number | null;
  readonly sourceStatus: string;
  readonly sourceUrl: string;
  readonly visibility: string;
}

export interface CatalogAdminVariantQuery {
  readonly limit?: number;
  readonly query?: string;
  readonly state?: 'ALL' | 'BLOCKED' | 'PUBLISHED';
}

export interface CatalogAdminVariantPage {
  readonly items: readonly CatalogAdminVariant[];
  readonly limit: number;
  readonly total: number;
}

export const catalogPublicAvailabilityValues = [
  'IN_STOCK',
  'OUT_OF_STOCK',
  'INQUIRY_ONLY',
] as const;
export type CatalogPublicAvailability = (typeof catalogPublicAvailabilityValues)[number];

export interface CatalogPublicVersion {
  readonly activatedAt: string;
  readonly differenceChecksum: string;
  readonly id: string;
  readonly versionNumber: number;
}

export interface CatalogPublicCategory {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
}

export interface CatalogPublicSystem {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
}

export interface CatalogPublicMedia {
  readonly byteSize: number;
  readonly checksumSha256: string;
  readonly contentType: string;
  readonly height: number;
  readonly id: string;
  readonly objectKey: string;
  readonly storageZone: 'private' | 'public' | 'quarantine';
  readonly width: number;
}

export interface CatalogPublicPrice {
  readonly amountMinor: number | null;
  readonly currency: string;
  readonly kind: 'BASE' | 'FROM';
  readonly origin: 'LOCAL_OVERRIDE' | 'SOURCE_VERSION';
  readonly status: 'AVAILABLE' | 'PRICE_ON_REQUEST';
}

export interface CatalogPublicMaterial {
  readonly article: string;
  readonly availability: CatalogPublicAvailability;
  readonly category: CatalogPublicCategory;
  readonly color: {
    readonly hex: string | null;
    readonly name: string;
    readonly slug: string;
  } | null;
  readonly description: string | null;
  readonly id: string;
  readonly isBlackout: boolean;
  readonly isZebra: boolean;
  readonly localOrder: number;
  readonly materialName: string;
  readonly media: CatalogPublicMedia;
  readonly name: string;
  readonly price: CatalogPublicPrice;
  readonly slug: string;
  readonly system: CatalogPublicSystem | null;
  readonly widthMm: number | null;
}

export interface CatalogPublicSnapshot {
  readonly catalogVersion: CatalogPublicVersion;
  readonly items: readonly CatalogPublicMaterial[];
  readonly priceVersion: CatalogPublicVersion;
}

export interface CatalogPublicSnapshotInput {
  readonly catalogVersion: CatalogPublicVersion;
  readonly manifest: unknown;
  readonly maximumMaterialCount: number;
  readonly priceVersion: CatalogPublicVersion;
}

export interface CatalogReadPort {
  close(): Promise<void>;
  getAdminOverview(): Promise<CatalogAdminOverview>;
  getPublicCatalog(): Promise<CatalogPublicSnapshot | null>;
  listAdminVariants(query?: CatalogAdminVariantQuery): Promise<CatalogAdminVariantPage>;
}

export function assertCatalogAdminVariantQuery(query: CatalogAdminVariantQuery): {
  readonly limit: number;
  readonly query: string;
  readonly state: 'ALL' | 'BLOCKED' | 'PUBLISHED';
} {
  const limit = query.limit ?? 50;
  const search = query.query?.trim() ?? '';
  const state = query.state ?? 'ALL';
  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 50 ||
    search.length > 128 ||
    !['ALL', 'BLOCKED', 'PUBLISHED'].includes(state)
  ) {
    throw new CatalogReadError('CATALOG_READ_VALIDATION');
  }
  return { limit, query: search, state };
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function requiredString(record: JsonRecord, key: string, maximumLength = 512): string {
  const value = record[key];
  if (typeof value !== 'string' || value.length === 0 || value.length > maximumLength) {
    throw new CatalogReadError('CATALOG_READ_VALIDATION');
  }
  return value;
}

function optionalString(record: JsonRecord, key: string, maximumLength = 2_000): string | null {
  const value = record[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string' || value.length > maximumLength) {
    throw new CatalogReadError('CATALOG_READ_VALIDATION');
  }
  return value;
}

function requiredBoolean(record: JsonRecord, key: string): boolean {
  const value = record[key];
  if (typeof value !== 'boolean') throw new CatalogReadError('CATALOG_READ_VALIDATION');
  return value;
}

function requiredInteger(record: JsonRecord, key: string, minimum = 0): number {
  const value = record[key];
  if (!Number.isSafeInteger(value) || Number(value) < minimum) {
    throw new CatalogReadError('CATALOG_READ_VALIDATION');
  }
  return Number(value);
}

function optionalPositiveDecimal(record: JsonRecord, key: string): number | null {
  const value = record[key];
  if (value === null || value === undefined) return null;
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (typeof parsed !== 'number' || !Number.isFinite(parsed) || parsed <= 0) {
    throw new CatalogReadError('CATALOG_READ_VALIDATION');
  }
  return parsed;
}

function publishedOverlay(entry: JsonRecord): JsonRecord | null {
  const overlay = asRecord(entry['overlay']);
  const publication = asRecord(overlay?.['publication']);
  return overlay !== null &&
    overlay['visibility'] === 'VISIBLE' &&
    overlay['manualReviewState'] === 'APPROVED' &&
    publication?.['status'] === 'PUBLISHED'
    ? overlay
    : null;
}

function mapAvailability(overlay: JsonRecord): CatalogPublicAvailability | null {
  const availability = asRecord(overlay['availability']);
  switch (availability?.['status']) {
    case 'AVAILABLE':
      return 'IN_STOCK';
    case 'OUT_OF_STOCK':
      return 'OUT_OF_STOCK';
    case 'INQUIRY_ONLY':
      return 'INQUIRY_ONLY';
    default:
      return null;
  }
}

function mapPublicMedia(entry: JsonRecord): CatalogPublicMedia | null {
  const media = asRecord(entry['primaryMedia']);
  if (
    media === null ||
    media['publicationStatus'] !== 'PUBLICATION_APPROVED' ||
    !['PARTNER_LICENSE', 'OWNER_CREATED'].includes(String(media['rightsStatus'])) ||
    !['private', 'public', 'quarantine'].includes(String(media['storageZone']))
  ) {
    return null;
  }
  const checksumSha256 = requiredString(media, 'fileHash', 64);
  if (!/^[a-f0-9]{64}$/.test(checksumSha256)) {
    throw new CatalogReadError('CATALOG_READ_VALIDATION');
  }
  const contentType = requiredString(media, 'mimeType', 128);
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(contentType)) return null;
  return {
    byteSize: requiredInteger(media, 'byteSize', 1),
    checksumSha256,
    contentType,
    height: requiredInteger(media, 'height', 1),
    id: requiredString(media, 'id', 64),
    objectKey: requiredString(media, 'objectKey', 1_024),
    storageZone: media['storageZone'] as CatalogPublicMedia['storageZone'],
    width: requiredInteger(media, 'width', 1),
  };
}

function mapPublicPrice(entry: JsonRecord, overlay: JsonRecord): CatalogPublicPrice | null {
  const localOverride = asRecord(overlay['localPriceOverride']);
  if (localOverride !== null && ['ACTIVE', 'SCHEDULED'].includes(String(localOverride['status']))) {
    const amountMinor = requiredInteger(localOverride, 'amountMinor', 1);
    return {
      amountMinor,
      currency: requiredString(localOverride, 'currency', 3),
      kind: 'FROM',
      origin: 'LOCAL_OVERRIDE',
      status: 'AVAILABLE',
    };
  }
  const sourcePrice = asRecord(entry['sourcePrice']);
  if (sourcePrice === null) return null;
  const status = sourcePrice['status'];
  if (status !== 'AVAILABLE' && status !== 'PRICE_ON_REQUEST') return null;
  const kind = sourcePrice['kind'];
  if (kind !== 'BASE' && kind !== 'FROM') {
    throw new CatalogReadError('CATALOG_READ_VALIDATION');
  }
  const rawAmount = sourcePrice['amountMinor'];
  const amountMinor =
    rawAmount === null || rawAmount === undefined
      ? null
      : requiredInteger(sourcePrice, 'amountMinor', 1);
  if ((status === 'AVAILABLE') !== (amountMinor !== null)) {
    throw new CatalogReadError('CATALOG_READ_VALIDATION');
  }
  return {
    amountMinor,
    currency: requiredString(sourcePrice, 'currency', 3),
    kind,
    origin: 'SOURCE_VERSION',
    status,
  };
}

function mapPublishedReference(
  entry: JsonRecord,
  expectedType: 'CATEGORY' | 'SYSTEM',
): CatalogPublicCategory | CatalogPublicSystem | null {
  if (entry['entityType'] !== expectedType || publishedOverlay(entry) === null) return null;
  const entity = asRecord(entry['entity']);
  if (entity === null) throw new CatalogReadError('CATALOG_READ_VALIDATION');
  return {
    id: requiredString(entity, 'id', 64),
    name: requiredString(entity, 'name', 256),
    slug: requiredString(entity, 'slug', 256),
  };
}

function mapPublicMaterial(
  entry: JsonRecord,
  categories: ReadonlyMap<string, CatalogPublicCategory>,
  systems: ReadonlyMap<string, CatalogPublicSystem>,
): CatalogPublicMaterial | null {
  if (entry['entityType'] !== 'MATERIAL_VARIANT') return null;
  const overlay = publishedOverlay(entry);
  if (overlay === null) return null;
  const availability = mapAvailability(overlay);
  const entity = asRecord(entry['entity']);
  const media = mapPublicMedia(entry);
  const price = mapPublicPrice(entry, overlay);
  if (availability === null || entity === null || media === null || price === null) return null;
  const material = asRecord(entity['material']);
  if (material === null) throw new CatalogReadError('CATALOG_READ_VALIDATION');
  const category = categories.get(requiredString(material, 'categoryId', 64));
  if (category === undefined) return null;
  const primarySystemId = optionalString(entity, 'primarySystemId', 64);
  const system = primarySystemId === null ? null : (systems.get(primarySystemId) ?? null);
  const rawColor = asRecord(entity['color']);
  const color =
    rawColor === null
      ? null
      : {
          hex: optionalString(rawColor, 'hex', 16),
          name: requiredString(rawColor, 'name', 128),
          slug: requiredString(rawColor, 'slug', 128),
        };
  return {
    article: requiredString(entity, 'article', 128),
    availability,
    category,
    color,
    description: optionalString(overlay, 'localDescription', 2_000),
    id: requiredString(entity, 'id', 64),
    isBlackout: requiredBoolean(entity, 'isBlackout'),
    isZebra: requiredBoolean(entity, 'isZebra'),
    localOrder: requiredInteger(overlay, 'localOrder'),
    materialName: requiredString(material, 'name', 256),
    media,
    name: requiredString(entity, 'name', 256),
    price,
    slug: requiredString(entity, 'slug', 256),
    system,
    widthMm: optionalPositiveDecimal(entity, 'widthMm'),
  };
}

export function buildCatalogPublicSnapshot(
  input: CatalogPublicSnapshotInput,
): CatalogPublicSnapshot {
  if (!Number.isSafeInteger(input.maximumMaterialCount) || input.maximumMaterialCount < 1) {
    throw new CatalogReadError('CATALOG_READ_VALIDATION');
  }
  const manifest = asRecord(input.manifest);
  const composition = manifest?.['composition'];
  if (!Array.isArray(composition)) throw new CatalogReadError('CATALOG_READ_VALIDATION');
  const entries = composition.map((entry) => {
    const record = asRecord(entry);
    if (record === null) throw new CatalogReadError('CATALOG_READ_VALIDATION');
    return record;
  });
  const categories = new Map<string, CatalogPublicCategory>();
  const systems = new Map<string, CatalogPublicSystem>();
  for (const entry of entries) {
    const category = mapPublishedReference(entry, 'CATEGORY') as CatalogPublicCategory | null;
    if (category !== null) categories.set(category.id, category);
    const system = mapPublishedReference(entry, 'SYSTEM') as CatalogPublicSystem | null;
    if (system !== null) systems.set(system.id, system);
  }
  const items = entries
    .map((entry) => mapPublicMaterial(entry, categories, systems))
    .filter((item): item is CatalogPublicMaterial => item !== null)
    .sort(
      (left, right) =>
        left.localOrder - right.localOrder ||
        left.name.localeCompare(right.name, 'ru') ||
        left.article.localeCompare(right.article, 'ru') ||
        left.id.localeCompare(right.id),
    );
  if (items.length > input.maximumMaterialCount) {
    throw new CatalogReadError('CATALOG_READ_VALIDATION');
  }
  return {
    catalogVersion: input.catalogVersion,
    items,
    priceVersion: input.priceVersion,
  };
}
