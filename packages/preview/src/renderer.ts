import { canonicalPreviewInput } from './domain.js';
import { getPreviewScene } from './scenes.js';
import type {
  PreviewAssetQuality,
  PreviewControls,
  PreviewFamilyCode,
  PreviewFamilyParameters,
  PreviewSceneId,
} from './types.js';

export interface PreviewRenderInput {
  readonly assetQuality: PreviewAssetQuality;
  readonly assetUrl: string | null;
  readonly controls: PreviewControls;
  readonly family: PreviewFamilyCode | null;
  readonly familyParameters: PreviewFamilyParameters;
  readonly hardwareColor: string;
  readonly heightMm: number;
  readonly normalizedColor: string | null;
  readonly rendererVersion: 'standard-svg-v1';
  readonly sceneId: PreviewSceneId;
  readonly stateChecksum: string;
  readonly widthMm: number;
}

export interface PreviewRenderModel extends PreviewRenderInput {
  readonly deterministicKey: string;
  readonly ids: {
    readonly clip: string;
    readonly glassGradient: string;
    readonly materialPattern: string;
    readonly roomGradient: string;
    readonly shadow: string;
  };
  readonly product: {
    readonly height: number;
    readonly width: number;
    readonly x: number;
    readonly y: number;
  };
  readonly scene: ReturnType<typeof getPreviewScene>;
  readonly viewBox: '0 0 1200 780';
}

function boundedAspect(widthMm: number, heightMm: number): number {
  if (
    !Number.isSafeInteger(widthMm) ||
    !Number.isSafeInteger(heightMm) ||
    widthMm <= 0 ||
    heightMm <= 0
  ) {
    throw new TypeError('PREVIEW_DIMENSIONS_INVALID');
  }
  return Math.min(3.2, Math.max(0.3, widthMm / heightMm));
}

function safeRelativeAssetUrl(value: string | null): string | null {
  if (value === null) return null;
  if (!/^\/api\/v1\/previews\/[A-Za-z0-9_-]{32}\/asset$/u.test(value)) {
    throw new TypeError('PREVIEW_ASSET_URL_INVALID');
  }
  return value;
}

export function buildPreviewRenderModel(input: PreviewRenderInput): PreviewRenderModel {
  if (!/^[0-9a-f]{64}$/u.test(input.stateChecksum)) {
    throw new TypeError('PREVIEW_CHECKSUM_INVALID');
  }
  if (!/^#[0-9A-F]{6}$/u.test(input.hardwareColor)) {
    throw new TypeError('PREVIEW_HARDWARE_COLOR_INVALID');
  }
  if (input.normalizedColor !== null && !/^#[0-9A-F]{6}$/u.test(input.normalizedColor)) {
    throw new TypeError('PREVIEW_MATERIAL_COLOR_INVALID');
  }
  const scene = getPreviewScene(input.sceneId);
  const aspect = boundedAspect(input.widthMm, input.heightMm);
  const availableWidth = scene.window.width * 0.88;
  const availableHeight = scene.window.height * 0.9;
  let width = availableWidth;
  let height = width / aspect;
  if (height > availableHeight) {
    height = availableHeight;
    width = height * aspect;
  }
  const x = scene.window.x + (scene.window.width - width) / 2;
  const y = scene.window.y + (scene.window.height - height) / 2;
  const prefix = `preview-${input.stateChecksum.slice(0, 12)}`;
  const normalizedInput: PreviewRenderInput = {
    ...input,
    assetUrl: safeRelativeAssetUrl(input.assetUrl),
  };
  return {
    ...normalizedInput,
    deterministicKey: canonicalPreviewInput(normalizedInput),
    ids: {
      clip: `${prefix}-clip`,
      glassGradient: `${prefix}-glass`,
      materialPattern: `${prefix}-material`,
      roomGradient: `${prefix}-room`,
      shadow: `${prefix}-shadow`,
    },
    product: { height, width, x, y },
    scene,
    viewBox: '0 0 1200 780',
  };
}
