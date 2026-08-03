import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';

import {
  buildCatalogPublicSnapshot,
  maximumPublicCatalogMaterialCount,
  type CatalogPublicSnapshot,
} from '@project-name/catalog';
import { parseDatabaseEnvironment } from '@project-name/config/server';
import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

import { createPrismaClient, type FoundationPrismaClient } from '../../src/client.js';
import { createCatalogManagementAdapter } from '../../src/catalog-management.js';
import { createCatalogReadAdapter } from '../../src/catalog-read.js';
import type { Prisma } from '../../src/generated/prisma/client.js';
import {
  AvailabilityStatus,
  CatalogEntityType,
  CatalogSourceType,
  CatalogSyncItemStatus,
  CatalogSyncStatus,
  CatalogSyncTrigger,
  CatalogVersionStatus,
  CatalogVisibility,
  ManualReviewStatus,
  PriceRecordKind,
  PriceStatus,
  PriceVersionStatus,
  PublicationStatus,
  SourceEntityStatus,
  SourceEntityType,
  SystemRole,
} from '../../src/generated/prisma/enums.js';

const catalogSourceId = '00000000-0000-4000-8000-000000000103';
const syntheticMaterialCount = 2_048;
const categoryCount = 32;
const rootCategoryCount = 4;
const systemCount = 16;
const colorCount = 16;
const capturedAt = new Date('2026-08-03T18:30:00.000Z');
const sourceVersion = 'catalog-scale-fixture-v1';
const catalogDifferenceChecksum = 'd'.repeat(64);

const ids = {
  activeCatalogVersion: uuid('a003', 1),
  activePriceVersion: uuid('a004', 1),
  activeRun: uuid('a002', 1),
  admin: uuid('a001', 2),
  candidateCatalogVersion: uuid('a003', 2),
  candidateRun: uuid('a002', 2),
  family: uuid('a010', 1),
  media: uuid('a201', 1),
  owner: uuid('a001', 1),
};

interface StatementStats {
  readonly calls: number;
  readonly plans: number;
  readonly rows: number;
  readonly statementCount: number;
  readonly tempBlocksWritten: number;
  readonly totalExecutionMilliseconds: number;
}

interface StatRow {
  readonly calls: string;
  readonly plans: string;
  readonly rows: string;
  readonly temp_blks_written: string;
  readonly total_exec_time: number | string;
}

function uuid(group: string, value: number): string {
  return `00000000-0000-4000-${group}-${value.toString(16).padStart(12, '0')}`;
}

function checksum(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function publishedOverlay(localOrder: number) {
  return {
    availability: { status: 'INQUIRY_ONLY' },
    localDescription: null,
    localOrder,
    localPriceOverride: null,
    manualReviewState: 'APPROVED',
    publication: { status: 'PUBLISHED' },
    visibility: 'VISIBLE',
  };
}

function categoryId(index: number): string {
  return uuid('a101', index + 1);
}

function categorySourceEntityId(index: number): string {
  return uuid('a100', index + 1);
}

function systemId(index: number): string {
  return uuid('a111', index + 1);
}

function systemSourceEntityId(index: number): string {
  return uuid('a110', index + 1);
}

function materialId(index: number): string {
  return uuid('a120', index + 1);
}

function variantSourceEntityId(index: number): string {
  return uuid('a130', index + 1);
}

function variantId(index: number): string {
  return uuid('a131', index + 1);
}

function businessEntryId(index: number): string {
  return uuid('a140', index + 1);
}

function variantHash(index: number): string {
  return checksum(`catalog-scale-variant-${index}`);
}

function buildPublicComposition(): readonly Record<string, unknown>[] {
  const categories = Array.from({ length: categoryCount }, (_unused, index) => ({
    entity: {
      id: categoryId(index),
      name: `Категория ${index.toString().padStart(2, '0')}`,
      parentId: index < rootCategoryCount ? null : categoryId(index % rootCategoryCount),
      slug: `scale-category-${index}`,
      sortOrder: index,
    },
    entityType: 'CATEGORY',
    overlay: publishedOverlay(index),
  }));
  const systems = Array.from({ length: systemCount }, (_unused, index) => ({
    entity: {
      categoryId: categoryId(index % categoryCount),
      id: systemId(index),
      name: `Система ${index.toString().padStart(2, '0')}`,
      slug: `scale-system-${index}`,
      sortOrder: index,
    },
    entityType: 'SYSTEM',
    overlay: publishedOverlay(index),
  }));
  const materials = Array.from({ length: syntheticMaterialCount }, (_unused, index) => {
    const priceOnRequest = index % 11 === 0;
    return {
      entity: {
        article: `SCALE-${index.toString().padStart(4, '0')}`,
        color: {
          hex: `#${(0x100000 + (index % 0xefffff)).toString(16).padStart(6, '0')}`,
          name: `Цвет ${index % colorCount}`,
          slug: `scale-color-${index % colorCount}`,
        },
        id: variantId(index),
        isBlackout: index % 5 === 0,
        isZebra: index % 7 === 0,
        material: {
          categoryId: categoryId(index % categoryCount),
          id: materialId(index),
          name: `Материал ${index.toString().padStart(4, '0')}`,
          slug: `scale-material-base-${index}`,
        },
        name: `Материал ${index.toString().padStart(4, '0')}, цвет ${index % colorCount}`,
        primarySystemId: systemId(index % systemCount),
        slug: `scale-material-${index}`,
        widthMm: index % 9 === 0 ? null : String(1_600 + (index % 800)),
      },
      entityType: 'MATERIAL_VARIANT',
      overlay: publishedOverlay(index),
      primaryMedia: {
        byteSize: 68,
        fileHash: 'b'.repeat(64),
        height: 1,
        id: ids.media,
        mimeType: 'image/png',
        objectKey: 'catalog/scale/synthetic.png',
        publicationStatus: 'PUBLICATION_APPROVED',
        rightsStatus: 'PARTNER_LICENSE',
        storageZone: 'private',
        width: 1,
      },
      sourcePrice: {
        amountMinor: priceOnRequest ? null : 100_000 + index,
        currency: 'RUB',
        kind: 'FROM',
        status: priceOnRequest ? 'PRICE_ON_REQUEST' : 'AVAILABLE',
      },
    };
  });
  return [...categories, ...systems, ...materials];
}

async function createInChunks<T>(
  records: readonly T[],
  write: (chunk: readonly T[]) => Promise<unknown>,
): Promise<void> {
  const chunkSize = 400;
  for (let offset = 0; offset < records.length; offset += chunkSize) {
    await write(records.slice(offset, offset + chunkSize));
  }
}

async function seedScaleCatalog(
  prisma: FoundationPrismaClient,
  composition: readonly Record<string, unknown>[],
): Promise<void> {
  await prisma.actorIdentity.createMany({
    data: [
      { id: ids.owner, provider: 'synthetic', subject: 'catalog-scale-owner' },
      { id: ids.admin, provider: 'synthetic', subject: 'catalog-scale-admin' },
    ],
  });
  await prisma.roleGrant.create({ data: { actorId: ids.owner, role: SystemRole.OWNER } });
  await prisma.catalogSyncRun.createMany({
    data: [
      {
        attempt: 1,
        auditContext: { fixture: 'PLAN-1B2-SCALE-001', synthetic: true },
        catalogSourceId,
        completedAt: capturedAt,
        correlationId: 'catalog-scale-active-run',
        discoveredCount: composition.length,
        errorCount: 0,
        id: ids.activeRun,
        idempotencyKey: 'catalog-scale-active-run-v1',
        lastHeartbeatAt: capturedAt,
        mappingVersion: 'catalog-scale-fixture/1.0.0',
        parserVersion: 'catalog-scale-fixture/1.0.0',
        processedCount: composition.length,
        requestedByActorId: ids.owner,
        sourceVersion: 'catalog-scale-active-v1',
        startedAt: capturedAt,
        status: CatalogSyncStatus.COMPLETED,
        trigger: CatalogSyncTrigger.TEST,
      },
      {
        attempt: 1,
        auditContext: { fixture: 'PLAN-1B2-SCALE-001', synthetic: true },
        catalogSourceId,
        correlationId: 'catalog-scale-candidate-run',
        discoveredCount: composition.length,
        errorCount: 0,
        id: ids.candidateRun,
        idempotencyKey: 'catalog-scale-candidate-run-v1',
        lastHeartbeatAt: capturedAt,
        mappingVersion: 'catalog-scale-fixture/1.0.0',
        parserVersion: 'catalog-scale-fixture/1.0.0',
        processedCount: composition.length,
        requestedByActorId: ids.owner,
        sourceVersion,
        startedAt: capturedAt,
        status: CatalogSyncStatus.AWAITING_APPROVAL,
        trigger: CatalogSyncTrigger.TEST,
      },
    ],
  });
  await prisma.productFamily.create({
    data: {
      code: 'SCALE',
      id: ids.family,
      name: 'Синтетическая проверка масштаба',
      slug: 'catalog-scale-family',
      sortOrder: 1,
    },
  });

  const categorySourceEntities = Array.from(
    { length: categoryCount },
    (_unused, index): Prisma.SourceEntityCreateManyInput => ({
      catalogSourceId,
      id: categorySourceEntityId(index),
      safeSourceData: { name: `Категория ${index}`, synthetic: true },
      sourceCapturedAt: capturedAt,
      sourceCategory: null,
      sourceHash: checksum(`catalog-scale-category-${index}`),
      sourceId: `scale-category-${index}`,
      sourceLastVerifiedAt: capturedAt,
      sourceSlug: `scale-category-${index}`,
      sourceType: SourceEntityType.CATEGORY,
      sourceUrl: `https://fixture.invalid/catalog/scale-category-${index}`,
      status: SourceEntityStatus.ACTIVE,
    }),
  );
  const systemSourceEntities = Array.from(
    { length: systemCount },
    (_unused, index): Prisma.SourceEntityCreateManyInput => ({
      catalogSourceId,
      id: systemSourceEntityId(index),
      safeSourceData: { name: `Система ${index}`, synthetic: true },
      sourceCapturedAt: capturedAt,
      sourceCategory: `scale-category-${index % categoryCount}`,
      sourceHash: checksum(`catalog-scale-system-${index}`),
      sourceId: `scale-system-${index}`,
      sourceLastVerifiedAt: capturedAt,
      sourceSlug: `scale-system-${index}`,
      sourceType: SourceEntityType.SYSTEM,
      sourceUrl: `https://fixture.invalid/catalog/scale-system-${index}`,
      status: SourceEntityStatus.ACTIVE,
    }),
  );
  const variantSourceEntities = Array.from(
    { length: syntheticMaterialCount },
    (_unused, index): Prisma.SourceEntityCreateManyInput => ({
      catalogSourceId,
      id: variantSourceEntityId(index),
      safeSourceData: {
        article: `SCALE-${index.toString().padStart(4, '0')}`,
        name: `Материал ${index.toString().padStart(4, '0')}`,
        synthetic: true,
      },
      sourceCapturedAt: capturedAt,
      sourceCategory: `scale-category-${index % categoryCount}`,
      sourceHash: variantHash(index),
      sourceId: `scale-variant-${index}`,
      sourceLastVerifiedAt: capturedAt,
      sourceSlug: `scale-material-${index}`,
      sourceType: SourceEntityType.MATERIAL_VARIANT,
      sourceUrl: `https://fixture.invalid/catalog/scale-material-${index}`,
      status: SourceEntityStatus.ACTIVE,
    }),
  );
  await createInChunks(
    [...categorySourceEntities, ...systemSourceEntities, ...variantSourceEntities],
    (data) => prisma.sourceEntity.createMany({ data: [...data] }),
  );

  const rootCategories = Array.from({ length: rootCategoryCount }, (_unused, index) => index);
  const childCategories = Array.from(
    { length: categoryCount - rootCategoryCount },
    (_unused, index) => index + rootCategoryCount,
  );
  const categoryData = (index: number): Prisma.ProductCategoryCreateManyInput => ({
    familyId: ids.family,
    id: categoryId(index),
    name: `Категория ${index.toString().padStart(2, '0')}`,
    parentId: index < rootCategoryCount ? null : categoryId(index % rootCategoryCount),
    slug: `scale-category-${index}`,
    sortOrder: index,
    sourceEntityId: categorySourceEntityId(index),
  });
  await prisma.productCategory.createMany({ data: rootCategories.map(categoryData) });
  await prisma.productCategory.createMany({ data: childCategories.map(categoryData) });
  await prisma.productSystem.createMany({
    data: Array.from(
      { length: systemCount },
      (_unused, index): Prisma.ProductSystemCreateManyInput => ({
        categoryId: categoryId(index % categoryCount),
        familyId: ids.family,
        id: systemId(index),
        name: `Система ${index.toString().padStart(2, '0')}`,
        slug: `scale-system-${index}`,
        sortOrder: index,
        sourceEntityId: systemSourceEntityId(index),
      }),
    ),
  });
  await prisma.color.createMany({
    data: Array.from({ length: colorCount }, (_unused, index) => ({
      id: uuid('a115', index + 1),
      name: `Цвет ${index}`,
      normalizedHex: `#${(0x100000 + index).toString(16).padStart(6, '0')}`,
      slug: `scale-color-${index}`,
    })),
  });

  const materials = Array.from(
    { length: syntheticMaterialCount },
    (_unused, index): Prisma.MaterialCreateManyInput => ({
      categoryId: categoryId(index % categoryCount),
      familyId: ids.family,
      id: materialId(index),
      name: `Материал ${index.toString().padStart(4, '0')}`,
      slug: `scale-material-base-${index}`,
    }),
  );
  const variants = Array.from(
    { length: syntheticMaterialCount },
    (_unused, index): Prisma.MaterialVariantCreateManyInput => ({
      article: `SCALE-${index.toString().padStart(4, '0')}`,
      colorId: uuid('a115', (index % colorCount) + 1),
      id: variantId(index),
      isBlackout: index % 5 === 0,
      isZebra: index % 7 === 0,
      materialId: materialId(index),
      name: `Материал ${index.toString().padStart(4, '0')}, цвет ${index % colorCount}`,
      primarySystemId: systemId(index % systemCount),
      slug: `scale-material-${index}`,
      sourceEntityId: variantSourceEntityId(index),
      widthMm: index % 9 === 0 ? null : String(1_600 + (index % 800)),
    }),
  );
  await createInChunks(materials, (data) => prisma.material.createMany({ data: [...data] }));
  await createInChunks(variants, (data) => prisma.materialVariant.createMany({ data: [...data] }));

  const syncItems: Prisma.CatalogSyncItemCreateManyInput[] = [
    ...categorySourceEntities.map((_entity, index) => ({
      afterHash: checksum(`catalog-scale-category-${index}`),
      id: uuid('a160', index + 1),
      progress: 100,
      sourceEntityId: categorySourceEntityId(index),
      sourceId: `scale-category-${index}`,
      sourceType: SourceEntityType.CATEGORY,
      stage: 'normalize',
      status: CatalogSyncItemStatus.CREATED,
      syncRunId: ids.candidateRun,
    })),
    ...systemSourceEntities.map((_entity, index) => ({
      afterHash: checksum(`catalog-scale-system-${index}`),
      id: uuid('a161', index + 1),
      progress: 100,
      sourceEntityId: systemSourceEntityId(index),
      sourceId: `scale-system-${index}`,
      sourceType: SourceEntityType.SYSTEM,
      stage: 'normalize',
      status: CatalogSyncItemStatus.CREATED,
      syncRunId: ids.candidateRun,
    })),
    ...variantSourceEntities.map((_entity, index) => ({
      afterHash: variantHash(index),
      id: uuid('a162', index + 1),
      progress: 100,
      sourceEntityId: variantSourceEntityId(index),
      sourceId: `scale-variant-${index}`,
      sourceType: SourceEntityType.MATERIAL_VARIANT,
      stage: 'normalize',
      status: CatalogSyncItemStatus.CREATED,
      syncRunId: ids.candidateRun,
    })),
  ];
  await createInChunks(syncItems, (data) => prisma.catalogSyncItem.createMany({ data: [...data] }));

  const prices = Array.from(
    { length: syntheticMaterialCount },
    (_unused, index): Prisma.SourcePriceRecordCreateManyInput => {
      const priceOnRequest = index % 11 === 0;
      return {
        amountMinor: priceOnRequest ? null : 100_000 + index,
        catalogSourceId,
        currency: 'RUB',
        kind: PriceRecordKind.FROM,
        materialVariantId: variantId(index),
        sourceCapturedAt: capturedAt,
        sourceCategory: `scale-category-${index % categoryCount}`,
        sourceContext: { fixture: 'PLAN-1B2-SCALE-001', synthetic: true },
        sourceEntityId: variantSourceEntityId(index),
        sourceHash: variantHash(index),
        sourceId: `scale-price-${index}`,
        sourceLastVerifiedAt: capturedAt,
        sourcePriceCategory: String(index % 6),
        sourceSlug: `scale-price-${index}`,
        sourceType: CatalogSourceType.AUTHORIZED_PUBLIC_WEB,
        sourceUrl: `https://fixture.invalid/catalog/scale-material-${index}`,
        sourceVersion,
        status: priceOnRequest ? PriceStatus.PRICE_ON_REQUEST : PriceStatus.AVAILABLE,
      };
    },
  );
  await createInChunks(prices, (data) => prisma.sourcePriceRecord.createMany({ data: [...data] }));

  const businessEntries = Array.from(
    { length: syntheticMaterialCount },
    (_unused, index): Prisma.BusinessCatalogEntryCreateManyInput => ({
      entityType: CatalogEntityType.MATERIAL_VARIANT,
      id: businessEntryId(index),
      localOrder: index,
      manualReviewState: ManualReviewStatus.APPROVED,
      materialVariantId: variantId(index),
      visibility: CatalogVisibility.VISIBLE,
    }),
  );
  await createInChunks(businessEntries, (data) =>
    prisma.businessCatalogEntry.createMany({ data: [...data] }),
  );
  await createInChunks(
    Array.from(
      { length: syntheticMaterialCount },
      (_unused, index): Prisma.AvailabilityRecordCreateManyInput => ({
        businessCatalogEntryId: businessEntryId(index),
        decidedByActorId: ids.owner,
        effectiveAt: capturedAt,
        id: uuid('a141', index + 1),
        reason: 'Synthetic scale validation only.',
        status: AvailabilityStatus.INQUIRY_ONLY,
      }),
    ),
    (data) => prisma.availabilityRecord.createMany({ data: [...data] }),
  );
  await createInChunks(
    Array.from(
      { length: syntheticMaterialCount },
      (_unused, index): Prisma.PublicationRecordCreateManyInput => ({
        businessCatalogEntryId: businessEntryId(index),
        decidedByActorId: ids.owner,
        effectiveAt: capturedAt,
        id: uuid('a142', index + 1),
        reason: 'Synthetic scale validation only.',
        status: PublicationStatus.DRAFT,
      }),
    ),
    (data) => prisma.publicationRecord.createMany({ data: [...data] }),
  );

  await prisma.catalogVersion.create({
    data: {
      activatedAt: capturedAt,
      activatedByActorId: ids.admin,
      activationKey: 'PUBLIC',
      approvedAt: capturedAt,
      approvedByActorId: ids.owner,
      captureChecksum: 'a'.repeat(64),
      differenceChecksum: 'b'.repeat(64),
      id: ids.activeCatalogVersion,
      publishedAt: capturedAt,
      safeNotes: 'Synthetic scale fixture only',
      sourceManifest: {
        composition: composition as Prisma.InputJsonValue,
        fixture: 'PLAN-1B2-SCALE-001',
        synthetic: true,
      },
      sourceVersion: 'catalog-scale-active-v1',
      status: CatalogVersionStatus.ACTIVE,
      syncRunId: ids.activeRun,
      versionNumber: 8_001,
    },
  });
  await prisma.priceVersion.create({
    data: {
      activatedAt: capturedAt,
      activatedByActorId: ids.admin,
      activationKey: 'PUBLIC',
      approvedAt: capturedAt,
      approvedByActorId: ids.owner,
      differenceChecksum: 'c'.repeat(64),
      id: ids.activePriceVersion,
      sourceManifest: { fixture: 'PLAN-1B2-SCALE-001', synthetic: true },
      status: PriceVersionStatus.ACTIVE,
      syncRunId: ids.activeRun,
      versionNumber: 8_001,
    },
  });
  await prisma.catalogVersion.create({
    data: {
      captureChecksum: 'e'.repeat(64),
      differenceChecksum: catalogDifferenceChecksum,
      id: ids.candidateCatalogVersion,
      safeNotes: 'Synthetic scale bulk candidate only',
      sourceManifest: {
        businessPublicationPrepared: {
          initializedCount: syntheticMaterialCount,
          synthetic: true,
        },
        fixture: 'PLAN-1B2-SCALE-001',
        sourceDifferenceChecksum: catalogDifferenceChecksum,
        synthetic: true,
      },
      sourceVersion,
      status: CatalogVersionStatus.AWAITING_APPROVAL,
      syncRunId: ids.candidateRun,
      versionNumber: 8_002,
    },
  });
}

async function resetStatementStats(pool: Pool): Promise<void> {
  await pool.query('SELECT pg_stat_statements_reset()');
}

async function readStatementStats(pool: Pool, runtimeRole: string): Promise<StatementStats> {
  const result = await pool.query<StatRow>(
    `
      SELECT calls::text, plans::text, rows::text,
             temp_blks_written::text, total_exec_time
      FROM pg_stat_statements
      WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
        AND userid = (SELECT oid FROM pg_roles WHERE rolname = $1)
        AND query NOT IN ('BEGIN', 'COMMIT', 'ROLLBACK')
        AND query NOT ILIKE '%pg_stat_statements%'
    `,
    [runtimeRole],
  );
  return result.rows.reduce<StatementStats>(
    (stats, row) => ({
      calls: stats.calls + Number(row.calls),
      plans: stats.plans + Number(row.plans),
      rows: stats.rows + Number(row.rows),
      statementCount: stats.statementCount + 1,
      tempBlocksWritten: stats.tempBlocksWritten + Number(row.temp_blks_written),
      totalExecutionMilliseconds: stats.totalExecutionMilliseconds + Number(row.total_exec_time),
    }),
    {
      calls: 0,
      plans: 0,
      rows: 0,
      statementCount: 0,
      tempBlocksWritten: 0,
      totalExecutionMilliseconds: 0,
    },
  );
}

async function observed<T>(operation: () => Promise<T>): Promise<{
  readonly milliseconds: number;
  readonly result: T;
}> {
  const startedAt = performance.now();
  const result = await operation();
  return { milliseconds: performance.now() - startedAt, result };
}

describe('PLAN-1B2-SCALE-001 PostgreSQL catalog scale', () => {
  it('keeps public/admin queries constant and applies one atomic bulk command above real size', async () => {
    const environment = parseDatabaseEnvironment(process.env);
    const statsUrl = process.env['CATALOG_SCALE_STATS_DATABASE_URL'];
    if (statsUrl === undefined) throw new Error('CATALOG_SCALE_STATS_DATABASE_URL_REQUIRED');
    const runtimeRole = decodeURIComponent(new URL(environment.DATABASE_URL).username);
    const prisma = createPrismaClient(environment);
    const statsPool = new Pool({ connectionString: statsUrl, max: 1 });
    const read = createCatalogReadAdapter(environment);
    const management = createCatalogManagementAdapter(environment);
    const composition = buildPublicComposition();
    const heapBeforeSeed = process.memoryUsage().heapUsed;

    try {
      const seed = await observed(() => seedScaleCatalog(prisma, composition));
      const heapAfterSeed = process.memoryUsage().heapUsed;

      await resetStatementStats(statsPool);
      const publicRead = await observed(() => read.getPublicCatalog());
      const publicStats = await readStatementStats(statsPool, runtimeRole);
      const publicSnapshot = publicRead.result;
      expect(publicSnapshot).not.toBeNull();
      expect(publicSnapshot?.items).toHaveLength(syntheticMaterialCount);
      expect(publicStats.calls).toBe(1);
      expect(publicStats.statementCount).toBe(1);
      expect(publicStats.tempBlocksWritten).toBe(0);

      expect(maximumPublicCatalogMaterialCount).toBeGreaterThan(syntheticMaterialCount);
      expect(() =>
        buildCatalogPublicSnapshot({
          catalogVersion: (publicSnapshot as CatalogPublicSnapshot).catalogVersion,
          manifest: { composition },
          maximumMaterialCount: syntheticMaterialCount - 1,
          priceVersion: (publicSnapshot as CatalogPublicSnapshot).priceVersion,
        }),
      ).toThrow();

      await resetStatementStats(statsPool);
      const adminRead = await observed(() => read.listAdminVariants({ limit: 50, offset: 0 }));
      const adminStats = await readStatementStats(statsPool, runtimeRole);
      expect(adminRead.result.items).toHaveLength(50);
      expect(adminRead.result.total).toBe(syntheticMaterialCount);
      expect(adminRead.result.categories).toHaveLength(categoryCount);
      expect(adminRead.result.systems).toHaveLength(systemCount);
      expect(adminStats.calls).toBe(4);
      expect(adminStats.statementCount).toBe(4);
      expect(adminStats.tempBlocksWritten).toBe(0);

      const previewInput = {
        actorId: ids.owner,
        catalogSourceId,
        catalogVersionId: ids.candidateCatalogVersion,
        correlationId: 'catalog-scale-preview',
        expectedCatalogDifferenceChecksum: catalogDifferenceChecksum,
        patch: { visibility: 'HIDDEN' as const },
        reason: 'Synthetic scale validation only.',
        selector: { filter: { visibility: 'VISIBLE' as const }, mode: 'FILTER' as const },
        syncRunId: ids.candidateRun,
      };
      await resetStatementStats(statsPool);
      const preview = await observed(() => management.previewBusinessOverlayBulk(previewInput));
      const previewStats = await readStatementStats(statsPool, runtimeRole);
      expect(preview.result.matchedCount).toBe(syntheticMaterialCount);
      expect(preview.result.targetCount).toBe(syntheticMaterialCount);
      expect(preview.result.targets).toHaveLength(syntheticMaterialCount);
      expect(previewStats.calls).toBeLessThanOrEqual(6);
      expect(previewStats.statementCount).toBeLessThanOrEqual(6);
      expect(previewStats.tempBlocksWritten).toBe(0);

      await resetStatementStats(statsPool);
      const apply = await observed(() =>
        management.applyBusinessOverlayBulk({
          ...previewInput,
          confirmation: preview.result.confirmation,
          expectedSelectionChecksum: preview.result.selectionChecksum,
          expectedTargetCount: preview.result.targetCount,
          idempotencyKey: 'catalog-scale-bulk-apply-v1',
        }),
      );
      const applyStats = await readStatementStats(statsPool, runtimeRole);
      expect(apply.result.reused).toBe(false);
      expect(apply.result.targetCount).toBe(syntheticMaterialCount);
      expect(applyStats.calls).toBeLessThanOrEqual(12);
      expect(applyStats.statementCount).toBeLessThanOrEqual(12);
      expect(applyStats.tempBlocksWritten).toBe(0);
      await expect(
        prisma.businessCatalogEntry.count({
          where: { visibility: CatalogVisibility.HIDDEN },
        }),
      ).resolves.toBe(syntheticMaterialCount);
      await expect(prisma.catalogBulkCommand.count()).resolves.toBe(1);

      process.stdout.write(
        `${JSON.stringify({ admin: { observedMilliseconds: Math.round(adminRead.milliseconds * 100) / 100, pageItems: adminRead.result.items.length, ...adminStats }, bulkApply: { observedMilliseconds: Math.round(apply.milliseconds * 100) / 100, targetCount: apply.result.targetCount, ...applyStats }, bulkPreview: { observedMilliseconds: Math.round(preview.milliseconds * 100) / 100, targetCount: preview.result.targetCount, ...previewStats }, dataset: { categories: categoryCount, realDiscoveredMaterials: 1_655, syntheticMaterials: syntheticMaterialCount, systems: systemCount }, importFixture: { heapDeltaBytes: Math.max(0, heapAfterSeed - heapBeforeSeed), observedMilliseconds: Math.round(seed.milliseconds * 100) / 100 }, publicRead: { items: publicSnapshot?.items.length ?? 0, observedMilliseconds: Math.round(publicRead.milliseconds * 100) / 100, ...publicStats }, status: 'passed' })}\n`,
      );
    } finally {
      await Promise.allSettled([
        management.close(),
        read.close(),
        prisma.$disconnect(),
        statsPool.end(),
      ]);
    }
  }, 120_000);
});
