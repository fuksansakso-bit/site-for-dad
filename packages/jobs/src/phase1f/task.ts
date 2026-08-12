import type { JobHelpers, TaskList } from 'graphile-worker';

import { FoundationJobError } from '../errors.js';
import { runWithJobTimeout } from '../timeout.js';
import {
  cleanupIdentityPayloadSchema,
  deliverEmailPayloadSchema,
  phase1fJobIdentifiers,
  processPortfolioMediaPayloadSchema,
} from './contracts.js';

export interface Phase1fJobServices {
  cleanupIdentity(): Promise<void>;
  deliverEmail(deliveryId: string): Promise<void>;
  processPortfolioMedia(portfolioMediaId: string): Promise<void>;
}

export interface Phase1fTaskLifecycleEvent {
  readonly attempt: number;
  readonly correlationId: string;
  readonly event: 'failed' | 'started' | 'succeeded';
  readonly taskIdentifier: string;
}

export type Phase1fTaskLifecycleSink = (event: Phase1fTaskLifecycleEvent) => void;

function task<T extends { correlationId: string }>(
  taskIdentifier: string,
  parse: (payload: unknown) => T,
  execute: (payload: T) => Promise<void>,
  timeoutMs: number,
  lifecycle: Phase1fTaskLifecycleSink,
): (payload: unknown, helpers: JobHelpers) => Promise<void> {
  return async (candidatePayload, helpers) => {
    let payload: T;
    try {
      payload = parse(candidatePayload);
    } catch {
      throw new FoundationJobError('FOUNDATION_JOB_VALIDATION');
    }
    lifecycle({
      attempt: helpers.job.attempts,
      correlationId: payload.correlationId,
      event: 'started',
      taskIdentifier,
    });
    try {
      await runWithJobTimeout(timeoutMs, helpers.abortSignal, () => execute(payload));
      lifecycle({
        attempt: helpers.job.attempts,
        correlationId: payload.correlationId,
        event: 'succeeded',
        taskIdentifier,
      });
    } catch (error) {
      lifecycle({
        attempt: helpers.job.attempts,
        correlationId: payload.correlationId,
        event: 'failed',
        taskIdentifier,
      });
      throw error;
    }
  };
}

export function createPhase1fTaskList(
  services: Phase1fJobServices,
  timeoutMs: number,
  lifecycle: Phase1fTaskLifecycleSink = () => undefined,
): TaskList {
  return {
    [phase1fJobIdentifiers.deliverEmail]: task(
      phase1fJobIdentifiers.deliverEmail,
      (payload) => deliverEmailPayloadSchema.parse(payload),
      (payload) => services.deliverEmail(payload.deliveryId),
      timeoutMs,
      lifecycle,
    ),
    [phase1fJobIdentifiers.cleanupIdentity]: task(
      phase1fJobIdentifiers.cleanupIdentity,
      (payload) => cleanupIdentityPayloadSchema.parse(payload),
      () => services.cleanupIdentity(),
      timeoutMs,
      lifecycle,
    ),
    [phase1fJobIdentifiers.processPortfolioMedia]: task(
      phase1fJobIdentifiers.processPortfolioMedia,
      (payload) => processPortfolioMediaPayloadSchema.parse(payload),
      (payload) => services.processPortfolioMedia(payload.portfolioMediaId),
      timeoutMs,
      lifecycle,
    ),
  };
}
