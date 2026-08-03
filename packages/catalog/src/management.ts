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

export const catalogBulkSelectorModes = ['CATEGORY', 'FILTER', 'SELECTED'] as const;
export type CatalogBulkSelectorMode = (typeof catalogBulkSelectorModes)[number];

export const catalogBulkPriceStatuses = ['AVAILABLE', 'PRICE_ON_REQUEST'] as const;
export type CatalogBulkPriceStatus = (typeof catalogBulkPriceStatuses)[number];

export const maximumCatalogBulkSelectedCount = 500;
export const maximumCatalogBulkTargetCount = 10_000;

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

export interface CatalogBulkFilter {
  readonly availabilityStatus?: CatalogAvailabilityValue;
  readonly categoryId?: string;
  readonly manualReviewState?: CatalogManualReviewValue;
  readonly priceStatus?: CatalogBulkPriceStatus;
  readonly publicationStatus?: CatalogPublicationValue;
  readonly systemId?: string;
  readonly visibility?: CatalogVisibilityValue;
}

export type CatalogBulkSelector =
  | {
      readonly categoryId: string;
      readonly mode: 'CATEGORY';
    }
  | {
      readonly filter: CatalogBulkFilter;
      readonly mode: 'FILTER';
    }
  | {
      readonly businessCatalogEntryIds: readonly string[];
      readonly mode: 'SELECTED';
    };

export interface CatalogBulkOverlayPatch {
  readonly availabilityStatus?: CatalogAvailabilityValue;
  readonly manualReviewState?: CatalogManualReviewValue;
  readonly publicationStatus?: CatalogPublicationValue;
  readonly visibility?: CatalogVisibilityValue;
}

export interface PreviewCatalogBusinessBulkInput extends CatalogCommandContext {
  readonly catalogSourceId: string;
  readonly catalogVersionId: string;
  readonly expectedCatalogDifferenceChecksum: string;
  readonly patch: CatalogBulkOverlayPatch;
  readonly reason: string;
  readonly selector: CatalogBulkSelector;
  readonly syncRunId: string;
}

export interface ApplyCatalogBusinessBulkInput extends PreviewCatalogBusinessBulkInput {
  readonly confirmation: string;
  readonly expectedSelectionChecksum: string;
  readonly expectedTargetCount: number;
  readonly idempotencyKey: string;
}

export interface CatalogBulkOverlayState {
  readonly availabilityStatus: CatalogAvailabilityValue | null;
  readonly manualReviewState: CatalogManualReviewValue;
  readonly publicationStatus: CatalogPublicationValue | null;
  readonly visibility: CatalogVisibilityValue;
}

export interface CatalogBulkTargetPreview {
  readonly after: CatalogBulkOverlayState;
  readonly before: CatalogBulkOverlayState;
  readonly businessCatalogEntryId: string;
  readonly entityId: string;
  readonly entityType: 'MATERIAL_VARIANT';
  readonly name: string;
  readonly sourceId: string;
}

export interface CatalogBusinessBulkPreview {
  readonly confirmation: string;
  readonly matchedCount: number;
  readonly selectionChecksum: string;
  readonly targetCount: number;
  readonly targets: readonly CatalogBulkTargetPreview[];
}

export interface CatalogBusinessBulkResult {
  readonly commandId: string;
  readonly matchedCount: number;
  readonly reused: boolean;
  readonly selectionChecksum: string;
  readonly targetCount: number;
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
  applyBusinessOverlayBulk(
    input: ApplyCatalogBusinessBulkInput,
  ): Promise<CatalogBusinessBulkResult>;
  close(): Promise<void>;
  composeCatalogVersion(input: ComposeCatalogVersionInput): Promise<CatalogCompositionResult>;
  previewBusinessOverlayBulk(
    input: PreviewCatalogBusinessBulkInput,
  ): Promise<CatalogBusinessBulkPreview>;
  publishPilot(input: PublishCatalogPilotInput): Promise<CatalogPublicationResult>;
  removeLocalPriceOverride(input: RemoveCatalogLocalPriceOverrideInput): Promise<void>;
  setBusinessOverlay(input: SetCatalogBusinessOverlayInput): Promise<string>;
  setLocalPriceOverride(input: SetCatalogLocalPriceOverrideInput): Promise<string>;
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const correlationPattern = /^[A-Za-z0-9._:-]{8,128}$/;
const checksumPattern = /^[0-9a-f]{64}$/;
const currencyPattern = /^[A-Z]{3}$/;
const idempotencyPattern = /^[A-Za-z0-9._:-]{8,255}$/;

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

function assertCatalogBulkSelector(selector: CatalogBulkSelector): void {
  if (typeof selector !== 'object' || selector === null) {
    throw new CatalogManagementError('CATALOG_MANAGEMENT_VALIDATION');
  }
  if (selector.mode === 'CATEGORY') {
    if (
      Object.keys(selector).some((key) => !['categoryId', 'mode'].includes(key)) ||
      !uuidPattern.test(selector.categoryId)
    ) {
      throw new CatalogManagementError('CATALOG_MANAGEMENT_VALIDATION');
    }
    return;
  }
  if (selector.mode === 'SELECTED') {
    const ids = selector.businessCatalogEntryIds;
    if (
      Object.keys(selector).some((key) => !['businessCatalogEntryIds', 'mode'].includes(key)) ||
      !Array.isArray(ids) ||
      ids.length < 1 ||
      ids.length > maximumCatalogBulkSelectedCount ||
      ids.some((id) => !uuidPattern.test(id)) ||
      new Set(ids).size !== ids.length
    ) {
      throw new CatalogManagementError('CATALOG_MANAGEMENT_VALIDATION');
    }
    return;
  }
  if (
    selector.mode !== 'FILTER' ||
    typeof selector.filter !== 'object' ||
    selector.filter === null
  ) {
    throw new CatalogManagementError('CATALOG_MANAGEMENT_VALIDATION');
  }
  const filterKeys = Object.keys(selector.filter);
  const allowedFilterKeys = [
    'availabilityStatus',
    'categoryId',
    'manualReviewState',
    'priceStatus',
    'publicationStatus',
    'systemId',
    'visibility',
  ];
  if (
    Object.keys(selector).some((key) => !['filter', 'mode'].includes(key)) ||
    filterKeys.length === 0 ||
    !Object.values(selector.filter).some((value) => value !== undefined) ||
    filterKeys.some((key) => !allowedFilterKeys.includes(key)) ||
    (selector.filter.categoryId !== undefined && !uuidPattern.test(selector.filter.categoryId)) ||
    (selector.filter.systemId !== undefined && !uuidPattern.test(selector.filter.systemId)) ||
    (selector.filter.visibility !== undefined &&
      !catalogVisibilityValues.includes(selector.filter.visibility)) ||
    (selector.filter.manualReviewState !== undefined &&
      !catalogManualReviewValues.includes(selector.filter.manualReviewState)) ||
    (selector.filter.availabilityStatus !== undefined &&
      !catalogAvailabilityValues.includes(selector.filter.availabilityStatus)) ||
    (selector.filter.publicationStatus !== undefined &&
      !catalogPublicationValues.includes(selector.filter.publicationStatus)) ||
    (selector.filter.priceStatus !== undefined &&
      !catalogBulkPriceStatuses.includes(selector.filter.priceStatus))
  ) {
    throw new CatalogManagementError('CATALOG_MANAGEMENT_VALIDATION');
  }
}

function assertCatalogBulkPatch(patch: CatalogBulkOverlayPatch): void {
  if (typeof patch !== 'object' || patch === null) {
    throw new CatalogManagementError('CATALOG_MANAGEMENT_VALIDATION');
  }
  const keys = Object.keys(patch);
  if (
    keys.length === 0 ||
    !Object.values(patch).some((value) => value !== undefined) ||
    keys.some(
      (key) =>
        !['availabilityStatus', 'manualReviewState', 'publicationStatus', 'visibility'].includes(
          key,
        ),
    ) ||
    (patch.visibility !== undefined && !catalogVisibilityValues.includes(patch.visibility)) ||
    (patch.manualReviewState !== undefined &&
      !catalogManualReviewValues.includes(patch.manualReviewState)) ||
    (patch.availabilityStatus !== undefined &&
      !catalogAvailabilityValues.includes(patch.availabilityStatus)) ||
    (patch.publicationStatus !== undefined &&
      !catalogPublicationValues.includes(patch.publicationStatus))
  ) {
    throw new CatalogManagementError('CATALOG_MANAGEMENT_VALIDATION');
  }
}

export function assertCatalogBusinessBulkPreviewInput(
  input: PreviewCatalogBusinessBulkInput,
): void {
  assertCatalogCommandContext(input);
  if (
    !uuidPattern.test(input.catalogSourceId) ||
    !uuidPattern.test(input.catalogVersionId) ||
    !uuidPattern.test(input.syncRunId) ||
    !checksumPattern.test(input.expectedCatalogDifferenceChecksum) ||
    input.reason.trim().length < 3 ||
    input.reason.length > 512
  ) {
    throw new CatalogManagementError('CATALOG_MANAGEMENT_VALIDATION');
  }
  assertCatalogBulkSelector(input.selector);
  assertCatalogBulkPatch(input.patch);
}

export function catalogBulkConfirmation(targetCount: number, selectionChecksum: string): string {
  return `ПРИМЕНИТЬ ${targetCount} ${selectionChecksum.slice(0, 8)}`;
}

export function assertCatalogBusinessBulkApplyInput(input: ApplyCatalogBusinessBulkInput): void {
  assertCatalogBusinessBulkPreviewInput(input);
  if (
    !Number.isSafeInteger(input.expectedTargetCount) ||
    input.expectedTargetCount < 1 ||
    input.expectedTargetCount > maximumCatalogBulkTargetCount ||
    !checksumPattern.test(input.expectedSelectionChecksum) ||
    !idempotencyPattern.test(input.idempotencyKey) ||
    input.confirmation !==
      catalogBulkConfirmation(input.expectedTargetCount, input.expectedSelectionChecksum)
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
