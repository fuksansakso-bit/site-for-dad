import 'server-only';

import type { SupportedAspectRatio, SupportedImageMime } from './types';

export type ProviderSourceImage = {
  mimeType: SupportedImageMime;
  signedUrl: string;
};

export type CreateProviderJobInput = {
  aspectRatio: SupportedAspectRatio;
  images: readonly [ProviderSourceImage, ProviderSourceImage];
  modelName: string;
  prompt: string;
};

export type CreatedProviderJob = {
  modelName: string;
  providerJobId: string;
  providerRequestId: string | null;
  providerStatus: string;
};

export type ProviderJobState = 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'REJECTED';

export type ProviderJobStatus = {
  modelName: string;
  providerJobId: string;
  providerRequestId: string | null;
  providerStatus: string;
  resultUrl: string | null;
  state: ProviderJobState;
};

export type ProviderImageResult =
  | { kind: 'url'; url: string }
  | { bytes: Uint8Array; kind: 'bytes'; mimeType: SupportedImageMime };

export type ProviderHealth = {
  configured: boolean;
  modelName: string;
  provider: 'Polza AI' | 'Mock';
};

export interface ImageVisualizationProvider {
  createJob(input: CreateProviderJobInput): Promise<CreatedProviderJob>;
  getJobStatus(providerJobId: string): Promise<ProviderJobStatus>;
  getResult(status: ProviderJobStatus): Promise<ProviderImageResult>;
  healthCheck(): Promise<ProviderHealth>;
}

