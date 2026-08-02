import type { JobHelpers, TaskList } from 'graphile-worker';

import {
  foundationProbePayloadSchema,
  foundationProbeTaskIdentifier,
  type FoundationProbePayload,
} from './contracts.js';
import { FoundationJobError, toFoundationJobError } from './errors.js';
import {
  completeIdempotentExecution,
  failIdempotentExecution,
  prepareIdempotentExecution,
} from './idempotency.js';
import { abortableDelay, runWithJobTimeout } from './timeout.js';

export interface FoundationTaskLifecycleEvent {
  readonly attempt: number;
  readonly correlationId: string;
  readonly event: 'deduplicated' | 'failed' | 'started' | 'succeeded';
  readonly errorCode?: string;
}

export type FoundationTaskLifecycleSink = (event: FoundationTaskLifecycleEvent) => void;

async function executeSyntheticProbe(
  payload: FoundationProbePayload,
  helpers: JobHelpers,
  timeoutMilliseconds: number,
): Promise<void> {
  await runWithJobTimeout(timeoutMilliseconds, helpers.abortSignal, async (signal) => {
    if (payload.mode === 'ALWAYS_FAIL') {
      throw new FoundationJobError('FOUNDATION_JOB_FORCED_FAILURE');
    }
    if (payload.mode === 'FAIL_ONCE' && helpers.job.attempts === 1) {
      throw new FoundationJobError('FOUNDATION_JOB_FORCED_FAILURE');
    }
    const delay =
      payload.mode === 'TIMEOUT_ONCE' && helpers.job.attempts === 1
        ? timeoutMilliseconds * 2
        : payload.delayMilliseconds;
    await abortableDelay(delay, signal);
  });
}

export function createFoundationTaskList(
  timeoutMilliseconds: number,
  lifecycle: FoundationTaskLifecycleSink = () => undefined,
): TaskList {
  return {
    [foundationProbeTaskIdentifier]: async (candidatePayload, helpers) => {
      const parsed = foundationProbePayloadSchema.safeParse(candidatePayload);
      if (!parsed.success) {
        throw new FoundationJobError('FOUNDATION_JOB_VALIDATION');
      }
      const payload = parsed.data;
      lifecycle({
        attempt: helpers.job.attempts,
        correlationId: payload.correlationId,
        event: 'started',
      });
      try {
        const preparation = await prepareIdempotentExecution(payload, helpers, timeoutMilliseconds);
        if (preparation === 'already-completed') {
          lifecycle({
            attempt: helpers.job.attempts,
            correlationId: payload.correlationId,
            event: 'deduplicated',
          });
          return;
        }
        await executeSyntheticProbe(payload, helpers, timeoutMilliseconds);
        await completeIdempotentExecution(payload, helpers);
        lifecycle({
          attempt: helpers.job.attempts,
          correlationId: payload.correlationId,
          event: 'succeeded',
        });
      } catch (error) {
        const jobError = toFoundationJobError(error);
        if (helpers.job.attempts >= helpers.job.max_attempts) {
          await failIdempotentExecution(payload, helpers, jobError.code);
        }
        lifecycle({
          attempt: helpers.job.attempts,
          correlationId: payload.correlationId,
          errorCode: jobError.code,
          event: 'failed',
        });
        throw jobError;
      }
    },
  };
}
