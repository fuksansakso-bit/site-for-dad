import { parseObservabilityEnvironment } from '@project-name/config/server';
import { createFoundationLogger, type FoundationLogger } from '@project-name/observability/logger';
import { foundationMetrics, type FoundationMetrics } from '@project-name/observability/metrics';
import {
  initializeNodeTelemetry,
  type NodeTelemetryRuntime,
} from '@project-name/observability/telemetry';

export interface WebObservability {
  readonly logger: FoundationLogger;
  readonly metrics: FoundationMetrics;
  readonly runtime: NodeTelemetryRuntime;
}

let webObservability: WebObservability | undefined;

export function initializeWebObservability(): WebObservability {
  if (webObservability !== undefined) return webObservability;
  const environment = parseObservabilityEnvironment(process.env);
  webObservability = {
    logger: createFoundationLogger({
      buildId: environment.BUILD_ID,
      environment: environment.APP_ENV,
      minimumSeverity: environment.LOG_LEVEL,
      service: 'web',
    }),
    metrics: foundationMetrics,
    runtime: initializeNodeTelemetry(environment, 'project-name-web'),
  };
  return webObservability;
}

export function getWebObservability(): WebObservability {
  return webObservability ?? initializeWebObservability();
}
