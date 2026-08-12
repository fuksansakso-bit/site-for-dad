import type { PreviewSceneDefinition, PreviewSceneId } from './types.js';

export const previewScenes: readonly PreviewSceneDefinition[] = [
  {
    backgroundAssetId: 'SCENE_BEDROOM',
    camera: { height: 600, width: 960, x: 275, y: 44 },
    description: 'Крупный план настоящего двухстворчатого окна в светлой спальне.',
    id: 'WINDOW_CLOSEUP',
    label: 'Окно крупным планом',
    version: 2,
    window: { height: 650, width: 300, x: 405, y: 88 },
  },
  {
    backgroundAssetId: 'SCENE_KITCHEN',
    camera: { height: 937, width: 1500, x: 0, y: 0 },
    description: 'Тёмная современная кухня с настоящим двухстворчатым окном.',
    id: 'ROOM_WINDOW',
    label: 'Комната с окном',
    version: 2,
    window: { height: 650, width: 300, x: 405, y: 88 },
  },
] as const;

export function getPreviewScene(id: PreviewSceneId): PreviewSceneDefinition {
  const scene = previewScenes.find((item) => item.id === id);
  if (scene === undefined) throw new TypeError('PREVIEW_SCENE_UNKNOWN');
  return scene;
}
