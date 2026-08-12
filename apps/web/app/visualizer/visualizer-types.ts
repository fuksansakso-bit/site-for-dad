import type { AiVisualizationErrorCode, AiVisualizationStatus } from '../../lib/ai-visualization/types';

export type VisualizerMaterial = {
  article: string;
  availability: string;
  categoryName: string;
  color: string | null;
  imageUrl: string;
  name: string;
  slug: string;
};

export type VisualizerInitialJob = {
  attemptNumber: number;
  errorCode: AiVisualizationErrorCode | null;
  errorMessage: string | null;
  expiresAt: string;
  publicReference: string;
  resultAvailable: boolean;
  status: AiVisualizationStatus;
};

