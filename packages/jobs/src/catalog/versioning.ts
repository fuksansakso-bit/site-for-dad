import { hashCanonicalSource } from '@project-name/catalog';
import type { JobHelpers } from 'graphile-worker';
import type { PoolClient } from 'pg';

import type {
  CatalogActivateVersionPayload,
  CatalogApproveVersionPayload,
  CatalogBuildDiffPayload,
  CatalogRollbackVersionPayload,
} from './contracts.js';
import { CatalogPipelineError, toCatalogPipelineError } from './errors.js';

type DifferenceType =
  | 'ARTICLE_CHANGED'
  | 'COLOR_CHANGED'
  | 'NEW_CATEGORY'
  | 'NEW_MATERIAL'
  | 'NEW_MEDIA'
  | 'NEW_MODEL'
  | 'NEW_SYSTEM'
  | 'PARSE_ERROR'
  | 'PRICE_CHANGED'
  | 'PROPERTY_CHANGED'
  | 'SOURCE_REMOVED';

type SourceEntityType =
  | 'CATEGORY'
  | 'COLOR'
  | 'FAMILY'
  | 'MATERIAL'
  | 'MATERIAL_VARIANT'
  | 'MEDIA'
  | 'MODEL'
  | 'PRICE'
  | 'PROPERTY'
  | 'SYSTEM';

interface SyncRunRow {
  readonly catalog_source_id: string;
  readonly source_version: string | null;
  readonly status: string;
}

interface SourceItemRow {
  readonly after_hash: string | null;
  readonly before_hash: string | null;
  readonly item_status: string;
  readonly safe_source_data: unknown;
  readonly source_captured_at: Date | string;
  readonly source_category: string | null;
  readonly source_entity_id: string;
  readonly source_hash: string;
  readonly source_id: string;
  readonly source_slug: string;
  readonly source_status: string;
  readonly source_type: SourceEntityType;
  readonly source_url: string;
}

interface MediaAttachmentRow {
  readonly byte_size: number | null;
  readonly file_hash: string | null;
  readonly height: number | null;
  readonly media_asset_id: string | null;
  readonly mime_type: string | null;
  readonly object_key: string | null;
  readonly publication_status: string | null;
  readonly rights_status: string | null;
  readonly source_entity_id: string;
  readonly width: number | null;
}

interface PriceAttachmentRow {
  readonly amount_minor: number | null;
  readonly currency: string;
  readonly kind: string;
  readonly source_entity_id: string;
  readonly source_price_category: string | null;
  readonly source_price_record_id: string;
  readonly status: string;
}

interface SnapshotEvidenceRow {
  readonly captured_at: Date | string;
  readonly content_hash: string;
  readonly source_url: string;
  readonly source_version: string | null;
}

interface VersionEntity {
  readonly artifactHash: string;
  readonly attachment: unknown;
  readonly facts: unknown;
  readonly key: string;
  readonly sourceCapturedAt: string;
  readonly sourceCategory: string | null;
  readonly sourceEntityId: string;
  readonly sourceHash: string;
  readonly sourceId: string;
  readonly sourceSlug: string;
  readonly sourceStatus: string;
  readonly sourceType: SourceEntityType;
  readonly sourceUrl: string;
}

interface VersionManifest {
  readonly catalogSourceId: string;
  readonly contentChecksum: string;
  readonly entities: readonly VersionEntity[];
  readonly evidence: {
    readonly snapshots: readonly {
      readonly capturedAt: string;
      readonly contentHash: string;
      readonly sourceUrl: string;
      readonly sourceVersion: string | null;
    }[];
  };
  readonly schemaVersion: 1;
  readonly sourceVersion: string | null;
  readonly syncRunId: string;
}

interface ActiveCatalogVersionRow {
  readonly capture_checksum: string;
  readonly difference_checksum: string;
  readonly id: string;
  readonly source_manifest: unknown;
}

interface ActivePriceVersionRow {
  readonly difference_checksum: string;
  readonly id: string;
  readonly source_manifest: unknown;
}

interface CandidateDifference {
  readonly absoluteChangeMinor: number | null;
  readonly afterValue: unknown;
  readonly beforeValue: unknown;
  readonly differenceKey: string;
  readonly entityType: SourceEntityType;
  readonly newPriceMinor: number | null;
  readonly oldPriceMinor: number | null;
  readonly percentageChange: number | null;
  readonly sourceCapturedAt: string | null;
  readonly sourceEntityId: string | null;
  readonly sourceUrl: string | null;
  readonly type: DifferenceType;
}

interface ActorAccessRow {
  readonly actor_id: string;
  readonly roles: string[];
}

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function manifestEntities(value: unknown): readonly VersionEntity[] {
  const manifest = asRecord(value);
  if (!Array.isArray(manifest?.['entities'])) return [];
  return manifest['entities'].filter((candidate): candidate is VersionEntity => {
    const record = asRecord(candidate);
    return (
      typeof record?.['key'] === 'string' &&
      typeof record['artifactHash'] === 'string' &&
      typeof record['sourceType'] === 'string' &&
      typeof record['sourceId'] === 'string'
    );
  });
}

function semanticEntityValue(entity: VersionEntity): unknown {
  return {
    attachment: entity.attachment,
    sourceCategory: entity.sourceCategory,
    sourceHash: entity.sourceHash,
    sourceId: entity.sourceId,
    sourceSlug: entity.sourceSlug,
    sourceStatus: entity.sourceStatus,
    sourceType: entity.sourceType,
    sourceUrl: entity.sourceUrl,
  };
}

function entityArtifactHash(input: Omit<VersionEntity, 'artifactHash' | 'key'>): string {
  return hashCanonicalSource(semanticEntityValue({ ...input, artifactHash: '', key: '' }));
}

function mediaAttachment(row: MediaAttachmentRow | undefined): unknown {
  if (row === undefined || row.media_asset_id === null) {
    return { imported: false };
  }
  return {
    byteSize: row.byte_size,
    fileHash: row.file_hash,
    height: row.height,
    imported: true,
    mediaAssetId: row.media_asset_id,
    mimeType: row.mime_type,
    objectKey: row.object_key,
    publicationStatus: row.publication_status,
    rightsStatus: row.rights_status,
    width: row.width,
  };
}

function priceAttachment(row: PriceAttachmentRow | undefined): unknown {
  if (row === undefined) return { captured: false };
  return {
    amountMinor: row.amount_minor,
    captured: true,
    currency: row.currency,
    kind: row.kind,
    sourcePriceCategory: row.source_price_category,
    sourcePriceRecordId: row.source_price_record_id,
    status: row.status,
  };
}

function toVersionEntity(
  row: SourceItemRow,
  media: ReadonlyMap<string, MediaAttachmentRow>,
  prices: ReadonlyMap<string, PriceAttachmentRow>,
): VersionEntity {
  const attachment =
    row.source_type === 'MEDIA'
      ? mediaAttachment(media.get(row.source_entity_id))
      : row.source_type === 'PRICE'
        ? priceAttachment(prices.get(row.source_entity_id))
        : null;
  const base = {
    attachment,
    facts: row.safe_source_data,
    sourceCapturedAt: iso(row.source_captured_at),
    sourceCategory: row.source_category,
    sourceEntityId: row.source_entity_id,
    sourceHash: row.source_hash,
    sourceId: row.source_id,
    sourceSlug: row.source_slug,
    sourceStatus: row.item_status === 'SOURCE_REMOVED' ? 'SOURCE_REMOVED' : row.source_status,
    sourceType: row.source_type,
    sourceUrl: row.source_url,
  } as const;
  return {
    ...base,
    artifactHash: entityArtifactHash(base),
    key: `${row.source_type}:${row.source_id}`,
  };
}

function contentChecksum(entities: readonly VersionEntity[]): string {
  return hashCanonicalSource(
    entities.map((entity) => ({ artifactHash: entity.artifactHash, key: entity.key })),
  );
}

function makeManifest(
  payload: CatalogBuildDiffPayload,
  run: SyncRunRow,
  entities: readonly VersionEntity[],
  snapshots: readonly SnapshotEvidenceRow[],
): VersionManifest {
  return {
    catalogSourceId: payload.catalogSourceId,
    contentChecksum: contentChecksum(entities),
    entities,
    evidence: {
      snapshots: snapshots.map((snapshot) => ({
        capturedAt: iso(snapshot.captured_at),
        contentHash: snapshot.content_hash,
        sourceUrl: snapshot.source_url,
        sourceVersion: snapshot.source_version,
      })),
    },
    schemaVersion: 1,
    sourceVersion: run.source_version,
    syncRunId: payload.syncRunId,
  };
}

function priceMinor(entity: VersionEntity | undefined): number | null {
  const attachment = asRecord(entity?.attachment);
  return typeof attachment?.['amountMinor'] === 'number' ? attachment['amountMinor'] : null;
}

function changedMaterialType(
  before: VersionEntity,
  after: VersionEntity,
): 'ARTICLE_CHANGED' | 'COLOR_CHANGED' | 'PROPERTY_CHANGED' {
  const beforeFacts = asRecord(before.facts);
  const afterFacts = asRecord(after.facts);
  if (beforeFacts?.['article'] !== afterFacts?.['article']) return 'ARTICLE_CHANGED';
  if (
    hashCanonicalSource(beforeFacts?.['color'] ?? null) !==
    hashCanonicalSource(afterFacts?.['color'] ?? null)
  ) {
    return 'COLOR_CHANGED';
  }
  return 'PROPERTY_CHANGED';
}

function differenceType(before: VersionEntity | undefined, after: VersionEntity): DifferenceType {
  if (after.sourceStatus === 'PARSE_ERROR') return 'PARSE_ERROR';
  if (after.sourceStatus === 'SOURCE_REMOVED') return 'SOURCE_REMOVED';
  if (before !== undefined && after.sourceType === 'MATERIAL_VARIANT') {
    return changedMaterialType(before, after);
  }
  switch (after.sourceType) {
    case 'CATEGORY':
    case 'FAMILY':
      return before === undefined ? 'NEW_CATEGORY' : 'PROPERTY_CHANGED';
    case 'SYSTEM':
      return before === undefined ? 'NEW_SYSTEM' : 'PROPERTY_CHANGED';
    case 'MODEL':
      return before === undefined ? 'NEW_MODEL' : 'PROPERTY_CHANGED';
    case 'MATERIAL':
    case 'MATERIAL_VARIANT':
      return before === undefined ? 'NEW_MATERIAL' : 'PROPERTY_CHANGED';
    case 'MEDIA':
      return 'NEW_MEDIA';
    case 'PRICE':
      return 'PRICE_CHANGED';
    case 'COLOR':
      return before === undefined ? 'NEW_MATERIAL' : 'COLOR_CHANGED';
    case 'PROPERTY':
      return 'PROPERTY_CHANGED';
  }
}

function buildDifferences(
  current: readonly VersionEntity[],
  previous: readonly VersionEntity[],
): readonly CandidateDifference[] {
  const currentByKey = new Map(current.map((entity) => [entity.key, entity]));
  const previousByKey = new Map(previous.map((entity) => [entity.key, entity]));
  const keys = [...new Set([...currentByKey.keys(), ...previousByKey.keys()])].sort();
  const differences: CandidateDifference[] = [];
  for (const key of keys) {
    const before = previousByKey.get(key);
    const currentEntity = currentByKey.get(key);
    const after =
      currentEntity ??
      (before === undefined
        ? undefined
        : {
            ...before,
            artifactHash: hashCanonicalSource({
              previousArtifactHash: before.artifactHash,
              sourceStatus: 'SOURCE_REMOVED',
            }),
            sourceStatus: 'SOURCE_REMOVED',
          });
    if (after === undefined || before?.artifactHash === after.artifactHash) continue;
    const oldPriceMinor = priceMinor(before);
    const newPriceMinor = priceMinor(after);
    const absoluteChangeMinor =
      oldPriceMinor === null || newPriceMinor === null ? null : newPriceMinor - oldPriceMinor;
    const percentageChange =
      oldPriceMinor === null || newPriceMinor === null || oldPriceMinor === 0
        ? null
        : Number((((newPriceMinor - oldPriceMinor) / oldPriceMinor) * 100).toFixed(4));
    differences.push({
      absoluteChangeMinor,
      afterValue: after,
      beforeValue: before ?? null,
      differenceKey: `entity:${hashCanonicalSource(key)}`,
      entityType: after.sourceType,
      newPriceMinor,
      oldPriceMinor,
      percentageChange,
      sourceCapturedAt: after.sourceCapturedAt,
      sourceEntityId: after.sourceEntityId,
      sourceUrl: after.sourceUrl,
      type: currentEntity === undefined ? 'SOURCE_REMOVED' : differenceType(before, after),
    });
  }
  return differences;
}

function differenceChecksum(differences: readonly CandidateDifference[]): string {
  return hashCanonicalSource(
    differences.map((difference) => ({
      absoluteChangeMinor: difference.absoluteChangeMinor,
      afterValue: difference.afterValue,
      beforeValue: difference.beforeValue,
      differenceKey: difference.differenceKey,
      entityType: difference.entityType,
      newPriceMinor: difference.newPriceMinor,
      oldPriceMinor: difference.oldPriceMinor,
      percentageChange: difference.percentageChange,
      type: difference.type,
    })),
  );
}

async function loadActorAccess(
  helpers: JobHelpers,
  actorId: string,
): Promise<ActorAccessRow | undefined> {
  const result = await helpers.query<ActorAccessRow>(
    `
      SELECT actor.id::text AS actor_id,
             array_agg(grant_row.role::text ORDER BY grant_row.role::text) AS roles
      FROM actor_identity actor
      JOIN role_grant grant_row ON grant_row.actor_id = actor.id
      WHERE actor.id = $1::uuid
        AND actor.disabled_at IS NULL
        AND grant_row.revoked_at IS NULL
      GROUP BY actor.id
    `,
    [actorId],
  );
  return result.rows[0];
}

async function recordGovernanceEvent(
  helpers: JobHelpers,
  input: {
    readonly action: string;
    readonly actorId: string | null;
    readonly correlationId: string;
    readonly outcome: 'DENIED' | 'FAILED' | 'SUCCEEDED';
    readonly reasonCode: string;
    readonly targetId: string;
    readonly targetType: string;
  },
): Promise<void> {
  await helpers.query(
    `
      INSERT INTO audit_event (
        actor_type, actor_identity_id, action, outcome, correlation_id,
        target_type, target_id, reason_code
      ) VALUES (
        CASE WHEN $1::uuid IS NULL THEN 'SYSTEM_WORKER'::audit_actor_type
             ELSE 'IDENTITY'::audit_actor_type END,
        $1::uuid, $2, $3::audit_outcome, $4, $5, $6, $7
      )
    `,
    [
      input.actorId,
      input.action,
      input.outcome,
      input.correlationId,
      input.targetType,
      input.targetId,
      input.reasonCode,
    ],
  );
}

async function authorizeGovernanceActor(
  helpers: JobHelpers,
  input: {
    readonly actorId: string;
    readonly allowedRoles: readonly string[];
    readonly correlationId: string;
    readonly requestedAction: string;
    readonly targetId: string;
    readonly targetType: string;
  },
): Promise<void> {
  const actor = await loadActorAccess(helpers, input.actorId);
  const allowed = actor?.roles.some((role) => input.allowedRoles.includes(role)) ?? false;
  await recordGovernanceEvent(helpers, {
    action: input.requestedAction,
    actorId: actor?.actor_id ?? null,
    correlationId: input.correlationId,
    outcome: allowed ? 'SUCCEEDED' : 'DENIED',
    reasonCode: allowed ? 'EXPLICIT_VERSION_COMMAND' : 'CATALOG_ROLE_DENIED',
    targetId: input.targetId,
    targetType: input.targetType,
  });
  if (!allowed) throw new CatalogPipelineError('CATALOG_PIPELINE_AUTHORIZATION');
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

export async function buildCatalogVersionDiff(
  payload: CatalogBuildDiffPayload,
  helpers: JobHelpers,
): Promise<void> {
  try {
    await helpers.withPgClient(async (client) => {
      await client.query('BEGIN');
      try {
        await client.query("SELECT pg_advisory_xact_lock(hashtext('catalog-version-build'))");
        const runResult = await client.query<SyncRunRow>(
          `
            SELECT catalog_source_id::text, source_version, status::text
            FROM catalog_sync_run
            WHERE id = $1::uuid
            FOR UPDATE
          `,
          [payload.syncRunId],
        );
        const run = runResult.rows[0];
        if (
          run === undefined ||
          run.catalog_source_id !== payload.catalogSourceId ||
          !['BUILDING_DIFF', 'AWAITING_APPROVAL', 'COMPLETED'].includes(run.status)
        ) {
          throw new CatalogPipelineError('CATALOG_PIPELINE_VERSION_CONFLICT');
        }

        const existingForRun = await client.query<{ count: string }>(
          `
            SELECT (
              (SELECT count(*) FROM catalog_version WHERE sync_run_id = $1::uuid) +
              (SELECT count(*) FROM price_version WHERE sync_run_id = $1::uuid)
            )::text AS count
          `,
          [payload.syncRunId],
        );
        if (Number(existingForRun.rows[0]?.count ?? '0') > 0) {
          await client.query('COMMIT');
          return;
        }

        const items = await client.query<SourceItemRow>(
          `
              SELECT item.status::text AS item_status, item.before_hash, item.after_hash,
                     source.id::text AS source_entity_id, source.source_type::text AS source_type,
                     source.source_id, source.source_slug, source.source_url,
                     source.source_category, source.source_hash,
                     source.source_captured_at, source.status::text AS source_status,
                     source.safe_source_data
              FROM catalog_sync_item item
              JOIN source_entity source ON source.id = item.source_entity_id
              WHERE item.sync_run_id = $1::uuid
              ORDER BY source.source_type::text, source.source_id
          `,
          [payload.syncRunId],
        );
        const mediaRows = await client.query<MediaAttachmentRow>(
          `
              SELECT media.source_entity_id::text, asset.id::text AS media_asset_id,
                     asset.file_hash, asset.object_key, asset.mime_type, asset.byte_size,
                     asset.width, asset.height, asset.rights_status::text,
                     asset.publication_status::text
              FROM source_media_asset media
              JOIN catalog_sync_item item ON item.source_entity_id = media.source_entity_id
              LEFT JOIN media_asset asset ON asset.id = media.media_asset_id
              WHERE item.sync_run_id = $1::uuid AND item.source_type = 'MEDIA'
          `,
          [payload.syncRunId],
        );
        const priceRows = await client.query<PriceAttachmentRow>(
          `
              SELECT price.source_entity_id::text, price.id::text AS source_price_record_id,
                     price.status::text, price.kind::text, price.amount_minor,
                     price.currency, price.source_price_category
              FROM source_price_record price
              JOIN catalog_sync_item item ON item.source_entity_id = price.source_entity_id
                                           AND item.after_hash = price.source_hash
              WHERE item.sync_run_id = $1::uuid AND item.source_type = 'PRICE'
          `,
          [payload.syncRunId],
        );
        const snapshotRows = await client.query<SnapshotEvidenceRow>(
          `
              SELECT captured_at, content_hash, source_url, source_version
              FROM source_snapshot
              WHERE sync_run_id = $1::uuid
              ORDER BY source_url
          `,
          [payload.syncRunId],
        );
        if (items.rows.length === 0) {
          throw new CatalogPipelineError('CATALOG_PIPELINE_VERSION_NOT_READY');
        }
        const media = new Map(mediaRows.rows.map((row) => [row.source_entity_id, row]));
        const prices = new Map(priceRows.rows.map((row) => [row.source_entity_id, row]));
        const allEntities = items.rows.map((row) => toVersionEntity(row, media, prices));
        const catalogEntities = allEntities.filter((entity) => entity.sourceType !== 'PRICE');
        const priceEntities = allEntities.filter((entity) => entity.sourceType === 'PRICE');
        const catalogManifest = makeManifest(payload, run, catalogEntities, snapshotRows.rows);
        const priceManifest = makeManifest(payload, run, priceEntities, snapshotRows.rows);

        const activeCatalogResult = await client.query<ActiveCatalogVersionRow>(
          `
            SELECT id::text, capture_checksum, difference_checksum, source_manifest
            FROM catalog_version
            WHERE status = 'ACTIVE' AND activation_key = 'PUBLIC'
          `,
        );
        const activePriceResult = await client.query<ActivePriceVersionRow>(
          `
            SELECT id::text, difference_checksum, source_manifest
            FROM price_version
            WHERE status = 'ACTIVE' AND activation_key = 'PUBLIC'
          `,
        );
        const activeCatalog = activeCatalogResult.rows[0];
        const activePrice = activePriceResult.rows[0];

        const equivalentCatalog = await client.query<{ difference_checksum: string; id: string }>(
          `
            SELECT id::text, difference_checksum
            FROM catalog_version
            WHERE capture_checksum = $1
              AND status IN ('AWAITING_APPROVAL', 'APPROVED', 'ACTIVE', 'SUPERSEDED')
            ORDER BY version_number DESC
            LIMIT 1
          `,
          [catalogManifest.contentChecksum],
        );
        const equivalentPrice = await client.query<{ difference_checksum: string; id: string }>(
          `
            SELECT id::text, difference_checksum
            FROM price_version
            WHERE source_manifest->>'contentChecksum' = $1
              AND status IN ('AWAITING_APPROVAL', 'APPROVED', 'ACTIVE', 'SUPERSEDED')
            ORDER BY version_number DESC
            LIMIT 1
          `,
          [priceManifest.contentChecksum],
        );
        const createCatalog = catalogEntities.length > 0 && equivalentCatalog.rows[0] === undefined;
        const createPrice = priceEntities.length > 0 && equivalentPrice.rows[0] === undefined;

        const catalogDifferences = createCatalog
          ? buildDifferences(catalogEntities, manifestEntities(activeCatalog?.source_manifest))
          : [];
        const priceDifferences = createPrice
          ? buildDifferences(priceEntities, manifestEntities(activePrice?.source_manifest))
          : [];
        const catalogDifferenceChecksum = differenceChecksum(catalogDifferences);
        const priceDifferenceChecksum = differenceChecksum(priceDifferences);

        let catalogVersionId: string | null = null;
        let priceVersionId: string | null = null;
        if (createCatalog) {
          await client.query('LOCK TABLE catalog_version IN EXCLUSIVE MODE');
          const inserted = await client.query<{ id: string }>(
            `
              INSERT INTO catalog_version (
                version_number, status, sync_run_id, source_manifest, source_version,
                capture_checksum, difference_checksum, predecessor_id,
                rollback_target_id, safe_notes
              ) SELECT
                COALESCE(MAX(version_number), 0) + 1, 'AWAITING_APPROVAL', $1::uuid,
                $2::jsonb, $3, $4, $5, $6::uuid, $6::uuid,
                'Staged Phase 1B.1 source candidate; publication requires separate composition, approval and activation.'
              FROM catalog_version
              RETURNING id::text
            `,
            [
              payload.syncRunId,
              JSON.stringify(catalogManifest),
              run.source_version,
              catalogManifest.contentChecksum,
              catalogDifferenceChecksum,
              activeCatalog?.id ?? null,
            ],
          );
          catalogVersionId = inserted.rows[0]?.id ?? null;
        }
        if (createPrice) {
          await client.query('LOCK TABLE price_version IN EXCLUSIVE MODE');
          const inserted = await client.query<{ id: string }>(
            `
              INSERT INTO price_version (
                version_number, status, sync_run_id, source_manifest,
                difference_checksum, predecessor_id, rollback_target_id
              ) SELECT
                COALESCE(MAX(version_number), 0) + 1, 'AWAITING_APPROVAL', $1::uuid,
                $2::jsonb, $3, $4::uuid, $4::uuid
              FROM price_version
              RETURNING id::text
            `,
            [
              payload.syncRunId,
              JSON.stringify(priceManifest),
              priceDifferenceChecksum,
              activePrice?.id ?? null,
            ],
          );
          priceVersionId = inserted.rows[0]?.id ?? null;
          if (priceVersionId !== null) {
            await client.query(
              `
                INSERT INTO price_version_record (price_version_id, source_price_record_id)
                SELECT $1::uuid, price.id
                FROM source_price_record price
                JOIN catalog_sync_item item ON item.source_entity_id = price.source_entity_id
                                             AND item.after_hash = price.source_hash
                WHERE item.sync_run_id = $2::uuid AND item.source_type = 'PRICE'
                ON CONFLICT (price_version_id, source_price_record_id) DO NOTHING
              `,
              [priceVersionId, payload.syncRunId],
            );
          }
        }

        for (const difference of [...catalogDifferences, ...priceDifferences]) {
          await client.query(
            `
              INSERT INTO catalog_sync_difference (
                sync_run_id, source_entity_id, difference_key, type, entity_type,
                before_value, after_value, old_price_minor, new_price_minor,
                absolute_change_minor, percentage_change, source_url,
                source_captured_at
              ) VALUES (
                $1::uuid, $2::uuid, $3, $4::catalog_difference_type,
                $5::source_entity_type, $6::jsonb, $7::jsonb, $8, $9, $10,
                $11::decimal, $12, $13::timestamptz
              )
              ON CONFLICT (sync_run_id, difference_key) DO NOTHING
            `,
            [
              payload.syncRunId,
              difference.sourceEntityId,
              difference.differenceKey,
              difference.type,
              difference.entityType,
              JSON.stringify(difference.beforeValue),
              JSON.stringify(difference.afterValue),
              difference.oldPriceMinor,
              difference.newPriceMinor,
              difference.absoluteChangeMinor,
              difference.percentageChange,
              difference.sourceUrl,
              difference.sourceCapturedAt,
            ],
          );
        }

        const createdAny = createCatalog || createPrice;
        await client.query(
          `
            UPDATE catalog_sync_run
            SET status = $2::catalog_sync_status,
                completed_at = NOW(), last_heartbeat_at = NOW(),
                audit_context = audit_context || jsonb_strip_nulls(jsonb_build_object(
                  'catalogVersionId', $3::text,
                  'priceVersionId', $4::text,
                  'catalogDifferenceChecksum', $5::text,
                  'priceDifferenceChecksum', $6::text,
                  'equivalentCatalogVersionId', $7::text,
                  'equivalentPriceVersionId', $8::text,
                  'equivalentVersionReuse', $9::boolean
                )),
                updated_at = NOW()
            WHERE id = $1::uuid
          `,
          [
            payload.syncRunId,
            createdAny ? 'AWAITING_APPROVAL' : 'COMPLETED',
            catalogVersionId,
            priceVersionId,
            catalogVersionId === null ? null : catalogDifferenceChecksum,
            priceVersionId === null ? null : priceDifferenceChecksum,
            equivalentCatalog.rows[0]?.id ?? null,
            equivalentPrice.rows[0]?.id ?? null,
            !createdAny,
          ],
        );
        await client.query(
          `
            INSERT INTO audit_event (
              actor_type, action, outcome, correlation_id, target_type,
              target_id, reason_code
            ) VALUES (
              'SYSTEM_WORKER', $1, 'SUCCEEDED', $2,
              'CATALOG_SYNC_RUN', $3, $4
            )
          `,
          [
            createdAny ? 'CATALOG_EXACT_DIFF_BUILT' : 'CATALOG_VERSION_REUSED_UNCHANGED',
            payload.correlationId,
            payload.syncRunId,
            createdAny ? 'EXPLICIT_APPROVAL_REQUIRED' : 'IDENTICAL_ARTIFACT_HASH',
          ],
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    });
  } catch (error) {
    throw toCatalogPipelineError(error);
  }
}

export async function approveCatalogVersions(
  payload: CatalogApproveVersionPayload,
  helpers: JobHelpers,
): Promise<void> {
  const targetId = payload.catalogVersionId ?? payload.priceVersionId ?? payload.syncRunId;
  await authorizeGovernanceActor(helpers, {
    actorId: payload.approvedByActorId,
    allowedRoles: ['OWNER'],
    correlationId: payload.correlationId,
    requestedAction: 'CATALOG_VERSION_APPROVAL_REQUESTED',
    targetId,
    targetType: 'CATALOG_RELEASE',
  });
  try {
    await helpers.withPgClient(async (client) => {
      await client.query('BEGIN');
      try {
        await client.query("SELECT pg_advisory_xact_lock(hashtext('catalog-version-governance'))");
        if (
          payload.catalogVersionId !== undefined &&
          payload.expectedCatalogDifferenceChecksum !== undefined
        ) {
          const catalog = await client.query<{
            approved_by_actor_id: string | null;
            difference_checksum: string;
            status: string;
            sync_run_id: string;
          }>(
            `
              SELECT status::text, difference_checksum, sync_run_id::text,
                     approved_by_actor_id::text
              FROM catalog_version WHERE id = $1::uuid FOR UPDATE
            `,
            [payload.catalogVersionId],
          );
          const version = catalog.rows[0];
          if (
            version === undefined ||
            version.sync_run_id !== payload.syncRunId ||
            version.difference_checksum !== payload.expectedCatalogDifferenceChecksum ||
            !['AWAITING_APPROVAL', 'APPROVED'].includes(version.status) ||
            (version.status === 'APPROVED' &&
              version.approved_by_actor_id !== payload.approvedByActorId)
          ) {
            throw new CatalogPipelineError('CATALOG_PIPELINE_VERSION_CONFLICT');
          }
          const readiness = await client.query<{ composition_count: string; entry_count: string }>(
            `
              SELECT
                COALESCE(jsonb_array_length(source_manifest->'composition'), 0)::text
                  AS composition_count,
                (SELECT count(*)::text FROM catalog_version_entry
                 WHERE catalog_version_id = $1::uuid) AS entry_count
              FROM catalog_version WHERE id = $1::uuid
            `,
            [payload.catalogVersionId],
          );
          if (
            Number(readiness.rows[0]?.composition_count ?? '0') === 0 ||
            Number(readiness.rows[0]?.entry_count ?? '0') === 0
          ) {
            throw new CatalogPipelineError('CATALOG_PIPELINE_VERSION_NOT_READY');
          }
          if (version.status === 'AWAITING_APPROVAL') {
            await client.query(
              `
                UPDATE catalog_version
                SET status = 'APPROVED', approved_by_actor_id = $2::uuid,
                    approved_at = NOW(), safe_notes = $3,
                    source_manifest = source_manifest || jsonb_build_object(
                      'governance', COALESCE(source_manifest->'governance', '{}'::jsonb) ||
                        jsonb_build_object(
                          'approval', jsonb_build_object(
                            'actorId', $2::text, 'reason', $3::text, 'recordedAt', NOW()
                          )
                        )
                    )
                WHERE id = $1::uuid
              `,
              [payload.catalogVersionId, payload.approvedByActorId, payload.approvalReason],
            );
            await client.query(
              `
                UPDATE catalog_sync_difference
                SET resolution = 'APPROVED', resolved_by_actor_id = $2::uuid,
                    resolved_at = NOW(), safe_resolution_comment = $3
                WHERE sync_run_id = $1::uuid AND entity_type <> 'PRICE'
                  AND resolution = 'PENDING'
              `,
              [payload.syncRunId, payload.approvedByActorId, payload.approvalReason],
            );
          }
          await appendAudit(client, {
            action: 'CATALOG_VERSION_APPROVED',
            actorId: payload.approvedByActorId,
            correlationId: payload.correlationId,
            reasonCode: 'OWNER_APPROVED_EXACT_CHECKSUM',
            targetId: payload.catalogVersionId,
            targetType: 'CATALOG_VERSION',
          });
        }

        if (
          payload.priceVersionId !== undefined &&
          payload.expectedPriceDifferenceChecksum !== undefined
        ) {
          const price = await client.query<{
            approved_by_actor_id: string | null;
            difference_checksum: string;
            status: string;
            sync_run_id: string;
          }>(
            `
              SELECT status::text, difference_checksum, sync_run_id::text,
                     approved_by_actor_id::text
              FROM price_version WHERE id = $1::uuid FOR UPDATE
            `,
            [payload.priceVersionId],
          );
          const version = price.rows[0];
          if (
            version === undefined ||
            version.sync_run_id !== payload.syncRunId ||
            version.difference_checksum !== payload.expectedPriceDifferenceChecksum ||
            !['AWAITING_APPROVAL', 'APPROVED'].includes(version.status) ||
            (version.status === 'APPROVED' &&
              version.approved_by_actor_id !== payload.approvedByActorId)
          ) {
            throw new CatalogPipelineError('CATALOG_PIPELINE_VERSION_CONFLICT');
          }
          if (version.status === 'AWAITING_APPROVAL') {
            await client.query(
              `
                UPDATE price_version
                SET status = 'APPROVED', approved_by_actor_id = $2::uuid,
                    approved_at = NOW(),
                    source_manifest = source_manifest || jsonb_build_object(
                      'governance', COALESCE(source_manifest->'governance', '{}'::jsonb) ||
                        jsonb_build_object(
                          'approval', jsonb_build_object(
                            'actorId', $2::text, 'reason', $3::text, 'recordedAt', NOW()
                          )
                        )
                    )
                WHERE id = $1::uuid
              `,
              [payload.priceVersionId, payload.approvedByActorId, payload.approvalReason],
            );
            await client.query(
              `
                UPDATE catalog_sync_difference
                SET resolution = 'APPROVED', resolved_by_actor_id = $2::uuid,
                    resolved_at = NOW(), safe_resolution_comment = $3
                WHERE sync_run_id = $1::uuid AND entity_type = 'PRICE'
                  AND resolution = 'PENDING'
              `,
              [payload.syncRunId, payload.approvedByActorId, payload.approvalReason],
            );
          }
          await appendAudit(client, {
            action: 'PRICE_VERSION_APPROVED',
            actorId: payload.approvedByActorId,
            correlationId: payload.correlationId,
            reasonCode: 'OWNER_APPROVED_EXACT_CHECKSUM',
            targetId: payload.priceVersionId,
            targetType: 'PRICE_VERSION',
          });
        }
        await client.query(
          `
            UPDATE catalog_sync_run
            SET audit_context = audit_context || jsonb_build_object(
                  'versionApproval', jsonb_build_object(
                    'actorId', $2::text, 'reason', $3::text, 'recordedAt', NOW()
                  )
                ),
                updated_at = NOW()
            WHERE id = $1::uuid
          `,
          [payload.syncRunId, payload.approvedByActorId, payload.approvalReason],
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    });
  } catch (error) {
    await recordGovernanceEvent(helpers, {
      action: 'CATALOG_VERSION_APPROVAL_FAILED',
      actorId: payload.approvedByActorId,
      correlationId: payload.correlationId,
      outcome: 'FAILED',
      reasonCode: error instanceof CatalogPipelineError ? error.code : 'CATALOG_PIPELINE_DATABASE',
      targetId,
      targetType: 'CATALOG_RELEASE',
    });
    throw toCatalogPipelineError(error);
  }
}

async function assertCatalogActivationReady(
  client: PoolClient,
  catalogVersionId: string,
): Promise<void> {
  const result = await client.query<{
    composition_count: string;
    entry_count: string;
    invalid_count: string;
  }>(
    `
      SELECT
        COALESCE(jsonb_array_length(version.source_manifest->'composition'), 0)::text
          AS composition_count,
        count(entry.id)::text AS entry_count,
        count(entry.id) FILTER (
          WHERE publication.status = 'PUBLISHED' AND (
            business.visibility <> 'VISIBLE'
            OR business.manual_review_state <> 'APPROVED'
            OR availability.status IN ('UNREVIEWED', 'HIDDEN')
            OR (
              business.entity_type = 'MATERIAL_VARIANT' AND (
                entry.primary_media_asset_id IS NULL
                OR media.rights_status NOT IN ('PARTNER_LICENSE', 'OWNER_CREATED')
                OR media.publication_status <> 'PUBLICATION_APPROVED'
                OR (entry.source_price_record_id IS NULL
                    AND entry.local_price_override_id IS NULL)
              )
            )
          )
        )::text AS invalid_count
      FROM catalog_version version
      LEFT JOIN catalog_version_entry entry ON entry.catalog_version_id = version.id
      LEFT JOIN business_catalog_entry business ON business.id = entry.business_catalog_entry_id
      LEFT JOIN publication_record publication ON publication.id = entry.publication_record_id
      LEFT JOIN availability_record availability ON availability.id = entry.availability_record_id
      LEFT JOIN media_asset media ON media.id = entry.primary_media_asset_id
      WHERE version.id = $1::uuid
      GROUP BY version.id
    `,
    [catalogVersionId],
  );
  const readiness = result.rows[0];
  if (
    readiness === undefined ||
    Number(readiness.composition_count) === 0 ||
    Number(readiness.entry_count) === 0 ||
    Number(readiness.invalid_count) > 0
  ) {
    throw new CatalogPipelineError('CATALOG_PIPELINE_VERSION_NOT_READY');
  }
}

export async function activateCatalogVersions(
  payload: CatalogActivateVersionPayload,
  helpers: JobHelpers,
): Promise<void> {
  const targetId = payload.catalogVersionId ?? payload.priceVersionId ?? payload.syncRunId;
  await authorizeGovernanceActor(helpers, {
    actorId: payload.activatedByActorId,
    allowedRoles: ['ADMIN', 'OWNER'],
    correlationId: payload.correlationId,
    requestedAction: 'CATALOG_VERSION_ACTIVATION_REQUESTED',
    targetId,
    targetType: 'CATALOG_RELEASE',
  });
  try {
    await helpers.withPgClient(async (client) => {
      await client.query('BEGIN');
      try {
        await client.query("SELECT pg_advisory_xact_lock(hashtext('catalog-public-activation'))");
        if (
          payload.catalogVersionId !== undefined &&
          payload.expectedCatalogDifferenceChecksum !== undefined
        ) {
          const candidateResult = await client.query<{
            activated_by_actor_id: string | null;
            difference_checksum: string;
            predecessor_id: string | null;
            status: string;
            sync_run_id: string;
          }>(
            `
              SELECT status::text, difference_checksum, predecessor_id::text, sync_run_id::text,
                     activated_by_actor_id::text
              FROM catalog_version WHERE id = $1::uuid FOR UPDATE
            `,
            [payload.catalogVersionId],
          );
          const candidate = candidateResult.rows[0];
          if (
            candidate === undefined ||
            candidate.sync_run_id !== payload.syncRunId ||
            candidate.difference_checksum !== payload.expectedCatalogDifferenceChecksum ||
            !['APPROVED', 'ACTIVE'].includes(candidate.status) ||
            (candidate.status === 'ACTIVE' &&
              candidate.activated_by_actor_id !== payload.activatedByActorId)
          ) {
            throw new CatalogPipelineError('CATALOG_PIPELINE_VERSION_CONFLICT');
          }
          if (candidate.status !== 'ACTIVE') {
            await assertCatalogActivationReady(client, payload.catalogVersionId);
            const active = await client.query<{ id: string }>(
              `
                SELECT id::text FROM catalog_version
                WHERE status = 'ACTIVE' AND activation_key = 'PUBLIC'
                FOR UPDATE
              `,
            );
            const activeId = active.rows[0]?.id ?? null;
            if (candidate.predecessor_id !== activeId) {
              throw new CatalogPipelineError('CATALOG_PIPELINE_VERSION_CONFLICT');
            }
            if (activeId !== null) {
              await client.query(
                `
                  UPDATE catalog_version
                  SET status = 'SUPERSEDED', activation_key = NULL
                  WHERE id = $1::uuid
                `,
                [activeId],
              );
            }
            await client.query(
              `
                UPDATE catalog_version
                SET status = 'ACTIVE', activation_key = 'PUBLIC', published_at = NOW(),
                    activated_by_actor_id = $2::uuid, activated_at = NOW(),
                    source_manifest = source_manifest || jsonb_build_object(
                      'governance', COALESCE(source_manifest->'governance', '{}'::jsonb) ||
                        jsonb_build_object(
                          'activation', jsonb_build_object(
                            'actorId', $2::text, 'reason', $3::text, 'recordedAt', NOW()
                          )
                        )
                    )
                WHERE id = $1::uuid
              `,
              [payload.catalogVersionId, payload.activatedByActorId, payload.activationReason],
            );
          }
          await appendAudit(client, {
            action: 'CATALOG_VERSION_ACTIVATED',
            actorId: payload.activatedByActorId,
            correlationId: payload.correlationId,
            reasonCode: 'ADMIN_ACTIVATED_APPROVED_CHECKSUM',
            targetId: payload.catalogVersionId,
            targetType: 'CATALOG_VERSION',
          });
          await client.query(
            `
              INSERT INTO outbox_event (
                topic, schema_version, payload, idempotency_key, correlation_id
              ) VALUES (
                'catalog.version.activated', 1,
                jsonb_build_object(
                  'catalogVersionId', $1::text, 'reason', $3::text
                ),
                'catalog-version-activated:' || $1::text, $2
              ) ON CONFLICT (idempotency_key) DO NOTHING
            `,
            [payload.catalogVersionId, payload.correlationId, payload.activationReason],
          );
        }

        if (
          payload.priceVersionId !== undefined &&
          payload.expectedPriceDifferenceChecksum !== undefined
        ) {
          const candidateResult = await client.query<{
            activated_by_actor_id: string | null;
            difference_checksum: string;
            predecessor_id: string | null;
            status: string;
            sync_run_id: string;
          }>(
            `
              SELECT status::text, difference_checksum, predecessor_id::text, sync_run_id::text,
                     activated_by_actor_id::text
              FROM price_version WHERE id = $1::uuid FOR UPDATE
            `,
            [payload.priceVersionId],
          );
          const candidate = candidateResult.rows[0];
          if (
            candidate === undefined ||
            candidate.sync_run_id !== payload.syncRunId ||
            candidate.difference_checksum !== payload.expectedPriceDifferenceChecksum ||
            !['APPROVED', 'ACTIVE'].includes(candidate.status) ||
            (candidate.status === 'ACTIVE' &&
              candidate.activated_by_actor_id !== payload.activatedByActorId)
          ) {
            throw new CatalogPipelineError('CATALOG_PIPELINE_VERSION_CONFLICT');
          }
          if (candidate.status !== 'ACTIVE') {
            const recordCount = await client.query<{ count: string }>(
              'SELECT count(*)::text AS count FROM price_version_record WHERE price_version_id = $1::uuid',
              [payload.priceVersionId],
            );
            if (Number(recordCount.rows[0]?.count ?? '0') === 0) {
              throw new CatalogPipelineError('CATALOG_PIPELINE_VERSION_NOT_READY');
            }
            const active = await client.query<{ id: string }>(
              `
                SELECT id::text FROM price_version
                WHERE status = 'ACTIVE' AND activation_key = 'PUBLIC'
                FOR UPDATE
              `,
            );
            const activeId = active.rows[0]?.id ?? null;
            if (candidate.predecessor_id !== activeId) {
              throw new CatalogPipelineError('CATALOG_PIPELINE_VERSION_CONFLICT');
            }
            if (activeId !== null) {
              await client.query(
                `UPDATE price_version SET status = 'SUPERSEDED', activation_key = NULL
                 WHERE id = $1::uuid`,
                [activeId],
              );
            }
            await client.query(
              `
                UPDATE price_version
                SET status = 'ACTIVE', activation_key = 'PUBLIC',
                    activated_by_actor_id = $2::uuid, activated_at = NOW(),
                    source_manifest = source_manifest || jsonb_build_object(
                      'governance', COALESCE(source_manifest->'governance', '{}'::jsonb) ||
                        jsonb_build_object(
                          'activation', jsonb_build_object(
                            'actorId', $2::text, 'reason', $3::text, 'recordedAt', NOW()
                          )
                        )
                    )
                WHERE id = $1::uuid
              `,
              [payload.priceVersionId, payload.activatedByActorId, payload.activationReason],
            );
          }
          await appendAudit(client, {
            action: 'PRICE_VERSION_ACTIVATED',
            actorId: payload.activatedByActorId,
            correlationId: payload.correlationId,
            reasonCode: 'ADMIN_ACTIVATED_APPROVED_CHECKSUM',
            targetId: payload.priceVersionId,
            targetType: 'PRICE_VERSION',
          });
          await client.query(
            `
              INSERT INTO outbox_event (
                topic, schema_version, payload, idempotency_key, correlation_id
              ) VALUES (
                'catalog.price-version.activated', 1,
                jsonb_build_object(
                  'priceVersionId', $1::text, 'reason', $3::text
                ),
                'price-version-activated:' || $1::text, $2
              ) ON CONFLICT (idempotency_key) DO NOTHING
            `,
            [payload.priceVersionId, payload.correlationId, payload.activationReason],
          );
        }
        await client.query(
          `
            UPDATE catalog_sync_run
            SET status = 'COMPLETED', completed_at = NOW(), error_code = NULL,
                last_heartbeat_at = NOW(),
                audit_context = audit_context || jsonb_build_object(
                  'versionActivation', jsonb_build_object(
                    'actorId', $2::text, 'reason', $3::text, 'recordedAt', NOW()
                  )
                ),
                updated_at = NOW()
            WHERE id = $1::uuid
          `,
          [payload.syncRunId, payload.activatedByActorId, payload.activationReason],
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    });
  } catch (error) {
    await recordGovernanceEvent(helpers, {
      action: 'CATALOG_VERSION_ACTIVATION_FAILED',
      actorId: payload.activatedByActorId,
      correlationId: payload.correlationId,
      outcome: 'FAILED',
      reasonCode: error instanceof CatalogPipelineError ? error.code : 'CATALOG_PIPELINE_DATABASE',
      targetId,
      targetType: 'CATALOG_RELEASE',
    });
    throw toCatalogPipelineError(error);
  }
}

export async function rollbackCatalogVersions(
  payload: CatalogRollbackVersionPayload,
  helpers: JobHelpers,
): Promise<void> {
  const targetId =
    payload.catalogRollbackTargetId ?? payload.priceRollbackTargetId ?? payload.catalogSourceId;
  await authorizeGovernanceActor(helpers, {
    actorId: payload.approvedByActorId,
    allowedRoles: ['OWNER'],
    correlationId: payload.correlationId,
    requestedAction: 'CATALOG_ROLLBACK_APPROVAL_REQUESTED',
    targetId,
    targetType: 'CATALOG_RELEASE',
  });
  await authorizeGovernanceActor(helpers, {
    actorId: payload.rolledBackByActorId,
    allowedRoles: ['ADMIN', 'OWNER'],
    correlationId: payload.correlationId,
    requestedAction: 'CATALOG_ROLLBACK_ACTIVATION_REQUESTED',
    targetId,
    targetType: 'CATALOG_RELEASE',
  });
  try {
    await helpers.withPgClient(async (client) => {
      await client.query('BEGIN');
      try {
        await client.query("SELECT pg_advisory_xact_lock(hashtext('catalog-public-activation'))");
        if (
          payload.expectedActiveCatalogVersionId !== undefined &&
          payload.catalogRollbackTargetId !== undefined
        ) {
          const current = await client.query<{
            activation_key: string | null;
            rollback_target_id: string | null;
            status: string;
            sync_run_id: string;
          }>(
            `
              SELECT rollback_target_id::text, status::text, activation_key,
                     sync_run_id::text
              FROM catalog_version
              WHERE id = $1::uuid
              FOR UPDATE
            `,
            [payload.expectedActiveCatalogVersionId],
          );
          const target = await client.query<{ activation_key: string | null; status: string }>(
            `
              SELECT status::text, activation_key FROM catalog_version
              WHERE id = $1::uuid AND approved_by_actor_id IS NOT NULL
              FOR UPDATE
            `,
            [payload.catalogRollbackTargetId],
          );
          const currentVersion = current.rows[0];
          const targetVersion = target.rows[0];
          const alreadyRolledBack =
            currentVersion?.status === 'SUPERSEDED' &&
            targetVersion?.status === 'ACTIVE' &&
            targetVersion.activation_key === 'PUBLIC';
          const canRollback =
            currentVersion?.status === 'ACTIVE' &&
            currentVersion.activation_key === 'PUBLIC' &&
            currentVersion.rollback_target_id === payload.catalogRollbackTargetId &&
            targetVersion?.status === 'SUPERSEDED';
          if (!alreadyRolledBack && !canRollback) {
            throw new CatalogPipelineError('CATALOG_PIPELINE_VERSION_CONFLICT');
          }
          if (!alreadyRolledBack) {
            await client.query(
              `UPDATE catalog_version SET status = 'SUPERSEDED', activation_key = NULL
               WHERE id = $1::uuid`,
              [payload.expectedActiveCatalogVersionId],
            );
            await client.query(
              `UPDATE catalog_version SET status = 'ACTIVE', activation_key = 'PUBLIC'
               WHERE id = $1::uuid`,
              [payload.catalogRollbackTargetId],
            );
          }
          await client.query(
            `
              UPDATE catalog_sync_run
              SET audit_context = audit_context || jsonb_build_object(
                    'lastCatalogRollback', jsonb_build_object(
                      'approvedByActorId', $2::text,
                      'rolledBackByActorId', $3::text,
                      'fromVersionId', $4::text,
                      'toVersionId', $5::text,
                      'reason', $6::text,
                      'recordedAt', NOW()
                    )
                  ),
                  updated_at = NOW()
              WHERE id = $1::uuid
            `,
            [
              currentVersion?.sync_run_id,
              payload.approvedByActorId,
              payload.rolledBackByActorId,
              payload.expectedActiveCatalogVersionId,
              payload.catalogRollbackTargetId,
              payload.rollbackReason,
            ],
          );
          await appendAudit(client, {
            action: 'CATALOG_VERSION_ROLLED_BACK',
            actorId: payload.rolledBackByActorId,
            correlationId: payload.correlationId,
            reasonCode: 'OWNER_APPROVED_ADMIN_ROLLBACK',
            targetId: payload.catalogRollbackTargetId,
            targetType: 'CATALOG_VERSION',
          });
        }
        if (
          payload.expectedActivePriceVersionId !== undefined &&
          payload.priceRollbackTargetId !== undefined
        ) {
          const current = await client.query<{
            activation_key: string | null;
            rollback_target_id: string | null;
            status: string;
            sync_run_id: string;
          }>(
            `
              SELECT rollback_target_id::text, status::text, activation_key,
                     sync_run_id::text
              FROM price_version
              WHERE id = $1::uuid
              FOR UPDATE
            `,
            [payload.expectedActivePriceVersionId],
          );
          const target = await client.query<{ activation_key: string | null; status: string }>(
            `
              SELECT status::text, activation_key FROM price_version
              WHERE id = $1::uuid AND approved_by_actor_id IS NOT NULL
              FOR UPDATE
            `,
            [payload.priceRollbackTargetId],
          );
          const currentVersion = current.rows[0];
          const targetVersion = target.rows[0];
          const alreadyRolledBack =
            currentVersion?.status === 'SUPERSEDED' &&
            targetVersion?.status === 'ACTIVE' &&
            targetVersion.activation_key === 'PUBLIC';
          const canRollback =
            currentVersion?.status === 'ACTIVE' &&
            currentVersion.activation_key === 'PUBLIC' &&
            currentVersion.rollback_target_id === payload.priceRollbackTargetId &&
            targetVersion?.status === 'SUPERSEDED';
          if (!alreadyRolledBack && !canRollback) {
            throw new CatalogPipelineError('CATALOG_PIPELINE_VERSION_CONFLICT');
          }
          if (!alreadyRolledBack) {
            await client.query(
              `UPDATE price_version SET status = 'SUPERSEDED', activation_key = NULL
               WHERE id = $1::uuid`,
              [payload.expectedActivePriceVersionId],
            );
            await client.query(
              `UPDATE price_version SET status = 'ACTIVE', activation_key = 'PUBLIC'
               WHERE id = $1::uuid`,
              [payload.priceRollbackTargetId],
            );
          }
          await client.query(
            `
              UPDATE catalog_sync_run
              SET audit_context = audit_context || jsonb_build_object(
                    'lastPriceRollback', jsonb_build_object(
                      'approvedByActorId', $2::text,
                      'rolledBackByActorId', $3::text,
                      'fromVersionId', $4::text,
                      'toVersionId', $5::text,
                      'reason', $6::text,
                      'recordedAt', NOW()
                    )
                  ),
                  updated_at = NOW()
              WHERE id = $1::uuid
            `,
            [
              currentVersion?.sync_run_id,
              payload.approvedByActorId,
              payload.rolledBackByActorId,
              payload.expectedActivePriceVersionId,
              payload.priceRollbackTargetId,
              payload.rollbackReason,
            ],
          );
          await appendAudit(client, {
            action: 'PRICE_VERSION_ROLLED_BACK',
            actorId: payload.rolledBackByActorId,
            correlationId: payload.correlationId,
            reasonCode: 'OWNER_APPROVED_ADMIN_ROLLBACK',
            targetId: payload.priceRollbackTargetId,
            targetType: 'PRICE_VERSION',
          });
        }
        await client.query(
          `
            INSERT INTO outbox_event (
              topic, schema_version, payload, idempotency_key, correlation_id
            ) VALUES (
              'catalog.version.rollback', 1,
              jsonb_build_object(
                 'catalogVersionId', $1::text,
                 'priceVersionId', $2::text,
                 'approvedByActorId', $5::text,
                 'rolledBackByActorId', $6::text,
                 'reason', $7::text
              ),
              'catalog-version-rollback:' || $3, $4
            ) ON CONFLICT (idempotency_key) DO NOTHING
          `,
          [
            payload.catalogRollbackTargetId ?? null,
            payload.priceRollbackTargetId ?? null,
            payload.idempotencyKey,
            payload.correlationId,
            payload.approvedByActorId,
            payload.rolledBackByActorId,
            payload.rollbackReason,
          ],
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    });
  } catch (error) {
    await recordGovernanceEvent(helpers, {
      action: 'CATALOG_VERSION_ROLLBACK_FAILED',
      actorId: payload.rolledBackByActorId,
      correlationId: payload.correlationId,
      outcome: 'FAILED',
      reasonCode: error instanceof CatalogPipelineError ? error.code : 'CATALOG_PIPELINE_DATABASE',
      targetId,
      targetType: 'CATALOG_RELEASE',
    });
    throw toCatalogPipelineError(error);
  }
}
