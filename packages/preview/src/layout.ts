export interface HorizontalSlatLayoutInput {
  readonly angleDegrees: number;
  readonly heightMm: number;
  readonly openingPosition: number;
  readonly productHeight: number;
  readonly productY: number;
  readonly slatWidthMm: number;
}

export interface HorizontalSlatLayout {
  readonly count: number;
  readonly slatHeight: number;
  readonly slats: readonly { readonly index: number; readonly y: number }[];
  readonly stackBottomY: number;
}

export interface VerticalSlatLayoutInput {
  readonly angleDegrees: number;
  readonly lamellaWidthMm: number;
  readonly openingDirection: 'CENTER' | 'LEFT' | 'RIGHT' | null;
  readonly productWidth: number;
  readonly productX: number;
  readonly spread: number;
  readonly widthMm: number;
}

export interface VerticalSlatLayout {
  readonly count: number;
  readonly lamellaWidth: number;
  readonly slats: readonly { readonly index: number; readonly x: number }[];
}

function boundedPercent(value: number): number {
  if (!Number.isFinite(value)) throw new TypeError('PREVIEW_LAYOUT_VALUE_INVALID');
  return Math.min(100, Math.max(0, value));
}

function boundedDimension(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError('PREVIEW_LAYOUT_DIMENSION_INVALID');
  }
  return value;
}

function rounded(value: number): number {
  return Math.round(value * 1_000) / 1_000;
}

function angleScale(angleDegrees: number): number {
  if (!Number.isFinite(angleDegrees) || angleDegrees < -75 || angleDegrees > 75) {
    throw new TypeError('PREVIEW_LAYOUT_ANGLE_INVALID');
  }
  return Math.max(0.22, Math.abs(Math.cos((angleDegrees * Math.PI) / 180)));
}

export function horizontalSlatLayout(input: HorizontalSlatLayoutInput): HorizontalSlatLayout {
  const heightMm = boundedDimension(input.heightMm);
  const slatWidthMm = boundedDimension(input.slatWidthMm);
  const productHeight = boundedDimension(input.productHeight);
  const deployment = boundedPercent(input.openingPosition) / 100;
  const count = Math.min(160, Math.max(2, Math.ceil(heightMm / slatWidthMm)));
  const naturalPitch = productHeight / count;
  const deployedPitch = naturalPitch * deployment;
  const slatHeight = rounded(Math.max(1.2, naturalPitch * 1.16 * angleScale(input.angleDegrees)));
  const slats = Array.from({ length: count }, (_, index) => ({
    index,
    y: rounded(input.productY + Math.min(productHeight - slatHeight / 2, index * deployedPitch)),
  }));
  return {
    count,
    slatHeight,
    slats,
    stackBottomY: rounded(slats.at(-1)?.y ?? input.productY),
  };
}

export function verticalSlatLayout(input: VerticalSlatLayoutInput): VerticalSlatLayout {
  const widthMm = boundedDimension(input.widthMm);
  const lamellaWidthMm = boundedDimension(input.lamellaWidthMm);
  const productWidth = boundedDimension(input.productWidth);
  const spread = boundedPercent(input.spread) / 100;
  const count = Math.min(100, Math.max(2, Math.ceil(widthMm / lamellaWidthMm)));
  const naturalWidth = (productWidth * lamellaWidthMm) / widthMm;
  const lamellaWidth = rounded(Math.max(1.5, naturalWidth * angleScale(input.angleDegrees)));
  const coveredSpan = Math.max(0, productWidth - naturalWidth) * spread;
  const direction = input.openingDirection;
  const anchor =
    direction === 'LEFT'
      ? input.productX
      : direction === 'RIGHT'
        ? input.productX + productWidth
        : input.productX + productWidth / 2;
  const slats = Array.from({ length: count }, (_, index) => {
    const progress = index / (count - 1);
    const offset =
      direction === 'LEFT'
        ? progress * coveredSpan
        : direction === 'RIGHT'
          ? -(1 - progress) * coveredSpan
          : (progress - 0.5) * coveredSpan;
    return { index, x: rounded(anchor + offset - lamellaWidth / 2) };
  });
  return { count, lamellaWidth, slats };
}
