import type { AiVisualizationStatus } from './types';

const ALLOWED_TRANSITIONS: Record<AiVisualizationStatus, readonly AiVisualizationStatus[]> = {
  CREATED: ['UPLOAD_PENDING', 'DELETED', 'EXPIRED'],
  UPLOAD_PENDING: ['READY', 'FAILED', 'DELETED', 'EXPIRED'],
  READY: ['PROCESSING', 'DELETED', 'EXPIRED'],
  PROCESSING: ['SUCCEEDED', 'FAILED', 'REJECTED'],
  SUCCEEDED: ['DELETED', 'EXPIRED'],
  FAILED: ['PROCESSING', 'DELETED', 'EXPIRED'],
  REJECTED: ['PROCESSING', 'DELETED', 'EXPIRED'],
  EXPIRED: [],
  DELETED: [],
};

export function canTransitionAiVisualization(
  from: AiVisualizationStatus,
  to: AiVisualizationStatus,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

