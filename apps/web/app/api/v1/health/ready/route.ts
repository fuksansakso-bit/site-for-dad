import { readinessResponseSchema } from '@project-name/contracts/health';
import { type NextRequest, NextResponse } from 'next/server';

import { resolveCorrelationId } from '../../../../../lib/correlation';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest): NextResponse {
  const correlationId = resolveCorrelationId(request.headers.get('x-correlation-id'));
  const response = readinessResponseSchema.parse({
    checks: { process: 'ok' },
    correlationId,
    status: 'ok',
  });

  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-store',
      'X-Correlation-ID': correlationId,
    },
    status: 200,
  });
}
