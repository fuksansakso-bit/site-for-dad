import {
  CatalogReadError,
  amigoPilotCatalogSourceId,
  assertCatalogAdminDifferenceQuery,
  assertCatalogAdminVariantQuery,
  buildCatalogPublicSnapshot,
  catalogReleaseStatuses,
  maximumPublicCatalogMaterialCount,
  type CatalogActiveVersionSummary,
  type CatalogAdminBulkHistory,
  type CatalogAdminCategoryFacet,
  type CatalogAdminDifference,
  type CatalogAdminDifferencePage,
  type CatalogAdminDifferenceQuery,
  type CatalogAdminDifferenceResolution,
  type CatalogAdminDifferenceType,
  type CatalogAdminFacet,
  type CatalogAdminManifestCounts,
  type CatalogAdminManifestSummary,
  type CatalogAdminOverview,
  type CatalogAdminRelease,
  type CatalogAdminReviewHistory,
  type CatalogAdminSyncStage,
  type CatalogAdminSyncRun,
  type CatalogAdminVariant,
  type CatalogAdminVariantPage,
  type CatalogAdminVariantQuery,
  type CatalogPublicVersion,
  type CatalogReadPort,
  type CatalogReleaseStatus,
} from '@project-name/catalog';
import type { DatabaseEnvironment } from '@project-name/config/server';
import { Pool } from 'pg';

interface ActiveVersionRow {
  readonly activated_at: Date;
  readonly difference_checksum: string;
  readonly id: string;
  readonly rollback_target_id: string | null;
  readonly version_number: number;
}

interface ReleaseRow {
  readonly catalog_difference_count: string;
  readonly catalog_difference_checksum: string | null;
  readonly catalog_source_id: string;
  readonly catalog_status: string | null;
  readonly catalog_unapproved_difference_count: string;
  readonly catalog_version_id: string | null;
  readonly catalog_version_number: number | null;
  readonly bulk_command_count: string;
  readonly composition_count: string;
  readonly created_at: Date;
  readonly difference_count: string;
  readonly failed_item_count: string;
  readonly manifest_complete: boolean | null;
  readonly manifest_counts: unknown;
  readonly manifest_sealed_at: Date | null;
  readonly manifest_status: string | null;
  readonly pending_difference_count: string;
  readonly price_difference_count: string;
  readonly price_unapproved_difference_count: string;
  readonly price_difference_checksum: string | null;
  readonly price_status: string | null;
  readonly price_version_id: string | null;
  readonly price_version_number: number | null;
  readonly publication_prepared: boolean;
  readonly review_batch_count: string;
  readonly source_version: string | null;
  readonly sync_run_id: string;
  readonly sync_status: string;
  readonly variant_count: string;
}

interface SyncRunRow {
  readonly cancel_requested_at: Date | null;
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

interface SyncStageRow {
  readonly completed_at: Date | null;
  readonly error_count: number;
  readonly expected_count: number;
  readonly partition_key: string;
  readonly processed_count: number;
  readonly resume_count: number;
  readonly stage: string;
  readonly status: string;
  readonly sync_run_id: string;
}

interface SummaryRow {
  readonly approved_media_count: string;
  readonly business_entry_count: string;
  readonly category_count: string;
  readonly material_variant_count: string;
  readonly model_count: string;
  readonly published_entry_count: string;
  readonly source_price_count: string;
  readonly source_removed_count: string;
  readonly system_count: string;
}

interface ReviewHistoryRow {
  readonly affected_count: number;
  readonly created_at: Date;
  readonly id: string;
  readonly resolution: string;
  readonly safe_reason: string;
  readonly scope: 'CATALOG' | 'PRICE';
  readonly selection_mode: 'ALL' | 'SELECTED';
  readonly sync_run_id: string;
}

interface BulkHistoryRow {
  readonly affected_count: number;
  readonly created_at: Date;
  readonly id: string;
  readonly matched_count: number;
  readonly safe_reason: string;
  readonly selector_mode: 'CATEGORY' | 'FILTER' | 'SELECTED';
  readonly sync_run_id: string;
}

interface PublicCatalogRow {
  readonly catalog_activated_at: Date;
  readonly catalog_difference_checksum: string;
  readonly catalog_version_id: string;
  readonly catalog_version_number: number;
  readonly price_activated_at: Date;
  readonly price_difference_checksum: string;
  readonly price_version_id: string;
  readonly price_version_number: number;
  readonly source_manifest: unknown;
}

interface VariantRow {
  readonly article: string;
  readonly availability_status: string | null;
  readonly business_catalog_entry_id: string | null;
  readonly category_id: string;
  readonly category_name: string;
  readonly category_path: string;
  readonly color_hex: string | null;
  readonly color_name: string | null;
  readonly currency: string | null;
  readonly local_price_amount_minor: number | null;
  readonly manual_review_state: string | null;
  readonly media_approved: boolean;
  readonly media_count: string;
  readonly material_name: string;
  readonly name: string;
  readonly is_blackout: boolean;
  readonly is_zebra: boolean;
  readonly primary_system_id: string | null;
  readonly primary_system_name: string | null;
  readonly publication_status: string | null;
  readonly rights_ready: boolean;
  readonly source_captured_at: Date | null;
  readonly source_id: string;
  readonly source_price_amount_minor: number | null;
  readonly source_price_status: 'AVAILABLE' | 'MISSING' | 'PRICE_ON_REQUEST';
  readonly source_status: string;
  readonly source_url: string;
  readonly variant_id: string;
  readonly visibility: string | null;
  readonly width_mm: string | null;
}

interface CategoryFacetRow {
  readonly depth: number;
  readonly id: string;
  readonly label: string;
  readonly parent_id: string | null;
  readonly path: string;
  readonly variant_count: string;
}

interface FacetRow {
  readonly id: string;
  readonly label: string;
  readonly variant_count: string;
}

interface DifferenceRow {
  readonly absolute_change_minor: number | null;
  readonly after_summary: string | null;
  readonly before_summary: string | null;
  readonly currency: string | null;
  readonly entity_name: string | null;
  readonly entity_type: string;
  readonly id: string;
  readonly new_price_minor: number | null;
  readonly old_price_minor: number | null;
  readonly resolution: CatalogAdminDifferenceResolution;
  readonly source_captured_at: Date | null;
  readonly source_id: string | null;
  readonly source_url: string | null;
  readonly type: CatalogAdminDifferenceType;
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
        rollbackTargetId: row.rollback_target_id,
        versionNumber: row.version_number,
      };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function manifestCount(record: Record<string, unknown> | null, key: string): number {
  const value = record?.[key];
  return Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : 0;
}

function mapManifest(row: ReleaseRow): CatalogAdminManifestSummary | null {
  if (
    row.manifest_status === null ||
    row.manifest_complete === null ||
    row.manifest_sealed_at === null ||
    !['CANCELLED', 'COMPLETE', 'PARTIAL_FAILED'].includes(row.manifest_status)
  ) {
    return null;
  }
  const counts = asRecord(row.manifest_counts);
  const mappedCounts: CatalogAdminManifestCounts = {
    categories: manifestCount(counts, 'categories'),
    differences: manifestCount(counts, 'differences'),
    duplicates: manifestCount(counts, 'duplicates'),
    failures: manifestCount(counts, 'failures'),
    materialVariants: manifestCount(counts, 'materialVariants'),
    mediaImported: manifestCount(counts, 'mediaImported'),
    mediaReferences: manifestCount(counts, 'mediaReferences'),
    models: manifestCount(counts, 'models'),
    normalizedItems: manifestCount(counts, 'normalizedItems'),
    pages: manifestCount(counts, 'pages'),
    priceRecords: manifestCount(counts, 'priceRecords'),
    resumedSnapshots: manifestCount(counts, 'resumedSnapshots'),
    skips: manifestCount(counts, 'skips'),
    sourceRemoved: manifestCount(counts, 'sourceRemoved'),
    systems: manifestCount(counts, 'systems'),
    warnings: manifestCount(counts, 'warnings'),
  };
  return {
    complete: row.manifest_complete,
    counts: mappedCounts,
    sealedAt: row.manifest_sealed_at.toISOString(),
    status: row.manifest_status as CatalogAdminManifestSummary['status'],
  };
}

function mapPublicVersion(
  id: string,
  versionNumber: number,
  differenceChecksum: string,
  activatedAt: Date,
): CatalogPublicVersion {
  return {
    activatedAt: activatedAt.toISOString(),
    differenceChecksum,
    id,
    versionNumber,
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
        const [
          activeCatalog,
          activePrice,
          releases,
          runs,
          stages,
          summary,
          reviewHistory,
          bulkHistory,
        ] = await Promise.all([
          pool.query<ActiveVersionRow>(
            `SELECT id::text, version_number, difference_checksum, activated_at,
                    rollback_target_id::text
             FROM catalog_version
             WHERE status = 'ACTIVE' AND activation_key = 'PUBLIC'
             LIMIT 1`,
          ),
          pool.query<ActiveVersionRow>(
            `SELECT id::text, version_number, difference_checksum, activated_at,
                    rollback_target_id::text
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
                catalog.source_manifest ? 'businessPublicationPrepared' AS publication_prepared,
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
                   AND difference.entity_type <> 'PRICE') AS catalog_difference_count,
                (SELECT count(*)::text FROM catalog_sync_difference difference
                 WHERE difference.sync_run_id = run.id
                   AND difference.entity_type = 'PRICE') AS price_difference_count,
                (SELECT count(*)::text FROM catalog_sync_difference difference
                 WHERE difference.sync_run_id = run.id
                   AND difference.resolution = 'PENDING') AS pending_difference_count
                ,(SELECT count(*)::text FROM catalog_sync_difference difference
                  WHERE difference.sync_run_id = run.id
                    AND difference.entity_type <> 'PRICE'
                    AND difference.resolution <> 'APPROVED')
                    AS catalog_unapproved_difference_count
                ,(SELECT count(*)::text FROM catalog_sync_difference difference
                  WHERE difference.sync_run_id = run.id
                    AND difference.entity_type = 'PRICE'
                    AND difference.resolution <> 'APPROVED')
                    AS price_unapproved_difference_count
                ,(SELECT count(*)::text FROM catalog_difference_review_batch review
                  WHERE review.sync_run_id = run.id) AS review_batch_count
                ,(SELECT count(*)::text FROM catalog_bulk_command command
                  WHERE command.sync_run_id = run.id) AS bulk_command_count
                ,manifest.status::text AS manifest_status
                ,manifest.complete AS manifest_complete
                ,manifest.safe_manifest->'counts' AS manifest_counts
                ,manifest.sealed_at AS manifest_sealed_at
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
              LEFT JOIN catalog_import_manifest manifest ON manifest.sync_run_id = run.id
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
                     cancel_requested_at,
                     NULLIF(audit_context->>'retryOfSyncRunId', '') AS retry_of_sync_run_id
              FROM catalog_sync_run
              WHERE catalog_source_id = $1::uuid
              ORDER BY created_at DESC, id DESC
              LIMIT 12
            `,
            [amigoPilotCatalogSourceId],
          ),
          pool.query<SyncStageRow>(
            `
              SELECT checkpoint.sync_run_id::text, checkpoint.stage,
                     checkpoint.partition_key, checkpoint.status::text,
                     checkpoint.expected_count, checkpoint.processed_count,
                     checkpoint.error_count, checkpoint.resume_count,
                     checkpoint.completed_at
              FROM catalog_sync_checkpoint checkpoint
              WHERE checkpoint.sync_run_id IN (
                SELECT run.id FROM catalog_sync_run run
                WHERE run.catalog_source_id = $1::uuid
                ORDER BY run.created_at DESC, run.id DESC
                LIMIT 12
              )
              ORDER BY checkpoint.sync_run_id, checkpoint.stage, checkpoint.partition_key
              LIMIT 500
            `,
            [amigoPilotCatalogSourceId],
          ),
          pool.query<SummaryRow>(
            `
              SELECT
                (SELECT count(*)::text FROM product_category category
                 JOIN source_entity source ON source.id = category.source_entity_id
                 WHERE source.catalog_source_id = $1::uuid) AS category_count,
                (SELECT count(*)::text FROM product_system system_row
                 JOIN source_entity source ON source.id = system_row.source_entity_id
                 WHERE source.catalog_source_id = $1::uuid) AS system_count,
                (SELECT count(*)::text FROM product_model model
                 JOIN source_entity source ON source.id = model.source_entity_id
                 WHERE source.catalog_source_id = $1::uuid) AS model_count,
                (SELECT count(*)::text FROM material_variant variant
                 JOIN source_entity source ON source.id = variant.source_entity_id
                 WHERE source.catalog_source_id = $1::uuid) AS material_variant_count,
                (SELECT count(DISTINCT price.source_entity_id)::text
                 FROM source_price_record price
                 WHERE price.catalog_source_id = $1::uuid) AS source_price_count,
                (SELECT count(DISTINCT asset.id)::text FROM media_asset asset
                 JOIN source_media_asset source_asset ON source_asset.media_asset_id = asset.id
                 WHERE source_asset.catalog_source_id = $1::uuid
                   AND asset.publication_status = 'PUBLICATION_APPROVED') AS approved_media_count,
                (SELECT count(*)::text FROM business_catalog_entry business
                 LEFT JOIN product_category category ON category.id = business.category_id
                 LEFT JOIN product_system system_row ON system_row.id = business.system_id
                 LEFT JOIN material_variant variant ON variant.id = business.material_variant_id
                 LEFT JOIN source_entity source ON source.id = COALESCE(
                   category.source_entity_id, system_row.source_entity_id, variant.source_entity_id
                 )
                 WHERE source.catalog_source_id = $1::uuid) AS business_entry_count,
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
                   AND publication.ended_at IS NULL
                   AND publication.status = 'PUBLISHED') AS published_entry_count,
                (SELECT count(*)::text FROM source_entity source
                 WHERE source.catalog_source_id = $1::uuid
                   AND source.status = 'SOURCE_REMOVED') AS source_removed_count
            `,
            [amigoPilotCatalogSourceId],
          ),
          pool.query<ReviewHistoryRow>(
            `
              SELECT review.id::text, review.sync_run_id::text, review.scope::text,
                     review.resolution::text, review.selection_mode::text,
                     review.affected_count, review.safe_reason, review.created_at
              FROM catalog_difference_review_batch review
              JOIN catalog_sync_run run ON run.id = review.sync_run_id
              WHERE run.catalog_source_id = $1::uuid
              ORDER BY review.created_at DESC, review.id DESC
              LIMIT 12
            `,
            [amigoPilotCatalogSourceId],
          ),
          pool.query<BulkHistoryRow>(
            `
              SELECT command.id::text, command.sync_run_id::text,
                     command.selector_mode::text, command.matched_count,
                     command.affected_count, command.safe_reason, command.created_at
              FROM catalog_bulk_command command
              WHERE command.catalog_source_id = $1::uuid
              ORDER BY command.created_at DESC, command.id DESC
              LIMIT 12
            `,
            [amigoPilotCatalogSourceId],
          ),
        ]);
        const summaryRow = summary.rows[0];
        if (summaryRow === undefined) throw new CatalogReadError('CATALOG_READ_DATABASE');
        const releaseRows: CatalogAdminRelease[] = releases.rows.map((row) => ({
          catalogDifferenceCount: Number(row.catalog_difference_count),
          catalogDifferenceChecksum: row.catalog_difference_checksum,
          catalogSourceId: row.catalog_source_id,
          catalogStatus: asReleaseStatus(row.catalog_status),
          catalogUnapprovedDifferenceCount: Number(row.catalog_unapproved_difference_count),
          catalogVersionId: row.catalog_version_id,
          catalogVersionNumber: row.catalog_version_number,
          bulkCommandCount: Number(row.bulk_command_count),
          compositionCount: Number(row.composition_count),
          createdAt: row.created_at.toISOString(),
          differenceCount: Number(row.difference_count),
          failedItemCount: Number(row.failed_item_count),
          manifest: mapManifest(row),
          pendingDifferenceCount: Number(row.pending_difference_count),
          priceDifferenceCount: Number(row.price_difference_count),
          priceUnapprovedDifferenceCount: Number(row.price_unapproved_difference_count),
          priceDifferenceChecksum: row.price_difference_checksum,
          priceStatus: asReleaseStatus(row.price_status),
          priceVersionId: row.price_version_id,
          priceVersionNumber: row.price_version_number,
          publicationPrepared: row.publication_prepared,
          reviewBatchCount: Number(row.review_batch_count),
          sourceVersion: row.source_version,
          syncRunId: row.sync_run_id,
          syncStatus: row.sync_status,
          variantCount: Number(row.variant_count),
        }));
        const stagesByRun = new Map<string, CatalogAdminSyncStage[]>();
        for (const row of stages.rows) {
          const runStages = stagesByRun.get(row.sync_run_id) ?? [];
          runStages.push({
            completedAt: row.completed_at?.toISOString() ?? null,
            errorCount: row.error_count,
            expectedCount: row.expected_count,
            partitionKey: row.partition_key,
            processedCount: row.processed_count,
            resumeCount: row.resume_count,
            stage: row.stage,
            status: row.status,
          });
          stagesByRun.set(row.sync_run_id, runStages);
        }
        const runRows: CatalogAdminSyncRun[] = runs.rows.map((row) => ({
          cancelRequestedAt: row.cancel_requested_at?.toISOString() ?? null,
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
          stages: stagesByRun.get(row.sync_run_id) ?? [],
          status: row.status,
          trigger: row.trigger,
        }));
        return {
          activeCatalogVersion: mapActiveVersion(activeCatalog.rows[0]),
          activePriceVersion: mapActiveVersion(activePrice.rows[0]),
          bulkHistory: bulkHistory.rows.map((row): CatalogAdminBulkHistory => ({
            affectedCount: row.affected_count,
            createdAt: row.created_at.toISOString(),
            id: row.id,
            matchedCount: row.matched_count,
            safeReason: row.safe_reason,
            selectorMode: row.selector_mode,
            syncRunId: row.sync_run_id,
          })),
          generatedAt: new Date().toISOString(),
          releases: releaseRows,
          reviewHistory: reviewHistory.rows.map((row): CatalogAdminReviewHistory => ({
            affectedCount: row.affected_count,
            createdAt: row.created_at.toISOString(),
            id: row.id,
            resolution: row.resolution,
            safeReason: row.safe_reason,
            scope: row.scope,
            selectionMode: row.selection_mode,
            syncRunId: row.sync_run_id,
          })),
          runs: runRows,
          summary: {
            approvedMediaCount: Number(summaryRow.approved_media_count),
            businessEntryCount: Number(summaryRow.business_entry_count),
            categoryCount: Number(summaryRow.category_count),
            materialVariantCount: Number(summaryRow.material_variant_count),
            modelCount: Number(summaryRow.model_count),
            publishedEntryCount: Number(summaryRow.published_entry_count),
            sourcePriceCount: Number(summaryRow.source_price_count),
            sourceRemovedCount: Number(summaryRow.source_removed_count),
            systemCount: Number(summaryRow.system_count),
          },
        };
      } catch (error) {
        throw mapDatabaseError(error);
      }
    },

    async getPublicCatalog() {
      try {
        const result = await pool.query<PublicCatalogRow>(
          `
            SELECT
              catalog.id::text AS catalog_version_id,
              catalog.version_number AS catalog_version_number,
              catalog.difference_checksum AS catalog_difference_checksum,
              catalog.activated_at AS catalog_activated_at,
              catalog.source_manifest,
              price.id::text AS price_version_id,
              price.version_number AS price_version_number,
              price.difference_checksum AS price_difference_checksum,
              price.activated_at AS price_activated_at
            FROM catalog_version catalog
            JOIN catalog_sync_run run ON run.id = catalog.sync_run_id
            JOIN price_version price ON price.sync_run_id = catalog.sync_run_id
              AND price.status = 'ACTIVE'
              AND price.activation_key = 'PUBLIC'
              AND price.approved_by_actor_id IS NOT NULL
              AND price.activated_by_actor_id IS NOT NULL
              AND price.activated_at IS NOT NULL
            WHERE catalog.status = 'ACTIVE'
              AND catalog.activation_key = 'PUBLIC'
              AND catalog.approved_by_actor_id IS NOT NULL
              AND catalog.activated_by_actor_id IS NOT NULL
              AND catalog.activated_at IS NOT NULL
              AND run.catalog_source_id = $1::uuid
            LIMIT 1
          `,
          [amigoPilotCatalogSourceId],
        );
        const row = result.rows[0];
        if (row === undefined) return null;
        return buildCatalogPublicSnapshot({
          catalogVersion: mapPublicVersion(
            row.catalog_version_id,
            row.catalog_version_number,
            row.catalog_difference_checksum,
            row.catalog_activated_at,
          ),
          manifest: row.source_manifest,
          maximumMaterialCount: maximumPublicCatalogMaterialCount,
          priceVersion: mapPublicVersion(
            row.price_version_id,
            row.price_version_number,
            row.price_difference_checksum,
            row.price_activated_at,
          ),
        });
      } catch (error) {
        throw mapDatabaseError(error);
      }
    },

    async listAdminDifferences(
      query: CatalogAdminDifferenceQuery = {},
    ): Promise<CatalogAdminDifferencePage> {
      const parsed = assertCatalogAdminDifferenceQuery(query);
      try {
        const differenceFromSql = `
          FROM catalog_sync_difference difference
          JOIN catalog_sync_run run ON run.id = difference.sync_run_id
          LEFT JOIN source_entity source ON source.id = difference.source_entity_id
          WHERE run.catalog_source_id = $1::uuid
            AND ($2::uuid IS NULL OR difference.sync_run_id = $2::uuid)
            AND ($3 = 'ALL' OR ($3 = 'CATALOG' AND difference.entity_type <> 'PRICE')
                 OR ($3 = 'PRICE' AND difference.entity_type = 'PRICE'))
            AND ($4 = 'ALL' OR difference.type::text = $4)
            AND ($5 = 'ALL' OR difference.resolution::text = $5)
        `;
        const values = [
          amigoPilotCatalogSourceId,
          parsed.syncRunId,
          parsed.scope,
          parsed.type,
          parsed.resolution,
        ];
        const [result, total] = await Promise.all([
          pool.query<DifferenceRow>(
            `
            SELECT difference.id::text, difference.type::text,
                   difference.entity_type::text, difference.resolution::text,
                   difference.old_price_minor, difference.new_price_minor,
                   difference.absolute_change_minor, difference.source_url,
                   difference.source_captured_at, source.source_id,
                   COALESCE(NULLIF(source.safe_source_data->>'name', ''),
                            NULLIF(source.safe_source_data->>'article', ''),
                            difference.difference_key) AS entity_name,
                   NULLIF(concat_ws(' · ',
                     NULLIF(difference.before_value->>'name', ''),
                     NULLIF(difference.before_value->>'article', ''),
                     NULLIF(difference.before_value->>'status', ''),
                     NULLIF(difference.before_value->>'value', '')
                   ), '') AS before_summary,
                   NULLIF(concat_ws(' · ',
                     NULLIF(difference.after_value->>'name', ''),
                     NULLIF(difference.after_value->>'article', ''),
                     NULLIF(difference.after_value->>'status', ''),
                     NULLIF(difference.after_value->>'value', '')
                   ), '') AS after_summary,
                   COALESCE(difference.after_value->>'currency',
                            difference.before_value->>'currency') AS currency
            ${differenceFromSql}
            ORDER BY difference.created_at DESC, difference.difference_key, difference.id
            LIMIT $6 OFFSET $7
          `,
            [...values, parsed.limit, parsed.offset],
          ),
          pool.query<{ readonly count: string }>(
            `SELECT count(*)::text AS count ${differenceFromSql}`,
            values,
          ),
        ]);
        const items: CatalogAdminDifference[] = result.rows.map((row) => ({
          absoluteChangeMinor: row.absolute_change_minor,
          afterSummary: row.after_summary,
          beforeSummary: row.before_summary,
          currency: row.currency,
          entityName: row.entity_name ?? 'Без названия',
          entityType: row.entity_type,
          id: row.id,
          newPriceMinor: row.new_price_minor,
          oldPriceMinor: row.old_price_minor,
          resolution: row.resolution,
          scope: row.entity_type === 'PRICE' ? 'PRICE' : 'CATALOG',
          sourceCapturedAt: row.source_captured_at?.toISOString() ?? null,
          sourceId: row.source_id,
          sourceUrl: row.source_url,
          type: row.type,
        }));
        return {
          items,
          limit: parsed.limit,
          offset: parsed.offset,
          total: Number(total.rows[0]?.count ?? '0'),
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
          amigoPilotCatalogSourceId,
          parsed.categoryId,
          parsed.systemId,
          parsed.visibility,
          parsed.review,
          parsed.availability,
          parsed.publication,
          parsed.price,
          parsed.media,
          parsed.sourceStatus,
        ];
        const variantCteSql = `
          WITH RECURSIVE category_paths AS (
            SELECT category.id, category.parent_id, category.name,
                   category.name::text AS path, 0 AS depth
            FROM product_category category
            WHERE category.parent_id IS NULL
            UNION ALL
            SELECT child.id, child.parent_id, child.name,
                   (parent.path || ' / ' || child.name)::text AS path,
                   parent.depth + 1
            FROM product_category child
            JOIN category_paths parent ON parent.id = child.parent_id
          ), selected_categories AS (
            SELECT category.id FROM product_category category
            WHERE $4::uuid IS NOT NULL AND category.id = $4::uuid
            UNION ALL
            SELECT child.id FROM product_category child
            JOIN selected_categories parent ON parent.id = child.parent_id
          )
        `;
        const variantFromSql = `
          FROM material_variant variant
          JOIN source_entity source ON source.id = variant.source_entity_id
          JOIN material ON material.id = variant.material_id
          JOIN product_category category ON category.id = material.category_id
          LEFT JOIN category_paths category_path ON category_path.id = category.id
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
              AND record.status IN ('ACTIVE', 'SCHEDULED') AND record.removed_at IS NULL
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
            SELECT count(*)::text AS media_count,
                   bool_or(asset.publication_status = 'PUBLICATION_APPROVED') AS media_approved,
                   bool_or(asset.rights_status IN ('PARTNER_LICENSE', 'OWNER_CREATED')) AS rights_ready
            FROM material_media_asset placement
            JOIN media_asset asset ON asset.id = placement.media_asset_id
            WHERE placement.material_variant_id = variant.id
          ) media ON true
          WHERE source.catalog_source_id = $3::uuid
            AND ($1 = '%%' OR variant.name ILIKE $1 OR variant.article ILIKE $1
                 OR material.name ILIKE $1 OR color.name ILIKE $1
                 OR category.name ILIKE $1 OR system_row.name ILIKE $1)
            AND ($4::uuid IS NULL OR category.id IN (SELECT id FROM selected_categories))
            AND ($5::uuid IS NULL OR variant.primary_system_id = $5::uuid)
            AND ($6 = 'ALL' OR COALESCE(business.visibility::text, 'HIDDEN') = $6)
            AND ($7 = 'ALL' OR COALESCE(business.manual_review_state::text, 'UNREVIEWED') = $7)
            AND ($8 = 'ALL' OR COALESCE(availability.status::text, 'UNREVIEWED') = $8)
            AND ($9 = 'ALL' OR COALESCE(publication.status::text, 'UNREVIEWED') = $9)
            AND ($10 = 'ALL'
                 OR ($10 = 'LOCAL_OVERRIDE' AND override_row.id IS NOT NULL)
                 OR ($10 = 'MISSING' AND price.id IS NULL)
                 OR ($10 IN ('AVAILABLE', 'PRICE_ON_REQUEST') AND price.status::text = $10))
            AND ($11 = 'ALL'
                 OR ($11 = 'MISSING' AND COALESCE(media.media_count::int, 0) = 0)
                 OR ($11 = 'READY' AND COALESCE(media.media_count::int, 0) > 0
                     AND COALESCE(media.media_approved, false)
                     AND COALESCE(media.rights_ready, false))
                 OR ($11 = 'BLOCKED' AND COALESCE(media.media_count::int, 0) > 0
                     AND (NOT COALESCE(media.media_approved, false)
                          OR NOT COALESCE(media.rights_ready, false))))
            AND ($12 = 'ALL' OR source.status::text = $12)
            AND ($2 = 'ALL'
                 OR ($2 = 'PUBLISHED' AND business.visibility = 'VISIBLE'
                     AND publication.status = 'PUBLISHED')
                 OR ($2 = 'BLOCKED' AND (business.id IS NULL OR business.visibility <> 'VISIBLE'
                     OR publication.status IS DISTINCT FROM 'PUBLISHED'
                     OR availability.status IS NULL OR availability.status IN ('UNREVIEWED', 'HIDDEN')
                     OR NOT COALESCE(media.media_approved, false)
                     OR NOT COALESCE(media.rights_ready, false)
                     OR price.id IS NULL)))
        `;
        const [result, total, categories, systems] = await Promise.all([
          pool.query<VariantRow>(
            `
              ${variantCteSql}
              SELECT variant.id::text AS variant_id, variant.article, variant.name,
                     variant.width_mm::text, variant.is_blackout, variant.is_zebra,
                     source.source_id, source.source_url, source.status::text AS source_status,
                     category.id::text AS category_id, category.name AS category_name,
                     COALESCE(category_path.path, category.name) AS category_path,
                     material.name AS material_name,
                     color.name AS color_name, color.normalized_hex AS color_hex,
                     system_row.id::text AS primary_system_id,
                     system_row.name AS primary_system_name,
                     business.id::text AS business_catalog_entry_id,
                     COALESCE(business.visibility::text, 'HIDDEN') AS visibility,
                     COALESCE(business.manual_review_state::text, 'UNREVIEWED') AS manual_review_state,
                     COALESCE(availability.status::text, 'UNREVIEWED') AS availability_status,
                     COALESCE(publication.status::text, 'UNREVIEWED') AS publication_status,
                     override_row.amount_minor AS local_price_amount_minor,
                     price.amount_minor AS source_price_amount_minor, price.currency,
                     CASE WHEN price.id IS NULL THEN 'MISSING'
                          ELSE price.status::text END AS source_price_status,
                     price.source_captured_at, media.media_count,
                     media.media_approved, media.rights_ready
              ${variantFromSql}
              ORDER BY COALESCE(category_path.path, category.name), material.name,
                       variant.article, variant.id
              LIMIT $13 OFFSET $14
            `,
            [...values, parsed.limit, parsed.offset],
          ),
          pool.query<{ readonly count: string }>(
            `${variantCteSql} SELECT count(*)::text AS count ${variantFromSql}`,
            values,
          ),
          pool.query<CategoryFacetRow>(
            `
              WITH RECURSIVE category_paths AS (
                SELECT category.id, category.parent_id, category.name,
                       category.name::text AS path, 0 AS depth
                FROM product_category category
                JOIN source_entity source ON source.id = category.source_entity_id
                WHERE category.parent_id IS NULL AND source.catalog_source_id = $1::uuid
                UNION ALL
                SELECT child.id, child.parent_id, child.name,
                       (parent.path || ' / ' || child.name)::text, parent.depth + 1
                FROM product_category child
                JOIN category_paths parent ON parent.id = child.parent_id
              )
              SELECT tree.id::text, tree.parent_id::text, tree.name AS label,
                     tree.path, tree.depth,
                     count(variant.id)::text AS variant_count
              FROM category_paths tree
              LEFT JOIN material ON material.category_id = tree.id
              LEFT JOIN material_variant variant ON variant.material_id = material.id
              GROUP BY tree.id, tree.parent_id, tree.name, tree.path, tree.depth
              ORDER BY tree.path, tree.id
            `,
            [amigoPilotCatalogSourceId],
          ),
          pool.query<FacetRow>(
            `
              SELECT system_row.id::text, system_row.name AS label,
                     count(variant.id)::text AS variant_count
              FROM product_system system_row
              JOIN source_entity source ON source.id = system_row.source_entity_id
              LEFT JOIN material_variant variant ON variant.primary_system_id = system_row.id
              WHERE source.catalog_source_id = $1::uuid
              GROUP BY system_row.id, system_row.name
              ORDER BY system_row.name, system_row.id
            `,
            [amigoPilotCatalogSourceId],
          ),
        ]);
        const items: CatalogAdminVariant[] = result.rows.map((row) => ({
          article: row.article,
          availabilityStatus: row.availability_status ?? 'UNREVIEWED',
          businessCatalogEntryId: row.business_catalog_entry_id,
          categoryId: row.category_id,
          categoryName: row.category_name,
          categoryPath: row.category_path,
          colorHex: row.color_hex,
          colorName: row.color_name,
          currency: row.currency,
          id: row.variant_id,
          isBlackout: row.is_blackout,
          isZebra: row.is_zebra,
          localPriceAmountMinor: row.local_price_amount_minor,
          manualReviewState: row.manual_review_state ?? 'UNREVIEWED',
          materialName: row.material_name,
          mediaApproved: row.media_approved ?? false,
          mediaCount: Number(row.media_count ?? '0'),
          name: row.name,
          primarySystemId: row.primary_system_id,
          primarySystemName: row.primary_system_name,
          publicationStatus: row.publication_status ?? 'UNREVIEWED',
          rightsReady: row.rights_ready ?? false,
          sourceCapturedAt: row.source_captured_at?.toISOString() ?? null,
          sourceId: row.source_id,
          sourcePriceAmountMinor: row.source_price_amount_minor,
          sourcePriceStatus: row.source_price_status,
          sourceStatus: row.source_status,
          sourceUrl: row.source_url,
          visibility: row.visibility ?? 'HIDDEN',
          widthMm: row.width_mm === null ? null : Number(row.width_mm),
        }));
        return {
          categories: categories.rows.map((row): CatalogAdminCategoryFacet => ({
            count: Number(row.variant_count),
            depth: row.depth,
            id: row.id,
            label: row.label,
            parentId: row.parent_id,
            path: row.path,
          })),
          items,
          limit: parsed.limit,
          offset: parsed.offset,
          systems: systems.rows.map((row): CatalogAdminFacet => ({
            count: Number(row.variant_count),
            id: row.id,
            label: row.label,
          })),
          total: Number(total.rows[0]?.count ?? '0'),
        };
      } catch (error) {
        throw mapDatabaseError(error);
      }
    },
  };
}
