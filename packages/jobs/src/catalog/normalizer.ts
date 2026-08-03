import {
  hashCanonicalSource,
  type CapturedSource,
  type SourceCategory,
  type SourceIdentity,
  type SourceMaterial,
  type SourceMediaManifest,
  type SourceMediaReference,
  type SourceModel,
  type SourcePrice,
  type SourceSystem,
} from '@project-name/catalog';
import type { JobHelpers } from 'graphile-worker';
import type { PoolClient } from 'pg';

import { type CatalogNormalizePayload } from './contracts.js';
import { CatalogPipelineError, toCatalogPipelineError } from './errors.js';
import { catalogSafeSnapshotPayloadSchema, type CatalogSafeSnapshotPayload } from './snapshot.js';

interface ExistingSourceEntity {
  readonly id: string;
  readonly source_hash: string;
  readonly status: 'ACTIVE' | 'PARSE_ERROR' | 'SOURCE_REMOVED';
}

interface NormalizedSourceEntity {
  readonly id: string;
  readonly itemStatus: 'CREATED' | 'UNCHANGED' | 'UPDATED';
  readonly previousHash: string | null;
}

interface NormalizedReference {
  readonly id: string;
  readonly sourceEntityId: string;
}

type NormalizedMediaTarget =
  | { readonly id: string; readonly kind: 'CATEGORY'; readonly sourceId: string }
  | { readonly id: string; readonly kind: 'MATERIAL_VARIANT'; readonly sourceId: string }
  | { readonly id: string; readonly kind: 'MODEL'; readonly sourceId: string }
  | { readonly id: string; readonly kind: 'SYSTEM'; readonly sourceId: string };

type NormalizedPriceTarget =
  | { readonly id: string; readonly kind: 'MATERIAL_VARIANT' }
  | { readonly id: string; readonly kind: 'MODEL' };

function derivedIdentity(
  base: SourceIdentity,
  input: {
    readonly entityType: SourceIdentity['sourceEntityType'];
    readonly facts: unknown;
    readonly sourceId: string;
    readonly sourceSlug: string;
  },
): SourceIdentity {
  return {
    ...base,
    sourceEntityType: input.entityType,
    sourceHash: hashCanonicalSource(input.facts),
    sourceId: input.sourceId,
    sourceSlug: input.sourceSlug,
  };
}

function stableToken(value: unknown): string {
  return hashCanonicalSource(value).slice(0, 24);
}

function deduplicate<T extends { readonly data: { readonly identity: SourceIdentity } }>(
  records: readonly T[],
  entityType: string,
): readonly T[] {
  const result = new Map<string, T>();
  for (const record of records) {
    const sourceId = record.data.identity.sourceId;
    const existing = result.get(sourceId);
    if (
      existing !== undefined &&
      existing.data.identity.sourceHash !== record.data.identity.sourceHash
    ) {
      throw new CatalogPipelineError('CATALOG_PIPELINE_PAYLOAD_INVALID');
    }
    result.set(sourceId, record);
  }
  if (result.size === 0 && entityType === 'category') {
    throw new CatalogPipelineError('CATALOG_PIPELINE_PAYLOAD_INVALID');
  }
  return [...result.values()];
}

function mergePayloads(payloads: readonly CatalogSafeSnapshotPayload[]): {
  readonly categories: readonly CapturedSource<SourceCategory>[];
  readonly materials: readonly CapturedSource<SourceMaterial>[];
  readonly mediaManifests: readonly CapturedSource<SourceMediaManifest>[];
  readonly models: readonly CapturedSource<SourceModel>[];
  readonly prices: readonly CapturedSource<SourcePrice>[];
  readonly sourceVersion: CatalogSafeSnapshotPayload['sourceVersion'];
  readonly systems: readonly CapturedSource<SourceSystem>[];
} {
  const sourceVersion = payloads[0]?.sourceVersion;
  if (
    sourceVersion === undefined ||
    new Set(payloads.map((payload) => hashCanonicalSource(payload.sourceVersion))).size !== 1
  ) {
    throw new CatalogPipelineError('CATALOG_PIPELINE_RESUME_CONFLICT');
  }
  return {
    categories: deduplicate(
      payloads.flatMap((payload) => payload.categories) as CapturedSource<SourceCategory>[],
      'category',
    ),
    materials: deduplicate(
      payloads.flatMap((payload) => payload.materials) as CapturedSource<SourceMaterial>[],
      'material',
    ),
    mediaManifests: deduplicate(
      payloads.flatMap(
        (payload) => payload.mediaManifests,
      ) as CapturedSource<SourceMediaManifest>[],
      'media',
    ),
    models: deduplicate(
      payloads.flatMap((payload) => payload.models) as CapturedSource<SourceModel>[],
      'model',
    ),
    prices: deduplicate(
      payloads.flatMap((payload) => payload.prices) as CapturedSource<SourcePrice>[],
      'price',
    ),
    sourceVersion,
    systems: deduplicate(
      payloads.flatMap((payload) => payload.systems) as CapturedSource<SourceSystem>[],
      'system',
    ),
  };
}

async function upsertSourceEntity(
  client: PoolClient,
  catalogSourceId: string,
  identity: SourceIdentity,
  safeSourceData: unknown,
): Promise<NormalizedSourceEntity> {
  const existingResult = await client.query<ExistingSourceEntity>(
    `
      SELECT id::text, source_hash, status
      FROM source_entity
      WHERE catalog_source_id = $1::uuid
        AND source_type = $2::source_entity_type
        AND source_id = $3
      FOR UPDATE
    `,
    [catalogSourceId, identity.sourceEntityType, identity.sourceId],
  );
  const existing = existingResult.rows[0];
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO source_entity (
        catalog_source_id, source_type, source_id, source_slug, source_url,
        source_category, source_hash, source_captured_at, source_last_verified_at,
        status, safe_source_data, removed_at, updated_at
      ) VALUES (
        $1::uuid, $2::source_entity_type, $3, $4, $5,
        $6, $7, $8::timestamptz, $9::timestamptz,
        'ACTIVE', $10::jsonb, NULL, NOW()
      )
      ON CONFLICT (catalog_source_id, source_type, source_id) DO UPDATE
      SET source_slug = EXCLUDED.source_slug,
          source_url = EXCLUDED.source_url,
          source_category = EXCLUDED.source_category,
          source_hash = EXCLUDED.source_hash,
          source_captured_at = EXCLUDED.source_captured_at,
          source_last_verified_at = EXCLUDED.source_last_verified_at,
          status = 'ACTIVE',
          safe_source_data = EXCLUDED.safe_source_data,
          removed_at = NULL,
          updated_at = NOW()
      RETURNING id::text
    `,
    [
      catalogSourceId,
      identity.sourceEntityType,
      identity.sourceId,
      identity.sourceSlug,
      identity.sourceUrl,
      identity.sourceCategory ?? null,
      identity.sourceHash,
      identity.sourceCapturedAt,
      identity.sourceLastVerifiedAt,
      JSON.stringify(safeSourceData),
    ],
  );
  const id = result.rows[0]?.id;
  if (id === undefined) {
    throw new CatalogPipelineError('CATALOG_PIPELINE_DATABASE');
  }
  return {
    id,
    itemStatus:
      existing === undefined
        ? 'CREATED'
        : existing.source_hash === identity.sourceHash && existing.status === 'ACTIVE'
          ? 'UNCHANGED'
          : 'UPDATED',
    previousHash: existing?.source_hash ?? null,
  };
}

async function recordSyncItem(
  client: PoolClient,
  payload: CatalogNormalizePayload,
  identity: SourceIdentity,
  sourceEntity: NormalizedSourceEntity,
): Promise<void> {
  await client.query(
    `
      INSERT INTO catalog_sync_item (
        sync_run_id, source_entity_id, source_type, source_id, status, stage,
        progress, before_hash, after_hash, safe_metadata, updated_at
      ) VALUES (
        $1::uuid, $2::uuid, $3::source_entity_type, $4,
        $5::catalog_sync_item_status, 'normalize', 100, $6, $7,
        $8::jsonb, NOW()
      )
      ON CONFLICT (sync_run_id, source_type, source_id) DO UPDATE
      SET source_entity_id = EXCLUDED.source_entity_id,
          status = EXCLUDED.status,
          stage = EXCLUDED.stage,
          progress = EXCLUDED.progress,
          before_hash = EXCLUDED.before_hash,
          after_hash = EXCLUDED.after_hash,
          safe_metadata = EXCLUDED.safe_metadata,
          updated_at = NOW()
    `,
    [
      payload.syncRunId,
      sourceEntity.id,
      identity.sourceEntityType,
      identity.sourceId,
      sourceEntity.itemStatus,
      sourceEntity.previousHash,
      identity.sourceHash,
      JSON.stringify({ sourceCategory: identity.sourceCategory ?? null }),
    ],
  );
}

async function upsertFamily(
  client: PoolClient,
  payload: CatalogNormalizePayload,
  category: CapturedSource<SourceCategory>,
): Promise<NormalizedReference> {
  const identity = derivedIdentity(category.data.identity, {
    entityType: 'FAMILY',
    facts: category.data.family,
    sourceId: category.data.family.sourceId,
    sourceSlug: `amigo-family-${category.data.family.code.toLowerCase()}`,
  });
  const sourceEntity = await upsertSourceEntity(
    client,
    payload.catalogSourceId,
    identity,
    category.data.family,
  );
  await recordSyncItem(client, payload, identity, sourceEntity);
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO product_family (
        source_entity_id, code, slug, name, updated_at
      ) VALUES ($1::uuid, $2, $3, $4, NOW())
      ON CONFLICT (code) DO UPDATE
      SET source_entity_id = EXCLUDED.source_entity_id,
          slug = EXCLUDED.slug,
          name = EXCLUDED.name,
          updated_at = NOW()
      RETURNING id::text
    `,
    [
      sourceEntity.id,
      category.data.family.code,
      category.data.family.slug,
      category.data.family.name,
    ],
  );
  const id = result.rows[0]?.id;
  if (id === undefined) throw new CatalogPipelineError('CATALOG_PIPELINE_DATABASE');
  return { id, sourceEntityId: sourceEntity.id };
}

async function upsertCategory(
  client: PoolClient,
  payload: CatalogNormalizePayload,
  record: CapturedSource<SourceCategory>,
  familyId: string,
): Promise<NormalizedReference> {
  const sourceEntity = await upsertSourceEntity(
    client,
    payload.catalogSourceId,
    record.data.identity,
    record.data,
  );
  await recordSyncItem(client, payload, record.data.identity, sourceEntity);
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO product_category (
        source_entity_id, family_id, slug, name, sort_order, updated_at
      ) VALUES ($1::uuid, $2::uuid, $3, $4, $5, NOW())
      ON CONFLICT (source_entity_id) DO UPDATE
      SET family_id = EXCLUDED.family_id,
          name = EXCLUDED.name,
          sort_order = EXCLUDED.sort_order,
          updated_at = NOW()
      RETURNING id::text
    `,
    [
      sourceEntity.id,
      familyId,
      `amigo-category-${record.data.identity.sourceId}`,
      record.data.name,
      record.data.sortOrder ?? 0,
    ],
  );
  const id = result.rows[0]?.id;
  if (id === undefined) throw new CatalogPipelineError('CATALOG_PIPELINE_DATABASE');
  return { id, sourceEntityId: sourceEntity.id };
}

async function upsertModel(
  client: PoolClient,
  payload: CatalogNormalizePayload,
  record: CapturedSource<SourceModel>,
  categoryId: string,
  systemId: string | null,
): Promise<NormalizedReference> {
  const sourceEntity = await upsertSourceEntity(
    client,
    payload.catalogSourceId,
    record.data.identity,
    record.data,
  );
  await recordSyncItem(client, payload, record.data.identity, sourceEntity);
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO product_model (
        source_entity_id, category_id, system_id, slug, name, description, updated_at
      ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, NOW())
      ON CONFLICT (source_entity_id) DO UPDATE
      SET category_id = EXCLUDED.category_id,
          system_id = EXCLUDED.system_id,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          updated_at = NOW()
      RETURNING id::text
    `,
    [
      sourceEntity.id,
      categoryId,
      systemId,
      record.data.identity.sourceSlug,
      record.data.name,
      record.data.description ?? null,
    ],
  );
  const id = result.rows[0]?.id;
  if (id === undefined) throw new CatalogPipelineError('CATALOG_PIPELINE_DATABASE');
  return { id, sourceEntityId: sourceEntity.id };
}

async function upsertSystem(
  client: PoolClient,
  payload: CatalogNormalizePayload,
  record: CapturedSource<SourceSystem>,
  familyId: string,
  categoryId: string,
): Promise<NormalizedReference> {
  const sourceEntity = await upsertSourceEntity(
    client,
    payload.catalogSourceId,
    record.data.identity,
    record.data,
  );
  await recordSyncItem(client, payload, record.data.identity, sourceEntity);
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO product_system (
        source_entity_id, family_id, category_id, slug, name, description, updated_at
      ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6, NOW())
      ON CONFLICT (source_entity_id) DO UPDATE
      SET family_id = EXCLUDED.family_id,
          category_id = EXCLUDED.category_id,
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          updated_at = NOW()
      RETURNING id::text
    `,
    [
      sourceEntity.id,
      familyId,
      categoryId,
      record.data.identity.sourceSlug,
      record.data.name,
      record.data.description ?? null,
    ],
  );
  const id = result.rows[0]?.id;
  if (id === undefined) throw new CatalogPipelineError('CATALOG_PIPELINE_DATABASE');
  return { id, sourceEntityId: sourceEntity.id };
}

async function upsertMaterial(
  client: PoolClient,
  payload: CatalogNormalizePayload,
  record: CapturedSource<SourceMaterial>,
  familyId: string,
  categoryId: string,
  primarySystemId: string | null,
): Promise<NormalizedReference> {
  const materialFacts = {
    categorySourceId: record.data.categorySourceId,
    familySourceId: record.data.family.sourceId,
    name: record.data.materialName,
  };
  const materialIdentity = derivedIdentity(record.data.identity, {
    entityType: 'MATERIAL',
    facts: materialFacts,
    sourceId: `material:${record.data.family.code}:${stableToken(materialFacts)}`,
    sourceSlug: `amigo-material-group-${stableToken(materialFacts)}`,
  });
  const materialSourceEntity = await upsertSourceEntity(
    client,
    payload.catalogSourceId,
    materialIdentity,
    materialFacts,
  );
  await recordSyncItem(client, payload, materialIdentity, materialSourceEntity);
  const materialResult = await client.query<{ id: string }>(
    `
      INSERT INTO material (
        source_entity_id, family_id, category_id, slug, name, updated_at
      ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, NOW())
      ON CONFLICT (source_entity_id) DO UPDATE
      SET family_id = EXCLUDED.family_id,
          category_id = EXCLUDED.category_id,
          name = EXCLUDED.name,
          updated_at = NOW()
      RETURNING id::text
    `,
    [
      materialSourceEntity.id,
      familyId,
      categoryId,
      materialIdentity.sourceSlug,
      record.data.materialName,
    ],
  );
  const materialId = materialResult.rows[0]?.id;
  if (materialId === undefined) throw new CatalogPipelineError('CATALOG_PIPELINE_DATABASE');

  const colorFacts = { name: record.data.color };
  const colorIdentity = derivedIdentity(record.data.identity, {
    entityType: 'COLOR',
    facts: colorFacts,
    sourceId: `color:${stableToken(record.data.color.toLocaleLowerCase('ru-RU'))}`,
    sourceSlug: `amigo-color-${stableToken(record.data.color.toLocaleLowerCase('ru-RU'))}`,
  });
  const colorSourceEntity = await upsertSourceEntity(
    client,
    payload.catalogSourceId,
    colorIdentity,
    colorFacts,
  );
  await recordSyncItem(client, payload, colorIdentity, colorSourceEntity);
  const colorResult = await client.query<{ id: string }>(
    `
      INSERT INTO color (source_entity_id, slug, name, updated_at)
      VALUES ($1::uuid, $2, $3, NOW())
      ON CONFLICT (source_entity_id) DO UPDATE
      SET name = EXCLUDED.name, updated_at = NOW()
      RETURNING id::text
    `,
    [colorSourceEntity.id, colorIdentity.sourceSlug, record.data.color],
  );
  const colorId = colorResult.rows[0]?.id;
  if (colorId === undefined) throw new CatalogPipelineError('CATALOG_PIPELINE_DATABASE');

  const variantSourceEntity = await upsertSourceEntity(
    client,
    payload.catalogSourceId,
    record.data.identity,
    record.data,
  );
  await recordSyncItem(client, payload, record.data.identity, variantSourceEntity);
  const variantResult = await client.query<{ id: string }>(
    `
      INSERT INTO material_variant (
        source_entity_id, material_id, color_id, primary_system_id, slug, name,
        article, width_mm, is_blackout, is_zebra, updated_at
      ) VALUES (
        $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6,
        $7, $8, $9, $10, NOW()
      )
      ON CONFLICT (source_entity_id) DO UPDATE
      SET material_id = EXCLUDED.material_id,
          color_id = EXCLUDED.color_id,
          primary_system_id = EXCLUDED.primary_system_id,
          name = EXCLUDED.name,
          article = EXCLUDED.article,
          width_mm = EXCLUDED.width_mm,
          is_blackout = EXCLUDED.is_blackout,
          is_zebra = EXCLUDED.is_zebra,
          updated_at = NOW()
      RETURNING id::text
    `,
    [
      variantSourceEntity.id,
      materialId,
      colorId,
      primarySystemId,
      record.data.identity.sourceSlug,
      record.data.variantName,
      record.data.article,
      record.data.widthMm ?? null,
      record.data.isBlackout,
      record.data.isZebra,
    ],
  );
  const variantId = variantResult.rows[0]?.id;
  if (variantId === undefined) throw new CatalogPipelineError('CATALOG_PIPELINE_DATABASE');

  for (const property of record.data.properties) {
    const propertyFacts = { property, variantSourceId: record.data.identity.sourceId };
    const propertyIdentity = derivedIdentity(record.data.identity, {
      entityType: 'PROPERTY',
      facts: propertyFacts,
      sourceId: `property:${record.data.identity.sourceId}:${property.key}`,
      sourceSlug: `amigo-property-${record.data.identity.sourceId}-${property.key}`,
    });
    const propertySourceEntity = await upsertSourceEntity(
      client,
      payload.catalogSourceId,
      propertyIdentity,
      propertyFacts,
    );
    await recordSyncItem(client, payload, propertyIdentity, propertySourceEntity);
    await client.query(
      `
        INSERT INTO material_property (
          source_entity_id, variant_id, key, name, value, unit, source_hash
        ) VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7)
        ON CONFLICT (variant_id, key) DO UPDATE
        SET source_entity_id = EXCLUDED.source_entity_id,
            name = EXCLUDED.name,
            value = EXCLUDED.value,
            unit = EXCLUDED.unit,
            source_hash = EXCLUDED.source_hash
      `,
      [
        propertySourceEntity.id,
        variantId,
        property.key,
        property.name,
        property.value,
        property.unit ?? null,
        propertyIdentity.sourceHash,
      ],
    );
  }

  return { id: variantId, sourceEntityId: variantSourceEntity.id };
}

async function upsertCompatibility(
  client: PoolClient,
  payload: CatalogNormalizePayload,
  material: CapturedSource<SourceMaterial>,
  materialVariantId: string,
  systemSourceId: string,
  systemId: string,
): Promise<void> {
  const facts = {
    materialSourceId: material.data.identity.sourceId,
    ruleType: 'SOURCE_CATEGORY_COMPATIBILITY',
    systemSourceId,
  };
  const identity = derivedIdentity(material.data.identity, {
    entityType: 'PROPERTY',
    facts,
    sourceId: `compatibility:${material.data.identity.sourceId}:${systemSourceId}`,
    sourceSlug: `amigo-compatibility-${material.data.identity.sourceId}-${systemSourceId}`,
  });
  const sourceEntity = await upsertSourceEntity(client, payload.catalogSourceId, identity, facts);
  await recordSyncItem(client, payload, identity, sourceEntity);
  await client.query(
    `
      INSERT INTO compatibility_rule (
        source_entity_id, system_id, material_variant_id, rule_type, conditions,
        source_hash
      ) VALUES (
        $1::uuid, $2::uuid, $3::uuid, 'SOURCE_CATEGORY_COMPATIBILITY',
        $4::jsonb, $5
      )
      ON CONFLICT (source_entity_id) DO UPDATE
      SET system_id = EXCLUDED.system_id,
          material_variant_id = EXCLUDED.material_variant_id,
          conditions = EXCLUDED.conditions,
          source_hash = EXCLUDED.source_hash
    `,
    [
      sourceEntity.id,
      systemId,
      materialVariantId,
      JSON.stringify({ sourceVerified: true }),
      identity.sourceHash,
    ],
  );
}

async function upsertPrice(
  client: PoolClient,
  payload: CatalogNormalizePayload,
  record: CapturedSource<SourcePrice>,
  sourceVersion: string,
  target: NormalizedPriceTarget,
): Promise<void> {
  const sourceEntity = await upsertSourceEntity(
    client,
    payload.catalogSourceId,
    record.data.identity,
    record.data,
  );
  await recordSyncItem(client, payload, record.data.identity, sourceEntity);
  const materialVariantId = target.kind === 'MATERIAL_VARIANT' ? target.id : null;
  const modelId = target.kind === 'MODEL' ? target.id : null;
  const inserted = await client.query<{ id: string }>(
    `
      INSERT INTO source_price_record (
        catalog_source_id, source_entity_id, material_variant_id, model_id, source_type,
        source_id, source_version, source_slug, source_url, source_category, source_hash,
        source_captured_at, source_last_verified_at, status, kind, amount_minor,
        currency, source_price_category, source_context
      ) VALUES (
        $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::catalog_source_type,
        $6, $7, $8, $9, $10, $11,
        $12::timestamptz, $13::timestamptz, $14::price_status,
        $15::price_record_kind, $16, $17, $18, $19::jsonb
      )
      ON CONFLICT (catalog_source_id, source_id, source_version) DO NOTHING
      RETURNING id::text
    `,
    [
      payload.catalogSourceId,
      sourceEntity.id,
      materialVariantId,
      modelId,
      record.data.identity.sourceType,
      record.data.identity.sourceId,
      sourceVersion,
      record.data.identity.sourceSlug,
      record.data.identity.sourceUrl,
      record.data.identity.sourceCategory ?? null,
      record.data.identity.sourceHash,
      record.data.identity.sourceCapturedAt,
      record.data.identity.sourceLastVerifiedAt,
      record.data.status,
      record.data.kind,
      record.data.amountMinor,
      record.data.currency,
      record.data.sourcePriceCategory,
      JSON.stringify(record.data.sourceContext),
    ],
  );
  if (inserted.rows[0] !== undefined) return;

  const exactExisting = await client.query<{ id: string }>(
    `
      SELECT id::text
      FROM source_price_record
      WHERE catalog_source_id = $1::uuid
        AND source_entity_id = $2::uuid
        AND material_variant_id IS NOT DISTINCT FROM $3::uuid
        AND model_id IS NOT DISTINCT FROM $4::uuid
        AND source_type = $5::catalog_source_type
        AND source_id = $6
        AND source_version = $7
        AND source_slug = $8
        AND source_url = $9
        AND source_category IS NOT DISTINCT FROM $10
        AND source_hash = $11
        AND status = $12::price_status
        AND kind = $13::price_record_kind
        AND amount_minor IS NOT DISTINCT FROM $14
        AND currency = $15
        AND source_price_category IS NOT DISTINCT FROM $16
        AND source_context = $17::jsonb
    `,
    [
      payload.catalogSourceId,
      sourceEntity.id,
      materialVariantId,
      modelId,
      record.data.identity.sourceType,
      record.data.identity.sourceId,
      sourceVersion,
      record.data.identity.sourceSlug,
      record.data.identity.sourceUrl,
      record.data.identity.sourceCategory ?? null,
      record.data.identity.sourceHash,
      record.data.status,
      record.data.kind,
      record.data.amountMinor,
      record.data.currency,
      record.data.sourcePriceCategory,
      JSON.stringify(record.data.sourceContext),
    ],
  );
  if (exactExisting.rows[0] === undefined) {
    throw new CatalogPipelineError('CATALOG_PIPELINE_RESUME_CONFLICT');
  }
}

function derivedMediaReferenceIdentity(
  base: SourceIdentity,
  target: NormalizedMediaTarget,
  sourceUrl: string,
  role: SourceMediaReference['role'],
  sortOrder: number,
): SourceIdentity {
  const placement = {
    role,
    sortOrder,
    targetKind: target.kind,
    targetSourceId: target.sourceId,
  } as const;
  const stablePlacement = stableToken(placement);
  return {
    ...base,
    sourceEntityType: 'MEDIA',
    sourceHash: hashCanonicalSource({ ...placement, sourceUrl }),
    sourceId: `media:${target.kind.toLowerCase()}:${stablePlacement}`,
    sourceSlug: `amigo-${target.kind.toLowerCase()}-media-${stablePlacement}`,
    sourceUrl,
  };
}

async function upsertSourceMediaReference(
  client: PoolClient,
  payload: CatalogNormalizePayload,
  input: {
    readonly contentTypeHint?: string | undefined;
    readonly identity: SourceIdentity;
    readonly role: SourceMediaReference['role'];
    readonly sortOrder: number;
    readonly target: NormalizedMediaTarget;
  },
): Promise<void> {
  const sourceEntity = await upsertSourceEntity(client, payload.catalogSourceId, input.identity, {
    role: input.role,
    sortOrder: input.sortOrder,
    targetKind: input.target.kind,
    targetSourceId: input.target.sourceId,
  });
  await recordSyncItem(client, payload, input.identity, sourceEntity);
  const targetIds = {
    categoryId: input.target.kind === 'CATEGORY' ? input.target.id : null,
    materialVariantId: input.target.kind === 'MATERIAL_VARIANT' ? input.target.id : null,
    modelId: input.target.kind === 'MODEL' ? input.target.id : null,
    systemId: input.target.kind === 'SYSTEM' ? input.target.id : null,
  };
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO source_media_asset (
        catalog_source_id, source_entity_id, material_variant_id, category_id,
        system_id, model_id, source_type, source_id, source_slug, source_url,
        source_category, source_hash, source_captured_at, source_last_verified_at,
        role, sort_order, content_type, status, updated_at
      ) VALUES (
        $1::uuid, $2::uuid, $3::uuid, $4::uuid,
        $5::uuid, $6::uuid, $7::catalog_source_type, $8, $9, $10,
        $11, $12, $13::timestamptz, $14::timestamptz,
        $15::media_asset_role, $16, $17, 'ACTIVE', NOW()
      )
      ON CONFLICT (catalog_source_id, source_id) DO UPDATE
      SET source_entity_id = EXCLUDED.source_entity_id,
          source_slug = EXCLUDED.source_slug,
          source_url = EXCLUDED.source_url,
          source_category = EXCLUDED.source_category,
          source_hash = EXCLUDED.source_hash,
          source_captured_at = EXCLUDED.source_captured_at,
          source_last_verified_at = EXCLUDED.source_last_verified_at,
          role = EXCLUDED.role,
          sort_order = EXCLUDED.sort_order,
          media_asset_id = CASE
            WHEN source_media_asset.source_hash = EXCLUDED.source_hash
              AND source_media_asset.source_url = EXCLUDED.source_url
            THEN source_media_asset.media_asset_id
            ELSE NULL
          END,
          content_type = CASE
            WHEN source_media_asset.source_hash = EXCLUDED.source_hash
              AND source_media_asset.source_url = EXCLUDED.source_url
              AND source_media_asset.media_asset_id IS NOT NULL
            THEN source_media_asset.content_type
            ELSE EXCLUDED.content_type
          END,
          content_length = CASE
            WHEN source_media_asset.source_hash = EXCLUDED.source_hash
              AND source_media_asset.source_url = EXCLUDED.source_url
            THEN source_media_asset.content_length
            ELSE NULL
          END,
          status = 'ACTIVE',
          updated_at = NOW()
      WHERE source_media_asset.material_variant_id IS NOT DISTINCT FROM EXCLUDED.material_variant_id
        AND source_media_asset.category_id IS NOT DISTINCT FROM EXCLUDED.category_id
        AND source_media_asset.system_id IS NOT DISTINCT FROM EXCLUDED.system_id
        AND source_media_asset.model_id IS NOT DISTINCT FROM EXCLUDED.model_id
      RETURNING id::text
    `,
    [
      payload.catalogSourceId,
      sourceEntity.id,
      targetIds.materialVariantId,
      targetIds.categoryId,
      targetIds.systemId,
      targetIds.modelId,
      input.identity.sourceType,
      input.identity.sourceId,
      input.identity.sourceSlug,
      input.identity.sourceUrl,
      input.identity.sourceCategory ?? null,
      input.identity.sourceHash,
      input.identity.sourceCapturedAt,
      input.identity.sourceLastVerifiedAt,
      input.role,
      input.sortOrder,
      input.contentTypeHint ?? null,
    ],
  );
  if (result.rows[0] === undefined) {
    throw new CatalogPipelineError('CATALOG_PIPELINE_RESUME_CONFLICT');
  }
}

async function upsertDiscoveredMediaUrls(
  client: PoolClient,
  payload: CatalogNormalizePayload,
  baseIdentity: SourceIdentity,
  sourceUrls: readonly string[],
  target: NormalizedMediaTarget,
  systemRole = false,
): Promise<void> {
  const seen = new Set<string>();
  const roleCounts = new Map<SourceMediaReference['role'], number>();
  for (const sourceUrl of sourceUrls) {
    if (seen.has(sourceUrl)) continue;
    seen.add(sourceUrl);
    const role: SourceMediaReference['role'] = systemRole
      ? 'SYSTEM'
      : seen.size === 1
        ? 'PRIMARY'
        : 'DETAIL';
    const sortOrder = roleCounts.get(role) ?? 0;
    roleCounts.set(role, sortOrder + 1);
    await upsertSourceMediaReference(client, payload, {
      identity: derivedMediaReferenceIdentity(baseIdentity, target, sourceUrl, role, sortOrder),
      role,
      sortOrder,
      target,
    });
  }
}

async function upsertMediaManifest(
  client: PoolClient,
  payload: CatalogNormalizePayload,
  record: CapturedSource<SourceMediaManifest>,
  materialVariantId: string,
): Promise<void> {
  const manifestSourceEntity = await upsertSourceEntity(
    client,
    payload.catalogSourceId,
    record.data.identity,
    {
      materialSourceId: record.data.materialSourceId,
      mediaSourceIds: record.data.media.map((media) => media.identity.sourceId),
    },
  );
  await recordSyncItem(client, payload, record.data.identity, manifestSourceEntity);
  const roleCounts = new Map<SourceMediaReference['role'], number>();
  for (const media of record.data.media) {
    const sortOrder = roleCounts.get(media.role) ?? 0;
    roleCounts.set(media.role, sortOrder + 1);
    await upsertSourceMediaReference(client, payload, {
      contentTypeHint: media.contentTypeHint,
      identity: media.identity,
      role: media.role,
      sortOrder,
      target: {
        id: materialVariantId,
        kind: 'MATERIAL_VARIANT',
        sourceId: record.data.materialSourceId,
      },
    });
  }
}

export async function normalizeCatalogSnapshots(
  payload: CatalogNormalizePayload,
  helpers: JobHelpers,
): Promise<void> {
  try {
    const snapshots = await helpers.query<{ safe_payload: unknown }>(
      `
        SELECT safe_payload
        FROM source_snapshot
        WHERE sync_run_id = $1::uuid AND status = 'CAPTURED'
        ORDER BY source_url
      `,
      [payload.syncRunId],
    );
    if (snapshots.rows.length === 0) {
      throw new CatalogPipelineError('CATALOG_PIPELINE_PAYLOAD_INVALID');
    }
    const batch = mergePayloads(
      snapshots.rows.map((row) => catalogSafeSnapshotPayloadSchema.parse(row.safe_payload)),
    );

    await helpers.withPgClient(async (client) => {
      await client.query('BEGIN');
      try {
        const runResult = await client.query<{
          catalog_source_id: string;
          source_version: string | null;
        }>(
          `
            SELECT catalog_source_id::text, source_version
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
          run.source_version !== batch.sourceVersion.version
        ) {
          throw new CatalogPipelineError('CATALOG_PIPELINE_RESUME_CONFLICT');
        }
        const families = new Map<string, NormalizedReference>();
        const categories = new Map<string, NormalizedReference>();
        const systems = new Map<string, NormalizedReference>();
        const models = new Map<string, NormalizedReference>();
        const variants = new Map<string, NormalizedReference>();

        for (const category of batch.categories) {
          let family = families.get(category.data.family.sourceId);
          if (family === undefined) {
            family = await upsertFamily(client, payload, category);
            families.set(category.data.family.sourceId, family);
          }
          const normalizedCategory = await upsertCategory(client, payload, category, family.id);
          categories.set(category.data.identity.sourceId, normalizedCategory);
        }

        for (const category of batch.categories) {
          const normalizedCategory = categories.get(category.data.identity.sourceId);
          if (normalizedCategory === undefined) {
            throw new CatalogPipelineError('CATALOG_PIPELINE_PAYLOAD_INVALID');
          }
          const parent =
            category.data.parentCategorySourceId === undefined
              ? undefined
              : categories.get(category.data.parentCategorySourceId);
          if (category.data.parentCategorySourceId !== undefined && parent === undefined) {
            throw new CatalogPipelineError('CATALOG_PIPELINE_PAYLOAD_INVALID');
          }
          await client.query(
            `
              UPDATE product_category
              SET parent_id = $2::uuid, sort_order = $3, updated_at = NOW()
              WHERE id = $1::uuid
            `,
            [normalizedCategory.id, parent?.id ?? null, category.data.sortOrder ?? 0],
          );
          await upsertDiscoveredMediaUrls(
            client,
            payload,
            category.data.identity,
            category.data.mediaSourceUrls ?? [],
            {
              id: normalizedCategory.id,
              kind: 'CATEGORY',
              sourceId: category.data.identity.sourceId,
            },
          );
        }

        for (const system of batch.systems) {
          const family = families.get(system.data.family.sourceId);
          const category = categories.get(system.data.categorySourceId);
          if (family === undefined || category === undefined) {
            throw new CatalogPipelineError('CATALOG_PIPELINE_PAYLOAD_INVALID');
          }
          const normalizedSystem = await upsertSystem(
            client,
            payload,
            system,
            family.id,
            category.id,
          );
          systems.set(system.data.identity.sourceId, normalizedSystem);
          await upsertDiscoveredMediaUrls(
            client,
            payload,
            system.data.identity,
            system.data.mediaSourceUrl === undefined ? [] : [system.data.mediaSourceUrl],
            {
              id: normalizedSystem.id,
              kind: 'SYSTEM',
              sourceId: system.data.identity.sourceId,
            },
            true,
          );
        }

        for (const model of batch.models) {
          const category = categories.get(model.data.categorySourceId);
          const system =
            model.data.systemSourceId === undefined
              ? undefined
              : systems.get(model.data.systemSourceId);
          if (
            category === undefined ||
            (model.data.systemSourceId !== undefined && system === undefined)
          ) {
            throw new CatalogPipelineError('CATALOG_PIPELINE_PAYLOAD_INVALID');
          }
          const normalizedModel = await upsertModel(
            client,
            payload,
            model,
            category.id,
            system?.id ?? null,
          );
          models.set(model.data.identity.sourceId, normalizedModel);
          await upsertDiscoveredMediaUrls(
            client,
            payload,
            model.data.identity,
            model.data.mediaSourceUrls,
            {
              id: normalizedModel.id,
              kind: 'MODEL',
              sourceId: model.data.identity.sourceId,
            },
          );
        }

        for (const material of batch.materials) {
          const family = families.get(material.data.family.sourceId);
          const category = categories.get(material.data.categorySourceId);
          if (family === undefined || category === undefined) {
            throw new CatalogPipelineError('CATALOG_PIPELINE_PAYLOAD_INVALID');
          }
          const primarySystemId =
            material.data.systemSourceIds
              .map((sourceId) => systems.get(sourceId)?.id)
              .find((id) => id !== undefined) ?? null;
          const variant = await upsertMaterial(
            client,
            payload,
            material,
            family.id,
            category.id,
            primarySystemId,
          );
          variants.set(material.data.identity.sourceId, variant);
          for (const systemSourceId of material.data.systemSourceIds) {
            const system = systems.get(systemSourceId);
            if (system !== undefined) {
              await upsertCompatibility(
                client,
                payload,
                material,
                variant.id,
                systemSourceId,
                system.id,
              );
            }
          }
        }

        for (const price of batch.prices) {
          const variant = variants.get(price.data.identity.sourceId);
          const model = models.get(price.data.identity.sourceId);
          let target: NormalizedPriceTarget;
          if (variant !== undefined && model === undefined) {
            target = { id: variant.id, kind: 'MATERIAL_VARIANT' };
          } else if (model !== undefined && variant === undefined) {
            target = { id: model.id, kind: 'MODEL' };
          } else {
            throw new CatalogPipelineError('CATALOG_PIPELINE_PAYLOAD_INVALID');
          }
          await upsertPrice(client, payload, price, batch.sourceVersion.version, target);
        }
        for (const manifest of batch.mediaManifests) {
          const variant = variants.get(manifest.data.materialSourceId);
          if (variant === undefined) {
            throw new CatalogPipelineError('CATALOG_PIPELINE_PAYLOAD_INVALID');
          }
          await upsertMediaManifest(client, payload, manifest, variant.id);
        }

        const categoryIds = batch.categories.map((category) => category.data.identity.sourceId);
        const seenMaterialIds = batch.materials.map((material) => material.data.identity.sourceId);
        const removed = await client.query<{
          id: string;
          source_hash: string;
          source_id: string;
        }>(
          `
            UPDATE source_entity
            SET status = 'SOURCE_REMOVED', removed_at = NOW(),
                source_last_verified_at = NOW(), updated_at = NOW()
            WHERE catalog_source_id = $1::uuid
              AND source_type = 'MATERIAL_VARIANT'
              AND source_category = ANY($2::text[])
              AND NOT (source_id = ANY($3::text[]))
              AND status <> 'SOURCE_REMOVED'
            RETURNING id::text, source_id, source_hash
          `,
          [payload.catalogSourceId, categoryIds, seenMaterialIds],
        );
        for (const source of removed.rows) {
          await client.query(
            `
              INSERT INTO catalog_sync_item (
                sync_run_id, source_entity_id, source_type, source_id, status,
                stage, progress, before_hash, after_hash, updated_at
              ) VALUES (
                $1::uuid, $2::uuid, 'MATERIAL_VARIANT', $3, 'SOURCE_REMOVED',
                'normalize', 100, $4, $4, NOW()
              )
              ON CONFLICT (sync_run_id, source_type, source_id) DO UPDATE
              SET source_entity_id = EXCLUDED.source_entity_id,
                  status = 'SOURCE_REMOVED',
                  stage = 'normalize',
                  progress = 100,
                  before_hash = EXCLUDED.before_hash,
                  after_hash = EXCLUDED.after_hash,
                  updated_at = NOW()
            `,
            [payload.syncRunId, source.id, source.source_id, source.source_hash],
          );
        }

        const itemCount = await client.query<{ count: string }>(
          'SELECT count(*)::text AS count FROM catalog_sync_item WHERE sync_run_id = $1::uuid',
          [payload.syncRunId],
        );
        const processedCount = Number(itemCount.rows[0]?.count ?? '0');
        await client.query(
          `
            UPDATE catalog_sync_run
            SET status = 'IMPORTING_MEDIA',
                discovered_count = GREATEST(discovered_count, $2),
                processed_count = $2,
                last_heartbeat_at = NOW(),
                updated_at = NOW()
            WHERE id = $1::uuid
          `,
          [payload.syncRunId, processedCount],
        );
        await client.query(
          `
            INSERT INTO audit_event (
              actor_type, action, outcome, correlation_id, target_type, target_id
            ) VALUES (
              'SYSTEM_WORKER', 'CATALOG_NORMALIZED', 'SUCCEEDED', $1,
              'CATALOG_SYNC_RUN', $2
            )
          `,
          [payload.correlationId, payload.syncRunId],
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
