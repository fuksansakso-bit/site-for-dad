import type { PreviewRenderModel } from '@project-name/preview';
import type { ReactNode } from 'react';

function WindowView({ model }: { readonly model: PreviewRenderModel }): React.JSX.Element {
  const { height, width, x, y } = model.scene.window;
  return (
    <g aria-hidden="true">
      <rect
        fill={`url(#${model.ids.glassGradient})`}
        height={height}
        rx="8"
        width={width}
        x={x}
        y={y}
      />
      <path
        d={`M${x} ${y + height * 0.58} C${x + width * 0.18} ${y + height * 0.44}, ${x + width * 0.28} ${y + height * 0.68}, ${x + width * 0.46} ${y + height * 0.52} S${x + width * 0.78} ${y + height * 0.48}, ${x + width} ${y + height * 0.62} V${y + height} H${x} Z`}
        fill="#afbbc0"
        opacity="0.38"
      />
      <path
        d={`M${x} ${y + height * 0.72} Q${x + width * 0.25} ${y + height * 0.62} ${x + width * 0.52} ${y + height * 0.73} T${x + width} ${y + height * 0.69} V${y + height} H${x} Z`}
        fill="#819696"
        opacity="0.36"
      />
    </g>
  );
}

function CloseupBackground({ model }: { readonly model: PreviewRenderModel }): React.JSX.Element {
  return (
    <g aria-hidden="true">
      <rect fill={`url(#${model.ids.roomGradient})`} height="780" width="1200" />
      <rect fill="#d6d0c6" height="650" opacity="0.24" width="120" x="70" y="56" />
      <rect fill="#f7f3ea" height="642" rx="30" width="710" x="245" y="60" />
      <rect fill="#b7aea0" height="598" opacity="0.18" rx="18" width="618" x="291" y="82" />
      <WindowView model={model} />
      <ellipse cx="1040" cy="704" fill="#a79c8b" opacity="0.3" rx="92" ry="18" />
      <path
        d="M1018 700 Q1025 628 1006 568 M1020 641 Q973 625 956 582 M1015 616 Q1055 594 1068 552"
        fill="none"
        stroke="#6f796a"
        strokeLinecap="round"
        strokeWidth="10"
      />
      <path
        d="M956 582 Q1000 570 1009 612 Q973 620 956 582 M1068 552 Q1075 598 1022 614 Q1026 570 1068 552 M984 635 Q1019 626 1021 660 Q994 665 984 635"
        fill="#82917a"
      />
      <path d="M980 694 L1061 694 L1047 753 L994 753 Z" fill="#b89b7d" />
    </g>
  );
}

function RoomBackground({ model }: { readonly model: PreviewRenderModel }): React.JSX.Element {
  return (
    <g aria-hidden="true">
      <rect fill={`url(#${model.ids.roomGradient})`} height="780" width="1200" />
      <path d="M0 544 L1200 512 L1200 780 L0 780 Z" fill="#c9b9a7" />
      <path d="M0 544 L1200 512" opacity="0.32" stroke="#fffaf1" strokeWidth="6" />
      <rect fill="#f6f1e8" height="456" rx="16" width="352" x="676" y="80" />
      <rect fill="#b5ac9f" height="414" opacity="0.18" rx="10" width="314" x="695" y="96" />
      <WindowView model={model} />
      <ellipse cx="652" cy="701" fill="#e7ddd0" rx="360" ry="64" />
      <path d="M150 594 Q160 548 224 544 H576 Q640 548 654 604 V694 H146 Z" fill="#8a8e88" />
      <rect fill="#9ca09a" height="92" rx="32" width="232" x="180" y="518" />
      <rect fill="#777d78" height="96" rx="28" width="222" x="407" y="522" />
      <rect
        fill="#d7c8b8"
        height="72"
        rx="20"
        width="96"
        x="337"
        y="522"
        transform="rotate(-4 337 522)"
      />
      <path d="M164 694 L146 752 M626 694 L647 752" stroke="#5d5a55" strokeWidth="13" />
      <ellipse cx="1056" cy="702" fill="#8b8074" opacity="0.28" rx="72" ry="16" />
      <path
        d="M1054 700 V330 M1007 332 H1100 L1077 255 H1030 Z"
        fill="none"
        stroke="#4f514d"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="12"
      />
      <circle cx="1054" cy="700" fill="#4f514d" r="22" />
      <rect fill="#8e7762" height="18" rx="9" width="128" x="896" y="622" />
      <path d="M921 640 L907 713 M999 640 L1014 713" stroke="#675d54" strokeWidth="9" />
    </g>
  );
}

function ProtectedWindowFrame({
  model,
}: {
  readonly model: PreviewRenderModel;
}): React.JSX.Element {
  const { height, width, x, y } = model.scene.window;
  const frame = Math.max(14, width * 0.045);
  return (
    <g aria-hidden="true" data-preview-layer="protected-window-frame">
      <rect
        fill="none"
        height={height}
        rx="7"
        stroke="#f5f2eb"
        strokeWidth={frame}
        width={width}
        x={x}
        y={y}
      />
      <path
        d={`M${x + width / 2} ${y} V${y + height}`}
        stroke="#f5f2eb"
        strokeWidth={frame * 0.72}
      />
      <path
        d={`M${x} ${y + height * 0.52} H${x + width}`}
        stroke="#f5f2eb"
        strokeWidth={frame * 0.64}
      />
      <path
        d={`M${x + width * 0.53} ${y + height * 0.51} v42`}
        stroke="#827b71"
        strokeLinecap="round"
        strokeWidth={frame * 0.34}
      />
      <rect
        fill="#ece6dc"
        height={frame * 1.1}
        rx="5"
        width={width + frame * 2.5}
        x={x - frame * 1.25}
        y={y + height + frame * 0.5}
      />
    </g>
  );
}

function SceneDefinitions({
  model,
  onAssetError,
}: {
  readonly model: PreviewRenderModel;
  readonly onAssetError?: (() => void) | undefined;
}): React.JSX.Element {
  const materialFill = model.normalizedColor ?? '#B9AA96';
  const { height, width, x, y } = model.product;
  return (
    <defs>
      <linearGradient id={model.ids.roomGradient} x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stopColor={model.sceneId === 'ROOM_WINDOW' ? '#efe9df' : '#ddd7cd'} />
        <stop offset="1" stopColor={model.sceneId === 'ROOM_WINDOW' ? '#d8d0c5' : '#bbb2a5'} />
      </linearGradient>
      <linearGradient id={model.ids.glassGradient} x1="0" x2="0.8" y1="0" y2="1">
        <stop offset="0" stopColor="#e7f1f1" />
        <stop offset="0.52" stopColor="#cbdcdd" />
        <stop offset="1" stopColor="#afc1c2" />
      </linearGradient>
      <filter height="150%" id={model.ids.shadow} width="150%" x="-25%" y="-25%">
        <feDropShadow dx="0" dy="7" floodColor="#273233" floodOpacity="0.2" stdDeviation="9" />
      </filter>
      <clipPath id={model.ids.clip}>
        <rect height={height} rx="3" width={width} x={x} y={y} />
      </clipPath>
      <pattern
        height={height}
        id={model.ids.materialPattern}
        patternUnits="userSpaceOnUse"
        width={width}
        x={x}
        y={y}
      >
        <rect fill={materialFill} height={height} width={width} x={x} y={y} />
        {model.assetUrl === null ? null : (
          <image
            height={height}
            href={model.assetUrl}
            onError={onAssetError}
            preserveAspectRatio="xMidYMid slice"
            width={width}
            x={x}
            y={y}
          />
        )}
      </pattern>
    </defs>
  );
}

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
  return (
    <svg
      aria-label={accessibleLabel}
      className="standard-preview-svg"
      data-renderer-version={model.rendererVersion}
      data-scene={model.sceneId}
      data-state-checksum={model.stateChecksum}
      preserveAspectRatio="xMidYMid slice"
      role="img"
      viewBox={model.viewBox}
    >
      <SceneDefinitions model={model} onAssetError={onAssetError} />
      <g transform={transform}>
        {model.sceneId === 'WINDOW_CLOSEUP' ? (
          <CloseupBackground model={model} />
        ) : (
          <RoomBackground model={model} />
        )}
        <g clipPath={`url(#${model.ids.clip})`} data-preview-layer="product">
          {productLayer}
        </g>
        <ProtectedWindowFrame model={model} />
      </g>
    </svg>
  );
}
