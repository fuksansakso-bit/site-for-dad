import {
  createFoundationLogger,
  type FoundationLogRecord,
} from '@project-name/observability/logger';
import { describe, expect, it } from 'vitest';

import { createWorkerEventSink } from '../src/runtime.js';

describe('worker structured event sink', () => {
  it('maps lifecycle events into the common redacted log schema', () => {
    const records: FoundationLogRecord[] = [];
    const logger = createFoundationLogger({
      buildId: 'test-build',
      environment: 'test',
      minimumSeverity: 'debug',
      service: 'worker',
      sink: (record) => records.push(record),
    });
    const sink = createWorkerEventSink(logger);

    sink({
      attempt: 2,
      correlationId: 'correlation-worker-log-1234',
      errorCode: 'FOUNDATION_JOB_FORCED_FAILURE',
      event: 'worker.job.failed',
      level: 'error',
      providerPayload: 'private provider output',
      service: 'worker',
      taskIdentifier: 'foundation_probe_v1',
    });

    expect(records[0]).toMatchObject({
      attempt: 2,
      correlationId: 'correlation-worker-log-1234',
      errorCode: 'FOUNDATION_JOB_FORCED_FAILURE',
      event: 'worker.job.failed',
      jobTemplate: 'foundation_probe_v1',
      outcome: 'failure',
      schemaVersion: 1,
    });
    expect(JSON.stringify(records[0])).not.toContain('private provider output');
  });
});
