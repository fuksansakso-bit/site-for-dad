import path from 'node:path';

import {
  EXPORT_ROOT,
  FORMAT_VERSION,
  MINIMUM_PRICE_KOPECKS,
  OWNER_EXCLUSION_REASON,
  TRANSFORM_ROOT,
} from './constants.mjs';
import { assertUnique, integer, object, readJson, sha256, sortBy, writeJson } from './io.mjs';

function firstText(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return null;
}

function description(record) {
  const source = object(record.safeSourceData);
  return firstText(
    record.description,
    source.description,
    source.safeDescription,
    source.shortDescription,
  );
}

export function mapAvailability(value) {
  if (value === 'AVAILABLE') return 'AVAILABLE';
  if (value === 'OUT_OF_STOCK') return 'OUT_OF_STOCK';
  return 'INQUIRY_ONLY';
}

export function explicitAreaRate(pricingRuleFact) {
  if (
    pricingRuleFact?.kind !== 'AREA_MINIMUM' ||
    pricingRuleFact.verificationStatus !== 'VERIFIED' ||
    pricingRuleFact.parityStatus !== 'PASSED'
  )
    return null;
  const data = object(pricingRuleFact.ruleData);
  // Legacy basePriceMinor and source card/base prices are intentionally not
  // treated as square-metre rates. Only an unambiguous named rate may cross.
  const rate = integer(data.pricePerM2Kopecks ?? data.rateKopecksPerSquareMetre);
  return rate !== null && rate > 0 ? rate : null;
}

export function transformMaterial(record, categoryLegacySourceId) {
  const rate = explicitAreaRate(record.pricingRuleFact);
  return {
    article: record.article,
    availability: mapAvailability(record.availability),
    categoryLegacySourceId,
    colorName: record.colorName,
    description: description(record),
    isPublished: true,
    legacyId: record.legacyId,
    legacySourceId: record.legacySourceId,
    materialType: record.materialType ?? record.collectionName,
    minimumPriceKopecks: rate === null ? null : MINIMUM_PRICE_KOPECKS,
    name: record.name,
    normalizedColor: record.normalizedColor,
    priceCategory: record.sourcePriceFact?.priceCategory ?? null,
    pricePerM2Kopecks: rate,
    primaryImagePath: null,
    primaryMedia: record.primaryMedia,
    pricingMode: rate === null ? 'MANUAL' : 'AREA',
    provenance: {
      localPriceFact: record.localPriceFact,
      pricingRuleFact: record.pricingRuleFact,
      sourceCapturedAt: record.sourceCapturedAt,
      sourceHash: record.sourceHash,
      sourceLastVerifiedAt: record.sourceLastVerifiedAt,
      sourcePriceFact: record.sourcePriceFact,
    },
    slug: record.slug,
    sortOrder: record.sortOrder,
    sourceName: record.sourceName,
    sourceUrl: record.sourceUrl,
  };
}

function mockOrderReason(order) {
  const searchable = `${order.customerName ?? ''} ${order.customerPhone ?? ''}`.toLocaleLowerCase(
    'ru',
  );
  if (/(synthetic|test|playwright|mock|demo|тест|пример)/u.test(searchable)) {
    return 'TECHNICAL_MOCK_ORDER';
  }
  return null;
}

function materialVariantId(item) {
  return firstText(object(object(item.configurationSnapshot).ids).materialVariantId);
}

export function transformOrder(order, materialByLegacyId) {
  const mockReason = mockOrderReason(order);
  if (mockReason !== null) return { reason: mockReason, row: null };
  if (!Array.isArray(order.items) || order.items.length === 0) {
    return { reason: 'ORDER_WITHOUT_IMMUTABLE_ITEMS', row: null };
  }
  const items = [];
  for (const item of order.items) {
    const sourceMaterialId = materialVariantId(item);
    const material =
      sourceMaterialId === null ? undefined : materialByLegacyId.get(sourceMaterialId);
    if (material === undefined) {
      return { reason: 'ORDER_ITEM_MATERIAL_EXCLUDED_OR_UNMAPPED', row: null };
    }
    const snapshot = object(item.snapshot);
    const product = object(snapshot.product);
    const widthMm = integer(product.widthMm);
    const heightMm = integer(product.heightMm);
    const quantity = integer(product.quantity);
    if (widthMm === null || heightMm === null || quantity === null || quantity < 1) {
      return { reason: 'ORDER_ITEM_DIMENSIONS_INVALID', row: null };
    }
    const unitPrice = integer(snapshot.unitPriceKopecks);
    const totalPrice = integer(snapshot.quantityTotalKopecks ?? item.knownTotalKopecks);
    items.push({
      articleSnapshot: firstText(product.materialArticle, material.article),
      createdAt: order.createdAt,
      heightMm,
      legacySourceId: `${order.requestNumber}:${String(item.sequence)}`,
      materialLegacySourceId: material.legacySourceId,
      nameSnapshot: firstText(product.material, material.name),
      pricingModeSnapshot: 'MANUAL',
      pricingStatus: unitPrice === null || totalPrice === null ? 'MANUAL' : 'KNOWN',
      quantity,
      sequence: item.sequence,
      totalPriceKopecks: totalPrice,
      unitPriceKopecks: unitPrice,
      widthMm,
    });
  }
  const knownItems = items.filter((item) => item.pricingStatus === 'KNOWN').length;
  const createdDate = new Date(order.createdAt);
  const datePart = Number.isNaN(createdDate.getTime())
    ? '19700101'
    : createdDate.toISOString().slice(0, 10).replaceAll('-', '');
  return {
    reason: null,
    row: {
      address: order.address,
      comment: order.comment,
      createdAt: order.createdAt,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      installmentInterest: order.installmentInterest,
      items,
      knownTotalKopecks: knownItems === 0 ? null : integer(order.knownTotalKopecks),
      legacySourceId: `legacy-order:${order.legacyId}`,
      locality: order.locality,
      measurementRequested: order.measurementRequested,
      pricingStatus:
        knownItems === items.length ? 'KNOWN' : knownItems === 0 ? 'MANUAL' : 'PARTIAL',
      publicReference: sha256(`legacy-public:${order.publicReferenceHash}`).slice(0, 48),
      requestNumber: `REQ-${datePart}-${sha256(`legacy-request:${order.legacyId}`).slice(0, 6).toUpperCase()}`,
      status: ['NEW', 'IN_REVIEW', 'CONTACTED', 'COMPLETED', 'CANCELLED'].includes(order.status)
        ? order.status
        : 'IN_REVIEW',
      updatedAt: order.updatedAt,
    },
  };
}

function transformPortfolio(record) {
  return {
    categoryLegacySourceId: null,
    coverImagePath: null,
    coverMedia: record.coverMedia,
    description: record.description,
    isPublished: record.status === 'PUBLISHED',
    legacyCategoryLabel: record.category,
    legacyId: record.legacyId,
    legacySourceId: `legacy-portfolio:${record.legacyId}`,
    slug: record.slug,
    sortOrder: 0,
    title: record.title,
  };
}

function transformSettings(records) {
  const active = records[0];
  if (active === undefined) return [];
  const source = object(active.settings);
  const services = object(source.services);
  return [
    {
      businessName: firstText(source.businessName) ?? 'PROJECT_NAME',
      freeDelivery: services.delivery === 'Бесплатно',
      freeInstallation: services.installation === 'Бесплатно',
      freeMeasurement: services.measurement === 'Бесплатно',
      installmentText: firstText(source.installmentText),
      legacySourceId: `legacy-site-settings:${active.legacyId}`,
      logoPath: null,
      manufacturingLeadTime: firstText(source.manufacturingLeadTime),
      partnerBadgePath: null,
      phone: null,
      region: firstText(source.territory),
      socialLinks: {},
      warranty: firstText(source.warranty),
      whatsapp: firstText(source.whatsappRecipient),
    },
  ];
}

async function validateExport(manifest) {
  if (manifest.formatVersion !== FORMAT_VERSION) throw new Error('Unsupported export format');
  for (const [name, expected] of Object.entries(manifest.artifacts)) {
    const value = await readJson(path.join(EXPORT_ROOT, name));
    const actual = sha256(value);
    if (actual !== expected.sha256) throw new Error(`Export checksum mismatch: ${name}`);
  }
}

export async function transformExport() {
  const manifest = await readJson(path.join(EXPORT_ROOT, 'manifest.json'));
  await validateExport(manifest);
  const [
    sourceCategories,
    sourceMaterials,
    sourceOrders,
    sourcePortfolio,
    sourceSettings,
    exclusions,
  ] = await Promise.all([
    readJson(path.join(EXPORT_ROOT, 'categories.json')),
    readJson(path.join(EXPORT_ROOT, 'materials.json')),
    readJson(path.join(EXPORT_ROOT, 'orders.json')),
    readJson(path.join(EXPORT_ROOT, 'portfolio.json')),
    readJson(path.join(EXPORT_ROOT, 'site-settings.json')),
    readJson(path.join(EXPORT_ROOT, 'category-exclusions.json')),
  ]);
  if (exclusions.reason !== OWNER_EXCLUSION_REASON)
    throw new Error('Owner exclusion manifest missing');
  const excludedCategories = new Set(
    exclusions.exclusions.flatMap((entry) => [
      entry.legacyId,
      ...entry.descendantCategoryLegacyIds,
    ]),
  );
  const retainedSourceCategories = sourceCategories.filter(
    (category) => !excludedCategories.has(category.legacyId),
  );
  const categorySourceIdByLegacyId = new Map(
    retainedSourceCategories.map((category) => [category.legacyId, category.legacySourceId]),
  );
  const categories = retainedSourceCategories.map((category) => ({
    description: description(category),
    imagePath: null,
    isPublished: true,
    legacyId: category.legacyId,
    legacySourceId: category.legacySourceId,
    name: category.name,
    parentLegacySourceId:
      category.parentLegacyId === null
        ? null
        : (categorySourceIdByLegacyId.get(category.parentLegacyId) ?? null),
    slug: category.slug,
    sortOrder: category.sortOrder,
    sourceId: category.sourceId,
    sourceUrl: category.sourceUrl,
  }));
  const retainedSourceMaterials = sourceMaterials.filter((material) =>
    categorySourceIdByLegacyId.has(material.categoryLegacyId),
  );
  const materials = retainedSourceMaterials.map((material) =>
    transformMaterial(material, categorySourceIdByLegacyId.get(material.categoryLegacyId)),
  );
  assertUnique(categories, 'legacySourceId', 'transformed categories');
  assertUnique(materials, 'legacySourceId', 'transformed materials');
  const materialByLegacyId = new Map(materials.map((material) => [material.legacyId, material]));
  const skippedOrders = [];
  const orders = [];
  for (const sourceOrder of sourceOrders) {
    const result = transformOrder(sourceOrder, materialByLegacyId);
    if (result.row === null) {
      skippedOrders.push({
        legacyId: sourceOrder.legacyId,
        reason: result.reason,
        requestNumber: sourceOrder.requestNumber,
      });
    } else orders.push(result.row);
  }
  const portfolio = sourcePortfolio.map(transformPortfolio);
  const siteSettings = transformSettings(sourceSettings);

  const output = {
    categories: sortBy(categories, 'legacySourceId'),
    categoryExclusions: exclusions,
    materials: sortBy(materials, 'legacySourceId'),
    orders: sortBy(orders, 'requestNumber'),
    portfolio: sortBy(portfolio, 'legacySourceId'),
    siteSettings,
    skippedOrders: sortBy(skippedOrders, 'requestNumber'),
  };
  const artifacts = {};
  for (const [name, value] of [
    ['categories.json', output.categories],
    ['materials.json', output.materials],
    ['orders.json', output.orders],
    ['portfolio.json', output.portfolio],
    ['site-settings.json', output.siteSettings],
    ['skipped-orders.json', output.skippedOrders],
    ['category-exclusions.json', output.categoryExclusions],
  ]) {
    artifacts[name] = await writeJson(path.join(TRANSFORM_ROOT, name), value);
  }
  const transformManifest = {
    artifacts,
    counts: Object.fromEntries(
      Object.entries(output)
        .filter(([, value]) => Array.isArray(value))
        .map(([key, value]) => [key, value.length]),
    ),
    formatVersion: FORMAT_VERSION,
    sourceCatalogVersionId: exclusions.sourceCatalogVersionId,
    sourceFingerprint: manifest.sourceFingerprint,
    transformFingerprint: sha256(output),
  };
  await writeJson(path.join(TRANSFORM_ROOT, 'manifest.json'), transformManifest);
  return { manifest: transformManifest, output };
}
