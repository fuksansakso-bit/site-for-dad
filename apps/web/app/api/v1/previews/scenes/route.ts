import { previewScenesResponseSchema } from '@project-name/contracts/preview';
import { previewScenes } from '@project-name/preview';
import { type NextRequest, NextResponse } from 'next/server';

import { requestTelemetryContext } from '../../../../../lib/health-handler';
import { pricingNoStoreHeaders } from '../../../../../lib/pricing-security';

export const dynamic = 'force-dynamic';

export function GET(request: NextRequest): NextResponse {
  const context = requestTelemetryContext(request);
  const body = previewScenesResponseSchema.parse({
    correlationId: context.correlationId,
    scenes: previewScenes.map(({ description, id, label, version }) => ({
      description,
      id,
      label,
      version,
    })),
  });
  return NextResponse.json(body, { headers: pricingNoStoreHeaders(context.correlationId) });
}
