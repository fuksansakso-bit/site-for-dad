import 'server-only';

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

  async createJob(_input: CreateProviderJobInput): Promise<CreatedProviderJob> {
    return {
      modelName: this.#modelName,
      providerJobId: 'mock_visualization_job',
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
    // @ts-expect-error sharp 0.35.0 ships declarations but omits the `types` export condition.
    const { default: sharp } = await import('sharp');
    const bytes = await sharp({
      create: {
        background: { alpha: 1, b: 226, g: 218, r: 205 },
        channels: 3,
        height: 320,
        width: 320,
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

