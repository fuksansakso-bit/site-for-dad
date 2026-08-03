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

export interface CatalogReadPort {
  close(): Promise<void>;
  getAdminOverview(): Promise<CatalogAdminOverview>;
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
