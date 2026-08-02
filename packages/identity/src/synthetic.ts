import type { DatabaseEnvironment, IdentityEnvironment } from '@project-name/config/server';
import { correlationIdSchema } from '@project-name/contracts/health';
import { createHmac, randomBytes } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import { z } from 'zod';

import { createIdentityAuditContext } from './audit.js';
import { IdentityError } from './errors.js';
import { requirePermission } from './policy.js';
import {
  foundationRoles,
  type AuditContextInput,
  type FoundationRole,
  type IdentityCredential,
  type IdentityPort,
  type IdentityPrincipal,
} from './types.js';

const actorIdSchema = z.string().uuid();
const subjectSchema = z
  .string()
  .min(3)
  .max(128)
  .regex(/^[a-z0-9][a-z0-9._:-]*$/);
const tokenSchema = z.string().regex(/^syn1_[A-Za-z0-9_-]{43}$/);
const humanRoles = ['CUSTOMER', 'MANAGER', 'ADMIN', 'OWNER'] as const;

export interface SyntheticActorInput extends AuditContextInput {
  readonly kind: 'HUMAN' | 'WORKLOAD';
  readonly roles: readonly FoundationRole[];
  readonly subject: string;
}

export interface SyntheticActor {
  readonly actorId: string;
  readonly kind: 'HUMAN' | 'WORKLOAD';
}

export interface SyntheticIdentityAdapter extends IdentityPort {
  close(): Promise<void>;
  createActor(input: SyntheticActorInput): Promise<SyntheticActor>;
  grantHumanRole(
    targetActorId: string,
    role: (typeof humanRoles)[number],
    granter: IdentityPrincipal,
    context: AuditContextInput,
  ): Promise<void>;
  issueCredential(
    actorId: string,
    kind: IdentityCredential['kind'],
    expiresAt: Date,
    context: AuditContextInput,
  ): Promise<IdentityCredential>;
  revokeAllActorCredentials(
    actorId: string,
    granter: IdentityPrincipal,
    context: AuditContextInput,
  ): Promise<void>;
  revokeHumanRole(
    targetActorId: string,
    role: (typeof humanRoles)[number],
    granter: IdentityPrincipal,
    context: AuditContextInput,
  ): Promise<void>;
}

function validateContext(context: AuditContextInput): void {
  if (
    !correlationIdSchema.safeParse(context.correlationId).success ||
    (context.requestId !== undefined && !correlationIdSchema.safeParse(context.requestId).success)
  ) {
    throw new IdentityError('IDENTITY_VALIDATION_ERROR');
  }
}

function validateActorRoles(
  kind: SyntheticActorInput['kind'],
  roles: readonly FoundationRole[],
): void {
  const roleSet = new Set(roles);
  if (
    roles.length === 0 ||
    roleSet.size !== roles.length ||
    roles.some((role) => !foundationRoles.includes(role))
  ) {
    throw new IdentityError('IDENTITY_VALIDATION_ERROR');
  }
  if (kind === 'WORKLOAD') {
    if (roleSet.size !== 1 || !roleSet.has('SYSTEM_WORKER')) {
      throw new IdentityError('IDENTITY_VALIDATION_ERROR');
    }
    return;
  }
  if (roles.some((role) => role === 'GUEST' || role === 'SYSTEM_WORKER')) {
    throw new IdentityError('IDENTITY_VALIDATION_ERROR');
  }
}

function mapRoleRows(rows: readonly { role: string }[]): FoundationRole[] {
  const roles = rows
    .map((row) => row.role)
    .filter((role): role is FoundationRole => foundationRoles.includes(role as FoundationRole));
  if (roles.length !== rows.length) throw new IdentityError('IDENTITY_DEPENDENCY_UNAVAILABLE');
  return roles;
}

export function createSyntheticIdentityAdapter(
  databaseEnvironment: DatabaseEnvironment,
  identityEnvironment: IdentityEnvironment,
): SyntheticIdentityAdapter {
  if (!identityEnvironment.SYNTHETIC_IDENTITY_ENABLED) {
    throw new IdentityError('IDENTITY_VALIDATION_ERROR');
  }
  const pool = new Pool({
    connectionString: databaseEnvironment.DATABASE_URL,
    connectionTimeoutMillis: Math.min(databaseEnvironment.DATABASE_STATEMENT_TIMEOUT_MS, 10_000),
    max: 4,
    statement_timeout: databaseEnvironment.DATABASE_STATEMENT_TIMEOUT_MS,
  });
  const sessionKey = Buffer.from(identityEnvironment.SESSION_SIGNING_KEY, 'utf8');

  const tokenHash = (token: string): string =>
    createHmac('sha256', sessionKey).update(token).digest('hex');

  async function inTransaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect().catch(() => {
      throw new IdentityError('IDENTITY_DEPENDENCY_UNAVAILABLE');
    });
    try {
      await client.query('BEGIN');
      const result = await operation(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      if (error instanceof IdentityError) throw error;
      if (error instanceof Error && 'code' in error && error.code === '23505') {
        throw new IdentityError('IDENTITY_CONFLICT');
      }
      throw new IdentityError('IDENTITY_DEPENDENCY_UNAVAILABLE');
    } finally {
      client.release();
    }
  }

  async function appendAudit(
    client: PoolClient,
    principal: IdentityPrincipal,
    context: AuditContextInput,
    action: string,
    targetType: string,
    targetId: string,
    outcome: 'SUCCEEDED' | 'DENIED' | 'FAILED' = 'SUCCEEDED',
    reasonCode?: string,
  ): Promise<void> {
    const audit = createIdentityAuditContext(principal, context);
    await client.query(
      `
        INSERT INTO audit_event (
          actor_type, actor_identity_id, action, outcome, correlation_id, request_id,
          target_type, target_id, reason_code
        ) VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        audit.actorType,
        audit.actorIdentityId,
        action,
        outcome,
        audit.correlationId,
        audit.requestId ?? null,
        targetType,
        targetId,
        reasonCode ?? null,
      ],
    );
  }

  async function authenticate(credential: IdentityCredential): Promise<IdentityPrincipal> {
    const token = tokenSchema.safeParse(credential.token);
    if (!token.success) throw new IdentityError('IDENTITY_AUTHENTICATION_REQUIRED');
    try {
      const result = await pool.query<{
        actor_id: string;
        provider: string;
        role: string;
        session_id: string;
      }>(
        `
          WITH active_session AS (
            UPDATE synthetic_session AS session
            SET last_seen_at = NOW()
            FROM actor_identity AS actor
            WHERE session.token_hash = $1
              AND session.revoked_at IS NULL
              AND session.expires_at > NOW()
              AND actor.id = session.actor_id
              AND actor.disabled_at IS NULL
            RETURNING actor.id AS actor_id, actor.provider, session.id AS session_id
          )
          SELECT active_session.actor_id::text, active_session.provider,
                 grant_row.role::text AS role, active_session.session_id::text
          FROM active_session
          JOIN role_grant AS grant_row ON grant_row.actor_id = active_session.actor_id
          WHERE grant_row.revoked_at IS NULL
          ORDER BY grant_row.role::text
        `,
        [tokenHash(token.data)],
      );
      if (result.rows.length === 0) {
        throw new IdentityError('IDENTITY_AUTHENTICATION_REQUIRED');
      }
      const first = result.rows[0];
      if (first === undefined) throw new IdentityError('IDENTITY_AUTHENTICATION_REQUIRED');
      const roles = mapRoleRows(result.rows);
      const expectedWorkload = credential.kind === 'synthetic-workload';
      const isWorkload = first.provider === 'synthetic-workload';
      if (expectedWorkload !== isWorkload) {
        throw new IdentityError('IDENTITY_AUTHENTICATION_REQUIRED');
      }
      const principal: IdentityPrincipal = {
        actorId: first.actor_id,
        kind: isWorkload ? 'WORKLOAD' : 'HUMAN',
        roles,
        sessionId: first.session_id,
      };
      requirePermission({
        capability: isWorkload ? 'foundation.system.execute' : 'foundation.identity.self_read',
        principal,
        ...(isWorkload ? {} : { resource: { ownerActorId: first.actor_id } }),
      });
      return principal;
    } catch (error) {
      if (error instanceof IdentityError) throw error;
      throw new IdentityError('IDENTITY_DEPENDENCY_UNAVAILABLE');
    }
  }

  const adapter: SyntheticIdentityAdapter = {
    authenticate,
    close: () => pool.end(),
    async createActor(input) {
      const subject = subjectSchema.safeParse(input.subject);
      validateContext(input);
      validateActorRoles(input.kind, input.roles);
      if (!subject.success) throw new IdentityError('IDENTITY_VALIDATION_ERROR');
      return inTransaction(async (client) => {
        const provider = input.kind === 'WORKLOAD' ? 'synthetic-workload' : 'synthetic-user';
        const actor = await client.query<{ id: string }>(
          `
            INSERT INTO actor_identity (provider, subject, updated_at)
            VALUES ($1, $2, NOW())
            RETURNING id::text
          `,
          [provider, subject.data],
        );
        const actorId = actor.rows[0]?.id;
        if (actorId === undefined) throw new IdentityError('IDENTITY_DEPENDENCY_UNAVAILABLE');
        for (const role of input.roles) {
          await client.query(
            `INSERT INTO role_grant (actor_id, role) VALUES ($1::uuid, $2::system_role)`,
            [actorId, role],
          );
          await appendAudit(
            client,
            { actorId: null, kind: 'WORKLOAD', roles: ['SYSTEM_WORKER'], sessionId: 'bootstrap' },
            input,
            'FOUNDATION_SYNTHETIC_ROLE_BOOTSTRAPPED',
            'ACTOR_IDENTITY',
            actorId,
          );
        }
        return { actorId, kind: input.kind };
      });
    },
    async grantHumanRole(targetActorId, role, granter, context) {
      requirePermission({ capability: 'foundation.role.manage', principal: granter });
      validateContext(context);
      if (!actorIdSchema.safeParse(targetActorId).success || !humanRoles.includes(role)) {
        throw new IdentityError('IDENTITY_VALIDATION_ERROR');
      }
      await inTransaction(async (client) => {
        const target = await client.query<{ provider: string }>(
          `SELECT provider FROM actor_identity WHERE id = $1::uuid AND disabled_at IS NULL FOR UPDATE`,
          [targetActorId],
        );
        if (target.rows[0]?.provider !== 'synthetic-user') {
          throw new IdentityError('IDENTITY_CONFLICT');
        }
        await client.query(
          `
            INSERT INTO role_grant (actor_id, role, granted_by_actor_id)
            VALUES ($1::uuid, $2::system_role, $3::uuid)
            ON CONFLICT (actor_id, role) DO UPDATE SET
              granted_by_actor_id = EXCLUDED.granted_by_actor_id,
              granted_at = NOW(),
              revoked_at = NULL
          `,
          [targetActorId, role, granter.actorId],
        );
        await appendAudit(
          client,
          granter,
          context,
          'FOUNDATION_ROLE_GRANTED',
          'ACTOR_IDENTITY',
          targetActorId,
        );
      });
    },
    async issueCredential(actorId, kind, expiresAt, context) {
      validateContext(context);
      if (!actorIdSchema.safeParse(actorId).success || !(expiresAt instanceof Date)) {
        throw new IdentityError('IDENTITY_VALIDATION_ERROR');
      }
      const ttl = expiresAt.getTime() - Date.now();
      if (!Number.isFinite(ttl) || ttl <= 0 || ttl > 24 * 60 * 60 * 1_000) {
        throw new IdentityError('IDENTITY_VALIDATION_ERROR');
      }
      const token = `syn1_${randomBytes(32).toString('base64url')}`;
      await inTransaction(async (client) => {
        const provider = await client.query<{ provider: string }>(
          `SELECT provider FROM actor_identity WHERE id = $1::uuid AND disabled_at IS NULL FOR UPDATE`,
          [actorId],
        );
        const expectedProvider =
          kind === 'synthetic-workload' ? 'synthetic-workload' : 'synthetic-user';
        if (provider.rows[0]?.provider !== expectedProvider) {
          throw new IdentityError('IDENTITY_CONFLICT');
        }
        await client.query(
          `INSERT INTO synthetic_session (actor_id, token_hash, expires_at) VALUES ($1::uuid, $2, $3)`,
          [actorId, tokenHash(token), expiresAt],
        );
        const principal: IdentityPrincipal = {
          actorId,
          kind: kind === 'synthetic-workload' ? 'WORKLOAD' : 'HUMAN',
          roles: kind === 'synthetic-workload' ? ['SYSTEM_WORKER'] : ['CUSTOMER'],
          sessionId: 'credential-issuance',
        };
        await appendAudit(
          client,
          principal,
          context,
          'FOUNDATION_SYNTHETIC_CREDENTIAL_ISSUED',
          'ACTOR_IDENTITY',
          actorId,
        );
      });
      return { kind, token };
    },
    async revokeAllActorCredentials(actorId, granter, context) {
      requirePermission({ capability: 'foundation.role.manage', principal: granter });
      validateContext(context);
      if (!actorIdSchema.safeParse(actorId).success) {
        throw new IdentityError('IDENTITY_VALIDATION_ERROR');
      }
      await inTransaction(async (client) => {
        await client.query(
          `UPDATE synthetic_session SET revoked_at = NOW() WHERE actor_id = $1::uuid AND revoked_at IS NULL`,
          [actorId],
        );
        await appendAudit(
          client,
          granter,
          context,
          'FOUNDATION_SESSIONS_REVOKED',
          'ACTOR_IDENTITY',
          actorId,
        );
      });
    },
    async revokeCredential(credential, context) {
      validateContext(context);
      const principal = await authenticate(credential);
      await inTransaction(async (client) => {
        await client.query(
          `UPDATE synthetic_session SET revoked_at = NOW() WHERE id = $1::uuid AND revoked_at IS NULL`,
          [principal.sessionId],
        );
        await appendAudit(
          client,
          principal,
          context,
          'FOUNDATION_SESSION_REVOKED',
          'ACTOR_IDENTITY',
          principal.actorId ?? 'anonymous',
        );
      });
    },
    async revokeHumanRole(targetActorId, role, granter, context) {
      requirePermission({ capability: 'foundation.role.manage', principal: granter });
      validateContext(context);
      if (!actorIdSchema.safeParse(targetActorId).success || !humanRoles.includes(role)) {
        throw new IdentityError('IDENTITY_VALIDATION_ERROR');
      }
      await inTransaction(async (client) => {
        const updated = await client.query(
          `
            UPDATE role_grant SET revoked_at = NOW()
            WHERE actor_id = $1::uuid AND role = $2::system_role AND revoked_at IS NULL
            RETURNING id
          `,
          [targetActorId, role],
        );
        if (updated.rowCount !== 1) throw new IdentityError('IDENTITY_CONFLICT');
        await appendAudit(
          client,
          granter,
          context,
          'FOUNDATION_ROLE_REVOKED',
          'ACTOR_IDENTITY',
          targetActorId,
        );
      });
    },
  };
  return adapter;
}
