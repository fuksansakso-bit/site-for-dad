import path from 'node:path';

import { ARTIFACT_ROOT, OWNER_CATEGORY_EXCLUSIONS, TRANSFORM_ROOT } from './constants.mjs';
import { assertUnique, readJson, sha256, writeJson } from './io.mjs';
import { cloudTableRows, hasSupabaseCredentials } from './supabase.mjs';
import { transformExport } from './transform.mjs';

async function verifyArtifacts(manifest) {
  for (const [name, expected] of Object.entries(manifest.artifacts)) {
    const value = await readJson(path.join(TRANSFORM_ROOT, name));
    if (sha256(value) !== expected.sha256) throw new Error(`Transform checksum mismatch: ${name}`);
  }
}

export async function verifyMigration() {
  const before = await readJson(path.join(TRANSFORM_ROOT, 'manifest.json'));
  await verifyArtifacts(before);
  const [categories, materials, orders, skippedOrders, exclusions] = await Promise.all([
    readJson(path.join(TRANSFORM_ROOT, 'categories.json')),
    readJson(path.join(TRANSFORM_ROOT, 'materials.json')),
    readJson(path.join(TRANSFORM_ROOT, 'orders.json')),
    readJson(path.join(TRANSFORM_ROOT, 'skipped-orders.json')),
    readJson(path.join(TRANSFORM_ROOT, 'category-exclusions.json')),
  ]);
  assertUnique(categories, 'legacySourceId', 'verified categories');
  assertUnique(materials, 'legacySourceId', 'verified materials');
  assertUnique(orders, 'requestNumber', 'verified orders');
  if (exclusions.exclusions.length !== OWNER_CATEGORY_EXCLUSIONS.length) {
    throw new Error('Owner category exclusion count changed');
  }
  const excludedLegacyIds = new Set(
    exclusions.exclusions.flatMap((entry) => [
      entry.legacyId,
      ...entry.descendantCategoryLegacyIds,
    ]),
  );
  if (categories.some((category) => excludedLegacyIds.has(category.legacyId))) {
    throw new Error('Owner-excluded category survived transformation');
  }
  const categoryIds = new Set(categories.map((category) => category.legacySourceId));
  if (materials.some((material) => !categoryIds.has(material.categoryLegacySourceId))) {
    throw new Error('Transformed material has an unknown category');
  }
  if (
    materials.some(
      (material) => material.pricingMode === 'MANUAL' && material.pricePerM2Kopecks !== null,
    )
  ) {
    throw new Error('MANUAL material unexpectedly has a square-metre rate');
  }
  if (materials.some((material) => material.primaryMedia === null)) {
    throw new Error('A retained published material has no primary media');
  }
  if (
    materials.some(
      (material) =>
        material.primaryMedia.rightsStatus !== 'PARTNER_LICENSE' ||
        material.primaryMedia.publicationStatus !== 'PUBLICATION_APPROVED',
    )
  ) {
    throw new Error('Retained media is not approved for publication');
  }

  const repeated = await transformExport();
  if (repeated.manifest.transformFingerprint !== before.transformFingerprint) {
    throw new Error('Repeated transformation changed its fingerprint');
  }
  const offline = {
    categoryCount: categories.length,
    duplicateCount: 0,
    materialCount: materials.length,
    orderCount: orders.length,
    ownerExcludedCategoryCount: exclusions.totals.categoryCount,
    ownerExcludedMaterialCount: exclusions.totals.materialCount,
    repeatedTransform: 'NO_OP',
    skippedOrderCount: skippedOrders.length,
    status: 'PASS',
  };

  let cloud = { reason: 'CLOUD_CREDENTIALS_UNAVAILABLE', status: 'SKIPPED' };
  if (hasSupabaseCredentials()) {
    const [cloudCategories, cloudMaterials, cloudOrders] = await Promise.all([
      cloudTableRows('categories'),
      cloudTableRows('materials'),
      cloudTableRows('orders', 'request_number'),
    ]);
    if (
      cloudCategories.count !== categories.length ||
      cloudMaterials.count !== materials.length ||
      cloudOrders.count !== orders.length
    ) {
      throw new Error('Cloud row counts do not match transformed row counts');
    }
    cloud = {
      categories: cloudCategories.count,
      materials: cloudMaterials.count,
      orders: cloudOrders.count,
      status: 'PASS',
    };
  }
  const report = { cloud, offline, transformFingerprint: before.transformFingerprint };
  await writeJson(path.join(ARTIFACT_ROOT, 'verify.json'), report);
  return report;
}
