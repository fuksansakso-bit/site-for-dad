import type { LogLevel, Phase1AProfile } from '@project-name/config';
import { trace } from '@opentelemetry/api';

import { currentFoundationTelemetryContext, resolveCorrelationId } from './context.js';
import { classifyFoundationError } from './errors.js';
import { redactUnknown } from './redaction.js';

const eventNamePattern = /^[a-z][a-z0-9_.-]{2,127}$/;
const safeCodePattern = /^[A-Z][A-Z0-9_]{2,127}$/;
const severityOrder = { debug: 10, error: 40, info: 20, warn: 30 } as const;

export type FoundationLogSeverity = keyof typeof severityOrder;
export type FoundationLogOutcome = 'failure' | 'success' | 'unknown';

export interface FoundationLogInput {
  readonly attempt?: number;
  readonly causationId?: string;
  readonly component?: string;
  readonly correlationId?: string;
  readonly durationMs?: number;
  readonly error?: unknown;
  readonly errorCode?: string;
  readonly event: string;
  readonly jobTemplate?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly outcome?: FoundationLogOutcome;
  readonly requestId?: string;
  readonly retryable?: boolean;
  readonly routeTemplate?: string;
  readonly severity: FoundationLogSeverity;
}

export interface FoundationLogRecord {
  readonly attempt?: number;
  readonly buildId: string;
  readonly causationId?: string;
  readonly component?: string;
  readonly correlationId: string;
  readonly durationMs?: number;
  readonly environment: Phase1AProfile;
  readonly errorClass?: string;
  readonly errorCode?: string;
  readonly event: string;
  readonly jobTemplate?: string;
  readonly metadata?: unknown;
  readonly outcome?: FoundationLogOutcome;
  readonly requestId?: string;
  readonly retryable?: boolean;
  readonly routeTemplate?: string;
  readonly schemaVersion: 1;
  readonly service: string;
  readonly severity: FoundationLogSeverity;
  readonly spanId?: string;
  readonly timestamp: string;
  readonly traceId: string;
}

export type FoundationLogSink = (record: FoundationLogRecord) => void;

export interface FoundationLoggerOptions {
  readonly buildId: string;
  readonly environment: Phase1AProfile;
  readonly minimumSeverity: LogLevel;
  readonly service: string;
  readonly sink?: FoundationLogSink;
}

function safeTemplate(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  return /^[A-Za-z0-9_./:{}-]{1,160}$/.test(value) ? value : undefined;
}

function defaultSink(record: FoundationLogRecord): void {
  const stream = record.severity === 'error' ? process.stderr : process.stdout;
  stream.write(`${JSON.stringify(record)}\n`);
}

export class FoundationLogger {
  readonly #options: FoundationLoggerOptions;
  readonly #processCorrelationId = resolveCorrelationId();
  readonly #sink: FoundationLogSink;

  constructor(options: FoundationLoggerOptions) {
    if (!eventNamePattern.test(`service.${options.service}`)) {
      throw new TypeError('Telemetry service name is invalid.');
    }
    this.#options = options;
    this.#sink = options.sink ?? defaultSink;
  }

  log(input: FoundationLogInput): FoundationLogRecord | undefined {
    if (severityOrder[input.severity] < severityOrder[this.#options.minimumSeverity]) {
      return undefined;
    }
    if (!eventNamePattern.test(input.event)) {
      throw new TypeError('Telemetry event name is invalid.');
    }
    if (input.errorCode !== undefined && !safeCodePattern.test(input.errorCode)) {
      throw new TypeError('Telemetry error code is invalid.');
    }
    if (
      input.durationMs !== undefined &&
      (!Number.isFinite(input.durationMs) || input.durationMs < 0)
    ) {
      throw new TypeError('Telemetry duration is invalid.');
    }
    if (
      input.attempt !== undefined &&
      (!Number.isSafeInteger(input.attempt) || input.attempt < 0)
    ) {
      throw new TypeError('Telemetry attempt is invalid.');
    }

    const storedContext = currentFoundationTelemetryContext();
    const activeSpan = trace.getActiveSpan()?.spanContext();
    const classified = input.error === undefined ? undefined : classifyFoundationError(input.error);
    const routeTemplate = safeTemplate(input.routeTemplate);
    const jobTemplate = safeTemplate(input.jobTemplate);
    const metadata = input.metadata === undefined ? undefined : redactUnknown(input.metadata);
    const causationId = input.causationId ?? storedContext?.causationId;
    const errorCode = input.errorCode ?? classified?.code;
    const requestId = input.requestId ?? storedContext?.requestId;
    const retryable = input.retryable ?? classified?.retryable;
    const record: FoundationLogRecord = {
      ...(input.attempt === undefined ? {} : { attempt: input.attempt }),
      buildId: this.#options.buildId,
      ...(causationId === undefined ? {} : { causationId }),
      ...(input.component === undefined ? {} : { component: input.component }),
      correlationId:
        input.correlationId ?? storedContext?.correlationId ?? this.#processCorrelationId,
      ...(input.durationMs === undefined ? {} : { durationMs: input.durationMs }),
      environment: this.#options.environment,
      ...(classified === undefined ? {} : { errorClass: classified.errorClass }),
      ...(errorCode === undefined ? {} : { errorCode }),
      event: input.event,
      ...(jobTemplate === undefined ? {} : { jobTemplate }),
      ...(metadata === undefined ? {} : { metadata }),
      ...(input.outcome === undefined ? {} : { outcome: input.outcome }),
      ...(requestId === undefined ? {} : { requestId }),
      ...(retryable === undefined ? {} : { retryable }),
      ...(routeTemplate === undefined ? {} : { routeTemplate }),
      schemaVersion: 1,
      service: this.#options.service,
      severity: input.severity,
      ...(activeSpan?.spanId === undefined ? {} : { spanId: activeSpan.spanId }),
      timestamp: new Date().toISOString(),
      traceId: activeSpan?.traceId ?? storedContext?.traceId ?? '00000000000000000000000000000000',
    };
    this.#sink(record);
    return record;
  }
}

export function createFoundationLogger(options: FoundationLoggerOptions): FoundationLogger {
  return new FoundationLogger(options);
}
