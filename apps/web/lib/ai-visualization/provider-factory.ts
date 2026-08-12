import 'server-only';

import type { AiVisualizerServerConfig } from './config';
import { AiVisualizationError } from './errors';
import { MockImageVisualizationProvider } from './mock-provider';
import { PolzaImageVisualizationProvider } from './polza-provider';
import type { ImageVisualizationProvider } from './provider';

export function createImageVisualizationProvider(
  config: AiVisualizerServerConfig,
): ImageVisualizationProvider {
  if (config.mockProviderEnabled) {
    if (process.env['NODE_ENV'] === 'production') {
      throw new AiVisualizationError('AI_DISABLED');
    }
    return new MockImageVisualizationProvider(config.modelName);
  }
  if (!config.polzaApiKey) throw new AiVisualizationError('AI_DISABLED');
  return new PolzaImageVisualizationProvider({
    apiKey: config.polzaApiKey,
    baseUrl: config.polzaBaseUrl,
    modelName: config.modelName,
  });
}

