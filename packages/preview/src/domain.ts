import {
  previewFamilyCodes,
  type PreviewAssetCandidate,
  type PreviewControlPatch,
  type PreviewControls,
  type PreviewFamilyCode,
  type SelectedPreviewAsset,
} from './types.js';

const allowedPreviewMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

function clampInteger(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}

export function selectPreviewFamily(code: string): PreviewFamilyCode | null {
  return previewFamilyCodes.find((family) => family === code) ?? null;
}

export function isAllowedPreviewMimeType(value: string): boolean {
  return allowedPreviewMimeTypes.has(value.toLowerCase());
}

export function selectPreviewAsset(
  candidates: readonly PreviewAssetCandidate[],
  normalizedColor: string | null,
): SelectedPreviewAsset {
  const safeColor =
    normalizedColor !== null && /^#[0-9a-f]{6}$/iu.test(normalizedColor)
      ? normalizedColor.toUpperCase()
      : null;
  const allowed = candidates
    .filter((candidate) => candidate.approved && isAllowedPreviewMimeType(candidate.mimeType))
    .sort(
      (left, right) =>
        ['SWATCH', 'PRIMARY', 'DETAIL', 'SYSTEM'].indexOf(left.role) -
          ['SWATCH', 'PRIMARY', 'DETAIL', 'SYSTEM'].indexOf(right.role) ||
        left.sortOrder - right.sortOrder ||
        left.id.localeCompare(right.id),
    );
  const exact = allowed.find((candidate) => candidate.role === 'SWATCH');
  if (exact !== undefined) {
    return { assetId: exact.id, normalizedColor: safeColor, quality: 'EXACT_SWATCH' };
  }
  const crop = allowed.find(
    (candidate) => candidate.role === 'PRIMARY' || candidate.role === 'DETAIL',
  );
  if (crop !== undefined) {
    return { assetId: crop.id, normalizedColor: safeColor, quality: 'PRODUCT_IMAGE_CROP' };
  }
  if (safeColor !== null) {
    return {
      assetId: null,
      normalizedColor: safeColor,
      quality: 'NORMALIZED_COLOR_ONLY',
    };
  }
  return { assetId: null, normalizedColor: null, quality: 'PREVIEW_UNAVAILABLE' };
}

export function defaultPreviewControls(): PreviewControls {
  return {
    openingPosition: 76,
    slatAngle: 18,
    verticalSpread: 86,
    zebraAlignment: 32,
    zoom: 100,
  };
}

export function applyPreviewControlPatch(
  family: PreviewFamilyCode,
  current: PreviewControls,
  patch: PreviewControlPatch,
): PreviewControls {
  const next: PreviewControls = {
    openingPosition: clampInteger(patch.openingPosition ?? current.openingPosition, 0, 100),
    slatAngle: clampInteger(patch.slatAngle ?? current.slatAngle, -75, 75),
    verticalSpread: clampInteger(patch.verticalSpread ?? current.verticalSpread, 0, 100),
    zebraAlignment: clampInteger(patch.zebraAlignment ?? current.zebraAlignment, 0, 100),
    zoom: clampInteger(patch.zoom ?? current.zoom, 100, 180),
  };
  if (family !== 'ZEBRA' && patch.zebraAlignment !== undefined) {
    throw new TypeError('ZEBRA_ALIGNMENT_UNSUPPORTED');
  }
  if (!['HORIZONTAL_ALUMINUM', 'VERTICAL'].includes(family) && patch.slatAngle !== undefined) {
    throw new TypeError('SLAT_ANGLE_UNSUPPORTED');
  }
  if (family !== 'VERTICAL' && patch.verticalSpread !== undefined) {
    throw new TypeError('VERTICAL_SPREAD_UNSUPPORTED');
  }
  return next;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value !== 'object' || value === null) return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalize(item)]),
  );
}

export function canonicalPreviewInput(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}
