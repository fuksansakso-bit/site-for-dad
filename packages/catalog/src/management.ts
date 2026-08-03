export const catalogBusinessEntityTypes = ['CATEGORY', 'SYSTEM', 'MATERIAL_VARIANT'] as const;
export type CatalogBusinessEntityType = (typeof catalogBusinessEntityTypes)[number];

export const catalogVisibilityValues = ['VISIBLE', 'HIDDEN'] as const;
export type CatalogVisibilityValue = (typeof catalogVisibilityValues)[number];

export const catalogManualReviewValues = [
  'UNREVIEWED',
  'APPROVED',
  'NEEDS_REVIEW',
  'REJECTED',
] as const;
export type CatalogManualReviewValue = (typeof catalogManualReviewValues)[number];

export const catalogAvailabilityValues = [
  'UNREVIEWED',
  'AVAILABLE',
  'OUT_OF_STOCK',
  'INQUIRY_ONLY',
  'HIDDEN',
] as const;
export type CatalogAvailabilityValue = (typeof catalogAvailabilityValues)[number];

export const catalogPublicationValues = [
  'UNREVIEWED',
  'DRAFT',
  'PUBLISHED',
  'HIDDEN',
  'ARCHIVED',
] as const;
export type CatalogPublicationValue = (typeof catalogPublicationValues)[number];

export const catalogManagementErrorCodes = [
  'CATALOG_MANAGEMENT_AUTHORIZATION',
  'CATALOG_MANAGEMENT_CONFLICT',
  'CATALOG_MANAGEMENT_DATABASE',
  'CATALOG_MANAGEMENT_NOT_FOUND',
  'CATALOG_MANAGEMENT_NOT_READY',
  'CATALOG_MANAGEMENT_VALIDATION',
] as const;
export type CatalogManagementErrorCode = (typeof catalogManagementErrorCodes)[number];

export class CatalogManagementError extends Error {
  readonly code: CatalogManagementErrorCode;

  constructor(code: CatalogManagementErrorCode, options: { readonly cause?: unknown } = {}) {
    super(code, { ...(options.cause === undefined ? {} : { cause: options.cause }) });
    this.name = 'CatalogManagementError';
    this.code = code;
  }
}

export interface CatalogCommandContext {
  readonly actorId: string;
  readonly correlationId: string;
}

export interface SetCatalogBusinessOverlayInput extends CatalogCommandContext {
  readonly availabilityReason: string;
  readonly availabilityStatus: CatalogAvailabilityValue;
  readonly entityId: string;
  readonly entityType: CatalogBusinessEntityType;
  readonly localDescription?: string | null;
  readonly localOrder: number;
  readonly manualReviewState: CatalogManualReviewValue;
  readonly ownerNotes?: string | null;
  readonly publicationReason: string;
  readonly publicationStatus: CatalogPublicationValue;
  readonly visibility: CatalogVisibilityValue;
}

export interface SetCatalogLocalPriceOverrideInput extends CatalogCommandContext {
  readonly amountMinor: number;
  readonly businessCatalogEntryId: string;
  readonly currency: string;
  readonly effectiveFrom: string;
  readonly effectiveTo?: string | null;
  readonly reason: string;
}

export interface RemoveCatalogLocalPriceOverrideInput extends CatalogCommandContext {
  readonly businessCatalogEntryId: string;
  readonly reason: string;
}

export interface PublishCatalogPilotInput extends CatalogCommandContext {
  readonly catalogSourceId: string;
  readonly catalogVersionId: string;
  readonly expectedCatalogDifferenceChecksum: string;
  readonly expectedVariantCount: number;
  readonly syncRunId: string;
}

export interface ComposeCatalogVersionInput extends CatalogCommandContext {
  readonly catalogSourceId: string;
  readonly catalogVersionId: string;
  readonly expectedCatalogDifferenceChecksum: string;
  readonly expectedVariantCount: number;
  readonly syncRunId: string;
}

export interface CatalogPublicationResult {
  readonly categoryCount: number;
  readonly mediaApprovedCount: number;
  readonly systemCount: number;
  readonly variantCount: number;
}

export interface CatalogCompositionResult {
  readonly catalogVersionId: string;
  readonly compositionChecksum: string;
  readonly differenceChecksum: string;
  readonly entryCount: number;
  readonly reused: boolean;
  readonly variantCount: number;
}

export interface CatalogManagementPort {
  close(): Promise<void>;
  composeCatalogVersion(input: ComposeCatalogVersionInput): Promise<CatalogCompositionResult>;
  publishPilot(input: PublishCatalogPilotInput): Promise<CatalogPublicationResult>;
  removeLocalPriceOverride(input: RemoveCatalogLocalPriceOverrideInput): Promise<void>;
  setBusinessOverlay(input: SetCatalogBusinessOverlayInput): Promise<string>;
  setLocalPriceOverride(input: SetCatalogLocalPriceOverrideInput): Promise<string>;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const correlationPattern = /^[A-Za-z0-9._:-]{8,128}$/;
const checksumPattern = /^[0-9a-f]{64}$/;
const currencyPattern = /^[A-Z]{3}$/;

export function assertCatalogCommandContext(input: CatalogCommandContext): void {
  if (!uuidPattern.test(input.actorId) || !correlationPattern.test(input.correlationId)) {
    throw new CatalogManagementError('CATALOG_MANAGEMENT_VALIDATION');
  }
}

export function assertCatalogVersionCommand(
  input: ComposeCatalogVersionInput | PublishCatalogPilotInput,
): void {
  assertCatalogCommandContext(input);
  if (
    !uuidPattern.test(input.catalogSourceId) ||
    !uuidPattern.test(input.catalogVersionId) ||
    !uuidPattern.test(input.syncRunId) ||
    !checksumPattern.test(input.expectedCatalogDifferenceChecksum) ||
    !Number.isSafeInteger(input.expectedVariantCount) ||
    input.expectedVariantCount < 1 ||
    input.expectedVariantCount > 100_000
  ) {
    throw new CatalogManagementError('CATALOG_MANAGEMENT_VALIDATION');
  }
}

export function assertBusinessOverlayInput(input: SetCatalogBusinessOverlayInput): void {
  assertCatalogCommandContext(input);
  if (
    !uuidPattern.test(input.entityId) ||
    !catalogBusinessEntityTypes.includes(input.entityType) ||
    !catalogVisibilityValues.includes(input.visibility) ||
    !catalogManualReviewValues.includes(input.manualReviewState) ||
    !catalogAvailabilityValues.includes(input.availabilityStatus) ||
    !catalogPublicationValues.includes(input.publicationStatus) ||
    !Number.isSafeInteger(input.localOrder) ||
    input.localOrder < 0 ||
    input.localOrder > 1_000_000 ||
    input.availabilityReason.trim().length < 3 ||
    input.availabilityReason.length > 512 ||
    input.publicationReason.trim().length < 3 ||
    input.publicationReason.length > 512 ||
    (input.localDescription !== undefined &&
      input.localDescription !== null &&
      input.localDescription.length > 4_000) ||
    (input.ownerNotes !== undefined && input.ownerNotes !== null && input.ownerNotes.length > 4_000)
  ) {
    throw new CatalogManagementError('CATALOG_MANAGEMENT_VALIDATION');
  }
}

export function assertLocalPriceOverrideInput(input: SetCatalogLocalPriceOverrideInput): void {
  assertCatalogCommandContext(input);
  const effectiveFrom = Date.parse(input.effectiveFrom);
  const effectiveTo = input.effectiveTo == null ? null : Date.parse(input.effectiveTo);
  if (
    !uuidPattern.test(input.businessCatalogEntryId) ||
    !Number.isSafeInteger(input.amountMinor) ||
    input.amountMinor <= 0 ||
    input.amountMinor > 2_147_483_647 ||
    !currencyPattern.test(input.currency) ||
    !Number.isFinite(effectiveFrom) ||
    (effectiveTo !== null && (!Number.isFinite(effectiveTo) || effectiveTo < effectiveFrom)) ||
    input.reason.trim().length < 3 ||
    input.reason.length > 512
  ) {
    throw new CatalogManagementError('CATALOG_MANAGEMENT_VALIDATION');
  }
}

export function assertRemoveLocalPriceOverrideInput(
  input: RemoveCatalogLocalPriceOverrideInput,
): void {
  assertCatalogCommandContext(input);
  if (
    !uuidPattern.test(input.businessCatalogEntryId) ||
    input.reason.trim().length < 3 ||
    input.reason.length > 512
  ) {
    throw new CatalogManagementError('CATALOG_MANAGEMENT_VALIDATION');
  }
}
