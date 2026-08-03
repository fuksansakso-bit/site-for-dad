import { createHash, randomUUID } from 'node:crypto';

import { parseDatabaseEnvironment } from '@project-name/config/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  checkDatabaseReadiness,
  createPrismaClient,
  type FoundationPrismaClient,
} from '../../src/client.js';

describe('PostgreSQL foundation integration', () => {
  let client: FoundationPrismaClient;

  beforeAll(() => {
    client = createPrismaClient(parseDatabaseEnvironment(process.env));
  });

  afterAll(async () => {
    await client.$disconnect();
  });

  it('connects through the runtime adapter and reports readiness', async () => {
    await expect(checkDatabaseReadiness(client, 2_000)).resolves.toBe('ok');
  });

  it('persists synthetic identity, RBAC, session, and audit context', async () => {
    const uniqueSubject = `integration-${randomUUID()}`;
    const tokenHash = createHash('sha256').update(randomUUID()).digest('hex');
    const actor = await client.actorIdentity.create({
      data: {
        provider: 'synthetic-test',
        subject: uniqueSubject,
        updatedAt: new Date(),
      },
    });
    await client.roleGrant.create({
      data: {
        actorId: actor.id,
        role: 'ADMIN',
      },
    });
    await client.syntheticSession.create({
      data: {
        actorId: actor.id,
        expiresAt: new Date(Date.now() + 60_000),
        tokenHash,
      },
    });
    const auditEvent = await client.auditEvent.create({
      data: {
        action: 'foundation.integration.verified',
        actorIdentityId: actor.id,
        actorType: 'IDENTITY',
        correlationId: `correlation-${randomUUID()}`,
        outcome: 'SUCCEEDED',
      },
    });

    await expect(
      client.auditEvent.update({
        data: { outcome: 'FAILED' },
        where: { id: auditEvent.id },
      }),
    ).rejects.toThrow();
    await expect(
      client.actorIdentity.findUniqueOrThrow({
        include: { roleGrants: true, sessions: true },
        where: { id: actor.id },
      }),
    ).resolves.toMatchObject({
      roleGrants: [{ role: 'ADMIN' }],
      sessions: [{ tokenHash }],
    });
  });

  it('enforces idempotency uniqueness in the database', async () => {
    const key = `integration-${randomUUID()}`;
    const data = {
      key,
      payloadDigest: createHash('sha256').update('synthetic').digest('hex'),
      scope: 'foundation.integration',
      updatedAt: new Date(),
    };
    await client.idempotencyRecord.create({ data });
    await expect(client.idempotencyRecord.create({ data })).rejects.toThrow();
  });
});
