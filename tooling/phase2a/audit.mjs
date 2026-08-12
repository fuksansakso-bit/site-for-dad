import path from 'node:path';

import { ARTIFACT_ROOT, FORMAT_VERSION } from './constants.mjs';
import { collectLegacyExport } from './legacy-export.mjs';
import { canonicalJson, sha256, writeJson } from './io.mjs';

function distinctMedia(materials) {
  const media = new Map();
  for (const material of materials) {
    if (material.primaryMedia !== null)
      media.set(material.primaryMedia.fileHash, material.primaryMedia);
  }
  return media;
}

export async function auditLegacyData() {
  const source = await collectLegacyExport();
  const excludedCategoryIds = new Set(
    source.categoryExclusions.exclusions.flatMap((entry) => [
      entry.legacyId,
      ...entry.descendantCategoryLegacyIds,
    ]),
  );
  const retainedCategories = source.categories.filter(
    (category) => !excludedCategoryIds.has(category.legacyId),
  );
  const retainedCategoryIds = new Set(retainedCategories.map((category) => category.legacyId));
  const retainedMaterials = source.materials.filter((material) =>
    retainedCategoryIds.has(material.categoryLegacyId),
  );
  const sourceMedia = distinctMedia(source.materials);
  const retainedMedia = distinctMedia(retainedMaterials);
  const sourceMediaBytes = [...sourceMedia.values()].reduce((sum, item) => sum + item.byteSize, 0);
  const retainedMediaBytes = [...retainedMedia.values()].reduce(
    (sum, item) => sum + item.byteSize,
    0,
  );
  const report = {
    categoryExclusions: source.categoryExclusions,
    database: source.connection.database,
    formatVersion: FORMAT_VERSION,
    projection: {
      estimatedSimplifiedJsonBytes: Buffer.byteLength(
        canonicalJson({
          categories: retainedCategories,
          materials: retainedMaterials.map(
            ({ safeSourceData: _safeSourceData, properties: _properties, ...material }) => material,
          ),
          orders: source.orders,
          portfolio: source.portfolio,
          siteSettings: source.siteSettings,
        }),
      ),
      retainedCategoryCount: retainedCategories.length,
      retainedDistinctPrimaryMediaCount: retainedMedia.size,
      retainedMaterialCount: retainedMaterials.length,
      retainedPrimaryMediaBytes: retainedMediaBytes,
    },
    source: {
      activeCategoryCount: source.categories.length,
      activeMaterialCount: source.materials.length,
      activePrimaryMediaBytes: sourceMediaBytes,
      activePrimaryMediaCount: sourceMedia.size,
      averagePrimaryMediaBytes:
        sourceMedia.size === 0 ? 0 : Math.round(sourceMediaBytes / sourceMedia.size),
      catalogCaptureChecksum: source.sourceCatalogVersion.capture_checksum,
      catalogVersionId: source.sourceCatalogVersion.id,
      catalogVersionNumber: source.sourceCatalogVersion.version_number,
      orderCount: source.orders.length,
      portfolioCount: source.portfolio.length,
      sourceFingerprint: sha256({
        categories: source.categories,
        materials: source.materials,
        orders: source.orders,
        portfolio: source.portfolio,
        siteSettings: source.siteSettings,
      }),
    },
    technicalExclusions: source.technicalExclusions,
  };
  await writeJson(path.join(ARTIFACT_ROOT, 'audit.json'), report);
  await writeJson(path.join(ARTIFACT_ROOT, 'category-exclusions.json'), source.categoryExclusions);
  return report;
}
