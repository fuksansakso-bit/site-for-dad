import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';

import { createSafeErrorResponse, foundationErrorDefinitions } from '@project-name/contracts/error';
import {
  correlationIdSchema,
  type DependencyHealth,
  livenessResponseSchema,
  readinessResponseSchema,
} from '@project-name/contracts/health';
import {
  createFoundationTelemetryContext,
  resolveRequestId,
  runWithFoundationTelemetryContext,
  traceIdFromTraceparent,
} from '@project-name/observability/context';
import type { FoundationLogger } from '@project-name/observability/logger';
import type { FoundationMetrics } from '@project-name/observability/metrics';
import { runInFoundationSpan } from '@project-name/observability/tracing';

export interface WorkerHealthTelemetry {
  readonly logger: FoundationLogger;
  readonly metrics: FoundationMetrics;
}

export interface WorkerHealthOptions {
  readonly checkReadiness: () => Promise<Readonly<Record<string, DependencyHealth>>>;
  readonly telemetry?: WorkerHealthTelemetry;
}

function correlationId(candidate: string | undefined): string {
  const parsed = correlationIdSchema.safeParse(candidate);
  return parsed.success ? parsed.data : randomUUID();
}

export function createWorkerHealthServer(options: WorkerHealthOptions): Server {
  return createServer((request, response) => {
    const requestCorrelationId = correlationId(
      Array.isArray(request.headers['x-correlation-id'])
        ? request.headers['x-correlation-id'][0]
        : request.headers['x-correlation-id'],
    );
    const requestId = resolveRequestId(
      Array.isArray(request.headers['x-request-id'])
        ? request.headers['x-request-id'][0]
        : request.headers['x-request-id'],
    );
    const traceparent = Array.isArray(request.headers['traceparent'])
      ? request.headers['traceparent'][0]
      : request.headers['traceparent'];
    const traceId = traceIdFromTraceparent(traceparent);
    const telemetryContext = createFoundationTelemetryContext({
      correlationId: requestCorrelationId,
      requestId,
      ...(traceId === undefined ? {} : { traceId }),
    });
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Correlation-ID', requestCorrelationId);
    response.setHeader('X-Request-ID', requestId);

    const observe = async (
      route: '/health/live' | '/health/ready',
      operation: () => Promise<'failure' | 'success'>,
    ): Promise<void> => {
      const startedAt = performance.now();
      let outcome: 'failure' | 'success' = 'failure';
      try {
        outcome = await runWithFoundationTelemetryContext(telemetryContext, () =>
          runInFoundationSpan(
            route === '/health/live' ? 'http.worker_health_live' : 'http.worker_health_ready',
            { 'http.request.method': 'GET', 'http.route': route },
            operation,
          ),
        );
      } finally {
        const durationMs = performance.now() - startedAt;
        options.telemetry?.metrics.record({
          component: 'http',
          durationMs,
          operation:
            route === '/health/live' ? 'http.worker_health_live' : 'http.worker_health_ready',
          outcome,
        });
        options.telemetry?.logger.log({
          durationMs,
          ...(outcome === 'failure'
            ? { errorCode: 'DEPENDENCY_UNAVAILABLE', retryable: true }
            : {}),
          event:
            route === '/health/live'
              ? 'http.worker.health.live.completed'
              : 'http.worker.health.ready.completed',
          outcome,
          routeTemplate: route,
          severity: outcome === 'success' ? 'info' : 'warn',
        });
      }
    };

    if (request.method === 'GET' && request.url === '/health/live') {
      void observe('/health/live', async () => {
        response.statusCode = 200;
        response.end(
          JSON.stringify(
            livenessResponseSchema.parse({ correlationId: requestCorrelationId, status: 'ok' }),
          ),
        );
        return 'success';
      }).catch(() => {
        if (!response.headersSent) {
          response.statusCode = 500;
          response.end(
            JSON.stringify(createSafeErrorResponse('INTERNAL_ERROR', requestCorrelationId)),
          );
        }
      });
      return;
    }

    if (request.method === 'GET' && request.url === '/health/ready') {
      void observe('/health/ready', async () => {
        try {
          const checks = await options.checkReadiness();
          const isReady = !Object.values(checks).includes('unavailable');
          response.statusCode = isReady ? 200 : 503;
          response.end(
            JSON.stringify(
              readinessResponseSchema.parse({
                checks,
                correlationId: requestCorrelationId,
                status: isReady ? 'ok' : 'unavailable',
              }),
            ),
          );
          return isReady ? 'success' : 'failure';
        } catch {
          response.statusCode = 503;
          response.end(
            JSON.stringify(
              readinessResponseSchema.parse({
                checks: { database: 'unavailable', queue: 'unavailable', worker: 'unavailable' },
                correlationId: requestCorrelationId,
                status: 'unavailable',
              }),
            ),
          );
          return 'failure';
        }
      }).catch(() => {
        if (!response.headersSent) {
          response.statusCode = 503;
          response.end(
            JSON.stringify(
              readinessResponseSchema.parse({
                checks: { database: 'unavailable', queue: 'unavailable', worker: 'unavailable' },
                correlationId: requestCorrelationId,
                status: 'unavailable',
              }),
            ),
          );
        }
      });
      return;
    }

    response.statusCode = foundationErrorDefinitions.NOT_FOUND.httpStatus;
    response.end(JSON.stringify(createSafeErrorResponse('NOT_FOUND', requestCorrelationId)));
  });
}
