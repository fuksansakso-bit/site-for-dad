import {
  CatalogManagementError,
  assertBusinessOverlayInput,
  assertCatalogVersionCommand,
  assertLocalPriceOverrideInput,
  assertRemoveLocalPriceOverrideInput,
  hashCanonicalSource,
  type CatalogCompositionResult,
  type CatalogManagementPort,
  type CatalogPublicationResult,
  type ComposeCatalogVersionInput,
  type PublishCatalogPilotInput,
  type RemoveCatalogLocalPriceOverrideInput,
  type SetCatalogBusinessOverlayInput,
} from '@project-name/catalog';
import type { DatabaseEnvironment } from '@project-name/config/server';
import { Pool, type PoolClient } from 'pg';

interface ActorAccessRow {
  readonly actor_id: string;
  readonly is_owner: boolean;
}

interface CandidateVersionRow {
  readonly difference_checksum: string;
  readonly source_manifest: unknown;
  readonly status: string;
  readonly sync_run_id: string;
}

interface TargetCountsRow {
  readonly category_count: string;
  readonly system_count: string;
  readonly variant_count: string;
}

interface VariantReadinessRow {
  readonly invalid_rights_count: string;
  readonly missing_media_count: string;
  readonly missing_price_count: string;
  readonly variant_count: string;
}

interface CompositionRow {
  readonly availability_data: unknown;
  readonly availability_record_id: string | null;
  readonly business_catalog_entry_id: string;
  readonly entity_data: unknown;
  readonly entity_id: string;
  readonly entity_type: 'CATEGORY' | 'MATERIAL_VARIANT' | 'SYSTEM';
  readonly local_description: string | null;
  readonly local_order: number;
  readonly local_price_override_data: unknown;
  readonly local_price_override_id: string | null;
  readonly manual_review_state: string;
  readonly media_data: unknown;
  readonly owner_notes: string | null;
  readonly primary_media_asset_id: string | null;
  readonly publication_data: unknown;
  readonly publication_record_id: string | null;
  readonly source_entity_hash: string;
  readonly source_entity_id: string;
  readonly source_price_data: unknown;
  readonly source_price_record_id: string | null;
  readonly visibility: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function mapDatabaseError(error: unknown): CatalogManagementError {
  if (error instanceof CatalogManagementError) return error;
  if (error instanceof Error && 'code' in error) {
    if (error.code === '23505' || error.code === '40001' || error.code === '40P01') {
      return new CatalogManagementError('CATALOG_MANAGEMENT_CONFLICT', { cause: error });
    }
  }
  return new CatalogManagementError('CATALOG_MANAGEMENT_DATABASE', { cause: error });
}

async function appendAudit(
  client: PoolClient,
  input: {
    readonly action: string;
    readonly actorId: string;
    readonly correlationId: string;
    readonly reasonCode: string;
    readonly targetId: string;
    readonly targetType: string;
  },
): Promise<void> {
  await client.query(
    `
      INSERT INTO audit_event (
        actor_type, actor_identity_id, action, outcome, correlation_id,
        target_type, target_id, reason_code
      ) VALUES ('IDENTITY', $1::uuid, $2, 'SUCCEEDED', $3, $4, $5, $6)
    `,
    [
      input.actorId,
      input.action,
      input.correlationId,
      input.targetType,
      input.targetId,
      input.reasonCode,
    ],
  );
}

async function authorizeOwner(
  pool: Pool,
  input: {
    readonly actorId: string;
    readonly correlationId: string;
    readonly targetId: string;
    readonly targetType: string;
  },
): Promise<void> {
  const result = await pool.query<ActorAccessRow>(
    `
      SELECT actor.id::text AS actor_id,
             bool_or(grant_row.role = 'OWNER') AS is_owner
      FROM actor_identity actor
      JOIN role_grant grant_row ON grant_row.actor_id = actor.id
      WHERE actor.id = $1::uuid
        AND actor.disabled_at IS NULL
        AND grant_row.revoked_at IS NULL
      GROUP BY actor.id
    `,
    [input.actorId],
  );
  const actor = result.rows[0];
  await pool.query(
    `
      INSERT INTO audit_event (
        actor_type, actor_identity_id, action, outcome, correlation_id,
        target_type, target_id, reason_code
      ) VALUES (
        CASE WHEN $1::uuid IS NULL THEN 'SYSTEM_WORKER'::audit_actor_type
             ELSE 'IDENTITY'::audit_actor_type END,
        $1::uuid, 'CATALOG_BUSINESS_COMMAND_REQUESTED',
        $2::audit_outcome, $3, $4, $5, $6
      )
    `,
    [
      actor?.actor_id ?? null,
      actor?.is_owner === true ? 'SUCCEEDED' : 'DENIED',
      input.correlationId,
      input.targetType,
      input.targetId,
      actor?.is_owner === true ? 'OWNER_COMMAND_ACCEPTED' : 'CATALOG_OWNER_ROLE_REQUIRED',
    ],
  );
  if (actor?.is_owner !== true) {
    throw new CatalogManagementError('CATALOG_MANAGEMENT_AUTHORIZATION');
  }
}

async function inTransaction<T>(
  pool: Pool,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect().catch((error: unknown) => {
    throw new CatalogManagementError('CATALOG_MANAGEMENT_DATABASE', { cause: error });
  });
  try {
    await client.query('BEGIN');
    const result = await operation(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw mapDatabaseError(error);
  } finally {
    client.release();
  }
}

function targetMapping(entityType: SetCatalogBusinessOverlayInput['entityType']): {
  readonly column: string;
  readonly table: string;
} {
  switch (entityType) {
    case 'CATEGORY':
      return { column: 'category_id', table: 'product_category' };
    case 'SYSTEM':
      return { column: 'system_id', table: 'product_system' };
    case 'MATERIAL_VARIANT':
      return { column: 'material_variant_id', table: 'material_variant' };
  }
}

async function loadCandidate(
  client: PoolClient,
  input: ComposeCatalogVersionInput | PublishCatalogPilotInput,
): Promise<CandidateVersionRow> {
  const result = await client.query<CandidateVersionRow>(
    `
      SELECT version.status::text, version.difference_checksum,
             version.source_manifest, version.sync_run_id::text
      FROM catalog_version version
      JOIN catalog_sync_run run ON run.id = version.sync_run_id
      WHERE version.id = $1::uuid
        AND run.catalog_source_id = $2::uuid
      FOR UPDATE
    `,
    [input.catalogVersionId, input.catalogSourceId],
  );
  const candidate = result.rows[0];
  if (candidate === undefined) {
    throw new CatalogManagementError('CATALOG_MANAGEMENT_NOT_FOUND');
  }
  const manifest = asRecord(candidate.source_manifest);
  const sourceDifferenceChecksum = manifest?.['sourceDifferenceChecksum'];
  const acceptedChecksum =
    typeof sourceDifferenceChecksum === 'string'
      ? sourceDifferenceChecksum
      : candidate.difference_checksum;
  if (
    candidate.sync_run_id !== input.syncRunId ||
    candidate.status !== 'AWAITING_APPROVAL' ||
    acceptedChecksum !== input.expectedCatalogDifferenceChecksum
  ) {
    throw new CatalogManagementError('CATALOG_MANAGEMENT_CONFLICT');
  }
  return candidate;
}

const targetCountsSql = `
  SELECT
    count(*) FILTER (WHERE item.source_type = 'CATEGORY')::text AS category_count,
    count(*) FILTER (WHERE item.source_type = 'SYSTEM')::text AS system_count,
    count(*) FILTER (WHERE item.source_type = 'MATERIAL_VARIANT')::text AS variant_count
  FROM catalog_sync_item item
  JOIN source_entity source ON source.id = item.source_entity_id
  WHERE item.sync_run_id = $1::uuid
    AND source.catalog_source_id = $2::uuid
    AND item.source_type IN ('CATEGORY', 'SYSTEM', 'MATERIAL_VARIANT')
`;

async function initializeBusinessEntries(
  client: PoolClient,
  syncRunId: string,
  catalogSourceId: string,
): Promise<void> {
  await client.query(
    `
      INSERT INTO business_catalog_entry (entity_type, category_id, updated_at)
      SELECT 'CATEGORY', category.id, NOW()
      FROM catalog_sync_item item
      JOIN source_entity source ON source.id = item.source_entity_id
      JOIN product_category category ON category.source_entity_id = source.id
      WHERE item.sync_run_id = $1::uuid
        AND source.catalog_source_id = $2::uuid
        AND item.source_type = 'CATEGORY'
      ON CONFLICT (category_id) DO NOTHING
    `,
    [syncRunId, catalogSourceId],
  );
  await client.query(
    `
      INSERT INTO business_catalog_entry (entity_type, system_id, updated_at)
      SELECT 'SYSTEM', system_row.id, NOW()
      FROM catalog_sync_item item
      JOIN source_entity source ON source.id = item.source_entity_id
      JOIN product_system system_row ON system_row.source_entity_id = source.id
      WHERE item.sync_run_id = $1::uuid
        AND source.catalog_source_id = $2::uuid
        AND item.source_type = 'SYSTEM'
      ON CONFLICT (system_id) DO NOTHING
    `,
    [syncRunId, catalogSourceId],
  );
  await client.query(
    `
      INSERT INTO business_catalog_entry (entity_type, material_variant_id, updated_at)
      SELECT 'MATERIAL_VARIANT', variant.id, NOW()
      FROM catalog_sync_item item
      JOIN source_entity source ON source.id = item.source_entity_id
      JOIN material_variant variant ON variant.source_entity_id = source.id
      WHERE item.sync_run_id = $1::uuid
        AND source.catalog_source_id = $2::uuid
        AND item.source_type = 'MATERIAL_VARIANT'
      ON CONFLICT (material_variant_id) DO NOTHING
    `,
    [syncRunId, catalogSourceId],
  );
}

async function targetBusinessEntryIds(
  client: PoolClient,
  syncRunId: string,
  catalogSourceId: string,
): Promise<readonly string[]> {
  const result = await client.query<{ id: string }>(
    `
      SELECT business.id::text
      FROM business_catalog_entry business
      JOIN product_category category ON category.id = business.category_id
      JOIN catalog_sync_item item ON item.source_entity_id = category.source_entity_id
      JOIN source_entity source ON source.id = item.source_entity_id
      WHERE item.sync_run_id = $1::uuid AND source.catalog_source_id = $2::uuid
      UNION ALL
      SELECT business.id::text
      FROM business_catalog_entry business
      JOIN product_system system_row ON system_row.id = business.system_id
      JOIN catalog_sync_item item ON item.source_entity_id = system_row.source_entity_id
      JOIN source_entity source ON source.id = item.source_entity_id
      WHERE item.sync_run_id = $1::uuid AND source.catalog_source_id = $2::uuid
      UNION ALL
      SELECT business.id::text
      FROM business_catalog_entry business
      JOIN material_variant variant ON variant.id = business.material_variant_id
      JOIN catalog_sync_item item ON item.source_entity_id = variant.source_entity_id
      JOIN source_entity source ON source.id = item.source_entity_id
      WHERE item.sync_run_id = $1::uuid AND source.catalog_source_id = $2::uuid
      ORDER BY 1
    `,
    [syncRunId, catalogSourceId],
  );
  return result.rows.map((row) => row.id);
}

const compositionSql = `
  WITH targets AS (
    SELECT
      'CATEGORY'::catalog_entity_type AS entity_type,
      category.id AS entity_id,
      source.id AS source_entity_id,
      source.source_hash AS source_entity_hash,
      jsonb_build_object(
        'id', category.id::text,
        'familyId', category.family_id::text,
        'name', category.name,
        'slug', category.slug
      ) AS entity_data
    FROM catalog_sync_item item
    JOIN source_entity source ON source.id = item.source_entity_id
    JOIN product_category category ON category.source_entity_id = source.id
    WHERE item.sync_run_id = $1::uuid AND source.catalog_source_id = $2::uuid
      AND item.source_type = 'CATEGORY'
    UNION ALL
    SELECT
      'SYSTEM'::catalog_entity_type,
      system_row.id,
      source.id,
      source.source_hash,
      jsonb_build_object(
        'id', system_row.id::text,
        'categoryId', system_row.category_id::text,
        'familyId', system_row.family_id::text,
        'name', system_row.name,
        'slug', system_row.slug
      )
    FROM catalog_sync_item item
    JOIN source_entity source ON source.id = item.source_entity_id
    JOIN product_system system_row ON system_row.source_entity_id = source.id
    WHERE item.sync_run_id = $1::uuid AND source.catalog_source_id = $2::uuid
      AND item.source_type = 'SYSTEM'
    UNION ALL
    SELECT
      'MATERIAL_VARIANT'::catalog_entity_type,
      variant.id,
      source.id,
      source.source_hash,
      jsonb_build_object(
        'id', variant.id::text,
        'article', variant.article,
        'color', CASE WHEN color.id IS NULL THEN NULL ELSE jsonb_build_object(
          'hex', color.normalized_hex, 'id', color.id::text, 'name', color.name, 'slug', color.slug
        ) END,
        'isBlackout', variant.is_blackout,
        'isZebra', variant.is_zebra,
        'material', jsonb_build_object(
          'categoryId', material.category_id::text,
          'id', material.id::text,
          'name', material.name,
          'slug', material.slug
        ),
        'name', variant.name,
        'primarySystemId', variant.primary_system_id::text,
        'slug', variant.slug,
        'widthMm', variant.width_mm::text
      )
    FROM catalog_sync_item item
    JOIN source_entity source ON source.id = item.source_entity_id
    JOIN material_variant variant ON variant.source_entity_id = source.id
    JOIN material ON material.id = variant.material_id
    LEFT JOIN color ON color.id = variant.color_id
    WHERE item.sync_run_id = $1::uuid AND source.catalog_source_id = $2::uuid
      AND item.source_type = 'MATERIAL_VARIANT'
  )
  SELECT
    business.id::text AS business_catalog_entry_id,
    target.entity_type::text,
    target.entity_id::text,
    target.source_entity_id::text,
    target.source_entity_hash,
    target.entity_data,
    business.visibility::text,
    business.local_description,
    business.local_order,
    business.manual_review_state::text,
    business.owner_notes,
    availability.id::text AS availability_record_id,
    CASE WHEN availability.id IS NULL THEN NULL ELSE jsonb_build_object(
      'effectiveAt', availability.effective_at,
      'id', availability.id::text,
      'reason', availability.reason,
      'status', availability.status::text
    ) END AS availability_data,
    publication.id::text AS publication_record_id,
    CASE WHEN publication.id IS NULL THEN NULL ELSE jsonb_build_object(
      'effectiveAt', publication.effective_at,
      'id', publication.id::text,
      'reason', publication.reason,
      'status', publication.status::text
    ) END AS publication_data,
    override_row.id::text AS local_price_override_id,
    CASE WHEN override_row.id IS NULL THEN NULL ELSE jsonb_build_object(
      'amountMinor', override_row.amount_minor,
      'currency', override_row.currency,
      'effectiveFrom', override_row.effective_from,
      'effectiveTo', override_row.effective_to,
      'id', override_row.id::text,
      'reason', override_row.reason,
      'status', override_row.status::text
    ) END AS local_price_override_data,
    price.id::text AS source_price_record_id,
    CASE WHEN price.id IS NULL THEN NULL ELSE jsonb_build_object(
      'amountMinor', price.amount_minor,
      'capturedAt', price.source_captured_at,
      'currency', price.currency,
      'id', price.id::text,
      'kind', price.kind::text,
      'sourceHash', price.source_hash,
      'sourcePriceCategory', price.source_price_category,
      'sourceVersion', price.source_version,
      'status', price.status::text
    ) END AS source_price_data,
    media.id::text AS primary_media_asset_id,
    CASE WHEN media.id IS NULL THEN NULL ELSE jsonb_build_object(
      'byteSize', media.byte_size,
      'fileHash', media.file_hash,
      'height', media.height,
      'id', media.id::text,
      'mimeType', media.mime_type,
      'objectKey', media.object_key,
      'publicationStatus', media.publication_status::text,
      'rightsStatus', media.rights_status::text,
      'storageZone', media.storage_zone,
      'width', media.width
    ) END AS media_data
  FROM targets target
  JOIN business_catalog_entry business ON (
    (target.entity_type = 'CATEGORY' AND business.category_id = target.entity_id)
    OR (target.entity_type = 'SYSTEM' AND business.system_id = target.entity_id)
    OR (target.entity_type = 'MATERIAL_VARIANT' AND business.material_variant_id = target.entity_id)
  )
  LEFT JOIN LATERAL (
    SELECT record.* FROM availability_record record
    WHERE record.business_catalog_entry_id = business.id AND record.ended_at IS NULL
    ORDER BY record.effective_at DESC, record.created_at DESC LIMIT 1
  ) availability ON true
  LEFT JOIN LATERAL (
    SELECT record.* FROM publication_record record
    WHERE record.business_catalog_entry_id = business.id AND record.ended_at IS NULL
    ORDER BY record.effective_at DESC, record.created_at DESC LIMIT 1
  ) publication ON true
  LEFT JOIN LATERAL (
    SELECT record.* FROM local_price_override record
    WHERE record.business_catalog_entry_id = business.id
      AND record.status IN ('ACTIVE', 'SCHEDULED')
      AND record.removed_at IS NULL
      AND record.effective_from <= NOW()
      AND (record.effective_to IS NULL OR record.effective_to >= NOW())
    ORDER BY record.effective_from DESC, record.created_at DESC LIMIT 1
  ) override_row ON true
  LEFT JOIN LATERAL (
    SELECT source_price.* FROM source_price_record source_price
    JOIN catalog_sync_item price_item ON price_item.source_entity_id = source_price.source_entity_id
                                      AND price_item.after_hash = source_price.source_hash
    JOIN catalog_sync_run price_run ON price_run.id = price_item.sync_run_id
                                    AND price_run.source_version = source_price.source_version
    WHERE target.entity_type = 'MATERIAL_VARIANT'
      AND source_price.material_variant_id = target.entity_id
      AND price_item.sync_run_id = $1::uuid
    ORDER BY source_price.source_captured_at DESC, source_price.created_at DESC LIMIT 1
  ) price ON true
  LEFT JOIN LATERAL (
    SELECT asset.* FROM material_media_asset placement
    JOIN media_asset asset ON asset.id = placement.media_asset_id
    WHERE target.entity_type = 'MATERIAL_VARIANT'
      AND placement.material_variant_id = target.entity_id
    ORDER BY CASE WHEN placement.role = 'PRIMARY' THEN 0 ELSE 1 END,
             placement.sort_order, asset.id
    LIMIT 1
  ) media ON true
  ORDER BY target.entity_type::text, business.local_order,
           target.entity_data->>'name', target.entity_id
`;

function publicCompositionEntry(row: CompositionRow): {
  readonly overlayHash: string;
  readonly snapshot: Record<string, unknown>;
} {
  const overlay = {
    availability: row.availability_data,
    localDescription: row.local_description,
    localOrder: row.local_order,
    localPriceOverride: row.local_price_override_data,
    manualReviewState: row.manual_review_state,
    publication: row.publication_data,
    visibility: row.visibility,
  } as Record<string, unknown>;
  if (row.local_price_override_id !== null) {
    overlay['localPriceOverrideId'] = row.local_price_override_id;
  }
  const snapshot = {
    businessCatalogEntryId: row.business_catalog_entry_id,
    entity: row.entity_data,
    entityId: row.entity_id,
    entityType: row.entity_type,
    overlay,
    primaryMedia: row.media_data,
    source: {
      sourceEntityId: row.source_entity_id,
      sourceHash: row.source_entity_hash,
    },
    sourcePrice: row.source_price_data,
  } satisfies Record<string, unknown>;
  return { overlayHash: hashCanonicalSource(overlay), snapshot };
}

function validateCompositionRows(
  rows: readonly CompositionRow[],
  expectedVariantCount: number,
): void {
  const variants = rows.filter((row) => row.entity_type === 'MATERIAL_VARIANT');
  if (variants.length !== expectedVariantCount || rows.length === 0) {
    throw new CatalogManagementError('CATALOG_MANAGEMENT_NOT_READY');
  }
  for (const row of rows) {
    if (row.availability_record_id === null || row.publication_record_id === null) {
      throw new CatalogManagementError('CATALOG_MANAGEMENT_NOT_READY');
    }
    const publication = asRecord(row.publication_data);
    const availability = asRecord(row.availability_data);
    if (publication?.['status'] !== 'PUBLISHED') continue;
    if (
      row.visibility !== 'VISIBLE' ||
      row.manual_review_state !== 'APPROVED' ||
      ['UNREVIEWED', 'HIDDEN'].includes(String(availability?.['status']))
    ) {
      throw new CatalogManagementError('CATALOG_MANAGEMENT_NOT_READY');
    }
    if (row.entity_type === 'MATERIAL_VARIANT') {
      const media = asRecord(row.media_data);
      if (
        row.source_price_record_id === null ||
        row.primary_media_asset_id === null ||
        media?.['rightsStatus'] !== 'PARTNER_LICENSE' ||
        media['publicationStatus'] !== 'PUBLICATION_APPROVED'
      ) {
        throw new CatalogManagementError('CATALOG_MANAGEMENT_NOT_READY');
      }
    }
  }
}

export type CatalogManagementAdapter = CatalogManagementPort;

export function createCatalogManagementAdapter(
  environment: DatabaseEnvironment,
): CatalogManagementAdapter {
  const pool = new Pool({
    connectionString: environment.DATABASE_URL,
    connectionTimeoutMillis: Math.min(environment.DATABASE_STATEMENT_TIMEOUT_MS, 10_000),
    max: 4,
    statement_timeout: environment.DATABASE_STATEMENT_TIMEOUT_MS,
  });

  return {
    close: () => pool.end(),

    async setBusinessOverlay(input) {
      assertBusinessOverlayInput(input);
      await authorizeOwner(pool, {
        actorId: input.actorId,
        correlationId: input.correlationId,
        targetId: input.entityId,
        targetType: input.entityType,
      });
      return inTransaction(pool, async (client) => {
        const target = targetMapping(input.entityType);
        const exists = await client.query(
          `SELECT id FROM ${target.table} WHERE id = $1::uuid FOR UPDATE`,
          [input.entityId],
        );
        if (exists.rowCount !== 1) {
          throw new CatalogManagementError('CATALOG_MANAGEMENT_NOT_FOUND');
        }
        const business = await client.query<{ id: string }>(
          `
            INSERT INTO business_catalog_entry (
              entity_type, ${target.column}, visibility, local_description,
              local_order, manual_review_state, owner_notes, updated_at
            ) VALUES (
              $1::catalog_entity_type, $2::uuid, $3::catalog_visibility, $4,
              $5, $6::manual_review_status, $7, NOW()
            )
            ON CONFLICT (${target.column}) DO UPDATE
            SET visibility = EXCLUDED.visibility,
                local_description = EXCLUDED.local_description,
                local_order = EXCLUDED.local_order,
                manual_review_state = EXCLUDED.manual_review_state,
                owner_notes = EXCLUDED.owner_notes,
                updated_at = NOW()
            RETURNING id::text
          `,
          [
            input.entityType,
            input.entityId,
            input.visibility,
            input.localDescription ?? null,
            input.localOrder,
            input.manualReviewState,
            input.ownerNotes ?? null,
          ],
        );
        const businessId = business.rows[0]?.id;
        if (businessId === undefined) {
          throw new CatalogManagementError('CATALOG_MANAGEMENT_DATABASE');
        }
        await client.query(
          `UPDATE availability_record SET ended_at = NOW()
           WHERE business_catalog_entry_id = $1::uuid AND ended_at IS NULL`,
          [businessId],
        );
        await client.query(
          `UPDATE publication_record SET ended_at = NOW()
           WHERE business_catalog_entry_id = $1::uuid AND ended_at IS NULL`,
          [businessId],
        );
        await client.query(
          `
            INSERT INTO availability_record (
              business_catalog_entry_id, status, reason, decided_by_actor_id
            ) VALUES ($1::uuid, $2::availability_status, $3, $4::uuid)
          `,
          [businessId, input.availabilityStatus, input.availabilityReason, input.actorId],
        );
        await client.query(
          `
            INSERT INTO publication_record (
              business_catalog_entry_id, status, reason, decided_by_actor_id
            ) VALUES ($1::uuid, $2::publication_status, $3, $4::uuid)
          `,
          [businessId, input.publicationStatus, input.publicationReason, input.actorId],
        );
        await appendAudit(client, {
          action: 'CATALOG_BUSINESS_OVERLAY_SET',
          actorId: input.actorId,
          correlationId: input.correlationId,
          reasonCode: 'OWNER_LOCAL_AUTHORITY',
          targetId: businessId,
          targetType: 'BUSINESS_CATALOG_ENTRY',
        });
        return businessId;
      });
    },

    async setLocalPriceOverride(input) {
      assertLocalPriceOverrideInput(input);
      await authorizeOwner(pool, {
        actorId: input.actorId,
        correlationId: input.correlationId,
        targetId: input.businessCatalogEntryId,
        targetType: 'BUSINESS_CATALOG_ENTRY',
      });
      return inTransaction(pool, async (client) => {
        const target = await client.query<{ entity_type: string }>(
          `SELECT entity_type::text FROM business_catalog_entry
           WHERE id = $1::uuid FOR UPDATE`,
          [input.businessCatalogEntryId],
        );
        if (target.rows[0]?.entity_type !== 'MATERIAL_VARIANT') {
          throw new CatalogManagementError('CATALOG_MANAGEMENT_NOT_FOUND');
        }
        await client.query(
          `
            UPDATE local_price_override
            SET status = 'REMOVED', removed_at = NOW(),
                effective_to = GREATEST(effective_from, NOW())
            WHERE business_catalog_entry_id = $1::uuid
              AND status IN ('ACTIVE', 'SCHEDULED') AND removed_at IS NULL
          `,
          [input.businessCatalogEntryId],
        );
        const inserted = await client.query<{ id: string }>(
          `
            INSERT INTO local_price_override (
              business_catalog_entry_id, amount_minor, currency, status, reason,
              decided_by_actor_id, effective_from, effective_to
            ) VALUES (
              $1::uuid, $2, $3,
              CASE WHEN $6::timestamptz > NOW()
                   THEN 'SCHEDULED'::local_price_override_status
                   ELSE 'ACTIVE'::local_price_override_status END,
              $4, $5::uuid, $6::timestamptz, $7::timestamptz
            ) RETURNING id::text
          `,
          [
            input.businessCatalogEntryId,
            input.amountMinor,
            input.currency,
            input.reason,
            input.actorId,
            input.effectiveFrom,
            input.effectiveTo ?? null,
          ],
        );
        const overrideId = inserted.rows[0]?.id;
        if (overrideId === undefined) {
          throw new CatalogManagementError('CATALOG_MANAGEMENT_DATABASE');
        }
        await appendAudit(client, {
          action: 'CATALOG_LOCAL_PRICE_OVERRIDE_SET',
          actorId: input.actorId,
          correlationId: input.correlationId,
          reasonCode: 'OWNER_LOCAL_AUTHORITY',
          targetId: overrideId,
          targetType: 'LOCAL_PRICE_OVERRIDE',
        });
        return overrideId;
      });
    },

    async removeLocalPriceOverride(input: RemoveCatalogLocalPriceOverrideInput) {
      assertRemoveLocalPriceOverrideInput(input);
      await authorizeOwner(pool, {
        actorId: input.actorId,
        correlationId: input.correlationId,
        targetId: input.businessCatalogEntryId,
        targetType: 'BUSINESS_CATALOG_ENTRY',
      });
      await inTransaction(pool, async (client) => {
        const removed = await client.query<{ id: string }>(
          `
            UPDATE local_price_override
            SET status = 'REMOVED', removed_at = NOW(),
                effective_to = GREATEST(effective_from, NOW()),
                reason = LEFT(reason || ' | removed: ' || $2, 512)
            WHERE business_catalog_entry_id = $1::uuid
              AND status IN ('ACTIVE', 'SCHEDULED') AND removed_at IS NULL
            RETURNING id::text
          `,
          [input.businessCatalogEntryId, input.reason],
        );
        if (removed.rows.length === 0) {
          throw new CatalogManagementError('CATALOG_MANAGEMENT_NOT_FOUND');
        }
        await appendAudit(client, {
          action: 'CATALOG_LOCAL_PRICE_OVERRIDE_REMOVED',
          actorId: input.actorId,
          correlationId: input.correlationId,
          reasonCode: 'OWNER_LOCAL_AUTHORITY',
          targetId: removed.rows[0]?.id ?? input.businessCatalogEntryId,
          targetType: 'LOCAL_PRICE_OVERRIDE',
        });
      });
    },

    async publishPilot(input): Promise<CatalogPublicationResult> {
      assertCatalogVersionCommand(input);
      await authorizeOwner(pool, {
        actorId: input.actorId,
        correlationId: input.correlationId,
        targetId: input.catalogVersionId,
        targetType: 'CATALOG_VERSION',
      });
      return inTransaction(pool, async (client) => {
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtext('catalog-business-publication'))",
        );
        const candidate = await loadCandidate(client, input);
        const candidateManifest = asRecord(candidate.source_manifest);
        const existingPreparation = asRecord(candidateManifest?.['businessPublicationPrepared']);
        if (
          existingPreparation?.['sourceDifferenceChecksum'] ===
            input.expectedCatalogDifferenceChecksum &&
          existingPreparation['expectedVariantCount'] === input.expectedVariantCount
        ) {
          return {
            categoryCount: Number(existingPreparation['categoryCount']),
            mediaApprovedCount: Number(existingPreparation['mediaApprovedCount']),
            systemCount: Number(existingPreparation['systemCount']),
            variantCount: Number(existingPreparation['variantCount']),
          };
        }
        const countsResult = await client.query<TargetCountsRow>(targetCountsSql, [
          input.syncRunId,
          input.catalogSourceId,
        ]);
        const counts = countsResult.rows[0];
        if (Number(counts?.variant_count ?? '0') !== input.expectedVariantCount) {
          throw new CatalogManagementError('CATALOG_MANAGEMENT_NOT_READY');
        }
        const readinessResult = await client.query<VariantReadinessRow>(
          `
            SELECT
              count(*)::text AS variant_count,
              count(*) FILTER (WHERE NOT EXISTS (
                SELECT 1 FROM material_media_asset placement
                JOIN media_asset asset ON asset.id = placement.media_asset_id
                WHERE placement.material_variant_id = variant.id
              ))::text AS missing_media_count,
              count(*) FILTER (WHERE NOT EXISTS (
                SELECT 1 FROM source_price_record price
                JOIN catalog_sync_item price_item
                  ON price_item.source_entity_id = price.source_entity_id
                 AND price_item.after_hash = price.source_hash
                JOIN catalog_sync_run price_run
                  ON price_run.id = price_item.sync_run_id
                 AND price_run.source_version = price.source_version
                WHERE price.material_variant_id = variant.id
                  AND price_item.sync_run_id = $1::uuid
              ))::text AS missing_price_count,
              count(*) FILTER (WHERE EXISTS (
                SELECT 1 FROM material_media_asset placement
                JOIN media_asset asset ON asset.id = placement.media_asset_id
                WHERE placement.material_variant_id = variant.id
                  AND asset.rights_status <> 'PARTNER_LICENSE'
              ))::text AS invalid_rights_count
            FROM material_variant variant
            JOIN catalog_sync_item item ON item.source_entity_id = variant.source_entity_id
            JOIN source_entity source ON source.id = item.source_entity_id
            WHERE item.sync_run_id = $1::uuid
              AND source.catalog_source_id = $2::uuid
              AND item.source_type = 'MATERIAL_VARIANT'
          `,
          [input.syncRunId, input.catalogSourceId],
        );
        const readiness = readinessResult.rows[0];
        if (
          Number(readiness?.variant_count ?? '0') !== input.expectedVariantCount ||
          Number(readiness?.missing_media_count ?? '0') !== 0 ||
          Number(readiness?.missing_price_count ?? '0') !== 0 ||
          Number(readiness?.invalid_rights_count ?? '0') !== 0
        ) {
          throw new CatalogManagementError('CATALOG_MANAGEMENT_NOT_READY');
        }

        await initializeBusinessEntries(client, input.syncRunId, input.catalogSourceId);
        const businessIds = await targetBusinessEntryIds(
          client,
          input.syncRunId,
          input.catalogSourceId,
        );
        if (
          businessIds.length !==
          Number(counts?.category_count ?? '0') +
            Number(counts?.system_count ?? '0') +
            input.expectedVariantCount
        ) {
          throw new CatalogManagementError('CATALOG_MANAGEMENT_NOT_READY');
        }
        await client.query(
          `UPDATE business_catalog_entry
           SET visibility = 'VISIBLE', manual_review_state = 'APPROVED', updated_at = NOW()
           WHERE id = ANY($1::uuid[])`,
          [businessIds],
        );
        await client.query(
          `UPDATE availability_record SET ended_at = NOW()
           WHERE business_catalog_entry_id = ANY($1::uuid[]) AND ended_at IS NULL`,
          [businessIds],
        );
        await client.query(
          `UPDATE publication_record SET ended_at = NOW()
           WHERE business_catalog_entry_id = ANY($1::uuid[]) AND ended_at IS NULL`,
          [businessIds],
        );
        await client.query(
          `
            INSERT INTO availability_record (
              business_catalog_entry_id, status, reason, decided_by_actor_id
            ) SELECT id, 'INQUIRY_ONLY',
                     'Availability requires current manager confirmation.', $2::uuid
              FROM unnest($1::uuid[]) AS id
          `,
          [businessIds, input.actorId],
        );
        await client.query(
          `
            INSERT INTO publication_record (
              business_catalog_entry_id, status, reason, decided_by_actor_id
            ) SELECT id, 'PUBLISHED',
                     'Owner-approved controlled Phase 1B.1 pilot publication.', $2::uuid
              FROM unnest($1::uuid[]) AS id
          `,
          [businessIds, input.actorId],
        );
        const mediaApproval = await client.query<{ id: string }>(
          `
            UPDATE media_asset asset
            SET publication_status = 'PUBLICATION_APPROVED', updated_at = NOW()
            WHERE asset.id IN (
              SELECT placement.media_asset_id
              FROM material_media_asset placement
              JOIN material_variant variant ON variant.id = placement.material_variant_id
              JOIN catalog_sync_item item ON item.source_entity_id = variant.source_entity_id
              JOIN source_entity source ON source.id = item.source_entity_id
              WHERE item.sync_run_id = $1::uuid
                AND source.catalog_source_id = $2::uuid
                AND asset.rights_status = 'PARTNER_LICENSE'
            )
            RETURNING asset.id::text
          `,
          [input.syncRunId, input.catalogSourceId],
        );
        await appendAudit(client, {
          action: 'CATALOG_PILOT_BULK_PUBLICATION_SET',
          actorId: input.actorId,
          correlationId: input.correlationId,
          reasonCode: 'OWNER_APPROVED_PHASE_1B1_PILOT',
          targetId: input.catalogVersionId,
          targetType: 'CATALOG_VERSION',
        });
        const publicationResult = {
          categoryCount: Number(counts?.category_count ?? '0'),
          mediaApprovedCount: mediaApproval.rows.length,
          systemCount: Number(counts?.system_count ?? '0'),
          variantCount: Number(counts?.variant_count ?? '0'),
        };
        await client.query(
          `
            UPDATE catalog_version
            SET source_manifest = source_manifest || jsonb_build_object(
              'businessPublicationPrepared', jsonb_build_object(
                'actorId', $2::text,
                'categoryCount', $3::int,
                'expectedVariantCount', $4::int,
                'mediaApprovedCount', $5::int,
                'recordedAt', NOW(),
                'sourceDifferenceChecksum', $6::text,
                'systemCount', $7::int,
                'variantCount', $8::int
              )
            )
            WHERE id = $1::uuid AND status = 'AWAITING_APPROVAL'
          `,
          [
            input.catalogVersionId,
            input.actorId,
            publicationResult.categoryCount,
            input.expectedVariantCount,
            publicationResult.mediaApprovedCount,
            input.expectedCatalogDifferenceChecksum,
            publicationResult.systemCount,
            publicationResult.variantCount,
          ],
        );
        return publicationResult;
      });
    },

    async composeCatalogVersion(input): Promise<CatalogCompositionResult> {
      assertCatalogVersionCommand(input);
      await authorizeOwner(pool, {
        actorId: input.actorId,
        correlationId: input.correlationId,
        targetId: input.catalogVersionId,
        targetType: 'CATALOG_VERSION',
      });
      return inTransaction(pool, async (client) => {
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtext('catalog-business-publication'))",
        );
        const candidate = await loadCandidate(client, input);
        const manifest = asRecord(candidate.source_manifest);
        const existingComposition = manifest?.['composition'];
        if (Array.isArray(existingComposition)) {
          const compositionChecksum = manifest?.['compositionChecksum'];
          if (typeof compositionChecksum !== 'string') {
            throw new CatalogManagementError('CATALOG_MANAGEMENT_CONFLICT');
          }
          return {
            catalogVersionId: input.catalogVersionId,
            compositionChecksum,
            differenceChecksum: candidate.difference_checksum,
            entryCount: existingComposition.length,
            reused: true,
            variantCount: existingComposition.filter(
              (entry) => asRecord(entry)?.['entityType'] === 'MATERIAL_VARIANT',
            ).length,
          };
        }
        const existingEntries = await client.query<{ count: string }>(
          'SELECT count(*)::text AS count FROM catalog_version_entry WHERE catalog_version_id = $1::uuid',
          [input.catalogVersionId],
        );
        if (Number(existingEntries.rows[0]?.count ?? '0') !== 0) {
          throw new CatalogManagementError('CATALOG_MANAGEMENT_CONFLICT');
        }
        const rows = await client.query<CompositionRow>(compositionSql, [
          input.syncRunId,
          input.catalogSourceId,
        ]);
        validateCompositionRows(rows.rows, input.expectedVariantCount);
        const composition = rows.rows.map((row) => publicCompositionEntry(row));
        for (let index = 0; index < rows.rows.length; index += 1) {
          const row = rows.rows[index];
          const entry = composition[index];
          if (row === undefined || entry === undefined) {
            throw new CatalogManagementError('CATALOG_MANAGEMENT_DATABASE');
          }
          await client.query(
            `
              INSERT INTO catalog_version_entry (
                catalog_version_id, business_catalog_entry_id,
                publication_record_id, availability_record_id,
                local_price_override_id, source_price_record_id,
                primary_media_asset_id, source_entity_hash, overlay_hash
              ) VALUES (
                $1::uuid, $2::uuid, $3::uuid, $4::uuid,
                $5::uuid, $6::uuid, $7::uuid, $8, $9
              )
            `,
            [
              input.catalogVersionId,
              row.business_catalog_entry_id,
              row.publication_record_id,
              row.availability_record_id,
              row.local_price_override_id,
              row.source_price_record_id,
              row.primary_media_asset_id,
              row.source_entity_hash,
              entry.overlayHash,
            ],
          );
        }
        const snapshots = composition.map((entry) => entry.snapshot);
        const compositionChecksum = hashCanonicalSource(snapshots);
        const differenceChecksum = hashCanonicalSource({
          compositionChecksum,
          sourceDifferenceChecksum: input.expectedCatalogDifferenceChecksum,
        });
        const updatedManifest = {
          ...(manifest ?? {}),
          composition: snapshots,
          compositionChecksum,
          sourceDifferenceChecksum: input.expectedCatalogDifferenceChecksum,
        };
        await client.query(
          `
            UPDATE catalog_version
            SET source_manifest = $2::jsonb, difference_checksum = $3,
                safe_notes = COALESCE(safe_notes, '') ||
                  E'\nOwner-composed Phase 1B.1 publication manifest.'
            WHERE id = $1::uuid AND status = 'AWAITING_APPROVAL'
          `,
          [input.catalogVersionId, JSON.stringify(updatedManifest), differenceChecksum],
        );
        await appendAudit(client, {
          action: 'CATALOG_VERSION_COMPOSED',
          actorId: input.actorId,
          correlationId: input.correlationId,
          reasonCode: 'OWNER_COMPOSED_IMMUTABLE_MANIFEST',
          targetId: input.catalogVersionId,
          targetType: 'CATALOG_VERSION',
        });
        return {
          catalogVersionId: input.catalogVersionId,
          compositionChecksum,
          differenceChecksum,
          entryCount: rows.rows.length,
          reused: false,
          variantCount: rows.rows.filter((row) => row.entity_type === 'MATERIAL_VARIANT').length,
        };
      });
    },
  };
}
