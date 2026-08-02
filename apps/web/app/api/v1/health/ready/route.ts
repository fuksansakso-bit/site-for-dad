import { readinessResponseSchema } from '@project-name/contracts/health';
import { type NextRequest, NextResponse } from 'next/server';

import { observeHealthRequest, type WebHealthTelemetry } from '../../../../../lib/health-handler';
import { getWebObservability } from '../../../../../lib/observability';
import { getWebReadinessProvider } from '../../../../../lib/runtime-dependencies';

export const dynamic = 'force-dynamic';

export function createReadinessHandler(
  checkReadiness: () => Promise<Readonly<Record<string, 'ok' | 'unavailable'>>>,
  telemetryProvider: () => WebHealthTelemetry = getWebObservability,
): (request: NextRequest) => Promise<NextResponse> {
  return async (request) => {
    const observed = await observeHealthRequest(
      request,
      '/api/v1/health/ready',
      telemetryProvider(),
      async () => {
        let checks: Readonly<Record<string, 'ok' | 'unavailable'>>;
        try {
          checks = await checkReadiness();
        } catch {
          checks = { database: 'unavailable', process: 'ok', storage: 'unavailable' };
        }
        return {
          outcome: Object.values(checks).includes('unavailable') ? 'failure' : 'success',
          value: checks,
        };
      },
    );
    const isReady = !Object.values(observed.value).includes('unavailable');
    const response = readinessResponseSchema.parse({
      checks: observed.value,
      correlationId: observed.context.correlationId,
      status: isReady ? 'ok' : 'unavailable',
    });

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Correlation-ID': observed.context.correlationId,
        'X-Request-ID': observed.context.requestId ?? observed.context.correlationId,
      },
      status: isReady ? 200 : 503,
    });
  };
}

export const GET = createReadinessHandler(async () => getWebReadinessProvider()());
