import path from 'node:path';

import {
  ARTIFACT_ROOT,
  EXPORT_ROOT,
  FORMAT_VERSION,
  OWNER_CATEGORY_EXCLUSIONS,
  OWNER_EXCLUSION_REASON,
  TECHNICAL_EXCLUSIONS,
} from './constants.mjs';
import { countExistingTable, withLegacySnapshot } from './legacy-db.mjs';
import { assertUnique, sha256, sortBy, writeJson } from './io.mjs';

const activeVersionSql = `
  SELECT id::text AS id, version_number, capture_checksum, source_version,
         source_manifest, activated_at, published_at
  FROM catalog_version
  WHERE status = 'ACTIVE'
  ORDER BY version_number DESC
`;

const categoriesSql = `
  SELECT category.id::text AS legacy_id, category.parent_id::text AS parent_legacy_id,
         category.name, category.slug, category.sort_order,
         source.id::text AS source_entity_legacy_id,
         source.catalog_source_id::text AS catalog_source_id,
         source.source_id, source.source_slug, source.source_url,
         source.source_category, source.source_hash, source.safe_source_data,
         source.source_captured_at, source.source_last_verified_at,
         business.local_description, business.local_order,
         availability.status::text AS availability,
         publication.status::text AS publication_status
  FROM catalog_version version
  JOIN catalog_version_entry entry ON entry.catalog_version_id = version.id
  JOIN business_catalog_entry business ON business.id = entry.business_catalog_entry_id
  JOIN product_category category ON category.id = business.category_id
  JOIN source_entity source ON source.id = category.source_entity_id
  JOIN publication_record publication ON publication.id = entry.publication_record_id
  JOIN availability_record availability ON availability.id = entry.availability_record_id
  WHERE version.status = 'ACTIVE' AND business.entity_type = 'CATEGORY'
    AND business.visibility = 'VISIBLE' AND publication.status = 'PUBLISHED'
  ORDER BY source.catalog_source_id, source.source_id
`;

const materialsSql = `
  SELECT variant.id::text AS legacy_id, variant.name, variant.slug, variant.article,
         variant.width_mm::text, variant.is_blackout, variant.is_zebra,
         material.id::text AS material_legacy_id, material.name AS collection_name,
         material.category_id::text AS category_legacy_id,
         color.name AS color_name, color.normalized_hex AS normalized_color,
         system.name AS material_type,
         source.id::text AS source_entity_legacy_id,
         source.catalog_source_id::text AS catalog_source_id,
         source.source_id, source.source_slug, source.source_url,
         source.source_category, source.source_hash, source.safe_source_data,
         source.source_captured_at, source.source_last_verified_at,
         catalog_source.name AS source_name,
         business.local_description, business.local_order,
         availability.status::text AS availability,
         publication.status::text AS publication_status,
         local_price.amount_minor AS local_price_amount_minor,
         local_price.currency AS local_price_currency,
         local_price.reason AS local_price_reason,
         source_price.kind::text AS source_price_kind,
         source_price.status::text AS source_price_status,
         source_price.amount_minor AS source_price_amount_minor,
         source_price.currency AS source_price_currency,
         source_price.source_price_category,
         source_price.source_context,
         pricing.kind::text AS pricing_rule_kind,
         pricing.verification_status::text AS pricing_verification_status,
         pricing.parity_status::text AS pricing_parity_status,
         pricing.base_price_minor AS pricing_base_price_minor,
         pricing.rule_data AS pricing_rule_data,
         media.id::text AS media_legacy_id, media.object_key, media.file_hash,
         media.byte_size, media.mime_type, media.width AS media_width,
         media.height AS media_height, media.rights_status::text,
         media.publication_status::text AS media_publication_status,
         source_media.source_url AS media_source_url,
         source_media.source_id AS media_source_id
  FROM catalog_version version
  JOIN catalog_version_entry entry ON entry.catalog_version_id = version.id
  JOIN business_catalog_entry business ON business.id = entry.business_catalog_entry_id
  JOIN material_variant variant ON variant.id = business.material_variant_id
  JOIN material material ON material.id = variant.material_id
  JOIN source_entity source ON source.id = variant.source_entity_id
  JOIN catalog_source ON catalog_source.id = source.catalog_source_id
  LEFT JOIN color ON color.id = variant.color_id
  LEFT JOIN product_system system ON system.id = variant.primary_system_id
  JOIN publication_record publication ON publication.id = entry.publication_record_id
  JOIN availability_record availability ON availability.id = entry.availability_record_id
  LEFT JOIN local_price_override local_price ON local_price.id = entry.local_price_override_id
  LEFT JOIN source_price_record source_price ON source_price.id = entry.source_price_record_id
  LEFT JOIN media_asset media ON media.id = entry.primary_media_asset_id
  LEFT JOIN LATERAL (
    SELECT asset.source_url, asset.source_id
    FROM source_media_asset asset
    WHERE asset.media_asset_id = media.id AND asset.material_variant_id = variant.id
    ORDER BY CASE WHEN asset.role = 'PRIMARY' THEN 0 ELSE 1 END,
             asset.sort_order, asset.source_id
    LIMIT 1
  ) source_media ON true
  LEFT JOIN LATERAL (
    SELECT rule.kind, rule.verification_status, rule.parity_status,
           rule.base_price_minor, rule.rule_data
    FROM pricing_rule rule
    JOIN price_version price_version ON price_version.id = rule.price_version_id
    WHERE rule.catalog_version_id = version.id
      AND rule.material_variant_id = variant.id
      AND price_version.status = 'ACTIVE'
    ORDER BY rule.verified_at DESC, rule.rule_key
    LIMIT 1
  ) pricing ON true
  WHERE version.status = 'ACTIVE' AND business.entity_type = 'MATERIAL_VARIANT'
    AND business.visibility = 'VISIBLE' AND publication.status = 'PUBLISHED'
  ORDER BY source.catalog_source_id, source.source_id
`;

const propertiesSql = `
  SELECT property.variant_id::text AS variant_legacy_id, property.key,
         property.name, property.value, property.unit, property.source_hash
  FROM material_property property
  JOIN material_variant variant ON variant.id = property.variant_id
  JOIN business_catalog_entry business ON business.material_variant_id = variant.id
  JOIN catalog_version_entry entry ON entry.business_catalog_entry_id = business.id
  JOIN catalog_version version ON version.id = entry.catalog_version_id
  JOIN publication_record publication ON publication.id = entry.publication_record_id
  WHERE version.status = 'ACTIVE' AND business.visibility = 'VISIBLE'
    AND publication.status = 'PUBLISHED'
  ORDER BY property.variant_id, property.key
`;

const ordersSql = `
  SELECT inquiry.id::text AS legacy_id, inquiry.request_number,
         inquiry.public_reference_hash, inquiry.contact_name, inquiry.contact_phone,
         inquiry.locality, inquiry.address, inquiry.comment,
         inquiry.measurement_requested, inquiry.installment_interest,
         inquiry.pricing_status::text, inquiry.known_subtotal_minor::text,
         inquiry.status::text, inquiry.source_channel::text,
         inquiry.audit_context, inquiry.created_at, inquiry.updated_at,
         item.id::text AS item_legacy_id, item.sequence,
         item.pricing_status::text AS item_pricing_status,
         item.known_total_minor::text AS item_known_total_minor,
         item.snapshot AS item_snapshot,
         quote.configuration_snapshot, quote.breakdown_snapshot
  FROM order_inquiry inquiry
  LEFT JOIN request_item_snapshot item ON item.inquiry_id = inquiry.id
  LEFT JOIN quote_snapshot quote ON quote.id = item.quote_snapshot_id
  ORDER BY inquiry.request_number, item.sequence
`;

const portfolioSql = `
  SELECT item.id::text AS legacy_id, item.slug, item.title, item.description,
         item.category, item.status::text, item.published_at,
         media.id::text AS media_legacy_id, media.safe_name,
         media.rights_status::text, media.publication_status::text,
         display.object_key, display.file_hash, display.byte_size,
         display.mime_type, display.width, display.height
  FROM portfolio_item item
  LEFT JOIN LATERAL (
    SELECT candidate.* FROM portfolio_media candidate
    WHERE candidate.portfolio_item_id = item.id
      AND candidate.status = 'PUBLICATION_APPROVED'
      AND candidate.publication_status = 'PUBLICATION_APPROVED'
    ORDER BY candidate.created_at, candidate.id LIMIT 1
  ) media ON true
  LEFT JOIN media_asset display ON display.id = media.display_asset_id
  WHERE item.status = 'PUBLISHED'
  ORDER BY item.slug
`;

const settingsSql = `
  SELECT revision.id::text AS legacy_id, revision.version,
         revision.settings, revision.activated_at
  FROM site_settings_pointer pointer
  JOIN site_settings_revision revision ON revision.id = pointer.revision_id
  WHERE pointer.singleton_id = 1 AND revision.status = 'ACTIVE'
`;

function stableSourceId(row) {
  return `${row.catalog_source_id}:${row.source_id}`;
}

function mediaOf(row) {
  if (row.media_legacy_id === null) return null;
  return {
    byteSize: Number(row.byte_size),
    fileHash: row.file_hash,
    height: Number(row.media_height),
    legacyId: row.media_legacy_id,
    mimeType: row.mime_type,
    objectKey: row.object_key,
    publicationStatus: row.media_publication_status,
    rightsStatus: row.rights_status,
    sourceId: row.media_source_id,
    sourceUrl: row.media_source_url,
    width: Number(row.media_width),
  };
}

function groupOrders(rows) {
  const orders = new Map();
  for (const row of rows) {
    const order = orders.get(row.legacy_id) ?? {
      address: row.address,
      auditContext: row.audit_context,
      comment: row.comment,
      createdAt: row.created_at,
      customerName: row.contact_name,
      customerPhone: row.contact_phone,
      installmentInterest: row.installment_interest,
      items: [],
      knownTotalKopecks: row.known_subtotal_minor,
      legacyId: row.legacy_id,
      locality: row.locality,
      measurementRequested: row.measurement_requested,
      pricingStatus: row.pricing_status,
      publicReferenceHash: row.public_reference_hash,
      requestNumber: row.request_number,
      sourceChannel: row.source_channel,
      status: row.status,
      updatedAt: row.updated_at,
    };
    if (row.item_legacy_id !== null) {
      order.items.push({
        breakdownSnapshot: row.breakdown_snapshot,
        configurationSnapshot: row.configuration_snapshot,
        knownTotalKopecks: row.item_known_total_minor,
        legacyId: row.item_legacy_id,
        pricingStatus: row.item_pricing_status,
        sequence: row.sequence,
        snapshot: row.item_snapshot,
      });
    }
    orders.set(row.legacy_id, order);
  }
  return sortBy([...orders.values()], 'requestNumber');
}

export function buildCategoryExclusions(sourceCatalogVersionId, categories, materials) {
  const byLegacyId = new Map(categories.map((category) => [category.legacyId, category]));
  const children = new Map();
  for (const category of categories) {
    if (category.parentLegacyId === null) continue;
    const values = children.get(category.parentLegacyId) ?? [];
    values.push(category.legacyId);
    children.set(category.parentLegacyId, values);
  }

  const excludedCategoryIds = new Set();
  const exclusions = OWNER_CATEGORY_EXCLUSIONS.map((expected) => {
    const matches = categories.filter((category) => category.sourceId === expected.sourceId);
    if (matches.length !== 1) {
      throw new Error(
        `Owner exclusion ${expected.sourceId} resolved to ${matches.length} categories`,
      );
    }
    const root = matches[0];
    if (root.sourceSlug !== expected.sourceSlug || root.name !== expected.name) {
      throw new Error(`Owner exclusion identity drift for ${expected.sourceId}`);
    }
    const descendants = [];
    const queue = [...(children.get(root.legacyId) ?? [])];
    while (queue.length > 0) {
      const legacyId = queue.shift();
      if (!byLegacyId.has(legacyId)) throw new Error('Category tree contains an unknown child');
      descendants.push(legacyId);
      queue.push(...(children.get(legacyId) ?? []));
    }
    const categoryIds = new Set([root.legacyId, ...descendants]);
    for (const categoryId of categoryIds) excludedCategoryIds.add(categoryId);
    const excludedMaterials = materials.filter((material) =>
      categoryIds.has(material.categoryLegacyId),
    );
    const media = new Map();
    for (const material of excludedMaterials) {
      if (material.primaryMedia !== null) {
        media.set(material.primaryMedia.fileHash, material.primaryMedia);
      }
    }
    return {
      categoryCount: categoryIds.size,
      descendantCategoryLegacyIds: descendants.sort((a, b) => a.localeCompare(b, 'en')),
      distinctPrimaryMediaCount: media.size,
      legacyId: root.legacyId,
      materialCount: excludedMaterials.length,
      name: root.name,
      ownerLabel: expected.ownerLabel,
      primaryMediaBytes: [...media.values()].reduce((sum, item) => sum + item.byteSize, 0),
      sourceId: root.sourceId,
      sourceSlug: root.sourceSlug,
    };
  }).sort((left, right) => left.sourceId.localeCompare(right.sourceId, 'en'));

  const excludedMaterials = materials.filter((material) =>
    excludedCategoryIds.has(material.categoryLegacyId),
  );
  const allMedia = new Map();
  for (const material of excludedMaterials) {
    if (material.primaryMedia !== null)
      allMedia.set(material.primaryMedia.fileHash, material.primaryMedia);
  }
  return {
    excludedCategoryIds,
    excludedMaterialIds: new Set(excludedMaterials.map((material) => material.legacyId)),
    manifest: {
      exclusions,
      reason: OWNER_EXCLUSION_REASON,
      sourceCatalogVersionId,
      totals: {
        categoryCount: excludedCategoryIds.size,
        distinctPrimaryMediaCount: allMedia.size,
        materialCount: excludedMaterials.length,
        primaryMediaBytes: [...allMedia.values()].reduce((sum, item) => sum + item.byteSize, 0),
      },
    },
  };
}

export async function collectLegacyExport() {
  return withLegacySnapshot(async (client, connection) => {
    const versionResult = await client.query(activeVersionSql);
    if (versionResult.rows.length !== 1) {
      throw new Error(
        `Expected exactly one active CatalogVersion, found ${versionResult.rows.length}`,
      );
    }
    const version = versionResult.rows[0];
    const categoryResult = await client.query(categoriesSql);
    const materialResult = await client.query(materialsSql);
    const propertyResult = await client.query(propertiesSql);
    const orderResult = await client.query(ordersSql);
    const portfolioResult = await client.query(portfolioSql);
    const settingsResult = await client.query(settingsSql);

    const properties = new Map();
    for (const row of propertyResult.rows) {
      const values = properties.get(row.variant_legacy_id) ?? [];
      values.push({
        key: row.key,
        name: row.name,
        sourceHash: row.source_hash,
        unit: row.unit,
        value: row.value,
      });
      properties.set(row.variant_legacy_id, values);
    }
    const categories = categoryResult.rows.map((row) => ({
      availability: row.availability,
      catalogSourceId: row.catalog_source_id,
      description: row.local_description,
      legacyId: row.legacy_id,
      legacySourceId: stableSourceId(row),
      name: row.name,
      parentLegacyId: row.parent_legacy_id,
      publicationStatus: row.publication_status,
      safeSourceData: row.safe_source_data,
      slug: row.slug,
      sortOrder: row.local_order ?? row.sort_order,
      sourceCapturedAt: row.source_captured_at,
      sourceCategory: row.source_category,
      sourceHash: row.source_hash,
      sourceId: row.source_id,
      sourceLastVerifiedAt: row.source_last_verified_at,
      sourceSlug: row.source_slug,
      sourceUrl: row.source_url,
    }));
    const materials = materialResult.rows.map((row) => ({
      article: row.article,
      availability: row.availability,
      catalogSourceId: row.catalog_source_id,
      categoryLegacyId: row.category_legacy_id,
      collectionName: row.collection_name,
      colorName: row.color_name,
      description: row.local_description,
      isBlackout: row.is_blackout,
      isZebra: row.is_zebra,
      legacyId: row.legacy_id,
      legacySourceId: stableSourceId(row),
      localPriceFact:
        row.local_price_amount_minor === null
          ? null
          : {
              amountKopecks: row.local_price_amount_minor,
              currency: row.local_price_currency,
              reason: row.local_price_reason,
            },
      materialType: row.material_type,
      name: row.name,
      normalizedColor: row.normalized_color,
      primaryMedia: mediaOf(row),
      pricingRuleFact:
        row.pricing_rule_kind === null
          ? null
          : {
              basePriceMinor: row.pricing_base_price_minor,
              kind: row.pricing_rule_kind,
              parityStatus: row.pricing_parity_status,
              ruleData: row.pricing_rule_data,
              verificationStatus: row.pricing_verification_status,
            },
      properties: properties.get(row.legacy_id) ?? [],
      publicationStatus: row.publication_status,
      safeSourceData: row.safe_source_data,
      slug: row.slug,
      sortOrder: row.local_order,
      sourceCapturedAt: row.source_captured_at,
      sourceCategory: row.source_category,
      sourceHash: row.source_hash,
      sourceId: row.source_id,
      sourceLastVerifiedAt: row.source_last_verified_at,
      sourceName: row.source_name,
      sourcePriceFact:
        row.source_price_kind === null
          ? null
          : {
              amountKopecks: row.source_price_amount_minor,
              context: row.source_context,
              currency: row.source_price_currency,
              kind: row.source_price_kind,
              priceCategory: row.source_price_category,
              status: row.source_price_status,
            },
      sourceSlug: row.source_slug,
      sourceUrl: row.source_url,
      widthMm: row.width_mm,
    }));
    assertUnique(categories, 'legacySourceId', 'legacy categories');
    assertUnique(materials, 'legacySourceId', 'legacy materials');

    const technicalExclusions = [];
    for (const [table, reason] of TECHNICAL_EXCLUSIONS) {
      technicalExclusions.push({ ...(await countExistingTable(client, table)), reason, table });
    }
    const categoryExclusions = buildCategoryExclusions(version.id, categories, materials);
    return {
      categoryExclusions: categoryExclusions.manifest,
      categories: sortBy(categories, 'legacySourceId'),
      connection: { database: connection.database, source: connection.source },
      formatVersion: FORMAT_VERSION,
      materials: sortBy(materials, 'legacySourceId'),
      orders: groupOrders(orderResult.rows),
      portfolio: portfolioResult.rows.map((row) => ({
        category: row.category,
        coverMedia:
          row.media_legacy_id === null
            ? null
            : {
                byteSize: Number(row.byte_size),
                fileHash: row.file_hash,
                height: row.height,
                legacyId: row.media_legacy_id,
                mimeType: row.mime_type,
                objectKey: row.object_key,
                publicationStatus: row.publication_status,
                rightsStatus: row.rights_status,
                safeName: row.safe_name,
                width: row.width,
              },
        description: row.description,
        legacyId: row.legacy_id,
        publishedAt: row.published_at,
        slug: row.slug,
        status: row.status,
        title: row.title,
      })),
      siteSettings: settingsResult.rows.map((row) => ({
        activatedAt: row.activated_at,
        legacyId: row.legacy_id,
        settings: row.settings,
        version: row.version,
      })),
      sourceCatalogVersion: version,
      technicalExclusions: sortBy(technicalExclusions, 'table'),
    };
  });
}

async function writeArtifact(relativePath, value) {
  return writeJson(path.join(EXPORT_ROOT, relativePath), value);
}

export async function exportLegacyData() {
  const data = await collectLegacyExport();
  const artifacts = {};
  for (const [name, value] of [
    ['categories.json', data.categories],
    ['materials.json', data.materials],
    ['orders.json', data.orders],
    ['portfolio.json', data.portfolio],
    ['site-settings.json', data.siteSettings],
    ['technical-exclusions.json', data.technicalExclusions],
    ['category-exclusions.json', data.categoryExclusions],
  ]) {
    artifacts[name] = await writeArtifact(name, value);
  }
  const manifest = {
    artifacts,
    counts: {
      categories: data.categories.length,
      materials: data.materials.length,
      orders: data.orders.length,
      portfolio: data.portfolio.length,
      siteSettings: data.siteSettings.length,
    },
    database: data.connection.database,
    formatVersion: data.formatVersion,
    sourceCatalogVersion: data.sourceCatalogVersion,
    sourceFingerprint: sha256({
      captureChecksum: data.sourceCatalogVersion.capture_checksum,
      categories: data.categories,
      materials: data.materials,
      orders: data.orders,
      portfolio: data.portfolio,
      siteSettings: data.siteSettings,
    }),
  };
  await writeArtifact('manifest.json', manifest);
  return { artifactRoot: ARTIFACT_ROOT, data, manifest };
}
