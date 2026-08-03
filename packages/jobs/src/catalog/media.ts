import { createHash } from 'node:crypto';

import {
  CatalogSourceError,
  type CatalogSourceAdapter,
  type CatalogSourceType,
  type SourceMediaFile,
} from '@project-name/catalog';
import type { JobHelpers } from 'graphile-worker';

import { type CatalogMediaImportPayload } from './contracts.js';
import {
  CatalogPipelineError,
  isCatalogStoragePortError,
  toCatalogPipelineError,
} from './errors.js';
import { catalogCancellationRequested } from './capture.js';

const maximumImageDimension = 12_000;
const maximumDecodedPixels = 40_000_000;

export interface CatalogMediaImportDependencies {
  readonly maximumBytes: number;
  readonly maximumItemsPerBatch?: number;
  readonly objectStorage: CatalogMediaStoragePort;
}

export interface CatalogMediaStorageMetadata {
  readonly checksumSha256: string;
  readonly contentLength: number;
  readonly contentType: string;
  readonly source: string;
  readonly zone: string;
}

export interface CatalogMediaStoragePort {
  head(locator: {
    readonly key: string;
    readonly zone: 'private';
  }): Promise<CatalogMediaStorageMetadata>;
  put(input: {
    readonly body: Uint8Array;
    readonly contentType: 'image/jpeg' | 'image/png' | 'image/webp';
    readonly locator: { readonly key: string; readonly zone: 'private' };
    readonly source: 'AMIGO_AUTHORIZED_CATALOG' | 'AMIGO_CATALOG_PILOT' | 'SYNTHETIC_TEST';
  }): Promise<CatalogMediaStorageMetadata>;
}

export interface CatalogMediaImportResult {
  readonly cancelled: boolean;
  readonly failedCount: number;
  readonly importedCount: number;
  readonly remainingCount: number;
  readonly reusedCount: number;
}

interface CatalogImageMetadata {
  readonly byteSize: number;
  readonly capturedAt: string;
  readonly extension: 'jpg' | 'png' | 'webp';
  readonly fileHash: string;
  readonly height: number;
  readonly httpStatus: number;
  readonly mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  readonly originalFilename: string;
  readonly width: number;
}

interface PendingSourceMedia {
  readonly asset_byte_size: number | null;
  readonly asset_file_hash: string | null;
  readonly asset_mime_type: string | null;
  readonly asset_object_key: string | null;
  readonly category_id: string | null;
  readonly id: string;
  readonly material_variant_id: string | null;
  readonly media_asset_id: string | null;
  readonly model_id: string | null;
  readonly role: 'DETAIL' | 'PRIMARY' | 'SWATCH' | 'SYSTEM';
  readonly sort_order: number;
  readonly source_id: string;
  readonly source_entity_id: string;
  readonly source_type: CatalogSourceType;
  readonly source_url: string;
  readonly system_id: string | null;
}

function failMediaValidation(): never {
  throw new CatalogPipelineError('CATALOG_PIPELINE_MEDIA_INVALID');
}

function positiveDimensions(width: number, height: number): { width: number; height: number } {
  if (
    !Number.isSafeInteger(width) ||
    !Number.isSafeInteger(height) ||
    width < 1 ||
    height < 1 ||
    width > maximumImageDimension ||
    height > maximumImageDimension ||
    width * height > maximumDecodedPixels
  ) {
    failMediaValidation();
  }
  return { height, width };
}

function hasBytes(body: Uint8Array, offset: number, expected: readonly number[]): boolean {
  return expected.every((value, index) => body[offset + index] === value);
}

function inspectPng(body: Uint8Array): { height: number; width: number } | undefined {
  if (!hasBytes(body, 0, [137, 80, 78, 71, 13, 10, 26, 10])) return undefined;
  if (body.byteLength < 24 || !hasBytes(body, 12, [73, 72, 68, 82])) failMediaValidation();
  const view = new DataView(body.buffer, body.byteOffset, body.byteLength);
  return positiveDimensions(view.getUint32(16), view.getUint32(20));
}

function inspectJpeg(body: Uint8Array): { height: number; width: number } | undefined {
  if (!hasBytes(body, 0, [255, 216])) return undefined;
  let offset = 2;
  while (offset + 3 < body.byteLength) {
    if (body[offset] !== 255) failMediaValidation();
    while (body[offset] === 255) offset += 1;
    const marker = body[offset];
    offset += 1;
    if (marker === undefined || marker === 217 || marker === 218) break;
    if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
    if (offset + 1 >= body.byteLength) failMediaValidation();
    const segmentLength = ((body[offset] ?? 0) << 8) | (body[offset + 1] ?? 0);
    if (segmentLength < 2 || offset + segmentLength > body.byteLength) failMediaValidation();
    if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
      if (segmentLength < 7) failMediaValidation();
      const height = ((body[offset + 3] ?? 0) << 8) | (body[offset + 4] ?? 0);
      const width = ((body[offset + 5] ?? 0) << 8) | (body[offset + 6] ?? 0);
      return positiveDimensions(width, height);
    }
    offset += segmentLength;
  }
  failMediaValidation();
}

function littleEndian24(body: Uint8Array, offset: number): number {
  return (body[offset] ?? 0) | ((body[offset + 1] ?? 0) << 8) | ((body[offset + 2] ?? 0) << 16);
}

function inspectWebp(body: Uint8Array): { height: number; width: number } | undefined {
  if (!hasBytes(body, 0, [82, 73, 70, 70]) || !hasBytes(body, 8, [87, 69, 66, 80])) {
    return undefined;
  }
  if (body.byteLength < 30) failMediaValidation();
  const chunk = new TextDecoder('ascii').decode(body.subarray(12, 16));
  const view = new DataView(body.buffer, body.byteOffset, body.byteLength);
  if (chunk === 'VP8X') {
    return positiveDimensions(littleEndian24(body, 24) + 1, littleEndian24(body, 27) + 1);
  }
  if (chunk === 'VP8 ' && hasBytes(body, 23, [157, 1, 42])) {
    return positiveDimensions(view.getUint16(26, true) & 0x3fff, view.getUint16(28, true) & 0x3fff);
  }
  if (chunk === 'VP8L' && body[20] === 47) {
    const bits = view.getUint32(21, true);
    return positiveDimensions((bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
  }
  failMediaValidation();
}

export function inspectCatalogImage(
  file: SourceMediaFile,
  maximumBytes: number,
): CatalogImageMetadata {
  const capturedAt = new Date(file.capturedAt);
  if (
    !Number.isSafeInteger(maximumBytes) ||
    maximumBytes < 1 ||
    file.body.byteLength < 1 ||
    file.body.byteLength > maximumBytes ||
    Number.isNaN(capturedAt.getTime()) ||
    !Number.isSafeInteger(file.httpStatus) ||
    file.httpStatus < 200 ||
    file.httpStatus > 299 ||
    !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,254}$/.test(file.originalFilename)
  ) {
    failMediaValidation();
  }
  const fileHash = createHash('sha256').update(file.body).digest('hex');
  if (fileHash !== file.contentHash) failMediaValidation();
  const sourceMetadata = {
    capturedAt: capturedAt.toISOString(),
    httpStatus: file.httpStatus,
    originalFilename: file.originalFilename,
  } as const;

  const png = inspectPng(file.body);
  if (png !== undefined) {
    if (file.contentType !== 'image/png') failMediaValidation();
    return {
      ...png,
      ...sourceMetadata,
      byteSize: file.body.byteLength,
      extension: 'png',
      fileHash,
      mimeType: 'image/png',
    };
  }
  const jpeg = inspectJpeg(file.body);
  if (jpeg !== undefined) {
    if (file.contentType !== 'image/jpeg') failMediaValidation();
    return {
      ...jpeg,
      ...sourceMetadata,
      byteSize: file.body.byteLength,
      extension: 'jpg',
      fileHash,
      mimeType: 'image/jpeg',
    };
  }
  const webp = inspectWebp(file.body);
  if (webp !== undefined) {
    if (file.contentType !== 'image/webp') failMediaValidation();
    return {
      ...webp,
      ...sourceMetadata,
      byteSize: file.body.byteLength,
      extension: 'webp',
      fileHash,
      mimeType: 'image/webp',
    };
  }
  failMediaValidation();
}

export type CatalogStorageSource =
  'AMIGO_AUTHORIZED_CATALOG' | 'AMIGO_CATALOG_PILOT' | 'SYNTHETIC_TEST';

export function isCompatibleCatalogStorageSource(
  actualSource: string,
  expectedSource: CatalogStorageSource,
): boolean {
  return (
    actualSource === expectedSource ||
    (expectedSource === 'AMIGO_AUTHORIZED_CATALOG' && actualSource === 'AMIGO_CATALOG_PILOT')
  );
}

function storageSource(sourceType: CatalogSourceType): CatalogStorageSource {
  return sourceType === 'FIXTURE' ? 'SYNTHETIC_TEST' : 'AMIGO_AUTHORIZED_CATALOG';
}

function assertStoredObject(
  metadata: CatalogMediaStorageMetadata,
  image: CatalogImageMetadata,
  expectedSource: CatalogStorageSource,
): void {
  if (
    metadata.checksumSha256 !== image.fileHash ||
    metadata.contentLength !== image.byteSize ||
    metadata.contentType !== image.mimeType ||
    !isCompatibleCatalogStorageSource(metadata.source, expectedSource) ||
    metadata.zone !== 'private'
  ) {
    throw new CatalogPipelineError('CATALOG_PIPELINE_STORAGE_UNAVAILABLE', {
      retryable: true,
    });
  }
}

async function ensureStoredImage(
  storage: CatalogMediaStoragePort,
  file: SourceMediaFile,
  image: CatalogImageMetadata,
  sourceType: CatalogSourceType,
): Promise<{ objectKey: string; reused: boolean }> {
  const objectKey = `catalog/amigo/${image.fileHash.slice(0, 2)}/${image.fileHash}.${image.extension}`;
  const locator = { key: objectKey, zone: 'private' } as const;
  const expectedSource = storageSource(sourceType);
  try {
    const existing = await storage.head(locator);
    assertStoredObject(existing, image, expectedSource);
    return { objectKey, reused: true };
  } catch (error) {
    if (!isCatalogStoragePortError(error) || error.code !== 'STORAGE_NOT_FOUND') throw error;
  }
  try {
    const stored = await storage.put({
      body: file.body,
      contentType: image.mimeType,
      locator,
      source: expectedSource,
    });
    assertStoredObject(stored, image, expectedSource);
    return { objectKey, reused: false };
  } catch (error) {
    if (!isCatalogStoragePortError(error) || error.code !== 'STORAGE_CONFLICT') throw error;
    const existing = await storage.head(locator);
    assertStoredObject(existing, image, expectedSource);
    return { objectKey, reused: true };
  }
}

async function verifyLinkedStoredImage(
  storage: CatalogMediaStoragePort,
  sourceMedia: PendingSourceMedia,
): Promise<void> {
  const targetCount = [
    sourceMedia.category_id,
    sourceMedia.material_variant_id,
    sourceMedia.model_id,
    sourceMedia.system_id,
  ].filter((value) => value !== null).length;
  if (
    sourceMedia.media_asset_id === null ||
    sourceMedia.asset_object_key === null ||
    sourceMedia.asset_file_hash === null ||
    sourceMedia.asset_mime_type === null ||
    sourceMedia.asset_byte_size === null ||
    targetCount !== 1 ||
    !/^[0-9a-f]{64}$/.test(sourceMedia.asset_file_hash) ||
    !['image/jpeg', 'image/png', 'image/webp'].includes(sourceMedia.asset_mime_type) ||
    !Number.isSafeInteger(sourceMedia.asset_byte_size) ||
    sourceMedia.asset_byte_size < 1
  ) {
    throw new CatalogPipelineError('CATALOG_PIPELINE_DATABASE');
  }
  const metadata = await storage.head({ key: sourceMedia.asset_object_key, zone: 'private' });
  assertStoredObject(
    metadata,
    {
      byteSize: sourceMedia.asset_byte_size,
      capturedAt: new Date(0).toISOString(),
      extension: 'png',
      fileHash: sourceMedia.asset_file_hash,
      height: 1,
      httpStatus: 200,
      mimeType: sourceMedia.asset_mime_type as CatalogImageMetadata['mimeType'],
      originalFilename: 'verified-existing-object',
      width: 1,
    },
    storageSource(sourceMedia.source_type),
  );
}

async function markMediaError(
  helpers: JobHelpers,
  payload: CatalogMediaImportPayload,
  sourceMedia: PendingSourceMedia,
  errorCode: string,
): Promise<void> {
  await helpers.withPgClient(async (client) => {
    await client.query('BEGIN');
    try {
      const itemUpdate = await client.query<{ id: string }>(
        `
          UPDATE catalog_sync_item
          SET status = 'MEDIA_ERROR', stage = 'media', progress = 100,
              safe_metadata = jsonb_build_object('errorCode', $3::text), updated_at = NOW()
          WHERE sync_run_id = $1::uuid AND source_entity_id = $2::uuid
            AND (
              status <> 'MEDIA_ERROR' OR
              safe_metadata->>'errorCode' IS DISTINCT FROM $3::text
            )
          RETURNING id::text
        `,
        [payload.syncRunId, sourceMedia.source_entity_id, errorCode],
      );
      if (itemUpdate.rows.length === 0) {
        await client.query('COMMIT');
        return;
      }
      await client.query(
        `
          UPDATE catalog_sync_run
          SET error_count = error_count + 1, last_heartbeat_at = NOW(), updated_at = NOW()
          WHERE id = $1::uuid
        `,
        [payload.syncRunId],
      );
      await client.query(
        `
          INSERT INTO audit_event (
            actor_type, action, outcome, correlation_id, target_type, target_id, reason_code
          ) SELECT
            'SYSTEM_WORKER', 'CATALOG_MEDIA_IMPORT_FAILED', 'FAILED',
            $1::varchar(128), 'SOURCE_MEDIA_ASSET', $2::varchar(255), $3::varchar(128)
          WHERE NOT EXISTS (
            SELECT 1 FROM audit_event
            WHERE correlation_id = $1::varchar(128)
              AND action = 'CATALOG_MEDIA_IMPORT_FAILED'
              AND target_type = 'SOURCE_MEDIA_ASSET'
              AND target_id = $2::varchar(255)
              AND reason_code = $3::varchar(128)
          )
        `,
        [payload.correlationId, sourceMedia.id, errorCode],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

async function persistMediaLink(
  helpers: JobHelpers,
  payload: CatalogMediaImportPayload,
  sourceMedia: PendingSourceMedia,
  image: CatalogImageMetadata,
  objectKey: string,
  sortOrder: number,
): Promise<void> {
  await helpers.withPgClient(async (client) => {
    await client.query('BEGIN');
    try {
      const mediaAssetResult = await client.query<{ id: string }>(
        `
          INSERT INTO media_asset (
            file_hash, storage_zone, object_key, mime_type, byte_size, width, height,
            rights_status, publication_status, updated_at
          ) VALUES (
            $1, 'private', $2, $3, $4, $5, $6,
            'PARTNER_LICENSE', 'PENDING', NOW()
          )
          ON CONFLICT (file_hash) DO UPDATE
          SET updated_at = media_asset.updated_at
          WHERE media_asset.object_key = EXCLUDED.object_key
            AND media_asset.mime_type = EXCLUDED.mime_type
            AND media_asset.byte_size = EXCLUDED.byte_size
            AND media_asset.width = EXCLUDED.width
            AND media_asset.height = EXCLUDED.height
            AND media_asset.rights_status = EXCLUDED.rights_status
          RETURNING id::text
        `,
        [image.fileHash, objectKey, image.mimeType, image.byteSize, image.width, image.height],
      );
      const mediaAssetId = mediaAssetResult.rows[0]?.id;
      if (mediaAssetId === undefined) throw new CatalogPipelineError('CATALOG_PIPELINE_DATABASE');
      await client.query(
        `
          UPDATE source_media_asset
          SET media_asset_id = $2::uuid, content_type = $3, content_length = $4, updated_at = NOW()
          WHERE id = $1::uuid
        `,
        [sourceMedia.id, mediaAssetId, image.mimeType, image.byteSize],
      );
      if (sourceMedia.material_variant_id !== null) {
        await client.query(
          `
            INSERT INTO material_media_asset (
              material_variant_id, media_asset_id, source_media_asset_id, role, sort_order
            ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::media_asset_role, $5)
            ON CONFLICT (source_media_asset_id) DO UPDATE
            SET media_asset_id = EXCLUDED.media_asset_id,
                role = EXCLUDED.role,
                sort_order = EXCLUDED.sort_order
          `,
          [
            sourceMedia.material_variant_id,
            mediaAssetId,
            sourceMedia.id,
            sourceMedia.role,
            sortOrder,
          ],
        );
      }
      await client.query(
        `
          UPDATE catalog_sync_item
          SET stage = 'media', progress = 100,
              safe_metadata = safe_metadata || jsonb_build_object(
                'mediaCapturedAt', $3::text,
                'mediaHttpStatus', $4::int,
                'mediaImported', true,
                'originalFilename', $5::text
              ),
              updated_at = NOW()
          WHERE sync_run_id = $1::uuid AND source_entity_id = $2::uuid
        `,
        [
          payload.syncRunId,
          sourceMedia.source_entity_id,
          image.capturedAt,
          image.httpStatus,
          image.originalFilename,
        ],
      );
      await client.query(
        `
          INSERT INTO audit_event (
            actor_type, action, outcome, correlation_id, target_type, target_id
          ) SELECT
            'SYSTEM_WORKER', 'CATALOG_MEDIA_IMPORTED', 'SUCCEEDED',
            $1::varchar(128), 'SOURCE_MEDIA_ASSET', $2::varchar(255)
          WHERE NOT EXISTS (
            SELECT 1 FROM audit_event
            WHERE correlation_id = $1::varchar(128)
              AND action = 'CATALOG_MEDIA_IMPORTED'
              AND target_type = 'SOURCE_MEDIA_ASSET'
              AND target_id = $2::varchar(255)
          )
        `,
        [payload.correlationId, sourceMedia.id],
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  });
}

export async function importCatalogMedia(
  payload: CatalogMediaImportPayload,
  helpers: JobHelpers,
  adapter: CatalogSourceAdapter,
  dependencies: CatalogMediaImportDependencies,
  signal: AbortSignal,
): Promise<CatalogMediaImportResult> {
  const maximumItemsPerBatch = dependencies.maximumItemsPerBatch ?? 100;
  if (
    !Number.isSafeInteger(maximumItemsPerBatch) ||
    maximumItemsPerBatch < 1 ||
    maximumItemsPerBatch > 250
  ) {
    throw new CatalogPipelineError('CATALOG_PIPELINE_PAYLOAD_INVALID');
  }
  const remainingMediaCount = async (): Promise<number> => {
    const result = await helpers.query<{ count: string }>(
      `
        SELECT count(*)::text AS count
        FROM source_media_asset media
        JOIN catalog_sync_item item ON item.source_entity_id = media.source_entity_id
        WHERE item.sync_run_id = $1::uuid
          AND item.source_type = 'MEDIA'
          AND item.status <> 'MEDIA_ERROR'
          AND media.media_asset_id IS NULL
      `,
      [payload.syncRunId],
    );
    return Number(result.rows[0]?.count ?? '0');
  };
  let reusedCount = 0;
  if (payload.batchNumber === 1) {
    const linked = await helpers.query<PendingSourceMedia>(
      `
        SELECT
          media.id::text, media.source_entity_id::text,
          media.material_variant_id::text, media.category_id::text,
          media.system_id::text, media.model_id::text, media.media_asset_id::text,
          media.role::text, media.sort_order, media.source_id,
          media.source_type::text, media.source_url,
          asset.object_key AS asset_object_key, asset.file_hash AS asset_file_hash,
          asset.mime_type AS asset_mime_type, asset.byte_size AS asset_byte_size
        FROM source_media_asset media
        JOIN catalog_sync_item item ON item.source_entity_id = media.source_entity_id
        JOIN media_asset asset ON asset.id = media.media_asset_id
        WHERE item.sync_run_id = $1::uuid
          AND item.source_type = 'MEDIA'
          AND item.status <> 'MEDIA_ERROR'
          AND media.media_asset_id IS NOT NULL
        ORDER BY media.source_id
      `,
      [payload.syncRunId],
    );
    for (let index = 0; index < linked.rows.length; index += 1) {
      if (signal.aborted) {
        throw new CatalogPipelineError('CATALOG_PIPELINE_SOURCE_UNAVAILABLE', {
          retryable: true,
        });
      }
      if (index % 25 === 0 && (await catalogCancellationRequested(helpers, payload.syncRunId))) {
        return {
          cancelled: true,
          failedCount: 0,
          importedCount: 0,
          remainingCount: await remainingMediaCount(),
          reusedCount,
        };
      }
      const sourceMedia = linked.rows[index];
      if (sourceMedia === undefined) {
        throw new CatalogPipelineError('CATALOG_PIPELINE_DATABASE');
      }
      try {
        await verifyLinkedStoredImage(dependencies.objectStorage, sourceMedia);
      } catch (error) {
        throw toCatalogPipelineError(error);
      }
      reusedCount += 1;
    }
    await helpers.query(
      `
        UPDATE catalog_sync_item item
        SET safe_metadata = item.safe_metadata || jsonb_build_object(
              'mediaObjectReverified', true,
              'mediaObjectReverifiedAt', NOW()::text
            ),
            updated_at = NOW()
        FROM source_media_asset media
        WHERE item.sync_run_id = $1::uuid
          AND item.source_entity_id = media.source_entity_id
          AND media.media_asset_id IS NOT NULL
      `,
      [payload.syncRunId],
    );
  }

  const pending = await helpers.query<PendingSourceMedia>(
    `
      SELECT
        media.id::text, media.source_entity_id::text,
        media.material_variant_id::text, media.category_id::text,
        media.system_id::text, media.model_id::text, media.media_asset_id::text,
        media.role::text, media.sort_order, media.source_id,
        media.source_type::text, media.source_url,
        asset.object_key AS asset_object_key, asset.file_hash AS asset_file_hash,
        asset.mime_type AS asset_mime_type, asset.byte_size AS asset_byte_size
      FROM source_media_asset media
      JOIN catalog_sync_item item ON item.source_entity_id = media.source_entity_id
      LEFT JOIN media_asset asset ON asset.id = media.media_asset_id
      WHERE item.sync_run_id = $1::uuid
        AND item.source_type = 'MEDIA'
        AND item.status <> 'MEDIA_ERROR'
        AND media.media_asset_id IS NULL
      ORDER BY COALESCE(
        media.material_variant_id,
        media.category_id,
        media.system_id,
        media.model_id
      ), media.role, media.sort_order, media.source_id
      LIMIT $2
    `,
    [payload.syncRunId, maximumItemsPerBatch],
  );
  let failedCount = 0;
  let importedCount = 0;

  for (let index = 0; index < pending.rows.length; index += 1) {
    if (signal.aborted)
      throw new CatalogPipelineError('CATALOG_PIPELINE_SOURCE_UNAVAILABLE', { retryable: true });
    if (index % 25 === 0 && (await catalogCancellationRequested(helpers, payload.syncRunId))) {
      return {
        cancelled: true,
        failedCount,
        importedCount,
        remainingCount: await remainingMediaCount(),
        reusedCount,
      };
    }
    const sourceMedia = pending.rows[index];
    if (sourceMedia === undefined) {
      throw new CatalogPipelineError('CATALOG_PIPELINE_DATABASE');
    }
    try {
      const file = await adapter.fetchMedia(sourceMedia.source_url);
      if (signal.aborted || file.sourceUrl !== sourceMedia.source_url) {
        throw new CatalogPipelineError('CATALOG_PIPELINE_MEDIA_INVALID');
      }
      const image = inspectCatalogImage(file, dependencies.maximumBytes);
      const stored = await ensureStoredImage(
        dependencies.objectStorage,
        file,
        image,
        sourceMedia.source_type,
      );
      if (signal.aborted)
        throw new CatalogPipelineError('CATALOG_PIPELINE_SOURCE_UNAVAILABLE', { retryable: true });
      await persistMediaLink(
        helpers,
        payload,
        sourceMedia,
        image,
        stored.objectKey,
        sourceMedia.sort_order,
      );
      importedCount += 1;
      if (stored.reused || sourceMedia.media_asset_id !== null) reusedCount += 1;
    } catch (error) {
      if (error instanceof CatalogSourceError) {
        if (error.retryable) throw toCatalogPipelineError(error);
        failedCount += 1;
        await markMediaError(helpers, payload, sourceMedia, error.code);
        continue;
      }
      if (
        error instanceof CatalogPipelineError &&
        error.code === 'CATALOG_PIPELINE_MEDIA_INVALID'
      ) {
        failedCount += 1;
        await markMediaError(helpers, payload, sourceMedia, error.code);
        continue;
      }
      throw toCatalogPipelineError(error);
    }
  }

  const remainingCount = await remainingMediaCount();
  await helpers.query(
    `
      UPDATE catalog_sync_run
      SET status = CASE WHEN $2 = 0 THEN 'BUILDING_DIFF'::catalog_sync_status
                        ELSE 'IMPORTING_MEDIA'::catalog_sync_status END,
          last_heartbeat_at = NOW(), updated_at = NOW(),
          audit_context = audit_context || jsonb_build_object(
            'mediaBatchNumber', $3::integer,
            'mediaRemainingCount', $2::integer
          )
      WHERE id = $1::uuid
    `,
    [payload.syncRunId, remainingCount, payload.batchNumber],
  );
  return {
    cancelled: false,
    failedCount,
    importedCount,
    remainingCount,
    reusedCount,
  };
}
