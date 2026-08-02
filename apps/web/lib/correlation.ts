import { randomUUID } from 'node:crypto';

import { correlationIdSchema } from '@project-name/contracts/health';

export function resolveCorrelationId(candidate: string | null): string {
  const result = correlationIdSchema.safeParse(candidate);
  return result.success ? result.data : randomUUID();
}
