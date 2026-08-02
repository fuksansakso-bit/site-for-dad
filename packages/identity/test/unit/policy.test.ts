import { describe, expect, it } from 'vitest';

import {
  authorizePermission,
  createIdentityAuditContext,
  foundationCapabilities,
  foundationRoles,
  guestPrincipal,
  requirePermission,
  type FoundationRole,
  type IdentityPrincipal,
} from '../../src/index.js';

function human(
  role: FoundationRole,
  actorId = 'd9f0b137-dc37-46d3-a9a3-05f567b6128d',
): IdentityPrincipal {
  return { actorId, kind: 'HUMAN', roles: [role], sessionId: 'synthetic-session-id' };
}

describe('deny-by-default foundation policy', () => {
  it('defines exactly the six Phase 1A roles and denies unknown capabilities', () => {
    expect(foundationRoles).toEqual([
      'GUEST',
      'CUSTOMER',
      'MANAGER',
      'ADMIN',
      'OWNER',
      'SYSTEM_WORKER',
    ]);
    expect(
      authorizePermission({ capability: 'future.business.action', principal: human('OWNER') }),
    ).toEqual({ outcome: 'DENY', reasonCode: 'CAPABILITY_UNKNOWN' });
  });

  it('enforces role and object scope server-side', () => {
    const customer = human('CUSTOMER');
    expect(
      authorizePermission({
        capability: 'foundation.identity.self_read',
        principal: customer,
        resource: { ownerActorId: 'd9f0b137-dc37-46d3-a9a3-05f567b6128d' },
      }).outcome,
    ).toBe('ALLOW');
    expect(
      authorizePermission({
        capability: 'foundation.identity.self_read',
        principal: customer,
        resource: { ownerActorId: '120b37ec-0eaf-4c47-a029-bf1e3fa025a2' },
      }),
    ).toEqual({ outcome: 'DENY', reasonCode: 'OBJECT_SCOPE_DENIED' });
    expect(() =>
      requirePermission({ capability: 'foundation.role.manage', principal: human('MANAGER') }),
    ).toThrowError('IDENTITY_PERMISSION_DENIED');
  });

  it('separates anonymous, human and workload permissions and audit actor types', () => {
    const worker: IdentityPrincipal = {
      actorId: '0ffb3ae4-1bf2-4420-bdc5-dba7df0b8dc1',
      kind: 'WORKLOAD',
      roles: ['SYSTEM_WORKER'],
      sessionId: 'synthetic-workload-id',
    };
    expect(
      authorizePermission({ capability: 'foundation.public.read', principal: guestPrincipal })
        .outcome,
    ).toBe('ALLOW');
    expect(
      authorizePermission({ capability: 'foundation.system.execute', principal: worker }).outcome,
    ).toBe('ALLOW');
    expect(
      authorizePermission({ capability: 'foundation.role.manage', principal: worker }).outcome,
    ).toBe('DENY');
    expect(
      createIdentityAuditContext(worker, { correlationId: 'correlation-worker' }),
    ).toMatchObject({
      actorType: 'SYSTEM_WORKER',
    });
  });

  it('covers every known capability with an explicit policy entry', () => {
    for (const capability of foundationCapabilities) {
      const decisions = foundationRoles.map((role) =>
        authorizePermission({
          capability,
          principal:
            role === 'GUEST'
              ? guestPrincipal
              : role === 'SYSTEM_WORKER'
                ? {
                    actorId: '0ffb3ae4-1bf2-4420-bdc5-dba7df0b8dc1',
                    kind: 'WORKLOAD' as const,
                    roles: [role],
                    sessionId: 'synthetic-workload-id',
                  }
                : human(role),
          ...(capability === 'foundation.identity.self_read'
            ? { resource: { ownerActorId: 'd9f0b137-dc37-46d3-a9a3-05f567b6128d' } }
            : {}),
        }),
      );
      expect(decisions.every((decision) => ['ALLOW', 'DENY'].includes(decision.outcome))).toBe(
        true,
      );
    }
  });
});
