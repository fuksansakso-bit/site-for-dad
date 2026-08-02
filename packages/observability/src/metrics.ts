import { metrics } from '@opentelemetry/api';

export const foundationMetricComponents = [
  'database',
  'http',
  'identity',
  'queue',
  'storage',
  'worker',
] as const;
export type FoundationMetricComponent = (typeof foundationMetricComponents)[number];
export type FoundationMetricOutcome = 'failure' | 'success';

export interface FoundationOperationMetric {
  readonly component: FoundationMetricComponent;
  readonly durationMs: number;
  readonly operation: string;
  readonly outcome: FoundationMetricOutcome;
}

export interface FoundationMetricState {
  readonly count: number;
  readonly errorCount: number;
  readonly lastObservedAt: string;
  readonly maximumDurationMs: number;
  readonly status: 'observed';
  readonly totalDurationMs: number;
}

export interface FoundationUnknownMetricState {
  readonly status: 'unknown';
}

const operationPattern = /^[a-z][a-z0-9_.-]{2,95}$/;

export class FoundationMetrics {
  readonly #duration = metrics
    .getMeter('project-name.foundation', '1')
    .createHistogram('foundation.operation.duration', { unit: 'ms' });
  readonly #errors = metrics
    .getMeter('project-name.foundation', '1')
    .createCounter('foundation.operation.errors');
  readonly #operations = metrics
    .getMeter('project-name.foundation', '1')
    .createCounter('foundation.operation.count');
  readonly #states = new Map<string, FoundationMetricState>();

  record(input: FoundationOperationMetric): void {
    if (!foundationMetricComponents.includes(input.component)) {
      throw new TypeError('Metric component is invalid.');
    }
    if (!operationPattern.test(input.operation)) {
      throw new TypeError('Metric operation is invalid.');
    }
    if (!Number.isFinite(input.durationMs) || input.durationMs < 0) {
      throw new TypeError('Metric duration is invalid.');
    }
    const attributes = {
      component: input.component,
      operation: input.operation,
      outcome: input.outcome,
    } as const;
    this.#operations.add(1, attributes);
    this.#duration.record(input.durationMs, attributes);
    if (input.outcome === 'failure') this.#errors.add(1, attributes);

    const key = `${input.component}:${input.operation}`;
    const current = this.#states.get(key);
    this.#states.set(key, {
      count: (current?.count ?? 0) + 1,
      errorCount: (current?.errorCount ?? 0) + (input.outcome === 'failure' ? 1 : 0),
      lastObservedAt: new Date().toISOString(),
      maximumDurationMs: Math.max(current?.maximumDurationMs ?? 0, input.durationMs),
      status: 'observed',
      totalDurationMs: (current?.totalDurationMs ?? 0) + input.durationMs,
    });
  }

  read(
    component: FoundationMetricComponent,
    operation: string,
  ): FoundationMetricState | FoundationUnknownMetricState {
    return this.#states.get(`${component}:${operation}`) ?? { status: 'unknown' };
  }
}

export const foundationMetrics = new FoundationMetrics();
