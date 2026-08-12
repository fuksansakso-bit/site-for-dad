import { createHash, randomBytes } from 'node:crypto';

import type { DatabaseEnvironment } from '@project-name/config/server';
import {
  applyPreviewControlPatch,
  canonicalPreviewInput,
  defaultPreviewControls,
  isAllowedPreviewMimeType,
  previewAssetQualities,
  previewRendererVersion,
  previewSceneIds,
  previewStateVersion,
  selectPreviewAsset,
  selectPreviewFamily,
  type PreviewAssetCandidate,
  type PreviewAssetQuality,
  type PreviewControlPatch,
  type PreviewControls,
  type PreviewEligibility,
  type PreviewFamilyCode,
  type PreviewFamilyParameters,
  type PreviewSceneId,
  type StandardPreviewConfiguration,
} from '@project-name/preview';
import { Pool, type PoolClient } from 'pg';

export type PreviewStoreErrorCode =
  | 'PREVIEW_AUTHORIZATION'
  | 'PREVIEW_CONFLICT'
  | 'PREVIEW_DATABASE'
  | 'PREVIEW_INVALID_INPUT'
  | 'PREVIEW_NOT_FOUND';

export class PreviewStoreError extends Error {
  public constructor(
    public readonly code: PreviewStoreErrorCode,
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = 'PreviewStoreError';
  }
}

export interface PreviewSourceReference {
  readonly calculationToken?: string;
  readonly quoteToken?: string;
}

export interface PreviewEligibilityView {
  readonly assetQuality: PreviewAssetQuality;
  readonly configuration: StandardPreviewConfiguration;
  readonly eligibility: PreviewEligibility;
  readonly familyParameters: PreviewFamilyParameters;
  readonly hardwareColor: string;
  readonly normalizedColor: string | null;
}

export interface StandardPreviewStateView extends PreviewEligibilityView {
  readonly assetId: string | null;
  readonly controls: PreviewControls;
  readonly createdAt: string;
  readonly id: string;
  readonly rendererVersion: typeof previewRendererVersion;
  readonly sceneId: PreviewSceneId;
  readonly stateChecksum: string;
  readonly stateVersion: typeof previewStateVersion;
  readonly updatedAt: string;
}

export interface PreviewAssetDescriptor {
  readonly byteSize: number;
  readonly checksumSha256: string;
  readonly contentType: 'image/jpeg' | 'image/png' | 'image/webp';
  readonly height: number;
  readonly id: string;
  readonly objectKey: string;
  readonly storageZone: 'private' | 'public' | 'quarantine';
  readonly width: number;
}

export interface PreviewDiagnosticsView {
  readonly activePreviewableVariants: number;
  readonly counts: Record<PreviewAssetQuality, number>;
  readonly familyCounts: Record<string, number>;
  readonly missingCompatibility: number;
  readonly missingSwatch: number;
  readonly storedStates: number;
}

export interface StandardPreviewAdapter {
  readonly close: () => Promise<void>;
  readonly create: (input: {
    readonly correlationId: string;
    readonly idempotencyKey: string;
    readonly ownerTokenHash: string;
    readonly source: PreviewSourceReference;
  }) => Promise<StandardPreviewStateView>;
  readonly delete: (input: {
    readonly ownerTokenHash: string;
    readonly previewStateId: string;
  }) => Promise<void>;
  readonly get: (input: {
    readonly ownerTokenHash: string;
    readonly previewStateId: string;
  }) => Promise<StandardPreviewStateView>;
  readonly getAsset: (input: {
    readonly ownerTokenHash: string;
    readonly previewStateId: string;
  }) => Promise<PreviewAssetDescriptor>;
  readonly getDiagnostics: (actorId: string) => Promise<PreviewDiagnosticsView>;
  readonly getEligibility: (source: PreviewSourceReference) => Promise<PreviewEligibilityView>;
  readonly update: (input: {
    readonly controls?: PreviewControlPatch;
    readonly correlationId: string;
    readonly ownerTokenHash: string;
    readonly previewStateId: string;
    readonly sceneId?: PreviewSceneId;
  }) => Promise<StandardPreviewStateView>;
}

interface SourceRow {
  readonly catalog_version_id: string;
  readonly calculation_id: string;
  readonly input_snapshot: unknown;
  readonly price_version_id: string | null;
  readonly quote_snapshot_id: string | null;
  readonly status: string;
}

interface ConfigurationRow {
  readonly active_catalog_version_id: string;
  readonly active_price_version_id: string | null;
  readonly active_publication: boolean;
  readonly article: string;
  readonly color_name: string | null;
  readonly compatible: boolean;
  readonly family_code: string;
  readonly family_id: string;
  readonly family_name: string;
  readonly material_name: string;
  readonly material_variant_id: string;
  readonly normalized_hex: string | null;
  readonly system_id: string;
  readonly system_name: string;
  readonly variant_name: string;
  readonly width_mm: string | null;
}

interface AssetRow {
  readonly approved: boolean;
  readonly id: string;
  readonly mime_type: string;
  readonly role: PreviewAssetCandidate['role'];
  readonly sort_order: number;
}

interface StateRow {
  readonly asset_quality: PreviewAssetQuality;
  readonly catalog_version_id: string;
  readonly configuration_snapshot: unknown;
  readonly controls: unknown;
  readonly created_at: Date;
  readonly family_code: string;
  readonly family_parameters: unknown;
  readonly hardware_color: string;
  readonly material_asset_id: string | null;
  readonly normalized_color: string | null;
  readonly price_version_id: string | null;
  readonly public_token: string;
  readonly renderer_version: string;
  readonly scene_id: string;
  readonly state_checksum: string;
  readonly state_version: number;
  readonly updated_at: Date;
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function requiredString(record: JsonRecord, key: string, maximum = 512): string {
  const value = record[key];
  if (typeof value !== 'string' || value.length === 0 || value.length > maximum) {
    throw new PreviewStoreError('PREVIEW_INVALID_INPUT');
  }
  return value;
}

function optionalString(record: JsonRecord, key: string, maximum = 512): string | null {
  const value = record[key];
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || value.length === 0 || value.length > maximum) {
    throw new PreviewStoreError('PREVIEW_INVALID_INPUT');
  }
  return value;
}

function requiredInteger(record: JsonRecord, key: string): number {
  const value = record[key];
  if (!Number.isSafeInteger(value)) throw new PreviewStoreError('PREVIEW_INVALID_INPUT');
  return value as number;
}

function assertOpaque(value: string, maximum: number): void {
  if (value.length < 8 || value.length > maximum || !/^[A-Za-z0-9:._-]+$/u.test(value)) {
    throw new PreviewStoreError('PREVIEW_INVALID_INPUT');
  }
}

function assertHash(value: string): void {
  if (!/^[0-9a-f]{64}$/u.test(value)) throw new PreviewStoreError('PREVIEW_INVALID_INPUT');
}

function mapError(error: unknown): PreviewStoreError {
  if (error instanceof PreviewStoreError) return error;
  if (error instanceof Error && 'code' in error) {
    const code = String(error.code);
    if (['23505', '40001', '40P01'].includes(code)) {
      return new PreviewStoreError('PREVIEW_CONFLICT', { cause: error });
    }
  }
  return new PreviewStoreError('PREVIEW_DATABASE', { cause: error });
}

function digest(value: unknown): string {
  return createHash('sha256').update(canonicalPreviewInput(value)).digest('hex');
}

function publicToken(): string {
  return randomBytes(24).toString('base64url');
}

function sourceSelection(snapshot: unknown): {
  readonly ids: JsonRecord;
  readonly names: JsonRecord;
} {
  const root = asRecord(snapshot);
  const ids = root === null ? null : asRecord(root['ids']);
  if (ids === null) throw new PreviewStoreError('PREVIEW_INVALID_INPUT');
  const names = asRecord(root?.['names']) ?? {};
  return { ids, names };
}

function arrayStrings(record: JsonRecord, key: string): string[] {
  const value = record[key];
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new PreviewStoreError('PREVIEW_INVALID_INPUT');
  }
  return value as string[];
}

function hardwareColor(label: string): string {
  const value = label.toLocaleLowerCase('ru');
  if (value.includes('бел') || value.includes('white')) return '#F4F1EA';
  if (value.includes('черн') || value.includes('black')) return '#24282B';
  if (value.includes('антрац') || value.includes('anthracite')) return '#454B4E';
  if (value.includes('корич') || value.includes('brown')) return '#654A3D';
  if (value.includes('беж') || value.includes('beige')) return '#C9B99D';
  return '#D8D4CA';
}

function controlSide(label: string): 'LEFT' | 'RIGHT' | null {
  const value = label.toLocaleLowerCase('ru');
  if (value.includes('лев') || value.includes('left')) return 'LEFT';
  if (value.includes('прав') || value.includes('right')) return 'RIGHT';
  return null;
}

function familyParameters(
  family: PreviewFamilyCode | null,
  configuration: StandardPreviewConfiguration,
  variantWidthMm: number | null,
  names: JsonRecord,
): PreviewFamilyParameters {
  const additionalNames = arrayStrings(names, 'additionalOptions');
  const profileText = [configuration.systemName, configuration.modelName, ...additionalNames]
    .join(' ')
    .toLocaleLowerCase('ru');
  const horizontalWidth = /(?:^|[_\s-])(16|25|50)(?:$|[_\s-])/u.exec(configuration.modelCode)?.[1];
  return {
    controlSide: controlSide(optionalString(names, 'control') ?? ''),
    hasCassette: /кассет|cassette/u.test(profileText),
    hasGuides: /направ|guide/u.test(profileText),
    horizontalSlatWidthMm:
      family === 'HORIZONTAL_ALUMINUM' && horizontalWidth !== undefined
        ? Number(horizontalWidth)
        : null,
    verticalLamellaWidthMm:
      family === 'VERTICAL' && variantWidthMm !== null && variantWidthMm <= 300
        ? variantWidthMm
        : null,
    verticalOpeningDirection: null,
  };
}

function parseConfiguration(value: unknown): StandardPreviewConfiguration {
  const record = asRecord(value);
  if (record === null) throw new PreviewStoreError('PREVIEW_DATABASE');
  const additionalOptionIds = record['additionalOptionIds'];
  if (
    !Array.isArray(additionalOptionIds) ||
    additionalOptionIds.some((id) => typeof id !== 'string')
  ) {
    throw new PreviewStoreError('PREVIEW_DATABASE');
  }
  const numeric = (key: string) => {
    const number = record[key];
    if (!Number.isSafeInteger(number) || Number(number) <= 0) {
      throw new PreviewStoreError('PREVIEW_DATABASE');
    }
    return Number(number);
  };
  return {
    additionalOptionIds: additionalOptionIds as string[],
    catalogVersionId: requiredString(record, 'catalogVersionId', 64),
    controlTypeId: requiredString(record, 'controlTypeId', 96),
    familyCode: requiredString(record, 'familyCode', 64),
    familyId: requiredString(record, 'familyId', 64),
    familyName: requiredString(record, 'familyName', 255),
    hardwareOptionId: requiredString(record, 'hardwareOptionId', 96),
    hardwareOptionName: requiredString(record, 'hardwareOptionName', 255),
    heightMm: numeric('heightMm'),
    materialArticle: requiredString(record, 'materialArticle', 128),
    materialColorName: requiredString(record, 'materialColorName', 255),
    materialName: requiredString(record, 'materialName', 255),
    materialVariantId: requiredString(record, 'materialVariantId', 64),
    modelCode: requiredString(record, 'modelCode', 64),
    modelId: requiredString(record, 'modelId', 64),
    modelName: requiredString(record, 'modelName', 255),
    mountingTypeId: requiredString(record, 'mountingTypeId', 96),
    priceVersionId: optionalString(record, 'priceVersionId', 64),
    systemId: requiredString(record, 'systemId', 64),
    systemName: requiredString(record, 'systemName', 255),
    widthMm: numeric('widthMm'),
  };
}

function parseControls(value: unknown): PreviewControls {
  const record = asRecord(value);
  if (record === null) throw new PreviewStoreError('PREVIEW_DATABASE');
  const controls = {
    openingPosition: requiredInteger(record, 'openingPosition'),
    slatAngle: requiredInteger(record, 'slatAngle'),
    verticalSpread: requiredInteger(record, 'verticalSpread'),
    zebraAlignment: requiredInteger(record, 'zebraAlignment'),
    zoom: requiredInteger(record, 'zoom'),
  };
  if (
    controls.openingPosition < 0 ||
    controls.openingPosition > 100 ||
    controls.slatAngle < -75 ||
    controls.slatAngle > 75 ||
    controls.verticalSpread < 0 ||
    controls.verticalSpread > 100 ||
    controls.zebraAlignment < 0 ||
    controls.zebraAlignment > 100 ||
    controls.zoom < 100 ||
    controls.zoom > 180
  ) {
    throw new PreviewStoreError('PREVIEW_DATABASE');
  }
  return controls;
}

function parseFamilyParameters(value: unknown): PreviewFamilyParameters {
  const record = asRecord(value);
  if (record === null) throw new PreviewStoreError('PREVIEW_DATABASE');
  const optionalNumber = (key: string): number | null => {
    const item = record[key];
    if (item === null) return null;
    if (typeof item !== 'number' || !Number.isFinite(item) || item <= 0) {
      throw new PreviewStoreError('PREVIEW_DATABASE');
    }
    return item;
  };
  const side = record['controlSide'];
  const direction = record['verticalOpeningDirection'];
  if (side !== null && side !== 'LEFT' && side !== 'RIGHT') {
    throw new PreviewStoreError('PREVIEW_DATABASE');
  }
  if (direction !== null && !['CENTER', 'LEFT', 'RIGHT'].includes(String(direction))) {
    throw new PreviewStoreError('PREVIEW_DATABASE');
  }
  if (typeof record['hasCassette'] !== 'boolean' || typeof record['hasGuides'] !== 'boolean') {
    throw new PreviewStoreError('PREVIEW_DATABASE');
  }
  return {
    controlSide: side,
    hasCassette: record['hasCassette'],
    hasGuides: record['hasGuides'],
    horizontalSlatWidthMm: optionalNumber('horizontalSlatWidthMm'),
    verticalLamellaWidthMm: optionalNumber('verticalLamellaWidthMm'),
    verticalOpeningDirection: direction as 'CENTER' | 'LEFT' | 'RIGHT' | null,
  };
}

async function sourceRow(
  client: Pool | PoolClient,
  source: PreviewSourceReference,
): Promise<SourceRow> {
  if (
    Number(source.calculationToken !== undefined) + Number(source.quoteToken !== undefined) !==
    1
  ) {
    throw new PreviewStoreError('PREVIEW_INVALID_INPUT');
  }
  const calculationToken = source.calculationToken;
  const quoteToken = source.quoteToken;
  if (calculationToken !== undefined) assertOpaque(calculationToken, 64);
  if (quoteToken !== undefined) assertOpaque(quoteToken, 64);
  const result =
    calculationToken !== undefined
      ? await client.query<SourceRow>(
          `SELECT calculation.id::text AS calculation_id, NULL::text AS quote_snapshot_id,
                  calculation.catalog_version_id::text, calculation.price_version_id::text,
                  calculation.status::text, calculation.input_snapshot
           FROM pricing_calculation calculation WHERE calculation.public_token = $1`,
          [calculationToken],
        )
      : await client.query<SourceRow>(
          `SELECT calculation.id::text AS calculation_id, quote.id::text AS quote_snapshot_id,
                  quote.catalog_version_id::text, quote.price_version_id::text,
                  quote.status::text, quote.configuration_snapshot AS input_snapshot
           FROM quote_snapshot quote
           JOIN pricing_calculation calculation ON calculation.id = quote.calculation_id
           WHERE quote.public_token = $1`,
          [quoteToken],
        );
  const row = result.rows[0];
  if (row === undefined) throw new PreviewStoreError('PREVIEW_NOT_FOUND');
  if (['CONFIGURATION_INVALID', 'DEPENDENCY_UNAVAILABLE'].includes(row.status)) {
    throw new PreviewStoreError('PREVIEW_INVALID_INPUT');
  }
  return row;
}

async function configurationRow(
  client: Pool | PoolClient,
  ids: JsonRecord,
): Promise<ConfigurationRow> {
  const result = await client.query<ConfigurationRow>(
    `
      SELECT active_catalog.id::text AS active_catalog_version_id,
             active_price.id::text AS active_price_version_id,
             family.id::text AS family_id, family.code AS family_code, family.name AS family_name,
             system_row.id::text AS system_id, system_row.name AS system_name,
             variant.id::text AS material_variant_id, variant.article, variant.name AS variant_name,
             material.name AS material_name, color.name AS color_name,
             color.normalized_hex, variant.width_mm::text,
             EXISTS (
               SELECT 1 FROM compatibility_rule compatible
               WHERE compatible.system_id = system_row.id
                 AND compatible.material_variant_id = variant.id
             ) AS compatible,
             EXISTS (
               SELECT 1
               FROM business_catalog_entry business
               JOIN catalog_version_entry member
                 ON member.business_catalog_entry_id = business.id
                AND member.catalog_version_id = active_catalog.id
               JOIN publication_record publication ON publication.id = member.publication_record_id
               JOIN availability_record availability ON availability.id = member.availability_record_id
               WHERE business.material_variant_id = variant.id
                 AND business.visibility = 'VISIBLE'
                 AND publication.status = 'PUBLISHED'
                 AND availability.status IN ('AVAILABLE', 'INQUIRY_ONLY')
             ) AS active_publication
      FROM material_variant variant
      JOIN material ON material.id = variant.material_id
      JOIN product_family family ON family.id = material.family_id
      JOIN product_system system_row ON system_row.id = $2::uuid AND system_row.family_id = family.id
      LEFT JOIN color ON color.id = variant.color_id
      CROSS JOIN LATERAL (
        SELECT id FROM catalog_version WHERE status = 'ACTIVE' AND activation_key = 'PUBLIC'
        ORDER BY activated_at DESC LIMIT 1
      ) active_catalog
      LEFT JOIN LATERAL (
        SELECT id FROM price_version WHERE status = 'ACTIVE' AND activation_key = 'PUBLIC'
        ORDER BY activated_at DESC LIMIT 1
      ) active_price ON TRUE
      WHERE variant.id = $1::uuid AND family.id = $3::uuid
      LIMIT 1
    `,
    [
      requiredString(ids, 'materialVariantId', 64),
      requiredString(ids, 'productSystemId', 64),
      requiredString(ids, 'productFamilyId', 64),
    ],
  );
  const row = result.rows[0];
  if (row === undefined) throw new PreviewStoreError('PREVIEW_INVALID_INPUT');
  return row;
}

async function assetCandidates(
  client: Pool | PoolClient,
  materialVariantId: string,
): Promise<PreviewAssetCandidate[]> {
  const result = await client.query<AssetRow>(
    `
      SELECT asset.id::text, placement.role::text, placement.sort_order,
             asset.mime_type,
             (asset.publication_status = 'PUBLICATION_APPROVED'
               AND asset.rights_status IN ('PARTNER_LICENSE', 'OWNER_CREATED')) AS approved
      FROM material_media_asset placement
      JOIN media_asset asset ON asset.id = placement.media_asset_id
      WHERE placement.material_variant_id = $1::uuid
      ORDER BY placement.sort_order, asset.id
    `,
    [materialVariantId],
  );
  return result.rows.map((row) => ({
    approved: row.approved,
    id: row.id,
    mimeType: row.mime_type,
    role: row.role,
    sortOrder: row.sort_order,
  }));
}

async function eligibilityProjection(
  client: Pool | PoolClient,
  source: SourceRow,
): Promise<
  PreviewEligibilityView & { readonly assetId: string | null; readonly source: SourceRow }
> {
  const { ids, names } = sourceSelection(source.input_snapshot);
  const row = await configurationRow(client, ids);
  const family = selectPreviewFamily(row.family_code);
  const selectedAsset = selectPreviewAsset(
    await assetCandidates(client, row.material_variant_id),
    row.normalized_hex,
  );
  const hardwareOptionName =
    optionalString(names, 'hardware') ?? requiredString(ids, 'hardwareOptionId', 96);
  const materialColorName =
    optionalString(names, 'materialColor') ?? row.color_name ?? 'Цвет не указан источником';
  const configuration: StandardPreviewConfiguration = {
    additionalOptionIds: arrayStrings(ids, 'additionalOptionIds'),
    catalogVersionId: source.catalog_version_id,
    controlTypeId: requiredString(ids, 'controlTypeId', 96),
    familyCode: row.family_code,
    familyId: row.family_id,
    familyName: optionalString(names, 'family') ?? row.family_name,
    hardwareOptionId: requiredString(ids, 'hardwareOptionId', 96),
    hardwareOptionName,
    heightMm: requiredInteger(ids, 'heightMm'),
    materialArticle: optionalString(names, 'materialArticle') ?? row.article,
    materialColorName,
    materialName: optionalString(names, 'material') ?? row.material_name,
    materialVariantId: row.material_variant_id,
    modelCode: optionalString(names, 'modelCode', 64) ?? 'UNSPECIFIED',
    modelId: requiredString(ids, 'configuratorModelId', 64),
    modelName: optionalString(names, 'model') ?? 'Модель не указана',
    mountingTypeId: requiredString(ids, 'mountingTypeId', 96),
    priceVersionId: source.price_version_id,
    systemId: row.system_id,
    systemName: optionalString(names, 'system') ?? row.system_name,
    widthMm: requiredInteger(ids, 'widthMm'),
  };
  if (configuration.widthMm <= 0 || configuration.heightMm <= 0) {
    throw new PreviewStoreError('PREVIEW_INVALID_INPUT');
  }
  const warnings: PreviewEligibility['warnings'] = [
    ...(source.catalog_version_id === row.active_catalog_version_id
      ? []
      : (['CATALOG_VERSION_CHANGED'] as const)),
    ...(source.price_version_id === row.active_price_version_id
      ? []
      : (['PRICE_VERSION_CHANGED'] as const)),
  ];
  let reason: PreviewEligibility['reason'] = 'ELIGIBLE';
  if (!row.active_publication || !row.compatible) reason = 'MATERIAL_UNAVAILABLE';
  else if (family === null) reason = 'UNSUPPORTED_FAMILY';
  else if (selectedAsset.quality === 'PREVIEW_UNAVAILABLE') reason = 'ASSET_UNAVAILABLE';
  return {
    assetId: selectedAsset.assetId,
    assetQuality: selectedAsset.quality,
    configuration,
    eligibility: { eligible: reason === 'ELIGIBLE', family, reason, warnings },
    familyParameters: familyParameters(
      family,
      configuration,
      row.width_mm === null ? null : Number(row.width_mm),
      names,
    ),
    hardwareColor: hardwareColor(hardwareOptionName),
    normalizedColor: selectedAsset.normalizedColor,
    source,
  };
}

async function currentStateEligibility(
  client: Pool | PoolClient,
  row: StateRow,
): Promise<PreviewEligibility> {
  const configuration = parseConfiguration(row.configuration_snapshot);
  const family = selectPreviewFamily(row.family_code);
  const status = await client.query<{
    readonly active_catalog_version_id: string;
    readonly active_material: boolean;
    readonly active_price_version_id: string | null;
    readonly asset_valid: boolean;
  }>(
    `
      SELECT catalog.id::text AS active_catalog_version_id,
             price.id::text AS active_price_version_id,
             EXISTS (
               SELECT 1 FROM business_catalog_entry business
               JOIN catalog_version_entry member
                 ON member.business_catalog_entry_id = business.id AND member.catalog_version_id = catalog.id
               JOIN publication_record publication ON publication.id = member.publication_record_id
               JOIN availability_record availability ON availability.id = member.availability_record_id
               WHERE business.material_variant_id = $1::uuid
                 AND business.visibility = 'VISIBLE' AND publication.status = 'PUBLISHED'
                 AND availability.status IN ('AVAILABLE', 'INQUIRY_ONLY')
                 AND EXISTS (
                   SELECT 1 FROM compatibility_rule compatible
                   WHERE compatible.system_id = $2::uuid
                     AND compatible.material_variant_id = $1::uuid
                 )
             ) AS active_material,
             CASE WHEN $3::uuid IS NULL THEN $4::preview_asset_quality = 'NORMALIZED_COLOR_ONLY'
               ELSE EXISTS (
                 SELECT 1 FROM material_media_asset placement
                 JOIN media_asset asset ON asset.id = placement.media_asset_id
                 WHERE placement.material_variant_id = $1::uuid AND asset.id = $3::uuid
                   AND asset.publication_status = 'PUBLICATION_APPROVED'
                   AND asset.rights_status IN ('PARTNER_LICENSE', 'OWNER_CREATED')
                   AND asset.mime_type IN ('image/jpeg', 'image/png', 'image/webp')
               ) END AS asset_valid
      FROM LATERAL (
        SELECT id FROM catalog_version WHERE status = 'ACTIVE' AND activation_key = 'PUBLIC'
        ORDER BY activated_at DESC LIMIT 1
      ) catalog
      LEFT JOIN LATERAL (
        SELECT id FROM price_version WHERE status = 'ACTIVE' AND activation_key = 'PUBLIC'
        ORDER BY activated_at DESC LIMIT 1
      ) price ON TRUE
    `,
    [
      configuration.materialVariantId,
      configuration.systemId,
      row.material_asset_id,
      row.asset_quality,
    ],
  );
  const current = status.rows[0];
  if (current === undefined) {
    return { eligible: false, family, reason: 'CONFIGURATION_INVALID', warnings: [] };
  }
  const warnings: PreviewEligibility['warnings'] = [
    ...(row.catalog_version_id === current.active_catalog_version_id
      ? []
      : (['CATALOG_VERSION_CHANGED'] as const)),
    ...(row.price_version_id === current.active_price_version_id
      ? []
      : (['PRICE_VERSION_CHANGED'] as const)),
  ];
  if (!current.active_material) {
    return { eligible: false, family, reason: 'MATERIAL_UNAVAILABLE', warnings };
  }
  if (family === null) {
    return { eligible: false, family, reason: 'UNSUPPORTED_FAMILY', warnings };
  }
  if (!current.asset_valid || row.asset_quality === 'PREVIEW_UNAVAILABLE') {
    return { eligible: false, family, reason: 'ASSET_UNAVAILABLE', warnings };
  }
  return { eligible: true, family, reason: 'ELIGIBLE', warnings };
}

async function stateRow(
  client: Pool | PoolClient,
  previewStateId: string,
  ownerTokenHash: string,
  lock = false,
): Promise<StateRow> {
  assertOpaque(previewStateId, 64);
  assertHash(ownerTokenHash);
  const result = await client.query<StateRow>(
    `
      SELECT public_token, state_version, catalog_version_id::text, price_version_id::text,
             scene_id, renderer_version, family_code, configuration_snapshot,
             asset_quality::text, material_asset_id::text, normalized_color,
             controls, family_parameters, hardware_color, state_checksum, created_at, updated_at
      FROM standard_preview_state
      WHERE public_token = $1 AND owner_token_hash = $2 AND expires_at > NOW()
      ${lock ? 'FOR UPDATE' : ''}
    `,
    [previewStateId, ownerTokenHash],
  );
  const row = result.rows[0];
  if (row === undefined) throw new PreviewStoreError('PREVIEW_NOT_FOUND');
  return row;
}

async function stateView(
  client: Pool | PoolClient,
  row: StateRow,
): Promise<StandardPreviewStateView> {
  if (
    row.state_version !== previewStateVersion ||
    row.renderer_version !== previewRendererVersion ||
    !previewSceneIds.includes(row.scene_id as PreviewSceneId) ||
    !previewAssetQualities.includes(row.asset_quality)
  ) {
    throw new PreviewStoreError('PREVIEW_DATABASE');
  }
  return {
    assetId: row.material_asset_id,
    assetQuality: row.asset_quality,
    configuration: parseConfiguration(row.configuration_snapshot),
    controls: parseControls(row.controls),
    createdAt: row.created_at.toISOString(),
    eligibility: await currentStateEligibility(client, row),
    familyParameters: parseFamilyParameters(row.family_parameters),
    hardwareColor: row.hardware_color,
    id: row.public_token,
    normalizedColor: row.normalized_color,
    rendererVersion: previewRendererVersion,
    sceneId: row.scene_id as PreviewSceneId,
    stateChecksum: row.state_checksum,
    stateVersion: previewStateVersion,
    updatedAt: row.updated_at.toISOString(),
  };
}

async function transaction<T>(
  pool: Pool,
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const value = await operation(client);
    await client.query('COMMIT');
    return value;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw mapError(error);
  } finally {
    client.release();
  }
}

export function createStandardPreviewAdapter(
  environment: DatabaseEnvironment,
): StandardPreviewAdapter {
  const pool = new Pool({
    connectionString: environment.DATABASE_URL,
    max: 8,
    statement_timeout: environment.DATABASE_STATEMENT_TIMEOUT_MS,
  });
  return {
    async close() {
      await pool.end();
    },
    async getEligibility(source) {
      try {
        return await eligibilityProjection(pool, await sourceRow(pool, source));
      } catch (error) {
        throw mapError(error);
      }
    },
    async create(input) {
      assertHash(input.ownerTokenHash);
      assertOpaque(input.idempotencyKey, 180);
      assertOpaque(input.correlationId, 128);
      return transaction(pool, async (client) => {
        const source = await sourceRow(client, input.source);
        const requestDigest = digest({
          ownerTokenHash: input.ownerTokenHash,
          source: input.source,
        });
        const previous = await client.query<
          StateRow & { readonly owner_token_hash: string; readonly request_digest: string }
        >(
          `SELECT public_token, owner_token_hash, request_digest, state_version,
                  catalog_version_id::text, price_version_id::text, scene_id, renderer_version,
                  family_code, configuration_snapshot, asset_quality::text,
                  material_asset_id::text, normalized_color, controls, family_parameters,
                  hardware_color, state_checksum, created_at, updated_at
           FROM standard_preview_state WHERE idempotency_key = $1`,
          [input.idempotencyKey],
        );
        const existing = previous.rows[0];
        if (existing !== undefined) {
          if (
            existing.owner_token_hash !== input.ownerTokenHash ||
            existing.request_digest !== requestDigest
          ) {
            throw new PreviewStoreError('PREVIEW_CONFLICT');
          }
          return stateView(client, existing);
        }
        const projection = await eligibilityProjection(client, source);
        const controls = defaultPreviewControls();
        const sceneId: PreviewSceneId = 'WINDOW_CLOSEUP';
        const stateChecksum = digest({
          assetId: projection.assetId,
          assetQuality: projection.assetQuality,
          configuration: projection.configuration,
          controls,
          familyParameters: projection.familyParameters,
          hardwareColor: projection.hardwareColor,
          normalizedColor: projection.normalizedColor,
          rendererVersion: previewRendererVersion,
          sceneId,
          stateVersion: previewStateVersion,
        });
        const token = publicToken();
        const inserted = await client.query<StateRow>(
          `
            INSERT INTO standard_preview_state (
              public_token, owner_token_hash, idempotency_key, request_digest,
              source_calculation_id, quote_snapshot_id, catalog_version_id, price_version_id,
              product_family_id, product_system_id, material_variant_id, material_asset_id,
              scene_id, renderer_version, family_code, configuration_snapshot,
              asset_quality, normalized_color, opening_position, controls, family_parameters,
              hardware_color, state_checksum, correlation_id
            ) VALUES (
              $1,$2,$3,$4,$5::uuid,$6::uuid,$7::uuid,$8::uuid,$9::uuid,$10::uuid,$11::uuid,$12::uuid,
              $13,$14,$15,$16::jsonb,$17::preview_asset_quality,$18,$19,$20::jsonb,$21::jsonb,$22,$23,$24
            )
            RETURNING public_token, state_version, catalog_version_id::text, price_version_id::text,
                      scene_id, renderer_version, family_code, configuration_snapshot,
                      asset_quality::text, material_asset_id::text, normalized_color,
                      controls, family_parameters, hardware_color, state_checksum, created_at, updated_at
          `,
          [
            token,
            input.ownerTokenHash,
            input.idempotencyKey,
            requestDigest,
            source.calculation_id,
            source.quote_snapshot_id,
            source.catalog_version_id,
            source.price_version_id,
            projection.configuration.familyId,
            projection.configuration.systemId,
            projection.configuration.materialVariantId,
            projection.assetId,
            sceneId,
            previewRendererVersion,
            projection.configuration.familyCode,
            JSON.stringify(projection.configuration),
            projection.assetQuality,
            projection.normalizedColor,
            controls.openingPosition,
            JSON.stringify(controls),
            JSON.stringify(projection.familyParameters),
            projection.hardwareColor,
            stateChecksum,
            input.correlationId,
          ],
        );
        const saved = inserted.rows[0];
        if (saved === undefined) throw new PreviewStoreError('PREVIEW_CONFLICT');
        return stateView(client, saved);
      });
    },
    async get(input) {
      try {
        return stateView(pool, await stateRow(pool, input.previewStateId, input.ownerTokenHash));
      } catch (error) {
        throw mapError(error);
      }
    },
    async update(input) {
      assertOpaque(input.correlationId, 128);
      return transaction(pool, async (client) => {
        const current = await stateRow(client, input.previewStateId, input.ownerTokenHash, true);
        const family = selectPreviewFamily(current.family_code);
        if (family === null) throw new PreviewStoreError('PREVIEW_INVALID_INPUT');
        const controls =
          input.controls === undefined
            ? parseControls(current.controls)
            : applyPreviewControlPatch(family, parseControls(current.controls), input.controls);
        const sceneId = input.sceneId ?? (current.scene_id as PreviewSceneId);
        if (!previewSceneIds.includes(sceneId))
          throw new PreviewStoreError('PREVIEW_INVALID_INPUT');
        const stateChecksum = digest({
          assetId: current.material_asset_id,
          assetQuality: current.asset_quality,
          configuration: parseConfiguration(current.configuration_snapshot),
          controls,
          familyParameters: parseFamilyParameters(current.family_parameters),
          hardwareColor: current.hardware_color,
          normalizedColor: current.normalized_color,
          rendererVersion: previewRendererVersion,
          sceneId,
          stateVersion: previewStateVersion,
        });
        const updated = await client.query<StateRow>(
          `UPDATE standard_preview_state
           SET scene_id = $3, opening_position = $4, controls = $5::jsonb,
               state_checksum = $6, correlation_id = $7, updated_at = NOW()
           WHERE public_token = $1 AND owner_token_hash = $2 AND expires_at > NOW()
           RETURNING public_token, state_version, catalog_version_id::text, price_version_id::text,
                     scene_id, renderer_version, family_code, configuration_snapshot,
                     asset_quality::text, material_asset_id::text, normalized_color,
                     controls, family_parameters, hardware_color, state_checksum, created_at, updated_at`,
          [
            input.previewStateId,
            input.ownerTokenHash,
            sceneId,
            controls.openingPosition,
            JSON.stringify(controls),
            stateChecksum,
            input.correlationId,
          ],
        );
        const saved = updated.rows[0];
        if (saved === undefined) throw new PreviewStoreError('PREVIEW_NOT_FOUND');
        return stateView(client, saved);
      });
    },
    async delete(input) {
      assertOpaque(input.previewStateId, 64);
      assertHash(input.ownerTokenHash);
      try {
        const deleted = await pool.query(
          `DELETE FROM standard_preview_state
           WHERE public_token = $1 AND owner_token_hash = $2 AND expires_at > NOW()`,
          [input.previewStateId, input.ownerTokenHash],
        );
        if (deleted.rowCount !== 1) throw new PreviewStoreError('PREVIEW_NOT_FOUND');
      } catch (error) {
        throw mapError(error);
      }
    },
    async getAsset(input) {
      try {
        const state = await stateRow(pool, input.previewStateId, input.ownerTokenHash);
        const eligibility = await currentStateEligibility(pool, state);
        if (!eligibility.eligible || state.material_asset_id === null) {
          throw new PreviewStoreError('PREVIEW_NOT_FOUND');
        }
        const result = await pool.query<{
          readonly byte_size: number;
          readonly file_hash: string;
          readonly height: number;
          readonly id: string;
          readonly mime_type: string;
          readonly object_key: string;
          readonly storage_zone: string;
          readonly width: number;
        }>(
          `SELECT id::text, file_hash, storage_zone, object_key, mime_type,
                  byte_size, width, height
           FROM media_asset WHERE id = $1::uuid`,
          [state.material_asset_id],
        );
        const asset = result.rows[0];
        if (
          asset === undefined ||
          !isAllowedPreviewMimeType(asset.mime_type) ||
          !['private', 'public', 'quarantine'].includes(asset.storage_zone)
        ) {
          throw new PreviewStoreError('PREVIEW_NOT_FOUND');
        }
        return {
          byteSize: asset.byte_size,
          checksumSha256: asset.file_hash,
          contentType: asset.mime_type as PreviewAssetDescriptor['contentType'],
          height: asset.height,
          id: asset.id,
          objectKey: asset.object_key,
          storageZone: asset.storage_zone as PreviewAssetDescriptor['storageZone'],
          width: asset.width,
        };
      } catch (error) {
        throw mapError(error);
      }
    },
    async getDiagnostics(actorId) {
      assertOpaque(actorId, 64);
      try {
        const authorized = await pool.query<{ readonly allowed: boolean }>(
          `SELECT bool_or(grant_row.role IN ('OWNER', 'ADMIN')) AS allowed
           FROM actor_identity actor JOIN role_grant grant_row ON grant_row.actor_id = actor.id
           WHERE actor.id = $1::uuid AND actor.disabled_at IS NULL AND grant_row.revoked_at IS NULL
           GROUP BY actor.id`,
          [actorId],
        );
        if (authorized.rows[0]?.allowed !== true) {
          throw new PreviewStoreError('PREVIEW_AUTHORIZATION');
        }
        const profiles = await pool.query<{
          readonly family_code: string;
          readonly has_compatibility: boolean;
          readonly material_variant_id: string;
        }>(
          `SELECT family.code AS family_code, rule.material_variant_id::text,
                  EXISTS (SELECT 1 FROM compatibility_rule compatible
                          WHERE compatible.system_id = rule.product_system_id
                            AND compatible.material_variant_id = rule.material_variant_id) AS has_compatibility
           FROM pricing_rule rule
           JOIN price_version price ON price.id = rule.price_version_id
           JOIN product_family family ON family.id = rule.product_family_id
           WHERE price.status = 'ACTIVE' AND price.activation_key = 'PUBLIC'
             AND rule.verification_status = 'VERIFIED' AND rule.parity_status = 'PASSED'`,
        );
        const counts = Object.fromEntries(
          previewAssetQualities.map((quality) => [quality, 0]),
        ) as Record<PreviewAssetQuality, number>;
        const familyCounts: Record<string, number> = {};
        let missingSwatch = 0;
        for (const profile of profiles.rows) {
          const candidates = await assetCandidates(pool, profile.material_variant_id);
          const color = await pool.query<{ readonly normalized_hex: string | null }>(
            `SELECT color.normalized_hex FROM material_variant variant
             LEFT JOIN color ON color.id = variant.color_id WHERE variant.id = $1::uuid`,
            [profile.material_variant_id],
          );
          const selected = selectPreviewAsset(candidates, color.rows[0]?.normalized_hex ?? null);
          counts[selected.quality] += 1;
          familyCounts[profile.family_code] = (familyCounts[profile.family_code] ?? 0) + 1;
          if (!candidates.some((candidate) => candidate.approved && candidate.role === 'SWATCH')) {
            missingSwatch += 1;
          }
        }
        const states = await pool.query<{ readonly count: string }>(
          `SELECT count(*)::text FROM standard_preview_state WHERE expires_at > NOW()`,
        );
        return {
          activePreviewableVariants: profiles.rows.length,
          counts,
          familyCounts,
          missingCompatibility: profiles.rows.filter((row) => !row.has_compatibility).length,
          missingSwatch,
          storedStates: Number(states.rows[0]?.count ?? 0),
        };
      } catch (error) {
        throw mapError(error);
      }
    },
  };
}
