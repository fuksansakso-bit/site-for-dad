import { livenessResponseSchema } from '@project-name/contracts/health';
import { type NextRequest, NextResponse } from 'next/server';

import { observeHealthRequest, type WebHealthTelemetry } from '../../../../../lib/health-handler';
import { getWebObservability } from '../../../../../lib/observability';

export const dynamic = 'force-dynamic';

export function createLivenessHandler(
  telemetryProvider: () => WebHealthTelemetry = getWebObservability,
): (request: NextRequest) => Promise<NextResponse> {
  return async (request) => {
    const observed = await observeHealthRequest(
      request,
      '/api/v1/health/live',
      telemetryProvider(),
      async () => ({ outcome: 'success', value: { status: 'ok' as const } }),
    );
    const response = livenessResponseSchema.parse({
      correlationId: observed.context.correlationId,
      status: observed.value.status,
    });

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store',
        'X-Correlation-ID': observed.context.correlationId,
        'X-Request-ID': observed.context.requestId ?? observed.context.correlationId,
      },
      status: 200,
    });
  };
}

export const GET = createLivenessHandler();
