import type { JobHelpers, TaskList } from 'graphile-worker';
import {
  createFoundationTelemetryContext,
  runWithFoundationTelemetryContext,
} from '@project-name/observability/context';
import { foundationMetrics } from '@project-name/observability/metrics';
import { runInFoundationSpan } from '@project-name/observability/tracing';
import { type z } from 'zod';

import { runWithJobTimeout } from '../timeout.js';
import {
  catalogActivateVersionPayloadSchema,
  automaticCatalogDiscoveryPayload,
  catalogBuildDiffPayloadSchema,
  catalogJobIdentifiers,
  catalogJobQueueName,
  catalogMediaImportPayloadSchema,
  catalogNormalizePayloadSchema,
  catalogSourceDiscoveryPayloadSchema,
  catalogStageIdempotencyKey,
  catalogSyncRunPayloadSchema,
  type CatalogActivateVersionPayload,
  type CatalogBuildDiffPayload,
  type CatalogJobIdentifier,
  type CatalogMediaImportPayload,
  type CatalogNormalizePayload,
  type CatalogSourceDiscoveryPayload,
  type CatalogSyncRunPayload,
  type CatalogSyncStagePayload,
} from './contracts.js';
import { toCatalogPipelineError } from './errors.js';
import {
  completeCatalogExecution,
  failCatalogExecution,
  prepareCatalogExecution,
} from './idempotency.js';
import { type CatalogJobServices } from './services.js';

export interface CatalogTaskLifecycleEvent {
  readonly attempt: number;
  readonly correlationId: string;
  readonly errorCode?: string;
  readonly event: 'deduplicated' | 'failed' | 'permanent-failure' | 'started' | 'succeeded';
  readonly taskIdentifier: CatalogJobIdentifier;
}

export type CatalogTaskLifecycleSink = (event: CatalogTaskLifecycleEvent) => void;

type AnyCatalogPayload =
  | CatalogActivateVersionPayload
  | CatalogBuildDiffPayload
  | CatalogMediaImportPayload
  | CatalogNormalizePayload
  | CatalogSourceDiscoveryPayload
  | CatalogSyncRunPayload;

async function enqueueStage(
  helpers: JobHelpers,
  identifier: CatalogJobIdentifier,
  payload: CatalogSyncStagePayload,
): Promise<void> {
  await helpers.addJob(identifier, payload, {
    flags: ['catalog-pilot'],
    jobKey: `${identifier}:${payload.syncRunId}`,
    jobKeyMode: 'replace',
    maxAttempts: 5,
    queueName: catalogJobQueueName,
  });
}

function nextStagePayload(
  payload: CatalogSyncStagePayload,
  identifier: CatalogJobIdentifier,
): CatalogSyncStagePayload {
  return {
    catalogSourceId: payload.catalogSourceId,
    correlationId: payload.correlationId,
    idempotencyKey: catalogStageIdempotencyKey(identifier, payload.syncRunId),
    schemaVersion: 1,
    syncRunId: payload.syncRunId,
  };
}

async function executeTask<TPayload extends AnyCatalogPayload>(
  identifier: CatalogJobIdentifier,
  schema: z.ZodType<TPayload>,
  candidatePayload: unknown,
  helpers: JobHelpers,
  timeoutMilliseconds: number,
  lifecycle: CatalogTaskLifecycleSink,
  execute: (payload: TPayload, signal: AbortSignal) => Promise<void>,
): Promise<void> {
  const parsed = schema.safeParse(candidatePayload);
  if (!parsed.success) {
    throw toCatalogPipelineError(parsed.error);
  }
  const payload = parsed.data;
  const telemetryContext = createFoundationTelemetryContext({
    correlationId: payload.correlationId,
  });
  return runWithFoundationTelemetryContext(telemetryContext, () =>
    runInFoundationSpan(
      `queue.${identifier}.execute`,
      {
        'catalog.job.attempt': helpers.job.attempts,
        'catalog.job.template': identifier,
      },
      async () => {
        const startedAt = performance.now();
        let outcome: 'failure' | 'success' = 'failure';
        lifecycle({
          attempt: helpers.job.attempts,
          correlationId: payload.correlationId,
          event: 'started',
          taskIdentifier: identifier,
        });
        try {
          const preparation = await prepareCatalogExecution(
            identifier,
            payload,
            helpers,
            timeoutMilliseconds,
          );
          if (preparation === 'already-completed') {
            outcome = 'success';
            lifecycle({
              attempt: helpers.job.attempts,
              correlationId: payload.correlationId,
              event: 'deduplicated',
              taskIdentifier: identifier,
            });
            return;
          }
          await runWithJobTimeout(timeoutMilliseconds, helpers.abortSignal, (signal) =>
            execute(payload, signal),
          );
          await completeCatalogExecution(identifier, payload, helpers);
          outcome = 'success';
          lifecycle({
            attempt: helpers.job.attempts,
            correlationId: payload.correlationId,
            event: 'succeeded',
            taskIdentifier: identifier,
          });
        } catch (error) {
          const pipelineError = toCatalogPipelineError(error);
          const permanent =
            !pipelineError.retryable || helpers.job.attempts >= helpers.job.max_attempts;
          if (permanent) {
            await failCatalogExecution(identifier, payload, helpers, pipelineError.code);
          }
          lifecycle({
            attempt: helpers.job.attempts,
            correlationId: payload.correlationId,
            errorCode: pipelineError.code,
            event: permanent ? 'permanent-failure' : 'failed',
            taskIdentifier: identifier,
          });
          if (!pipelineError.retryable) {
            return;
          }
          throw pipelineError;
        } finally {
          foundationMetrics.record({
            component: 'queue',
            durationMs: performance.now() - startedAt,
            operation: `queue.${identifier}.execute`,
            outcome,
          });
        }
      },
    ),
  );
}

export function createCatalogTaskList(
  services: CatalogJobServices,
  timeoutMilliseconds: number,
  lifecycle: CatalogTaskLifecycleSink = () => undefined,
): TaskList {
  return {
    [catalogJobIdentifiers.sourceDiscovery]: (candidate, helpers) =>
      executeTask(
        catalogJobIdentifiers.sourceDiscovery,
        catalogSourceDiscoveryPayloadSchema,
        candidate,
        helpers,
        timeoutMilliseconds,
        lifecycle,
        async (payload, signal) => {
          const syncRunId = await services.discoverSource(payload, helpers, signal);
          if (payload.trigger === 'AUTOMATIC') {
            const nextRunAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
            const nextPayload = automaticCatalogDiscoveryPayload(
              payload.catalogSourceId,
              nextRunAt,
            );
            await helpers.addJob(catalogJobIdentifiers.sourceDiscovery, nextPayload, {
              flags: ['catalog-pilot', 'automatic'],
              jobKey: `${catalogJobIdentifiers.sourceDiscovery}:${nextPayload.idempotencyKey}`,
              jobKeyMode: 'replace',
              maxAttempts: 5,
              queueName: catalogJobQueueName,
              runAt: nextRunAt,
            });
          }
          await enqueueStage(helpers, catalogJobIdentifiers.syncRun, {
            catalogSourceId: payload.catalogSourceId,
            correlationId: payload.correlationId,
            idempotencyKey: catalogStageIdempotencyKey(catalogJobIdentifiers.syncRun, syncRunId),
            schemaVersion: 1,
            syncRunId,
          });
        },
      ),
    [catalogJobIdentifiers.syncRun]: (candidate, helpers) =>
      executeTask(
        catalogJobIdentifiers.syncRun,
        catalogSyncRunPayloadSchema,
        candidate,
        helpers,
        timeoutMilliseconds,
        lifecycle,
        async (payload, signal) => {
          await services.synchronize(payload, helpers, signal);
          await enqueueStage(
            helpers,
            catalogJobIdentifiers.normalize,
            nextStagePayload(payload, catalogJobIdentifiers.normalize),
          );
        },
      ),
    [catalogJobIdentifiers.normalize]: (candidate, helpers) =>
      executeTask(
        catalogJobIdentifiers.normalize,
        catalogNormalizePayloadSchema,
        candidate,
        helpers,
        timeoutMilliseconds,
        lifecycle,
        async (payload, signal) => {
          await services.normalize(payload, helpers, signal);
          await enqueueStage(
            helpers,
            catalogJobIdentifiers.mediaImport,
            nextStagePayload(payload, catalogJobIdentifiers.mediaImport),
          );
        },
      ),
    [catalogJobIdentifiers.mediaImport]: (candidate, helpers) =>
      executeTask(
        catalogJobIdentifiers.mediaImport,
        catalogMediaImportPayloadSchema,
        candidate,
        helpers,
        timeoutMilliseconds,
        lifecycle,
        async (payload, signal) => {
          await services.importMedia(payload, helpers, signal);
          await enqueueStage(
            helpers,
            catalogJobIdentifiers.buildDiff,
            nextStagePayload(payload, catalogJobIdentifiers.buildDiff),
          );
        },
      ),
    [catalogJobIdentifiers.buildDiff]: (candidate, helpers) =>
      executeTask(
        catalogJobIdentifiers.buildDiff,
        catalogBuildDiffPayloadSchema,
        candidate,
        helpers,
        timeoutMilliseconds,
        lifecycle,
        (payload, signal) => services.buildDiff(payload, helpers, signal),
      ),
    [catalogJobIdentifiers.activateVersion]: (candidate, helpers) =>
      executeTask(
        catalogJobIdentifiers.activateVersion,
        catalogActivateVersionPayloadSchema,
        candidate,
        helpers,
        timeoutMilliseconds,
        lifecycle,
        (payload, signal) => services.activateVersion(payload, helpers, signal),
      ),
  };
}
