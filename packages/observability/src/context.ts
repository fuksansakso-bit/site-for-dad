import { AsyncLocalStorage } from 'node:async_hooks';

import { resolveCorrelationId, resolveTraceId, safeTelemetryId } from './ids.js';

export interface FoundationTelemetryContext {
  readonly causationId?: string;
  readonly correlationId: string;
  readonly requestId?: string;
  readonly traceId: string;
}

export interface FoundationTelemetryContextInput {
  readonly causationId?: string | null;
  readonly correlationId?: string | null;
  readonly requestId?: string | null;
  readonly traceId?: string | null;
}

const contextStorage = new AsyncLocalStorage<FoundationTelemetryContext>();

export function createFoundationTelemetryContext(
  input: FoundationTelemetryContextInput = {},
): FoundationTelemetryContext {
  const causationId = safeTelemetryId(input.causationId);
  const requestId = safeTelemetryId(input.requestId);
  return {
    ...(causationId === undefined ? {} : { causationId }),
    correlationId: resolveCorrelationId(input.correlationId),
    ...(requestId === undefined ? {} : { requestId }),
    traceId: resolveTraceId(input.traceId),
  };
}

export {
  resolveCorrelationId,
  resolveRequestId,
  resolveTraceId,
  traceIdFromTraceparent,
} from './ids.js';

export function currentFoundationTelemetryContext(): FoundationTelemetryContext | undefined {
  return contextStorage.getStore();
}

export function runWithFoundationTelemetryContext<T>(
  telemetryContext: FoundationTelemetryContext,
  callback: () => T,
): T {
  return contextStorage.run(telemetryContext, callback);
}
