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
  readonly rollbackTargetId: string | null;
  readonly versionNumber: number;
}

export interface CatalogAdminManifestCounts {
  readonly categories: number;
  readonly differences: number;
  readonly duplicates: number;
  readonly failures: number;
  readonly materialVariants: number;
  readonly mediaImported: number;
  readonly mediaReferences: number;
  readonly models: number;
  readonly normalizedItems: number;
  readonly pages: number;
  readonly priceRecords: number;
  readonly resumedSnapshots: number;
  readonly skips: number;
  readonly sourceRemoved: number;
  readonly systems: number;
  readonly warnings: number;
}

export interface CatalogAdminManifestSummary {
  readonly complete: boolean;
  readonly counts: CatalogAdminManifestCounts;
  readonly sealedAt: string;
  readonly status: 'CANCELLED' | 'COMPLETE' | 'PARTIAL_FAILED';
}

export interface CatalogAdminRelease {
  readonly catalogDifferenceCount: number;
  readonly catalogDifferenceChecksum: string | null;
  readonly catalogSourceId: string;
  readonly catalogStatus: CatalogReleaseStatus | null;
  readonly catalogVersionId: string | null;
  readonly catalogVersionNumber: number | null;
  readonly catalogUnapprovedDifferenceCount: number;
  readonly bulkCommandCount: number;
  readonly compositionCount: number;
  readonly createdAt: string;
  readonly differenceCount: number;
  readonly failedItemCount: number;
  readonly manifest: CatalogAdminManifestSummary | null;
  readonly pendingDifferenceCount: number;
  readonly priceDifferenceCount: number;
  readonly priceUnapprovedDifferenceCount: number;
  readonly priceDifferenceChecksum: string | null;
  readonly priceStatus: CatalogReleaseStatus | null;
  readonly priceVersionId: string | null;
  readonly priceVersionNumber: number | null;
  readonly publicationPrepared: boolean;
  readonly reviewBatchCount: number;
  readonly sourceVersion: string | null;
  readonly syncRunId: string;
  readonly syncStatus: string;
  readonly variantCount: number;
}

export interface CatalogAdminSyncStage {
  readonly completedAt: string | null;
  readonly errorCount: number;
  readonly expectedCount: number;
  readonly partitionKey: string;
  readonly processedCount: number;
  readonly resumeCount: number;
  readonly stage: string;
  readonly status: string;
}

export interface CatalogAdminSyncRun {
  readonly cancelRequestedAt: string | null;
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
  readonly stages: readonly CatalogAdminSyncStage[];
  readonly status: string;
  readonly trigger: string;
}

export interface CatalogAdminSummary {
  readonly approvedMediaCount: number;
  readonly businessEntryCount: number;
  readonly categoryCount: number;
  readonly materialVariantCount: number;
  readonly modelCount: number;
  readonly publishedEntryCount: number;
  readonly sourcePriceCount: number;
  readonly sourceRemovedCount: number;
  readonly systemCount: number;
}

export interface CatalogAdminReviewHistory {
  readonly affectedCount: number;
  readonly createdAt: string;
  readonly id: string;
  readonly resolution: string;
  readonly safeReason: string;
  readonly scope: 'CATALOG' | 'PRICE';
  readonly selectionMode: 'ALL' | 'SELECTED';
  readonly syncRunId: string;
}

export interface CatalogAdminBulkHistory {
  readonly affectedCount: number;
  readonly createdAt: string;
  readonly id: string;
  readonly matchedCount: number;
  readonly safeReason: string;
  readonly selectorMode: 'CATEGORY' | 'FILTER' | 'SELECTED';
  readonly syncRunId: string;
}

export interface CatalogAdminOverview {
  readonly activeCatalogVersion: CatalogActiveVersionSummary | null;
  readonly activePriceVersion: CatalogActiveVersionSummary | null;
  readonly bulkHistory: readonly CatalogAdminBulkHistory[];
  readonly generatedAt: string;
  readonly releases: readonly CatalogAdminRelease[];
  readonly reviewHistory: readonly CatalogAdminReviewHistory[];
  readonly runs: readonly CatalogAdminSyncRun[];
  readonly summary: CatalogAdminSummary;
}

export interface CatalogAdminVariant {
  readonly article: string;
  readonly availabilityStatus: string;
  readonly businessCatalogEntryId: string | null;
  readonly categoryId: string;
  readonly categoryName: string;
  readonly categoryPath: string;
  readonly colorHex: string | null;
  readonly colorName: string | null;
  readonly currency: string | null;
  readonly id: string;
  readonly isBlackout: boolean;
  readonly isZebra: boolean;
  readonly localPriceAmountMinor: number | null;
  readonly manualReviewState: string;
  readonly mediaApproved: boolean;
  readonly mediaCount: number;
  readonly materialName: string;
  readonly name: string;
  readonly primarySystemId: string | null;
  readonly primarySystemName: string | null;
  readonly publicationStatus: string;
  readonly rightsReady: boolean;
  readonly sourceCapturedAt: string | null;
  readonly sourceId: string;
  readonly sourcePriceAmountMinor: number | null;
  readonly sourcePriceStatus: 'AVAILABLE' | 'MISSING' | 'PRICE_ON_REQUEST';
  readonly sourceStatus: string;
  readonly sourceUrl: string;
  readonly visibility: string;
  readonly widthMm: number | null;
}

export interface CatalogAdminFacet {
  readonly count: number;
  readonly id: string;
  readonly label: string;
}

export interface CatalogAdminCategoryFacet extends CatalogAdminFacet {
  readonly depth: number;
  readonly parentId: string | null;
  readonly path: string;
}

export interface CatalogAdminVariantQuery {
  readonly availability?:
    'ALL' | 'AVAILABLE' | 'HIDDEN' | 'INQUIRY_ONLY' | 'OUT_OF_STOCK' | 'UNREVIEWED';
  readonly categoryId?: string;
  readonly limit?: number;
  readonly media?: 'ALL' | 'BLOCKED' | 'MISSING' | 'READY';
  readonly offset?: number;
  readonly price?: 'ALL' | 'AVAILABLE' | 'LOCAL_OVERRIDE' | 'MISSING' | 'PRICE_ON_REQUEST';
  readonly publication?: 'ALL' | 'ARCHIVED' | 'DRAFT' | 'HIDDEN' | 'PUBLISHED' | 'UNREVIEWED';
  readonly query?: string;
  readonly review?: 'ALL' | 'APPROVED' | 'NEEDS_REVIEW' | 'REJECTED' | 'UNREVIEWED';
  readonly sourceStatus?: 'ACTIVE' | 'ALL' | 'SOURCE_REMOVED';
  readonly state?: 'ALL' | 'BLOCKED' | 'PUBLISHED';
  readonly systemId?: string;
  readonly visibility?: 'ALL' | 'HIDDEN' | 'VISIBLE';
}

export interface CatalogAdminVariantPage {
  readonly categories: readonly CatalogAdminCategoryFacet[];
  readonly items: readonly CatalogAdminVariant[];
  readonly limit: number;
  readonly offset: number;
  readonly systems: readonly CatalogAdminFacet[];
  readonly total: number;
}

export const catalogAdminDifferenceTypes = [
  'ARTICLE_CHANGED',
  'COLOR_CHANGED',
  'NEW_CATEGORY',
  'NEW_MATERIAL',
  'NEW_MEDIA',
  'NEW_MODEL',
  'NEW_SYSTEM',
  'PARSE_ERROR',
  'PRICE_CHANGED',
  'PROPERTY_CHANGED',
  'SOURCE_REMOVED',
] as const;
export type CatalogAdminDifferenceType = (typeof catalogAdminDifferenceTypes)[number];

export const catalogAdminDifferenceResolutions = [
  'APPROVED',
  'ARCHIVE',
  'DEFERRED',
  'HIDE',
  'KEEP',
  'PENDING',
  'REJECTED',
  'REPLACE',
  'RESTORE',
] as const;
export type CatalogAdminDifferenceResolution = (typeof catalogAdminDifferenceResolutions)[number];

export interface CatalogAdminDifference {
  readonly absoluteChangeMinor: number | null;
  readonly afterSummary: string | null;
  readonly beforeSummary: string | null;
  readonly currency: string | null;
  readonly entityName: string;
  readonly entityType: string;
  readonly id: string;
  readonly newPriceMinor: number | null;
  readonly oldPriceMinor: number | null;
  readonly resolution: CatalogAdminDifferenceResolution;
  readonly scope: 'CATALOG' | 'PRICE';
  readonly sourceCapturedAt: string | null;
  readonly sourceId: string | null;
  readonly sourceUrl: string | null;
  readonly type: CatalogAdminDifferenceType;
}

export interface CatalogAdminDifferenceQuery {
  readonly limit?: number;
  readonly offset?: number;
  readonly resolution?: 'ALL' | CatalogAdminDifferenceResolution;
  readonly scope?: 'ALL' | 'CATALOG' | 'PRICE';
  readonly syncRunId?: string;
  readonly type?: 'ALL' | CatalogAdminDifferenceType;
}

export interface CatalogAdminDifferencePage {
  readonly items: readonly CatalogAdminDifference[];
  readonly limit: number;
  readonly offset: number;
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
  listAdminDifferences(query?: CatalogAdminDifferenceQuery): Promise<CatalogAdminDifferencePage>;
  listAdminVariants(query?: CatalogAdminVariantQuery): Promise<CatalogAdminVariantPage>;
}

export function assertCatalogAdminVariantQuery(query: CatalogAdminVariantQuery): {
  readonly availability: NonNullable<CatalogAdminVariantQuery['availability']>;
  readonly categoryId: string | null;
  readonly limit: number;
  readonly media: NonNullable<CatalogAdminVariantQuery['media']>;
  readonly offset: number;
  readonly price: NonNullable<CatalogAdminVariantQuery['price']>;
  readonly publication: NonNullable<CatalogAdminVariantQuery['publication']>;
  readonly query: string;
  readonly review: NonNullable<CatalogAdminVariantQuery['review']>;
  readonly sourceStatus: NonNullable<CatalogAdminVariantQuery['sourceStatus']>;
  readonly state: 'ALL' | 'BLOCKED' | 'PUBLISHED';
  readonly systemId: string | null;
  readonly visibility: NonNullable<CatalogAdminVariantQuery['visibility']>;
} {
  const limit = query.limit ?? 50;
  const offset = query.offset ?? 0;
  const search = query.query?.trim() ?? '';
  const state = query.state ?? 'ALL';
  const availability = query.availability ?? 'ALL';
  const media = query.media ?? 'ALL';
  const price = query.price ?? 'ALL';
  const publication = query.publication ?? 'ALL';
  const review = query.review ?? 'ALL';
  const sourceStatus = query.sourceStatus ?? 'ALL';
  const visibility = query.visibility ?? 'ALL';
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 50 ||
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    offset > 100_000 ||
    search.length > 128 ||
    !['ALL', 'BLOCKED', 'PUBLISHED'].includes(state) ||
    !['ALL', 'AVAILABLE', 'HIDDEN', 'INQUIRY_ONLY', 'OUT_OF_STOCK', 'UNREVIEWED'].includes(
      availability,
    ) ||
    !['ALL', 'BLOCKED', 'MISSING', 'READY'].includes(media) ||
    !['ALL', 'AVAILABLE', 'LOCAL_OVERRIDE', 'MISSING', 'PRICE_ON_REQUEST'].includes(price) ||
    !['ALL', 'ARCHIVED', 'DRAFT', 'HIDDEN', 'PUBLISHED', 'UNREVIEWED'].includes(publication) ||
    !['ALL', 'APPROVED', 'NEEDS_REVIEW', 'REJECTED', 'UNREVIEWED'].includes(review) ||
    !['ACTIVE', 'ALL', 'SOURCE_REMOVED'].includes(sourceStatus) ||
    !['ALL', 'HIDDEN', 'VISIBLE'].includes(visibility) ||
    (query.categoryId !== undefined && !uuidPattern.test(query.categoryId)) ||
    (query.systemId !== undefined && !uuidPattern.test(query.systemId))
  ) {
    throw new CatalogReadError('CATALOG_READ_VALIDATION');
  }
  return {
    availability,
    categoryId: query.categoryId ?? null,
    limit,
    media,
    offset,
    price,
    publication,
    query: search,
    review,
    sourceStatus,
    state,
    systemId: query.systemId ?? null,
    visibility,
  };
}

export function assertCatalogAdminDifferenceQuery(query: CatalogAdminDifferenceQuery): {
  readonly limit: number;
  readonly offset: number;
  readonly resolution: 'ALL' | CatalogAdminDifferenceResolution;
  readonly scope: 'ALL' | 'CATALOG' | 'PRICE';
  readonly syncRunId: string | null;
  readonly type: 'ALL' | CatalogAdminDifferenceType;
} {
  const limit = query.limit ?? 50;
  const offset = query.offset ?? 0;
  const resolution = query.resolution ?? 'ALL';
  const scope = query.scope ?? 'ALL';
  const type = query.type ?? 'ALL';
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    offset > 100_000 ||
    !['ALL', 'CATALOG', 'PRICE'].includes(scope) ||
    (resolution !== 'ALL' && !catalogAdminDifferenceResolutions.includes(resolution)) ||
    (type !== 'ALL' && !catalogAdminDifferenceTypes.includes(type)) ||
    (query.syncRunId !== undefined && !uuidPattern.test(query.syncRunId))
  ) {
    throw new CatalogReadError('CATALOG_READ_VALIDATION');
  }
  return { limit, offset, resolution, scope, syncRunId: query.syncRunId ?? null, type };
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
