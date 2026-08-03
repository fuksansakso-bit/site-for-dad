import { correlationIdSchema } from '@project-name/contracts/health';

import { IdentityError } from './errors.js';
import type { AuditContextInput, IdentityAuditContext, IdentityPrincipal } from './types.js';

export function createIdentityAuditContext(
  principal: IdentityPrincipal,
  input: AuditContextInput,
): IdentityAuditContext {
  const correlation = correlationIdSchema.safeParse(input.correlationId);
  const request =
    input.requestId === undefined ? undefined : correlationIdSchema.safeParse(input.requestId);
  if (!correlation.success || (request !== undefined && !request.success)) {
    throw new IdentityError('IDENTITY_VALIDATION_ERROR');
  }
  return {
    actorIdentityId: principal.actorId,
    actorType:
      principal.kind === 'ANONYMOUS'
        ? 'ANONYMOUS'
        : principal.kind === 'WORKLOAD'
          ? 'SYSTEM_WORKER'
          : 'IDENTITY',
    correlationId: correlation.data,
    ...(request?.success === true ? { requestId: request.data } : {}),
  };
}
