import type { DatabaseEnvironment } from '@project-name/config/server';
import { Pool, type PoolClient } from 'pg';

import { cartTransaction } from './cart.js';

export type CustomerContactStaffRole = 'MANAGER' | 'ADMIN' | 'OWNER';

export interface CustomerContactActor {
  readonly actorId: string;
  readonly role: CustomerContactStaffRole;
}

export interface CustomerContactListItem {
  readonly createdAt: string;
  readonly displayName: string;
  readonly email: string | null;
  readonly id: string;
  readonly lastRequestAt: string | null;
  readonly lastRequestNumber: string | null;
  readonly locality: string | null;
  readonly phone: string;
  readonly requestCount: number;
  readonly updatedAt: string;
}

export interface CustomerContactRequestView {
  readonly createdAt: string;
  readonly knownSubtotalKopecks: number;
  readonly pricingStatus: string;
  readonly requestNumber: string;
  readonly status: string;
  readonly updatedAt: string;
}

export interface CustomerContactNoteView {
  readonly authorActorId: string;
  readonly body: string;
  readonly createdAt: string;
  readonly id: string;
}

export interface CustomerContactDetail extends CustomerContactListItem {
  readonly notes: readonly CustomerContactNoteView[];
  readonly requests: readonly CustomerContactRequestView[];
}

export interface CustomerContactListView {
  readonly items: readonly CustomerContactListItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
}

interface ReadCommand extends CustomerContactActor {
  readonly correlationId: string;
}

export interface CustomerContactAdapter {
  readonly addNote: (
    input: ReadCommand & {
      readonly body: string;
      readonly contactId: string;
      readonly idempotencyKey: string;
    },
  ) => Promise<CustomerContactDetail>;
  readonly getContact: (
    input: ReadCommand & { readonly contactId: string },
  ) => Promise<CustomerContactDetail>;
  readonly listContacts: (
    input: ReadCommand & {
      readonly page: number;
      readonly pageSize: number;
      readonly query: string;
    },
  ) => Promise<CustomerContactListView>;
}

export type CustomerContactStoreErrorCode =
  | 'CUSTOMER_CONTACT_AUTHORIZATION'
  | 'CUSTOMER_CONTACT_DATABASE'
  | 'CUSTOMER_CONTACT_INVALID_INPUT'
  | 'CUSTOMER_CONTACT_NOT_FOUND';

export class CustomerContactStoreError extends Error {
  public constructor(
    public readonly code: CustomerContactStoreErrorCode,
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = 'CustomerContactStoreError';
  }
}

interface ContactRow {
  readonly created_at: Date;
  readonly display_name: string;
  readonly email_normalized: string | null;
  readonly id: string;
  readonly last_request_at: Date | null;
  readonly last_request_number: string | null;
  readonly locality: string | null;
  readonly phone_normalized: string;
  readonly request_count: string;
  readonly total_count?: string;
  readonly updated_at: Date;
}

function mapError(error: unknown): CustomerContactStoreError {
  if (error instanceof CustomerContactStoreError) return error;
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String(error.code);
    if (['22P02', '23514', '23505'].includes(code)) {
      return new CustomerContactStoreError('CUSTOMER_CONTACT_INVALID_INPUT', { cause: error });
    }
  }
  return new CustomerContactStoreError('CUSTOMER_CONTACT_DATABASE', { cause: error });
}

function assertActor(input: CustomerContactActor): void {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      input.actorId,
    ) ||
    !['MANAGER', 'ADMIN', 'OWNER'].includes(input.role)
  ) {
    throw new CustomerContactStoreError('CUSTOMER_CONTACT_AUTHORIZATION');
  }
}

function assertRead(input: ReadCommand): void {
  assertActor(input);
  if (!/^[A-Za-z0-9:._-]{8,128}$/u.test(input.correlationId)) {
    throw new CustomerContactStoreError('CUSTOMER_CONTACT_INVALID_INPUT');
  }
}

function assertUuid(value: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value)) {
    throw new CustomerContactStoreError('CUSTOMER_CONTACT_INVALID_INPUT');
  }
}

function safeCount(value: string): number {
  const count = Number(value);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new CustomerContactStoreError('CUSTOMER_CONTACT_DATABASE');
  }
  return count;
}

function mapContact(row: ContactRow): CustomerContactListItem {
  return {
    createdAt: row.created_at.toISOString(),
    displayName: row.display_name,
    email: row.email_normalized,
    id: row.id,
    lastRequestAt: row.last_request_at?.toISOString() ?? null,
    lastRequestNumber: row.last_request_number,
    locality: row.locality,
    phone: row.phone_normalized,
    requestCount: safeCount(row.request_count),
    updatedAt: row.updated_at.toISOString(),
  };
}

async function requireStaff(client: PoolClient, input: CustomerContactActor): Promise<void> {
  const result = await client.query<{ allowed: boolean }>(
    `SELECT EXISTS (
       SELECT 1
       FROM actor_identity actor
       JOIN role_grant grant_row ON grant_row.actor_id = actor.id
       WHERE actor.id = $1::uuid AND actor.disabled_at IS NULL
         AND grant_row.role = $2::system_role AND grant_row.revoked_at IS NULL
     ) AS allowed`,
    [input.actorId, input.role],
  );
  if (result.rows[0]?.allowed !== true) {
    throw new CustomerContactStoreError('CUSTOMER_CONTACT_AUTHORIZATION');
  }
}

async function audit(
  client: PoolClient,
  input: ReadCommand,
  action: string,
  contactId: string | null,
): Promise<void> {
  await client.query(
    `INSERT INTO audit_event (
       actor_type, actor_identity_id, action, outcome, correlation_id,
       target_type, target_id, reason_code
     ) VALUES ('IDENTITY',$1::uuid,$2,'SUCCEEDED',$3,'CUSTOMER_CONTACT',$4,'PHASE_1F_CRM')`,
    [input.actorId, action, input.correlationId, contactId],
  );
}

const contactProjection = `
  SELECT contact.id::text, contact.display_name, contact.phone_normalized,
         contact.email_normalized, contact.locality, contact.created_at, contact.updated_at,
         count(link.id)::text AS request_count,
         max(inquiry.created_at) AS last_request_at,
         (array_agg(inquiry.request_number ORDER BY inquiry.created_at DESC, inquiry.id DESC)
           FILTER (WHERE inquiry.id IS NOT NULL))[1] AS last_request_number
  FROM customer_contact contact
  LEFT JOIN customer_contact_request link ON link.customer_contact_id = contact.id
  LEFT JOIN order_inquiry inquiry ON inquiry.id = link.inquiry_id
`;

async function contactDetail(
  client: PoolClient,
  contactId: string,
): Promise<CustomerContactDetail> {
  const contact = await client.query<ContactRow>(
    `${contactProjection}
     WHERE contact.id = $1::uuid
     GROUP BY contact.id`,
    [contactId],
  );
  const row = contact.rows[0];
  if (row === undefined) throw new CustomerContactStoreError('CUSTOMER_CONTACT_NOT_FOUND');
  const [requests, notes] = await Promise.all([
    client.query<{
      created_at: Date;
      known_subtotal_minor: string;
      pricing_status: string;
      request_number: string;
      status: string;
      updated_at: Date;
    }>(
      `SELECT inquiry.request_number, inquiry.status::text, inquiry.pricing_status::text,
              inquiry.known_subtotal_minor::text, inquiry.created_at, inquiry.updated_at
       FROM customer_contact_request link
       JOIN order_inquiry inquiry ON inquiry.id = link.inquiry_id
       WHERE link.customer_contact_id = $1::uuid
       ORDER BY inquiry.created_at DESC, inquiry.id DESC
       LIMIT 100`,
      [contactId],
    ),
    client.query<{
      author_actor_id: string;
      body: string;
      created_at: Date;
      id: string;
    }>(
      `SELECT id::text, author_actor_id::text, body, created_at
       FROM customer_contact_note
       WHERE customer_contact_id = $1::uuid
       ORDER BY created_at DESC, id DESC
       LIMIT 100`,
      [contactId],
    ),
  ]);
  return {
    ...mapContact(row),
    notes: notes.rows.map((note) => ({
      authorActorId: note.author_actor_id,
      body: note.body,
      createdAt: note.created_at.toISOString(),
      id: note.id,
    })),
    requests: requests.rows.map((request) => ({
      createdAt: request.created_at.toISOString(),
      knownSubtotalKopecks: safeCount(request.known_subtotal_minor),
      pricingStatus: request.pricing_status,
      requestNumber: request.request_number,
      status: request.status,
      updatedAt: request.updated_at.toISOString(),
    })),
  };
}

export function createCustomerContactAdapter(
  environment: DatabaseEnvironment,
): CustomerContactAdapter {
  const pool = new Pool({
    connectionString: environment.DATABASE_URL,
    max: 6,
    statement_timeout: environment.DATABASE_STATEMENT_TIMEOUT_MS,
  });

  return {
    async addNote(input) {
      assertRead(input);
      assertUuid(input.contactId);
      const body = input.body.trim();
      if (
        body.length === 0 ||
        body.length > 1_000 ||
        !/^[A-Za-z0-9:._-]{8,180}$/u.test(input.idempotencyKey)
      ) {
        throw new CustomerContactStoreError('CUSTOMER_CONTACT_INVALID_INPUT');
      }
      return cartTransaction(
        pool,
        async (client) => {
          await requireStaff(client, input);
          await contactDetail(client, input.contactId);
          const inserted = await client.query<{ id: string }>(
            `INSERT INTO customer_contact_note (
               customer_contact_id, author_actor_id, body, idempotency_key
             ) VALUES ($1::uuid,$2::uuid,$3,$4)
             ON CONFLICT (idempotency_key) DO NOTHING
             RETURNING id::text`,
            [input.contactId, input.actorId, body, input.idempotencyKey],
          );
          if (inserted.rows[0] !== undefined) {
            await audit(client, input, 'customer_contact.note_added', input.contactId);
          }
          return contactDetail(client, input.contactId);
        },
        mapError,
      );
    },

    async getContact(input) {
      assertRead(input);
      assertUuid(input.contactId);
      return cartTransaction(
        pool,
        async (client) => {
          await requireStaff(client, input);
          const detail = await contactDetail(client, input.contactId);
          await audit(client, input, 'customer_contact.viewed', input.contactId);
          return detail;
        },
        mapError,
      );
    },

    async listContacts(input) {
      assertRead(input);
      const query = input.query.trim();
      if (
        query.length > 120 ||
        !Number.isSafeInteger(input.page) ||
        input.page <= 0 ||
        !Number.isSafeInteger(input.pageSize) ||
        input.pageSize <= 0 ||
        input.pageSize > 100
      ) {
        throw new CustomerContactStoreError('CUSTOMER_CONTACT_INVALID_INPUT');
      }
      return cartTransaction(
        pool,
        async (client) => {
          await requireStaff(client, input);
          const result = await client.query<ContactRow>(
            `${contactProjection}
             WHERE ($1 = '' OR contact.display_name ILIKE '%' || $1 || '%'
               OR contact.phone_normalized ILIKE '%' || $1 || '%'
               OR COALESCE(contact.email_normalized, '') ILIKE '%' || $1 || '%'
               OR COALESCE(contact.locality, '') ILIKE '%' || $1 || '%')
             GROUP BY contact.id
             ORDER BY max(inquiry.created_at) DESC NULLS LAST, contact.updated_at DESC, contact.id DESC
             LIMIT $2 OFFSET $3`,
            [query, input.pageSize, (input.page - 1) * input.pageSize],
          );
          const total = await client.query<{ count: string }>(
            `SELECT count(*)::text AS count
             FROM customer_contact contact
             WHERE ($1 = '' OR contact.display_name ILIKE '%' || $1 || '%'
               OR contact.phone_normalized ILIKE '%' || $1 || '%'
               OR COALESCE(contact.email_normalized, '') ILIKE '%' || $1 || '%'
               OR COALESCE(contact.locality, '') ILIKE '%' || $1 || '%')`,
            [query],
          );
          await audit(client, input, 'customer_contact.listed', null);
          return {
            items: result.rows.map(mapContact),
            page: input.page,
            pageSize: input.pageSize,
            totalCount: safeCount(total.rows[0]?.count ?? '0'),
          };
        },
        mapError,
      );
    },
  };
}
