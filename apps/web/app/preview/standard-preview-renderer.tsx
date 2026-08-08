import type { StandardPreviewStateResponse } from '@project-name/contracts/preview';
import { buildPreviewRenderModel, type PreviewRenderModel } from '@project-name/preview';

import { PreviewSceneSvg } from './preview-scene';

const ATLAS_WIDTH = 1500;
const ATLAS_HEIGHT = 937;

function rounded(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}

function scaleAt(anchorX: number, anchorY: number, scaleX: number, scaleY: number): string {
  return `translate(${anchorX} ${anchorY}) scale(${rounded(scaleX)} ${rounded(scaleY)}) translate(${-anchorX} ${-anchorY})`;
}

function deploymentScale(position: number): number {
  return rounded(0.12 + (Math.min(100, Math.max(0, position)) / 100) * 0.88);
}

function angleScale(angle: number): number {
  const radians = (Math.min(75, Math.max(-75, angle)) * Math.PI) / 180;
  return rounded(0.8 + Math.abs(Math.cos(radians)) * 0.2);
}

function SupplierImage({
  dataLayer,
  href,
  onAssetError,
}: {
  readonly dataLayer?: string | undefined;
  readonly href: string;
  readonly onAssetError?: (() => void) | undefined;
}): React.JSX.Element {
  return (
    <image
      data-preview-layer={dataLayer}
      height={ATLAS_HEIGHT}
      href={href}
      onError={onAssetError}
      preserveAspectRatio="none"
      width={ATLAS_WIDTH}
      x="0"
      y="0"
    />
  );
}

function HardwareLayer({
  clipId,
  color,
  href,
  maskId,
  onAssetError,
  transform,
}: {
  readonly clipId?: string | undefined;
  readonly color: string;
  readonly href: string;
  readonly maskId: string;
  readonly onAssetError?: (() => void) | undefined;
  readonly transform?: string | undefined;
}): React.JSX.Element {
  const isWhite = color === '#FFFFFF';
  return (
    <g clipPath={clipId === undefined ? undefined : `url(#${clipId})`} transform={transform}>
      <SupplierImage href={href} onAssetError={onAssetError} />
      {isWhite ? null : (
        <rect
          fill={color}
          height={ATLAS_HEIGHT}
          mask={`url(#${maskId})`}
          opacity="0.62"
          style={{ mixBlendMode: 'multiply' }}
          width={ATLAS_WIDTH}
          x="0"
          y="0"
        />
      )}
    </g>
  );
}

function SupplierAtlasLayer({
  model,
  onAssetError,
  state,
}: {
  readonly model: PreviewRenderModel;
  readonly onAssetError?: (() => void) | undefined;
  readonly state: StandardPreviewStateResponse;
}): React.JSX.Element {
  const materialUrl = `/api/v1/previews/${state.id}/layers/MATERIAL_VISUALIZATION?v=2`;
  const hardwareUrl = `/api/v1/previews/${state.id}/layers/SYSTEM_HARDWARE?v=2`;
  const chainOnlyHardware = state.family === 'ROLLER' || state.family === 'ZEBRA';
  const hardwareClipId = `${model.ids.hardwareMask}-visible`;
  const family = state.family;
  const deployment = deploymentScale(state.controls.openingPosition);
  let materialTransform: string | undefined;
  let hardwareTransform: string | undefined;

  if (family === 'ROLLER') {
    materialTransform = scaleAt(0, 88, 1, deployment);
    hardwareTransform = materialTransform;
  } else if (family === 'ZEBRA') {
    const bandOffset = rounded(((state.controls.zebraAlignment - 50) / 50) * 18);
    materialTransform = `${scaleAt(0, 88, 1, deployment)} translate(0 ${bandOffset})`;
    hardwareTransform = scaleAt(0, 88, 1, deployment);
  } else if (family === 'HORIZONTAL_ALUMINUM') {
    const slatScale = rounded(deployment * angleScale(state.controls.slatAngle));
    materialTransform = scaleAt(0, 24, 1, slatScale);
  } else if (family === 'VERTICAL') {
    const spreadScale = 0.12 + (state.controls.verticalSpread / 100) * 0.88;
    const slatScale = rounded(spreadScale * angleScale(state.controls.slatAngle));
    const anchorX =
      state.familyParameters.verticalOpeningDirection === 'LEFT'
        ? 365
        : state.familyParameters.verticalOpeningDirection === 'RIGHT'
          ? 1025
          : 695;
    materialTransform = scaleAt(anchorX, 0, slatScale, 1);
  }

  return (
    <g
      data-family-renderer={family ?? 'UNAVAILABLE'}
      data-material-article={state.configuration.material.article}
      data-renderer-source="supplier-pixel-aligned-atlas"
    >
      <defs>
        {chainOnlyHardware ? (
          <clipPath id={hardwareClipId}>
            <rect height="585" width="34" x="394" y="150" />
            <rect height="585" width="34" x="922" y="150" />
          </clipPath>
        ) : null}
        <mask
          height={ATLAS_HEIGHT}
          id={model.ids.hardwareMask}
          maskUnits="userSpaceOnUse"
          style={{ maskType: 'alpha' }}
          width={ATLAS_WIDTH}
          x="0"
          y="0"
        >
          <SupplierImage href={hardwareUrl} onAssetError={onAssetError} />
        </mask>
      </defs>
      <g transform={materialTransform}>
        <SupplierImage dataLayer="material-source" href={materialUrl} onAssetError={onAssetError} />
      </g>
      {family === 'ZEBRA' ? (
        <g data-preview-correction="zebra-perspective-aligned-hardware">
          <path
            d="M780 153 L939 167"
            opacity="0.42"
            stroke="#545957"
            strokeLinecap="round"
            strokeWidth="15"
          />
          <path
            d="M780 153 L939 167"
            stroke={model.hardwareColor}
            strokeLinecap="round"
            strokeWidth="11"
          />
          <path
            d="M783 150 L937 164"
            opacity="0.76"
            stroke="#FFFFFF"
            strokeLinecap="round"
            strokeWidth="2"
          />
        </g>
      ) : null}
      <HardwareLayer
        clipId={chainOnlyHardware ? hardwareClipId : undefined}
        color={model.hardwareColor}
        href={hardwareUrl}
        maskId={model.ids.hardwareMask}
        onAssetError={onAssetError}
        transform={hardwareTransform}
      />
    </g>
  );
}

function ColorOnlyLayer({
  model,
  state,
}: {
  readonly model: PreviewRenderModel;
  readonly state: StandardPreviewStateResponse;
}): React.JSX.Element {
  const { height, width, x, y } = model.product;
  const opening =
    state.family === 'VERTICAL' ? state.controls.verticalSpread : state.controls.openingPosition;
  const visibleHeight = Math.max(4, height * (opening / 100));
  const visibleWidth = Math.max(4, width * (opening / 100));
  const anchorRight = state.familyParameters.verticalOpeningDirection === 'RIGHT';
  const drawWidth = state.family === 'VERTICAL' ? visibleWidth : width;
  const drawHeight = state.family === 'VERTICAL' ? height : visibleHeight;
  const drawX = state.family === 'VERTICAL' && anchorRight ? x + width - drawWidth : x;
  return (
    <g
      data-family-renderer={state.family ?? 'UNAVAILABLE'}
      data-renderer-source="normalized-color-only"
    >
      <rect
        fill={model.normalizedColor ?? '#B9AA96'}
        height={drawHeight}
        stroke="#303837"
        strokeOpacity="0.36"
        strokeWidth="1"
        width={drawWidth}
        x={drawX}
        y={y}
      />
      <path
        d={`M${drawX} ${y + 2} H${drawX + drawWidth}`}
        stroke={model.hardwareColor}
        strokeWidth="6"
      />
    </g>
  );
}

function UnavailableLayer({ model }: { readonly model: PreviewRenderModel }): React.JSX.Element {
  const { height, width, x, y } = model.product;
  return (
    <g data-family-renderer="UNAVAILABLE">
      <rect fill="#F2EFE9" fillOpacity="0.82" height={height} rx="8" width={width} x={x} y={y} />
      <path
        d={`M${x + width * 0.35} ${y + height * 0.5} H${x + width * 0.65}`}
        stroke="#6F7471"
        strokeLinecap="round"
        strokeWidth={Math.max(4, Math.min(10, width * 0.025))}
      />
    </g>
  );
}

export function StandardPreviewRenderer({
  onAssetError,
  state,
}: {
  readonly onAssetError?: (() => void) | undefined;
  readonly state: StandardPreviewStateResponse;
}): React.JSX.Element {
  const model = buildPreviewRenderModel({
    assetQuality: state.asset.quality,
    assetUrl: state.asset.url,
    controls: state.controls,
    family: state.family,
    familyParameters: state.familyParameters,
    hardwareColor: state.configuration.hardware.color,
    heightMm: state.configuration.dimensions.heightMm,
    normalizedColor: state.asset.normalizedColor,
    rendererVersion: state.rendererVersion,
    sceneId: state.sceneId,
    stateChecksum: state.stateChecksum,
    widthMm: state.configuration.dimensions.widthMm,
  });
  const label = `Стандартная примерка: ${state.configuration.family.name}, ${state.configuration.material.name}, сцена «${model.scene.label}»`;
  const supported =
    state.asset.quality !== 'PREVIEW_UNAVAILABLE' &&
    state.family !== null &&
    ['ROLLER', 'ZEBRA', 'HORIZONTAL_ALUMINUM', 'VERTICAL'].includes(state.family);
  return (
    <PreviewSceneSvg
      accessibleLabel={label}
      model={model}
      onAssetError={onAssetError}
      productLayer={
        state.asset.quality === 'NORMALIZED_COLOR_ONLY' && state.asset.normalizedColor !== null ? (
          <ColorOnlyLayer model={model} state={state} />
        ) : supported ? (
          <SupplierAtlasLayer model={model} onAssetError={onAssetError} state={state} />
        ) : (
          <UnavailableLayer model={model} />
        )
      }
    />
  );
}
