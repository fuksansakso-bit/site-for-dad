import type {
  PreviewEligibilityResponse,
  PreviewSourceRequest,
  StandardPreviewStateResponse,
} from '@project-name/contracts/preview';
import {
  PreviewStoreError,
  type PreviewSourceReference,
  type StandardPreviewStateView,
} from '@project-name/db';
import type { PreviewControlPatch, StandardPreviewConfiguration } from '@project-name/preview';
import { ZodError, type ZodType } from 'zod';

import { PricingRequestError } from './pricing-security';

export function previewRouteErrorCode(error: unknown) {
  if (error instanceof ZodError || error instanceof SyntaxError || error instanceof TypeError) {
    return 'VALIDATION_ERROR' as const;
  }
  if (error instanceof PricingRequestError) return error.code;
  if (error instanceof PreviewStoreError) {
    switch (error.code) {
      case 'PREVIEW_AUTHORIZATION':
        return 'PERMISSION_DENIED' as const;
      case 'PREVIEW_CONFLICT':
        return 'CONFLICT' as const;
      case 'PREVIEW_INVALID_INPUT':
        return 'VALIDATION_ERROR' as const;
      case 'PREVIEW_NOT_FOUND':
        return 'NOT_FOUND' as const;
      case 'PREVIEW_DATABASE':
        return 'DEPENDENCY_UNAVAILABLE' as const;
    }
  }
  return 'INTERNAL_ERROR' as const;
}

export async function parsePreviewJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  return schema.parse(await request.json());
}

export function previewSourceReference(source: PreviewSourceRequest): PreviewSourceReference {
  if (source.calculationToken !== undefined) {
    return { calculationToken: source.calculationToken };
  }
  if (source.quoteToken !== undefined) return { quoteToken: source.quoteToken };
  throw new TypeError('PREVIEW_SOURCE_REQUIRED');
}

export function previewControlPatch(controls: {
  readonly openingPosition?: number | undefined;
  readonly slatAngle?: number | undefined;
  readonly verticalSpread?: number | undefined;
  readonly zebraAlignment?: number | undefined;
  readonly zoom?: number | undefined;
}): PreviewControlPatch {
  return {
    ...(controls.openingPosition === undefined
      ? {}
      : { openingPosition: controls.openingPosition }),
    ...(controls.slatAngle === undefined ? {} : { slatAngle: controls.slatAngle }),
    ...(controls.verticalSpread === undefined ? {} : { verticalSpread: controls.verticalSpread }),
    ...(controls.zebraAlignment === undefined ? {} : { zebraAlignment: controls.zebraAlignment }),
    ...(controls.zoom === undefined ? {} : { zoom: controls.zoom }),
  };
}

export function previewConfigurationResponse(
  configuration: StandardPreviewConfiguration,
  hardwareColor: string,
): PreviewEligibilityResponse['configuration'] {
  return {
    dimensions: { heightMm: configuration.heightMm, widthMm: configuration.widthMm },
    family: {
      code: configuration.familyCode,
      id: configuration.familyId,
      name: configuration.familyName,
    },
    hardware: {
      color: hardwareColor,
      label: configuration.hardwareOptionName,
      optionId: configuration.hardwareOptionId,
    },
    material: {
      article: configuration.materialArticle,
      colorName: configuration.materialColorName,
      id: configuration.materialVariantId,
      name: configuration.materialName,
    },
    model: {
      code: configuration.modelCode,
      id: configuration.modelId,
      name: configuration.modelName,
    },
    system: { id: configuration.systemId, name: configuration.systemName },
  };
}

export function previewStateResponse(
  state: StandardPreviewStateView,
  csrfToken: string,
  correlationId: string,
): StandardPreviewStateResponse {
  return {
    asset: {
      normalizedColor: state.normalizedColor,
      quality: state.assetQuality,
      url:
        state.assetId !== null && state.eligibility.eligible
          ? `/api/v1/previews/${state.id}/asset`
          : null,
    },
    configuration: previewConfigurationResponse(state.configuration, state.hardwareColor),
    controls: state.controls,
    correlationId,
    createdAt: state.createdAt,
    csrfToken,
    eligibility: {
      eligible: state.eligibility.eligible,
      reason: state.eligibility.reason,
      warnings: [...state.eligibility.warnings],
    },
    family: state.eligibility.family,
    familyParameters: state.familyParameters,
    id: state.id,
    rendererVersion: state.rendererVersion,
    sceneId: state.sceneId,
    stateChecksum: state.stateChecksum,
    stateVersion: state.stateVersion,
    updatedAt: state.updatedAt,
  };
}
