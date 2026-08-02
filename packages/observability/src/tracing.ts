import { SpanStatusCode, trace, type Attributes } from '@opentelemetry/api';

import { currentFoundationTelemetryContext } from './context.js';

const spanNamePattern = /^[a-z][a-z0-9_.-]{2,127}$/;

export async function runInFoundationSpan<T>(
  spanName: string,
  attributes: Attributes,
  callback: () => Promise<T>,
): Promise<T> {
  if (!spanNamePattern.test(spanName)) {
    throw new TypeError('Telemetry span name is invalid.');
  }
  const telemetryContext = currentFoundationTelemetryContext();
  return trace.getTracer('project-name.foundation', '1').startActiveSpan(
    spanName,
    {
      attributes: {
        ...attributes,
        ...(telemetryContext === undefined
          ? {}
          : {
              'foundation.correlation_id': telemetryContext.correlationId,
              ...(telemetryContext.requestId === undefined
                ? {}
                : { 'foundation.request_id': telemetryContext.requestId }),
            }),
      },
    },
    async (span) => {
      try {
        const result = await callback();
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setAttribute(
          'error.type',
          error instanceof Error && /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/.test(error.name)
            ? error.name
            : 'UnknownError',
        );
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'operation failed' });
        throw error;
      } finally {
        span.end();
      }
    },
  );
}
