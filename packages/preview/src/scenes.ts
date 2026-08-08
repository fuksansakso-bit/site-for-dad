import type { PreviewSceneDefinition, PreviewSceneId } from './types.js';

export const previewScenes: readonly PreviewSceneDefinition[] = [
  {
    description: 'Крупный план светлого окна с защищённой рамой, ручкой и подоконником.',
    id: 'WINDOW_CLOSEUP',
    label: 'Окно крупным планом',
    version: 1,
    window: { height: 552, width: 560, x: 320, y: 98 },
  },
  {
    description: 'Оригинальная светлая комната с диваном, торшером и окном в глубине.',
    id: 'ROOM_WINDOW',
    label: 'Комната с окном',
    version: 1,
    window: { height: 382, width: 292, x: 706, y: 116 },
  },
] as const;

export function getPreviewScene(id: PreviewSceneId): PreviewSceneDefinition {
  const scene = previewScenes.find((item) => item.id === id);
  if (scene === undefined) throw new TypeError('PREVIEW_SCENE_UNKNOWN');
  return scene;
}
