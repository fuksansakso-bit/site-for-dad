import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

import {
  amigoPilotCatalogSourceId,
  hashCanonicalSource,
} from '../../packages/catalog/dist/index.js';
import {
  parseDatabaseEnvironment,
  parseStorageEnvironment,
} from '../../packages/config/dist/server.js';
import { createPrismaClient } from '../../packages/db/dist/client.js';
import { createS3ObjectStorage } from '../../packages/storage/dist/index.js';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const expected = {
  categories: 28,
  colors: 289,
  families: 15,
  materialMediaReferences: 2_940,
  materials: 451,
  materialVariants: 1_655,
  mediaManifests: 1_655,
  mediaReferences: 3_053,
  mediaSyncItems: 4_708,
  models: 9,
  normalizedItems: 21_019,
  pages: 114,
  priceSnapshots: 1_664,
  properties: 12_144,
  snapshots: 5_181,
  systems: 56,
  warnings: 28,
};

function invariant(condition, code) {
  if (!condition) throw new Error(code);
}

function asRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : null;
}

function integer(value) {
  return typeof value === 'bigint' ? Number(value) : Number(value ?? 0);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function mapBounded(values, concurrency, operation) {
  const result = new Array(values.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      result[index] = await operation(values[index], index);
    }
  });
  await Promise.all(workers);
  return result;
}

function sampleEvenly(values, maximum) {
  if (values.length <= maximum) return [...values];
  const result = [];
  for (let index = 0; index < maximum; index += 1) {
    result.push(values[Math.floor((index * (values.length - 1)) / (maximum - 1))]);
  }
  return result;
}

async function readPublicCatalog(publicBaseUrl) {
  const items = [];
  let cursor;
  let firstPage;
  let pageCount = 0;
  const startedAt = performance.now();
  do {
    const url = new URL('/api/v1/catalog/materials', publicBaseUrl);
    url.searchParams.set('limit', '50');
    if (cursor !== undefined) url.searchParams.set('cursor', cursor);
    const response = await fetch(url);
    const text = await response.text();
    invariant(response.status === 200, 'FULL_PUBLIC_CATALOG_HTTP_FAILED');
    invariant(
      !/objectKey|sourceHash|S3_|catalog\/private|shop\.amigo\.ru/i.test(text),
      'FULL_PUBLIC_INTERNAL_DATA_LEAK',
    );
    const page = JSON.parse(text);
    firstPage ??= page;
    invariant(Array.isArray(page.items), 'FULL_PUBLIC_CATALOG_SHAPE_INVALID');
    items.push(...page.items);
    cursor = typeof page.nextCursor === 'string' ? page.nextCursor : undefined;
    pageCount += 1;
    invariant(pageCount <= 100, 'FULL_PUBLIC_PAGINATION_UNBOUNDED');
  } while (cursor !== undefined);
  return {
    durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
    firstPage,
    items,
    pageCount,
  };
}

const databaseEnvironment = parseDatabaseEnvironment(process.env);
const storageEnvironment = parseStorageEnvironment(process.env);
const prisma = createPrismaClient(databaseEnvironment);
const storage = createS3ObjectStorage(storageEnvironment);
const publicBaseUrl = new URL(process.env.CATALOG_PUBLIC_BASE_URL ?? 'http://127.0.0.1:3000');

try {
  const selectedRunId =
    process.env.CATALOG_FULL_RUN_ID ??
    (
      await prisma.catalogVersion.findFirst({
        select: { syncRunId: true },
        where: { activationKey: 'PUBLIC', status: 'ACTIVE' },
      })
    )?.syncRunId;
  invariant(typeof selectedRunId === 'string', 'FULL_RUN_MISSING');

  const [
    selectedRun,
    importManifest,
    catalogVersion,
    priceVersion,
    checkpoints,
    itemGroups,
    differenceGroups,
    reviewBatchCount,
    bulkCommandCount,
    activeCatalogCount,
    activePriceCount,
  ] = await Promise.all([
    prisma.catalogSyncRun.findUnique({ where: { id: selectedRunId } }),
    prisma.catalogImportManifest.findUnique({ where: { syncRunId: selectedRunId } }),
    prisma.catalogVersion.findFirst({ where: { syncRunId: selectedRunId } }),
    prisma.priceVersion.findFirst({ where: { syncRunId: selectedRunId } }),
    prisma.catalogSyncCheckpoint.findMany({
      orderBy: [{ stage: 'asc' }, { partitionKey: 'asc' }],
      where: { syncRunId: selectedRunId },
    }),
    prisma.catalogSyncItem.groupBy({
      by: ['sourceType', 'status'],
      _count: { _all: true },
      where: { syncRunId: selectedRunId },
    }),
    prisma.catalogSyncDifference.groupBy({
      by: ['entityType', 'resolution', 'type'],
      _count: { _all: true },
      where: { syncRunId: selectedRunId },
    }),
    prisma.catalogDifferenceReviewBatch.count({ where: { syncRunId: selectedRunId } }),
    prisma.catalogBulkCommand.count({ where: { syncRunId: selectedRunId } }),
    prisma.catalogVersion.count({ where: { activationKey: 'PUBLIC', status: 'ACTIVE' } }),
    prisma.priceVersion.count({ where: { activationKey: 'PUBLIC', status: 'ACTIVE' } }),
  ]);

  invariant(selectedRun?.status === 'COMPLETED', 'FULL_RUN_NOT_COMPLETED');
  invariant(
    selectedRun.errorCode === null &&
      selectedRun.errorCount === 0 &&
      selectedRun.discoveredCount === expected.normalizedItems &&
      selectedRun.processedCount === expected.normalizedItems,
    'FULL_RUN_COUNTS_INVALID',
  );
  invariant(
    importManifest?.complete === true && importManifest.status === 'COMPLETE',
    'FULL_MANIFEST_INCOMPLETE',
  );
  invariant(
    hashCanonicalSource(importManifest.safeManifest) === importManifest.manifestChecksum,
    'FULL_MANIFEST_CHECKSUM_INVALID',
  );
  const safeManifest = asRecord(importManifest.safeManifest);
  const manifestCounts = asRecord(safeManifest?.counts);
  const discovery = asRecord(safeManifest?.discovery);
  const discoveryCounts = asRecord(discovery?.counts);
  invariant(safeManifest?.syncRunId === selectedRunId, 'FULL_MANIFEST_RUN_MISMATCH');
  invariant(
    safeManifest?.catalogSourceId === amigoPilotCatalogSourceId,
    'FULL_MANIFEST_SOURCE_MISMATCH',
  );
  invariant(
    safeManifest?.complete === true && safeManifest.status === 'COMPLETE',
    'FULL_MANIFEST_STATUS_INVALID',
  );
  invariant(discovery?.complete === true, 'FULL_DISCOVERY_INCOMPLETE');
  invariant(discoveryCounts?.pages === expected.pages, 'FULL_DISCOVERY_PAGE_COUNT_INVALID');
  invariant(
    discoveryCounts?.categories === expected.categories,
    'FULL_DISCOVERY_CATEGORY_COUNT_INVALID',
  );
  invariant(discoveryCounts?.systems === expected.systems, 'FULL_DISCOVERY_SYSTEM_COUNT_INVALID');
  invariant(discoveryCounts?.models === expected.models, 'FULL_DISCOVERY_MODEL_COUNT_INVALID');
  invariant(
    discoveryCounts?.materialVariants === expected.materialVariants,
    'FULL_DISCOVERY_VARIANT_COUNT_INVALID',
  );
  for (const [name, count] of Object.entries({
    categories: expected.categories,
    materialVariants: expected.materialVariants,
    mediaManifests: expected.mediaManifests,
    mediaReferences: expected.mediaReferences,
    models: expected.models,
    pages: expected.pages,
    priceSnapshots: expected.priceSnapshots,
    snapshots: expected.snapshots,
    systems: expected.systems,
  })) {
    invariant(manifestCounts?.[name] === count, `FULL_MANIFEST_${name.toUpperCase()}_INVALID`);
  }
  invariant(manifestCounts?.failures === 0, 'FULL_MANIFEST_FAILURES_PRESENT');
  invariant(manifestCounts?.warnings === expected.warnings, 'FULL_MANIFEST_WARNING_COUNT_INVALID');
  invariant(manifestCounts?.duplicates === 0, 'FULL_MANIFEST_DUPLICATES_PRESENT');
  invariant(manifestCounts?.skips === 0, 'FULL_MANIFEST_SKIPS_PRESENT');
  invariant(manifestCounts?.sourceRemoved === 0, 'FULL_MANIFEST_UNEXPECTED_REMOVAL');
  invariant(
    manifestCounts?.normalizedItems === expected.normalizedItems,
    'FULL_NORMALIZED_ITEM_COUNT_INVALID',
  );
  invariant(
    manifestCounts?.mediaImported === expected.mediaReferences,
    'FULL_MEDIA_IMPORT_COUNT_INVALID',
  );
  invariant(
    manifestCounts?.priceRecords === expected.priceSnapshots,
    'FULL_PRICE_RECORD_COUNT_INVALID',
  );
  invariant(
    checkpoints.length === 8 &&
      checkpoints.every(
        (checkpoint) =>
          checkpoint.status === 'COMPLETED' &&
          checkpoint.errorCount === 0 &&
          checkpoint.processedCount === checkpoint.expectedCount,
      ),
    'FULL_CHECKPOINTS_INCOMPLETE',
  );
  invariant(
    itemGroups.every((group) => !['FAILED', 'MEDIA_ERROR', 'PARSE_ERROR'].includes(group.status)),
    'FULL_ITEM_FAILURES_PRESENT',
  );
  const itemCounts = Object.fromEntries(
    itemGroups
      .map((group) => [group.sourceType, group._count._all])
      .reduce((entries, entry) => {
        const [sourceType, count] = entry;
        entries.set(sourceType, (entries.get(sourceType) ?? 0) + count);
        return entries;
      }, new Map()),
  );
  for (const [sourceType, count] of Object.entries({
    CATEGORY: expected.categories,
    COLOR: expected.colors,
    FAMILY: expected.families,
    MATERIAL: expected.materials,
    MATERIAL_VARIANT: expected.materialVariants,
    MEDIA: expected.mediaSyncItems,
    MODEL: expected.models,
    PRICE: expected.priceSnapshots,
    PROPERTY: expected.properties,
    SYSTEM: expected.systems,
  })) {
    invariant(itemCounts[sourceType] === count, `FULL_ITEM_${sourceType}_COUNT_INVALID`);
  }
  invariant(
    differenceGroups.length > 0 &&
      differenceGroups.every((group) => group.resolution === 'APPROVED'),
    'FULL_DIFFERENCE_REVIEW_INCOMPLETE',
  );
  invariant(reviewBatchCount >= 2, 'FULL_REVIEW_BATCHES_MISSING');
  invariant(bulkCommandCount >= 2, 'FULL_REAL_BULK_EVIDENCE_MISSING');

  invariant(
    catalogVersion?.status === 'ACTIVE' && catalogVersion.activationKey === 'PUBLIC',
    'FULL_CATALOG_VERSION_NOT_ACTIVE',
  );
  invariant(
    priceVersion?.status === 'ACTIVE' && priceVersion.activationKey === 'PUBLIC',
    'FULL_PRICE_VERSION_NOT_ACTIVE',
  );
  invariant(activeCatalogCount === 1 && activePriceCount === 1, 'FULL_ACTIVE_POINTER_NOT_UNIQUE');
  invariant(catalogVersion.approvedByActorId !== null, 'FULL_CATALOG_OWNER_APPROVAL_MISSING');
  invariant(catalogVersion.activatedByActorId !== null, 'FULL_CATALOG_ADMIN_ACTIVATION_MISSING');
  invariant(priceVersion.approvedByActorId !== null, 'FULL_PRICE_OWNER_APPROVAL_MISSING');
  invariant(priceVersion.activatedByActorId !== null, 'FULL_PRICE_ADMIN_ACTIVATION_MISSING');

  const selectedAudit = asRecord(selectedRun.auditContext);
  invariant(typeof selectedAudit?.retryOfSyncRunId === 'string', 'FULL_RECOVERY_RUN_MISSING');
  const recoveryLineage = [];
  let ancestorRunId = selectedAudit.retryOfSyncRunId;
  for (let depth = 0; depth < 8 && typeof ancestorRunId === 'string'; depth += 1) {
    const [run, runCheckpoints, manifest] = await Promise.all([
      prisma.catalogSyncRun.findUnique({ where: { id: ancestorRunId } }),
      prisma.catalogSyncCheckpoint.findMany({ where: { syncRunId: ancestorRunId } }),
      prisma.catalogImportManifest.findUnique({ where: { syncRunId: ancestorRunId } }),
    ]);
    invariant(run !== null, 'FULL_RECOVERY_LINEAGE_MISSING');
    recoveryLineage.push({ checkpoints: runCheckpoints, manifest, run });
    ancestorRunId = asRecord(run.auditContext)?.retryOfSyncRunId;
  }
  const requestedRecoveryRunId = process.env.CATALOG_FULL_RECOVERY_RUN_ID;
  const recoveryEvidence =
    requestedRecoveryRunId === undefined
      ? recoveryLineage.find(
          (entry) =>
            entry.checkpoints.reduce((total, checkpoint) => total + checkpoint.resumeCount, 0) > 0,
        )
      : recoveryLineage.find((entry) => entry.run.id === requestedRecoveryRunId);
  invariant(recoveryEvidence !== undefined, 'FULL_RECOVERY_RUN_INVALID');
  const {
    checkpoints: recoveryCheckpoints,
    manifest: recoveryManifest,
    run: recoveryRun,
  } = recoveryEvidence;
  invariant(
    recoveryCheckpoints.reduce((total, checkpoint) => total + checkpoint.resumeCount, 0) > 0,
    'FULL_REAL_RESUME_EVIDENCE_MISSING',
  );
  invariant(
    recoveryManifest !== null &&
      hashCanonicalSource(recoveryManifest.safeManifest) === recoveryManifest.manifestChecksum,
    'FULL_RECOVERY_MANIFEST_INVALID',
  );

  const catalogManifest = asRecord(catalogVersion.sourceManifest);
  const composition = catalogManifest?.composition;
  invariant(Array.isArray(composition), 'FULL_COMPOSITION_MISSING');
  const compositionVariants = composition.filter(
    (entry) => asRecord(entry)?.entityType === 'MATERIAL_VARIANT',
  );
  invariant(
    compositionVariants.length === expected.materialVariants,
    'FULL_COMPOSITION_VARIANTS_INVALID',
  );
  invariant(
    composition.length === expected.categories + expected.systems + expected.materialVariants,
    'FULL_COMPOSITION_COUNT_INVALID',
  );

  const [
    versionEntryCount,
    priceRecordCount,
    databaseCounts,
    duplicateIdentities,
    overlayState,
    mediaAssets,
  ] = await Promise.all([
    prisma.catalogVersionEntry.count({ where: { catalogVersionId: catalogVersion.id } }),
    prisma.priceVersionRecord.count({ where: { priceVersionId: priceVersion.id } }),
    prisma.$queryRawUnsafe(
      `SELECT
           (SELECT count(*)::int FROM source_media_asset media
             JOIN catalog_sync_item item ON item.source_entity_id = media.source_entity_id
            WHERE item.sync_run_id = $1::uuid AND item.source_type = 'MEDIA') AS source_media_count,
           (SELECT count(*)::int FROM material_media_asset placement
             JOIN source_media_asset media ON media.id = placement.source_media_asset_id
             JOIN catalog_sync_item item ON item.source_entity_id = media.source_entity_id
            WHERE item.sync_run_id = $1::uuid AND item.source_type = 'MEDIA') AS material_media_count,
           (SELECT count(*)::int FROM source_price_record price
             JOIN catalog_sync_item item ON item.source_entity_id = price.source_entity_id
             JOIN catalog_sync_run price_run ON price_run.id = item.sync_run_id
                                              AND price_run.source_version = price.source_version
            WHERE item.sync_run_id = $1::uuid AND item.source_type = 'PRICE'
              AND item.after_hash = price.source_hash) AS source_price_count,
           (SELECT count(*)::int FROM material_variant variant
             JOIN catalog_sync_item item ON item.source_entity_id = variant.source_entity_id
            WHERE item.sync_run_id = $1::uuid AND item.source_type = 'MATERIAL_VARIANT') AS variant_count,
           (SELECT count(*)::int FROM material_variant variant
             JOIN catalog_sync_item item ON item.source_entity_id = variant.source_entity_id
            WHERE item.sync_run_id = $1::uuid AND item.source_type = 'MATERIAL_VARIANT'
              AND NOT EXISTS (SELECT 1 FROM material_media_asset media
                               WHERE media.material_variant_id = variant.id)) AS missing_media_count`,
      selectedRunId,
    ),
    prisma.$queryRawUnsafe(
      `SELECT count(*)::int AS count FROM (
           SELECT catalog_source_id, source_type, source_id
           FROM source_entity GROUP BY catalog_source_id, source_type, source_id HAVING count(*) > 1
         ) duplicate`,
    ),
    prisma.$queryRawUnsafe(
      `SELECT
           count(*)::int AS entry_count,
           count(*) FILTER (WHERE business.visibility = 'VISIBLE')::int AS visible_count,
           count(*) FILTER (WHERE business.manual_review_state = 'APPROVED')::int AS approved_count,
           count(*) FILTER (WHERE availability.status = 'INQUIRY_ONLY')::int AS inquiry_count,
           count(*) FILTER (WHERE publication.status = 'PUBLISHED')::int AS published_count
         FROM catalog_version_entry entry
         JOIN business_catalog_entry business ON business.id = entry.business_catalog_entry_id
         JOIN availability_record availability ON availability.id = entry.availability_record_id
         JOIN publication_record publication ON publication.id = entry.publication_record_id
         WHERE entry.catalog_version_id = $1::uuid`,
      catalogVersion.id,
    ),
    prisma.$queryRawUnsafe(
      `SELECT DISTINCT asset.id::text, asset.file_hash, asset.storage_zone, asset.object_key,
                asset.mime_type, asset.byte_size, asset.rights_status::text,
                asset.publication_status::text
         FROM media_asset asset
         JOIN source_media_asset media ON media.media_asset_id = asset.id
         JOIN catalog_sync_item item ON item.source_entity_id = media.source_entity_id
         WHERE item.sync_run_id = $1::uuid AND item.source_type = 'MEDIA'
         ORDER BY asset.file_hash`,
      selectedRunId,
    ),
  ]);
  const counts = databaseCounts[0];
  const overlays = overlayState[0];
  invariant(versionEntryCount === composition.length, 'FULL_VERSION_ENTRY_COUNT_INVALID');
  invariant(
    priceRecordCount === expected.priceSnapshots,
    'FULL_PRICE_VERSION_RECORD_COUNT_INVALID',
  );
  invariant(
    integer(counts?.source_media_count) === expected.mediaReferences,
    'FULL_SOURCE_MEDIA_COUNT_INVALID',
  );
  invariant(
    integer(counts?.material_media_count) === expected.materialMediaReferences,
    'FULL_MEDIA_PLACEMENT_COUNT_INVALID',
  );
  invariant(
    integer(counts?.source_price_count) === expected.priceSnapshots,
    'FULL_SOURCE_PRICE_COUNT_INVALID',
  );
  invariant(
    integer(counts?.variant_count) === expected.materialVariants,
    'FULL_DATABASE_VARIANT_COUNT_INVALID',
  );
  invariant(integer(counts?.missing_media_count) === 0, 'FULL_VARIANT_MEDIA_MISSING');
  invariant(integer(duplicateIdentities[0]?.count) === 0, 'FULL_STABLE_IDENTITY_DUPLICATE');
  invariant(
    integer(overlays?.entry_count) === composition.length &&
      integer(overlays?.visible_count) === composition.length &&
      integer(overlays?.approved_count) === composition.length &&
      integer(overlays?.inquiry_count) === composition.length &&
      integer(overlays?.published_count) === composition.length,
    'FULL_DEFAULT_OVERLAY_INVALID',
  );
  invariant(
    mediaAssets.length > 0 && mediaAssets.length <= expected.mediaReferences,
    'FULL_MEDIA_DEDUP_COUNT_INVALID',
  );
  invariant(
    new Set(mediaAssets.map((asset) => asset.file_hash)).size === mediaAssets.length,
    'FULL_MEDIA_HASH_DUPLICATE',
  );
  invariant(
    mediaAssets.every(
      (asset) =>
        asset.storage_zone === 'private' &&
        asset.rights_status === 'PARTNER_LICENSE' &&
        asset.publication_status === 'PUBLICATION_APPROVED' &&
        ['image/jpeg', 'image/png', 'image/webp'].includes(asset.mime_type),
    ),
    'FULL_MEDIA_GOVERNANCE_INVALID',
  );

  const storageHeads = await mapBounded(mediaAssets, 12, async (asset) => {
    const stored = await storage.head({ key: asset.object_key, zone: asset.storage_zone });
    invariant(stored.checksumSha256 === asset.file_hash, 'FULL_STORAGE_CHECKSUM_MISMATCH');
    invariant(stored.contentLength === asset.byte_size, 'FULL_STORAGE_LENGTH_MISMATCH');
    invariant(stored.contentType === asset.mime_type, 'FULL_STORAGE_TYPE_MISMATCH');
    return stored.contentLength;
  });
  const bodySamples = await mapBounded(sampleEvenly(mediaAssets, 12), 4, async (asset) => {
    const stored = await storage.get({ key: asset.object_key, zone: asset.storage_zone });
    invariant(sha256(stored.body) === asset.file_hash, 'FULL_STORAGE_BODY_CHECKSUM_MISMATCH');
    return { byteSize: stored.body.byteLength, id: asset.id };
  });
  const mediaAssetsById = new Map(mediaAssets.map((asset) => [asset.id, asset]));

  const publicCatalog = await readPublicCatalog(publicBaseUrl);
  invariant(
    publicCatalog.firstPage?.version?.id === catalogVersion.id,
    'FULL_PUBLIC_VERSION_MISMATCH',
  );
  invariant(
    publicCatalog.firstPage?.priceVersion?.id === priceVersion.id,
    'FULL_PUBLIC_PRICE_VERSION_MISMATCH',
  );
  invariant(
    publicCatalog.firstPage?.total === expected.materialVariants,
    'FULL_PUBLIC_TOTAL_INVALID',
  );
  invariant(
    publicCatalog.items.length === expected.materialVariants,
    'FULL_PUBLIC_ITEM_COUNT_INVALID',
  );
  invariant(
    new Set(publicCatalog.items.map((item) => item.id)).size === expected.materialVariants,
    'FULL_PUBLIC_PAGINATION_DUPLICATE',
  );
  invariant(
    publicCatalog.items.every(
      (item) =>
        item.availability === 'INQUIRY_ONLY' &&
        typeof item.media?.url === 'string' &&
        item.media.url.startsWith('/api/v1/catalog/media/') &&
        item.price?.amountMinor !== 0,
    ),
    'FULL_PUBLIC_SAFE_DEFAULT_INVALID',
  );

  const publicSamples = await mapBounded(sampleEvenly(publicCatalog.items, 12), 4, async (item) => {
    const response = await fetch(new URL(item.media.url, publicBaseUrl));
    const bytes = new Uint8Array(await response.arrayBuffer());
    const checksum = sha256(bytes);
    const expectedAsset = mediaAssetsById.get(item.media.id);
    invariant(response.status === 200, 'FULL_PUBLIC_MEDIA_HTTP_FAILED');
    invariant(
      checksum === response.headers.get('etag')?.replaceAll('"', ''),
      'FULL_PUBLIC_MEDIA_ETAG_MISMATCH',
    );
    invariant(
      expectedAsset !== undefined && checksum === expectedAsset.file_hash,
      'FULL_PUBLIC_MEDIA_CHECKSUM_MISMATCH',
    );
    return { byteSize: bytes.byteLength, id: item.media.id };
  });
  const detailSamples = await mapBounded(sampleEvenly(publicCatalog.items, 3), 3, async (item) => {
    const response = await fetch(new URL(`/api/v1/catalog/materials/${item.id}`, publicBaseUrl));
    const detail = await response.json();
    invariant(response.status === 200 && detail.item?.id === item.id, 'FULL_PUBLIC_DETAIL_INVALID');
    return item.id;
  });
  const category = publicCatalog.items.find((item) => item.category?.slug)?.category;
  invariant(category !== undefined, 'FULL_PUBLIC_CATEGORY_MISSING');
  const categoryUrl = new URL('/api/v1/catalog/materials', publicBaseUrl);
  categoryUrl.searchParams.set('category', category.slug);
  categoryUrl.searchParams.set('limit', '50');
  const categoryResponse = await fetch(categoryUrl);
  const categoryPage = await categoryResponse.json();
  invariant(
    categoryResponse.status === 200 &&
      categoryPage.items.length > 0 &&
      categoryPage.items.every((item) =>
        item.category.path.some((segment) => segment.slug === category.slug),
      ),
    'FULL_PUBLIC_CATEGORY_FILTER_INVALID',
  );
  const invalidQuery = await fetch(
    new URL('/api/v1/catalog/materials?unsupported=true', publicBaseUrl),
  );
  invariant(invalidQuery.status === 400, 'FULL_PUBLIC_UNKNOWN_FILTER_NOT_REJECTED');
  const staleMedia = await fetch(
    new URL(
      `/api/v1/catalog/media/${publicCatalog.items[0].media.id}?v=00000000-0000-4000-8000-000000000999`,
      publicBaseUrl,
    ),
  );
  invariant(staleMedia.status === 404, 'FULL_PUBLIC_STALE_MEDIA_NOT_REJECTED');
  const catalogPageResponse = await fetch(new URL('/catalog', publicBaseUrl));
  const catalogPageText = await catalogPageResponse.text();
  invariant(catalogPageResponse.status === 200, 'FULL_PUBLIC_PAGE_HTTP_FAILED');
  invariant(
    !/objectKey|catalog\/private|shop\.amigo\.ru/i.test(catalogPageText),
    'FULL_PUBLIC_PAGE_INTERNAL_DATA_LEAK',
  );

  const repeatRun =
    process.env.CATALOG_FULL_REPEAT_RUN_ID === undefined
      ? await prisma.catalogSyncRun.findFirst({
          orderBy: { createdAt: 'desc' },
          where: {
            createdAt: { gt: selectedRun.createdAt },
            id: { not: selectedRunId },
            status: 'COMPLETED',
            trigger: 'MANUAL',
          },
        })
      : await prisma.catalogSyncRun.findUnique({
          where: { id: process.env.CATALOG_FULL_REPEAT_RUN_ID },
        });
  invariant(repeatRun !== null, 'FULL_REPEAT_RUN_MISSING');
  invariant(
    repeatRun.status === 'COMPLETED' &&
      repeatRun.sourceVersion === selectedRun.sourceVersion &&
      repeatRun.errorCount === 0 &&
      repeatRun.discoveredCount === expected.normalizedItems &&
      repeatRun.processedCount === expected.normalizedItems,
    'FULL_REPEAT_RUN_INVALID',
  );
  const [
    repeatCatalogVersions,
    repeatPriceVersions,
    repeatDifferences,
    repeatFailedItems,
    repeatManifest,
  ] = await Promise.all([
    prisma.catalogVersion.count({ where: { syncRunId: repeatRun.id } }),
    prisma.priceVersion.count({ where: { syncRunId: repeatRun.id } }),
    prisma.catalogSyncDifference.count({ where: { syncRunId: repeatRun.id } }),
    prisma.catalogSyncItem.count({
      where: { status: { in: ['FAILED', 'MEDIA_ERROR', 'PARSE_ERROR'] }, syncRunId: repeatRun.id },
    }),
    prisma.catalogImportManifest.findUnique({ where: { syncRunId: repeatRun.id } }),
  ]);
  invariant(
    repeatCatalogVersions === 0 && repeatPriceVersions === 0 && repeatDifferences === 0,
    'FULL_REPEAT_CREATED_RELEASE',
  );
  invariant(repeatFailedItems === 0, 'FULL_REPEAT_ITEM_FAILURE');
  invariant(
    repeatManifest?.complete === true &&
      hashCanonicalSource(repeatManifest.safeManifest) === repeatManifest.manifestChecksum,
    'FULL_REPEAT_MANIFEST_INVALID',
  );

  const dailyJobs = await prisma.$queryRawUnsafe(
    `SELECT task_identifier, run_at, key FROM graphile_worker.jobs
     WHERE task_identifier = 'catalog-source-discovery' AND run_at > NOW()
     ORDER BY run_at`,
  );
  invariant(
    dailyJobs.some((job) => typeof job.key === 'string' && job.key.includes('catalog:automatic:')),
    'FULL_DAILY_SCHEDULE_MISSING',
  );

  const report = {
    bulk: { commandCount: bulkCommandCount },
    catalogVersion: {
      id: catalogVersion.id,
      versionNumber: catalogVersion.versionNumber,
    },
    counts: {
      ...expected,
      catalogVersionEntries: versionEntryCount,
      distinctMediaObjects: mediaAssets.length,
      normalizedItems: integer(manifestCounts?.normalizedItems),
      priceVersionRecords: priceRecordCount,
    },
    differences: differenceGroups.map((group) => ({
      count: group._count._all,
      entityType: group.entityType,
      resolution: group.resolution,
      type: group.type,
    })),
    manifest: {
      checksum: importManifest.manifestChecksum,
      complete: importManifest.complete,
      sourceVersion: selectedRun.sourceVersion,
      status: importManifest.status,
    },
    priceVersion: { id: priceVersion.id, versionNumber: priceVersion.versionNumber },
    publicCatalog: {
      categoryFilterCount: categoryPage.items.length,
      detailSamples: detailSamples.length,
      durationMs: publicCatalog.durationMs,
      mediaSamples: publicSamples.length,
      pages: publicCatalog.pageCount,
      total: publicCatalog.items.length,
    },
    repeatRun: {
      id: repeatRun.id,
      result: 'NO_OP',
      sourceVersion: repeatRun.sourceVersion,
    },
    recoveryRun: {
      errorCode: recoveryRun.errorCode,
      id: recoveryRun.id,
      resumeCount: recoveryCheckpoints.reduce(
        (total, checkpoint) => total + checkpoint.resumeCount,
        0,
      ),
      status: recoveryRun.status,
    },
    retryLineage: recoveryLineage.map((entry) => ({
      errorCode: entry.run.errorCode,
      id: entry.run.id,
      status: entry.run.status,
    })),
    review: { batchCount: reviewBatchCount },
    run: {
      discoveredCount: selectedRun.discoveredCount,
      errorCount: selectedRun.errorCount,
      id: selectedRun.id,
      processedCount: selectedRun.processedCount,
      status: selectedRun.status,
    },
    schedule: { nextRunAt: dailyJobs[0]?.run_at ?? null },
    schemaVersion: 1,
    storage: {
      bodySamples: bodySamples.length,
      objectsVerified: storageHeads.length,
      totalBytes: storageHeads.reduce((total, value) => total + value, 0),
    },
    verifiedAt: new Date().toISOString(),
  };
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  invariant(!/password|secret|token|cookie/i.test(serialized), 'FULL_REPORT_SENSITIVE_FIELD');
  const reportPath = resolve(
    repositoryRoot,
    '.local/catalog-full',
    `acceptance-${selectedRun.id}.json`,
  );
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, serialized, 'utf8');
  process.stdout.write(
    `${JSON.stringify({
      catalogVersion: report.catalogVersion,
      counts: report.counts,
      manifest: report.manifest,
      priceVersion: report.priceVersion,
      publicCatalog: report.publicCatalog,
      repeatRun: report.repeatRun,
      recoveryRun: report.recoveryRun,
      report: relative(repositoryRoot, reportPath).replaceAll('\\', '/'),
      run: report.run,
      storage: report.storage,
    })}\n`,
  );
} catch (error) {
  process.stderr.write(
    `${JSON.stringify({
      errorCode:
        error instanceof Error && /^[A-Z][A-Z0-9_]{2,127}$/.test(error.message)
          ? error.message
          : 'CATALOG_FULL_ACCEPTANCE_FAILED',
    })}\n`,
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect().catch(() => undefined);
}
