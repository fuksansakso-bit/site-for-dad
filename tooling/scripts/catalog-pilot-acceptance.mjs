import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';

import {
  amigoPilotCatalogSourceId,
  amigoPilotMaterialSourceIds,
} from '../../packages/catalog/dist/index.js';
import {
  parseDatabaseEnvironment,
  parseStorageEnvironment,
} from '../../packages/config/dist/server.js';
import { createPrismaClient } from '../../packages/db/dist/client.js';
import { createS3ObjectStorage } from '../../packages/storage/dist/index.js';

const historicalFailedRunId = '798d5513-27b1-48e3-ab8e-389eeb672db4';
const recoveryRunId = 'f9407db3-9e82-4174-9e21-87528bdd7092';
const idempotencyRunId = '642f2bc2-387b-44fe-9d52-e05cd78e374c';
const amigoReferenceByteSize = 515_180;
const amigoReferenceSha256 = 'ac86fc976afc2063cc97e1528611c978a348f357d26c8fe3c59b7c23f113d0cd';
const repositoryRoot = resolve(import.meta.dirname, '../..');

function invariant(condition, code) {
  if (!condition) throw new Error(code);
}

function asRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : null;
}

function hashBytes(value) {
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

const databaseEnvironment = parseDatabaseEnvironment(process.env);
const storageEnvironment = parseStorageEnvironment(process.env);
const prisma = createPrismaClient(databaseEnvironment);
const storage = createS3ObjectStorage(storageEnvironment);
const publicBaseUrl = new URL(process.env.CATALOG_PUBLIC_BASE_URL ?? 'http://127.0.0.1:3000');

try {
  const selectedRunId =
    process.env.CATALOG_PILOT_RUN_ID ??
    (
      await prisma.catalogVersion.findFirst({
        select: { syncRunId: true },
        where: { activationKey: 'PUBLIC', status: 'ACTIVE' },
      })
    )?.syncRunId;
  invariant(typeof selectedRunId === 'string', 'PILOT_RUN_MISSING');

  const [
    selectedRun,
    historicalRun,
    recoveryRun,
    idempotencyRun,
    catalogVersion,
    priceVersion,
    activeCatalogCount,
    activePriceCount,
    failedItemCount,
    sourceEntityCount,
    materialVariantCount,
    sourcePriceCount,
    sourceMediaCount,
    materialMediaCount,
    mediaAssets,
  ] = await Promise.all([
    prisma.catalogSyncRun.findUnique({ where: { id: selectedRunId } }),
    prisma.catalogSyncRun.findUnique({ where: { id: historicalFailedRunId } }),
    prisma.catalogSyncRun.findUnique({ where: { id: recoveryRunId } }),
    prisma.catalogSyncRun.findUnique({ where: { id: idempotencyRunId } }),
    prisma.catalogVersion.findFirst({ where: { syncRunId: selectedRunId } }),
    prisma.priceVersion.findFirst({ where: { syncRunId: selectedRunId } }),
    prisma.catalogVersion.count({ where: { activationKey: 'PUBLIC', status: 'ACTIVE' } }),
    prisma.priceVersion.count({ where: { activationKey: 'PUBLIC', status: 'ACTIVE' } }),
    prisma.catalogSyncItem.count({ where: { status: 'FAILED', syncRunId: selectedRunId } }),
    prisma.sourceEntity.count({
      where: {
        catalogSourceId: amigoPilotCatalogSourceId,
        sourceId: { in: [...amigoPilotMaterialSourceIds] },
        sourceType: 'MATERIAL_VARIANT',
      },
    }),
    prisma.materialVariant.count({
      where: {
        sourceEntity: {
          catalogSourceId: amigoPilotCatalogSourceId,
          sourceId: { in: [...amigoPilotMaterialSourceIds] },
        },
      },
    }),
    prisma.sourcePriceRecord.count({
      where: {
        catalogSourceId: amigoPilotCatalogSourceId,
        materialVariant: {
          sourceEntity: { sourceId: { in: [...amigoPilotMaterialSourceIds] } },
        },
      },
    }),
    prisma.sourceMediaAsset.count({
      where: {
        catalogSourceId: amigoPilotCatalogSourceId,
        materialVariant: {
          sourceEntity: { sourceId: { in: [...amigoPilotMaterialSourceIds] } },
        },
      },
    }),
    prisma.materialMediaAsset.count({
      where: {
        sourceMediaAsset: {
          catalogSourceId: amigoPilotCatalogSourceId,
          materialVariant: {
            sourceEntity: { sourceId: { in: [...amigoPilotMaterialSourceIds] } },
          },
        },
      },
    }),
    prisma.mediaAsset.findMany({
      orderBy: { fileHash: 'asc' },
      select: {
        byteSize: true,
        fileHash: true,
        id: true,
        mimeType: true,
        objectKey: true,
        publicationStatus: true,
        rightsStatus: true,
        storageZone: true,
      },
      where: {
        sourceAssets: {
          some: {
            catalogSourceId: amigoPilotCatalogSourceId,
            materialVariant: {
              sourceEntity: { sourceId: { in: [...amigoPilotMaterialSourceIds] } },
            },
          },
        },
      },
    }),
  ]);

  invariant(selectedRun?.status === 'COMPLETED', 'PILOT_RUN_NOT_COMPLETED');
  invariant(selectedRun.errorCode === null && selectedRun.errorCount === 0, 'PILOT_RUN_FAILED');
  invariant(
    selectedRun.processedCount === selectedRun.discoveredCount && selectedRun.processedCount > 0,
    'PILOT_RUN_INCOMPLETE',
  );
  invariant(
    selectedRun.correlationId !== historicalRun?.correlationId,
    'PILOT_CORRELATION_NOT_ROTATED',
  );
  invariant(
    historicalRun?.status === 'FAILED' &&
      historicalRun.errorCode === 'CATALOG_PIPELINE_STORAGE_UNAVAILABLE',
    'HISTORICAL_FAILED_RUN_CHANGED',
  );
  const recoveryAudit = asRecord(recoveryRun?.auditContext);
  invariant(recoveryAudit?.retryOfSyncRunId === historicalFailedRunId, 'RECOVERY_LINEAGE_MISSING');
  invariant(idempotencyRun?.status === 'AWAITING_APPROVAL', 'IDEMPOTENCY_RUN_CHANGED');
  invariant(failedItemCount === 0, 'PILOT_ITEM_FAILURES_PRESENT');

  const repeatRun = await prisma.catalogSyncRun.findFirst({
    orderBy: { createdAt: 'desc' },
    where: {
      createdAt: { gt: selectedRun.createdAt },
      id: { not: selectedRunId },
      status: 'COMPLETED',
      trigger: 'MANUAL',
    },
  });
  invariant(repeatRun !== null, 'IDEMPOTENCY_REPEAT_RUN_MISSING');
  invariant(
    process.env.CATALOG_PILOT_REPEAT_RUN_ID === undefined ||
      repeatRun.id === process.env.CATALOG_PILOT_REPEAT_RUN_ID,
    'IDEMPOTENCY_REPEAT_RUN_MISMATCH',
  );
  invariant(
    repeatRun.errorCode === null &&
      repeatRun.errorCount === 0 &&
      repeatRun.processedCount === repeatRun.discoveredCount,
    'IDEMPOTENCY_REPEAT_RUN_FAILED',
  );
  invariant(
    repeatRun.correlationId !== selectedRun.correlationId,
    'IDEMPOTENCY_CORRELATION_NOT_ROTATED',
  );
  const [repeatCatalogVersions, repeatPriceVersions, repeatFailedItems] = await Promise.all([
    prisma.catalogVersion.count({ where: { syncRunId: repeatRun.id } }),
    prisma.priceVersion.count({ where: { syncRunId: repeatRun.id } }),
    prisma.catalogSyncItem.count({ where: { status: 'FAILED', syncRunId: repeatRun.id } }),
  ]);
  invariant(
    repeatCatalogVersions === 0 && repeatPriceVersions === 0,
    'IDEMPOTENCY_REPEAT_CREATED_VERSION',
  );
  invariant(repeatFailedItems === 0, 'IDEMPOTENCY_REPEAT_ITEM_FAILURE');

  invariant(
    catalogVersion?.status === 'ACTIVE' && catalogVersion.activationKey === 'PUBLIC',
    'CATALOG_VERSION_NOT_ACTIVE',
  );
  invariant(
    priceVersion?.status === 'ACTIVE' && priceVersion.activationKey === 'PUBLIC',
    'PRICE_VERSION_NOT_ACTIVE',
  );
  invariant(activeCatalogCount === 1 && activePriceCount === 1, 'ACTIVE_POINTER_NOT_UNIQUE');
  invariant(catalogVersion.id !== priceVersion.id, 'VERSION_IDENTITIES_COLLIDED');
  invariant(catalogVersion.approvedByActorId !== null, 'CATALOG_OWNER_APPROVAL_MISSING');
  invariant(catalogVersion.activatedByActorId !== null, 'CATALOG_ADMIN_ACTIVATION_MISSING');
  invariant(priceVersion.approvedByActorId !== null, 'PRICE_OWNER_APPROVAL_MISSING');
  invariant(priceVersion.activatedByActorId !== null, 'PRICE_ADMIN_ACTIVATION_MISSING');

  const manifest = asRecord(catalogVersion.sourceManifest);
  const composition = manifest?.composition;
  invariant(Array.isArray(composition) && composition.length === 40, 'COMPOSITION_COUNT_INVALID');
  const compositionVariants = composition.filter(
    (entry) => asRecord(entry)?.entityType === 'MATERIAL_VARIANT',
  );
  invariant(compositionVariants.length === 32, 'COMPOSITION_VARIANT_COUNT_INVALID');
  const versionEntryCount = await prisma.catalogVersionEntry.count({
    where: { catalogVersionId: catalogVersion.id },
  });
  const priceRecordCount = await prisma.priceVersionRecord.count({
    where: { priceVersionId: priceVersion.id },
  });
  invariant(versionEntryCount === 40, 'CATALOG_VERSION_ENTRY_COUNT_INVALID');
  invariant(priceRecordCount === 32, 'PRICE_VERSION_RECORD_COUNT_INVALID');

  invariant(sourceEntityCount === 32, 'SOURCE_ENTITY_DEDUP_FAILED');
  invariant(materialVariantCount === 32, 'MATERIAL_VARIANT_DEDUP_FAILED');
  invariant(sourcePriceCount === 32, 'SOURCE_PRICE_DEDUP_FAILED');
  invariant(sourceMediaCount === 59, 'SOURCE_MEDIA_DEDUP_FAILED');
  invariant(materialMediaCount === 59, 'MATERIAL_MEDIA_DEDUP_FAILED');
  invariant(mediaAssets.length === 59, 'MEDIA_ASSET_DEDUP_FAILED');
  invariant(
    new Set(mediaAssets.map((asset) => asset.fileHash)).size === 59,
    'MEDIA_HASH_DUPLICATE',
  );
  invariant(
    mediaAssets.every(
      (asset) =>
        asset.publicationStatus === 'PUBLICATION_APPROVED' &&
        asset.rightsStatus === 'PARTNER_LICENSE' &&
        ['image/jpeg', 'image/png', 'image/webp'].includes(asset.mimeType),
    ),
    'MEDIA_PUBLICATION_GATE_INVALID',
  );

  const storageResults = await mapBounded(mediaAssets, 4, async (asset) => {
    const stored = await storage.get({
      key: asset.objectKey,
      zone: asset.storageZone,
    });
    const checksum = hashBytes(stored.body);
    invariant(checksum === asset.fileHash, 'STORAGE_BODY_CHECKSUM_MISMATCH');
    invariant(stored.checksumSha256 === asset.fileHash, 'STORAGE_METADATA_CHECKSUM_MISMATCH');
    invariant(stored.contentLength === asset.byteSize, 'STORAGE_CONTENT_LENGTH_MISMATCH');
    invariant(stored.contentType === asset.mimeType, 'STORAGE_CONTENT_TYPE_MISMATCH');
    return { byteSize: stored.body.byteLength, checksum, id: asset.id };
  });
  const storageBytes = storageResults.reduce((total, item) => total + item.byteSize, 0);
  const referenceAsset = mediaAssets.find(
    (asset) => asset.byteSize === amigoReferenceByteSize && asset.fileHash === amigoReferenceSha256,
  );
  invariant(referenceAsset !== undefined, 'AMIGO_REFERENCE_IMAGE_MISSING');
  const signedRead = await storage.createSignedReadGrant({
    key: referenceAsset.objectKey,
    zone: referenceAsset.storageZone,
  });
  const signedResponse = await fetch(signedRead.url, { headers: signedRead.requiredHeaders });
  const signedBytes = new Uint8Array(await signedResponse.arrayBuffer());
  invariant(signedResponse.status === 200, 'SIGNED_READ_FAILED');
  invariant(signedBytes.byteLength === amigoReferenceByteSize, 'SIGNED_READ_LENGTH_MISMATCH');
  invariant(hashBytes(signedBytes) === amigoReferenceSha256, 'SIGNED_READ_CHECKSUM_MISMATCH');

  const publicResponse = await fetch(new URL('/api/v1/catalog/materials?limit=50', publicBaseUrl));
  const publicText = await publicResponse.text();
  const publicCatalog = JSON.parse(publicText);
  invariant(publicResponse.status === 200, 'PUBLIC_CATALOG_HTTP_FAILED');
  invariant(publicCatalog.version?.id === catalogVersion.id, 'PUBLIC_CATALOG_VERSION_MISMATCH');
  invariant(publicCatalog.priceVersion?.id === priceVersion.id, 'PUBLIC_PRICE_VERSION_MISMATCH');
  invariant(
    publicCatalog.total === 32 && publicCatalog.items?.length === 32,
    'PUBLIC_ITEM_COUNT_INVALID',
  );
  invariant(
    !/objectKey|sourceHash|S3_|catalog\/private|shop\.amigo\.ru/i.test(publicText),
    'PUBLIC_INTERNAL_DATA_LEAK',
  );

  const publicMedia = await mapBounded(publicCatalog.items, 4, async (item) => {
    const response = await fetch(new URL(item.media.url, publicBaseUrl));
    const bytes = new Uint8Array(await response.arrayBuffer());
    const checksum = hashBytes(bytes);
    invariant(response.status === 200, 'PUBLIC_MEDIA_HTTP_FAILED');
    invariant(
      checksum === response.headers.get('etag')?.replaceAll('"', ''),
      'PUBLIC_MEDIA_ETAG_MISMATCH',
    );
    return { byteSize: bytes.byteLength, checksum, id: item.media.id };
  });
  invariant(publicMedia.length === 32, 'PUBLIC_MEDIA_COUNT_INVALID');
  const publicReference = publicMedia.find(
    (item) => item.byteSize === amigoReferenceByteSize && item.checksum === amigoReferenceSha256,
  );
  invariant(publicReference !== undefined, 'PUBLIC_REFERENCE_IMAGE_MISSING');

  const filterResponse = await fetch(
    new URL('/api/v1/catalog/materials?blackout=true&limit=50', publicBaseUrl),
  );
  const filtered = await filterResponse.json();
  invariant(
    filterResponse.status === 200 &&
      filtered.items.length > 0 &&
      filtered.items.every((item) => item.isBlackout === true),
    'PUBLIC_FILTER_INVALID',
  );
  const invalidQuery = await fetch(
    new URL('/api/v1/catalog/materials?unsupported=true', publicBaseUrl),
  );
  invariant(invalidQuery.status === 400, 'PUBLIC_UNKNOWN_FILTER_NOT_REJECTED');
  const staleMedia = await fetch(
    new URL(
      `/api/v1/catalog/media/${publicCatalog.items[0].media.id}?v=00000000-0000-4000-8000-000000000999`,
      publicBaseUrl,
    ),
  );
  invariant(staleMedia.status === 404, 'PUBLIC_STALE_MEDIA_NOT_REJECTED');

  const report = {
    catalogVersion: {
      id: catalogVersion.id,
      versionNumber: catalogVersion.versionNumber,
    },
    counts: {
      catalogVersionEntries: versionEntryCount,
      compositionEntries: composition.length,
      materialMediaLinks: materialMediaCount,
      materialVariants: materialVariantCount,
      mediaAssets: mediaAssets.length,
      priceVersionRecords: priceRecordCount,
      publicItems: publicCatalog.items.length,
      publicPrimaryMedia: publicMedia.length,
      sourceEntities: sourceEntityCount,
      sourceMediaLinks: sourceMediaCount,
      sourcePrices: sourcePriceCount,
    },
    deduplication: {
      distinctMediaHashes: new Set(mediaAssets.map((asset) => asset.fileHash)).size,
      historicalIdempotencyRunId: idempotencyRunId,
      repeatRunId: repeatRun.id,
      result: 'PASSED',
    },
    historicalFailedRun: {
      errorCode: historicalRun.errorCode,
      id: historicalRun.id,
      status: historicalRun.status,
    },
    priceVersion: { id: priceVersion.id, versionNumber: priceVersion.versionNumber },
    publicDelivery: {
      filterCount: filtered.items.length,
      mediaBytes: publicMedia.reduce((total, item) => total + item.byteSize, 0),
      staleMediaStatus: staleMedia.status,
      unknownFilterStatus: invalidQuery.status,
    },
    recoveryLineage: { retryOfSyncRunId: recoveryAudit.retryOfSyncRunId, runId: recoveryRunId },
    referenceImage: {
      byteSize: amigoReferenceByteSize,
      sha256: amigoReferenceSha256,
      signedReadStatus: signedResponse.status,
    },
    run: {
      correlationId: selectedRun.correlationId,
      discoveredCount: selectedRun.discoveredCount,
      errorCount: selectedRun.errorCount,
      id: selectedRun.id,
      processedCount: selectedRun.processedCount,
      status: selectedRun.status,
    },
    schemaVersion: 1,
    storage: {
      allObjectsVerified: storageResults.length,
      totalBytes: storageBytes,
    },
    verifiedAt: new Date().toISOString(),
  };
  const reportPath = resolve(
    repositoryRoot,
    '.local/catalog-pilot',
    `acceptance-${selectedRun.id}.json`,
  );
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(
    `${JSON.stringify({
      catalogVersion: report.catalogVersion,
      counts: report.counts,
      deduplication: report.deduplication,
      historicalFailedRun: report.historicalFailedRun,
      priceVersion: report.priceVersion,
      referenceImage: report.referenceImage,
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
          : 'CATALOG_PILOT_ACCEPTANCE_FAILED',
    })}\n`,
  );
  process.exitCode = 1;
} finally {
  await prisma.$disconnect().catch(() => undefined);
}
