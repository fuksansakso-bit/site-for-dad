import { createHash, randomUUID } from 'node:crypto';

import { derivePublicReference, sealPublicReference } from '@project-name/cart';
import { parseDatabaseEnvironment } from '@project-name/config/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';

import { createCartAdapter, loadCartState, ownedCart, type CartAdapter } from '../../src/cart.js';
import { createPricingAdapter, type PricingAdapter } from '../../src/pricing.js';
import { createRequestAdapter, type RequestAdapter } from '../../src/request.js';

const enabled = process.env['PHASE1E_REAL_CATALOG'] === 'true';

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

describe.skipIf(!enabled)('QG-343..QG-354 Phase 1E real PostgreSQL integration', () => {
  let cart: CartAdapter | undefined;
  let pool: Pool | undefined;
  let pricing: PricingAdapter | undefined;
  let requests: RequestAdapter | undefined;

  beforeAll(() => {
    const environment = parseDatabaseEnvironment(process.env);
    cart = createCartAdapter(environment);
    pool = new Pool({ connectionString: environment.DATABASE_URL, max: 2 });
    pricing = createPricingAdapter(environment);
    requests = createRequestAdapter(environment);
  });

  afterAll(async () => {
    await Promise.all([cart?.close(), pricing?.close(), requests?.close(), pool?.end()]);
  });

  it(
    'keeps cart/request snapshots immutable through mixed pricing, checkout, outbox and staff processing',
    { timeout: 45_000 },
    async () => {
      if (
        cart === undefined ||
        pool === undefined ||
        pricing === undefined ||
        requests === undefined
      ) {
        throw new Error('PHASE1E_ADAPTERS_REQUIRED');
      }
      const suffix = randomUUID();
      const correlationId = `phase1e-integration-${suffix}`;
      const ownerTokenHash = hash(`phase1e-cart-owner:${suffix}`);
      const sessionExpiresAt = new Date(Date.now() + 60 * 60 * 1_000).toISOString();
      const bootstrap = await pricing.getBootstrap();
      const profile = bootstrap.profiles.find((item) => item.kind === 'AREA_MINIMUM');
      const requestFamily = bootstrap.families.find((item) => !item.automaticPricing);
      if (profile === undefined || requestFamily === undefined) {
        throw new Error('PHASE1E_CATALOG_FIXTURE_REQUIRED');
      }

      const selection = {
        additionalOptionIds: [],
        catalogVersionId: bootstrap.catalogVersionId,
        configuratorModelId: profile.configuratorModelId,
        controlTypeId: profile.optionData.controlTypes[0]?.id ?? '',
        hardwareOptionId: profile.optionData.hardwareOptions[0]?.id ?? '',
        heightMm: profile.minimumHeightMm,
        materialVariantId: profile.materialVariantId,
        mountingTypeId: profile.optionData.mountingTypes[0]?.id ?? '',
        productFamilyId: profile.productFamilyId,
        productSystemId: profile.productSystemId,
        quantity: 1,
        widthMm: profile.minimumWidthMm,
      };
      const calculated = await pricing.calculate({
        correlationId,
        idempotencyKey: `phase1e:calculated:${suffix}`,
        selection,
      });
      expect(calculated.result.status).toBe('CALCULATED');
      const calculatedQuote = await pricing.saveQuote({
        calculationToken: calculated.calculationToken,
        correlationId,
        idempotencyKey: `phase1e:calculated-quote:${suffix}`,
      });
      const requestCalculation = await pricing.requestPrice({
        catalogVersionId: bootstrap.catalogVersionId,
        correlationId,
        idempotencyKey: `phase1e:request-price:${suffix}`,
        productFamilyId: requestFamily.id,
        quantity: 2,
      });
      expect(requestCalculation.result).toMatchObject({
        grandTotalKopecks: null,
        status: 'PRICE_ON_REQUEST',
      });
      const requestQuote = await pricing.saveQuote({
        calculationToken: requestCalculation.calculationToken,
        correlationId,
        idempotencyKey: `phase1e:request-quote:${suffix}`,
      });

      const firstCart = await cart.addQuote({
        correlationId,
        idempotencyKey: `phase1e:cart-add-known:${suffix}`,
        ownerTokenHash,
        quoteToken: calculatedQuote.quoteToken,
        sessionExpiresAt,
      });
      const mixedCart = await cart.addQuote({
        correlationId,
        idempotencyKey: `phase1e:cart-add-request:${suffix}`,
        ownerTokenHash,
        quoteToken: requestQuote.quoteToken,
        sessionExpiresAt,
      });
      expect(mixedCart.summary).toMatchObject({
        knownSubtotalKopecks: calculated.result.grandTotalKopecks,
        pricingStatus: 'PARTIALLY_PRICED',
        totalItemCount: 2,
        totalQuantity: 3,
        unknownItemCount: 1,
      });
      expect(
        mixedCart.items.find((item) => item.pricingStatus === 'PRICE_ON_REQUEST'),
      ).toMatchObject({
        quantityTotalKopecks: null,
        unitPriceKopecks: null,
      });

      const knownItem = firstCart.items[0];
      if (knownItem === undefined) throw new Error('KNOWN_CART_ITEM_REQUIRED');
      const editSource = await cart.getEditSelection(ownerTokenHash, knownItem.itemReference);
      if ('requestOnly' in editSource.selection) throw new Error('CONFIGURED_SELECTION_REQUIRED');
      const previousQuote = await pricing.getQuote(calculatedQuote.quoteToken);
      const changedCalculation = await pricing.calculate({
        correlationId,
        idempotencyKey: `phase1e:calculated-edited:${suffix}`,
        selection: { ...editSource.selection, quantity: 3 },
      });
      const changedQuote = await pricing.saveQuote({
        calculationToken: changedCalculation.calculationToken,
        correlationId,
        idempotencyKey: `phase1e:calculated-edited-quote:${suffix}`,
      });
      const replacedCart = await cart.replaceQuote({
        correlationId,
        expectedItemRevision: editSource.itemRevision,
        idempotencyKey: `phase1e:cart-replace:${suffix}`,
        itemReference: knownItem.itemReference,
        ownerTokenHash,
        quoteToken: changedQuote.quoteToken,
        sessionExpiresAt,
      });
      expect(replacedCart.items).toHaveLength(2);
      expect(
        replacedCart.items.find((item) => item.itemReference === knownItem.itemReference)?.product
          .quantity,
      ).toBe(3);
      expect(await pricing.getQuote(calculatedQuote.quoteToken)).toEqual(previousQuote);

      const priceChangeClient = await pool.connect();
      try {
        await priceChangeClient.query('BEGIN');
        await priceChangeClient.query(
          `UPDATE price_version SET status = 'SUPERSEDED', activation_key = NULL WHERE id = $1::uuid`,
          [bootstrap.priceVersionId],
        );
        await priceChangeClient.query(
          `
          INSERT INTO price_version (
            version_number, status, activation_key, sync_run_id, source_manifest,
            difference_checksum, approved_by_actor_id, approved_at,
            activated_by_actor_id, activated_at, predecessor_id
          )
          SELECT (SELECT MAX(version_number) + 1000 FROM price_version), 'ACTIVE', $2,
                 sync_run_id, source_manifest, difference_checksum, approved_by_actor_id, NOW(),
                 activated_by_actor_id, NOW(), id
          FROM price_version WHERE id = $1::uuid
        `,
          [bootstrap.priceVersionId, 'PUBLIC'],
        );
        const changedPriceState = await loadCartState(
          priceChangeClient,
          await ownedCart(priceChangeClient, ownerTokenHash),
        );
        expect(changedPriceState.priceVersionChangedItemCount).toBe(2);
        expect(changedPriceState.summary.knownSubtotalKopecks).toBe(
          replacedCart.summary.knownSubtotalKopecks,
        );
        expect(changedPriceState.items.every((item) => item.wasCalculatedWithPreviousPrice)).toBe(
          true,
        );
      } finally {
        await priceChangeClient.query('ROLLBACK').catch(() => undefined);
        priceChangeClient.release();
      }

      const referenceKey = `phase1e-public-reference-${suffix}`;
      const publicReference = derivePublicReference('s'.repeat(32), ownerTokenHash, referenceKey);
      const checkoutCommand = {
        address: 'Тестовый адрес 1',
        comment: 'Синтетическая проверка Phase 1E',
        consentVersion: 'phase1e-test-v1',
        contactName: 'Тест Phase 1E',
        contactPhone: '+79990000001',
        correlationId,
        expectedCartRevision: replacedCart.cartRevision,
        idempotencyKey: `phase1e:checkout:${suffix}`,
        installmentInterest: true,
        locality: 'Грозный',
        measurementRequested: true,
        ownerTokenHash,
        publicReference,
        publicReferenceSealed: sealPublicReference('s'.repeat(32), publicReference),
      } as const;
      const receipt = await requests.checkout(checkoutCommand);
      expect(await requests.checkout(checkoutCommand)).toEqual(receipt);
      expect(receipt).toMatchObject({
        installmentInterest: true,
        measurementRequested: true,
        status: 'NEW',
      });
      expect(receipt.snapshot.summary).toMatchObject({
        pricingStatus: 'PARTIALLY_PRICED',
        totalItemCount: 2,
        totalQuantity: 5,
        unknownItemCount: 1,
      });

      const publicSummary = await requests.getPublicSummary(publicReference);
      const publicSerialized = JSON.stringify(publicSummary);
      expect(publicSerialized).not.toContain(checkoutCommand.contactName);
      expect(publicSerialized).not.toContain(checkoutCommand.contactPhone);
      expect(publicSerialized).not.toContain(checkoutCommand.address);
      expect(publicSerialized).not.toContain(checkoutCommand.comment);
      const enumeratedReference = `${publicReference.slice(0, -1)}${publicReference.endsWith('x') ? 'y' : 'x'}`;
      await expect(requests.getPublicSummary(enumeratedReference)).rejects.toMatchObject({
        code: 'REQUEST_NOT_FOUND',
      });

      await requests.generateHandoff({
        correlationId,
        idempotencyKey: `phase1e:handoff:${suffix}`,
        ownerTokenHash,
        publicReference,
      });
      expect(
        await requests.recordCommunication({
          correlationId,
          idempotencyKey: `phase1e:opened:${suffix}`,
          ownerTokenHash,
          publicReference,
          type: 'WHATSAPP_LINK_OPENED',
        }),
      ).toBe(true);
      expect(
        await requests.recordCommunication({
          correlationId,
          idempotencyKey: `phase1e:copied:${suffix}`,
          ownerTokenHash,
          publicReference,
          type: 'MESSAGE_COPIED',
        }),
      ).toBe(true);

      const inquiry = await pool.query<{
        id: string;
        known_subtotal_minor: string;
      }>(
        `SELECT id::text, known_subtotal_minor::text FROM order_inquiry WHERE request_number = $1`,
        [receipt.requestNumber],
      );
      const inquiryRow = inquiry.rows[0];
      if (inquiryRow === undefined) throw new Error('REQUEST_ROW_REQUIRED');
      await expect(
        pool.query(`UPDATE request_item_snapshot SET known_total_minor = 1 WHERE inquiry_id = $1`, [
          inquiryRow.id,
        ]),
      ).rejects.toThrow();
      await expect(
        pool.query(`UPDATE order_inquiry SET known_subtotal_minor = 1 WHERE id = $1`, [
          inquiryRow.id,
        ]),
      ).rejects.toThrow();

      const outbox = await pool.query<{ topic: string }>(
        `SELECT topic FROM outbox_event WHERE payload->>'requestNumber' = $1 ORDER BY topic`,
        [receipt.requestNumber],
      );
      expect(outbox.rows.map((row) => row.topic).sort()).toEqual([
        'cart.checked_out',
        'installment.interest_recorded',
        'measurement.requested',
        'request.created',
      ]);
      const audit = await pool.query<{ action: string }>(
        `SELECT action FROM audit_event WHERE correlation_id = $1 ORDER BY action`,
        [correlationId],
      );
      expect(audit.rows.map((row) => row.action)).toEqual(
        expect.arrayContaining(['cart.checked_out', 'request.created']),
      );
      const communications = await pool.query<{ type: string }>(
        `SELECT type::text FROM request_communication_event WHERE inquiry_id = $1::uuid`,
        [inquiryRow.id],
      );
      expect(communications.rows.map((row) => row.type)).toEqual(
        expect.arrayContaining([
          'REQUEST_CREATED',
          'WHATSAPP_LINK_GENERATED',
          'WHATSAPP_LINK_OPENED',
          'MESSAGE_COPIED',
        ]),
      );
      expect(communications.rows.map((row) => row.type)).not.toEqual(
        expect.arrayContaining(['MESSAGE_SENT', 'MESSAGE_DELIVERED', 'MESSAGE_READ']),
      );

      const manager = await pool.query<{ id: string }>(
        `
        INSERT INTO actor_identity (provider, subject, updated_at)
        VALUES ('phase1e-test',$1,NOW()) RETURNING id::text
      `,
        [`manager-${suffix}`],
      );
      const managerId = manager.rows[0]?.id;
      if (managerId === undefined) throw new Error('MANAGER_FIXTURE_REQUIRED');
      await pool.query(`INSERT INTO role_grant (actor_id, role) VALUES ($1::uuid,'MANAGER')`, [
        managerId,
      ]);
      const detail = await requests.getAdminRequest({
        actorId: managerId,
        correlationId,
        requestNumber: receipt.requestNumber,
        role: 'MANAGER',
      });
      const statusChanged = await requests.updateAdminStatus({
        actorId: managerId,
        correlationId,
        expectedVersion: detail.version,
        idempotencyKey: `phase1e:manager-status:${suffix}`,
        requestNumber: receipt.requestNumber,
        role: 'MANAGER',
        status: 'IN_REVIEW',
      });
      expect(statusChanged.status).toBe('IN_REVIEW');
      const noted = await requests.addAdminNote({
        actorId: managerId,
        body: 'Синтетическая внутренняя заметка',
        correlationId,
        idempotencyKey: `phase1e:manager-note:${suffix}`,
        requestNumber: receipt.requestNumber,
        role: 'MANAGER',
      });
      expect(noted.notes.some((note) => note.body === 'Синтетическая внутренняя заметка')).toBe(
        true,
      );
      await expect(
        requests.revokePublicReference({
          actorId: managerId,
          correlationId,
          idempotencyKey: `phase1e:manager-revoke:${suffix}`,
          requestNumber: receipt.requestNumber,
          role: 'MANAGER',
        }),
      ).rejects.toMatchObject({ code: 'REQUEST_AUTHORIZATION' });
      await expect(
        pool.query(`UPDATE quote_snapshot SET grand_total_minor = 1 WHERE public_token = $1`, [
          changedQuote.quoteToken,
        ]),
      ).rejects.toThrow();
      const amountAfterStaffActions = await pool.query<{ known_subtotal_minor: string }>(
        `SELECT known_subtotal_minor::text FROM order_inquiry WHERE id = $1::uuid`,
        [inquiryRow.id],
      );
      expect(amountAfterStaffActions.rows[0]?.known_subtotal_minor).toBe(
        inquiryRow.known_subtotal_minor,
      );
    },
  );
});
