import {
  createFoundationTelemetryContext,
  resolveRequestId,
  runWithFoundationTelemetryContext,
  traceIdFromTraceparent,
} from '@project-name/observability/context';
import type { FoundationLogger } from '@project-name/observability/logger';
import type { FoundationMetrics } from '@project-name/observability/metrics';
import { runInFoundationSpan } from '@project-name/observability/tracing';
import type { NextRequest } from 'next/server';

export interface WebHealthTelemetry {
  readonly logger: FoundationLogger;
  readonly metrics: FoundationMetrics;
}

export function requestTelemetryContext(request: NextRequest) {
  const traceId = traceIdFromTraceparent(request.headers.get('traceparent'));
  return createFoundationTelemetryContext({
    causationId: request.headers.get('x-causation-id'),
    correlationId: request.headers.get('x-correlation-id'),
    requestId: resolveRequestId(request.headers.get('x-request-id')),
    ...(traceId === undefined ? {} : { traceId }),
  });
}

export async function observeHealthRequest<T>(
  request: NextRequest,
  routeTemplate: '/api/v1/health/live' | '/api/v1/health/ready',
  telemetry: WebHealthTelemetry,
  callback: () => Promise<{ readonly outcome: 'failure' | 'success'; readonly value: T }>,
): Promise<{ readonly context: ReturnType<typeof requestTelemetryContext>; readonly value: T }> {
  const context = requestTelemetryContext(request);
  return runWithFoundationTelemetryContext(context, async () => {
    const startedAt = performance.now();
    let outcome: 'failure' | 'success' = 'failure';
    try {
      const observed = await runInFoundationSpan(
        `http.${routeTemplate.endsWith('live') ? 'health_live' : 'health_ready'}`,
        { 'http.request.method': 'GET', 'http.route': routeTemplate },
        callback,
      );
      outcome = observed.outcome;
      return { context, value: observed.value };
    } finally {
      const durationMs = performance.now() - startedAt;
      telemetry.metrics.record({
        component: 'http',
        durationMs,
        operation: routeTemplate.endsWith('live') ? 'http.health_live' : 'http.health_ready',
        outcome,
      });
      telemetry.logger.log({
        durationMs,
        ...(outcome === 'failure' ? { errorCode: 'DEPENDENCY_UNAVAILABLE', retryable: true } : {}),
        event: routeTemplate.endsWith('live')
          ? 'http.health.live.completed'
          : 'http.health.ready.completed',
        outcome,
        routeTemplate,
        severity: outcome === 'success' ? 'info' : 'warn',
      });
    }
  });
}
