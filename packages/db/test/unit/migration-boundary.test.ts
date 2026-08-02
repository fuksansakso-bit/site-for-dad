import { readFile, readdir } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const migrationsRoot = new URL('../../prisma/migrations/', import.meta.url);
const forbiddenBusinessEntity =
  /\b(?:customer[_ ]?photos?|materials?|orders?|prices?|products?|quotes?|visualizations?)\b/i;

describe('foundation migration boundary', () => {
  it('contains only reviewed infrastructure tables', async () => {
    const migrationDirectories = (await readdir(migrationsRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    expect(migrationDirectories).toEqual([
      '20260802160000_foundation_identity_audit',
      '20260802161000_foundation_delivery_health',
      '20260802162000_workload_audit_context',
    ]);

    const tables = new Set<string>();
    for (const directory of migrationDirectories) {
      const sql = await readFile(new URL(`${directory}/migration.sql`, migrationsRoot), 'utf8');
      expect(sql).toContain('PLAN-1A migration risk: LOW');
      expect(sql).toMatch(/\bBEGIN;/);
      expect(sql).toMatch(/\bCOMMIT;/);
      expect(sql).not.toMatch(/\b(?:DROP\s+TABLE|TRUNCATE)\b/i);
      expect(sql).not.toMatch(forbiddenBusinessEntity);
      for (const match of sql.matchAll(/CREATE TABLE "([a-z_]+)"/g)) {
        tables.add(match[1] ?? '');
      }
    }

    expect([...tables].sort()).toEqual([
      'actor_identity',
      'audit_event',
      'idempotency_record',
      'outbox_event',
      'role_grant',
      'service_heartbeat',
      'synthetic_session',
    ]);
  });

  it('keeps the Prisma schema free of Phase 1B+ entities', async () => {
    const schema = await readFile(new URL('../../prisma/schema.prisma', import.meta.url), 'utf8');
    expect(schema).not.toMatch(forbiddenBusinessEntity);
    expect(schema).toContain('model AuditEvent');
    expect(schema).toContain('model IdempotencyRecord');
  });
});
