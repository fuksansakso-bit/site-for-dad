import { createHash } from 'node:crypto';

import {
  createRequestNumber,
  publicReferenceHash,
  type CartMoneySummary,
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
}

export interface RequestAdapter {
  readonly checkout: (input: GuestCheckoutCommand) => Promise<RequestReceiptView>;
  readonly close: () => Promise<void>;
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

function checkoutKey(ownerTokenHash: string, idempotencyKey: string): string {
  return `checkout:${createHash('sha256')
    .update(`${ownerTokenHash}:${idempotencyKey}`)
    .digest('hex')}`;
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

export function createRequestAdapter(environment: DatabaseEnvironment): RequestAdapter {
  const pool = new Pool({
    connectionString: environment.DATABASE_URL,
    max: 8,
    statement_timeout: environment.DATABASE_STATEMENT_TIMEOUT_MS,
  });

  return {
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
                public_reference_hash, contact_name, contact_phone, locality, address, comment,
                measurement_requested, installment_interest, consent_version, consent_at,
                status, cart_snapshot, known_subtotal_minor, pricing_status,
                catalog_version_ids, price_version_ids, source_channel, correlation_id,
                audit_context, version, updated_at
              ) VALUES (
                $1,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),
                'NEW',$14::jsonb,$15::bigint,$16::cart_pricing_status,$17::jsonb,$18::jsonb,
                'WEB_GUEST',$19,$20::jsonb,1,NOW()
              ) RETURNING id::text, created_at
            `,
              [
                requestNumber,
                cart.session_id,
                cart.cart_id,
                key,
                referenceHash,
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
  };
}
