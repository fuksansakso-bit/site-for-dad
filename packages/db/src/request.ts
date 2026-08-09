import { createHash } from 'node:crypto';

import {
  canTransitionRequestStatus,
  createRequestNumber,
  publicReferenceHash,
  type CartMoneySummary,
  type CartPricingStatus,
  type RequestStaffRole,
  type RequestStatus,
} from '@project-name/cart';
import type { DatabaseEnvironment } from '@project-name/config/server';
import { Pool, type PoolClient } from 'pg';

import {
  cartTransaction,
  loadCartState,
  ownedCart,
  type CartIdentityRow,
  type CartItemView,
} from './cart.js';
import type { PreviewAssetDescriptor } from './preview.js';

export type RequestStoreErrorCode =
  | 'REQUEST_AUTHORIZATION'
  | 'REQUEST_CART_EMPTY'
  | 'REQUEST_CONFLICT'
  | 'REQUEST_DATABASE'
  | 'REQUEST_INVALID_INPUT'
  | 'REQUEST_NOT_FOUND';

export class RequestStoreError extends Error {
  public constructor(
    public readonly code: RequestStoreErrorCode,
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = 'RequestStoreError';
  }
}

export interface RequestSafeSnapshotView {
  readonly capturedAt: string;
  readonly items: readonly CartItemView[];
  readonly priceVersionChangedItemCount: number;
  readonly services: {
    readonly delivery: 'FREE';
    readonly installation: 'FREE';
    readonly measurement: 'FREE';
  };
  readonly summary: CartMoneySummary;
  readonly version: 1;
}

export interface RequestReceiptView {
  readonly createdAt: string;
  readonly installmentInterest: boolean;
  readonly measurementRequested: boolean;
  readonly publicSummaryHref: string;
  readonly requestNumber: string;
  readonly snapshot: RequestSafeSnapshotView;
  readonly status: 'NEW';
}

export interface GuestCheckoutCommand {
  readonly address: string | null;
  readonly comment: string | null;
  readonly consentVersion: string;
  readonly contactName: string;
  readonly contactPhone: string;
  readonly correlationId: string;
  readonly expectedCartRevision: number;
  readonly idempotencyKey: string;
  readonly installmentInterest: boolean;
  readonly locality: string;
  readonly measurementRequested: boolean;
  readonly ownerTokenHash: string;
  readonly publicReference: string;
  readonly publicReferenceSealed: string;
}

export type GuestRequestCommunicationType =
  'WHATSAPP_LINK_GENERATED' | 'WHATSAPP_LINK_OPENED' | 'MESSAGE_COPIED';

export interface GuestRequestCommandIdentity {
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly ownerTokenHash: string;
  readonly publicReference: string;
}

export interface GuestRequestCommunicationCommand extends GuestRequestCommandIdentity {
  readonly type: Exclude<GuestRequestCommunicationType, 'WHATSAPP_LINK_GENERATED'>;
}

export interface RequestHandoffSourceView {
  readonly installmentInterest: boolean;
  readonly locality: string;
  readonly measurementRequested: boolean;
  readonly publicSummaryHref: string;
  readonly requestNumber: string;
  readonly snapshot: RequestSafeSnapshotView;
}

export interface PublicRequestSummaryView {
  readonly createdAt: string;
  readonly installmentInterest: boolean;
  readonly measurementRequested: boolean;
  readonly previewSequences: readonly number[];
  readonly requestNumber: string;
  readonly snapshot: RequestSafeSnapshotView;
  readonly status: 'NEW' | 'IN_REVIEW' | 'CONTACTED' | 'CONFIRMED' | 'CANCELLED';
}

export interface AdminRequestListItemView {
  readonly contactName: string;
  readonly contactPhone: string;
  readonly createdAt: string;
  readonly installmentInterest: boolean;
  readonly itemCount: number;
  readonly knownSubtotalKopecks: number;
  readonly locality: string;
  readonly measurementRequested: boolean;
  readonly pricingStatus: CartPricingStatus;
  readonly requestNumber: string;
  readonly status: RequestStatus;
  readonly totalQuantity: number;
  readonly updatedAt: string;
  readonly version: number;
}

export interface AdminRequestNoteView {
  readonly body: string;
  readonly createdAt: string;
}

export interface AdminRequestCommunicationView {
  readonly createdAt: string;
  readonly safeMetadata: Readonly<Record<string, unknown>>;
  readonly type:
    | 'REQUEST_CREATED'
    | 'WHATSAPP_LINK_GENERATED'
    | 'WHATSAPP_LINK_OPENED'
    | 'MESSAGE_COPIED'
    | 'STATUS_CHANGED';
}

export interface AdminRequestDetailView extends AdminRequestListItemView {
  readonly address: string | null;
  readonly comment: string | null;
  readonly communicationEvents: readonly AdminRequestCommunicationView[];
  readonly notes: readonly AdminRequestNoteView[];
  readonly publicReferenceRevokedAt: string | null;
  readonly publicReferenceSealed: string | null;
  readonly snapshot: RequestSafeSnapshotView;
}

export interface AdminRequestListView {
  readonly items: readonly AdminRequestListItemView[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
}

export interface AdminRequestActor {
  readonly actorId: string;
  readonly role: RequestStaffRole;
}

export interface AdminRequestMutationCommand extends AdminRequestActor {
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly requestNumber: string;
}

export interface RequestAdapter {
  readonly addAdminNote: (
    input: AdminRequestMutationCommand & { readonly body: string },
  ) => Promise<AdminRequestDetailView>;
  readonly checkout: (input: GuestCheckoutCommand) => Promise<RequestReceiptView>;
  readonly close: () => Promise<void>;
  readonly generateHandoff: (
    input: GuestRequestCommandIdentity,
  ) => Promise<RequestHandoffSourceView>;
  readonly getPublicPreviewAsset: (
    publicReference: string,
    sequence: number,
  ) => Promise<PreviewAssetDescriptor>;
  readonly getPublicSummary: (publicReference: string) => Promise<PublicRequestSummaryView>;
  readonly getAdminRequest: (
    input: AdminRequestActor & { readonly correlationId: string; readonly requestNumber: string },
  ) => Promise<AdminRequestDetailView>;
  readonly listAdminRequests: (
    input: AdminRequestActor & {
      readonly correlationId: string;
      readonly page: number;
      readonly pageSize: number;
      readonly status: RequestStatus | null;
    },
  ) => Promise<AdminRequestListView>;
  readonly recordCommunication: (input: GuestRequestCommunicationCommand) => Promise<boolean>;
  readonly revokePublicReference: (
    input: AdminRequestMutationCommand,
  ) => Promise<AdminRequestDetailView>;
  readonly updateAdminStatus: (
    input: AdminRequestMutationCommand & {
      readonly expectedVersion: number;
      readonly status: RequestStatus;
    },
  ) => Promise<AdminRequestDetailView>;
}

interface ExistingRequestRow {
  readonly cart_snapshot: RequestSafeSnapshotView;
  readonly created_at: Date;
  readonly installment_interest: boolean;
  readonly measurement_requested: boolean;
  readonly public_reference_hash: string;
  readonly request_number: string;
}

interface CheckoutItemRow {
  readonly item_reference: string;
  readonly preview_state_id: string | null;
  readonly quote_snapshot_id: string;
  readonly catalog_version_id: string;
  readonly price_version_id: string | null;
  readonly pricing_status:
    'CALCULATED' | 'SOURCE_DATA_STALE' | 'PRICE_ON_REQUEST' | 'MANUAL_REVIEW_REQUIRED';
}

interface HandoffRow {
  readonly cart_snapshot: RequestSafeSnapshotView;
  readonly id: string;
  readonly installment_interest: boolean;
  readonly locality: string;
  readonly measurement_requested: boolean;
  readonly request_number: string;
}

interface PublicRequestRow {
  readonly cart_snapshot: RequestSafeSnapshotView;
  readonly created_at: Date;
  readonly installment_interest: boolean;
  readonly measurement_requested: boolean;
  readonly preview_sequences: number[];
  readonly request_number: string;
  readonly status: PublicRequestSummaryView['status'];
}

interface AdminRequestRow {
  readonly address: string | null;
  readonly cart_snapshot: RequestSafeSnapshotView;
  readonly comment: string | null;
  readonly contact_name: string;
  readonly contact_phone: string;
  readonly created_at: Date;
  readonly id: string;
  readonly installment_interest: boolean;
  readonly known_subtotal_minor: string;
  readonly locality: string;
  readonly measurement_requested: boolean;
  readonly pricing_status: CartPricingStatus;
  readonly public_reference_revoked_at: Date | null;
  readonly public_reference_sealed: string | null;
  readonly request_number: string;
  readonly status: RequestStatus;
  readonly total_count?: string;
  readonly updated_at: Date;
  readonly version: number;
}

function mapError(error: unknown): RequestStoreError {
  if (error instanceof RequestStoreError) return error;
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String(error.code);
    if (code === '23505' || code === '40001') return new RequestStoreError('REQUEST_CONFLICT');
    if (code === '22P02' || code === '23514') {
      return new RequestStoreError('REQUEST_INVALID_INPUT');
    }
  }
  return new RequestStoreError('REQUEST_DATABASE', { cause: error });
}

function assertInput(input: GuestCheckoutCommand): void {
  if (
    !/^[0-9a-f]{64}$/u.test(input.ownerTokenHash) ||
    !/^[A-Za-z0-9:._-]{8,180}$/u.test(input.idempotencyKey) ||
    !/^[A-Za-z0-9:._-]{8,128}$/u.test(input.correlationId) ||
    !/^\+[1-9]\d{7,14}$/u.test(input.contactPhone) ||
    !/^[A-Za-z0-9_-]{43}$/u.test(input.publicReference) ||
    !/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u.test(input.publicReferenceSealed) ||
    input.publicReferenceSealed.length > 512 ||
    !Number.isSafeInteger(input.expectedCartRevision) ||
    input.expectedCartRevision < 0 ||
    input.contactName.length < 2 ||
    input.contactName.length > 120 ||
    input.locality.length < 2 ||
    input.locality.length > 160 ||
    (input.address !== null && input.address.length > 500) ||
    (input.comment !== null && input.comment.length > 1_000) ||
    !/^[A-Za-z0-9._-]{3,64}$/u.test(input.consentVersion)
  ) {
    throw new RequestStoreError('REQUEST_INVALID_INPUT');
  }
}

function assertGuestRequestIdentity(input: GuestRequestCommandIdentity): void {
  if (
    !/^[0-9a-f]{64}$/u.test(input.ownerTokenHash) ||
    !/^[A-Za-z0-9:._-]{8,180}$/u.test(input.idempotencyKey) ||
    !/^[A-Za-z0-9:._-]{8,128}$/u.test(input.correlationId) ||
    !/^[A-Za-z0-9_-]{43}$/u.test(input.publicReference)
  ) {
    throw new RequestStoreError('REQUEST_INVALID_INPUT');
  }
}

function checkoutKey(ownerTokenHash: string, idempotencyKey: string): string {
  return `checkout:${createHash('sha256')
    .update(`${ownerTokenHash}:${idempotencyKey}`)
    .digest('hex')}`;
}

function assertAdminActor(actor: AdminRequestActor): void {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      actor.actorId,
    ) ||
    !['MANAGER', 'ADMIN', 'OWNER'].includes(actor.role)
  ) {
    throw new RequestStoreError('REQUEST_AUTHORIZATION');
  }
}

function assertAdminCommand(input: AdminRequestMutationCommand): void {
  assertAdminActor(input);
  if (
    !/^REQ-[0-9]{6}-[A-Z2-9]{8}$/u.test(input.requestNumber) ||
    !/^[A-Za-z0-9:._-]{8,180}$/u.test(input.idempotencyKey) ||
    !/^[A-Za-z0-9:._-]{8,128}$/u.test(input.correlationId)
  ) {
    throw new RequestStoreError('REQUEST_INVALID_INPUT');
  }
}

async function requireStaffRole(client: PoolClient, actor: AdminRequestActor): Promise<void> {
  assertAdminActor(actor);
  const result = await client.query<{ allowed: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1 FROM actor_identity actor
        JOIN role_grant grant_row ON grant_row.actor_id = actor.id
        WHERE actor.id = $1::uuid AND actor.disabled_at IS NULL
          AND grant_row.role = $2::system_role
      ) AS allowed
    `,
    [actor.actorId, actor.role],
  );
  if (result.rows[0]?.allowed !== true) {
    throw new RequestStoreError('REQUEST_AUTHORIZATION');
  }
}

function safeIntegerText(value: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new RequestStoreError('REQUEST_DATABASE');
  }
  return parsed;
}

function adminListItem(row: AdminRequestRow): AdminRequestListItemView {
  return {
    contactName: row.contact_name,
    contactPhone: row.contact_phone,
    createdAt: row.created_at.toISOString(),
    installmentInterest: row.installment_interest,
    itemCount: row.cart_snapshot.items.length,
    knownSubtotalKopecks: safeIntegerText(row.known_subtotal_minor),
    locality: row.locality,
    measurementRequested: row.measurement_requested,
    pricingStatus: row.pricing_status,
    requestNumber: row.request_number,
    status: row.status,
    totalQuantity: row.cart_snapshot.summary.totalQuantity,
    updatedAt: row.updated_at.toISOString(),
    version: row.version,
  };
}

async function adminRequestRow(
  client: PoolClient,
  requestNumber: string,
  lock = false,
): Promise<AdminRequestRow> {
  const result = await client.query<AdminRequestRow>(
    `
      SELECT inquiry.id::text, inquiry.request_number, inquiry.contact_name,
             inquiry.contact_phone, inquiry.locality, inquiry.address, inquiry.comment,
             inquiry.measurement_requested, inquiry.installment_interest,
             inquiry.cart_snapshot, inquiry.known_subtotal_minor::text,
             inquiry.pricing_status::text, inquiry.status::text, inquiry.version,
             inquiry.public_reference_sealed, inquiry.public_reference_revoked_at,
             inquiry.created_at, inquiry.updated_at
      FROM order_inquiry inquiry
      WHERE inquiry.request_number = $1
      ${lock ? 'FOR UPDATE' : ''}
    `,
    [requestNumber],
  );
  const row = result.rows[0];
  if (row === undefined) throw new RequestStoreError('REQUEST_NOT_FOUND');
  return row;
}

async function adminRequestDetail(
  client: PoolClient,
  requestNumber: string,
): Promise<AdminRequestDetailView> {
  const row = await adminRequestRow(client, requestNumber);
  const notes = await client.query<{ body: string; created_at: Date }>(
    `SELECT body, created_at FROM request_internal_note
     WHERE inquiry_id = $1::uuid ORDER BY created_at DESC, id DESC LIMIT 100`,
    [row.id],
  );
  const events = await client.query<{
    created_at: Date;
    safe_metadata: Readonly<Record<string, unknown>>;
    type: AdminRequestCommunicationView['type'];
  }>(
    `SELECT type::text, safe_metadata, created_at FROM request_communication_event
     WHERE inquiry_id = $1::uuid ORDER BY created_at DESC, id DESC LIMIT 200`,
    [row.id],
  );
  return {
    ...adminListItem(row),
    address: row.address,
    comment: row.comment,
    communicationEvents: events.rows.map((event) => ({
      createdAt: event.created_at.toISOString(),
      safeMetadata: event.safe_metadata,
      type: event.type,
    })),
    notes: notes.rows.map((note) => ({
      body: note.body,
      createdAt: note.created_at.toISOString(),
    })),
    publicReferenceRevokedAt: row.public_reference_revoked_at?.toISOString() ?? null,
    publicReferenceSealed: row.public_reference_sealed,
    snapshot: row.cart_snapshot,
  };
}

async function auditAdmin(
  client: PoolClient,
  actorId: string,
  correlationId: string,
  action: string,
  requestNumber: string | null,
): Promise<void> {
  await client.query(
    `
      INSERT INTO audit_event (
        actor_type, actor_identity_id, action, outcome, correlation_id,
        target_type, target_id, reason_code
      ) VALUES ('IDENTITY',$1::uuid,$2,'SUCCEEDED',$3,'ORDER_INQUIRY',$4,'PHASE_1E_REQUEST_ADMIN')
    `,
    [actorId, action, correlationId, requestNumber],
  );
}

function receipt(row: ExistingRequestRow, publicReference: string): RequestReceiptView {
  if (row.public_reference_hash !== publicReferenceHash(publicReference)) {
    throw new RequestStoreError('REQUEST_CONFLICT');
  }
  return {
    createdAt: row.created_at.toISOString(),
    installmentInterest: row.installment_interest,
    measurementRequested: row.measurement_requested,
    publicSummaryHref: `/request/${publicReference}`,
    requestNumber: row.request_number,
    snapshot: row.cart_snapshot,
    status: 'NEW',
  };
}

async function existingRequest(
  client: PoolClient,
  key: string,
  ownerTokenHash: string,
): Promise<ExistingRequestRow | null> {
  const result = await client.query<ExistingRequestRow>(
    `
      SELECT inquiry.request_number, inquiry.public_reference_hash, inquiry.cart_snapshot,
             inquiry.measurement_requested, inquiry.installment_interest, inquiry.created_at
      FROM order_inquiry inquiry
      JOIN guest_cart_session session ON session.id = inquiry.guest_session_id
      WHERE inquiry.checkout_idempotency_key = $1 AND session.token_hash = $2
    `,
    [key, ownerTokenHash],
  );
  return result.rows[0] ?? null;
}

async function checkoutItems(
  client: PoolClient,
  cart: CartIdentityRow,
): Promise<readonly CheckoutItemRow[]> {
  const result = await client.query<CheckoutItemRow>(
    `
      SELECT item.public_reference AS item_reference, item.quote_snapshot_id::text,
             item.preview_state_id::text, quote.catalog_version_id::text,
             quote.price_version_id::text, quote.status::text AS pricing_status
      FROM cart_item item JOIN quote_snapshot quote ON quote.id = item.quote_snapshot_id
      WHERE item.cart_id = $1::uuid AND item.removed_at IS NULL
      ORDER BY item.position, item.created_at, item.id
      FOR SHARE OF item
    `,
    [cart.cart_id],
  );
  return result.rows;
}

async function insertOutbox(
  client: PoolClient,
  requestId: string,
  requestNumber: string,
  correlationId: string,
  topic: string,
  safePayload: Readonly<Record<string, unknown>>,
): Promise<void> {
  await client.query(
    `
      INSERT INTO outbox_event (
        topic, schema_version, payload, idempotency_key, correlation_id
      ) VALUES ($1,1,$2::jsonb,$3,$4)
    `,
    [topic, JSON.stringify(safePayload), `request:${requestId}:${topic}`, correlationId],
  );
  if (!requestNumber.startsWith('REQ-')) throw new RequestStoreError('REQUEST_DATABASE');
}

async function ownedRequest(
  client: PoolClient,
  ownerTokenHash: string,
  publicReference: string,
): Promise<HandoffRow> {
  const result = await client.query<HandoffRow>(
    `
      SELECT inquiry.id::text, inquiry.request_number, inquiry.cart_snapshot,
             inquiry.measurement_requested, inquiry.installment_interest, inquiry.locality
      FROM order_inquiry inquiry
      JOIN guest_cart_session session ON session.id = inquiry.guest_session_id
      WHERE inquiry.public_reference_hash = $1
        AND inquiry.public_reference_revoked_at IS NULL
        AND session.token_hash = $2
        AND session.revoked_at IS NULL
        AND session.expires_at > NOW()
    `,
    [publicReferenceHash(publicReference), ownerTokenHash],
  );
  const row = result.rows[0];
  if (row === undefined) throw new RequestStoreError('REQUEST_NOT_FOUND');
  return row;
}

function communicationMetadata(
  type: GuestRequestCommunicationType,
): Readonly<Record<string, unknown>> {
  if (type === 'WHATSAPP_LINK_GENERATED') {
    return { automaticSend: false, channel: 'WA_ME', recipientFixed: true };
  }
  if (type === 'WHATSAPP_LINK_OPENED') {
    return { channel: 'WA_ME', meaning: 'LINK_OPENED_ONLY' };
  }
  return { channel: 'LOCAL_CLIPBOARD', meaning: 'MESSAGE_COPIED_ONLY' };
}

async function appendGuestCommunication(
  client: PoolClient,
  inquiry: HandoffRow,
  type: GuestRequestCommunicationType,
  input: GuestRequestCommandIdentity,
): Promise<boolean> {
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO request_communication_event (
        inquiry_id, type, actor_type, idempotency_key, safe_metadata, correlation_id
      ) VALUES ($1::uuid,$2::request_communication_event_type,'ANONYMOUS',$3,$4::jsonb,$5)
      ON CONFLICT (inquiry_id, idempotency_key) DO NOTHING
      RETURNING id::text
    `,
    [
      inquiry.id,
      type,
      `${type}:${input.idempotencyKey}`,
      JSON.stringify(communicationMetadata(type)),
      input.correlationId,
    ],
  );
  if (result.rows[0] === undefined) return false;
  await client.query(
    `
      INSERT INTO audit_event (
        actor_type, action, outcome, correlation_id, target_type, target_id, reason_code
      ) VALUES ('ANONYMOUS',$1,'SUCCEEDED',$2,'ORDER_INQUIRY',$3,'PHASE_1E_LOCAL_HANDOFF')
    `,
    [`request.communication.${type.toLowerCase()}`, input.correlationId, inquiry.request_number],
  );
  return true;
}

export function createRequestAdapter(environment: DatabaseEnvironment): RequestAdapter {
  const pool = new Pool({
    connectionString: environment.DATABASE_URL,
    max: 8,
    statement_timeout: environment.DATABASE_STATEMENT_TIMEOUT_MS,
  });

  return {
    async addAdminNote(input) {
      assertAdminCommand(input);
      const body = input.body.trim();
      if (body.length === 0 || body.length > 1_000) {
        throw new RequestStoreError('REQUEST_INVALID_INPUT');
      }
      return cartTransaction(
        pool,
        async (client) => {
          await requireStaffRole(client, input);
          const inquiry = await adminRequestRow(client, input.requestNumber, true);
          const inserted = await client.query<{ id: string }>(
            `
              INSERT INTO request_internal_note (
                inquiry_id, author_actor_id, idempotency_key, body
              ) VALUES ($1::uuid,$2::uuid,$3,$4)
              ON CONFLICT (inquiry_id, idempotency_key) DO NOTHING
              RETURNING id::text
            `,
            [inquiry.id, input.actorId, `NOTE:${input.idempotencyKey}`, body],
          );
          if (inserted.rows[0] !== undefined) {
            await auditAdmin(
              client,
              input.actorId,
              input.correlationId,
              'request.admin.note_added',
              input.requestNumber,
            );
          }
          return adminRequestDetail(client, input.requestNumber);
        },
        mapError,
      );
    },

    async close() {
      await pool.end();
    },

    async checkout(input) {
      assertInput(input);
      try {
        return await cartTransaction(
          pool,
          async (client) => {
            const key = checkoutKey(input.ownerTokenHash, input.idempotencyKey);
            const previous = await existingRequest(client, key, input.ownerTokenHash);
            if (previous !== null) return receipt(previous, input.publicReference);

            const cart = await ownedCart(client, input.ownerTokenHash, true).catch((error) => {
              throw new RequestStoreError('REQUEST_AUTHORIZATION', { cause: error });
            });
            if (cart.cart_revision !== input.expectedCartRevision) {
              throw new RequestStoreError('REQUEST_CONFLICT');
            }
            const state = await loadCartState(client, cart);
            const rows = await checkoutItems(client, cart);
            if (state.items.length === 0 || rows.length !== state.items.length) {
              throw new RequestStoreError('REQUEST_CART_EMPTY');
            }

            const capturedAt = new Date().toISOString();
            const snapshot: RequestSafeSnapshotView = {
              capturedAt,
              items: state.items,
              priceVersionChangedItemCount: state.priceVersionChangedItemCount,
              services: { delivery: 'FREE', installation: 'FREE', measurement: 'FREE' },
              summary: state.summary,
              version: 1,
            };
            const requestNumber = createRequestNumber();
            const referenceHash = publicReferenceHash(input.publicReference);
            const catalogVersionIds = [
              ...new Set(rows.map((row) => row.catalog_version_id)),
            ].sort();
            const priceVersionIds = [
              ...new Set(
                rows
                  .map((row) => row.price_version_id)
                  .filter((value): value is string => value !== null),
              ),
            ].sort();
            const inserted = await client.query<{ created_at: Date; id: string }>(
              `
              INSERT INTO order_inquiry (
                request_number, guest_session_id, cart_id, checkout_idempotency_key,
                public_reference_hash, public_reference_sealed, contact_name, contact_phone,
                locality, address, comment,
                measurement_requested, installment_interest, consent_version, consent_at,
                status, cart_snapshot, known_subtotal_minor, pricing_status,
                catalog_version_ids, price_version_ids, source_channel, correlation_id,
                audit_context, version, updated_at
              ) VALUES (
                $1,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),
                'NEW',$15::jsonb,$16::bigint,$17::cart_pricing_status,$18::jsonb,$19::jsonb,
                'WEB_GUEST',$20,$21::jsonb,1,NOW()
              ) RETURNING id::text, created_at
            `,
              [
                requestNumber,
                cart.session_id,
                cart.cart_id,
                key,
                referenceHash,
                input.publicReferenceSealed,
                input.contactName,
                input.contactPhone,
                input.locality,
                input.address,
                input.comment,
                input.measurementRequested,
                input.installmentInterest,
                input.consentVersion,
                JSON.stringify(snapshot),
                state.summary.knownSubtotalKopecks,
                state.summary.pricingStatus,
                JSON.stringify(catalogVersionIds),
                JSON.stringify(priceVersionIds),
                input.correlationId,
                JSON.stringify({
                  actorType: 'ANONYMOUS',
                  phase: '1E',
                  piiLoggable: false,
                  source: 'WEB_GUEST',
                }),
              ],
            );
            const request = inserted.rows[0];
            if (request === undefined) throw new RequestStoreError('REQUEST_DATABASE');

            for (const [index, row] of rows.entries()) {
              const item = state.items[index];
              if (item === undefined || item.itemReference !== row.item_reference) {
                throw new RequestStoreError('REQUEST_CONFLICT');
              }
              await client.query(
                `
                INSERT INTO request_item_snapshot (
                  inquiry_id, sequence, quote_snapshot_id, preview_state_id, snapshot,
                  pricing_status, known_total_minor
                ) VALUES ($1::uuid,$2,$3::uuid,$4::uuid,$5::jsonb,$6::pricing_calculation_status,$7::bigint)
              `,
                [
                  request.id,
                  index + 1,
                  row.quote_snapshot_id,
                  row.preview_state_id,
                  JSON.stringify(item),
                  row.pricing_status,
                  item.quantityTotalKopecks,
                ],
              );
            }

            const safeEvent = {
              installmentInterest: input.installmentInterest,
              itemCount: state.items.length,
              measurementRequested: input.measurementRequested,
              pricingStatus: state.summary.pricingStatus,
              totalQuantity: state.summary.totalQuantity,
            };
            await client.query(
              `
              INSERT INTO request_communication_event (
                inquiry_id, type, actor_type, safe_metadata, correlation_id
              ) VALUES ($1::uuid,'REQUEST_CREATED','ANONYMOUS',$2::jsonb,$3)
            `,
              [request.id, JSON.stringify(safeEvent), input.correlationId],
            );
            await client.query(
              `
              INSERT INTO audit_event (
                actor_type, action, outcome, correlation_id, target_type, target_id, reason_code
              ) VALUES
                ('ANONYMOUS','request.created','SUCCEEDED',$1,'ORDER_INQUIRY',$2,'PHASE_1E_GUEST_CHECKOUT'),
                ('ANONYMOUS','cart.checked_out','SUCCEEDED',$1,'GUEST_CART',$3,'PHASE_1E_GUEST_CHECKOUT')
            `,
              [input.correlationId, requestNumber, cart.cart_id],
            );

            await insertOutbox(
              client,
              request.id,
              requestNumber,
              input.correlationId,
              'request.created',
              { ...safeEvent, requestNumber },
            );
            await insertOutbox(
              client,
              request.id,
              requestNumber,
              input.correlationId,
              'cart.checked_out',
              { itemCount: state.items.length, requestNumber },
            );
            if (input.measurementRequested) {
              await insertOutbox(
                client,
                request.id,
                requestNumber,
                input.correlationId,
                'measurement.requested',
                { requestNumber },
              );
            }
            if (input.installmentInterest) {
              await insertOutbox(
                client,
                request.id,
                requestNumber,
                input.correlationId,
                'installment.interest_recorded',
                { requestNumber },
              );
            }

            await client.query(
              `
              UPDATE guest_cart SET status = 'CHECKED_OUT', checked_out_at = NOW(),
                     revision = revision + 1, updated_at = NOW()
              WHERE id = $1::uuid AND status = 'ACTIVE'
            `,
              [cart.cart_id],
            );
            return receipt(
              {
                cart_snapshot: snapshot,
                created_at: request.created_at,
                installment_interest: input.installmentInterest,
                measurement_requested: input.measurementRequested,
                public_reference_hash: referenceHash,
                request_number: requestNumber,
              },
              input.publicReference,
            );
          },
          mapError,
        );
      } catch (error) {
        throw mapError(error);
      }
    },

    async generateHandoff(input) {
      assertGuestRequestIdentity(input);
      return cartTransaction(
        pool,
        async (client) => {
          const inquiry = await ownedRequest(client, input.ownerTokenHash, input.publicReference);
          await appendGuestCommunication(client, inquiry, 'WHATSAPP_LINK_GENERATED', input);
          return {
            installmentInterest: inquiry.installment_interest,
            locality: inquiry.locality,
            measurementRequested: inquiry.measurement_requested,
            publicSummaryHref: `/request/${input.publicReference}`,
            requestNumber: inquiry.request_number,
            snapshot: inquiry.cart_snapshot,
          };
        },
        mapError,
      );
    },

    async getPublicPreviewAsset(publicReference, sequence) {
      if (!Number.isSafeInteger(sequence) || sequence <= 0 || sequence > 50) {
        throw new RequestStoreError('REQUEST_NOT_FOUND');
      }
      try {
        const result = await pool.query<{
          readonly byte_size: number;
          readonly file_hash: string;
          readonly height: number;
          readonly id: string;
          readonly mime_type: string;
          readonly object_key: string;
          readonly storage_zone: string;
          readonly width: number;
        }>(
          `
            SELECT asset.id::text, asset.file_hash, asset.storage_zone, asset.object_key,
                   asset.mime_type, asset.byte_size, asset.width, asset.height
            FROM order_inquiry inquiry
            JOIN request_item_snapshot item ON item.inquiry_id = inquiry.id
            JOIN standard_preview_state preview ON preview.id = item.preview_state_id
            JOIN media_asset asset ON asset.id = preview.material_asset_id
            WHERE inquiry.public_reference_hash = $1
              AND inquiry.public_reference_revoked_at IS NULL
              AND item.sequence = $2
              AND asset.publication_status = 'PUBLICATION_APPROVED'
              AND asset.rights_status IN ('PARTNER_LICENSE','OWNER_CREATED')
              AND asset.mime_type IN ('image/jpeg','image/png','image/webp')
              AND asset.storage_zone IN ('private','public','quarantine')
          `,
          [publicReferenceHash(publicReference), sequence],
        );
        const asset = result.rows[0];
        if (asset === undefined) throw new RequestStoreError('REQUEST_NOT_FOUND');
        return {
          byteSize: asset.byte_size,
          checksumSha256: asset.file_hash,
          contentType: asset.mime_type as PreviewAssetDescriptor['contentType'],
          height: asset.height,
          id: asset.id,
          objectKey: asset.object_key,
          storageZone: asset.storage_zone as PreviewAssetDescriptor['storageZone'],
          width: asset.width,
        };
      } catch (error) {
        throw mapError(error);
      }
    },

    async getPublicSummary(publicReference) {
      try {
        const result = await pool.query<PublicRequestRow>(
          `
            SELECT inquiry.request_number, inquiry.cart_snapshot, inquiry.created_at,
                   inquiry.measurement_requested, inquiry.installment_interest,
                   inquiry.status::text,
                   ARRAY(
                     SELECT item.sequence
                     FROM request_item_snapshot item
                     WHERE item.inquiry_id = inquiry.id AND item.preview_state_id IS NOT NULL
                     ORDER BY item.sequence
                   ) AS preview_sequences
            FROM order_inquiry inquiry
            WHERE inquiry.public_reference_hash = $1
              AND inquiry.public_reference_revoked_at IS NULL
          `,
          [publicReferenceHash(publicReference)],
        );
        const row = result.rows[0];
        if (row === undefined) throw new RequestStoreError('REQUEST_NOT_FOUND');
        return {
          createdAt: row.created_at.toISOString(),
          installmentInterest: row.installment_interest,
          measurementRequested: row.measurement_requested,
          previewSequences: row.preview_sequences,
          requestNumber: row.request_number,
          snapshot: row.cart_snapshot,
          status: row.status,
        };
      } catch (error) {
        throw mapError(error);
      }
    },

    async getAdminRequest(input) {
      assertAdminActor(input);
      if (
        !/^REQ-[0-9]{6}-[A-Z2-9]{8}$/u.test(input.requestNumber) ||
        !/^[A-Za-z0-9:._-]{8,128}$/u.test(input.correlationId)
      ) {
        throw new RequestStoreError('REQUEST_INVALID_INPUT');
      }
      return cartTransaction(
        pool,
        async (client) => {
          await requireStaffRole(client, input);
          const detail = await adminRequestDetail(client, input.requestNumber);
          await auditAdmin(
            client,
            input.actorId,
            input.correlationId,
            'request.admin.viewed',
            input.requestNumber,
          );
          return detail;
        },
        mapError,
      );
    },

    async listAdminRequests(input) {
      assertAdminActor(input);
      if (
        !Number.isSafeInteger(input.page) ||
        input.page <= 0 ||
        !Number.isSafeInteger(input.pageSize) ||
        input.pageSize <= 0 ||
        input.pageSize > 100 ||
        !/^[A-Za-z0-9:._-]{8,128}$/u.test(input.correlationId)
      ) {
        throw new RequestStoreError('REQUEST_INVALID_INPUT');
      }
      return cartTransaction(
        pool,
        async (client) => {
          await requireStaffRole(client, input);
          const result = await client.query<AdminRequestRow>(
            `
              SELECT inquiry.id::text, inquiry.request_number, inquiry.contact_name,
                     inquiry.contact_phone, inquiry.locality, inquiry.address, inquiry.comment,
                     inquiry.measurement_requested, inquiry.installment_interest,
                     inquiry.cart_snapshot, inquiry.known_subtotal_minor::text,
                     inquiry.pricing_status::text, inquiry.status::text, inquiry.version,
                     inquiry.public_reference_sealed, inquiry.public_reference_revoked_at,
                     inquiry.created_at, inquiry.updated_at, COUNT(*) OVER()::text AS total_count
              FROM order_inquiry inquiry
              WHERE ($1::text IS NULL OR inquiry.status::text = $1)
              ORDER BY inquiry.created_at DESC, inquiry.id DESC
              LIMIT $2 OFFSET $3
            `,
            [input.status, input.pageSize, (input.page - 1) * input.pageSize],
          );
          await auditAdmin(
            client,
            input.actorId,
            input.correlationId,
            'request.admin.listed',
            null,
          );
          return {
            items: result.rows.map(adminListItem),
            page: input.page,
            pageSize: input.pageSize,
            totalCount:
              result.rows[0]?.total_count === undefined
                ? 0
                : safeIntegerText(result.rows[0].total_count),
          };
        },
        mapError,
      );
    },

    async recordCommunication(input) {
      assertGuestRequestIdentity(input);
      return cartTransaction(
        pool,
        async (client) => {
          const inquiry = await ownedRequest(client, input.ownerTokenHash, input.publicReference);
          return appendGuestCommunication(client, inquiry, input.type, input);
        },
        mapError,
      );
    },

    async revokePublicReference(input) {
      assertAdminCommand(input);
      if (input.role === 'MANAGER') throw new RequestStoreError('REQUEST_AUTHORIZATION');
      return cartTransaction(
        pool,
        async (client) => {
          await requireStaffRole(client, input);
          const inquiry = await adminRequestRow(client, input.requestNumber, true);
          const updated = await client.query(
            `UPDATE order_inquiry
             SET public_reference_revoked_at = COALESCE(public_reference_revoked_at, NOW()),
                 version = CASE WHEN public_reference_revoked_at IS NULL THEN version + 1 ELSE version END,
                 updated_at = CASE WHEN public_reference_revoked_at IS NULL THEN NOW() ELSE updated_at END
             WHERE id = $1::uuid AND public_reference_revoked_at IS NULL`,
            [inquiry.id],
          );
          if ((updated.rowCount ?? 0) > 0) {
            await auditAdmin(
              client,
              input.actorId,
              input.correlationId,
              'request.admin.public_reference_revoked',
              input.requestNumber,
            );
          }
          return adminRequestDetail(client, input.requestNumber);
        },
        mapError,
      );
    },

    async updateAdminStatus(input) {
      assertAdminCommand(input);
      if (
        !Number.isSafeInteger(input.expectedVersion) ||
        input.expectedVersion <= 0 ||
        !['NEW', 'IN_REVIEW', 'CONTACTED', 'CONFIRMED', 'CANCELLED'].includes(input.status)
      ) {
        throw new RequestStoreError('REQUEST_INVALID_INPUT');
      }
      return cartTransaction(
        pool,
        async (client) => {
          await requireStaffRole(client, input);
          const eventKey = `STATUS_CHANGED:${input.idempotencyKey}`;
          const replay = await client.query<{ found: boolean }>(
            `
              SELECT EXISTS (
                SELECT 1 FROM request_communication_event event
                JOIN order_inquiry inquiry ON inquiry.id = event.inquiry_id
                WHERE inquiry.request_number = $1 AND event.idempotency_key = $2
              ) AS found
            `,
            [input.requestNumber, eventKey],
          );
          if (replay.rows[0]?.found === true) {
            return adminRequestDetail(client, input.requestNumber);
          }
          const inquiry = await adminRequestRow(client, input.requestNumber, true);
          if (inquiry.version !== input.expectedVersion) {
            throw new RequestStoreError('REQUEST_CONFLICT');
          }
          if (!canTransitionRequestStatus(inquiry.status, input.status, input.role)) {
            throw new RequestStoreError('REQUEST_AUTHORIZATION');
          }
          if (inquiry.status === input.status)
            return adminRequestDetail(client, input.requestNumber);
          await client.query(
            `UPDATE order_inquiry SET status = $1::order_inquiry_status,
                    version = version + 1, updated_at = NOW()
             WHERE id = $2::uuid AND version = $3`,
            [input.status, inquiry.id, input.expectedVersion],
          );
          await client.query(
            `
              INSERT INTO request_communication_event (
                inquiry_id, type, actor_type, actor_identity_id, idempotency_key,
                safe_metadata, correlation_id
              ) VALUES ($1::uuid,'STATUS_CHANGED','IDENTITY',$2::uuid,$3,$4::jsonb,$5)
            `,
            [
              inquiry.id,
              input.actorId,
              eventKey,
              JSON.stringify({ from: inquiry.status, to: input.status }),
              input.correlationId,
            ],
          );
          await auditAdmin(
            client,
            input.actorId,
            input.correlationId,
            'request.admin.status_changed',
            input.requestNumber,
          );
          return adminRequestDetail(client, input.requestNumber);
        },
        mapError,
      );
    },
  };
}
