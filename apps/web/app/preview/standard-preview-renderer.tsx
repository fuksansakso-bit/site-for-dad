import type { StandardPreviewStateResponse } from '@project-name/contracts/preview';
import { buildPreviewRenderModel, type PreviewRenderModel } from '@project-name/preview';

import { PreviewSceneSvg } from './preview-scene';

function HardwareRail({
  model,
  y,
}: {
  readonly model: PreviewRenderModel;
  readonly y: number;
}): React.JSX.Element {
  const { width, x } = model.product;
  const railHeight = Math.max(6, Math.min(15, model.product.height * 0.025));
  return (
    <g aria-hidden="true">
      <rect
        fill={model.hardwareColor}
        filter={`url(#${model.ids.shadow})`}
        height={railHeight}
        rx={railHeight / 3}
        stroke="#596160"
        strokeOpacity="0.34"
        strokeWidth="1"
        width={width}
        x={x}
        y={y - railHeight / 2}
      />
      <path
        d={`M${x + railHeight} ${y - railHeight * 0.12} H${x + width - railHeight}`}
        opacity="0.44"
        stroke="#FFFFFF"
        strokeLinecap="round"
        strokeWidth={Math.max(1, railHeight * 0.11)}
      />
    </g>
  );
}

function Chain({
  model,
  deployedHeight,
}: {
  readonly model: PreviewRenderModel;
  readonly deployedHeight: number;
}): React.JSX.Element {
  const { controlSide } = model.familyParameters;
  const { height, width, x, y } = model.product;
  const sideX = controlSide === 'LEFT' ? x + width * 0.035 : x + width * 0.965;
  const chainLength = Math.min(height * 0.72, Math.max(height * 0.3, deployedHeight * 0.76));
  const beadRadius = Math.max(1.2, Math.min(2.5, width * 0.006));
  const beads = Array.from({ length: 18 }, (_, index) => index);
  return (
    <g aria-hidden="true" fill={model.hardwareColor} stroke="#5E625F" strokeWidth="0.5">
      {beads.map((index) => {
        const progress = index / (beads.length - 1);
        const goingDown = progress <= 0.5;
        const local = goingDown ? progress * 2 : (progress - 0.5) * 2;
        return (
          <circle
            cx={sideX + (goingDown ? -beadRadius * 2.1 : beadRadius * 2.1)}
            cy={y + 12 + local * chainLength}
            key={index}
            r={beadRadius}
          />
        );
      })}
    </g>
  );
}

function SideGuides({ model }: { readonly model: PreviewRenderModel }): React.JSX.Element | null {
  if (!model.familyParameters.hasGuides) return null;
  const { height, width, x, y } = model.product;
  const guide = Math.max(3, Math.min(7, width * 0.016));
  return (
    <g aria-hidden="true" fill={model.hardwareColor} opacity="0.9">
      <rect height={height} rx={guide / 2} width={guide} x={x} y={y} />
      <rect height={height} rx={guide / 2} width={guide} x={x + width - guide} y={y} />
    </g>
  );
}

function RollerLayer({ model }: { readonly model: PreviewRenderModel }): React.JSX.Element {
  const { height, width, x, y } = model.product;
  const deployedHeight = Math.max(height * 0.025, height * (model.controls.openingPosition / 100));
  const lowerRailHeight = Math.max(5, Math.min(13, height * 0.022));
  const cassetteHeight = model.familyParameters.hasCassette
    ? Math.max(14, Math.min(28, height * 0.052))
    : 0;
  return (
    <g data-family-renderer="ROLLER">
      <rect
        fill={`url(#${model.ids.materialPattern})`}
        height={Math.max(1, deployedHeight - cassetteHeight / 2)}
        width={width}
        x={x}
        y={y + cassetteHeight / 2}
      />
      <rect
        fill="#243031"
        height={Math.max(1, deployedHeight - cassetteHeight / 2)}
        opacity="0.07"
        width={Math.max(2, width * 0.025)}
        x={x + width * 0.975}
        y={y + cassetteHeight / 2}
      />
      <HardwareRail model={model} y={y + deployedHeight - lowerRailHeight / 2} />
      {model.familyParameters.hasCassette ? (
        <HardwareRail model={model} y={y + cassetteHeight / 2} />
      ) : null}
      <SideGuides model={model} />
      <Chain deployedHeight={deployedHeight} model={model} />
    </g>
  );
}

function ZebraLayer({ model }: { readonly model: PreviewRenderModel }): React.JSX.Element {
  const { height, width, x, y } = model.product;
  const deployedHeight = Math.max(height * 0.04, height * (model.controls.openingPosition / 100));
  const phase = (model.controls.zebraAlignment / 100) * height * 0.24;
  const cassetteHeight = model.familyParameters.hasCassette
    ? Math.max(14, Math.min(28, height * 0.052))
    : 0;
  return (
    <g data-family-renderer="ZEBRA">
      <rect
        fill={`url(#${model.ids.materialPattern})`}
        height={Math.max(1, deployedHeight - cassetteHeight / 2)}
        width={width}
        x={x}
        y={y + cassetteHeight / 2}
      />
      <g clipPath={`url(#${model.ids.clip})`} opacity="0.46" transform={`translate(0 ${phase})`}>
        <rect
          fill={`url(#${model.ids.materialPattern})`}
          height={Math.max(1, deployedHeight - cassetteHeight / 2)}
          width={width}
          x={x}
          y={y + cassetteHeight / 2 - phase * 2}
        />
      </g>
      <HardwareRail model={model} y={y + deployedHeight} />
      <HardwareRail model={model} y={y + cassetteHeight / 2} />
      <SideGuides model={model} />
      <Chain deployedHeight={deployedHeight} model={model} />
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
  state,
}: {
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
  const layer =
    state.asset.quality === 'PREVIEW_UNAVAILABLE' ? (
      <UnavailableLayer model={model} />
    ) : state.family === 'ROLLER' ? (
      <RollerLayer model={model} />
    ) : state.family === 'ZEBRA' ? (
      <ZebraLayer model={model} />
    ) : (
      <UnavailableLayer model={model} />
    );
  return <PreviewSceneSvg accessibleLabel={label} model={model} productLayer={layer} />;
}
