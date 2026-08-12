import type { ConfiguratorCoverageStatus } from './coverage.js';

export const calculationStatuses = [
  'CALCULATED',
  'PRICE_ON_REQUEST',
  'MANUAL_REVIEW_REQUIRED',
  'CONFIGURATION_INVALID',
  'SOURCE_DATA_STALE',
  'PRICE_VERSION_INACTIVE',
  'DEPENDENCY_UNAVAILABLE',
] as const;

export type CalculationStatus = (typeof calculationStatuses)[number];
export type PricingRuleKind = 'AREA_MINIMUM' | 'EXACT_LOOKUP';
export type PricingParityStatus = 'FAILED' | 'PASSED' | 'PENDING';
export type PricingVerificationStatus = 'CANDIDATE' | 'REJECTED' | 'VERIFIED';

export interface ConfiguratorOption {
  readonly amountMinor: number;
  readonly code: string;
  readonly id: string;
  readonly name: string;
}

export interface PricingRuleOptions {
  readonly additionalOptions: readonly ConfiguratorOption[];
  readonly categoryId: string;
  readonly categoryName: string;
  readonly controlTypes: readonly ConfiguratorOption[];
  readonly familyName: string;
  readonly hardwareOptions: readonly ConfiguratorOption[];
  readonly materialArticle: string;
  readonly materialColor: string;
  readonly materialName: string;
  readonly mountingTypes: readonly ConfiguratorOption[];
  readonly systemName: string;
}

export interface PricingFixture {
  readonly expectedMinor: number;
  readonly heightMm: number;
  readonly widthMm: number;
}

export interface ExactLookupRuleData {
  readonly pricesMinor: Readonly<Record<string, number>>;
}

export interface AreaMinimumRuleData {
  readonly minimumBillableAreaSquareMm: number;
}

export interface PricingRuleProfile {
  readonly basePriceMinor: number | null;
  readonly catalogVersionId: string;
  readonly configuratorModelId: string;
  readonly createdAt: string;
  readonly currency: 'RUB';
  readonly fixtureCount: number;
  readonly id: string;
  readonly kind: PricingRuleKind;
  readonly materialVariantId: string;
  readonly maximumDeviationMinor: number;
  readonly maximumHeightMm: number;
  readonly maximumWidthMm: number;
  readonly minimumHeightMm: number;
  readonly minimumWidthMm: number;
  readonly optionData: PricingRuleOptions;
  readonly parityStatus: PricingParityStatus;
  readonly priceVersionActive: boolean;
  readonly priceVersionId: string;
  readonly productFamilyId: string;
  readonly productModelCode: string;
  readonly productModelName: string;
  readonly productModelSourceId: string;
  readonly productSystemId: string;
  readonly roundingRule: 'INTEGER_HALF_UP' | 'NONE_EXACT_LOOKUP';
  readonly ruleData: AreaMinimumRuleData | ExactLookupRuleData;
  readonly ruleKey: string;
  readonly safeExplanation: string;
  readonly sourceCapturedAt: string;
  readonly sourcePriceCategory: string | null;
  readonly sourceReference: string;
  readonly sourceVersion: string;
  readonly testExamples: readonly PricingFixture[];
  readonly verificationStatus: PricingVerificationStatus;
  readonly verifiedAt: string;
}

export interface PricingSelection {
  readonly additionalOptionIds: readonly string[];
  readonly catalogVersionId: string;
  readonly configuratorModelId: string;
  readonly controlTypeId: string;
  readonly hardwareOptionId: string;
  readonly heightMm: number;
  readonly materialVariantId: string;
  readonly mountingTypeId: string;
  readonly productFamilyId: string;
  readonly productSystemId: string;
  readonly quantity: number;
  readonly widthMm: number;
}

export interface PricingValidationDetail {
  readonly code: string;
  readonly field: keyof PricingSelection | 'configuration';
  readonly message: string;
}

export interface PricingValidationResult {
  readonly details: readonly PricingValidationDetail[];
  readonly status: 'INVALID' | 'MANUAL_REVIEW_REQUIRED' | 'VALID';
  readonly warnings: readonly string[];
}

export interface AppliedPriceRule {
  readonly ruleId: string;
  readonly ruleKey: string;
  readonly ruleKind: PricingRuleKind;
  readonly sourceReference: string;
}

export interface AppliedPriceOverride {
  readonly amountMinor: number;
  readonly id: string;
  readonly reason: string;
}

export interface PricingResult {
  readonly appliedOverrides: readonly AppliedPriceOverride[];
  readonly appliedRules: readonly AppliedPriceRule[];
  readonly calculatedAt: string;
  readonly currency: 'RUB';
  readonly deliveryKopecks: 0;
  readonly grandTotalKopecks: number | null;
  readonly installationKopecks: 0;
  readonly measurementKopecks: 0;
  readonly minimumPriceApplied: boolean;
  readonly minimumPriceKopecks: 150000;
  readonly optionsTotalKopecks: number | null;
  readonly priceVersionId: string | null;
  readonly productsSubtotalKopecks: number | null;
  readonly quantity: number;
  readonly safeExplanation: string;
  readonly sourceVersion: string | null;
  readonly status: CalculationStatus;
  readonly unitBasePriceKopecks: number | null;
  readonly unitFinalPriceKopecks: number | null;
  readonly unitPriceBeforeMinimumKopecks: number | null;
  readonly validationDetails: readonly PricingValidationDetail[];
  readonly warnings: readonly string[];
}

export interface PricingCalculationInput {
  readonly calculatedAt: string;
  readonly localOverride?: AppliedPriceOverride;
  readonly profile: PricingRuleProfile | null;
  readonly selection: PricingSelection;
  readonly sourceDataStale?: boolean;
}

export interface ParityVerificationResult {
  readonly failedCount: number;
  readonly fixtureCount: number;
  readonly maximumDeviationMinor: number;
  readonly passedCount: number;
  readonly ruleResults: readonly {
    readonly failedCount: number;
    readonly fixtureCount: number;
    readonly maximumDeviationMinor: number;
    readonly ruleId: string;
    readonly ruleKey: string;
  }[];
  readonly status: PricingParityStatus;
}

export type PublicPricingProfile = Omit<
  PricingRuleProfile,
  'ruleData' | 'sourceReference' | 'testExamples'
>;

export interface ConfiguratorFamilyOption {
  readonly automaticPricing: boolean;
  readonly code: string;
  readonly id: string;
  readonly name: string;
}

export interface ConfiguratorSystemOption {
  readonly categoryId: string;
  readonly categoryName: string;
  readonly familyId: string;
  readonly id: string;
  readonly name: string;
}

export interface ConfiguratorMaterialSearchQuery {
  readonly categoryId: string;
  readonly familyId: string;
  readonly limit: number;
  readonly offset: number;
  readonly query: string;
  readonly selectedMaterialId?: string;
  readonly systemId: string;
}

export interface ConfiguratorMaterialSearchItem {
  readonly article: string;
  readonly availability: 'INQUIRY_ONLY' | 'IN_STOCK' | 'OUT_OF_STOCK';
  readonly categoryName: string;
  readonly color: string;
  readonly coverageStatus: ConfiguratorCoverageStatus;
  readonly id: string;
  readonly image: {
    readonly height: number;
    readonly id: string;
    readonly width: number;
  } | null;
  readonly name: string;
  readonly systemName: string;
}

export interface ConfiguratorMaterialSearchPage {
  readonly catalogVersionId: string;
  readonly items: readonly ConfiguratorMaterialSearchItem[];
  readonly total: number;
}

export interface ConfiguratorBootstrap {
  readonly catalogVersionId: string;
  readonly catalogVersionNumber: number;
  readonly families: readonly ConfiguratorFamilyOption[];
  readonly priceVersionId: string;
  readonly priceVersionNumber: number;
  readonly profiles: readonly PublicPricingProfile[];
  readonly systems: readonly ConfiguratorSystemOption[];
}

export interface StoredPricingCalculation {
  readonly calculationId: string;
  readonly calculationToken: string;
  readonly result: PricingResult;
}

export interface QuoteSnapshotView {
  readonly breakdown: PricingResult;
  readonly catalogVersionId: string;
  readonly configuration: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
  readonly priceVersionId: string | null;
  readonly quoteToken: string;
  readonly sourceVersion: string | null;
  readonly status: CalculationStatus;
}

export interface PricingVersionSummary {
  readonly activatedAt: string | null;
  readonly changeCount: number;
  readonly createdAt: string;
  readonly fixtureCount: number;
  readonly id: string;
  readonly maximumDeviationMinor: number | null;
  readonly parityStatus: PricingParityStatus | null;
  readonly ruleCount: number;
  readonly sourceVersion: string | null;
  readonly status: string;
  readonly unsupportedCount: number;
  readonly versionNumber: number;
}

export interface PricingAuditEntry {
  readonly action: string;
  readonly actorId: string | null;
  readonly createdAt: string;
  readonly outcome: string;
  readonly reasonCode: string;
  readonly targetId: string;
}

export interface PricingAdminOverview {
  readonly activePriceVersionId: string | null;
  readonly audit: readonly PricingAuditEntry[];
  readonly versions: readonly PricingVersionSummary[];
}
