import type { DatabaseEnvironment, WorkerEnvironment } from '@project-name/config/server';
import { amigoPilotCatalogSourceId } from '@project-name/catalog';
import {
  runMigrations,
  runTaskList,
  runTaskListOnce,
  type WorkerEvents,
  type WorkerPool,
} from 'graphile-worker';
import { EventEmitter } from 'node:events';
import { Pool, type PoolClient } from 'pg';

import {
  foundationProbePayloadSchema,
  foundationProbeQueueName,
  foundationProbeTaskIdentifier,
  type FoundationProbePayload,
} from './contracts.js';
import {
  automaticCatalogDiscoveryPayload,
  catalogActivateVersionPayloadSchema,
  catalogApproveVersionPayloadSchema,
  catalogJobIdentifiers,
  catalogJobQueueName,
  catalogReviewDifferencesPayloadSchema,
  catalogRollbackVersionPayloadSchema,
  catalogSourceDiscoveryPayloadSchema,
  catalogSyncCancellationRequestSchema,
  type CatalogActivateVersionPayload,
  type CatalogApproveVersionPayload,
  type CatalogReviewDifferencesPayload,
  type CatalogRollbackVersionPayload,
  type CatalogSourceDiscoveryPayload,
  type CatalogSyncCancellationRequest,
} from './catalog/contracts.js';
import { CatalogPipelineError } from './catalog/errors.js';
import { createCatalogJobServices, type CatalogJobServices } from './catalog/services.js';
import { createCatalogTaskList, type CatalogTaskLifecycleSink } from './catalog/task.js';
import { FoundationJobError } from './errors.js';
import { createFoundationGraphileLogger, type FoundationQueueLogSink } from './logger.js';
import { createFoundationTaskList, type FoundationTaskLifecycleSink } from './task.js';

export interface EnqueuedFoundationJob {
  readonly attempts: number;
  readonly id: string;
  readonly maxAttempts: number;
  readonly taskIdentifier: typeof foundationProbeTaskIdentifier;
}

export interface EnqueuedCatalogJob {
  readonly attempts: number;
  readonly id: string;
  readonly maxAttempts: number;
  readonly taskIdentifier: typeof catalogJobIdentifiers.sourceDiscovery;
}

export interface EnqueuedCatalogGovernanceJob {
  readonly attempts: number;
  readonly id: string;
  readonly maxAttempts: number;
  readonly taskIdentifier:
    | typeof catalogJobIdentifiers.activateVersion
    | typeof catalogJobIdentifiers.approveVersion
    | typeof catalogJobIdentifiers.reviewDifferences
    | typeof catalogJobIdentifiers.rollbackVersion;
}

export interface PermanentFoundationFailure {
  readonly attempts: number;
  readonly failureCode: string;
  readonly id: string;
  readonly maxAttempts: number;
  readonly taskIdentifier: string;
}

export interface FoundationJobRuntime {
  readonly pool: Pool;
  readonly promise: Promise<void>;
  checkReadiness(): Promise<'ok' | 'unavailable'>;
  forceStop(): Promise<void>;
  stop(): Promise<void>;
}

export function createFoundationJobPool(
  environment: DatabaseEnvironment,
  maximumConnections: number,
): Pool {
  return new Pool({
    connectionString: environment.DATABASE_URL,
    connectionTimeoutMillis: Math.min(environment.DATABASE_STATEMENT_TIMEOUT_MS, 10_000),
    max: maximumConnections,
    statement_timeout: environment.DATABASE_STATEMENT_TIMEOUT_MS,
  });
}

export async function migrateFoundationJobs(
  connectionString: string,
  runtimeDatabaseRole: string,
  logSink?: FoundationQueueLogSink,
): Promise<void> {
  await runMigrations({
    connectionString,
    logger: createFoundationGraphileLogger(logSink),
    noHandleSignals: true,
  });
  await hardenFoundationQueueRuntime(connectionString, runtimeDatabaseRole);
}

function quoteIdentifier(identifier: string): string {
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(identifier)) {
    throw new FoundationJobError('FOUNDATION_JOB_VALIDATION');
  }
  return `"${identifier}"`;
}

async function hardenFoundationQueueRuntime(
  connectionString: string,
  runtimeDatabaseRole: string,
): Promise<void> {
  if (!/^[a-z][a-z0-9_]{0,62}$/.test(runtimeDatabaseRole)) {
    throw new FoundationJobError('FOUNDATION_JOB_VALIDATION');
  }
  const quotedRole = quoteIdentifier(runtimeDatabaseRole);
  const pool = new Pool({ connectionString, max: 1 });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const roleResult = await client.query<{
      rolbypassrls: boolean;
      rolcreatedb: boolean;
      rolcreaterole: boolean;
      rolsuper: boolean;
    }>(
      `
        SELECT rolsuper, rolcreatedb, rolcreaterole, rolbypassrls
        FROM pg_roles
        WHERE rolname = $1
      `,
      [runtimeDatabaseRole],
    );
    const role = roleResult.rows[0];
    if (
      role === undefined ||
      role.rolsuper ||
      role.rolcreatedb ||
      role.rolcreaterole ||
      role.rolbypassrls
    ) {
      throw new FoundationJobError('FOUNDATION_JOB_VALIDATION');
    }

    await client.query(`
      REVOKE ALL ON SCHEMA graphile_worker FROM PUBLIC;
      REVOKE CREATE ON SCHEMA graphile_worker FROM ${quotedRole};
      GRANT USAGE ON SCHEMA graphile_worker TO ${quotedRole};
      REVOKE ALL ON ALL TABLES IN SCHEMA graphile_worker FROM PUBLIC;
      REVOKE ALL ON ALL SEQUENCES IN SCHEMA graphile_worker FROM PUBLIC;
      REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA graphile_worker FROM PUBLIC;
      GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA graphile_worker TO ${quotedRole};
      GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA graphile_worker TO ${quotedRole};
      GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA graphile_worker TO ${quotedRole};
      ALTER DEFAULT PRIVILEGES IN SCHEMA graphile_worker REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
      ALTER DEFAULT PRIVILEGES IN SCHEMA graphile_worker
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${quotedRole};
      ALTER DEFAULT PRIVILEGES IN SCHEMA graphile_worker
        GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ${quotedRole};
      ALTER DEFAULT PRIVILEGES IN SCHEMA graphile_worker
        GRANT EXECUTE ON FUNCTIONS TO ${quotedRole};
    `);

    const protectedTables = await client.query<{ relname: string }>(`
      SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'graphile_worker'
        AND c.relkind IN ('r', 'p')
        AND c.relrowsecurity
      ORDER BY c.relname
    `);
    if (protectedTables.rowCount === 0) {
      throw new FoundationJobError('FOUNDATION_JOB_DEPENDENCY_UNAVAILABLE');
    }
    for (const table of protectedTables.rows) {
      const quotedTable = quoteIdentifier(table.relname);
      await client.query(`
        DROP POLICY IF EXISTS project_name_worker_runtime
          ON graphile_worker.${quotedTable};
        CREATE POLICY project_name_worker_runtime
          ON graphile_worker.${quotedTable}
          FOR ALL TO ${quotedRole}
          USING (true)
          WITH CHECK (true)
      `);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

export async function verifyFoundationQueueSchema(pool: Pool): Promise<void> {
  try {
    const result = await pool.query<{ jobs_view: string | null; migration_count: string }>(`
      SELECT
        to_regclass('graphile_worker.jobs')::text AS jobs_view,
        CASE
          WHEN to_regclass('graphile_worker.migrations') IS NULL THEN '0'
          ELSE (SELECT count(*)::text FROM graphile_worker.migrations)
        END AS migration_count
    `);
    const state = result.rows[0];
    if (state?.jobs_view !== 'graphile_worker.jobs' || Number(state.migration_count) < 1) {
      throw new FoundationJobError('FOUNDATION_JOB_DEPENDENCY_UNAVAILABLE');
    }
  } catch {
    throw new FoundationJobError('FOUNDATION_JOB_DEPENDENCY_UNAVAILABLE');
  }
}

export async function enqueueFoundationProbe(
  pool: Pool,
  candidatePayload: FoundationProbePayload,
  maxAttempts: number,
): Promise<EnqueuedFoundationJob> {
  const payload = foundationProbePayloadSchema.parse(candidatePayload);
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 25) {
    throw new FoundationJobError('FOUNDATION_JOB_VALIDATION');
  }
  const result = await pool.query<{
    attempts: number;
    id: string;
    max_attempts: number;
    task_identifier: string;
  }>(
    `
      SELECT
        (job).id::text AS id,
        (job).attempts,
        (job).max_attempts,
        $1::text AS task_identifier
      FROM (
        SELECT graphile_worker.add_job(
          identifier := $1::text,
          payload := $2::json,
          queue_name := $3::text,
          max_attempts := $4::smallint,
          job_key := $5::text,
          priority := 0,
          flags := ARRAY['foundation']::text[],
          job_key_mode := 'replace'
        ) AS job
      ) queued
    `,
    [
      foundationProbeTaskIdentifier,
      JSON.stringify(payload),
      foundationProbeQueueName,
      maxAttempts,
      `${foundationProbeTaskIdentifier}:${payload.idempotencyKey}`,
    ],
  );
  const job = result.rows[0];
  if (job === undefined || job.task_identifier !== foundationProbeTaskIdentifier) {
    throw new FoundationJobError('FOUNDATION_JOB_DEPENDENCY_UNAVAILABLE');
  }
  return {
    attempts: job.attempts,
    id: job.id,
    maxAttempts: job.max_attempts,
    taskIdentifier: foundationProbeTaskIdentifier,
  };
}

export async function enqueueCatalogSourceDiscovery(
  pool: Pool,
  candidatePayload: CatalogSourceDiscoveryPayload,
  maxAttempts = 5,
  runAt?: Date,
): Promise<EnqueuedCatalogJob> {
  const payload = catalogSourceDiscoveryPayloadSchema.parse(candidatePayload);
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) {
    throw new FoundationJobError('FOUNDATION_JOB_VALIDATION');
  }
  const result = await pool.query<{
    attempts: number;
    id: string;
    max_attempts: number;
    task_identifier: string;
  }>(
    `
      SELECT
        (job).id::text AS id,
        (job).attempts,
        (job).max_attempts,
        $1::text AS task_identifier
      FROM (
        SELECT graphile_worker.add_job(
          identifier := $1::text,
          payload := $2::json,
          queue_name := $3::text,
          run_at := COALESCE($4::timestamptz, NOW()),
          max_attempts := $5::smallint,
          job_key := $6::text,
          priority := 0,
          flags := ARRAY['catalog-full']::text[],
          job_key_mode := 'replace'
        ) AS job
      ) queued
    `,
    [
      catalogJobIdentifiers.sourceDiscovery,
      JSON.stringify(payload),
      catalogJobQueueName,
      runAt?.toISOString() ?? null,
      maxAttempts,
      `${catalogJobIdentifiers.sourceDiscovery}:${payload.idempotencyKey}`,
    ],
  );
  const job = result.rows[0];
  if (job === undefined || job.task_identifier !== catalogJobIdentifiers.sourceDiscovery) {
    throw new FoundationJobError('FOUNDATION_JOB_DEPENDENCY_UNAVAILABLE');
  }
  return {
    attempts: job.attempts,
    id: job.id,
    maxAttempts: job.max_attempts,
    taskIdentifier: catalogJobIdentifiers.sourceDiscovery,
  };
}

export async function requestCatalogSyncCancellation(
  pool: Pool,
  candidate: CatalogSyncCancellationRequest,
): Promise<'ALREADY_REQUESTED' | 'REQUESTED'> {
  const input = catalogSyncCancellationRequestSchema.parse(candidate);
  const client = await pool.connect();
  let transactionActive = false;
  try {
    await client.query('BEGIN');
    transactionActive = true;
    const actorResult = await client.query<{ allowed: boolean }>(
      `
        SELECT bool_or(grant_row.role IN ('OWNER', 'ADMIN')) AS allowed
        FROM actor_identity actor
        JOIN role_grant grant_row ON grant_row.actor_id = actor.id
        WHERE actor.id = $1::uuid
          AND actor.disabled_at IS NULL
          AND grant_row.revoked_at IS NULL
        GROUP BY actor.id
      `,
      [input.actorId],
    );
    if (actorResult.rows[0]?.allowed !== true) {
      await client.query(
        `
          INSERT INTO audit_event (
            actor_type, actor_identity_id, action, outcome, correlation_id,
            target_type, target_id, reason_code
          ) VALUES (
            CASE WHEN EXISTS (
              SELECT 1 FROM actor_identity WHERE id = $1::uuid
            ) THEN 'IDENTITY'::audit_actor_type ELSE 'SYSTEM_WORKER'::audit_actor_type END,
            CASE WHEN EXISTS (
              SELECT 1 FROM actor_identity WHERE id = $1::uuid
            ) THEN $1::uuid ELSE NULL END,
            'CATALOG_SYNC_CANCELLATION_REQUESTED', 'DENIED', $2,
            'CATALOG_SYNC_RUN', $3, 'CATALOG_ADMIN_OR_OWNER_REQUIRED'
          )
        `,
        [input.actorId, input.correlationId, input.syncRunId],
      );
      await client.query('COMMIT');
      transactionActive = false;
      throw new CatalogPipelineError('CATALOG_PIPELINE_AUTHORIZATION');
    }

    const runResult = await client.query<{
      cancel_requested_at: Date | null;
      cancel_requested_by_actor_id: string | null;
      cancellation_reason: string | null;
      status: string;
    }>(
      `
        SELECT status::text, cancel_requested_at,
               cancel_requested_by_actor_id::text, cancellation_reason
        FROM catalog_sync_run
        WHERE id = $1::uuid AND catalog_source_id = $2::uuid
        FOR UPDATE
      `,
      [input.syncRunId, input.catalogSourceId],
    );
    const run = runResult.rows[0];
    if (
      run === undefined ||
      !['DISCOVERING', 'CAPTURING', 'NORMALIZING', 'IMPORTING_MEDIA', 'BUILDING_DIFF'].includes(
        run.status,
      )
    ) {
      throw new CatalogPipelineError('CATALOG_PIPELINE_VERSION_CONFLICT');
    }
    const alreadyRequested = run.cancel_requested_at !== null;
    if (
      alreadyRequested &&
      (run.cancel_requested_by_actor_id !== input.actorId ||
        run.cancellation_reason !== input.reason)
    ) {
      throw new CatalogPipelineError('CATALOG_PIPELINE_VERSION_CONFLICT');
    }
    if (!alreadyRequested) {
      await client.query(
        `
          UPDATE catalog_sync_run
          SET cancel_requested_at = NOW(), cancel_requested_by_actor_id = $2::uuid,
              cancellation_reason = $3, last_heartbeat_at = NOW(), updated_at = NOW()
          WHERE id = $1::uuid
        `,
        [input.syncRunId, input.actorId, input.reason],
      );
      await client.query(
        `
          INSERT INTO audit_event (
            actor_type, actor_identity_id, action, outcome, correlation_id,
            target_type, target_id, reason_code
          ) VALUES (
            'IDENTITY', $1::uuid, 'CATALOG_SYNC_CANCELLATION_REQUESTED',
            'SUCCEEDED', $2, 'CATALOG_SYNC_RUN', $3, 'OPERATOR_REQUEST'
          )
        `,
        [input.actorId, input.correlationId, input.syncRunId],
      );
    }
    await client.query('COMMIT');
    transactionActive = false;
    return alreadyRequested ? 'ALREADY_REQUESTED' : 'REQUESTED';
  } catch (error) {
    if (transactionActive) await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function enqueueCatalogGovernanceJob(
  pool: Pool,
  input:
    | {
        readonly identifier: typeof catalogJobIdentifiers.activateVersion;
        readonly payload: CatalogActivateVersionPayload;
      }
    | {
        readonly identifier: typeof catalogJobIdentifiers.approveVersion;
        readonly payload: CatalogApproveVersionPayload;
      }
    | {
        readonly identifier: typeof catalogJobIdentifiers.reviewDifferences;
        readonly payload: CatalogReviewDifferencesPayload;
      }
    | {
        readonly identifier: typeof catalogJobIdentifiers.rollbackVersion;
        readonly payload: CatalogRollbackVersionPayload;
      },
  maxAttempts = 3,
): Promise<EnqueuedCatalogGovernanceJob> {
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) {
    throw new FoundationJobError('FOUNDATION_JOB_VALIDATION');
  }
  const result = await pool.query<{
    attempts: number;
    id: string;
    max_attempts: number;
    task_identifier: string;
  }>(
    `
      SELECT
        (job).id::text AS id,
        (job).attempts,
        (job).max_attempts,
        $1::text AS task_identifier
      FROM (
        SELECT graphile_worker.add_job(
          identifier := $1::text,
          payload := $2::json,
          queue_name := $3::text,
          max_attempts := $4::smallint,
          job_key := $5::text,
          priority := -1,
          flags := ARRAY['catalog-full', 'governance']::text[],
          job_key_mode := 'replace'
        ) AS job
      ) queued
    `,
    [
      input.identifier,
      JSON.stringify(input.payload),
      catalogJobQueueName,
      maxAttempts,
      `${input.identifier}:${input.payload.idempotencyKey}`,
    ],
  );
  const job = result.rows[0];
  if (job === undefined || job.task_identifier !== input.identifier) {
    throw new FoundationJobError('FOUNDATION_JOB_DEPENDENCY_UNAVAILABLE');
  }
  return {
    attempts: job.attempts,
    id: job.id,
    maxAttempts: job.max_attempts,
    taskIdentifier: input.identifier,
  };
}

export function enqueueCatalogVersionApproval(
  pool: Pool,
  candidatePayload: CatalogApproveVersionPayload,
  maxAttempts = 3,
): Promise<EnqueuedCatalogGovernanceJob> {
  const payload = catalogApproveVersionPayloadSchema.parse(candidatePayload);
  return enqueueCatalogGovernanceJob(
    pool,
    { identifier: catalogJobIdentifiers.approveVersion, payload },
    maxAttempts,
  );
}

export function enqueueCatalogDifferenceReview(
  pool: Pool,
  candidatePayload: CatalogReviewDifferencesPayload,
  maxAttempts = 3,
): Promise<EnqueuedCatalogGovernanceJob> {
  const payload = catalogReviewDifferencesPayloadSchema.parse(candidatePayload);
  return enqueueCatalogGovernanceJob(
    pool,
    { identifier: catalogJobIdentifiers.reviewDifferences, payload },
    maxAttempts,
  );
}

export function enqueueCatalogVersionActivation(
  pool: Pool,
  candidatePayload: CatalogActivateVersionPayload,
  maxAttempts = 3,
): Promise<EnqueuedCatalogGovernanceJob> {
  const payload = catalogActivateVersionPayloadSchema.parse(candidatePayload);
  return enqueueCatalogGovernanceJob(
    pool,
    { identifier: catalogJobIdentifiers.activateVersion, payload },
    maxAttempts,
  );
}

export function enqueueCatalogVersionRollback(
  pool: Pool,
  candidatePayload: CatalogRollbackVersionPayload,
  maxAttempts = 3,
): Promise<EnqueuedCatalogGovernanceJob> {
  const payload = catalogRollbackVersionPayloadSchema.parse(candidatePayload);
  return enqueueCatalogGovernanceJob(
    pool,
    { identifier: catalogJobIdentifiers.rollbackVersion, payload },
    maxAttempts,
  );
}

export async function ensureDailyCatalogSourceDiscovery(
  pool: Pool,
  now = new Date(),
): Promise<EnqueuedCatalogJob> {
  const nextRunAt = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  return enqueueCatalogSourceDiscovery(
    pool,
    automaticCatalogDiscoveryPayload(amigoPilotCatalogSourceId, nextRunAt),
    5,
    nextRunAt,
  );
}

export async function runFoundationJobsOnce(
  pool: Pool,
  environment: WorkerEnvironment,
  lifecycle?: FoundationTaskLifecycleSink,
  logSink?: FoundationQueueLogSink,
  catalogLifecycle?: CatalogTaskLifecycleSink,
  catalogServices: CatalogJobServices = createCatalogJobServices(),
): Promise<void> {
  await verifyFoundationQueueSchema(pool);
  const client: PoolClient = await pool.connect();
  try {
    const worker = runTaskListOnce(
      {
        logger: createFoundationGraphileLogger(logSink),
        noHandleSignals: true,
        preset: {
          worker: { completeJobBatchDelay: 0, failJobBatchDelay: 0 },
        },
      },
      {
        ...createFoundationTaskList(environment.WORKER_JOB_TIMEOUT_MS, lifecycle),
        ...createCatalogTaskList(
          catalogServices,
          environment.WORKER_JOB_TIMEOUT_MS,
          catalogLifecycle,
        ),
      },
      client,
    );
    await worker.promise;
  } finally {
    client.release();
  }
}

export async function listPermanentFoundationFailures(
  pool: Pool,
): Promise<readonly PermanentFoundationFailure[]> {
  const result = await pool.query<{
    attempts: number;
    id: string;
    last_error: string | null;
    max_attempts: number;
    task_identifier: string;
  }>(`
    SELECT id::text, task_identifier, attempts, max_attempts, last_error
    FROM graphile_worker.jobs
    WHERE attempts >= max_attempts
    ORDER BY id
  `);
  return result.rows.map((job) => ({
    attempts: job.attempts,
    failureCode: job.last_error ?? 'FOUNDATION_JOB_DEPENDENCY_UNAVAILABLE',
    id: job.id,
    maxAttempts: job.max_attempts,
    taskIdentifier: job.task_identifier,
  }));
}

export async function startFoundationJobRuntime(
  databaseEnvironment: DatabaseEnvironment,
  workerEnvironment: WorkerEnvironment,
  lifecycle?: FoundationTaskLifecycleSink,
  logSink?: FoundationQueueLogSink,
  catalogLifecycle?: CatalogTaskLifecycleSink,
  catalogServices: CatalogJobServices = createCatalogJobServices(),
): Promise<FoundationJobRuntime> {
  const pool = createFoundationJobPool(
    databaseEnvironment,
    Math.max(2, workerEnvironment.WORKER_CONCURRENCY + 1),
  );
  await verifyFoundationQueueSchema(pool);

  let ready = false;
  let stopping = false;
  let stopped = false;
  let poolEndPromise: Promise<void> | undefined;
  let gracefulStopPromise: Promise<void> | undefined;
  let forceStopPromise: Promise<void> | undefined;
  const events = new EventEmitter() as WorkerEvents;
  const listenerReady = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new FoundationJobError('FOUNDATION_JOB_DEPENDENCY_UNAVAILABLE')),
      databaseEnvironment.DATABASE_STATEMENT_TIMEOUT_MS,
    );
    timeout.unref();
    events.once('pool:listen:success', () => {
      clearTimeout(timeout);
      ready = true;
      resolve();
    });
    events.once('pool:listen:error', () => {
      clearTimeout(timeout);
      reject(new FoundationJobError('FOUNDATION_JOB_DEPENDENCY_UNAVAILABLE'));
    });
  });
  events.on('pool:listen:error', () => {
    ready = false;
  });

  const workerPool: WorkerPool = runTaskList(
    {
      concurrency: workerEnvironment.WORKER_CONCURRENCY,
      events,
      gracefulShutdownAbortTimeout: workerEnvironment.WORKER_JOB_TIMEOUT_MS,
      logger: createFoundationGraphileLogger(logSink),
      noHandleSignals: true,
      pollInterval: workerEnvironment.WORKER_POLL_INTERVAL_MS,
      preset: {
        worker: { completeJobBatchDelay: 0, failJobBatchDelay: 0 },
      },
    },
    {
      ...createFoundationTaskList(workerEnvironment.WORKER_JOB_TIMEOUT_MS, lifecycle),
      ...createCatalogTaskList(
        catalogServices,
        workerEnvironment.WORKER_JOB_TIMEOUT_MS,
        catalogLifecycle,
      ),
    },
    pool,
  );
  const promise = workerPool.promise.finally(() => {
    ready = false;
  });

  try {
    await listenerReady;
  } catch (error) {
    await workerPool.forcefulShutdown('Foundation queue did not become ready');
    await pool.end();
    throw error;
  }

  function closePool(): Promise<void> {
    poolEndPromise ??= pool.end();
    return poolEndPromise;
  }

  async function finish(force: boolean): Promise<void> {
    stopping = true;
    ready = false;
    try {
      if (force) {
        await workerPool.forcefulShutdown('Foundation worker forced shutdown');
      } else {
        await workerPool.gracefulShutdown('Foundation worker graceful shutdown');
      }
      await promise;
    } finally {
      await closePool();
      stopped = true;
    }
  }

  return {
    pool,
    promise,
    async checkReadiness() {
      if (!ready || stopping) return 'unavailable';
      try {
        await pool.query('SELECT 1');
        return 'ok';
      } catch {
        ready = false;
        return 'unavailable';
      }
    },
    forceStop() {
      if (stopped) return Promise.resolve();
      forceStopPromise ??= finish(true);
      return forceStopPromise;
    },
    stop() {
      if (stopped) return Promise.resolve();
      gracefulStopPromise ??= finish(false);
      return gracefulStopPromise;
    },
  };
}
