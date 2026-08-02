import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';

import { createSafeErrorResponse, foundationErrorDefinitions } from '@project-name/contracts/error';
import {
  correlationIdSchema,
  livenessResponseSchema,
  readinessResponseSchema,
} from '@project-name/contracts/health';

export interface WorkerHealthOptions {
  readonly isReady: () => boolean;
}

function correlationId(candidate: string | undefined): string {
  const parsed = correlationIdSchema.safeParse(candidate);
  return parsed.success ? parsed.data : randomUUID();
}

export function createWorkerHealthServer(options: WorkerHealthOptions): Server {
  return createServer((request, response) => {
    const requestCorrelationId = correlationId(
      Array.isArray(request.headers['x-correlation-id'])
        ? request.headers['x-correlation-id'][0]
        : request.headers['x-correlation-id'],
    );
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Correlation-ID', requestCorrelationId);

    if (request.method === 'GET' && request.url === '/health/live') {
      response.statusCode = 200;
      response.end(
        JSON.stringify(
          livenessResponseSchema.parse({ correlationId: requestCorrelationId, status: 'ok' }),
        ),
      );
      return;
    }

    if (request.method === 'GET' && request.url === '/health/ready') {
      const isReady = options.isReady();
      response.statusCode = isReady ? 200 : 503;
      response.end(
        JSON.stringify(
          readinessResponseSchema.parse({
            checks: { worker: isReady ? 'ok' : 'unavailable' },
            correlationId: requestCorrelationId,
            status: isReady ? 'ok' : 'unavailable',
          }),
        ),
      );
      return;
    }

    response.statusCode = foundationErrorDefinitions.NOT_FOUND.httpStatus;
    response.end(JSON.stringify(createSafeErrorResponse('NOT_FOUND', requestCorrelationId)));
  });
}
