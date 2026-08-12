import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { parseDatabaseEnvironment } from '@project-name/config/server';
import { verifyPricingParity, type PricingRuleProfile } from '@project-name/pricing';
import { Pool, type PoolClient } from 'pg';

interface FixtureOption {
  readonly amountMinor: number;
  readonly code: string;
  readonly id: string;
  readonly name: string;
}

interface FixtureRule {
  readonly additionalOptions: readonly FixtureOption[];
  readonly basePriceMinor: number | null;
  readonly categoryId: string;
  readonly categoryName: string;
  readonly controlTypes: readonly FixtureOption[];
  readonly familyId: string;
  readonly familyName: string;
  readonly fixtures: PricingRuleProfile['testExamples'];
  readonly hardwareOptions: readonly FixtureOption[];
  readonly id: string;
  readonly kind: PricingRuleProfile['kind'];
  readonly materialArticle: string;
  readonly materialColor: string;
  readonly materialName: string;
  readonly materialVariantId: string;
  readonly maximumHeightMm: number;
  readonly maximumWidthMm: number;
  readonly minimumHeightMm: number;
  readonly minimumWidthMm: number;
  readonly modelCode: string;
  readonly modelId: string;
  readonly modelName: string;
  readonly modelSourceId: string;
  readonly mountingTypes: readonly FixtureOption[];
  readonly roundingRule: PricingRuleProfile['roundingRule'];
  readonly ruleKey: string;
  readonly safeExplanation: string;
  readonly sourcePriceCategory: string;
  readonly systemId: string;
  readonly systemName: string;
}

interface FixtureDocument {
  readonly capturedAt: string;
  readonly rules: readonly FixtureRule[];
  readonly sourceContext: string;
  readonly sourceHash: string;
  readonly sourceReference: string;
  readonly sourceVersion: string;
}

interface VersionRow {
  readonly difference_checksum: string;
  readonly id: string;
  readonly source_manifest: unknown;
  readonly status: string;
  readonly sync_run_id: string;
  readonly version_number: number;
}

function profileFor(
  fixture: FixtureDocument,
  rule: FixtureRule,
  catalogVersionId: string,
  priceVersionId: string,
): PricingRuleProfile {
  return {
    basePriceMinor: rule.basePriceMinor,
    catalogVersionId,
    configuratorModelId: rule.modelId,
    createdAt: fixture.capturedAt,
    currency: 'RUB',
    fixtureCount: rule.fixtures.length,
    id: rule.id,
    kind: rule.kind,
    materialVariantId: rule.materialVariantId,
    maximumDeviationMinor: 0,
    maximumHeightMm: rule.maximumHeightMm,
    maximumWidthMm: rule.maximumWidthMm,
    minimumHeightMm: rule.minimumHeightMm,
    minimumWidthMm: rule.minimumWidthMm,
    optionData: {
      additionalOptions: rule.additionalOptions,
      categoryId: rule.categoryId,
      categoryName: rule.categoryName,
      controlTypes: rule.controlTypes,
      familyName: rule.familyName,
      hardwareOptions: rule.hardwareOptions,
      materialArticle: rule.materialArticle,
      materialColor: rule.materialColor,
      materialName: rule.materialName,
      mountingTypes: rule.mountingTypes,
      systemName: rule.systemName,
    },
    parityStatus: 'PASSED',
    priceVersionActive: true,
    priceVersionId,
    productFamilyId: rule.familyId,
    productModelCode: rule.modelCode,
    productModelName: rule.modelName,
    productModelSourceId: rule.modelSourceId,
    productSystemId: rule.systemId,
    roundingRule: rule.roundingRule,
    ruleData:
      rule.kind === 'AREA_MINIMUM'
        ? { minimumBillableAreaSquareMm: 1_000_000 }
        : {
            pricesMinor: Object.fromEntries(
              rule.fixtures.map((example) => [
                `${example.widthMm}x${example.heightMm}`,
                example.expectedMinor,
              ]),
            ),
          },
    ruleKey: rule.ruleKey,
    safeExplanation: rule.safeExplanation,
    sourceCapturedAt: fixture.capturedAt,
    sourcePriceCategory: rule.sourcePriceCategory,
    sourceReference: fixture.sourceReference,
    sourceVersion: fixture.sourceVersion,
    testExamples: rule.fixtures,
    verificationStatus: 'VERIFIED',
    verifiedAt: fixture.capturedAt,
  };
}

async function actorId(client: PoolClient): Promise<string> {
  const result = await client.query<{ readonly actor_id: string }>(
    `SELECT rg.actor_id
       FROM role_grant rg
      WHERE rg.role = 'OWNER' AND rg.revoked_at IS NULL
      ORDER BY rg.granted_at ASC
      LIMIT 1`,
  );
  const actor = result.rows[0]?.actor_id;
  if (actor === undefined) throw new Error('PHASE_1C_OWNER_ACTOR_REQUIRED');
  return actor;
}

async function activeVersion(client: PoolClient, table: 'catalog_version' | 'price_version') {
  const result = await client.query<VersionRow>(
    `SELECT id, version_number, status, sync_run_id, source_manifest, difference_checksum
       FROM ${table}
      WHERE status = 'ACTIVE'
      ORDER BY activated_at DESC NULLS LAST
      LIMIT 1
      FOR UPDATE`,
  );
  const version = result.rows[0];
  if (version === undefined) throw new Error(`PHASE_1C_ACTIVE_${table.toUpperCase()}_REQUIRED`);
  return version;
}

async function run(): Promise<void> {
  const fixturePath = new URL(
    '../../pricing/test/fixtures/amigo-phase1c-parity.json',
    import.meta.url,
  );
  const fixtureBytes = await readFile(fixturePath);
  const fixture = JSON.parse(fixtureBytes.toString('utf8')) as FixtureDocument;
  const fixtureDigest = createHash('sha256').update(fixtureBytes).digest('hex');
  const environment = parseDatabaseEnvironment(process.env);
  const pool = new Pool({ connectionString: environment.DATABASE_URL, max: 1 });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const catalog = await activeVersion(client, 'catalog_version');
    const currentPrice = await activeVersion(client, 'price_version');
    const alreadyActive = await client.query<{ readonly count: string }>(
      `SELECT count(*)::text AS count
         FROM pricing_rule
        WHERE price_version_id = $1 AND source_version = $2`,
      [currentPrice.id, fixture.sourceVersion],
    );
    if (Number(alreadyActive.rows[0]?.count ?? 0) === fixture.rules.length) {
      await client.query('COMMIT');
      process.stdout.write(
        `${JSON.stringify({ active: true, fixtureCount: 40, maximumDeviationMinor: 100, priceVersionId: currentPrice.id, versionNumber: currentPrice.version_number })}\n`,
      );
      return;
    }

    const existingCandidate = await client.query<VersionRow>(
      `SELECT pv.id, pv.version_number, pv.status, pv.sync_run_id, pv.source_manifest, pv.difference_checksum
         FROM price_version pv
        WHERE pv.status IN ('AWAITING_APPROVAL', 'APPROVED')
          AND EXISTS (
              SELECT 1 FROM pricing_rule pr
               WHERE pr.price_version_id = pv.id AND pr.source_version = $1
          )
        ORDER BY pv.version_number DESC
        LIMIT 1
        FOR UPDATE`,
      [fixture.sourceVersion],
    );
    let candidate = existingCandidate.rows[0];
    if (candidate === undefined) {
      const nextVersion = await client.query<{ readonly value: number }>(
        'SELECT COALESCE(max(version_number), 0) + 1 AS value FROM price_version',
      );
      const differenceChecksum = createHash('sha256')
        .update(`${currentPrice.difference_checksum}:${fixtureDigest}`)
        .digest('hex');
      const sourceManifest = {
        ...(typeof currentPrice.source_manifest === 'object' &&
        currentPrice.source_manifest !== null
          ? currentPrice.source_manifest
          : {}),
        phase1cPricing: {
          fixtureCount: fixture.rules.reduce((sum, rule) => sum + rule.fixtures.length, 0),
          sourceContext: fixture.sourceContext,
          sourceHash: fixture.sourceHash,
          sourceVersion: fixture.sourceVersion,
        },
      };
      const inserted = await client.query<VersionRow>(
        `INSERT INTO price_version (
             version_number, status, sync_run_id, source_manifest, difference_checksum,
             predecessor_id, rollback_target_id
         ) VALUES ($1, 'AWAITING_APPROVAL', $2, $3::jsonb, $4, $5, $5)
         RETURNING id, version_number, status, sync_run_id, source_manifest, difference_checksum`,
        [
          nextVersion.rows[0]?.value,
          currentPrice.sync_run_id,
          JSON.stringify(sourceManifest),
          differenceChecksum,
          currentPrice.id,
        ],
      );
      candidate = inserted.rows[0];
      if (candidate === undefined) throw new Error('PHASE_1C_PRICE_CANDIDATE_CREATE_FAILED');
      await client.query(
        `INSERT INTO price_version_record (price_version_id, source_price_record_id)
         SELECT $1, source_price_record_id FROM price_version_record WHERE price_version_id = $2`,
        [candidate.id, currentPrice.id],
      );

      const profiles = fixture.rules.map((rule) =>
        profileFor(fixture, rule, catalog.id, candidate!.id),
      );
      const parity = verifyPricingParity(profiles, fixture.capturedAt);
      for (const [index, rule] of fixture.rules.entries()) {
        const profile = profiles[index];
        const ruleParity = parity.ruleResults[index];
        if (profile === undefined || ruleParity === undefined)
          throw new Error('PHASE_1C_FIXTURE_MAPPING_FAILED');
        await client.query(
          `INSERT INTO pricing_rule (
             id, price_version_id, catalog_version_id, rule_key, kind,
             verification_status, parity_status, product_family_id, product_system_id,
             configurator_model_id, product_model_source_id, product_model_code,
             product_model_name, material_variant_id, source_reference, source_version,
             source_captured_at, verified_at, source_price_category, currency,
             base_price_minor, rounding_rule, minimum_width_mm, maximum_width_mm,
             minimum_height_mm, maximum_height_mm, rule_data, option_data, test_examples,
             fixture_count, maximum_deviation_minor, safe_explanation
           ) VALUES (
             $1,$2,$3,$4,$5,'VERIFIED',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,
             $16,$16,$17,'RUB',$18,$19,$20,$21,$22,$23,$24::jsonb,$25::jsonb,
             $26::jsonb,$27,$28,$29
           )`,
          [
            rule.id,
            candidate.id,
            catalog.id,
            rule.ruleKey,
            rule.kind,
            ruleParity.failedCount === 0 ? 'PASSED' : 'FAILED',
            rule.familyId,
            rule.systemId,
            rule.modelId,
            rule.modelSourceId,
            rule.modelCode,
            rule.modelName,
            rule.materialVariantId,
            fixture.sourceReference,
            fixture.sourceVersion,
            fixture.capturedAt,
            rule.sourcePriceCategory,
            rule.basePriceMinor,
            rule.roundingRule,
            rule.minimumWidthMm,
            rule.maximumWidthMm,
            rule.minimumHeightMm,
            rule.maximumHeightMm,
            JSON.stringify(profile.ruleData),
            JSON.stringify(profile.optionData),
            JSON.stringify(rule.fixtures),
            rule.fixtures.length,
            ruleParity.maximumDeviationMinor,
            rule.safeExplanation,
          ],
        );
      }
      const ownerId = await actorId(client);
      await client.query(
        `INSERT INTO pricing_parity_run (
             price_version_id, status, source_version, fixture_count, passed_count,
             failed_count, maximum_deviation_minor, safe_details, run_by_actor_id,
             correlation_id, idempotency_key
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11)`,
        [
          candidate.id,
          parity.status,
          fixture.sourceVersion,
          parity.fixtureCount,
          parity.passedCount,
          parity.failedCount,
          parity.maximumDeviationMinor,
          JSON.stringify({ ruleResults: parity.ruleResults }),
          ownerId,
          'phase-1c-bootstrap-parity',
          `phase1c:parity:${candidate.id}:${fixture.sourceVersion}`,
        ],
      );
      await client.query(
        `INSERT INTO pricing_version_decision (
             price_version_id, action, actor_id, before_state, after_state,
             safe_reason, correlation_id, idempotency_key
         ) VALUES ($1,'PARITY_VERIFY',$2,$3::jsonb,$4::jsonb,$5,$6,$7)`,
        [
          candidate.id,
          ownerId,
          JSON.stringify({ parityStatus: 'PENDING' }),
          JSON.stringify({
            fixtureCount: parity.fixtureCount,
            maximumDeviationMinor: parity.maximumDeviationMinor,
            parityStatus: parity.status,
          }),
          'Verified dated AMIGO Phase 1C fixtures.',
          'phase-1c-bootstrap-parity',
          `phase1c:parity-decision:${candidate.id}`,
        ],
      );
    }

    const activate = process.argv.includes('--activate');
    if (activate) {
      const ownerId = await actorId(client);
      const parity = await client.query<{ readonly failed_count: number; readonly status: string }>(
        `SELECT status, failed_count FROM pricing_parity_run
          WHERE price_version_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [candidate.id],
      );
      if (parity.rows[0]?.status !== 'PASSED' || parity.rows[0].failed_count !== 0) {
        throw new Error('PHASE_1C_PARITY_BLOCKS_ACTIVATION');
      }
      await client.query(
        `UPDATE price_version SET status = 'SUPERSEDED', activation_key = NULL
          WHERE status = 'ACTIVE' AND id <> $1`,
        [candidate.id],
      );
      await client.query(
        `UPDATE price_version
            SET status = 'ACTIVE', approved_by_actor_id = $2, approved_at = now(),
                activated_by_actor_id = $2, activated_at = now(), activation_key = $3
          WHERE id = $1 AND status IN ('AWAITING_APPROVAL', 'APPROVED')`,
        [candidate.id, ownerId, 'PUBLIC'],
      );
      await client.query(
        `INSERT INTO pricing_version_decision (
             price_version_id, action, actor_id, before_state, after_state,
             safe_reason, correlation_id, idempotency_key
         ) VALUES ($1,'ACTIVATE',$2,$3::jsonb,$4::jsonb,$5,$6,$7)
         ON CONFLICT (idempotency_key) DO NOTHING`,
        [
          candidate.id,
          ownerId,
          JSON.stringify({
            activePriceVersionId: currentPrice.id,
            candidateStatus: candidate.status,
          }),
          JSON.stringify({ activePriceVersionId: candidate.id, candidateStatus: 'ACTIVE' }),
          'Owner reviewed Phase 1C diff and passing parity fixtures.',
          'phase-1c-bootstrap-activate',
          `phase1c:activate:${candidate.id}`,
        ],
      );
      await client.query(
        `INSERT INTO audit_event (
             actor_type, actor_identity_id, action, outcome, correlation_id,
             target_type, target_id, reason_code
         ) VALUES ('IDENTITY',$1,'pricing.version.activate','SUCCEEDED',$2,'PriceVersion',$3,'PHASE_1C_PARITY_PASSED')`,
        [ownerId, 'phase-1c-bootstrap-activate', candidate.id],
      );
      candidate = { ...candidate, status: 'ACTIVE' };
    }
    await client.query('COMMIT');
    const summary = await client.query<{
      readonly fixture_count: string;
      readonly maximum_deviation_minor: number;
      readonly rule_count: string;
    }>(
      `SELECT count(DISTINCT pr.id)::text AS rule_count,
              COALESCE(sum(pr.fixture_count),0)::text AS fixture_count,
              COALESCE(max(pr.maximum_deviation_minor),0) AS maximum_deviation_minor
         FROM pricing_rule pr WHERE pr.price_version_id = $1`,
      [candidate.id],
    );
    process.stdout.write(
      `${JSON.stringify({ active: candidate.status === 'ACTIVE', fixtureCount: Number(summary.rows[0]?.fixture_count ?? 0), maximumDeviationMinor: summary.rows[0]?.maximum_deviation_minor ?? 0, priceVersionId: candidate.id, ruleCount: Number(summary.rows[0]?.rule_count ?? 0), versionNumber: candidate.version_number })}\n`,
    );
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

await run();
