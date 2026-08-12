import { describe, expect, it } from 'vitest';

import {
  createFoundationTelemetryContext,
  runWithFoundationTelemetryContext,
} from '../src/context.js';
import { createFoundationLogger, type FoundationLogRecord } from '../src/logger.js';

describe('structured logger', () => {
  it('emits the allowlisted schema with context and redacted metadata', () => {
    const records: FoundationLogRecord[] = [];
    const logger = createFoundationLogger({
      buildId: 'test-build',
      environment: 'test',
      minimumSeverity: 'debug',
      service: 'web',
      sink: (record) => records.push(record),
    });
    const context = createFoundationTelemetryContext({
      correlationId: 'correlation-test-1234',
      requestId: 'request-test-1234',
    });

    runWithFoundationTelemetryContext(context, () =>
      logger.log({
        event: 'http.health.completed',
        metadata: {
          authorization: ['Bearer', 'synthetic-credential'].join(' '),
          routeState: 'ready',
        },
        outcome: 'success',
        routeTemplate: '/api/v1/health/ready',
        severity: 'info',
      }),
    );

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      buildId: 'test-build',
      correlationId: 'correlation-test-1234',
      environment: 'test',
      event: 'http.health.completed',
      requestId: 'request-test-1234',
      schemaVersion: 1,
      service: 'web',
    });
    expect(JSON.stringify(records[0])).not.toContain('synthetic-credential');
  });

  it('classifies errors without logging messages or stack traces', () => {
    const records: FoundationLogRecord[] = [];
    const logger = createFoundationLogger({
      buildId: 'test-build',
      environment: 'test',
      minimumSeverity: 'info',
      service: 'worker',
      sink: (record) => records.push(record),
    });

    logger.log({
      error: Object.assign(new Error('private database path'), {
        code: 'FOUNDATION_JOB_DEPENDENCY_UNAVAILABLE',
      }),
      event: 'worker.start.failed',
      outcome: 'failure',
      severity: 'error',
    });

    expect(records[0]).toMatchObject({
      errorClass: 'Error',
      errorCode: 'DEPENDENCY_UNAVAILABLE',
      retryable: true,
    });
    expect(JSON.stringify(records[0])).not.toMatch(/private database path|stack/i);
  });
});
