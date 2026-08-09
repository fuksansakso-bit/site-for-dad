import {
  parseDatabaseEnvironment,
  parseEmailEnvironment,
  parseIdentityEnvironment,
  parseObservabilityEnvironment,
  parseStorageEnvironment,
  parseWorkerEnvironment,
} from '@project-name/config/server';
import {
  cleanupExpiredIdentityState,
  processQueuedEmailDelivery,
} from '@project-name/identity/passwordless';
import { createPortfolioAdapter } from '@project-name/db';
import { createCatalogJobServices } from '@project-name/jobs';
import { createFoundationLogger } from '@project-name/observability/logger';
import { foundationMetrics } from '@project-name/observability/metrics';
import { initializeNodeTelemetry } from '@project-name/observability/telemetry';
import { createS3ObjectStorage } from '@project-name/storage';
import { createSmtpEmailDeliveryPort } from '@project-name/notifications';

import { createWorkerEventSink, startWorkerProcess } from './runtime.js';
import { processPortfolioMedia } from './portfolio-media.js';

function writeBootstrapFailure(): void {
  process.stderr.write(
    `${JSON.stringify({
      buildId: 'unknown',
      correlationId: 'worker-bootstrap-failure',
      environment: 'unknown',
      errorCode: 'INTERNAL_ERROR',
      event: 'worker.bootstrap.failed',
      schemaVersion: 1,
      service: 'worker',
      severity: 'error',
      timestamp: new Date().toISOString(),
      traceId: '00000000000000000000000000000000',
    })}\n`,
  );
}

try {
  const workerEnvironment = parseWorkerEnvironment(process.env);
  const databaseEnvironment = parseDatabaseEnvironment(process.env);
  const emailEnvironment = parseEmailEnvironment(process.env);
  const identityEnvironment = parseIdentityEnvironment(process.env);
  const observabilityEnvironment = parseObservabilityEnvironment(process.env);
  const storageEnvironment = parseStorageEnvironment(process.env);
  const telemetryRuntime = initializeNodeTelemetry(observabilityEnvironment, 'project-name-worker');
  const logger = createFoundationLogger({
    buildId: observabilityEnvironment.BUILD_ID,
    environment: observabilityEnvironment.APP_ENV,
    minimumSeverity: observabilityEnvironment.LOG_LEVEL,
    service: 'worker',
  });
  const eventSink = createWorkerEventSink(logger);
  const objectStorage = createS3ObjectStorage(storageEnvironment);
  const portfolio = createPortfolioAdapter(databaseEnvironment);
  const emailDelivery = createSmtpEmailDeliveryPort({
    fromAddress: emailEnvironment.EMAIL_FROM_ADDRESS,
    fromName: emailEnvironment.EMAIL_FROM_NAME,
    host: emailEnvironment.SMTP_HOST,
    port: emailEnvironment.SMTP_PORT,
    timeoutMs: emailEnvironment.SMTP_TIMEOUT_MS,
  });
  const catalogServices = createCatalogJobServices(undefined, () => ({
    maximumBytes: storageEnvironment.S3_MAX_OBJECT_BYTES,
    objectStorage,
  }));
  let telemetryShutdown: Promise<void> | undefined;
  const shutdownTelemetry = (): Promise<void> => {
    telemetryShutdown ??= telemetryRuntime.shutdown();
    return telemetryShutdown;
  };

  let workerProcess: Awaited<ReturnType<typeof startWorkerProcess>> | undefined;
  try {
    workerProcess = await startWorkerProcess(
      databaseEnvironment,
      workerEnvironment,
      eventSink,
      {
        logger,
        metrics: foundationMetrics,
      },
      catalogServices,
      {
        cleanupIdentity: () => cleanupExpiredIdentityState(databaseEnvironment),
        deliverEmail: (deliveryId) =>
          processQueuedEmailDelivery(
            databaseEnvironment,
            identityEnvironment,
            emailDelivery,
            deliveryId,
          ),
        processPortfolioMedia: (mediaId) =>
          processPortfolioMedia(portfolio, objectStorage, mediaId),
      },
    );
  } catch (error) {
    logger.log({
      error,
      event: 'worker.start.failed',
      outcome: 'failure',
      severity: 'error',
    });
    await shutdownTelemetry().catch(() => undefined);
    process.exitCode = 1;
  }

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      void workerProcess
        ?.shutdown(signal)
        .then(shutdownTelemetry)
        .catch(() => {
          process.exitCode = 1;
        });
    });
  }

  void workerProcess?.completion.catch(async (error) => {
    logger.log({
      error,
      event: 'worker.runtime.failed',
      outcome: 'failure',
      severity: 'error',
    });
    process.exitCode = 1;
    await workerProcess?.shutdown('WORKER_RUNTIME_FAILURE');
    await shutdownTelemetry().catch(() => undefined);
  });
} catch {
  writeBootstrapFailure();
  process.exitCode = 1;
}
