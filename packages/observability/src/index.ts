export {
  createFoundationTelemetryContext,
  currentFoundationTelemetryContext,
  resolveCorrelationId,
  resolveRequestId,
  resolveTraceId,
  runWithFoundationTelemetryContext,
  traceIdFromTraceparent,
  type FoundationTelemetryContext,
  type FoundationTelemetryContextInput,
} from './context.js';
export { classifyFoundationError, type ClassifiedFoundationError } from './errors.js';
export {
  foundationDependencyNames,
  runFoundationReadinessChecks,
  type FoundationDependencyName,
  type FoundationReadinessCheck,
  type FoundationReadinessOptions,
} from './health.js';
export {
  resolveCorrelationId as resolveEdgeCorrelationId,
  resolveRequestId as resolveEdgeRequestId,
  resolveTraceId as resolveEdgeTraceId,
  traceIdFromTraceparent as traceIdFromEdgeTraceparent,
} from './ids.js';
export {
  createFoundationLogger,
  FoundationLogger,
  type FoundationLogInput,
  type FoundationLogOutcome,
  type FoundationLogRecord,
  type FoundationLogSeverity,
  type FoundationLogSink,
  type FoundationLoggerOptions,
} from './logger.js';
export {
  foundationMetricComponents,
  foundationMetrics,
  FoundationMetrics,
  type FoundationMetricComponent,
  type FoundationMetricOutcome,
  type FoundationMetricState,
  type FoundationOperationMetric,
  type FoundationUnknownMetricState,
} from './metrics.js';
export { isSensitiveLogKey, redactUnknown, type RedactionOptions } from './redaction.js';
export {
  initializeNodeTelemetry,
  otlpSignalEndpoint,
  parseOtlpHeaders,
  type NodeTelemetryRuntime,
} from './telemetry.js';
export { runInFoundationSpan } from './tracing.js';
