export const previewRendererVersion = 'standard-svg-v1' as const;
export const previewStateVersion = 1 as const;

export const previewFamilyCodes = ['ROLLER', 'ZEBRA', 'HORIZONTAL_ALUMINUM', 'VERTICAL'] as const;
export type PreviewFamilyCode = (typeof previewFamilyCodes)[number];

export const previewAssetQualities = [
  'EXACT_SWATCH',
  'PRODUCT_IMAGE_CROP',
  'NORMALIZED_COLOR_ONLY',
  'PREVIEW_UNAVAILABLE',
] as const;
export type PreviewAssetQuality = (typeof previewAssetQualities)[number];

export const previewSceneIds = ['WINDOW_CLOSEUP', 'ROOM_WINDOW'] as const;
export type PreviewSceneId = (typeof previewSceneIds)[number];

export const previewEligibilityReasons = [
  'ELIGIBLE',
  'CATALOG_VERSION_CHANGED',
  'PRICE_VERSION_CHANGED',
  'CONFIGURATION_INVALID',
  'MATERIAL_UNAVAILABLE',
  'UNSUPPORTED_FAMILY',
  'ASSET_UNAVAILABLE',
] as const;
export type PreviewEligibilityReason = (typeof previewEligibilityReasons)[number];

export interface PreviewAssetCandidate {
  readonly approved: boolean;
  readonly id: string;
  readonly mimeType: string;
  readonly role: 'DETAIL' | 'PRIMARY' | 'SWATCH' | 'SYSTEM';
  readonly sortOrder: number;
}

export interface SelectedPreviewAsset {
  readonly assetId: string | null;
  readonly normalizedColor: string | null;
  readonly quality: PreviewAssetQuality;
}

export interface PreviewControls {
  readonly openingPosition: number;
  readonly slatAngle: number;
  readonly verticalSpread: number;
  readonly zebraAlignment: number;
  readonly zoom: number;
}

export interface PreviewControlPatch {
  readonly openingPosition?: number;
  readonly slatAngle?: number;
  readonly verticalSpread?: number;
  readonly zebraAlignment?: number;
  readonly zoom?: number;
}

export interface StandardPreviewConfiguration {
  readonly additionalOptionIds: readonly string[];
  readonly catalogVersionId: string;
  readonly controlTypeId: string;
  readonly familyCode: string;
  readonly familyId: string;
  readonly familyName: string;
  readonly hardwareOptionId: string;
  readonly hardwareOptionName: string;
  readonly heightMm: number;
  readonly materialArticle: string;
  readonly materialColorName: string;
  readonly materialName: string;
  readonly materialVariantId: string;
  readonly modelCode: string;
  readonly modelId: string;
  readonly modelName: string;
  readonly mountingTypeId: string;
  readonly priceVersionId: string | null;
  readonly systemId: string;
  readonly systemName: string;
  readonly widthMm: number;
}

export interface PreviewEligibility {
  readonly eligible: boolean;
  readonly family: PreviewFamilyCode | null;
  readonly reason: PreviewEligibilityReason;
  readonly warnings: readonly PreviewEligibilityReason[];
}

export interface PreviewFamilyParameters {
  readonly controlSide: 'LEFT' | 'RIGHT' | null;
  readonly hasCassette: boolean;
  readonly hasGuides: boolean;
  readonly horizontalSlatWidthMm: number | null;
  readonly verticalLamellaWidthMm: number | null;
  readonly verticalOpeningDirection: 'CENTER' | 'LEFT' | 'RIGHT' | null;
}

export interface PreviewSceneDefinition {
  readonly description: string;
  readonly id: PreviewSceneId;
  readonly label: string;
  readonly version: 1;
  readonly window: {
    readonly height: number;
    readonly width: number;
    readonly x: number;
    readonly y: number;
  };
}
