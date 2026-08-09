import { createHash, randomBytes } from 'node:crypto';

import { summarizeCart, type CartMoneySummary, type CartProductSnapshot } from '@project-name/cart';
import type { DatabaseEnvironment } from '@project-name/config/server';
import type { PricingSelection } from '@project-name/pricing';
import { Pool, type PoolClient } from 'pg';

export type CartStoreErrorCode =
  | 'CART_AUTHORIZATION'
  | 'CART_CONFLICT'
  | 'CART_DATABASE'
  | 'CART_INVALID_INPUT'
  | 'CART_NOT_FOUND'
  | 'CART_QUOTE_UNAVAILABLE';

export class CartStoreError extends Error {
  public constructor(
    public readonly code: CartStoreErrorCode,
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = 'CartStoreError';
  }
}

type AllowedQuoteStatus =
  'CALCULATED' | 'SOURCE_DATA_STALE' | 'PRICE_ON_REQUEST' | 'MANUAL_REVIEW_REQUIRED';

export interface CartIdentityRow {
  readonly cart_id: string;
  readonly cart_revision: number;
  readonly expires_at: Date;
  readonly session_id: string;
}

export interface CartItemRow {
  readonly breakdown_snapshot: unknown;
  readonly catalog_version_id: string;
  readonly catalog_version_number: number;
  readonly configuration_snapshot: unknown;
  readonly item_id: string;
  readonly item_reference: string;
  readonly item_revision: number;
  readonly preview_public_token: string | null;
  readonly price_version_id: string | null;
  readonly price_version_number: number | null;
  readonly quote_created_at: Date;
  readonly quote_snapshot_id: string;
  readonly preview_state_id: string | null;
  readonly status: AllowedQuoteStatus;
}

interface QuoteIdentityRow {
  readonly calculation_id: string;
  readonly id: string;
  readonly status: AllowedQuoteStatus;
}

interface OwnedItemRow {
  readonly cart_id: string;
  readonly cart_revision: number;
  readonly id: string;
  readonly preview_state_id: string | null;
  readonly quote_snapshot_id: string;
  readonly revision: number;
}

export interface CartItemView {
  readonly catalogVersionNumber: number;
  readonly editHref: string;
  readonly itemReference: string;
  readonly minimumPriceApplied: boolean;
  readonly optionsTotalKopecks: number | null;
  readonly previewHref: string | null;
  readonly priceVersionNumber: number | null;
  readonly pricingStatus: AllowedQuoteStatus;
  readonly product: CartProductSnapshot;
  readonly quantityTotalKopecks: number | null;
  readonly quoteCreatedAt: string;
  readonly revision: number;
  readonly unitPriceKopecks: number | null;
  readonly warnings: readonly string[];
  readonly wasCalculatedWithPreviousPrice: boolean;
}

export interface CartStateView {
  readonly cartRevision: number;
  readonly expiresAt: string;
  readonly items: readonly CartItemView[];
  readonly priceVersionChangedItemCount: number;
  readonly summary: CartMoneySummary;
}

interface CartCommandBase {
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly ownerTokenHash: string;
  readonly sessionExpiresAt: string;
}

export interface CartAddCommand extends CartCommandBase {
  readonly previewOwnerTokenHash?: string;
  readonly previewStateToken?: string;
  readonly quoteToken: string;
}

export interface CartReplaceCommand extends CartAddCommand {
  readonly expectedItemRevision: number;
  readonly itemReference: string;
}

export interface CartCommand extends CartCommandBase {
  readonly expectedCartRevision: number;
  readonly itemReference?: string;
}

export interface CartDuplicateCommand extends CartCommand {
  readonly itemReference: string;
}

export interface CartAdapter {
  readonly addQuote: (input: CartAddCommand) => Promise<CartStateView>;
  readonly clear: (input: CartCommand) => Promise<CartStateView>;
  readonly close: () => Promise<void>;
  readonly duplicate: (input: CartDuplicateCommand) => Promise<CartStateView>;
  readonly get: (ownerTokenHash: string, sessionExpiresAt: string) => Promise<CartStateView>;
  readonly getEditSelection: (
    ownerTokenHash: string,
    itemReference: string,
  ) => Promise<PricingSelection>;
  readonly remove: (input: CartDuplicateCommand) => Promise<CartStateView>;
  readonly replaceQuote: (input: CartReplaceCommand) => Promise<CartStateView>;
}

function mapError(error: unknown): CartStoreError {
  if (error instanceof CartStoreError) return error;
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String(error.code);
    if (code === '23505' || code === '40001') return new CartStoreError('CART_CONFLICT');
    if (code === '22P02' || code === '23514') return new CartStoreError('CART_INVALID_INPUT');
  }
  return new CartStoreError('CART_DATABASE', { cause: error });
}

function assertOpaque(value: string, maximum: number): void {
  if (!/^[A-Za-z0-9:._-]{8,}$/u.test(value) || value.length > maximum) {
    throw new CartStoreError('CART_INVALID_INPUT');
  }
}

function assertOwnerHash(value: string): void {
  if (!/^[0-9a-f]{64}$/u.test(value)) throw new CartStoreError('CART_AUTHORIZATION');
}

function record(value: unknown): Readonly<Record<string, unknown>> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : null;
}

function text(value: unknown, fallback = 'Уточнит менеджер'): string {
  return typeof value === 'string' && value.trim() !== '' ? value.slice(0, 255) : fallback;
}

function integer(value: unknown): number | null {
  return Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : null;
}

export function productSnapshot(configuration: unknown, breakdown: unknown): CartProductSnapshot {
  const configurationRecord = record(configuration);
  const ids = record(configurationRecord?.['ids']);
  const names = record(configurationRecord?.['names']);
  const result = record(breakdown);
  const additional = names?.['additionalOptions'];
  const quantity = integer(ids?.['quantity']) ?? integer(result?.['quantity']);
  if (quantity === null || quantity <= 0) throw new CartStoreError('CART_QUOTE_UNAVAILABLE');
  const width = integer(ids?.['widthMm']);
  const height = integer(ids?.['heightMm']);
  return {
    additionalOptions: Array.isArray(additional)
      ? additional.filter((value): value is string => typeof value === 'string').slice(0, 24)
      : [],
    color: text(names?.['materialColor']),
    control: text(names?.['control']),
    family: text(names?.['family']),
    hardware: text(names?.['hardware']),
    heightMm: height === 0 ? null : height,
    material: text(names?.['material']),
    materialArticle: text(names?.['materialArticle']),
    model: text(names?.['model']),
    modelCode: text(names?.['modelCode']),
    mounting: text(names?.['mounting']),
    quantity,
    system: text(names?.['system']),
    widthMm: width === 0 ? null : width,
  };
}

export function breakdownSnapshot(value: unknown, status: AllowedQuoteStatus) {
  const source = record(value);
  if (source === null) throw new CartStoreError('CART_QUOTE_UNAVAILABLE');
  const priced = status === 'CALCULATED' || status === 'SOURCE_DATA_STALE';
  const grandTotal = integer(source['grandTotalKopecks']);
  const unitFinal = integer(source['unitFinalPriceKopecks']);
  const optionsTotal = integer(source['optionsTotalKopecks']);
  if (priced !== (grandTotal !== null && unitFinal !== null)) {
    throw new CartStoreError('CART_QUOTE_UNAVAILABLE');
  }
  const rawWarnings = source['warnings'];
  return {
    grandTotal,
    minimumPriceApplied: source['minimumPriceApplied'] === true,
    optionsTotal,
    unitFinal,
    warnings: Array.isArray(rawWarnings)
      ? rawWarnings.filter((warning): warning is string => typeof warning === 'string').slice(0, 32)
      : [],
  };
}

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function publicReference(): string {
  return randomBytes(24).toString('base64url');
}

export async function cartTransaction<T>(
  pool: Pool,
  operation: (client: PoolClient) => Promise<T>,
  mapFailure: (error: unknown) => Error = mapError,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const value = await operation(client);
    await client.query('COMMIT');
    return value;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw mapFailure(error);
  } finally {
    client.release();
  }
}

async function ensureCart(
  client: PoolClient,
  ownerTokenHash: string,
  expiresAt: string,
): Promise<CartIdentityRow> {
  assertOwnerHash(ownerTokenHash);
  const expiry = new Date(expiresAt);
  if (!Number.isFinite(expiry.valueOf()) || expiry <= new Date()) {
    throw new CartStoreError('CART_AUTHORIZATION');
  }
  const session = await client.query<{ id: string }>(
    `
      INSERT INTO guest_cart_session (token_hash, expires_at, last_seen_at, updated_at)
      VALUES ($1,$2::timestamptz,NOW(),NOW())
      ON CONFLICT (token_hash) DO UPDATE
      SET expires_at = GREATEST(guest_cart_session.expires_at, EXCLUDED.expires_at),
          last_seen_at = NOW(), updated_at = NOW()
      WHERE guest_cart_session.revoked_at IS NULL AND guest_cart_session.expires_at > NOW()
      RETURNING id::text
    `,
    [ownerTokenHash, expiry.toISOString()],
  );
  const sessionId = session.rows[0]?.id;
  if (sessionId === undefined) throw new CartStoreError('CART_AUTHORIZATION');
  const cart = await client.query<CartIdentityRow>(
    `
      INSERT INTO guest_cart (session_id, status, revision, expires_at, updated_at)
      VALUES ($1::uuid,'ACTIVE',0,$2::timestamptz,NOW())
      ON CONFLICT (session_id) WHERE status = 'ACTIVE' DO UPDATE
      SET expires_at = GREATEST(guest_cart.expires_at, EXCLUDED.expires_at), updated_at = NOW()
      RETURNING id::text AS cart_id, session_id::text, revision AS cart_revision, expires_at
    `,
    [sessionId, expiry.toISOString()],
  );
  const row = cart.rows[0];
  if (row === undefined) throw new CartStoreError('CART_DATABASE');
  return row;
}

export async function ownedCart(
  client: PoolClient,
  ownerTokenHash: string,
  lock = false,
): Promise<CartIdentityRow> {
  assertOwnerHash(ownerTokenHash);
  const result = await client.query<CartIdentityRow>(
    `
      SELECT cart.id::text AS cart_id, cart.session_id::text, cart.revision AS cart_revision,
             cart.expires_at
      FROM guest_cart cart
      JOIN guest_cart_session session ON session.id = cart.session_id
      WHERE session.token_hash = $1 AND session.revoked_at IS NULL AND session.expires_at > NOW()
        AND cart.status = 'ACTIVE' AND cart.expires_at > NOW()
      ${lock ? 'FOR UPDATE OF cart' : ''}
    `,
    [ownerTokenHash],
  );
  const row = result.rows[0];
  if (row === undefined) throw new CartStoreError('CART_AUTHORIZATION');
  return row;
}

async function activePriceVersionId(client: PoolClient): Promise<string | null> {
  const result = await client.query<{ id: string }>(
    `SELECT id::text FROM price_version WHERE status = 'ACTIVE' ORDER BY activated_at DESC NULLS LAST LIMIT 1`,
  );
  return result.rows[0]?.id ?? null;
}

export async function loadCartState(
  client: PoolClient,
  cart: CartIdentityRow,
): Promise<CartStateView> {
  const [itemsResult, currentPriceVersionId] = await Promise.all([
    client.query<CartItemRow>(
      `
        SELECT item.id::text AS item_id, item.public_reference AS item_reference,
               item.revision AS item_revision, quote.status::text, quote.catalog_version_id::text,
               quote.price_version_id::text, quote.configuration_snapshot, quote.breakdown_snapshot,
               quote.created_at AS quote_created_at, catalog.version_number AS catalog_version_number,
               price.version_number AS price_version_number, preview.public_token AS preview_public_token,
               quote.id::text AS quote_snapshot_id, item.preview_state_id::text
        FROM cart_item item
        JOIN quote_snapshot quote ON quote.id = item.quote_snapshot_id
        JOIN catalog_version catalog ON catalog.id = quote.catalog_version_id
        LEFT JOIN price_version price ON price.id = quote.price_version_id
        LEFT JOIN standard_preview_state preview ON preview.id = item.preview_state_id
        WHERE item.cart_id = $1::uuid AND item.removed_at IS NULL
        ORDER BY item.position, item.created_at, item.id
      `,
      [cart.cart_id],
    ),
    activePriceVersionId(client),
  ]);

  const snapshots = itemsResult.rows.map((row) => {
    const product = productSnapshot(row.configuration_snapshot, row.breakdown_snapshot);
    const breakdown = breakdownSnapshot(row.breakdown_snapshot, row.status);
    return {
      row,
      summary: {
        itemReference: row.item_reference,
        quote: {
          catalogVersionId: row.catalog_version_id,
          createdAt: row.quote_created_at.toISOString(),
          grandTotalKopecks: breakdown.grandTotal,
          minimumPriceApplied: breakdown.minimumPriceApplied,
          optionsTotalKopecks: breakdown.optionsTotal,
          priceVersionId: row.price_version_id,
          product,
          status: row.status,
          unitFinalPriceKopecks: breakdown.unitFinal,
          warnings: breakdown.warnings,
        },
      },
    };
  });
  const summary = summarizeCart(
    snapshots.map((item) => item.summary),
    currentPriceVersionId,
  );
  return {
    cartRevision: cart.cart_revision,
    expiresAt: cart.expires_at.toISOString(),
    items: snapshots.map(({ row, summary: item }) => ({
      catalogVersionNumber: row.catalog_version_number,
      editHref: `/configure?edit=${row.item_reference}`,
      itemReference: row.item_reference,
      minimumPriceApplied: item.quote.minimumPriceApplied,
      optionsTotalKopecks: item.quote.optionsTotalKopecks,
      previewHref:
        row.preview_public_token === null ? null : `/preview?state=${row.preview_public_token}`,
      priceVersionNumber: row.price_version_number,
      pricingStatus: row.status,
      product: item.quote.product,
      quantityTotalKopecks: item.quote.grandTotalKopecks,
      quoteCreatedAt: item.quote.createdAt,
      revision: row.item_revision,
      unitPriceKopecks: item.quote.unitFinalPriceKopecks,
      warnings: item.quote.warnings,
      wasCalculatedWithPreviousPrice:
        row.price_version_id !== null && row.price_version_id !== currentPriceVersionId,
    })),
    priceVersionChangedItemCount: summary.priceVersionChangedItemCount,
    summary: summary.money,
  };
}

async function claimCommand(
  client: PoolClient,
  scope: string,
  key: string,
  payload: unknown,
): Promise<boolean> {
  assertOpaque(key, 180);
  const payloadDigest = digest(payload);
  const inserted = await client.query(
    `
      INSERT INTO idempotency_record (scope, key, payload_digest, status, locked_until, updated_at)
      VALUES ($1,$2,$3,'IN_PROGRESS',NOW() + INTERVAL '30 seconds',NOW())
      ON CONFLICT (scope, key) DO NOTHING
    `,
    [scope, key, payloadDigest],
  );
  if (inserted.rowCount === 1) return true;
  const existing = await client.query<{ payload_digest: string; status: string }>(
    `SELECT payload_digest, status::text FROM idempotency_record WHERE scope = $1 AND key = $2`,
    [scope, key],
  );
  const row = existing.rows[0];
  if (row?.payload_digest !== payloadDigest || row.status !== 'SUCCEEDED') {
    throw new CartStoreError('CART_CONFLICT');
  }
  return false;
}

async function completeCommand(client: PoolClient, scope: string, key: string, result: unknown) {
  await client.query(
    `
      UPDATE idempotency_record SET status = 'SUCCEEDED', result_digest = $3,
             completed_at = NOW(), locked_until = NULL, updated_at = NOW()
      WHERE scope = $1 AND key = $2
    `,
    [scope, key, digest(result)],
  );
}

async function resolveQuote(client: PoolClient, quoteToken: string): Promise<QuoteIdentityRow> {
  assertOpaque(quoteToken, 64);
  const result = await client.query<QuoteIdentityRow>(
    `
      SELECT id::text, calculation_id::text, status::text
      FROM quote_snapshot WHERE public_token = $1
    `,
    [quoteToken],
  );
  const row = result.rows[0];
  if (
    row === undefined ||
    !['CALCULATED', 'SOURCE_DATA_STALE', 'PRICE_ON_REQUEST', 'MANUAL_REVIEW_REQUIRED'].includes(
      row.status,
    )
  ) {
    throw new CartStoreError('CART_QUOTE_UNAVAILABLE');
  }
  return row;
}

async function resolvePreview(
  client: PoolClient,
  input: CartAddCommand,
  quote: QuoteIdentityRow,
): Promise<string | null> {
  if (input.previewStateToken === undefined) return null;
  if (input.previewOwnerTokenHash === undefined) throw new CartStoreError('CART_AUTHORIZATION');
  assertOpaque(input.previewStateToken, 64);
  assertOwnerHash(input.previewOwnerTokenHash);
  const result = await client.query<{ id: string }>(
    `
      SELECT id::text FROM standard_preview_state
      WHERE public_token = $1 AND owner_token_hash = $2 AND expires_at > NOW()
        AND (quote_snapshot_id = $3::uuid OR source_calculation_id = $4::uuid)
    `,
    [input.previewStateToken, input.previewOwnerTokenHash, quote.id, quote.calculation_id],
  );
  const id = result.rows[0]?.id;
  if (id === undefined) throw new CartStoreError('CART_AUTHORIZATION');
  return id;
}

async function audit(
  client: PoolClient,
  action: string,
  correlationId: string,
  targetId: string,
): Promise<void> {
  await client.query(
    `
      INSERT INTO audit_event (
        actor_type, action, outcome, correlation_id, target_type, target_id, reason_code
      ) VALUES ('ANONYMOUS',$1,'SUCCEEDED',$2,'CART_ITEM',$3,'PHASE_1E_GUEST_CART')
    `,
    [action, correlationId, targetId],
  );
}

async function findOwnedItem(
  client: PoolClient,
  cart: CartIdentityRow,
  itemReference: string,
): Promise<OwnedItemRow> {
  if (!/^[A-Za-z0-9_-]{32}$/u.test(itemReference)) {
    throw new CartStoreError('CART_NOT_FOUND');
  }
  const result = await client.query<OwnedItemRow>(
    `
      SELECT item.id::text, item.quote_snapshot_id::text, item.preview_state_id::text,
             item.revision, cart.id::text AS cart_id, cart.revision AS cart_revision
      FROM cart_item item JOIN guest_cart cart ON cart.id = item.cart_id
      WHERE item.public_reference = $1 AND item.cart_id = $2::uuid AND item.removed_at IS NULL
      FOR UPDATE OF item
    `,
    [itemReference, cart.cart_id],
  );
  const row = result.rows[0];
  if (row === undefined) throw new CartStoreError('CART_NOT_FOUND');
  return row;
}

async function nextCartRevision(client: PoolClient, cartId: string): Promise<number> {
  const result = await client.query<{ revision: number }>(
    `UPDATE guest_cart SET revision = revision + 1, updated_at = NOW() WHERE id = $1::uuid RETURNING revision`,
    [cartId],
  );
  const revision = result.rows[0]?.revision;
  if (revision === undefined) throw new CartStoreError('CART_DATABASE');
  return revision;
}

export function createCartAdapter(environment: DatabaseEnvironment): CartAdapter {
  const pool = new Pool({
    connectionString: environment.DATABASE_URL,
    max: 8,
    statement_timeout: environment.DATABASE_STATEMENT_TIMEOUT_MS,
  });

  return {
    async close() {
      await pool.end();
    },

    async get(ownerTokenHash, sessionExpiresAt) {
      return cartTransaction(pool, async (client) => {
        const cart = await ensureCart(client, ownerTokenHash, sessionExpiresAt);
        return loadCartState(client, cart);
      });
    },

    async addQuote(input) {
      assertOpaque(input.correlationId, 128);
      return cartTransaction(pool, async (client) => {
        const cart = await ensureCart(client, input.ownerTokenHash, input.sessionExpiresAt);
        const scope = `guest-cart:add:${cart.session_id}`;
        const claimed = await claimCommand(client, scope, input.idempotencyKey, {
          previewStateToken: input.previewStateToken ?? null,
          quoteToken: input.quoteToken,
        });
        if (claimed) {
          const count = await client.query<{ count: string }>(
            `SELECT COUNT(*)::text AS count FROM cart_item WHERE cart_id = $1::uuid AND removed_at IS NULL`,
            [cart.cart_id],
          );
          if (Number(count.rows[0]?.count ?? '0') >= 50) {
            throw new CartStoreError('CART_INVALID_INPUT');
          }
          const quote = await resolveQuote(client, input.quoteToken);
          const previewId = await resolvePreview(client, input, quote);
          const reference = publicReference();
          const revision = await nextCartRevision(client, cart.cart_id);
          const inserted = await client.query<{ id: string }>(
            `
              INSERT INTO cart_item (
                public_reference, cart_id, quote_snapshot_id, preview_state_id,
                revision, position, updated_at
              ) VALUES (
                $1,$2::uuid,$3::uuid,$4::uuid,1,
                COALESCE((SELECT MAX(position) + 1 FROM cart_item WHERE cart_id = $2::uuid),0),NOW()
              ) RETURNING id::text
            `,
            [reference, cart.cart_id, quote.id, previewId],
          );
          const itemId = inserted.rows[0]?.id;
          if (itemId === undefined) throw new CartStoreError('CART_DATABASE');
          await client.query(
            `
              INSERT INTO cart_item_revision (
                cart_item_id, action, next_quote_snapshot_id, next_preview_state_id,
                item_revision, cart_revision, idempotency_key, correlation_id
              ) VALUES ($1::uuid,'ADDED',$2::uuid,$3::uuid,1,$4,$5,$6)
            `,
            [itemId, quote.id, previewId, revision, input.idempotencyKey, input.correlationId],
          );
          await audit(client, 'cart.item_added', input.correlationId, reference);
          await completeCommand(client, scope, input.idempotencyKey, { itemReference: reference });
        }
        return loadCartState(client, await ownedCart(client, input.ownerTokenHash));
      });
    },

    async replaceQuote(input) {
      assertOpaque(input.correlationId, 128);
      if (!Number.isSafeInteger(input.expectedItemRevision) || input.expectedItemRevision <= 0) {
        throw new CartStoreError('CART_INVALID_INPUT');
      }
      return cartTransaction(pool, async (client) => {
        const cart = await ownedCart(client, input.ownerTokenHash, true);
        const scope = `guest-cart:replace:${cart.session_id}`;
        const claimed = await claimCommand(client, scope, input.idempotencyKey, {
          expectedItemRevision: input.expectedItemRevision,
          itemReference: input.itemReference,
          previewStateToken: input.previewStateToken ?? null,
          quoteToken: input.quoteToken,
        });
        if (claimed) {
          const item = await findOwnedItem(client, cart, input.itemReference);
          if (item.revision !== input.expectedItemRevision) {
            throw new CartStoreError('CART_CONFLICT');
          }
          const quote = await resolveQuote(client, input.quoteToken);
          const previewId = await resolvePreview(client, input, quote);
          const cartRevision = await nextCartRevision(client, cart.cart_id);
          await client.query(
            `
              UPDATE cart_item SET quote_snapshot_id = $2::uuid, preview_state_id = $3::uuid,
                     revision = revision + 1, updated_at = NOW()
              WHERE id = $1::uuid
            `,
            [item.id, quote.id, previewId],
          );
          await client.query(
            `
              INSERT INTO cart_item_revision (
                cart_item_id, action, previous_quote_snapshot_id, next_quote_snapshot_id,
                previous_preview_state_id, next_preview_state_id, item_revision, cart_revision,
                idempotency_key, correlation_id
              ) VALUES ($1::uuid,'REPLACED',$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6,$7,$8,$9)
            `,
            [
              item.id,
              item.quote_snapshot_id,
              quote.id,
              item.preview_state_id,
              previewId,
              item.revision + 1,
              cartRevision,
              input.idempotencyKey,
              input.correlationId,
            ],
          );
          await audit(client, 'cart.item_replaced', input.correlationId, input.itemReference);
          await completeCommand(client, scope, input.idempotencyKey, {
            itemReference: input.itemReference,
            revision: item.revision + 1,
          });
        }
        return loadCartState(client, await ownedCart(client, input.ownerTokenHash));
      });
    },

    async duplicate(input) {
      assertOpaque(input.correlationId, 128);
      return cartTransaction(pool, async (client) => {
        const cart = await ownedCart(client, input.ownerTokenHash, true);
        if (cart.cart_revision !== input.expectedCartRevision) {
          throw new CartStoreError('CART_CONFLICT');
        }
        const scope = `guest-cart:duplicate:${cart.session_id}`;
        const claimed = await claimCommand(client, scope, input.idempotencyKey, {
          expectedCartRevision: input.expectedCartRevision,
          itemReference: input.itemReference,
        });
        if (claimed) {
          const source = await findOwnedItem(client, cart, input.itemReference);
          const reference = publicReference();
          const cartRevision = await nextCartRevision(client, cart.cart_id);
          const inserted = await client.query<{ id: string }>(
            `
              INSERT INTO cart_item (
                public_reference, cart_id, quote_snapshot_id, preview_state_id,
                revision, position, updated_at
              ) VALUES (
                $1,$2::uuid,$3::uuid,$4::uuid,1,
                COALESCE((SELECT MAX(position) + 1 FROM cart_item WHERE cart_id = $2::uuid),0),NOW()
              ) RETURNING id::text
            `,
            [reference, cart.cart_id, source.quote_snapshot_id, source.preview_state_id],
          );
          const itemId = inserted.rows[0]?.id;
          if (itemId === undefined) throw new CartStoreError('CART_DATABASE');
          await client.query(
            `
              INSERT INTO cart_item_revision (
                cart_item_id, action, next_quote_snapshot_id, next_preview_state_id,
                item_revision, cart_revision, idempotency_key, correlation_id
              ) VALUES ($1::uuid,'DUPLICATED',$2::uuid,$3::uuid,1,$4,$5,$6)
            `,
            [
              itemId,
              source.quote_snapshot_id,
              source.preview_state_id,
              cartRevision,
              input.idempotencyKey,
              input.correlationId,
            ],
          );
          await audit(client, 'cart.item_duplicated', input.correlationId, reference);
          await completeCommand(client, scope, input.idempotencyKey, { itemReference: reference });
        }
        return loadCartState(client, await ownedCart(client, input.ownerTokenHash));
      });
    },

    async remove(input) {
      assertOpaque(input.correlationId, 128);
      return cartTransaction(pool, async (client) => {
        const cart = await ownedCart(client, input.ownerTokenHash, true);
        if (cart.cart_revision !== input.expectedCartRevision) {
          throw new CartStoreError('CART_CONFLICT');
        }
        const scope = `guest-cart:remove:${cart.session_id}`;
        const claimed = await claimCommand(client, scope, input.idempotencyKey, {
          expectedCartRevision: input.expectedCartRevision,
          itemReference: input.itemReference,
        });
        if (claimed) {
          const item = await findOwnedItem(client, cart, input.itemReference);
          const cartRevision = await nextCartRevision(client, cart.cart_id);
          await client.query(
            `UPDATE cart_item SET removed_at = NOW(), revision = revision + 1, updated_at = NOW() WHERE id = $1::uuid`,
            [item.id],
          );
          await client.query(
            `
              INSERT INTO cart_item_revision (
                cart_item_id, action, previous_quote_snapshot_id, previous_preview_state_id,
                item_revision, cart_revision, idempotency_key, correlation_id
              ) VALUES ($1::uuid,'REMOVED',$2::uuid,$3::uuid,$4,$5,$6,$7)
            `,
            [
              item.id,
              item.quote_snapshot_id,
              item.preview_state_id,
              item.revision + 1,
              cartRevision,
              input.idempotencyKey,
              input.correlationId,
            ],
          );
          await audit(client, 'cart.item_removed', input.correlationId, input.itemReference);
          await completeCommand(client, scope, input.idempotencyKey, {
            itemReference: input.itemReference,
          });
        }
        return loadCartState(client, await ownedCart(client, input.ownerTokenHash));
      });
    },

    async clear(input) {
      assertOpaque(input.correlationId, 128);
      return cartTransaction(pool, async (client) => {
        const cart = await ownedCart(client, input.ownerTokenHash, true);
        if (cart.cart_revision !== input.expectedCartRevision) {
          throw new CartStoreError('CART_CONFLICT');
        }
        const scope = `guest-cart:clear:${cart.session_id}`;
        const claimed = await claimCommand(client, scope, input.idempotencyKey, {
          expectedCartRevision: input.expectedCartRevision,
        });
        if (claimed) {
          const items = await client.query<OwnedItemRow>(
            `
              SELECT item.id::text, item.quote_snapshot_id::text, item.preview_state_id::text,
                     item.revision, cart.id::text AS cart_id, cart.revision AS cart_revision
              FROM cart_item item JOIN guest_cart cart ON cart.id = item.cart_id
              WHERE item.cart_id = $1::uuid AND item.removed_at IS NULL
              ORDER BY item.position FOR UPDATE OF item
            `,
            [cart.cart_id],
          );
          if (items.rows.length > 0) {
            const cartRevision = await nextCartRevision(client, cart.cart_id);
            for (const [index, item] of items.rows.entries()) {
              await client.query(
                `UPDATE cart_item SET removed_at = NOW(), revision = revision + 1, updated_at = NOW() WHERE id = $1::uuid`,
                [item.id],
              );
              await client.query(
                `
                  INSERT INTO cart_item_revision (
                    cart_item_id, action, previous_quote_snapshot_id, previous_preview_state_id,
                    item_revision, cart_revision, idempotency_key, correlation_id
                  ) VALUES ($1::uuid,'CLEARED',$2::uuid,$3::uuid,$4,$5,$6,$7)
                `,
                [
                  item.id,
                  item.quote_snapshot_id,
                  item.preview_state_id,
                  item.revision + 1,
                  cartRevision,
                  `${input.idempotencyKey}:${String(index)}`,
                  input.correlationId,
                ],
              );
            }
            await audit(client, 'cart.cleared', input.correlationId, cart.cart_id);
          }
          await completeCommand(client, scope, input.idempotencyKey, {
            removedCount: items.rows.length,
          });
        }
        return loadCartState(client, await ownedCart(client, input.ownerTokenHash));
      });
    },

    async getEditSelection(ownerTokenHash, itemReference) {
      assertOwnerHash(ownerTokenHash);
      try {
        const result = await pool.query<{ configuration_snapshot: unknown }>(
          `
            SELECT quote.configuration_snapshot
            FROM cart_item item
            JOIN guest_cart cart ON cart.id = item.cart_id
            JOIN guest_cart_session session ON session.id = cart.session_id
            JOIN quote_snapshot quote ON quote.id = item.quote_snapshot_id
            WHERE item.public_reference = $1 AND session.token_hash = $2
              AND session.revoked_at IS NULL AND session.expires_at > NOW()
              AND cart.status = 'ACTIVE' AND item.removed_at IS NULL
          `,
          [itemReference, ownerTokenHash],
        );
        const configuration = record(result.rows[0]?.configuration_snapshot);
        const ids = record(configuration?.['ids']);
        if (ids === null) throw new CartStoreError('CART_NOT_FOUND');
        const selection = ids as Partial<PricingSelection>;
        const stringFields = [
          'catalogVersionId',
          'configuratorModelId',
          'controlTypeId',
          'hardwareOptionId',
          'materialVariantId',
          'mountingTypeId',
          'productFamilyId',
          'productSystemId',
        ] as const;
        if (
          stringFields.some((field) => typeof selection[field] !== 'string') ||
          !Array.isArray(selection.additionalOptionIds) ||
          !Number.isSafeInteger(selection.heightMm) ||
          !Number.isSafeInteger(selection.quantity) ||
          !Number.isSafeInteger(selection.widthMm)
        ) {
          throw new CartStoreError('CART_NOT_FOUND');
        }
        return selection as PricingSelection;
      } catch (error) {
        throw mapError(error);
      }
    },
  };
}
