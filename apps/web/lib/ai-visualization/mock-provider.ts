import 'server-only';

import { randomUUID } from 'node:crypto';

import type {
  CreatedProviderJob,
  CreateProviderJobInput,
  ImageVisualizationProvider,
  ProviderHealth,
  ProviderImageResult,
  ProviderJobStatus,
} from './provider';

export class MockImageVisualizationProvider implements ImageVisualizationProvider {
  readonly #modelName: string;

  constructor(modelName = 'mock/window-blinds') {
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error('MOCK_PROVIDER_FORBIDDEN_IN_PRODUCTION');
    }
    this.#modelName = modelName;
  }

  async createJob(input: CreateProviderJobInput): Promise<CreatedProviderJob> {
    return {
      modelName: this.#modelName,
      providerJobId: `mock_${input.aspectRatio.replace(':', 'x')}_${randomUUID().replaceAll('-', '')}`,
      providerRequestId: 'mock_request',
      providerStatus: 'processing',
    };
  }

  async getJobStatus(providerJobId: string): Promise<ProviderJobStatus> {
    return {
      modelName: this.#modelName,
      providerJobId,
      providerRequestId: 'mock_status_request',
      providerStatus: 'completed',
      resultUrl: null,
      state: 'SUCCEEDED',
    };
  }

  async getResult(status: ProviderJobStatus): Promise<ProviderImageResult> {
    if (status.state !== 'SUCCEEDED') throw new Error('MOCK_RESULT_NOT_READY');
    const ratio = status.providerJobId.includes('_9x16_')
      ? 9 / 16
      : status.providerJobId.includes('_16x9_')
        ? 16 / 9
        : 1;
    const width = ratio >= 1 ? Math.round(320 * ratio) : 320;
    const height = ratio >= 1 ? 320 : Math.round(320 / ratio);
    // @ts-expect-error sharp 0.35.0 ships declarations but omits the `types` export condition.
    const { default: sharp } = await import('sharp');
    const bytes = await sharp({
      create: {
        background: { alpha: 1, b: 226, g: 218, r: 205 },
        channels: 3,
        height,
        width,
      },
    })
      .jpeg({ quality: 70 })
      .toBuffer();
    return { bytes, kind: 'bytes', mimeType: 'image/jpeg' };
  }

  async healthCheck(): Promise<ProviderHealth> {
    return { configured: true, modelName: this.#modelName, provider: 'Mock' };
  }
}
