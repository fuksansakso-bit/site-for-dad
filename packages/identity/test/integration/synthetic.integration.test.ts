import { parseDatabaseEnvironment, parseIdentityEnvironment } from '@project-name/config/server';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { authorizePermission, type IdentityPrincipal } from '../../src/index.js';
import {
  createSyntheticIdentityAdapter,
  type SyntheticIdentityAdapter,
} from '../../src/synthetic.js';

const databaseEnvironment = parseDatabaseEnvironment(process.env);
const identityEnvironment = parseIdentityEnvironment(process.env);
const verificationPool = new Pool({ connectionString: databaseEnvironment.DATABASE_URL, max: 1 });
let identity: SyntheticIdentityAdapter;
let admin: IdentityPrincipal;
let customerActorId: string;
let customerCredential: Awaited<ReturnType<SyntheticIdentityAdapter['issueCredential']>>;

beforeAll(async () => {
  identity = createSyntheticIdentityAdapter(databaseEnvironment, identityEnvironment);
  const adminActor = await identity.createActor({
    correlationId: 'correlation-identity-bootstrap-admin',
    kind: 'HUMAN',
    roles: ['ADMIN'],
    subject: 'admin-001',
  });
  const adminCredential = await identity.issueCredential(
    adminActor.actorId,
    'synthetic-session',
    new Date(Date.now() + 60_000),
    { correlationId: 'correlation-identity-admin-session' },
  );
  admin = await identity.authenticate(adminCredential);

  const customer = await identity.createActor({
    correlationId: 'correlation-identity-bootstrap-customer',
    kind: 'HUMAN',
    roles: ['CUSTOMER'],
    subject: 'customer-001',
  });
  customerActorId = customer.actorId;
  customerCredential = await identity.issueCredential(
    customer.actorId,
    'synthetic-session',
    new Date(Date.now() + 60_000),
    { correlationId: 'correlation-identity-customer-session' },
  );
});

afterAll(async () => {
  await identity.close();
  await verificationPool.end();
});

describe.sequential('synthetic identity contract', () => {
  it('authenticates a human session and enforces ownership separately', async () => {
    const customer = await identity.authenticate(customerCredential);
    expect(customer).toMatchObject({ kind: 'HUMAN', roles: ['CUSTOMER'] });
    expect(
      authorizePermission({
        capability: 'foundation.identity.self_read',
        principal: customer,
        resource: { ownerActorId: customerActorId },
      }).outcome,
    ).toBe('ALLOW');
    expect(
      authorizePermission({ capability: 'foundation.role.manage', principal: customer }).outcome,
    ).toBe('DENY');
  });

  it('re-evaluates role grants on every use and audits grant/revoke', async () => {
    await identity.grantHumanRole(customerActorId, 'MANAGER', admin, {
      correlationId: 'correlation-identity-grant-manager',
    });
    expect((await identity.authenticate(customerCredential)).roles).toEqual(
      expect.arrayContaining(['CUSTOMER', 'MANAGER']),
    );
    await identity.revokeHumanRole(customerActorId, 'MANAGER', admin, {
      correlationId: 'correlation-identity-revoke-manager',
    });
    expect((await identity.authenticate(customerCredential)).roles).toEqual(['CUSTOMER']);

    const audits = await verificationPool.query<{ action: string; actor_identity_id: string }>(
      `
        SELECT action, actor_identity_id::text
        FROM audit_event
        WHERE correlation_id IN (
          'correlation-identity-grant-manager', 'correlation-identity-revoke-manager'
        )
        ORDER BY occurred_at
      `,
    );
    expect(audits.rows).toEqual([
      { action: 'FOUNDATION_ROLE_GRANTED', actor_identity_id: admin.actorId },
      { action: 'FOUNDATION_ROLE_REVOKED', actor_identity_id: admin.actorId },
    ]);
  });

  it('separates workload credentials from interactive sessions', async () => {
    const workerActor = await identity.createActor({
      correlationId: 'correlation-identity-bootstrap-worker',
      kind: 'WORKLOAD',
      roles: ['SYSTEM_WORKER'],
      subject: 'worker-001',
    });
    const workloadCredential = await identity.issueCredential(
      workerActor.actorId,
      'synthetic-workload',
      new Date(Date.now() + 60_000),
      { correlationId: 'correlation-identity-worker-session' },
    );
    const workload = await identity.authenticate(workloadCredential);
    expect(workload).toMatchObject({ kind: 'WORKLOAD', roles: ['SYSTEM_WORKER'] });
    await expect(
      identity.authenticate({ kind: 'synthetic-session', token: workloadCredential.token }),
    ).rejects.toThrowError('IDENTITY_AUTHENTICATION_REQUIRED');
  });

  it('revokes one credential immediately without exposing its token', async () => {
    const revocable = await identity.issueCredential(
      customerActorId,
      'synthetic-session',
      new Date(Date.now() + 60_000),
      { correlationId: 'correlation-identity-revocable-session' },
    );
    await identity.revokeCredential(revocable, {
      correlationId: 'correlation-identity-session-revoke',
    });
    await expect(identity.authenticate(revocable)).rejects.toThrowError(
      'IDENTITY_AUTHENTICATION_REQUIRED',
    );
    const audit = await verificationPool.query<{ count: string }>(
      `
        SELECT count(*)::text AS count FROM audit_event
        WHERE correlation_id = 'correlation-identity-session-revoke'
          AND action = 'FOUNDATION_SESSION_REVOKED'
      `,
    );
    expect(Number(audit.rows[0]?.count ?? 0)).toBe(1);
  });

  it('rejects an expired synthetic session using database time', async () => {
    const expiring = await identity.issueCredential(
      customerActorId,
      'synthetic-session',
      new Date(Date.now() + 100),
      { correlationId: 'correlation-identity-expiring-session' },
    );
    await new Promise((resolve) => setTimeout(resolve, 150));
    await expect(identity.authenticate(expiring)).rejects.toThrowError(
      'IDENTITY_AUTHENTICATION_REQUIRED',
    );
  });

  it('fails closed after bulk revocation and when PostgreSQL is unavailable', async () => {
    const disposable = await identity.issueCredential(
      customerActorId,
      'synthetic-session',
      new Date(Date.now() + 60_000),
      { correlationId: 'correlation-identity-disposable-session' },
    );
    await identity.revokeAllActorCredentials(customerActorId, admin, {
      correlationId: 'correlation-identity-revoke-all',
    });
    await expect(identity.authenticate(disposable)).rejects.toThrowError(
      'IDENTITY_AUTHENTICATION_REQUIRED',
    );

    const unavailable = createSyntheticIdentityAdapter(
      { ...databaseEnvironment, DATABASE_URL: 'postgresql://127.0.0.1:1/unavailable' },
      identityEnvironment,
    );
    await expect(unavailable.authenticate(disposable)).rejects.toThrowError(
      'IDENTITY_DEPENDENCY_UNAVAILABLE',
    );
    await unavailable.close();
  });
});
