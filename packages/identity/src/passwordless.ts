import type { DatabaseEnvironment, IdentityEnvironment } from '@project-name/config/server';
import {
  normalizeEmailAddress,
  openEmailMessage,
  sealEmailMessage,
  type EmailDeliveryPort,
} from '@project-name/notifications';
import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import { z } from 'zod';

import { IdentityError } from './errors.js';
import type { AuditContextInput, FoundationRole, IdentityPrincipal } from './types.js';

const codeSchema = z.string().regex(/^\d{6}$/);
const correlationSchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9._:-]+$/);
const staffTokenPattern = /^stf1_[A-Za-z0-9_-]{43}$/;
const staffRoles = ['MANAGER', 'ADMIN', 'OWNER'] as const;

export type PasswordlessPurpose = 'STAFF_LOGIN';
export type AccountSessionKind = 'STAFF';

export interface PasswordlessSessionPrincipal extends IdentityPrincipal {
  readonly actorId: string;
  readonly kind: 'HUMAN';
  readonly sessionId: string;
  readonly sessionKind: AccountSessionKind;
  readonly expiresAt: string;
  readonly rotationDue: boolean;
}

export interface PasswordlessCredential {
  readonly kind: 'STAFF';
  readonly token: string;
}

export interface PasswordlessCodeRequest {
  readonly email: string;
  readonly purpose: PasswordlessPurpose;
  readonly clientBucket: string;
  readonly context: AuditContextInput;
}

export interface PasswordlessCodeVerification extends PasswordlessCodeRequest {
  readonly code: string;
}

export interface PasswordlessCodeRequestResult {
  readonly deliveryId: string | null;
}

export interface PasswordlessVerificationResult {
  readonly credential: PasswordlessCredential;
  readonly principal: PasswordlessSessionPrincipal;
}

export interface PasswordlessIdentityAdapter {
  authenticateSession(credential: PasswordlessCredential): Promise<PasswordlessSessionPrincipal>;
  bootstrapLocalOwner(email: string, context: AuditContextInput): Promise<{ actorId: string }>;
  close(): Promise<void>;
  requestCode(input: PasswordlessCodeRequest): Promise<PasswordlessCodeRequestResult>;
  revokeSession(credential: PasswordlessCredential, context: AuditContextInput): Promise<void>;
  rotateSession(
    credential: PasswordlessCredential,
    context: AuditContextInput,
  ): Promise<PasswordlessVerificationResult>;
  verifyCode(input: PasswordlessCodeVerification): Promise<PasswordlessVerificationResult>;
}

interface SessionRow {
  actor_id: string;
  expires_at: Date;
  role: string;
  session_id: string;
  rotation_due_at: Date;
}

function validateContext(context: AuditContextInput): void {
  if (
    !correlationSchema.safeParse(context.correlationId).success ||
    (context.requestId !== undefined && !correlationSchema.safeParse(context.requestId).success)
  ) {
    throw new IdentityError('IDENTITY_VALIDATION_ERROR');
  }
}

function mapRoles(rows: readonly SessionRow[]): FoundationRole[] {
  const allowed = new Set<FoundationRole>(['CUSTOMER', 'MANAGER', 'ADMIN', 'OWNER']);
  const roles = [...new Set(rows.map((row) => row.role))].filter((role): role is FoundationRole =>
    allowed.has(role as FoundationRole),
  );
  if (roles.length === 0) throw new IdentityError('IDENTITY_AUTHENTICATION_REQUIRED');
  return roles;
}

export function createPasswordlessIdentityAdapter(
  databaseEnvironment: DatabaseEnvironment,
  identityEnvironment: IdentityEnvironment,
): PasswordlessIdentityAdapter {
  const pool = new Pool({
    connectionString: databaseEnvironment.DATABASE_URL,
    connectionTimeoutMillis: Math.min(databaseEnvironment.DATABASE_STATEMENT_TIMEOUT_MS, 10_000),
    max: 6,
    statement_timeout: databaseEnvironment.DATABASE_STATEMENT_TIMEOUT_MS,
  });
  const secret = identityEnvironment.SESSION_SIGNING_KEY;

  const keyedHash = (namespace: string, value: string): string =>
    createHmac('sha256', secret).update(namespace).update('\0').update(value).digest('hex');
  const codeHash = (challengeId: string, email: string, code: string): string =>
    keyedHash('otp', `${challengeId}\0${email}\0${code}`);
  const sessionHash = (token: string): string => keyedHash('session', token);

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
      if (identityEnvironment.APP_ENV === 'local') {
        process.stderr.write(
          `${JSON.stringify({
            code:
              error instanceof Error && 'code' in error && typeof error.code === 'string'
                ? error.code
                : 'UNKNOWN',
            event: 'identity.database.operation.failed',
          })}\n`,
        );
      }
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
    actorId: string | null,
    context: AuditContextInput,
    action: string,
    outcome: 'SUCCEEDED' | 'DENIED' | 'FAILED' = 'SUCCEEDED',
    reasonCode?: string,
  ): Promise<void> {
    await client.query(
      `
        INSERT INTO audit_event (
          actor_type, actor_identity_id, action, outcome, correlation_id, request_id,
          target_type, target_id, reason_code
        ) VALUES ($1::audit_actor_type, $2::uuid, $3, $4::audit_outcome, $5, $6,
                  'IDENTITY', NULL, $7)
      `,
      [
        actorId === null ? 'ANONYMOUS' : 'IDENTITY',
        actorId,
        action,
        outcome,
        context.correlationId,
        context.requestId ?? null,
        reasonCode ?? null,
      ],
    );
  }

  async function consumeRateLimit(
    client: PoolClient,
    bucket: string,
    subjectHash: string,
    maximum: number,
    windowSeconds: number,
  ): Promise<void> {
    const result = await client.query<{ count: number }>(
      `
        INSERT INTO auth_rate_limit (bucket, subject_hash, window_start, count, updated_at)
        VALUES ($1, $2, NOW(), 1, NOW())
        ON CONFLICT (bucket, subject_hash) DO UPDATE SET
          window_start = CASE
            WHEN auth_rate_limit.window_start <= NOW() - ($3::text || ' seconds')::interval
              THEN NOW()
            ELSE auth_rate_limit.window_start
          END,
          count = CASE
            WHEN auth_rate_limit.window_start <= NOW() - ($3::text || ' seconds')::interval
              THEN 1
            ELSE auth_rate_limit.count + 1
          END,
          updated_at = NOW()
        RETURNING count
      `,
      [bucket, subjectHash, windowSeconds],
    );
    if ((result.rows[0]?.count ?? maximum + 1) > maximum) {
      throw new IdentityError('IDENTITY_RATE_LIMITED');
    }
  }

  async function issueSession(
    client: PoolClient,
    actorId: string,
    context: AuditContextInput,
    absoluteExpiry?: Date,
  ): Promise<PasswordlessVerificationResult> {
    const now = Date.now();
    const defaultTtl = 12 * 60 * 60 * 1_000;
    const expiresAt = absoluteExpiry ?? new Date(now + defaultTtl);
    if (expiresAt.getTime() <= now) throw new IdentityError('IDENTITY_AUTHENTICATION_REQUIRED');
    const rotationDueAt = new Date(Math.min(expiresAt.getTime(), now + 6 * 60 * 60 * 1_000));
    const token = `stf1_${randomBytes(32).toString('base64url')}`;
    const inserted = await client.query<{ id: string }>(
      `
        INSERT INTO staff_session (actor_id, token_hash, expires_at, rotation_due_at)
        VALUES ($1::uuid, $2, $3, $4)
        RETURNING id::text
      `,
      [actorId, sessionHash(token), expiresAt, rotationDueAt],
    );
    const rolesResult = await client.query<{ role: string }>(
      `SELECT role::text FROM role_grant WHERE actor_id = $1::uuid AND revoked_at IS NULL ORDER BY role::text`,
      [actorId],
    );
    const roles = mapRoles(
      rolesResult.rows.map((row) => ({
        actor_id: actorId,
        expires_at: expiresAt,
        role: row.role,
        rotation_due_at: rotationDueAt,
        session_id: inserted.rows[0]?.id ?? '',
      })),
    );
    if (!roles.some((role) => staffRoles.includes(role as (typeof staffRoles)[number]))) {
      throw new IdentityError('IDENTITY_AUTHENTICATION_REQUIRED');
    }
    await appendAudit(client, actorId, context, 'ACCOUNT_SESSION_ISSUED');
    return {
      credential: { kind: 'STAFF', token },
      principal: {
        actorId,
        expiresAt: expiresAt.toISOString(),
        kind: 'HUMAN',
        roles,
        rotationDue: false,
        sessionId: inserted.rows[0]?.id ?? '',
        sessionKind: 'STAFF',
      },
    };
  }

  async function authenticateSession(
    credential: PasswordlessCredential,
  ): Promise<PasswordlessSessionPrincipal> {
    if (credential.kind !== 'STAFF' || !staffTokenPattern.test(credential.token)) {
      throw new IdentityError('IDENTITY_AUTHENTICATION_REQUIRED');
    }
    try {
      const result = await pool.query<SessionRow>(
        `
          WITH active_session AS (
            UPDATE staff_session session
            SET last_seen_at = NOW()
            FROM actor_identity actor
            WHERE session.token_hash = $1
              AND session.revoked_at IS NULL
              AND session.expires_at > NOW()
              AND actor.id = session.actor_id
              AND actor.disabled_at IS NULL
            RETURNING actor.id AS actor_id, session.id AS session_id,
                      session.expires_at, session.rotation_due_at
          )
          SELECT active_session.actor_id::text, active_session.session_id::text,
                 active_session.expires_at, active_session.rotation_due_at,
                 grant_row.role::text AS role
          FROM active_session
          JOIN role_grant grant_row ON grant_row.actor_id = active_session.actor_id
          WHERE grant_row.revoked_at IS NULL
          ORDER BY grant_row.role::text
        `,
        [sessionHash(credential.token)],
      );
      const first = result.rows[0];
      if (first === undefined) throw new IdentityError('IDENTITY_AUTHENTICATION_REQUIRED');
      const roles = mapRoles(result.rows);
      if (!roles.some((role) => staffRoles.includes(role as (typeof staffRoles)[number]))) {
        throw new IdentityError('IDENTITY_AUTHENTICATION_REQUIRED');
      }
      return {
        actorId: first.actor_id,
        expiresAt: first.expires_at.toISOString(),
        kind: 'HUMAN',
        roles,
        rotationDue: first.rotation_due_at.getTime() <= Date.now(),
        sessionId: first.session_id,
        sessionKind: 'STAFF',
      };
    } catch (error) {
      if (error instanceof IdentityError) throw error;
      throw new IdentityError('IDENTITY_DEPENDENCY_UNAVAILABLE');
    }
  }

  return {
    authenticateSession,
    async bootstrapLocalOwner(email, context) {
      validateContext(context);
      if (
        identityEnvironment.APP_ENV !== 'local' ||
        !identityEnvironment.SYNTHETIC_IDENTITY_ENABLED
      ) {
        throw new IdentityError('IDENTITY_PERMISSION_DENIED');
      }
      const normalizedEmail = normalizeEmailAddress(email);
      return inTransaction(async (client) => {
        const actor = await client.query<{ id: string }>(
          `
            INSERT INTO actor_identity (provider, subject, updated_at)
            VALUES ('passwordless-email', $1, NOW())
            ON CONFLICT (provider, subject) DO UPDATE SET updated_at = NOW()
            RETURNING id::text
          `,
          [normalizedEmail],
        );
        const actorId = actor.rows[0]?.id;
        if (actorId === undefined) throw new IdentityError('IDENTITY_DEPENDENCY_UNAVAILABLE');
        await client.query(
          `
            INSERT INTO role_grant (actor_id, role)
            VALUES ($1::uuid, 'OWNER')
            ON CONFLICT (actor_id, role) DO UPDATE SET revoked_at = NULL, granted_at = NOW()
          `,
          [actorId],
        );
        await client.query(
          `UPDATE role_grant SET revoked_at = NOW()
           WHERE actor_id = $1::uuid AND role IN ('MANAGER', 'ADMIN') AND revoked_at IS NULL`,
          [actorId],
        );
        await appendAudit(client, actorId, context, 'LOCAL_OWNER_BOOTSTRAPPED');
        return { actorId };
      });
    },
    close: () => pool.end(),
    async requestCode(input) {
      validateContext(input.context);
      const email = normalizeEmailAddress(input.email);
      const clientBucket = z.string().min(8).max(128).parse(input.clientBucket);
      return inTransaction(async (client) => {
        const emailSubjectHash = keyedHash('rate-email', email);
        const clientSubjectHash = keyedHash('rate-client', clientBucket);
        await consumeRateLimit(client, 'auth-code-email-hour', emailSubjectHash, 5, 3_600);
        await consumeRateLimit(client, 'auth-code-client-hour', clientSubjectHash, 20, 3_600);

        const previous = await client.query<{ resend_available_at: Date }>(
          `
            SELECT resend_available_at
            FROM one_time_code_challenge
            WHERE email_normalized = $1 AND purpose = $2::auth_challenge_purpose
              AND consumed_at IS NULL AND invalidated_at IS NULL AND expires_at > NOW()
            ORDER BY created_at DESC
            LIMIT 1
            FOR UPDATE
          `,
          [email, input.purpose],
        );
        if ((previous.rows[0]?.resend_available_at.getTime() ?? 0) > Date.now()) {
          await appendAudit(client, null, input.context, 'AUTH_CODE_REQUESTED');
          return { deliveryId: null };
        }
        const eligible = await client.query<{ allowed: boolean }>(
          `
            SELECT EXISTS (
              SELECT 1
              FROM actor_identity actor
              JOIN role_grant grant_row ON grant_row.actor_id = actor.id
              WHERE actor.provider = 'passwordless-email'
                AND actor.subject = $1
                AND actor.disabled_at IS NULL
                AND grant_row.revoked_at IS NULL
                AND grant_row.role IN ('MANAGER', 'ADMIN', 'OWNER')
            ) AS allowed
          `,
          [email],
        );
        if (eligible.rows[0]?.allowed !== true) {
          await appendAudit(client, null, input.context, 'AUTH_CODE_REQUESTED');
          return { deliveryId: null };
        }
        await client.query(
          `
            UPDATE one_time_code_challenge SET invalidated_at = NOW()
            WHERE email_normalized = $1 AND purpose = $2::auth_challenge_purpose
              AND consumed_at IS NULL AND invalidated_at IS NULL
          `,
          [email, input.purpose],
        );
        const challengeId = randomUUID();
        const code = randomInt(100_000, 1_000_000).toString();
        await client.query(
          `
            INSERT INTO one_time_code_challenge (
              id, email_normalized, purpose, code_hash, request_bucket_hash,
              resend_available_at, expires_at
            ) VALUES ($1::uuid, $2, $3::auth_challenge_purpose, $4, $5,
                      NOW() + INTERVAL '60 seconds', NOW() + INTERVAL '10 minutes')
          `,
          [
            challengeId,
            email,
            input.purpose,
            codeHash(challengeId, email, code),
            clientSubjectHash,
          ],
        );
        const deliveryId = randomUUID();
        const sealedMessage = sealEmailMessage(
          {
            recipient: email,
            subject: 'Код входа в управление PROJECT_NAME',
            text: `Ваш код: ${code}\n\nКод действует 10 минут и подходит только для одного входа. Если вы не запрашивали код, просто проигнорируйте письмо.`,
          },
          secret,
        );
        await client.query(
          `
            INSERT INTO email_delivery (
              id, challenge_id, kind, sealed_message, correlation_id, idempotency_key
            ) VALUES ($1::uuid, $2::uuid, 'LOGIN_CODE', $3, $4, $5)
          `,
          [
            deliveryId,
            challengeId,
            sealedMessage,
            input.context.correlationId,
            `auth-code:${challengeId}`,
          ],
        );
        await client.query(
          `
            INSERT INTO outbox_event (
              topic, schema_version, payload, idempotency_key, correlation_id, status
            ) VALUES ('identity.code_requested', 1, $1::jsonb, $2, $3, 'PENDING')
          `,
          [
            JSON.stringify({ deliveryId }),
            `identity-code:${challengeId}`,
            input.context.correlationId,
          ],
        );
        await appendAudit(client, null, input.context, 'AUTH_CODE_REQUESTED');
        return { deliveryId };
      });
    },
    async revokeSession(credential, context) {
      validateContext(context);
      const principal = await authenticateSession(credential);
      await inTransaction(async (client) => {
        await client.query(
          `UPDATE staff_session SET revoked_at = NOW() WHERE id = $1::uuid AND revoked_at IS NULL`,
          [principal.sessionId],
        );
        await appendAudit(client, principal.actorId, context, 'ACCOUNT_SESSION_REVOKED');
      });
    },
    async rotateSession(credential, context) {
      validateContext(context);
      const principal = await authenticateSession(credential);
      return inTransaction(async (client) => {
        await client.query(
          `UPDATE staff_session SET revoked_at = NOW() WHERE id = $1::uuid AND revoked_at IS NULL`,
          [principal.sessionId],
        );
        return issueSession(client, principal.actorId, context, new Date(principal.expiresAt));
      });
    },
    async verifyCode(input) {
      validateContext(input.context);
      const email = normalizeEmailAddress(input.email);
      const code = codeSchema.safeParse(input.code);
      const clientBucket = z.string().min(8).max(128).parse(input.clientBucket);
      if (!code.success) throw new IdentityError('IDENTITY_AUTHENTICATION_REQUIRED');
      return inTransaction(async (client) => {
        await consumeRateLimit(
          client,
          'auth-verify-email-hour',
          keyedHash('rate-email', email),
          20,
          3_600,
        );
        await consumeRateLimit(
          client,
          'auth-verify-client-hour',
          keyedHash('rate-client', clientBucket),
          60,
          3_600,
        );
        const challenge = await client.query<{
          attempt_count: number;
          code_hash: string;
          expires_at: Date;
          id: string;
          maximum_attempts: number;
        }>(
          `
            SELECT id::text, code_hash, attempt_count, maximum_attempts, expires_at
            FROM one_time_code_challenge
            WHERE email_normalized = $1 AND purpose = $2::auth_challenge_purpose
              AND consumed_at IS NULL AND invalidated_at IS NULL
            ORDER BY created_at DESC LIMIT 1 FOR UPDATE
          `,
          [email, input.purpose],
        );
        const row = challenge.rows[0];
        if (
          row === undefined ||
          row.expires_at.getTime() <= Date.now() ||
          row.attempt_count >= row.maximum_attempts
        ) {
          await appendAudit(
            client,
            null,
            input.context,
            'AUTH_CODE_VERIFICATION_DENIED',
            'DENIED',
            'CODE_INVALID',
          );
          throw new IdentityError('IDENTITY_AUTHENTICATION_REQUIRED');
        }
        const expected = Buffer.from(row.code_hash, 'hex');
        const actual = Buffer.from(codeHash(row.id, email, code.data), 'hex');
        const matches = expected.length === actual.length && timingSafeEqual(expected, actual);
        await client.query(
          `
            UPDATE one_time_code_challenge
            SET attempt_count = attempt_count + 1,
                invalidated_at = CASE WHEN attempt_count + 1 >= maximum_attempts AND NOT $2 THEN NOW() ELSE invalidated_at END,
                consumed_at = CASE WHEN $2 THEN NOW() ELSE consumed_at END
            WHERE id = $1::uuid
          `,
          [row.id, matches],
        );
        if (!matches) {
          await appendAudit(
            client,
            null,
            input.context,
            'AUTH_CODE_VERIFICATION_DENIED',
            'DENIED',
            'CODE_INVALID',
          );
          throw new IdentityError('IDENTITY_AUTHENTICATION_REQUIRED');
        }
        const actor = await client.query<{ id: string }>(
          `
            SELECT actor.id::text
            FROM actor_identity actor
            WHERE actor.provider = 'passwordless-email' AND actor.subject = $1
              AND actor.disabled_at IS NULL
              AND EXISTS (
                SELECT 1 FROM role_grant grant_row
                WHERE grant_row.actor_id = actor.id AND grant_row.revoked_at IS NULL
                  AND grant_row.role IN ('MANAGER', 'ADMIN', 'OWNER')
              )
            FOR UPDATE
          `,
          [email],
        );
        const actorId = actor.rows[0]?.id;
        if (actorId === undefined) {
          await appendAudit(
            client,
            null,
            input.context,
            'AUTH_CODE_VERIFICATION_DENIED',
            'DENIED',
            'STAFF_NOT_INVITED',
          );
          throw new IdentityError('IDENTITY_AUTHENTICATION_REQUIRED');
        }
        await appendAudit(client, actorId, input.context, 'AUTH_CODE_VERIFIED');
        return issueSession(client, actorId, input.context);
      });
    },
  };
}

export async function processQueuedEmailDelivery(
  databaseEnvironment: DatabaseEnvironment,
  identityEnvironment: IdentityEnvironment,
  delivery: EmailDeliveryPort,
  deliveryId: string,
): Promise<void> {
  if (!z.string().uuid().safeParse(deliveryId).success) {
    throw new IdentityError('IDENTITY_VALIDATION_ERROR');
  }
  const pool = new Pool({
    connectionString: databaseEnvironment.DATABASE_URL,
    connectionTimeoutMillis: Math.min(databaseEnvironment.DATABASE_STATEMENT_TIMEOUT_MS, 10_000),
    max: 1,
    statement_timeout: databaseEnvironment.DATABASE_STATEMENT_TIMEOUT_MS,
  });
  try {
    const claimed = await pool.query<{ sealed_message: string }>(
      `
        UPDATE email_delivery SET status = 'PROCESSING', attempts = attempts + 1, updated_at = NOW()
        WHERE id = $1::uuid AND status IN ('PENDING', 'FAILED') AND available_at <= NOW()
        RETURNING sealed_message
      `,
      [deliveryId],
    );
    const sealed = claimed.rows[0]?.sealed_message;
    if (sealed === undefined) {
      const done = await pool.query<{ status: string }>(
        `SELECT status::text FROM email_delivery WHERE id = $1::uuid`,
        [deliveryId],
      );
      if (done.rows[0]?.status === 'SENT') return;
      throw new IdentityError('IDENTITY_CONFLICT');
    }
    try {
      await delivery.send(openEmailMessage(sealed, identityEnvironment.SESSION_SIGNING_KEY));
      await pool.query(
        `UPDATE email_delivery SET status = 'SENT', sent_at = NOW(), last_error_code = NULL, updated_at = NOW() WHERE id = $1::uuid`,
        [deliveryId],
      );
    } catch {
      await pool.query(
        `UPDATE email_delivery SET status = 'FAILED', last_error_code = 'EMAIL_DELIVERY_UNAVAILABLE', available_at = NOW() + INTERVAL '30 seconds', updated_at = NOW() WHERE id = $1::uuid`,
        [deliveryId],
      );
      throw new IdentityError('IDENTITY_DEPENDENCY_UNAVAILABLE');
    }
  } finally {
    await pool.end();
  }
}

export async function cleanupExpiredIdentityState(
  databaseEnvironment: DatabaseEnvironment,
): Promise<void> {
  const pool = new Pool({ connectionString: databaseEnvironment.DATABASE_URL, max: 1 });
  try {
    await pool.query(`
      DELETE FROM staff_session WHERE expires_at < NOW() - INTERVAL '7 days';
      DELETE FROM email_delivery WHERE created_at < NOW() - INTERVAL '7 days' AND status IN ('SENT', 'FAILED');
      DELETE FROM one_time_code_challenge WHERE expires_at < NOW() - INTERVAL '7 days';
      DELETE FROM auth_rate_limit WHERE window_start < NOW() - INTERVAL '2 days';
      UPDATE staff_invitation SET status = 'EXPIRED', updated_at = NOW()
      WHERE status = 'PENDING' AND expires_at <= NOW();
    `);
  } finally {
    await pool.end();
  }
}
