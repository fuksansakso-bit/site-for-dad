import { randomUUID } from 'node:crypto';

import { parseDatabaseEnvironment } from '@project-name/config/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';

import {
  createPricingAdapter,
  type PricingAdapter,
  type PricingStoreError,
} from '../../src/pricing.js';

const enabled = process.env['PHASE1C_REAL_CATALOG'] === 'true';

describe.skipIf(!enabled)('QG-260 Phase 1C real PostgreSQL integration', () => {
  let adapter: PricingAdapter;
  let pool: Pool;
  let ownerId: string;

  beforeAll(async () => {
    const environment = parseDatabaseEnvironment(process.env);
    adapter = createPricingAdapter(environment);
    pool = new Pool({ connectionString: environment.DATABASE_URL, max: 1 });
    const owner = await pool.query<{ actor_id: string }>(`
      SELECT actor_id::text FROM role_grant WHERE role = 'OWNER' AND revoked_at IS NULL ORDER BY granted_at LIMIT 1
    `);
    ownerId = owner.rows[0]?.actor_id ?? '';
    if (ownerId.length === 0) throw new Error('OWNER_FIXTURE_REQUIRED');
  });

  afterAll(async () => {
    await adapter.close();
    await pool.end();
  });

  it('calculates from PostgreSQL, deduplicates, snapshots, overrides, audits and rolls back', async () => {
    const bootstrap = await adapter.getBootstrap();
    const profile = bootstrap.profiles.find((item) => item.kind === 'AREA_MINIMUM');
    if (profile === undefined) throw new Error('AREA_PROFILE_REQUIRED');
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
      quantity: 2,
      widthMm: profile.minimumWidthMm,
    };
    const suffix = randomUUID();
    const command = {
      correlationId: `phase1c-integration-${suffix}`,
      idempotencyKey: `phase1c:calc:${suffix}`,
      selection,
    };
    const first = await adapter.calculate(command);
    const duplicate = await adapter.calculate(command);
    expect(duplicate).toEqual(first);
    expect(first.result.status).toBe('CALCULATED');

    const quote = await adapter.saveQuote({
      calculationToken: first.calculationToken,
      correlationId: command.correlationId,
      idempotencyKey: `phase1c:quote:${suffix}`,
    });
    expect(
      await adapter.saveQuote({
        calculationToken: first.calculationToken,
        correlationId: command.correlationId,
        idempotencyKey: `phase1c:quote:${suffix}`,
      }),
    ).toEqual(quote);

    const overrideKey = `phase1c:override:set:${suffix}`;
    const override = {
      actorId: ownerId,
      amountMinor: 149_000,
      correlationId: command.correlationId,
      idempotencyKey: overrideKey,
      materialVariantId: profile.materialVariantId,
      reason: 'Phase 1C integration minimum boundary.',
    };
    const overrideId = await adapter.setLocalOverride(override);
    expect(await adapter.setLocalOverride(override)).toBe(overrideId);
    try {
      const changed = await adapter.calculate({
        ...command,
        idempotencyKey: `phase1c:calc:override:${suffix}`,
      });
      expect(changed.result).toMatchObject({
        minimumPriceApplied: true,
        unitBasePriceKopecks: 149_000,
        unitFinalPriceKopecks: 150_000,
        grandTotalKopecks: 300_000,
      });
      expect((await adapter.getQuote(quote.quoteToken)).breakdown).toEqual(first.result);
      const audit = await pool.query<{ count: string }>(
        `
        SELECT count(*)::text FROM audit_event WHERE target_id = $1 AND action = 'PRICING_LOCAL_OVERRIDE_SET'
      `,
        [overrideId],
      );
      expect(Number(audit.rows[0]?.count)).toBe(1);
      await expect(
        pool.query(`UPDATE quote_snapshot SET correlation_id = 'mutated' WHERE public_token = $1`, [
          quote.quoteToken,
        ]),
      ).rejects.toThrow();
    } finally {
      const remove = {
        actorId: ownerId,
        correlationId: command.correlationId,
        idempotencyKey: `phase1c:override:remove:${suffix}`,
        materialVariantId: profile.materialVariantId,
        reason: 'Restore verified AMIGO price after integration test.',
      };
      await adapter.removeLocalOverride(remove);
      await expect(adapter.removeLocalOverride(remove)).resolves.toBeUndefined();
    }

    const rollbackKey = `phase1c:override:rollback:${suffix}`;
    await expect(
      adapter.setLocalOverride({
        actorId: ownerId,
        amountMinor: 150_000,
        correlationId: command.correlationId,
        idempotencyKey: rollbackKey,
        materialVariantId: '00000000-0000-4000-8000-000000000000',
        reason: 'Rollback test.',
      }),
    ).rejects.toMatchObject({ code: 'PRICING_NOT_FOUND' } satisfies Partial<PricingStoreError>);
    const rolledBack = await pool.query<{ count: string }>(
      `
      SELECT count(*)::text FROM idempotency_record WHERE scope = 'pricing.override.set' AND key = $1
    `,
      [rollbackKey],
    );
    expect(Number(rolledBack.rows[0]?.count)).toBe(0);

    const activation = await pool.query<{ count: string }>(
      `
      SELECT count(*)::text FROM pricing_version_decision decision
      JOIN price_version version ON version.id = decision.price_version_id
      WHERE version.id = $1::uuid AND version.status = 'ACTIVE' AND decision.action = 'ACTIVATE'
    `,
      [bootstrap.priceVersionId],
    );
    expect(Number(activation.rows[0]?.count)).toBeGreaterThan(0);
  });
});
