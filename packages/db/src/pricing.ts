import { createHash, randomBytes } from 'node:crypto';

import type { DatabaseEnvironment } from '@project-name/config/server';
import {
  calculatePrice,
  classifyConfiguratorCoverage,
  validatePricingSelection,
  verifyPricingParity,
  type ConfiguratorBootstrap,
  type ConfiguratorMaterialSearchItem,
  type ConfiguratorMaterialSearchPage,
  type ConfiguratorMaterialSearchQuery,
  type PricingAdminOverview,
  type PricingResult,
  type PricingRuleProfile,
  type PricingSelection,
  type PricingValidationResult,
  type PublicPricingProfile,
  type QuoteSnapshotView,
  type StoredPricingCalculation,
} from '@project-name/pricing';
import { Pool, type PoolClient } from 'pg';

export type PricingStoreErrorCode =
  | 'PRICING_AUTHORIZATION'
  | 'PRICING_CONFLICT'
  | 'PRICING_DATABASE'
  | 'PRICING_INVALID_INPUT'
  | 'PRICING_NOT_FOUND'
  | 'PRICING_PARITY_BLOCKED';

export class PricingStoreError extends Error {
  public readonly code: PricingStoreErrorCode;

  public constructor(code: PricingStoreErrorCode, options?: ErrorOptions) {
    super(code, options);
    this.name = 'PricingStoreError';
    this.code = code;
  }
}

interface ActiveStateRow {
  readonly catalog_version_id: string;
  readonly catalog_version_number: number;
  readonly price_version_id: string | null;
  readonly price_version_number: number | null;
}

interface RuleRow {
  readonly base_price_minor: number | null;
  readonly catalog_version_id: string;
  readonly created_at: Date;
  readonly currency: 'RUB';
  readonly fixture_count: number;
  readonly id: string;
  readonly kind: PricingRuleProfile['kind'];
  readonly material_variant_id: string;
  readonly maximum_deviation_minor: number;
  readonly maximum_height_mm: number;
  readonly maximum_width_mm: number;
  readonly minimum_height_mm: number;
  readonly minimum_width_mm: number;
  readonly option_data: PricingRuleProfile['optionData'];
  readonly parity_status: PricingRuleProfile['parityStatus'];
  readonly price_version_active: boolean;
  readonly price_version_id: string;
  readonly product_family_id: string;
  readonly product_model_code: string;
  readonly product_model_name: string;
  readonly product_model_source_id: string;
  readonly product_system_id: string;
  readonly rounding_rule: PricingRuleProfile['roundingRule'];
  readonly rule_data: PricingRuleProfile['ruleData'];
  readonly rule_key: string;
  readonly safe_explanation: string;
  readonly source_captured_at: Date;
  readonly source_price_category: string | null;
  readonly source_reference: string;
  readonly source_version: string;
  readonly test_examples: PricingRuleProfile['testExamples'];
  readonly verification_status: PricingRuleProfile['verificationStatus'];
  readonly verified_at: Date;
}

interface CalculationRow {
  readonly catalog_version_id: string;
  readonly created_at: Date;
  readonly id: string;
  readonly input_snapshot: Record<string, unknown>;
  readonly price_version_id: string | null;
  readonly public_token: string;
  readonly request_digest: string;
  readonly result_snapshot: PricingResult;
  readonly status: PricingResult['status'];
}

interface QuoteRow {
  readonly breakdown_snapshot: PricingResult;
  readonly catalog_version_id: string;
  readonly configuration_snapshot: Record<string, unknown>;
  readonly created_at: Date;
  readonly price_version_id: string | null;
  readonly public_token: string;
  readonly source_version: string | null;
  readonly status: PricingResult['status'];
}

interface ConfiguratorMaterialRow {
  readonly article: string;
  readonly automatic_pricing: boolean;
  readonly availability_status: string;
  readonly category_name: string;
  readonly color_name: string | null;
  readonly compatible_selected: boolean;
  readonly has_compatibility: boolean;
  readonly image_height: number | null;
  readonly image_id: string | null;
  readonly image_width: number | null;
  readonly name: string;
  readonly system_name: string;
  readonly total_count: string;
  readonly variant_id: string;
}

export interface PricingAdapter {
  readonly activateVersion: (input: PricingAdminCommand) => Promise<void>;
  readonly calculate: (input: PricingCalculateCommand) => Promise<StoredPricingCalculation>;
  readonly close: () => Promise<void>;
  readonly getAdminOverview: () => Promise<PricingAdminOverview>;
  readonly getBootstrap: () => Promise<ConfiguratorBootstrap>;
  readonly getQuote: (token: string) => Promise<QuoteSnapshotView>;
  readonly searchMaterials: (
    query: ConfiguratorMaterialSearchQuery,
  ) => Promise<ConfiguratorMaterialSearchPage>;
  readonly rejectVersion: (input: PricingAdminCommand) => Promise<void>;
  readonly removeLocalOverride: (input: PricingOverrideRemoveCommand) => Promise<void>;
  readonly requestPrice: (input: PricingRequestPriceCommand) => Promise<StoredPricingCalculation>;
  readonly saveQuote: (input: PricingQuoteSaveCommand) => Promise<QuoteSnapshotView>;
  readonly setLocalOverride: (input: PricingOverrideSetCommand) => Promise<string>;
  readonly validate: (selection: PricingSelection) => Promise<PricingValidationResult>;
  readonly verifyParity: (input: PricingAdminCommand) => Promise<void>;
}

export interface PricingCalculateCommand {
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly selection: PricingSelection;
}

export interface PricingRequestPriceCommand {
  readonly catalogVersionId: string;
  readonly categoryId?: string | undefined;
  readonly correlationId: string;
  readonly heightMm?: number | undefined;
  readonly idempotencyKey: string;
  readonly materialVariantId?: string | undefined;
  readonly productFamilyId: string;
  readonly productSystemId?: string | undefined;
  readonly quantity: number;
  readonly widthMm?: number | undefined;
}

export interface PricingQuoteSaveCommand {
  readonly calculationToken: string;
  readonly correlationId: string;
  readonly idempotencyKey: string;
}

export interface PricingAdminCommand {
  readonly actorId: string;
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly priceVersionId: string;
  readonly reason: string;
}

export interface PricingOverrideSetCommand {
  readonly actorId: string;
  readonly amountMinor: number;
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly materialVariantId: string;
  readonly reason: string;
}

export interface PricingOverrideRemoveCommand {
  readonly actorId: string;
  readonly correlationId: string;
  readonly idempotencyKey: string;
  readonly materialVariantId: string;
  readonly reason: string;
}

function mapError(error: unknown): PricingStoreError {
  if (error instanceof PricingStoreError) return error;
  if (error instanceof Error && 'code' in error) {
    const code = String(error.code);
    if (['23505', '40001', '40P01'].includes(code)) {
      return new PricingStoreError('PRICING_CONFLICT', { cause: error });
    }
  }
  return new PricingStoreError('PRICING_DATABASE', { cause: error });
}

function assertOpaque(value: string, maximum: number): void {
  if (value.trim().length < 8 || value.length > maximum || !/^[A-Za-z0-9:._-]+$/u.test(value)) {
    throw new PricingStoreError('PRICING_INVALID_INPUT');
  }
}

function token(): string {
  return randomBytes(24).toString('base64url');
}

function digest(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function mapRule(row: RuleRow): PricingRuleProfile {
  return {
    basePriceMinor: row.base_price_minor,
    catalogVersionId: row.catalog_version_id,
    configuratorModelId: row.id,
    createdAt: row.created_at.toISOString(),
    currency: row.currency,
    fixtureCount: row.fixture_count,
    id: row.id,
    kind: row.kind,
    materialVariantId: row.material_variant_id,
    maximumDeviationMinor: row.maximum_deviation_minor,
    maximumHeightMm: row.maximum_height_mm,
    maximumWidthMm: row.maximum_width_mm,
    minimumHeightMm: row.minimum_height_mm,
    minimumWidthMm: row.minimum_width_mm,
    optionData: row.option_data,
    parityStatus: row.parity_status,
    priceVersionActive: row.price_version_active,
    priceVersionId: row.price_version_id,
    productFamilyId: row.product_family_id,
    productModelCode: row.product_model_code,
    productModelName: row.product_model_name,
    productModelSourceId: row.product_model_source_id,
    productSystemId: row.product_system_id,
    roundingRule: row.rounding_rule,
    ruleData: row.rule_data,
    ruleKey: row.rule_key,
    safeExplanation: row.safe_explanation,
    sourceCapturedAt: row.source_captured_at.toISOString(),
    sourcePriceCategory: row.source_price_category,
    sourceReference: row.source_reference,
    sourceVersion: row.source_version,
    testExamples: row.test_examples,
    verificationStatus: row.verification_status,
    verifiedAt: row.verified_at.toISOString(),
  };
}

function publicProfile(profile: PricingRuleProfile): PublicPricingProfile {
  const {
    ruleData: _ruleData,
    sourceReference: _sourceReference,
    testExamples: _tests,
    ...safe
  } = profile;
  return safe;
}

function unavailableResult(
  selection: PricingSelection,
  status: PricingResult['status'],
  explanation: string,
): PricingResult {
  return {
    appliedOverrides: [],
    appliedRules: [],
    calculatedAt: new Date().toISOString(),
    currency: 'RUB',
    deliveryKopecks: 0,
    grandTotalKopecks: null,
    installationKopecks: 0,
    measurementKopecks: 0,
    minimumPriceApplied: false,
    minimumPriceKopecks: 150_000,
    optionsTotalKopecks: null,
    priceVersionId: null,
    productsSubtotalKopecks: null,
    quantity: selection.quantity,
    safeExplanation: explanation,
    sourceVersion: null,
    status,
    unitBasePriceKopecks: null,
    unitFinalPriceKopecks: null,
    unitPriceBeforeMinimumKopecks: null,
    validationDetails:
      status === 'CONFIGURATION_INVALID'
        ? [
            {
              code: 'INCOMPATIBLE_SELECTION',
              field: 'configuration',
              message: 'Выбранное сочетание недоступно.',
            },
          ]
        : [],
    warnings: [],
  };
}

async function activeState(client: Pool | PoolClient): Promise<ActiveStateRow> {
  const result = await client.query<ActiveStateRow>(`
    SELECT catalog.id::text AS catalog_version_id,
           catalog.version_number AS catalog_version_number,
           price.id::text AS price_version_id,
           price.version_number AS price_version_number
    FROM catalog_version catalog
    LEFT JOIN LATERAL (
      SELECT id, version_number FROM price_version
      WHERE status = 'ACTIVE' AND activation_key = 'PUBLIC'
      ORDER BY activated_at DESC LIMIT 1
    ) price ON TRUE
    WHERE catalog.status = 'ACTIVE' AND catalog.activation_key = 'PUBLIC'
    ORDER BY catalog.activated_at DESC LIMIT 1
  `);
  const row = result.rows[0];
  if (row === undefined) throw new PricingStoreError('PRICING_DATABASE');
  return row;
}

const ruleSelect = `
  SELECT rule.id::text, rule.price_version_id::text, rule.catalog_version_id::text,
         rule.rule_key, rule.kind::text, rule.verification_status::text,
         rule.parity_status::text, rule.product_family_id::text,
         rule.product_system_id::text, rule.product_model_source_id,
         rule.product_model_code, rule.product_model_name,
         rule.material_variant_id::text, rule.source_reference,
         rule.source_version, rule.source_captured_at, rule.verified_at,
         rule.source_price_category, rule.currency, rule.base_price_minor,
         rule.rounding_rule, rule.minimum_width_mm, rule.maximum_width_mm,
         rule.minimum_height_mm, rule.maximum_height_mm, rule.rule_data,
         rule.option_data, rule.test_examples, rule.fixture_count,
         rule.maximum_deviation_minor, rule.safe_explanation, rule.created_at,
         (price.status = 'ACTIVE' AND price.activation_key = 'PUBLIC') AS price_version_active
  FROM pricing_rule rule
  JOIN price_version price ON price.id = rule.price_version_id
`;

async function eligibleProfiles(
  client: Pool | PoolClient,
  state: ActiveStateRow,
): Promise<readonly PricingRuleProfile[]> {
  if (state.price_version_id === null) return [];
  const rows = await client.query<RuleRow>(
    `${ruleSelect}
    JOIN business_catalog_entry business ON business.material_variant_id = rule.material_variant_id
    JOIN catalog_version_entry member
      ON member.business_catalog_entry_id = business.id
     AND member.catalog_version_id = rule.catalog_version_id
    JOIN publication_record publication ON publication.id = member.publication_record_id
    JOIN availability_record availability ON availability.id = member.availability_record_id
    WHERE rule.catalog_version_id = $1::uuid
      AND rule.price_version_id = $2::uuid
      AND rule.verification_status = 'VERIFIED'
      AND rule.parity_status = 'PASSED'
      AND business.visibility = 'VISIBLE'
      AND publication.status = 'PUBLISHED'
      AND availability.status IN ('AVAILABLE', 'INQUIRY_ONLY')
      AND EXISTS (
        SELECT 1 FROM compatibility_rule compatible
        WHERE compatible.system_id = rule.product_system_id
          AND compatible.material_variant_id = rule.material_variant_id
      )
    ORDER BY (rule.option_data->>'familyName'), (rule.option_data->>'systemName'), rule.rule_key
  `,
    [state.catalog_version_id, state.price_version_id],
  );
  return rows.rows.map(mapRule);
}

async function publishedSelection(
  client: Pool | PoolClient,
  state: ActiveStateRow,
  selection: PricingSelection,
): Promise<boolean> {
  const result = await client.query<{ readonly valid: boolean }>(
    `
    SELECT EXISTS (
      SELECT 1
      FROM material_variant variant
      JOIN material ON material.id = variant.material_id
      JOIN product_system system_row ON system_row.id = $3::uuid
      JOIN business_catalog_entry business ON business.material_variant_id = variant.id
      JOIN catalog_version_entry member
        ON member.business_catalog_entry_id = business.id AND member.catalog_version_id = $1::uuid
      JOIN publication_record publication ON publication.id = member.publication_record_id
      JOIN availability_record availability ON availability.id = member.availability_record_id
      WHERE variant.id = $2::uuid
        AND material.family_id = $4::uuid
        AND system_row.family_id = $4::uuid
        AND business.visibility = 'VISIBLE'
        AND publication.status = 'PUBLISHED'
        AND availability.status IN ('AVAILABLE', 'INQUIRY_ONLY')
        AND EXISTS (
          SELECT 1 FROM compatibility_rule compatible
          WHERE compatible.system_id = system_row.id
            AND compatible.material_variant_id = variant.id
        )
    ) AS valid
  `,
    [
      state.catalog_version_id,
      selection.materialVariantId,
      selection.productSystemId,
      selection.productFamilyId,
    ],
  );
  return result.rows[0]?.valid === true;
}

function materialAvailability(value: string): ConfiguratorMaterialSearchItem['availability'] {
  if (value === 'AVAILABLE') return 'IN_STOCK';
  if (value === 'OUT_OF_STOCK') return 'OUT_OF_STOCK';
  return 'INQUIRY_ONLY';
}

async function searchConfiguratorMaterials(
  client: Pool | PoolClient,
  state: ActiveStateRow,
  query: ConfiguratorMaterialSearchQuery,
): Promise<ConfiguratorMaterialSearchPage> {
  const search = `%${query.query.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')}%`;
  const result = await client.query<ConfiguratorMaterialRow>(
    `
    WITH selected_system AS (
      SELECT system_row.id, system_row.name
      FROM product_system system_row
      WHERE system_row.id = $4::uuid
        AND system_row.family_id = $2::uuid
    ), candidates AS (
      SELECT variant.id::text AS variant_id, variant.name, variant.article,
             color.name AS color_name, category.name AS category_name,
             selected_system.name AS system_name,
             availability.status::text AS availability_status,
             EXISTS (
               SELECT 1 FROM compatibility_rule compatible
               WHERE compatible.material_variant_id = variant.id
             ) AS has_compatibility,
             EXISTS (
               SELECT 1 FROM compatibility_rule compatible
               WHERE compatible.material_variant_id = variant.id
                 AND compatible.system_id = selected_system.id
             ) AS compatible_selected,
             EXISTS (
               SELECT 1 FROM pricing_rule rule
               JOIN price_version price ON price.id = rule.price_version_id
               WHERE rule.catalog_version_id = $1::uuid
                 AND rule.price_version_id = $8::uuid
                 AND rule.product_system_id = selected_system.id
                 AND rule.material_variant_id = variant.id
                 AND rule.verification_status = 'VERIFIED'
                 AND rule.parity_status = 'PASSED'
                 AND price.status = 'ACTIVE' AND price.activation_key = 'PUBLIC'
             ) AS automatic_pricing,
             CASE WHEN media.publication_status = 'PUBLICATION_APPROVED'
                        AND media.rights_status IN ('PARTNER_LICENSE', 'OWNER_CREATED')
                  THEN media.id::text END AS image_id,
             CASE WHEN media.publication_status = 'PUBLICATION_APPROVED'
                        AND media.rights_status IN ('PARTNER_LICENSE', 'OWNER_CREATED')
                  THEN media.width END AS image_width,
             CASE WHEN media.publication_status = 'PUBLICATION_APPROVED'
                        AND media.rights_status IN ('PARTNER_LICENSE', 'OWNER_CREATED')
                  THEN media.height END AS image_height
      FROM material_variant variant
      JOIN material ON material.id = variant.material_id
      JOIN product_category category ON category.id = material.category_id
      JOIN business_catalog_entry business ON business.material_variant_id = variant.id
      JOIN catalog_version_entry member
        ON member.business_catalog_entry_id = business.id
       AND member.catalog_version_id = $1::uuid
      JOIN publication_record publication ON publication.id = member.publication_record_id
      JOIN availability_record availability ON availability.id = member.availability_record_id
      CROSS JOIN selected_system
      LEFT JOIN color ON color.id = variant.color_id
      LEFT JOIN media_asset media ON media.id = member.primary_media_asset_id
      WHERE material.family_id = $2::uuid
        AND material.category_id = $3::uuid
        AND business.visibility = 'VISIBLE'
        AND publication.status = 'PUBLISHED'
        AND availability.status IN ('AVAILABLE', 'OUT_OF_STOCK', 'INQUIRY_ONLY')
        AND ($9::uuid IS NULL OR variant.id = $9::uuid)
        AND ($5 = '%%' OR variant.name ILIKE $5 ESCAPE '\\'
             OR variant.article ILIKE $5 ESCAPE '\\'
             OR material.name ILIKE $5 ESCAPE '\\'
             OR COALESCE(color.name, '') ILIKE $5 ESCAPE '\\')
    )
    SELECT *, count(*) OVER ()::text AS total_count
    FROM candidates
    ORDER BY CASE
               WHEN compatible_selected AND automatic_pricing THEN 0
               WHEN compatible_selected THEN 1
               WHEN has_compatibility THEN 2
               ELSE 3
             END,
             lower(name), lower(article), variant_id
    LIMIT $6 OFFSET $7
  `,
    [
      state.catalog_version_id,
      query.familyId,
      query.categoryId,
      query.systemId,
      search,
      query.limit,
      query.offset,
      state.price_version_id,
      query.selectedMaterialId ?? null,
    ],
  );
  const items = result.rows.map((row): ConfiguratorMaterialSearchItem => {
    const coverageStatus = classifyConfiguratorCoverage({
      automaticPricing: row.automatic_pricing,
      compatibleWithSelectedSystem: row.compatible_selected,
      hasAnyCompatibleSystem: row.has_compatibility,
      hidden: false,
      published: true,
    });
    return {
      article: row.article,
      availability: materialAvailability(row.availability_status),
      categoryName: row.category_name,
      color: row.color_name ?? 'Цвет не указан',
      coverageStatus,
      id: row.variant_id,
      image:
        row.image_id === null || row.image_width === null || row.image_height === null
          ? null
          : { height: row.image_height, id: row.image_id, width: row.image_width },
      name: row.name,
      systemName: row.system_name,
    };
  });
  return {
    catalogVersionId: state.catalog_version_id,
    items,
    total: Number(result.rows[0]?.total_count ?? 0),
  };
}

async function localOverride(
  client: Pool | PoolClient,
  materialVariantId: string,
): Promise<{ amountMinor: number; id: string; reason: string } | undefined> {
  const result = await client.query<{
    readonly amount_minor: number;
    readonly id: string;
    readonly reason: string;
  }>(
    `
    SELECT override.id::text, override.amount_minor, override.reason
    FROM business_catalog_entry business
    JOIN local_price_override override ON override.business_catalog_entry_id = business.id
    WHERE business.material_variant_id = $1::uuid
      AND override.status = 'ACTIVE'
      AND override.effective_from <= NOW()
      AND (override.effective_to IS NULL OR override.effective_to > NOW())
    ORDER BY override.effective_from DESC LIMIT 1
  `,
    [materialVariantId],
  );
  const row = result.rows[0];
  return row === undefined
    ? undefined
    : { amountMinor: row.amount_minor, id: row.id, reason: row.reason };
}

function configurationSnapshot(profile: PricingRuleProfile, selection: PricingSelection) {
  const find = (values: readonly { id: string; name: string }[], id: string) =>
    values.find((value) => value.id === id)?.name ?? id;
  return {
    ids: selection,
    names: {
      additionalOptions: selection.additionalOptionIds.map((id) =>
        find(profile.optionData.additionalOptions, id),
      ),
      category: profile.optionData.categoryName,
      control: find(profile.optionData.controlTypes, selection.controlTypeId),
      family: profile.optionData.familyName,
      hardware: find(profile.optionData.hardwareOptions, selection.hardwareOptionId),
      material: profile.optionData.materialName,
      materialArticle: profile.optionData.materialArticle,
      materialColor: profile.optionData.materialColor,
      model: profile.productModelName,
      modelCode: profile.productModelCode,
      mounting: find(profile.optionData.mountingTypes, selection.mountingTypeId),
      system: profile.optionData.systemName,
    },
  };
}

async function authorizePricingAdmin(client: Pool | PoolClient, actorId: string): Promise<void> {
  const result = await client.query<{ readonly allowed: boolean }>(
    `
    SELECT bool_or(grant_row.role IN ('OWNER', 'ADMIN')) AS allowed
    FROM actor_identity actor
    JOIN role_grant grant_row ON grant_row.actor_id = actor.id
    WHERE actor.id = $1::uuid AND actor.disabled_at IS NULL AND grant_row.revoked_at IS NULL
    GROUP BY actor.id
  `,
    [actorId],
  );
  if (result.rows[0]?.allowed !== true) throw new PricingStoreError('PRICING_AUTHORIZATION');
}

async function transaction<T>(
  pool: Pool,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const value = await operation(client);
    await client.query('COMMIT');
    return value;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw mapError(error);
  } finally {
    client.release();
  }
}

async function audit(
  client: PoolClient,
  input: {
    action: string;
    actorId: string;
    correlationId: string;
    reasonCode: string;
    targetId: string;
  },
) {
  await client.query(
    `
    INSERT INTO audit_event (
      actor_type, actor_identity_id, action, outcome, correlation_id,
      target_type, target_id, reason_code
    ) VALUES ('IDENTITY',$1::uuid,$2,'SUCCEEDED',$3,'PriceVersion',$4,$5)
  `,
    [input.actorId, input.action, input.correlationId, input.targetId, input.reasonCode],
  );
}

async function claimAdminCommand(
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
    `
    SELECT payload_digest, status::text FROM idempotency_record WHERE scope = $1 AND key = $2
  `,
    [scope, key],
  );
  const row = existing.rows[0];
  if (row?.payload_digest !== payloadDigest) throw new PricingStoreError('PRICING_CONFLICT');
  if (row.status === 'SUCCEEDED') return false;
  throw new PricingStoreError('PRICING_CONFLICT');
}

async function completeAdminCommand(
  client: PoolClient,
  scope: string,
  key: string,
  result: unknown,
) {
  await client.query(
    `UPDATE idempotency_record
    SET status = 'SUCCEEDED', result_digest = $3, completed_at = NOW(), locked_until = NULL, updated_at = NOW()
    WHERE scope = $1 AND key = $2`,
    [scope, key, digest(result)],
  );
}

function quoteView(row: QuoteRow): QuoteSnapshotView {
  return {
    breakdown: row.breakdown_snapshot,
    catalogVersionId: row.catalog_version_id,
    configuration: row.configuration_snapshot,
    createdAt: row.created_at.toISOString(),
    priceVersionId: row.price_version_id,
    quoteToken: row.public_token,
    sourceVersion: row.source_version,
    status: row.status,
  };
}

export function createPricingAdapter(environment: DatabaseEnvironment): PricingAdapter {
  const pool = new Pool({
    connectionString: environment.DATABASE_URL,
    max: 8,
    statement_timeout: environment.DATABASE_STATEMENT_TIMEOUT_MS,
  });

  return {
    async close() {
      await pool.end();
    },
    async getBootstrap() {
      try {
        const state = await activeState(pool);
        if (state.price_version_id === null || state.price_version_number === null) {
          throw new PricingStoreError('PRICING_NOT_FOUND');
        }
        const [profiles, familyRows, systemRows] = await Promise.all([
          eligibleProfiles(pool, state),
          pool.query<{ automatic_pricing: boolean; code: string; id: string; name: string }>(
            `
            SELECT family.id::text, family.code, family.name,
                   EXISTS (
                     SELECT 1 FROM pricing_rule rule
                     WHERE rule.price_version_id = $2::uuid AND rule.product_family_id = family.id
                       AND rule.verification_status = 'VERIFIED' AND rule.parity_status = 'PASSED'
                   ) AS automatic_pricing
            FROM product_family family
            WHERE EXISTS (
              SELECT 1 FROM material
              JOIN material_variant variant ON variant.material_id = material.id
              JOIN business_catalog_entry business ON business.material_variant_id = variant.id
              JOIN catalog_version_entry member
                ON member.business_catalog_entry_id = business.id AND member.catalog_version_id = $1::uuid
              JOIN publication_record publication ON publication.id = member.publication_record_id
              WHERE material.family_id = family.id
                AND business.visibility = 'VISIBLE' AND publication.status = 'PUBLISHED'
            )
            ORDER BY automatic_pricing DESC, family.sort_order, family.name
          `,
            [state.catalog_version_id, state.price_version_id],
          ),
          pool.query<{
            category_id: string;
            category_name: string;
            family_id: string;
            id: string;
            name: string;
          }>(
            `
            SELECT DISTINCT system_row.id::text, system_row.name,
                   material.family_id::text, category.id::text AS category_id,
                   category.name AS category_name,
                   category.sort_order AS category_sort_order,
                   system_row.sort_order AS system_sort_order
            FROM product_system system_row
            JOIN compatibility_rule compatible ON compatible.system_id = system_row.id
            JOIN material_variant variant ON variant.id = compatible.material_variant_id
            JOIN material ON material.id = variant.material_id
            JOIN product_category category ON category.id = material.category_id
            JOIN business_catalog_entry business ON business.material_variant_id = variant.id
            JOIN catalog_version_entry member
              ON member.business_catalog_entry_id = business.id
             AND member.catalog_version_id = $1::uuid
            JOIN publication_record publication ON publication.id = member.publication_record_id
            WHERE material.family_id = system_row.family_id
              AND business.visibility = 'VISIBLE'
              AND publication.status = 'PUBLISHED'
            ORDER BY family_id, category_sort_order, system_sort_order, system_row.name
          `,
            [state.catalog_version_id],
          ),
        ]);
        return {
          catalogVersionId: state.catalog_version_id,
          catalogVersionNumber: state.catalog_version_number,
          families: familyRows.rows.map((row) => ({
            automaticPricing: row.automatic_pricing,
            code: row.code,
            id: row.id,
            name: row.name,
          })),
          priceVersionId: state.price_version_id,
          priceVersionNumber: state.price_version_number,
          profiles: profiles.map(publicProfile),
          systems: systemRows.rows.map((row) => ({
            categoryId: row.category_id,
            categoryName: row.category_name,
            familyId: row.family_id,
            id: row.id,
            name: row.name,
          })),
        };
      } catch (error) {
        throw mapError(error);
      }
    },

    async searchMaterials(query) {
      try {
        if (query.limit < 1 || query.limit > 48 || query.offset < 0 || query.query.length > 120) {
          throw new PricingStoreError('PRICING_INVALID_INPUT');
        }
        return await searchConfiguratorMaterials(pool, await activeState(pool), query);
      } catch (error) {
        throw mapError(error);
      }
    },

    async validate(selection) {
      try {
        const state = await activeState(pool);
        if (selection.catalogVersionId !== state.catalog_version_id) {
          return {
            details: [
              {
                code: 'CATALOG_VERSION_INACTIVE',
                field: 'catalogVersionId',
                message: 'Версия каталога устарела.',
              },
            ],
            status: 'INVALID',
            warnings: [],
          };
        }
        const profile = (await eligibleProfiles(pool, state)).find(
          (item) =>
            item.productFamilyId === selection.productFamilyId &&
            item.productSystemId === selection.productSystemId &&
            item.configuratorModelId === selection.configuratorModelId &&
            item.materialVariantId === selection.materialVariantId,
        );
        if (profile !== undefined) return validatePricingSelection(profile, selection);
        return (await publishedSelection(pool, state, selection))
          ? { details: [], status: 'VALID', warnings: ['Цена рассчитывается по запросу.'] }
          : {
              details: [
                {
                  code: 'INCOMPATIBLE_SELECTION',
                  field: 'configuration',
                  message: 'Выбранное сочетание недоступно.',
                },
              ],
              status: 'INVALID',
              warnings: [],
            };
      } catch (error) {
        throw mapError(error);
      }
    },

    async calculate(input) {
      assertOpaque(input.idempotencyKey, 180);
      assertOpaque(input.correlationId, 128);
      const requestDigest = digest(input.selection);
      try {
        const previous = await pool.query<CalculationRow>(
          `
          SELECT id::text, public_token, request_digest, catalog_version_id::text,
                 price_version_id::text, status::text, input_snapshot,
                 result_snapshot, created_at
          FROM pricing_calculation WHERE idempotency_key = $1
        `,
          [input.idempotencyKey],
        );
        const existing = previous.rows[0];
        if (existing !== undefined) {
          if (existing.request_digest !== requestDigest)
            throw new PricingStoreError('PRICING_CONFLICT');
          return {
            calculationId: existing.id,
            calculationToken: existing.public_token,
            result: existing.result_snapshot,
          };
        }

        const state = await activeState(pool);
        let profile: PricingRuleProfile | undefined;
        let result: PricingResult;
        if (input.selection.catalogVersionId !== state.catalog_version_id) {
          result = unavailableResult(
            input.selection,
            'CONFIGURATION_INVALID',
            'Версия каталога устарела. Обновите конфигуратор.',
          );
        } else if (state.price_version_id === null) {
          result = unavailableResult(
            input.selection,
            'PRICE_VERSION_INACTIVE',
            'Активная версия цены недоступна.',
          );
        } else {
          profile = (await eligibleProfiles(pool, state)).find(
            (item) =>
              item.productFamilyId === input.selection.productFamilyId &&
              item.productSystemId === input.selection.productSystemId &&
              item.configuratorModelId === input.selection.configuratorModelId &&
              item.materialVariantId === input.selection.materialVariantId,
          );
          if (profile === undefined) {
            result = (await publishedSelection(pool, state, input.selection))
              ? calculatePrice({
                  calculatedAt: new Date().toISOString(),
                  profile: null,
                  selection: input.selection,
                })
              : unavailableResult(
                  input.selection,
                  'CONFIGURATION_INVALID',
                  'Выбранное сочетание недоступно.',
                );
          } else {
            const override = await localOverride(pool, profile.materialVariantId);
            result = calculatePrice({
              calculatedAt: new Date().toISOString(),
              ...(override === undefined ? {} : { localOverride: override }),
              profile,
              selection: input.selection,
            });
          }
        }
        const calculationToken = token();
        const configuration =
          profile === undefined
            ? { ids: input.selection }
            : configurationSnapshot(profile, input.selection);
        const inserted = await pool.query<CalculationRow>(
          `
          INSERT INTO pricing_calculation (
            public_token, idempotency_key, request_digest, catalog_version_id,
            price_version_id, status, input_snapshot, result_snapshot, correlation_id
          ) VALUES ($1,$2,$3,$4::uuid,$5::uuid,$6::pricing_calculation_status,$7::jsonb,$8::jsonb,$9)
          ON CONFLICT (idempotency_key) DO NOTHING
          RETURNING id::text, public_token, request_digest, catalog_version_id::text,
                    price_version_id::text, status::text, input_snapshot, result_snapshot, created_at
        `,
          [
            calculationToken,
            input.idempotencyKey,
            requestDigest,
            state.catalog_version_id,
            result.priceVersionId,
            result.status,
            JSON.stringify(configuration),
            JSON.stringify(result),
            input.correlationId,
          ],
        );
        const saved = inserted.rows[0];
        if (saved !== undefined)
          return {
            calculationId: saved.id,
            calculationToken: saved.public_token,
            result: saved.result_snapshot,
          };
        const raced = await pool.query<CalculationRow>(
          `
          SELECT id::text, public_token, request_digest, catalog_version_id::text,
                 price_version_id::text, status::text, input_snapshot, result_snapshot, created_at
          FROM pricing_calculation WHERE idempotency_key = $1
        `,
          [input.idempotencyKey],
        );
        const row = raced.rows[0];
        if (row === undefined || row.request_digest !== requestDigest)
          throw new PricingStoreError('PRICING_CONFLICT');
        return {
          calculationId: row.id,
          calculationToken: row.public_token,
          result: row.result_snapshot,
        };
      } catch (error) {
        throw mapError(error);
      }
    },

    async requestPrice(input) {
      assertOpaque(input.idempotencyKey, 180);
      assertOpaque(input.correlationId, 128);
      const requestDigest = digest({
        catalogVersionId: input.catalogVersionId,
        categoryId: input.categoryId,
        heightMm: input.heightMm,
        materialVariantId: input.materialVariantId,
        productFamilyId: input.productFamilyId,
        productSystemId: input.productSystemId,
        quantity: input.quantity,
        widthMm: input.widthMm,
      });
      try {
        const previous = await pool.query<CalculationRow>(
          `
          SELECT id::text, public_token, request_digest, catalog_version_id::text,
                 price_version_id::text, status::text, input_snapshot,
                 result_snapshot, created_at
          FROM pricing_calculation WHERE idempotency_key = $1
        `,
          [input.idempotencyKey],
        );
        const existing = previous.rows[0];
        if (existing !== undefined) {
          if (existing.request_digest !== requestDigest)
            throw new PricingStoreError('PRICING_CONFLICT');
          return {
            calculationId: existing.id,
            calculationToken: existing.public_token,
            result: existing.result_snapshot,
          };
        }
        const state = await activeState(pool);
        if (input.catalogVersionId !== state.catalog_version_id) {
          throw new PricingStoreError('PRICING_INVALID_INPUT');
        }
        const detailed =
          input.categoryId !== undefined &&
          input.heightMm !== undefined &&
          input.materialVariantId !== undefined &&
          input.productSystemId !== undefined &&
          input.widthMm !== undefined;
        const selectionResult = detailed
          ? await pool.query<{
              readonly article: string;
              readonly color_name: string | null;
              readonly family_name: string;
              readonly material_name: string;
              readonly system_name: string;
            }>(
              `
              SELECT family.name AS family_name, system_row.name AS system_name,
                     variant.name AS material_name, variant.article,
                     color.name AS color_name
              FROM material_variant variant
              JOIN material ON material.id = variant.material_id
              JOIN product_family family ON family.id = material.family_id
              JOIN product_system system_row ON system_row.id = $5::uuid
              JOIN business_catalog_entry business ON business.material_variant_id = variant.id
              JOIN catalog_version_entry member
                ON member.business_catalog_entry_id = business.id
               AND member.catalog_version_id = $2::uuid
              JOIN publication_record publication ON publication.id = member.publication_record_id
              JOIN availability_record availability ON availability.id = member.availability_record_id
              LEFT JOIN color ON color.id = variant.color_id
              WHERE family.id = $1::uuid
                AND material.category_id = $3::uuid
                AND variant.id = $4::uuid
                AND system_row.family_id = family.id
                AND business.visibility = 'VISIBLE'
                AND publication.status = 'PUBLISHED'
                AND availability.status IN ('AVAILABLE', 'INQUIRY_ONLY')
                AND EXISTS (
                  SELECT 1 FROM compatibility_rule compatible
                  WHERE compatible.material_variant_id = variant.id
                    AND compatible.system_id = system_row.id
                )
              LIMIT 1
            `,
              [
                input.productFamilyId,
                state.catalog_version_id,
                input.categoryId,
                input.materialVariantId,
                input.productSystemId,
              ],
            )
          : await pool.query<{
              readonly article: string;
              readonly color_name: string | null;
              readonly family_name: string;
              readonly material_name: string;
              readonly system_name: string;
            }>(
              `
              SELECT family.name AS family_name, 'Уточнит менеджер' AS system_name,
                     'Уточнит менеджер' AS material_name, 'Уточнит менеджер' AS article,
                     NULL::text AS color_name
              FROM product_family family
              WHERE family.id = $1::uuid
                AND EXISTS (
                  SELECT 1
                  FROM material
                  JOIN material_variant variant ON variant.material_id = material.id
                  JOIN business_catalog_entry business ON business.material_variant_id = variant.id
                  JOIN catalog_version_entry member
                    ON member.business_catalog_entry_id = business.id
                   AND member.catalog_version_id = $2::uuid
                  JOIN publication_record publication ON publication.id = member.publication_record_id
                  WHERE material.family_id = family.id
                    AND business.visibility = 'VISIBLE'
                    AND publication.status = 'PUBLISHED'
                )
              LIMIT 1
            `,
              [input.productFamilyId, state.catalog_version_id],
            );
        const selectionNames = selectionResult.rows[0];
        if (selectionNames === undefined) throw new PricingStoreError('PRICING_INVALID_INPUT');
        const result: PricingResult = {
          appliedOverrides: [],
          appliedRules: [],
          calculatedAt: new Date().toISOString(),
          currency: 'RUB',
          deliveryKopecks: 0,
          grandTotalKopecks: null,
          installationKopecks: 0,
          measurementKopecks: 0,
          minimumPriceApplied: false,
          minimumPriceKopecks: 150_000,
          optionsTotalKopecks: null,
          priceVersionId: state.price_version_id,
          productsSubtotalKopecks: null,
          quantity: input.quantity,
          safeExplanation: detailed
            ? 'Стоимость этого материала уточнит менеджер.'
            : 'Стоимость этого семейства уточнит менеджер после проверки параметров.',
          sourceVersion: null,
          status: 'PRICE_ON_REQUEST',
          unitBasePriceKopecks: null,
          unitFinalPriceKopecks: null,
          unitPriceBeforeMinimumKopecks: null,
          validationDetails: [],
          warnings: ['Стоимость уточнит менеджер.'],
        };
        const configuration = {
          ids: {
            catalogVersionId: state.catalog_version_id,
            ...(detailed
              ? {
                  categoryId: input.categoryId,
                  heightMm: input.heightMm,
                  materialVariantId: input.materialVariantId,
                  productSystemId: input.productSystemId,
                  widthMm: input.widthMm,
                }
              : {}),
            productFamilyId: input.productFamilyId,
            quantity: input.quantity,
            requestOnly: true,
          },
          names: {
            additionalOptions: [],
            control: 'Уточнит менеджер',
            family: selectionNames.family_name,
            hardware: 'Уточнит менеджер',
            material: selectionNames.material_name,
            materialArticle: selectionNames.article,
            materialColor: selectionNames.color_name ?? 'Цвет не указан',
            model: 'Уточнит менеджер',
            modelCode: 'Уточнит менеджер',
            mounting: 'Уточнит менеджер',
            system: selectionNames.system_name,
          },
        };
        const calculationToken = token();
        const inserted = await pool.query<CalculationRow>(
          `
          INSERT INTO pricing_calculation (
            public_token, idempotency_key, request_digest, catalog_version_id,
            price_version_id, status, input_snapshot, result_snapshot, correlation_id
          ) VALUES ($1,$2,$3,$4::uuid,$5::uuid,'PRICE_ON_REQUEST',$6::jsonb,$7::jsonb,$8)
          ON CONFLICT (idempotency_key) DO NOTHING
          RETURNING id::text, public_token, request_digest, catalog_version_id::text,
                    price_version_id::text, status::text, input_snapshot, result_snapshot, created_at
        `,
          [
            calculationToken,
            input.idempotencyKey,
            requestDigest,
            state.catalog_version_id,
            state.price_version_id,
            JSON.stringify(configuration),
            JSON.stringify(result),
            input.correlationId,
          ],
        );
        const saved =
          inserted.rows[0] ??
          (
            await pool.query<CalculationRow>(
              `
              SELECT id::text, public_token, request_digest, catalog_version_id::text,
                     price_version_id::text, status::text, input_snapshot,
                     result_snapshot, created_at
              FROM pricing_calculation WHERE idempotency_key = $1
            `,
              [input.idempotencyKey],
            )
          ).rows[0];
        if (saved === undefined || saved.request_digest !== requestDigest) {
          throw new PricingStoreError('PRICING_CONFLICT');
        }
        return {
          calculationId: saved.id,
          calculationToken: saved.public_token,
          result: saved.result_snapshot,
        };
      } catch (error) {
        throw mapError(error);
      }
    },

    async saveQuote(input) {
      assertOpaque(input.calculationToken, 64);
      assertOpaque(input.idempotencyKey, 180);
      assertOpaque(input.correlationId, 128);
      try {
        const calculation = await pool.query<CalculationRow>(
          `
          SELECT id::text, public_token, request_digest, catalog_version_id::text,
                 price_version_id::text, status::text, input_snapshot, result_snapshot, created_at
          FROM pricing_calculation WHERE public_token = $1
        `,
          [input.calculationToken],
        );
        const source = calculation.rows[0];
        if (
          source === undefined ||
          ![
            'CALCULATED',
            'SOURCE_DATA_STALE',
            'PRICE_ON_REQUEST',
            'MANUAL_REVIEW_REQUIRED',
          ].includes(source.status)
        ) {
          throw new PricingStoreError('PRICING_NOT_FOUND');
        }
        const quoteToken = token();
        const inserted = await pool.query<QuoteRow>(
          `
          INSERT INTO quote_snapshot (
            public_token, calculation_id, save_idempotency_key, status,
            catalog_version_id, price_version_id, source_version,
            configuration_snapshot, breakdown_snapshot, grand_total_minor, correlation_id
          ) VALUES ($1,$2::uuid,$3,$4::pricing_calculation_status,$5::uuid,$6::uuid,$7,$8::jsonb,$9::jsonb,$10,$11)
          ON CONFLICT (save_idempotency_key) DO NOTHING
          RETURNING public_token, status::text, catalog_version_id::text,
                    price_version_id::text, source_version, configuration_snapshot,
                    breakdown_snapshot, created_at
        `,
          [
            quoteToken,
            source.id,
            input.idempotencyKey,
            source.status,
            source.catalog_version_id,
            source.price_version_id,
            source.result_snapshot.sourceVersion,
            JSON.stringify(source.input_snapshot),
            JSON.stringify(source.result_snapshot),
            source.result_snapshot.grandTotalKopecks,
            input.correlationId,
          ],
        );
        const saved =
          inserted.rows[0] ??
          (
            await pool.query<QuoteRow>(
              `
          SELECT public_token, status::text, catalog_version_id::text,
                 price_version_id::text, source_version, configuration_snapshot,
                 breakdown_snapshot, created_at
          FROM quote_snapshot WHERE save_idempotency_key = $1
        `,
              [input.idempotencyKey],
            )
          ).rows[0];
        if (saved === undefined) throw new PricingStoreError('PRICING_CONFLICT');
        return quoteView(saved);
      } catch (error) {
        throw mapError(error);
      }
    },

    async getQuote(publicToken) {
      assertOpaque(publicToken, 64);
      try {
        const result = await pool.query<QuoteRow>(
          `
          SELECT public_token, status::text, catalog_version_id::text,
                 price_version_id::text, source_version, configuration_snapshot,
                 breakdown_snapshot, created_at
          FROM quote_snapshot WHERE public_token = $1
        `,
          [publicToken],
        );
        const row = result.rows[0];
        if (row === undefined) throw new PricingStoreError('PRICING_NOT_FOUND');
        return quoteView(row);
      } catch (error) {
        throw mapError(error);
      }
    },

    async getAdminOverview() {
      try {
        const [versions, auditRows] = await Promise.all([
          pool.query<{
            activated_at: Date | null;
            change_count: string;
            created_at: Date;
            fixture_count: string;
            id: string;
            maximum_deviation_minor: number | null;
            parity_status: 'FAILED' | 'PASSED' | 'PENDING' | null;
            rule_count: string;
            source_version: string | null;
            status: string;
            unsupported_count: string;
            version_number: number;
          }>(`
            SELECT version.id::text, version.version_number, version.status::text,
                   version.activated_at, version.created_at,
                   count(DISTINCT rule.id)::text AS rule_count,
                   count(DISTINCT rule.id)::text AS change_count,
                   min(rule.source_version) AS source_version,
                   COALESCE(parity.fixture_count, 0)::text AS fixture_count,
                   parity.status::text AS parity_status,
                   parity.maximum_deviation_minor,
                   GREATEST(0, (SELECT count(*) FROM product_family) - count(DISTINCT rule.product_family_id))::text AS unsupported_count
            FROM price_version version
            LEFT JOIN pricing_rule rule ON rule.price_version_id = version.id
            LEFT JOIN LATERAL (
              SELECT status, fixture_count, maximum_deviation_minor
              FROM pricing_parity_run run WHERE run.price_version_id = version.id
              ORDER BY created_at DESC LIMIT 1
            ) parity ON TRUE
            GROUP BY version.id, parity.status, parity.fixture_count, parity.maximum_deviation_minor
            ORDER BY version.version_number DESC LIMIT 12
          `),
          pool.query<{
            action: string;
            actor_id: string | null;
            occurred_at: Date;
            outcome: string;
            reason_code: string;
            target_id: string;
          }>(`
            SELECT action, actor_identity_id::text AS actor_id, occurred_at, outcome::text,
                   reason_code, target_id
            FROM audit_event
            WHERE action ILIKE '%PRIC%' OR action ILIKE '%PRICE%'
            ORDER BY occurred_at DESC LIMIT 30
          `),
        ]);
        const active = versions.rows.find((row) => row.status === 'ACTIVE');
        return {
          activePriceVersionId: active?.id ?? null,
          audit: auditRows.rows.map((row) => ({
            action: row.action,
            actorId: row.actor_id,
            createdAt: row.occurred_at.toISOString(),
            outcome: row.outcome,
            reasonCode: row.reason_code,
            targetId: row.target_id,
          })),
          versions: versions.rows.map((row) => ({
            activatedAt: row.activated_at?.toISOString() ?? null,
            changeCount: Number(row.change_count),
            createdAt: row.created_at.toISOString(),
            fixtureCount: Number(row.fixture_count),
            id: row.id,
            maximumDeviationMinor: row.maximum_deviation_minor,
            parityStatus: row.parity_status,
            ruleCount: Number(row.rule_count),
            sourceVersion: row.source_version,
            status: row.status,
            unsupportedCount: Number(row.unsupported_count),
            versionNumber: row.version_number,
          })),
        };
      } catch (error) {
        throw mapError(error);
      }
    },

    async verifyParity(input) {
      assertOpaque(input.idempotencyKey, 180);
      await transaction(pool, async (client) => {
        await authorizePricingAdmin(client, input.actorId);
        if (!(await claimAdminCommand(client, 'pricing.parity', input.idempotencyKey, input)))
          return;
        const rows = await client.query<RuleRow>(
          `${ruleSelect}
          WHERE rule.price_version_id = $1::uuid ORDER BY rule.rule_key
        `,
          [input.priceVersionId],
        );
        const profiles = rows.rows.map((row) => ({ ...mapRule(row), priceVersionActive: true }));
        const parity = verifyPricingParity(profiles, new Date().toISOString());
        const sourceVersion = profiles[0]?.sourceVersion;
        if (sourceVersion === undefined) throw new PricingStoreError('PRICING_NOT_FOUND');
        await client.query(
          `
          INSERT INTO pricing_parity_run (
            price_version_id, status, source_version, fixture_count, passed_count,
            failed_count, maximum_deviation_minor, safe_details, run_by_actor_id,
            correlation_id, idempotency_key
          ) VALUES ($1::uuid,$2::pricing_parity_status,$3,$4,$5,$6,$7,$8::jsonb,$9::uuid,$10,$11)
          ON CONFLICT (idempotency_key) DO NOTHING
        `,
          [
            input.priceVersionId,
            parity.status,
            sourceVersion,
            parity.fixtureCount,
            parity.passedCount,
            parity.failedCount,
            parity.maximumDeviationMinor,
            JSON.stringify({ ruleResults: parity.ruleResults }),
            input.actorId,
            input.correlationId,
            input.idempotencyKey,
          ],
        );
        await audit(client, {
          action: 'PRICING_PARITY_VERIFIED',
          actorId: input.actorId,
          correlationId: input.correlationId,
          reasonCode: parity.status === 'PASSED' ? 'PARITY_PASSED' : 'PARITY_FAILED',
          targetId: input.priceVersionId,
        });
        await completeAdminCommand(client, 'pricing.parity', input.idempotencyKey, parity);
      });
    },

    async activateVersion(input) {
      assertOpaque(input.idempotencyKey, 180);
      await transaction(pool, async (client) => {
        await authorizePricingAdmin(client, input.actorId);
        if (!(await claimAdminCommand(client, 'pricing.activate', input.idempotencyKey, input)))
          return;
        const version = await client.query<{ status: string }>(
          `SELECT status::text FROM price_version WHERE id = $1::uuid FOR UPDATE`,
          [input.priceVersionId],
        );
        const current = version.rows[0];
        if (current === undefined) throw new PricingStoreError('PRICING_NOT_FOUND');
        const gate = await client.query<{ passed: boolean }>(
          `
          SELECT EXISTS (
            SELECT 1 FROM pricing_parity_run run
            WHERE run.price_version_id = $1::uuid AND run.status = 'PASSED' AND run.failed_count = 0
          ) AND EXISTS (
            SELECT 1 FROM pricing_rule rule WHERE rule.price_version_id = $1::uuid
              AND rule.verification_status = 'VERIFIED' AND rule.parity_status = 'PASSED'
          ) AS passed
        `,
          [input.priceVersionId],
        );
        if (gate.rows[0]?.passed !== true) throw new PricingStoreError('PRICING_PARITY_BLOCKED');
        await client.query(
          `UPDATE price_version SET status = 'SUPERSEDED', activation_key = NULL
          WHERE status = 'ACTIVE' AND id <> $1::uuid`,
          [input.priceVersionId],
        );
        const changed = await client.query(
          `UPDATE price_version SET status = 'ACTIVE',
          approved_by_actor_id = $2::uuid, approved_at = NOW(), activated_by_actor_id = $2::uuid,
          activated_at = NOW(), activation_key = 'PUBLIC'
          WHERE id = $1::uuid AND status IN ('AWAITING_APPROVAL','APPROVED')`,
          [input.priceVersionId, input.actorId],
        );
        if (changed.rowCount !== 1 && current.status !== 'ACTIVE')
          throw new PricingStoreError('PRICING_CONFLICT');
        await client.query(
          `INSERT INTO pricing_version_decision (
          price_version_id, action, actor_id, before_state, after_state, safe_reason,
          correlation_id, idempotency_key
        ) VALUES ($1::uuid,'ACTIVATE',$2::uuid,$3::jsonb,$4::jsonb,$5,$6,$7)
        ON CONFLICT (idempotency_key) DO NOTHING`,
          [
            input.priceVersionId,
            input.actorId,
            JSON.stringify({ status: current.status }),
            JSON.stringify({ status: 'ACTIVE' }),
            input.reason,
            input.correlationId,
            input.idempotencyKey,
          ],
        );
        await audit(client, {
          action: 'PRICING_VERSION_ACTIVATED',
          actorId: input.actorId,
          correlationId: input.correlationId,
          reasonCode: 'ADMIN_REVIEW_AND_PARITY_PASSED',
          targetId: input.priceVersionId,
        });
        await completeAdminCommand(client, 'pricing.activate', input.idempotencyKey, {
          status: 'ACTIVE',
        });
      });
    },

    async rejectVersion(input) {
      assertOpaque(input.idempotencyKey, 180);
      await transaction(pool, async (client) => {
        await authorizePricingAdmin(client, input.actorId);
        if (!(await claimAdminCommand(client, 'pricing.reject', input.idempotencyKey, input)))
          return;
        const changed = await client.query<{ status: string }>(
          `
          UPDATE price_version SET status = 'REJECTED', activation_key = NULL
          WHERE id = $1::uuid AND status IN ('DRAFT','AWAITING_APPROVAL','APPROVED')
          RETURNING status::text
        `,
          [input.priceVersionId],
        );
        if (changed.rowCount !== 1) throw new PricingStoreError('PRICING_CONFLICT');
        await client.query(
          `INSERT INTO pricing_version_decision (
          price_version_id, action, actor_id, before_state, after_state, safe_reason,
          correlation_id, idempotency_key
        ) VALUES ($1::uuid,'REJECT',$2::uuid,'{}'::jsonb,$3::jsonb,$4,$5,$6)
        ON CONFLICT (idempotency_key) DO NOTHING`,
          [
            input.priceVersionId,
            input.actorId,
            JSON.stringify({ status: 'REJECTED' }),
            input.reason,
            input.correlationId,
            input.idempotencyKey,
          ],
        );
        await audit(client, {
          action: 'PRICING_VERSION_REJECTED',
          actorId: input.actorId,
          correlationId: input.correlationId,
          reasonCode: 'ADMIN_REVIEW_REJECTED',
          targetId: input.priceVersionId,
        });
        await completeAdminCommand(client, 'pricing.reject', input.idempotencyKey, {
          status: 'REJECTED',
        });
      });
    },

    async setLocalOverride(input) {
      if (
        !Number.isSafeInteger(input.amountMinor) ||
        input.amountMinor <= 0 ||
        input.reason.trim().length < 3
      ) {
        throw new PricingStoreError('PRICING_INVALID_INPUT');
      }
      return transaction(pool, async (client) => {
        await authorizePricingAdmin(client, input.actorId);
        const fresh = await claimAdminCommand(
          client,
          'pricing.override.set',
          input.idempotencyKey,
          input,
        );
        if (!fresh) {
          const current = await localOverride(client, input.materialVariantId);
          if (current === undefined) throw new PricingStoreError('PRICING_CONFLICT');
          return current.id;
        }
        const business = await client.query<{ id: string }>(
          `
          SELECT id::text FROM business_catalog_entry WHERE material_variant_id = $1::uuid FOR UPDATE
        `,
          [input.materialVariantId],
        );
        const businessId = business.rows[0]?.id;
        if (businessId === undefined) throw new PricingStoreError('PRICING_NOT_FOUND');
        await client.query(
          `UPDATE local_price_override SET status = 'REMOVED', removed_at = NOW(),
          effective_to = GREATEST(effective_from, NOW())
          WHERE business_catalog_entry_id = $1::uuid AND status IN ('ACTIVE','SCHEDULED') AND removed_at IS NULL`,
          [businessId],
        );
        const inserted = await client.query<{ id: string }>(
          `INSERT INTO local_price_override (
          business_catalog_entry_id, amount_minor, currency, status, reason, decided_by_actor_id
        ) VALUES ($1::uuid,$2,'RUB','ACTIVE',$3,$4::uuid) RETURNING id::text`,
          [businessId, input.amountMinor, input.reason, input.actorId],
        );
        const overrideId = inserted.rows[0]?.id;
        if (overrideId === undefined) throw new PricingStoreError('PRICING_DATABASE');
        await audit(client, {
          action: 'PRICING_LOCAL_OVERRIDE_SET',
          actorId: input.actorId,
          correlationId: input.correlationId,
          reasonCode: 'OWNER_OR_ADMIN_LOCAL_AUTHORITY',
          targetId: overrideId,
        });
        await completeAdminCommand(client, 'pricing.override.set', input.idempotencyKey, {
          overrideId,
        });
        return overrideId;
      });
    },

    async removeLocalOverride(input) {
      await transaction(pool, async (client) => {
        await authorizePricingAdmin(client, input.actorId);
        if (
          !(await claimAdminCommand(client, 'pricing.override.remove', input.idempotencyKey, input))
        )
          return;
        const removed = await client.query<{ id: string }>(
          `
          UPDATE local_price_override override SET status = 'REMOVED', removed_at = NOW(),
                 effective_to = GREATEST(effective_from, NOW()),
                 reason = LEFT(reason || ' | removed: ' || $2, 512)
          FROM business_catalog_entry business
          WHERE override.business_catalog_entry_id = business.id
            AND business.material_variant_id = $1::uuid
            AND override.status IN ('ACTIVE','SCHEDULED') AND override.removed_at IS NULL
          RETURNING override.id::text
        `,
          [input.materialVariantId, input.reason],
        );
        const overrideId = removed.rows[0]?.id;
        if (overrideId === undefined) throw new PricingStoreError('PRICING_NOT_FOUND');
        await audit(client, {
          action: 'PRICING_LOCAL_OVERRIDE_REMOVED',
          actorId: input.actorId,
          correlationId: input.correlationId,
          reasonCode: 'OWNER_OR_ADMIN_LOCAL_AUTHORITY',
          targetId: overrideId,
        });
        await completeAdminCommand(client, 'pricing.override.remove', input.idempotencyKey, {
          overrideId,
        });
      });
    },
  };
}
