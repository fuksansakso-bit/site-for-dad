import type { PreviewRenderModel } from '@project-name/preview';
import type { ReactNode } from 'react';

export function PreviewSceneSvg({
  accessibleLabel,
  model,
  onAssetError,
  productLayer,
}: {
  readonly accessibleLabel: string;
  readonly model: PreviewRenderModel;
  readonly onAssetError?: (() => void) | undefined;
  readonly productLayer: ReactNode;
}): React.JSX.Element {
  const centerX = model.scene.window.x + model.scene.window.width / 2;
  const centerY = model.scene.window.y + model.scene.window.height / 2;
  const zoom = model.controls.zoom / 100;
  const transform = `translate(${centerX} ${centerY}) scale(${zoom}) translate(${-centerX} ${-centerY})`;
  const sceneUrl = `/api/v1/previews/scenes/${model.sceneId}/asset?v=${model.scene.version}`;
  return (
    <svg
      aria-label={accessibleLabel}
      className="standard-preview-svg"
      data-renderer-version={model.rendererVersion}
      data-scene={model.sceneId}
      data-state-checksum={model.stateChecksum}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      viewBox={model.viewBox}
    >
      <g transform={transform}>
        <image
          data-preview-layer="supplier-interior"
          height="937"
          href={sceneUrl}
          onError={onAssetError}
          preserveAspectRatio="none"
          width="1500"
          x="0"
          y="0"
        />
        <g data-preview-layer="product">{productLayer}</g>
      </g>
    </svg>
  );
}
