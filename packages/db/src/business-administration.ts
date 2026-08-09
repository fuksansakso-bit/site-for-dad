import type { DatabaseEnvironment } from '@project-name/config/server';
import { Pool, type PoolClient } from 'pg';

import { cartTransaction } from './cart.js';

export interface SiteSettings {
  readonly businessName: string;
  readonly installmentText: 'Доступна рассрочка. Уточните условия у менеджера';
  readonly manufacturingLeadTime: string;
  readonly services: {
    readonly delivery: string;
    readonly installation: string;
    readonly measurement: string;
  };
  readonly territory: string;
  readonly warranty: string;
  readonly whatsappRecipient: string;
}

export const activeSiteSettingsFallback: SiteSettings = {
  businessName: 'PROJECT_NAME',
  installmentText: 'Доступна рассрочка. Уточните условия у менеджера',
  manufacturingLeadTime: '2–7 календарных дней',
  services: { delivery: 'Бесплатно', installation: 'Бесплатно', measurement: 'Бесплатно' },
  territory: 'Чеченская Республика',
  warranty: '12 месяцев',
  whatsappRecipient: '79635851036',
};

export interface BusinessAdminActor {
  readonly actorId: string;
  readonly role: 'ADMIN' | 'OWNER';
}

export interface SiteSettingsRevisionView {
  readonly activatedAt: string | null;
  readonly createdAt: string;
  readonly id: string;
  readonly reason: string;
  readonly settings: SiteSettings;
  readonly status: 'DRAFT' | 'ACTIVE' | 'SUPERSEDED';
  readonly version: number;
}

export interface AuditEventView {
  readonly action: string;
  readonly actorIdentityId: string | null;
  readonly actorType: string;
  readonly correlationId: string;
  readonly id: string;
  readonly occurredAt: string;
  readonly outcome: string;
  readonly reasonCode: string | null;
  readonly targetId: string | null;
  readonly targetType: string | null;
}

export interface AuditEventListView {
  readonly items: readonly AuditEventView[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
}

interface Command extends BusinessAdminActor {
  readonly correlationId: string;
}

export interface BusinessAdministrationAdapter {
  activateSettings(
    input: Command & {
      readonly expectedVersion: number;
      readonly reason: string;
      readonly settings: SiteSettings;
    },
  ): Promise<SiteSettingsRevisionView>;
  getActiveSettings(): Promise<SiteSettings>;
  listAuditEvents(
    input: Command & {
      readonly action: string;
      readonly outcome: '' | 'FAILED' | 'SUCCEEDED';
      readonly page: number;
      readonly pageSize: number;
    },
  ): Promise<AuditEventListView>;
  listSettings(input: Command): Promise<readonly SiteSettingsRevisionView[]>;
}

export type BusinessAdministrationErrorCode =
  | 'BUSINESS_ADMIN_AUTHORIZATION'
  | 'BUSINESS_ADMIN_CONFLICT'
  | 'BUSINESS_ADMIN_DATABASE'
  | 'BUSINESS_ADMIN_INVALID_INPUT';

export class BusinessAdministrationError extends Error {
  public constructor(
    public readonly code: BusinessAdministrationErrorCode,
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = 'BusinessAdministrationError';
  }
}

function mapError(error: unknown): BusinessAdministrationError {
  if (error instanceof BusinessAdministrationError) return error;
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String(error.code);
    if (code === '23505' || code === '40001') {
      return new BusinessAdministrationError('BUSINESS_ADMIN_CONFLICT', { cause: error });
    }
    if (code === '22P02' || code === '23514') {
      return new BusinessAdministrationError('BUSINESS_ADMIN_INVALID_INPUT', { cause: error });
    }
  }
  return new BusinessAdministrationError('BUSINESS_ADMIN_DATABASE', { cause: error });
}

function uuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

function assertCommand(input: Command): void {
  if (
    !uuid(input.actorId) ||
    !['ADMIN', 'OWNER'].includes(input.role) ||
    !/^[A-Za-z0-9:._-]{8,128}$/u.test(input.correlationId)
  ) {
    throw new BusinessAdministrationError('BUSINESS_ADMIN_AUTHORIZATION');
  }
}

function validText(value: string, minimum: number, maximum: number): boolean {
  const containsControlCharacter = Array.from(value).some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint < 32 || codePoint === 127);
  });
  return (
    value === value.trim() &&
    value.length >= minimum &&
    value.length <= maximum &&
    !containsControlCharacter
  );
}

function parseSettings(value: unknown): SiteSettings {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BusinessAdministrationError('BUSINESS_ADMIN_DATABASE');
  }
  const source = value as Record<string, unknown>;
  const services = source['services'];
  if (typeof services !== 'object' || services === null || Array.isArray(services)) {
    throw new BusinessAdministrationError('BUSINESS_ADMIN_INVALID_INPUT');
  }
  const serviceValues = services as Record<string, unknown>;
  const candidate = {
    businessName: source['businessName'],
    installmentText: source['installmentText'],
    manufacturingLeadTime: source['manufacturingLeadTime'],
    services: {
      delivery: serviceValues['delivery'],
      installation: serviceValues['installation'],
      measurement: serviceValues['measurement'],
    },
    territory: source['territory'],
    warranty: source['warranty'],
    whatsappRecipient: source['whatsappRecipient'],
  };
  if (
    typeof candidate.businessName !== 'string' ||
    !validText(candidate.businessName, 2, 120) ||
    candidate.installmentText !== activeSiteSettingsFallback.installmentText ||
    typeof candidate.manufacturingLeadTime !== 'string' ||
    !validText(candidate.manufacturingLeadTime, 2, 120) ||
    typeof candidate.territory !== 'string' ||
    !validText(candidate.territory, 2, 160) ||
    typeof candidate.warranty !== 'string' ||
    !validText(candidate.warranty, 2, 120) ||
    typeof candidate.whatsappRecipient !== 'string' ||
    !/^[1-9][0-9]{7,14}$/u.test(candidate.whatsappRecipient) ||
    !Object.values(candidate.services).every(
      (item) => typeof item === 'string' && validText(item, 2, 80),
    )
  ) {
    throw new BusinessAdministrationError('BUSINESS_ADMIN_INVALID_INPUT');
  }
  return candidate as SiteSettings;
}

async function requireStaff(client: PoolClient, input: BusinessAdminActor): Promise<void> {
  const result = await client.query<{ allowed: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM actor_identity actor
       JOIN role_grant grant_row ON grant_row.actor_id = actor.id
       WHERE actor.id = $1::uuid AND actor.disabled_at IS NULL
         AND grant_row.role = $2::system_role AND grant_row.revoked_at IS NULL
     ) AS allowed`,
    [input.actorId, input.role],
  );
  if (result.rows[0]?.allowed !== true) {
    throw new BusinessAdministrationError('BUSINESS_ADMIN_AUTHORIZATION');
  }
}

async function audit(
  client: PoolClient,
  input: Command,
  action: string,
  targetId: string | null,
): Promise<void> {
  await client.query(
    `INSERT INTO audit_event (
       actor_type, actor_identity_id, action, outcome, correlation_id,
       target_type, target_id, reason_code
     ) VALUES ('IDENTITY',$1::uuid,$2,'SUCCEEDED',$3,'SITE_SETTINGS',$4,'PHASE_1F_SETTINGS')`,
    [input.actorId, action, input.correlationId, targetId],
  );
}

interface SettingsRow {
  readonly activated_at: Date | null;
  readonly created_at: Date;
  readonly id: string;
  readonly safe_reason: string;
  readonly settings: unknown;
  readonly status: SiteSettingsRevisionView['status'];
  readonly version: number;
}

function revision(row: SettingsRow): SiteSettingsRevisionView {
  return {
    activatedAt: row.activated_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    id: row.id,
    reason: row.safe_reason,
    settings: parseSettings(row.settings),
    status: row.status,
    version: row.version,
  };
}

async function ensureInitialSettings(client: PoolClient, input: Command): Promise<void> {
  const pointer = await client.query(
    'SELECT revision_id FROM site_settings_pointer WHERE singleton_id = 1',
  );
  if (pointer.rows[0] !== undefined) return;
  const inserted = await client.query<{ id: string }>(
    `INSERT INTO site_settings_revision (
       version, status, settings, safe_reason, authored_by_id, activated_at
     ) VALUES (1,'ACTIVE',$1::jsonb,'Подтверждённые настройки MVP Phase 1F.',$2::uuid,NOW())
     ON CONFLICT (version) DO UPDATE SET version = site_settings_revision.version
     RETURNING id::text`,
    [JSON.stringify(activeSiteSettingsFallback), input.actorId],
  );
  const id = inserted.rows[0]?.id;
  if (id === undefined) throw new BusinessAdministrationError('BUSINESS_ADMIN_DATABASE');
  await client.query(
    `INSERT INTO site_settings_pointer (singleton_id, revision_id, updated_at)
     VALUES (1,$1::uuid,NOW()) ON CONFLICT (singleton_id) DO NOTHING`,
    [id],
  );
}

export function createBusinessAdministrationAdapter(
  environment: DatabaseEnvironment,
): BusinessAdministrationAdapter {
  const pool = new Pool({
    connectionString: environment.DATABASE_URL,
    max: 6,
    statement_timeout: environment.DATABASE_STATEMENT_TIMEOUT_MS,
  });

  return {
    async activateSettings(input) {
      assertCommand(input);
      const settings = parseSettings(input.settings);
      const reason = input.reason.trim();
      if (
        !Number.isSafeInteger(input.expectedVersion) ||
        input.expectedVersion < 1 ||
        !validText(reason, 5, 500)
      ) {
        throw new BusinessAdministrationError('BUSINESS_ADMIN_INVALID_INPUT');
      }
      return cartTransaction(
        pool,
        async (client) => {
          await requireStaff(client, input);
          await ensureInitialSettings(client, input);
          const current = await client.query<{ id: string; version: number }>(
            `SELECT revision.id::text, revision.version
             FROM site_settings_pointer pointer
             JOIN site_settings_revision revision ON revision.id = pointer.revision_id
             WHERE pointer.singleton_id = 1 FOR UPDATE OF pointer, revision`,
          );
          const active = current.rows[0];
          if (active === undefined || active.version !== input.expectedVersion) {
            throw new BusinessAdministrationError('BUSINESS_ADMIN_CONFLICT');
          }
          const inserted = await client.query<SettingsRow>(
            `INSERT INTO site_settings_revision (
               version, status, settings, safe_reason, authored_by_id, supersedes_id, activated_at
             ) VALUES ($1,'ACTIVE',$2::jsonb,$3,$4::uuid,$5::uuid,NOW())
             RETURNING id::text, version, status::text, settings, safe_reason, created_at, activated_at`,
            [active.version + 1, JSON.stringify(settings), reason, input.actorId, active.id],
          );
          const next = inserted.rows[0];
          if (next === undefined) throw new BusinessAdministrationError('BUSINESS_ADMIN_DATABASE');
          await client.query(
            `UPDATE site_settings_revision SET status = 'SUPERSEDED'
             WHERE id = $1::uuid AND status = 'ACTIVE'`,
            [active.id],
          );
          await client.query(
            `UPDATE site_settings_pointer SET revision_id = $1::uuid, updated_at = NOW()
             WHERE singleton_id = 1`,
            [next.id],
          );
          await audit(client, input, 'site_settings.activated', next.id);
          return revision(next);
        },
        mapError,
      );
    },

    async getActiveSettings() {
      try {
        const result = await pool.query<{ settings: unknown }>(
          `SELECT revision.settings
           FROM site_settings_pointer pointer
           JOIN site_settings_revision revision ON revision.id = pointer.revision_id
           WHERE pointer.singleton_id = 1 AND revision.status = 'ACTIVE'`,
        );
        return result.rows[0] === undefined
          ? activeSiteSettingsFallback
          : parseSettings(result.rows[0].settings);
      } catch {
        return activeSiteSettingsFallback;
      }
    },

    async listAuditEvents(input) {
      assertCommand(input);
      const action = input.action.trim();
      if (
        action.length > 128 ||
        !['', 'FAILED', 'SUCCEEDED'].includes(input.outcome) ||
        !Number.isSafeInteger(input.page) ||
        input.page < 1 ||
        !Number.isSafeInteger(input.pageSize) ||
        input.pageSize < 1 ||
        input.pageSize > 100
      ) {
        throw new BusinessAdministrationError('BUSINESS_ADMIN_INVALID_INPUT');
      }
      return cartTransaction(
        pool,
        async (client) => {
          await requireStaff(client, input);
          const rows = await client.query<{
            action: string;
            actor_identity_id: string | null;
            actor_type: string;
            correlation_id: string;
            id: string;
            occurred_at: Date;
            outcome: string;
            reason_code: string | null;
            target_id: string | null;
            target_type: string | null;
          }>(
            `SELECT id::text, occurred_at, actor_type::text, actor_identity_id::text,
                    action, outcome::text, correlation_id, target_type, target_id, reason_code
             FROM audit_event
             WHERE ($1 = '' OR action ILIKE '%' || $1 || '%')
               AND ($2 = '' OR outcome::text = $2)
             ORDER BY occurred_at DESC, id DESC LIMIT $3 OFFSET $4`,
            [action, input.outcome, input.pageSize, (input.page - 1) * input.pageSize],
          );
          const count = await client.query<{ count: string }>(
            `SELECT count(*)::text AS count FROM audit_event
             WHERE ($1 = '' OR action ILIKE '%' || $1 || '%')
               AND ($2 = '' OR outcome::text = $2)`,
            [action, input.outcome],
          );
          return {
            items: rows.rows.map((row) => ({
              action: row.action,
              actorIdentityId: row.actor_identity_id,
              actorType: row.actor_type,
              correlationId: row.correlation_id,
              id: row.id,
              occurredAt: row.occurred_at.toISOString(),
              outcome: row.outcome,
              reasonCode: row.reason_code,
              targetId: row.target_id,
              targetType: row.target_type,
            })),
            page: input.page,
            pageSize: input.pageSize,
            totalCount: Number(count.rows[0]?.count ?? '0'),
          };
        },
        mapError,
      );
    },

    async listSettings(input) {
      assertCommand(input);
      return cartTransaction(
        pool,
        async (client) => {
          await requireStaff(client, input);
          await ensureInitialSettings(client, input);
          const result = await client.query<SettingsRow>(
            `SELECT id::text, version, status::text, settings, safe_reason, created_at, activated_at
             FROM site_settings_revision ORDER BY version DESC LIMIT 50`,
          );
          await audit(client, input, 'site_settings.listed', null);
          return result.rows.map(revision);
        },
        mapError,
      );
    },
  };
}
