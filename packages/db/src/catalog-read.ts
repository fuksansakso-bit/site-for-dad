import {
  CatalogReadError,
  amigoPilotCategorySourceIds,
  amigoPilotCatalogSourceId,
  amigoPilotMaterialSourceIds,
  amigoPilotSystemSourceIds,
  assertCatalogAdminVariantQuery,
  catalogReleaseStatuses,
  type CatalogActiveVersionSummary,
  type CatalogAdminOverview,
  type CatalogAdminRelease,
  type CatalogAdminSyncRun,
  type CatalogAdminVariant,
  type CatalogAdminVariantPage,
  type CatalogAdminVariantQuery,
  type CatalogReadPort,
  type CatalogReleaseStatus,
} from '@project-name/catalog';
import type { DatabaseEnvironment } from '@project-name/config/server';
import { Pool } from 'pg';

interface ActiveVersionRow {
  readonly activated_at: Date;
  readonly difference_checksum: string;
  readonly id: string;
  readonly version_number: number;
}

interface ReleaseRow {
  readonly catalog_difference_checksum: string | null;
  readonly catalog_source_id: string;
  readonly catalog_status: string | null;
  readonly catalog_version_id: string | null;
  readonly catalog_version_number: number | null;
  readonly composition_count: string;
  readonly created_at: Date;
  readonly difference_count: string;
  readonly failed_item_count: string;
  readonly pending_difference_count: string;
  readonly price_difference_checksum: string | null;
  readonly price_status: string | null;
  readonly price_version_id: string | null;
  readonly price_version_number: number | null;
  readonly source_version: string | null;
  readonly sync_run_id: string;
  readonly sync_status: string;
  readonly variant_count: string;
}

interface SyncRunRow {
  readonly completed_at: Date | null;
  readonly correlation_id: string;
  readonly created_at: Date;
  readonly discovered_count: number;
  readonly error_code: string | null;
  readonly error_count: number;
  readonly processed_count: number;
  readonly retry_of_sync_run_id: string | null;
  readonly source_version: string | null;
  readonly status: string;
  readonly sync_run_id: string;
  readonly trigger: string;
}

interface SummaryRow {
  readonly approved_media_count: string;
  readonly business_entry_count: string;
  readonly material_variant_count: string;
  readonly published_entry_count: string;
  readonly source_price_count: string;
}

interface VariantRow {
  readonly article: string;
  readonly availability_status: string | null;
  readonly business_catalog_entry_id: string | null;
  readonly category_name: string;
  readonly color_hex: string | null;
  readonly color_name: string | null;
  readonly currency: string | null;
  readonly local_price_amount_minor: number | null;
  readonly manual_review_state: string | null;
  readonly media_approved: boolean;
  readonly media_count: string;
  readonly name: string;
  readonly primary_system_name: string | null;
  readonly publication_status: string | null;
  readonly rights_ready: boolean;
  readonly source_captured_at: Date | null;
  readonly source_id: string;
  readonly source_price_amount_minor: number | null;
  readonly source_status: string;
  readonly source_url: string;
  readonly variant_id: string;
  readonly visibility: string | null;
}

function mapDatabaseError(error: unknown): CatalogReadError {
  return error instanceof CatalogReadError
    ? error
    : new CatalogReadError('CATALOG_READ_DATABASE', { cause: error });
}

function asReleaseStatus(value: string | null): CatalogReleaseStatus | null {
  return value !== null && catalogReleaseStatuses.includes(value as CatalogReleaseStatus)
    ? (value as CatalogReleaseStatus)
    : null;
}

function mapActiveVersion(row: ActiveVersionRow | undefined): CatalogActiveVersionSummary | null {
  return row === undefined
    ? null
    : {
        activatedAt: row.activated_at.toISOString(),
        differenceChecksum: row.difference_checksum,
        id: row.id,
        versionNumber: row.version_number,
      };
}

export function createCatalogReadAdapter(environment: DatabaseEnvironment): CatalogReadPort {
  const pool = new Pool({
    connectionString: environment.DATABASE_URL,
    connectionTimeoutMillis: Math.min(environment.DATABASE_STATEMENT_TIMEOUT_MS, 10_000),
    max: 4,
    statement_timeout: environment.DATABASE_STATEMENT_TIMEOUT_MS,
  });

  return {
    close: () => pool.end(),

    async getAdminOverview(): Promise<CatalogAdminOverview> {
      try {
        const [activeCatalog, activePrice, releases, runs, summary] = await Promise.all([
          pool.query<ActiveVersionRow>(
            `SELECT id::text, version_number, difference_checksum, activated_at
             FROM catalog_version
             WHERE status = 'ACTIVE' AND activation_key = 'PUBLIC'
             LIMIT 1`,
          ),
          pool.query<ActiveVersionRow>(
            `SELECT id::text, version_number, difference_checksum, activated_at
             FROM price_version
             WHERE status = 'ACTIVE' AND activation_key = 'PUBLIC'
             LIMIT 1`,
          ),
          pool.query<ReleaseRow>(
            `
              SELECT
                run.id::text AS sync_run_id,
                run.catalog_source_id::text,
                run.status::text AS sync_status,
                run.source_version,
                run.created_at,
                catalog.id::text AS catalog_version_id,
                catalog.version_number AS catalog_version_number,
                catalog.status::text AS catalog_status,
                catalog.difference_checksum AS catalog_difference_checksum,
                COALESCE(jsonb_array_length(catalog.source_manifest->'composition'), 0)::text
                  AS composition_count,
                price.id::text AS price_version_id,
                price.version_number AS price_version_number,
                price.status::text AS price_status,
                price.difference_checksum AS price_difference_checksum,
                (SELECT count(*)::text FROM catalog_sync_item item
                 WHERE item.sync_run_id = run.id
                   AND item.source_type = 'MATERIAL_VARIANT') AS variant_count,
                (SELECT count(*)::text FROM catalog_sync_item item
                 WHERE item.sync_run_id = run.id
                   AND item.status = 'FAILED') AS failed_item_count,
                (SELECT count(*)::text FROM catalog_sync_difference difference
                 WHERE difference.sync_run_id = run.id) AS difference_count,
                (SELECT count(*)::text FROM catalog_sync_difference difference
                 WHERE difference.sync_run_id = run.id
                   AND difference.resolution = 'PENDING') AS pending_difference_count
              FROM catalog_sync_run run
              LEFT JOIN LATERAL (
                SELECT version.* FROM catalog_version version
                WHERE version.sync_run_id = run.id
                ORDER BY version.created_at DESC LIMIT 1
              ) catalog ON true
              LEFT JOIN LATERAL (
                SELECT version.* FROM price_version version
                WHERE version.sync_run_id = run.id
                ORDER BY version.created_at DESC LIMIT 1
              ) price ON true
              WHERE run.catalog_source_id = $1::uuid
                AND (catalog.id IS NOT NULL OR price.id IS NOT NULL)
              ORDER BY run.created_at DESC, run.id DESC
              LIMIT 12
            `,
            [amigoPilotCatalogSourceId],
          ),
          pool.query<SyncRunRow>(
            `
              SELECT id::text AS sync_run_id, trigger::text, status::text,
                     correlation_id, source_version, discovered_count, processed_count,
                     error_count, error_code, created_at, completed_at,
                     NULLIF(audit_context->>'retryOfSyncRunId', '') AS retry_of_sync_run_id
              FROM catalog_sync_run
              WHERE catalog_source_id = $1::uuid
              ORDER BY created_at DESC, id DESC
              LIMIT 12
            `,
            [amigoPilotCatalogSourceId],
          ),
          pool.query<SummaryRow>(
            `
              SELECT
                (SELECT count(*)::text FROM material_variant variant
                 JOIN source_entity source ON source.id = variant.source_entity_id
                 WHERE source.catalog_source_id = $1::uuid
                   AND source.source_id = ANY($2::text[])) AS material_variant_count,
                (SELECT count(*)::text FROM source_price_record price
                 JOIN material_variant variant ON variant.id = price.material_variant_id
                 JOIN source_entity source ON source.id = variant.source_entity_id
                 WHERE price.catalog_source_id = $1::uuid
                   AND source.source_id = ANY($2::text[])) AS source_price_count,
                (SELECT count(DISTINCT asset.id)::text FROM media_asset asset
                 JOIN material_media_asset placement ON placement.media_asset_id = asset.id
                 JOIN material_variant variant ON variant.id = placement.material_variant_id
                 JOIN source_entity source ON source.id = variant.source_entity_id
                 WHERE source.catalog_source_id = $1::uuid
                   AND source.source_id = ANY($2::text[])
                   AND asset.publication_status = 'PUBLICATION_APPROVED') AS approved_media_count,
                (SELECT count(*)::text FROM business_catalog_entry business
                 LEFT JOIN product_category category ON category.id = business.category_id
                 LEFT JOIN product_system system_row ON system_row.id = business.system_id
                 LEFT JOIN material_variant variant ON variant.id = business.material_variant_id
                 LEFT JOIN source_entity source ON source.id = COALESCE(
                   category.source_entity_id, system_row.source_entity_id, variant.source_entity_id
                 )
                 WHERE source.catalog_source_id = $1::uuid
                   AND (
                     (source.source_type = 'CATEGORY' AND source.source_id = ANY($3::text[]))
                     OR (source.source_type = 'SYSTEM' AND source.source_id = ANY($4::text[]))
                     OR (source.source_type = 'MATERIAL_VARIANT'
                         AND source.source_id = ANY($2::text[]))
                   )) AS business_entry_count,
                (SELECT count(DISTINCT publication.business_catalog_entry_id)::text
                 FROM publication_record publication
                 JOIN business_catalog_entry business ON business.id = publication.business_catalog_entry_id
                 LEFT JOIN product_category category ON category.id = business.category_id
                 LEFT JOIN product_system system_row ON system_row.id = business.system_id
                 LEFT JOIN material_variant variant ON variant.id = business.material_variant_id
                 LEFT JOIN source_entity source ON source.id = COALESCE(
                   category.source_entity_id, system_row.source_entity_id, variant.source_entity_id
                 )
                 WHERE source.catalog_source_id = $1::uuid
                   AND (
                     (source.source_type = 'CATEGORY' AND source.source_id = ANY($3::text[]))
                     OR (source.source_type = 'SYSTEM' AND source.source_id = ANY($4::text[]))
                     OR (source.source_type = 'MATERIAL_VARIANT'
                         AND source.source_id = ANY($2::text[]))
                   )
                   AND publication.ended_at IS NULL
                   AND publication.status = 'PUBLISHED') AS published_entry_count
            `,
            [
              amigoPilotCatalogSourceId,
              amigoPilotMaterialSourceIds,
              amigoPilotCategorySourceIds,
              amigoPilotSystemSourceIds,
            ],
          ),
        ]);
        const summaryRow = summary.rows[0];
        if (summaryRow === undefined) throw new CatalogReadError('CATALOG_READ_DATABASE');
        const releaseRows: CatalogAdminRelease[] = releases.rows.map((row) => ({
          catalogDifferenceChecksum: row.catalog_difference_checksum,
          catalogSourceId: row.catalog_source_id,
          catalogStatus: asReleaseStatus(row.catalog_status),
          catalogVersionId: row.catalog_version_id,
          catalogVersionNumber: row.catalog_version_number,
          compositionCount: Number(row.composition_count),
          createdAt: row.created_at.toISOString(),
          differenceCount: Number(row.difference_count),
          failedItemCount: Number(row.failed_item_count),
          pendingDifferenceCount: Number(row.pending_difference_count),
          priceDifferenceChecksum: row.price_difference_checksum,
          priceStatus: asReleaseStatus(row.price_status),
          priceVersionId: row.price_version_id,
          priceVersionNumber: row.price_version_number,
          sourceVersion: row.source_version,
          syncRunId: row.sync_run_id,
          syncStatus: row.sync_status,
          variantCount: Number(row.variant_count),
        }));
        const runRows: CatalogAdminSyncRun[] = runs.rows.map((row) => ({
          completedAt: row.completed_at?.toISOString() ?? null,
          correlationId: row.correlation_id,
          createdAt: row.created_at.toISOString(),
          discoveredCount: row.discovered_count,
          errorCode: row.error_code,
          errorCount: row.error_count,
          id: row.sync_run_id,
          processedCount: row.processed_count,
          retryOfSyncRunId: row.retry_of_sync_run_id,
          sourceVersion: row.source_version,
          status: row.status,
          trigger: row.trigger,
        }));
        return {
          activeCatalogVersion: mapActiveVersion(activeCatalog.rows[0]),
          activePriceVersion: mapActiveVersion(activePrice.rows[0]),
          generatedAt: new Date().toISOString(),
          releases: releaseRows,
          runs: runRows,
          summary: {
            approvedMediaCount: Number(summaryRow.approved_media_count),
            businessEntryCount: Number(summaryRow.business_entry_count),
            materialVariantCount: Number(summaryRow.material_variant_count),
            publishedEntryCount: Number(summaryRow.published_entry_count),
            sourcePriceCount: Number(summaryRow.source_price_count),
          },
        };
      } catch (error) {
        throw mapDatabaseError(error);
      }
    },

    async listAdminVariants(
      query: CatalogAdminVariantQuery = {},
    ): Promise<CatalogAdminVariantPage> {
      const parsed = assertCatalogAdminVariantQuery(query);
      try {
        const values = [
          `%${parsed.query}%`,
          parsed.state,
          parsed.limit,
          amigoPilotCatalogSourceId,
          amigoPilotMaterialSourceIds,
        ];
        const result = await pool.query<VariantRow & { readonly total_count: string }>(
          `
            SELECT
              variant.id::text AS variant_id,
              variant.article,
              variant.name,
              source.source_id,
              source.source_url,
              source.status::text AS source_status,
              category.name AS category_name,
              color.name AS color_name,
              color.normalized_hex AS color_hex,
              system_row.name AS primary_system_name,
              business.id::text AS business_catalog_entry_id,
              COALESCE(business.visibility::text, 'HIDDEN') AS visibility,
              COALESCE(business.manual_review_state::text, 'UNREVIEWED') AS manual_review_state,
              COALESCE(availability.status::text, 'UNREVIEWED') AS availability_status,
              COALESCE(publication.status::text, 'UNREVIEWED') AS publication_status,
              override_row.amount_minor AS local_price_amount_minor,
              price.amount_minor AS source_price_amount_minor,
              price.currency,
              price.source_captured_at,
              media.media_count,
              media.media_approved,
              media.rights_ready,
              count(*) OVER()::text AS total_count
            FROM material_variant variant
            JOIN source_entity source ON source.id = variant.source_entity_id
            JOIN material ON material.id = variant.material_id
            JOIN product_category category ON category.id = material.category_id
            LEFT JOIN color ON color.id = variant.color_id
            LEFT JOIN product_system system_row ON system_row.id = variant.primary_system_id
            LEFT JOIN business_catalog_entry business ON business.material_variant_id = variant.id
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
                AND record.status = 'ACTIVE' AND record.removed_at IS NULL
                AND record.effective_from <= NOW()
                AND (record.effective_to IS NULL OR record.effective_to >= NOW())
              ORDER BY record.effective_from DESC, record.created_at DESC LIMIT 1
            ) override_row ON true
            LEFT JOIN LATERAL (
              SELECT record.* FROM source_price_record record
              WHERE record.material_variant_id = variant.id
              ORDER BY record.source_captured_at DESC, record.created_at DESC LIMIT 1
            ) price ON true
            LEFT JOIN LATERAL (
              SELECT
                count(*)::text AS media_count,
                bool_or(asset.publication_status = 'PUBLICATION_APPROVED') AS media_approved,
                bool_or(asset.rights_status IN ('PARTNER_LICENSE', 'OWNER_CREATED')) AS rights_ready
              FROM material_media_asset placement
              JOIN media_asset asset ON asset.id = placement.media_asset_id
              WHERE placement.material_variant_id = variant.id
            ) media ON true
            WHERE ($1 = '%%' OR variant.name ILIKE $1 OR variant.article ILIKE $1
                   OR material.name ILIKE $1 OR color.name ILIKE $1)
              AND source.catalog_source_id = $4::uuid
              AND source.source_id = ANY($5::text[])
              AND (
                $2 = 'ALL'
                OR ($2 = 'PUBLISHED' AND business.visibility = 'VISIBLE'
                    AND publication.status = 'PUBLISHED')
                OR ($2 = 'BLOCKED' AND (business.id IS NULL OR business.visibility <> 'VISIBLE'
                    OR publication.status IS DISTINCT FROM 'PUBLISHED'
                    OR availability.status IN ('UNREVIEWED', 'HIDDEN')
                    OR NOT COALESCE(media.media_approved, false)
                    OR NOT COALESCE(media.rights_ready, false)
                    OR price.id IS NULL))
              )
            ORDER BY category.name, material.name, variant.article, variant.id
            LIMIT $3
          `,
          values,
        );
        const items: CatalogAdminVariant[] = result.rows.map((row) => ({
          article: row.article,
          availabilityStatus: row.availability_status ?? 'UNREVIEWED',
          businessCatalogEntryId: row.business_catalog_entry_id,
          categoryName: row.category_name,
          colorHex: row.color_hex,
          colorName: row.color_name,
          currency: row.currency,
          id: row.variant_id,
          localPriceAmountMinor: row.local_price_amount_minor,
          manualReviewState: row.manual_review_state ?? 'UNREVIEWED',
          mediaApproved: row.media_approved ?? false,
          mediaCount: Number(row.media_count ?? '0'),
          name: row.name,
          primarySystemName: row.primary_system_name,
          publicationStatus: row.publication_status ?? 'UNREVIEWED',
          rightsReady: row.rights_ready ?? false,
          sourceCapturedAt: row.source_captured_at?.toISOString() ?? null,
          sourceId: row.source_id,
          sourcePriceAmountMinor: row.source_price_amount_minor,
          sourceStatus: row.source_status,
          sourceUrl: row.source_url,
          visibility: row.visibility ?? 'HIDDEN',
        }));
        return {
          items,
          limit: parsed.limit,
          total: Number(result.rows[0]?.total_count ?? '0'),
        };
      } catch (error) {
        throw mapDatabaseError(error);
      }
    },
  };
}
