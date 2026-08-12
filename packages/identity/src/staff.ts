import type { DatabaseEnvironment, IdentityEnvironment } from '@project-name/config/server';
import { normalizeEmailAddress, sealEmailMessage } from '@project-name/notifications';
import { createHmac, randomBytes, randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import { z } from 'zod';

import { IdentityError } from './errors.js';
import type { AuditContextInput, FoundationRole, IdentityPrincipal } from './types.js';

export const staffRoles = ['MANAGER', 'ADMIN', 'OWNER'] as const;
export type StaffRole = (typeof staffRoles)[number];

const actorIdSchema = z.string().uuid();
const correlationSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/);
const invitationTokenSchema = z.string().regex(/^inv1_[A-Za-z0-9_-]{43}$/);
const sessionIdSchema = z.string().uuid();

export interface StaffDirectoryEntry {
  readonly actorId: string;
  readonly disabledAt: string | null;
  readonly email: string;
  readonly roles: readonly StaffRole[];
  readonly activeSessionCount: number;
}

export interface StaffInvitationEntry {
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly invitationId: string;
  readonly role: StaffRole;
  readonly status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
}

export interface StaffSessionEntry {
  readonly actorId: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly isCurrent: boolean;
  readonly lastSeenAt: string | null;
  readonly revokedAt: string | null;
  readonly sessionId: string;
}

export interface StaffAdministrationAdapter {
  acceptInvitation(token: string, context: AuditContextInput): Promise<{ actorId: string }>;
  changeRole(
    principal: IdentityPrincipal,
    targetActorId: string,
    role: StaffRole,
    context: AuditContextInput,
  ): Promise<void>;
  close(): Promise<void>;
  createInvitation(input: {
    readonly context: AuditContextInput;
    readonly email: string;
    readonly origin: string;
    readonly principal: IdentityPrincipal;
    readonly role: StaffRole;
  }): Promise<{ deliveryId: string; invitationId: string }>;
  disableStaff(
    principal: IdentityPrincipal,
    targetActorId: string,
    context: AuditContextInput,
  ): Promise<void>;
  listInvitations(principal: IdentityPrincipal): Promise<readonly StaffInvitationEntry[]>;
  listSessions(principal: IdentityPrincipal): Promise<readonly StaffSessionEntry[]>;
  listStaff(principal: IdentityPrincipal): Promise<readonly StaffDirectoryEntry[]>;
  revokeInvitation(
    principal: IdentityPrincipal,
    invitationId: string,
    context: AuditContextInput,
  ): Promise<void>;
  revokeSession(
    principal: IdentityPrincipal,
    sessionId: string,
    context: AuditContextInput,
  ): Promise<void>;
}

function validateContext(context: AuditContextInput): void {
  if (
    !correlationSchema.safeParse(context.correlationId).success ||
    (context.requestId !== undefined && !correlationSchema.safeParse(context.requestId).success)
  ) {
    throw new IdentityError('IDENTITY_VALIDATION_ERROR');
  }
}

function principalActorId(principal: IdentityPrincipal): string {
  if (
    principal.kind !== 'HUMAN' ||
    principal.actorId === null ||
    !actorIdSchema.safeParse(principal.actorId).success ||
    !principal.roles.some((role) => staffRoles.includes(role as StaffRole))
  ) {
    throw new IdentityError('IDENTITY_PERMISSION_DENIED');
  }
  return principal.actorId;
}

function hasRole(principal: IdentityPrincipal, role: StaffRole): boolean {
  return principal.roles.includes(role as FoundationRole);
}

function requireDirectoryAccess(principal: IdentityPrincipal): string {
  const actorId = principalActorId(principal);
  if (!hasRole(principal, 'OWNER') && !hasRole(principal, 'ADMIN')) {
    throw new IdentityError('IDENTITY_PERMISSION_DENIED');
  }
  return actorId;
}

function mapDatabaseError(error: unknown): IdentityError {
  if (error instanceof IdentityError) return error;
  if (error instanceof Error && 'code' in error) {
    if (error.code === '23505' || error.code === '23514') {
      return new IdentityError('IDENTITY_CONFLICT');
    }
  }
  return new IdentityError('IDENTITY_DEPENDENCY_UNAVAILABLE');
}

export function createStaffAdministrationAdapter(
  databaseEnvironment: DatabaseEnvironment,
  identityEnvironment: IdentityEnvironment,
): StaffAdministrationAdapter {
  const pool = new Pool({
    connectionString: databaseEnvironment.DATABASE_URL,
    connectionTimeoutMillis: Math.min(databaseEnvironment.DATABASE_STATEMENT_TIMEOUT_MS, 10_000),
    max: 5,
    statement_timeout: databaseEnvironment.DATABASE_STATEMENT_TIMEOUT_MS,
  });
  const secret = identityEnvironment.SESSION_SIGNING_KEY;
  const invitationHash = (token: string): string =>
    createHmac('sha256', secret).update('staff-invitation\0').update(token).digest('hex');

  async function transaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
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
      throw mapDatabaseError(error);
    } finally {
      client.release();
    }
  }

  async function audit(
    client: PoolClient,
    actorId: string | null,
    context: AuditContextInput,
    action: string,
    targetType: 'STAFF_INVITATION' | 'STAFF_SESSION' | 'STAFF_IDENTITY',
    targetId: string,
  ): Promise<void> {
    await client.query(
      `
        INSERT INTO audit_event (
          actor_type, actor_identity_id, action, outcome, correlation_id, request_id,
          target_type, target_id
        ) VALUES ($1::audit_actor_type, $2::uuid, $3, 'SUCCEEDED', $4, $5, $6, $7)
      `,
      [
        actorId === null ? 'ANONYMOUS' : 'IDENTITY',
        actorId,
        action,
        context.correlationId,
        context.requestId ?? null,
        targetType,
        targetId,
      ],
    );
  }

  async function targetRoles(client: PoolClient, targetActorId: string): Promise<StaffRole[]> {
    const result = await client.query<{ role: StaffRole }>(
      `
        SELECT grant_row.role::text AS role
        FROM actor_identity actor
        JOIN role_grant grant_row ON grant_row.actor_id = actor.id
        WHERE actor.id = $1::uuid AND actor.disabled_at IS NULL
          AND grant_row.revoked_at IS NULL
          AND grant_row.role IN ('MANAGER', 'ADMIN', 'OWNER')
        FOR UPDATE OF actor, grant_row
      `,
      [targetActorId],
    );
    if (result.rows.length === 0) throw new IdentityError('IDENTITY_CONFLICT');
    return result.rows.map((row) => row.role);
  }

  return {
    async acceptInvitation(token, context) {
      validateContext(context);
      const parsed = invitationTokenSchema.safeParse(token);
      if (!parsed.success) throw new IdentityError('IDENTITY_AUTHENTICATION_REQUIRED');
      return transaction(async (client) => {
        const invitation = await client.query<{
          email_normalized: string;
          id: string;
          role: StaffRole;
        }>(
          `
            SELECT id::text, email_normalized, role::text AS role
            FROM staff_invitation
            WHERE token_hash = $1 AND status = 'PENDING' AND expires_at > NOW()
            FOR UPDATE
          `,
          [invitationHash(parsed.data)],
        );
        const row = invitation.rows[0];
        if (row === undefined) throw new IdentityError('IDENTITY_AUTHENTICATION_REQUIRED');
        const actor = await client.query<{ disabled_at: Date | null; id: string }>(
          `
            INSERT INTO actor_identity (provider, subject, updated_at)
            VALUES ('passwordless-email', $1, NOW())
            ON CONFLICT (provider, subject) DO UPDATE SET updated_at = NOW()
            RETURNING id::text, disabled_at
          `,
          [row.email_normalized],
        );
        const actorRow = actor.rows[0];
        if (actorRow === undefined || actorRow.disabled_at !== null) {
          throw new IdentityError('IDENTITY_PERMISSION_DENIED');
        }
        await client.query(
          `
            INSERT INTO role_grant (actor_id, role, granted_by_actor_id)
            SELECT $1::uuid, $2::system_role, invited_by_id
            FROM staff_invitation WHERE id = $3::uuid
            ON CONFLICT (actor_id, role) DO UPDATE SET
              granted_by_actor_id = EXCLUDED.granted_by_actor_id,
              granted_at = NOW(), revoked_at = NULL
          `,
          [actorRow.id, row.role, row.id],
        );
        await client.query(
          `
            UPDATE staff_invitation
            SET status = 'ACCEPTED', accepted_by_id = $2::uuid,
                accepted_at = NOW(), updated_at = NOW()
            WHERE id = $1::uuid
          `,
          [row.id, actorRow.id],
        );
        await audit(
          client,
          actorRow.id,
          context,
          'STAFF_INVITATION_ACCEPTED',
          'STAFF_INVITATION',
          row.id,
        );
        return { actorId: actorRow.id };
      });
    },
    async changeRole(principal, targetActorId, role, context) {
      const callerId = requireDirectoryAccess(principal);
      validateContext(context);
      if (!actorIdSchema.safeParse(targetActorId).success || !staffRoles.includes(role)) {
        throw new IdentityError('IDENTITY_VALIDATION_ERROR');
      }
      await transaction(async (client) => {
        await client.query(`SELECT pg_advisory_xact_lock(hashtext('project-name:last-owner'))`);
        const currentRoles = await targetRoles(client, targetActorId);
        const callerIsOwner = hasRole(principal, 'OWNER');
        if (
          !callerIsOwner &&
          (role !== 'MANAGER' || currentRoles.includes('OWNER') || targetActorId === callerId)
        ) {
          throw new IdentityError('IDENTITY_PERMISSION_DENIED');
        }
        await client.query(
          `
            INSERT INTO role_grant (actor_id, role, granted_by_actor_id)
            VALUES ($1::uuid, $2::system_role, $3::uuid)
            ON CONFLICT (actor_id, role) DO UPDATE SET
              granted_by_actor_id = EXCLUDED.granted_by_actor_id,
              granted_at = NOW(), revoked_at = NULL
          `,
          [targetActorId, role, callerId],
        );
        await client.query(
          `
            UPDATE role_grant SET revoked_at = NOW()
            WHERE actor_id = $1::uuid AND role IN ('MANAGER', 'ADMIN', 'OWNER')
              AND role <> $2::system_role AND revoked_at IS NULL
          `,
          [targetActorId, role],
        );
        await client.query(
          `UPDATE staff_session SET revoked_at = NOW() WHERE actor_id = $1::uuid AND revoked_at IS NULL`,
          [targetActorId],
        );
        await audit(
          client,
          callerId,
          context,
          'STAFF_ROLE_CHANGED',
          'STAFF_IDENTITY',
          targetActorId,
        );
      });
    },
    close: () => pool.end(),
    async createInvitation(input) {
      const callerId = requireDirectoryAccess(input.principal);
      validateContext(input.context);
      const email = normalizeEmailAddress(input.email);
      const role = z.enum(staffRoles).parse(input.role);
      const origin = z.url().parse(input.origin).replace(/\/$/, '');
      if (!/^https?:\/\//.test(origin)) throw new IdentityError('IDENTITY_VALIDATION_ERROR');
      const callerIsOwner = hasRole(input.principal, 'OWNER');
      if (!callerIsOwner && role !== 'MANAGER') {
        throw new IdentityError('IDENTITY_PERMISSION_DENIED');
      }
      return transaction(async (client) => {
        const alreadyStaff = await client.query<{ exists: boolean }>(
          `
            SELECT EXISTS (
              SELECT 1 FROM actor_identity actor
              JOIN role_grant grant_row ON grant_row.actor_id = actor.id
              WHERE actor.provider = 'passwordless-email' AND actor.subject = $1
                AND actor.disabled_at IS NULL AND grant_row.revoked_at IS NULL
                AND grant_row.role IN ('MANAGER', 'ADMIN', 'OWNER')
            ) AS exists
          `,
          [email],
        );
        if (alreadyStaff.rows[0]?.exists === true) throw new IdentityError('IDENTITY_CONFLICT');
        await client.query(
          `
            UPDATE staff_invitation SET status = 'REVOKED', revoked_at = NOW(), updated_at = NOW()
            WHERE email_normalized = $1 AND status = 'PENDING'
          `,
          [email],
        );
        const invitationId = randomUUID();
        const token = `inv1_${randomBytes(32).toString('base64url')}`;
        await client.query(
          `
            INSERT INTO staff_invitation (
              id, email_normalized, role, token_hash, invited_by_id, expires_at
            ) VALUES ($1::uuid, $2, $3::system_role, $4, $5::uuid, NOW() + INTERVAL '72 hours')
          `,
          [invitationId, email, role, invitationHash(token), callerId],
        );
        const deliveryId = randomUUID();
        const message = sealEmailMessage(
          {
            recipient: email,
            subject: 'Приглашение в управление PROJECT_NAME',
            text: `Вас пригласили в команду PROJECT_NAME.\n\nПринять приглашение: ${origin}/staff/invitations/accept#${token}\n\nСсылка действует 72 часа и используется один раз.`,
          },
          secret,
        );
        await client.query(
          `
            INSERT INTO email_delivery (
              id, kind, sealed_message, correlation_id, idempotency_key
            ) VALUES ($1::uuid, 'STAFF_INVITATION', $2, $3, $4)
          `,
          [deliveryId, message, input.context.correlationId, `staff-invitation:${invitationId}`],
        );
        await client.query(
          `
            INSERT INTO outbox_event (
              topic, schema_version, payload, idempotency_key, correlation_id, status
            ) VALUES ('staff.invitation.created', 1, $1::jsonb, $2, $3, 'PENDING')
          `,
          [
            JSON.stringify({ deliveryId, invitationId }),
            `staff-invitation:${invitationId}`,
            input.context.correlationId,
          ],
        );
        await audit(
          client,
          callerId,
          input.context,
          'STAFF_INVITATION_CREATED',
          'STAFF_INVITATION',
          invitationId,
        );
        return { deliveryId, invitationId };
      });
    },
    async disableStaff(principal, targetActorId, context) {
      const callerId = requireDirectoryAccess(principal);
      validateContext(context);
      if (!actorIdSchema.safeParse(targetActorId).success || targetActorId === callerId) {
        throw new IdentityError('IDENTITY_VALIDATION_ERROR');
      }
      await transaction(async (client) => {
        await client.query(`SELECT pg_advisory_xact_lock(hashtext('project-name:last-owner'))`);
        const roles = await targetRoles(client, targetActorId);
        if (!hasRole(principal, 'OWNER') && !roles.every((role) => role === 'MANAGER')) {
          throw new IdentityError('IDENTITY_PERMISSION_DENIED');
        }
        const updated = await client.query(
          `UPDATE actor_identity SET disabled_at = NOW(), updated_at = NOW() WHERE id = $1::uuid AND disabled_at IS NULL`,
          [targetActorId],
        );
        if (updated.rowCount !== 1) throw new IdentityError('IDENTITY_CONFLICT');
        await client.query(
          `UPDATE staff_session SET revoked_at = NOW() WHERE actor_id = $1::uuid AND revoked_at IS NULL`,
          [targetActorId],
        );
        await audit(client, callerId, context, 'STAFF_DISABLED', 'STAFF_IDENTITY', targetActorId);
      });
    },
    async listInvitations(principal) {
      requireDirectoryAccess(principal);
      try {
        const result = await pool.query<{
          created_at: Date;
          expires_at: Date;
          id: string;
          role: StaffRole;
          status: StaffInvitationEntry['status'];
        }>(
          `
            SELECT id::text, role::text, status::text, created_at, expires_at
            FROM staff_invitation
            ORDER BY created_at DESC LIMIT 100
          `,
        );
        return result.rows.map((row) => ({
          createdAt: row.created_at.toISOString(),
          expiresAt: row.expires_at.toISOString(),
          invitationId: row.id,
          role: row.role,
          status: row.status,
        }));
      } catch (error) {
        throw mapDatabaseError(error);
      }
    },
    async listSessions(principal) {
      const callerId = principalActorId(principal);
      const directory = hasRole(principal, 'OWNER') || hasRole(principal, 'ADMIN');
      try {
        const result = await pool.query<{
          actor_id: string;
          created_at: Date;
          expires_at: Date;
          id: string;
          last_seen_at: Date | null;
          revoked_at: Date | null;
        }>(
          `
            SELECT session.id::text, session.actor_id::text, session.created_at,
                   session.last_seen_at, session.expires_at, session.revoked_at
            FROM staff_session session
            WHERE ($1::boolean OR session.actor_id = $2::uuid)
            ORDER BY session.created_at DESC LIMIT 200
          `,
          [directory, callerId],
        );
        return result.rows.map((row) => ({
          actorId: row.actor_id,
          createdAt: row.created_at.toISOString(),
          expiresAt: row.expires_at.toISOString(),
          isCurrent: row.id === principal.sessionId,
          lastSeenAt: row.last_seen_at?.toISOString() ?? null,
          revokedAt: row.revoked_at?.toISOString() ?? null,
          sessionId: row.id,
        }));
      } catch (error) {
        throw mapDatabaseError(error);
      }
    },
    async listStaff(principal) {
      requireDirectoryAccess(principal);
      try {
        const result = await pool.query<{
          active_session_count: string;
          disabled_at: Date | null;
          id: string;
          role: StaffRole;
          subject: string;
        }>(
          `
            SELECT actor.id::text, actor.subject, actor.disabled_at,
                   grant_row.role::text AS role,
                   (SELECT count(*)::text FROM staff_session session
                    WHERE session.actor_id = actor.id AND session.revoked_at IS NULL
                      AND session.expires_at > NOW()) AS active_session_count
            FROM actor_identity actor
            JOIN role_grant grant_row ON grant_row.actor_id = actor.id
            WHERE actor.provider = 'passwordless-email'
              AND grant_row.revoked_at IS NULL
              AND grant_row.role IN ('MANAGER', 'ADMIN', 'OWNER')
            ORDER BY actor.created_at, grant_row.role::text
          `,
        );
        const directory = new Map<string, StaffDirectoryEntry>();
        for (const row of result.rows) {
          const current = directory.get(row.id);
          directory.set(row.id, {
            activeSessionCount: Number(row.active_session_count),
            actorId: row.id,
            disabledAt: row.disabled_at?.toISOString() ?? null,
            email: row.subject,
            roles: [...(current?.roles ?? []), row.role],
          });
        }
        return [...directory.values()];
      } catch (error) {
        throw mapDatabaseError(error);
      }
    },
    async revokeInvitation(principal, invitationId, context) {
      const callerId = requireDirectoryAccess(principal);
      validateContext(context);
      if (!actorIdSchema.safeParse(invitationId).success) {
        throw new IdentityError('IDENTITY_VALIDATION_ERROR');
      }
      await transaction(async (client) => {
        const invitation = await client.query<{ role: StaffRole }>(
          `SELECT role::text FROM staff_invitation WHERE id = $1::uuid AND status = 'PENDING' FOR UPDATE`,
          [invitationId],
        );
        const row = invitation.rows[0];
        if (row === undefined) throw new IdentityError('IDENTITY_CONFLICT');
        if (!hasRole(principal, 'OWNER') && row.role !== 'MANAGER') {
          throw new IdentityError('IDENTITY_PERMISSION_DENIED');
        }
        await client.query(
          `UPDATE staff_invitation SET status = 'REVOKED', revoked_at = NOW(), updated_at = NOW() WHERE id = $1::uuid`,
          [invitationId],
        );
        await audit(
          client,
          callerId,
          context,
          'STAFF_INVITATION_REVOKED',
          'STAFF_INVITATION',
          invitationId,
        );
      });
    },
    async revokeSession(principal, sessionId, context) {
      const callerId = principalActorId(principal);
      validateContext(context);
      if (!sessionIdSchema.safeParse(sessionId).success) {
        throw new IdentityError('IDENTITY_VALIDATION_ERROR');
      }
      await transaction(async (client) => {
        const target = await client.query<{ actor_id: string; role: StaffRole }>(
          `
            SELECT session.actor_id::text, grant_row.role::text AS role
            FROM staff_session session
            JOIN role_grant grant_row ON grant_row.actor_id = session.actor_id
            WHERE session.id = $1::uuid AND grant_row.revoked_at IS NULL
              AND grant_row.role IN ('MANAGER', 'ADMIN', 'OWNER')
            FOR UPDATE OF session
          `,
          [sessionId],
        );
        const targetActorId = target.rows[0]?.actor_id;
        if (targetActorId === undefined) throw new IdentityError('IDENTITY_CONFLICT');
        const targetIsOwner = target.rows.some((row) => row.role === 'OWNER');
        if (
          targetActorId !== callerId &&
          !hasRole(principal, 'OWNER') &&
          (!hasRole(principal, 'ADMIN') || targetIsOwner)
        ) {
          throw new IdentityError('IDENTITY_PERMISSION_DENIED');
        }
        await client.query(
          `UPDATE staff_session SET revoked_at = NOW() WHERE id = $1::uuid AND revoked_at IS NULL`,
          [sessionId],
        );
        await audit(client, callerId, context, 'STAFF_SESSION_REVOKED', 'STAFF_SESSION', sessionId);
      });
    },
  };
}
