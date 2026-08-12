import { AiVisualizationError } from './errors';
import { normalizePolzaProviderError, type PolzaProviderError } from './polza-provider';
import type { AiVisualizationErrorCode } from './types';

export type NormalizedProviderFailure = {
  clientCode: AiVisualizationErrorCode;
  providerCode: PolzaProviderError['code'];
  rejected: boolean;
  retryableStatusPoll: boolean;
  safeDiagnostic: string;
};

export function normalizedProviderFailure(error: unknown): NormalizedProviderFailure {
  if (error instanceof AiVisualizationError) {
    return {
      clientCode: error.code === 'AI_DISABLED' ? 'PROVIDER_UNAVAILABLE' : error.code,
      providerCode: 'POLZA_PROVIDER_ERROR',
      rejected: false,
      retryableStatusPoll: error.retryable,
      safeDiagnostic: error.code,
    };
  }
  const provider = normalizePolzaProviderError(error);
  if (provider.code === 'POLZA_RATE_LIMITED') {
    return {
      clientCode: 'PROVIDER_RATE_LIMITED',
      providerCode: provider.code,
      rejected: false,
      retryableStatusPoll: true,
      safeDiagnostic: provider.safeDiagnostic,
    };
  }
  if (provider.code === 'POLZA_INVALID_REQUEST') {
    return {
      clientCode: 'PROVIDER_REJECTED',
      providerCode: provider.code,
      rejected: true,
      retryableStatusPoll: false,
      safeDiagnostic: provider.safeDiagnostic,
    };
  }
  if (provider.code === 'POLZA_OUTPUT_INVALID') {
    return {
      clientCode: 'OUTPUT_INVALID',
      providerCode: provider.code,
      rejected: false,
      retryableStatusPoll: false,
      safeDiagnostic: provider.safeDiagnostic,
    };
  }
  return {
    clientCode: 'PROVIDER_UNAVAILABLE',
    providerCode: provider.code,
    rejected: false,
    retryableStatusPoll:
      provider.code === 'POLZA_PROVIDER_ERROR' || provider.code === 'POLZA_TIMEOUT',
    safeDiagnostic: provider.safeDiagnostic,
  };
}
