import type { DatabaseEnvironment } from '@project-name/config/server';
import { Pool, type PoolClient } from 'pg';

import { cartTransaction } from './cart.js';

export type PortfolioStaffRole = 'MANAGER' | 'ADMIN' | 'OWNER';
export type PortfolioItemStatus =
  'DRAFT' | 'RIGHTS_REVIEW' | 'READY_FOR_REVIEW' | 'PUBLISHED' | 'HIDDEN' | 'ARCHIVED';
export type PortfolioMediaStatus =
  | 'UPLOADED_PRIVATE'
  | 'PROCESSING'
  | 'READY_FOR_REVIEW'
  | 'PUBLICATION_APPROVED'
  | 'PUBLICATION_BLOCKED';

export interface PortfolioActor {
  readonly actorId: string;
  readonly role: PortfolioStaffRole;
}

export interface PortfolioMediaView {
  readonly detectedMimeType: string;
  readonly exifStripped: boolean;
  readonly height: number;
  readonly id: string;
  readonly publicationStatus: 'PENDING' | 'PUBLICATION_APPROVED' | 'PUBLICATION_BLOCKED';
  readonly safeName: string;
  readonly status: PortfolioMediaStatus;
  readonly width: number;
}

export interface PortfolioItemView {
  readonly category: string;
  readonly completedOn: string | null;
  readonly createdAt: string;
  readonly description: string;
  readonly id: string;
  readonly locality: string | null;
  readonly media: readonly PortfolioMediaView[];
  readonly publicationVersion: number;
  readonly publishedAt: string | null;
  readonly rightsEvidence: string | null;
  readonly slug: string;
  readonly status: PortfolioItemStatus;
  readonly title: string;
  readonly updatedAt: string;
}

export interface PublishedPortfolioItem {
  readonly category: string;
  readonly completedOn: string | null;
  readonly description: string;
  readonly id: string;
  readonly locality: string | null;
  readonly mediaIds: readonly string[];
  readonly slug: string;
  readonly title: string;
}

export interface PortfolioMediaClaim {
  readonly mediaId: string;
  readonly objectKey: string;
}

export interface PortfolioProcessedAsset {
  readonly byteSize: number;
  readonly fileHash: string;
  readonly height: number;
  readonly mimeType: 'image/webp';
  readonly objectKey: string;
  readonly width: number;
}

interface StaffCommand extends PortfolioActor {
  readonly correlationId: string;
}

export interface PortfolioAdapter {
  addItem(
    input: StaffCommand & {
      readonly category: string;
      readonly completedOn: string | null;
      readonly description: string;
      readonly locality: string | null;
      readonly rightsEvidence: string | null;
      readonly slug: string;
      readonly title: string;
    },
  ): Promise<string>;
  blockMediaProcessing(mediaId: string, correlationId: string): Promise<void>;
  claimMediaProcessing(mediaId: string): Promise<PortfolioMediaClaim | null>;
  completeMediaProcessing(
    mediaId: string,
    display: PortfolioProcessedAsset,
    thumbnail: PortfolioProcessedAsset,
    correlationId: string,
  ): Promise<void>;
  getPublishedMedia(
    mediaId: string,
    variant: 'display' | 'thumbnail',
  ): Promise<{ readonly mimeType: string; readonly objectKey: string } | null>;
  hideItem(input: StaffCommand & { readonly itemId: string }): Promise<void>;
  listAdminItems(input: StaffCommand): Promise<readonly PortfolioItemView[]>;
  listPublishedItems(): Promise<readonly PublishedPortfolioItem[]>;
  publishItem(input: StaffCommand & { readonly itemId: string }): Promise<void>;
  registerMedia(
    input: StaffCommand & {
      readonly byteSize: number;
      readonly detectedMimeType: string;
      readonly fileHash: string;
      readonly height: number;
      readonly itemId: string;
      readonly objectKey: string;
      readonly originalSha256: string;
      readonly safeName: string;
      readonly width: number;
    },
  ): Promise<string>;
}

export type PortfolioStoreErrorCode =
  | 'PORTFOLIO_AUTHORIZATION'
  | 'PORTFOLIO_CONFLICT'
  | 'PORTFOLIO_DATABASE'
  | 'PORTFOLIO_INVALID_INPUT'
  | 'PORTFOLIO_NOT_FOUND';

export class PortfolioStoreError extends Error {
  public constructor(
    public readonly code: PortfolioStoreErrorCode,
    options?: ErrorOptions,
  ) {
    super(code, options);
    this.name = 'PortfolioStoreError';
  }
}

interface ItemRow {
  readonly category: string;
  readonly completed_on: Date | null;
  readonly created_at: Date;
  readonly description: string;
  readonly id: string;
  readonly locality: string | null;
  readonly publication_version: number;
  readonly published_at: Date | null;
  readonly rights_evidence: string | null;
  readonly slug: string;
  readonly status: PortfolioItemStatus;
  readonly title: string;
  readonly updated_at: Date;
}

interface MediaRow {
  readonly detected_mime_type: string;
  readonly exif_stripped: boolean;
  readonly height: number;
  readonly id: string;
  readonly portfolio_item_id: string;
  readonly publication_status: PortfolioMediaView['publicationStatus'];
  readonly safe_name: string;
  readonly status: PortfolioMediaStatus;
  readonly width: number;
}

function mapError(error: unknown): PortfolioStoreError {
  if (error instanceof PortfolioStoreError) return error;
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = String(error.code);
    if (code === '23505' || code === '40001') {
      return new PortfolioStoreError('PORTFOLIO_CONFLICT', { cause: error });
    }
    if (code === '22P02' || code === '23514') {
      return new PortfolioStoreError('PORTFOLIO_INVALID_INPUT', { cause: error });
    }
  }
  return new PortfolioStoreError('PORTFOLIO_DATABASE', { cause: error });
}

function uuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

function assertCommand(input: StaffCommand): void {
  if (
    !uuid(input.actorId) ||
    !['MANAGER', 'ADMIN', 'OWNER'].includes(input.role) ||
    !/^[A-Za-z0-9:._-]{8,128}$/u.test(input.correlationId)
  ) {
    throw new PortfolioStoreError('PORTFOLIO_AUTHORIZATION');
  }
}

async function requireStaff(client: PoolClient, input: PortfolioActor): Promise<void> {
  const result = await client.query<{ allowed: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM actor_identity actor
       JOIN role_grant grant_row ON grant_row.actor_id = actor.id
       WHERE actor.id = $1::uuid AND actor.disabled_at IS NULL
         AND grant_row.role = $2::system_role AND grant_row.revoked_at IS NULL
     ) AS allowed`,
    [input.actorId, input.role],
  );
  if (result.rows[0]?.allowed !== true) throw new PortfolioStoreError('PORTFOLIO_AUTHORIZATION');
}

async function audit(
  client: PoolClient,
  actorId: string | null,
  correlationId: string,
  action: string,
  targetId: string,
): Promise<void> {
  await client.query(
    `INSERT INTO audit_event (
       actor_type, actor_identity_id, action, outcome, correlation_id,
       target_type, target_id, reason_code
     ) VALUES ($1::audit_actor_type,$2::uuid,$3,'SUCCEEDED',$4,'PORTFOLIO',$5,'PHASE_1F_PORTFOLIO')`,
    [actorId === null ? 'SYSTEM' : 'IDENTITY', actorId, action, correlationId, targetId],
  );
}

function mapMedia(row: MediaRow): PortfolioMediaView {
  return {
    detectedMimeType: row.detected_mime_type,
    exifStripped: row.exif_stripped,
    height: row.height,
    id: row.id,
    publicationStatus: row.publication_status,
    safeName: row.safe_name,
    status: row.status,
    width: row.width,
  };
}

function mapItem(row: ItemRow, media: readonly PortfolioMediaView[]): PortfolioItemView {
  return {
    category: row.category,
    completedOn: row.completed_on?.toISOString().slice(0, 10) ?? null,
    createdAt: row.created_at.toISOString(),
    description: row.description,
    id: row.id,
    locality: row.locality,
    media,
    publicationVersion: row.publication_version,
    publishedAt: row.published_at?.toISOString() ?? null,
    rightsEvidence: row.rights_evidence,
    slug: row.slug,
    status: row.status,
    title: row.title,
    updatedAt: row.updated_at.toISOString(),
  };
}

async function insertAsset(
  client: PoolClient,
  asset: PortfolioProcessedAsset & { readonly publicationStatus?: string },
): Promise<string> {
  const result = await client.query<{ id: string }>(
    `INSERT INTO media_asset (
       file_hash, storage_zone, object_key, mime_type, byte_size, width, height,
       rights_status, publication_status, updated_at
     ) VALUES ($1,'private',$2,$3,$4,$5,$6,'OWNER_CREATED',$7::media_publication_status,NOW())
     ON CONFLICT (file_hash) DO UPDATE SET updated_at = media_asset.updated_at
     RETURNING id::text`,
    [
      asset.fileHash,
      asset.objectKey,
      asset.mimeType,
      asset.byteSize,
      asset.width,
      asset.height,
      asset.publicationStatus ?? 'PENDING',
    ],
  );
  const id = result.rows[0]?.id;
  if (id === undefined) throw new PortfolioStoreError('PORTFOLIO_DATABASE');
  return id;
}

export function createPortfolioAdapter(environment: DatabaseEnvironment): PortfolioAdapter {
  const pool = new Pool({
    connectionString: environment.DATABASE_URL,
    max: 6,
    statement_timeout: environment.DATABASE_STATEMENT_TIMEOUT_MS,
  });

  return {
    async addItem(input) {
      assertCommand(input);
      const title = input.title.trim();
      const description = input.description.trim();
      const category = input.category.trim();
      const locality = input.locality?.trim() || null;
      const rightsEvidence = input.rightsEvidence?.trim() || null;
      if (
        title.length < 2 ||
        title.length > 180 ||
        description.length < 10 ||
        description.length > 2_000 ||
        category.length < 2 ||
        category.length > 120 ||
        (locality !== null && locality.length > 160) ||
        (rightsEvidence !== null && rightsEvidence.length > 1_000) ||
        !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(input.slug) ||
        input.slug.length > 180 ||
        (input.completedOn !== null && !/^\d{4}-\d{2}-\d{2}$/u.test(input.completedOn))
      ) {
        throw new PortfolioStoreError('PORTFOLIO_INVALID_INPUT');
      }
      return cartTransaction(
        pool,
        async (client) => {
          await requireStaff(client, input);
          const result = await client.query<{ id: string }>(
            `INSERT INTO portfolio_item (
               slug, title, description, locality, category, completed_on, status,
               rights_evidence, created_by_id, updated_by_id, updated_at
             ) VALUES ($1,$2,$3,$4,$5,$6::date,$7::portfolio_item_status,$8,$9::uuid,$9::uuid,NOW())
             RETURNING id::text`,
            [
              input.slug,
              title,
              description,
              locality,
              category,
              input.completedOn,
              rightsEvidence === null ? 'DRAFT' : 'RIGHTS_REVIEW',
              rightsEvidence,
              input.actorId,
            ],
          );
          const id = result.rows[0]?.id;
          if (id === undefined) throw new PortfolioStoreError('PORTFOLIO_DATABASE');
          await audit(client, input.actorId, input.correlationId, 'portfolio.item_created', id);
          return id;
        },
        mapError,
      );
    },

    async blockMediaProcessing(mediaId, correlationId) {
      if (!uuid(mediaId)) throw new PortfolioStoreError('PORTFOLIO_INVALID_INPUT');
      await cartTransaction(
        pool,
        async (client) => {
          await client.query(
            `UPDATE portfolio_media
             SET status = 'PUBLICATION_BLOCKED', publication_status = 'PUBLICATION_BLOCKED', updated_at = NOW()
             WHERE id = $1::uuid AND status <> 'PUBLICATION_APPROVED'`,
            [mediaId],
          );
          await audit(client, null, correlationId, 'portfolio.media_processing_blocked', mediaId);
        },
        mapError,
      );
    },

    async claimMediaProcessing(mediaId) {
      if (!uuid(mediaId)) throw new PortfolioStoreError('PORTFOLIO_INVALID_INPUT');
      return cartTransaction(
        pool,
        async (client) => {
          const result = await client.query<{ object_key: string; status: PortfolioMediaStatus }>(
            `SELECT asset.object_key, media.status::text
             FROM portfolio_media media
             JOIN media_asset asset ON asset.id = media.original_asset_id
             WHERE media.id = $1::uuid
             FOR UPDATE OF media`,
            [mediaId],
          );
          const row = result.rows[0];
          if (row === undefined) throw new PortfolioStoreError('PORTFOLIO_NOT_FOUND');
          if (['READY_FOR_REVIEW', 'PUBLICATION_APPROVED'].includes(row.status)) return null;
          if (!['UPLOADED_PRIVATE', 'PROCESSING'].includes(row.status)) {
            throw new PortfolioStoreError('PORTFOLIO_CONFLICT');
          }
          await client.query(
            `UPDATE portfolio_media SET status = 'PROCESSING', updated_at = NOW() WHERE id = $1::uuid`,
            [mediaId],
          );
          return { mediaId, objectKey: row.object_key };
        },
        mapError,
      );
    },

    async completeMediaProcessing(mediaId, display, thumbnail, correlationId) {
      if (!uuid(mediaId)) throw new PortfolioStoreError('PORTFOLIO_INVALID_INPUT');
      await cartTransaction(
        pool,
        async (client) => {
          const displayId = await insertAsset(client, display);
          const thumbnailId = await insertAsset(client, thumbnail);
          const updated = await client.query<{ item_id: string }>(
            `UPDATE portfolio_media
             SET display_asset_id = $2::uuid, thumbnail_asset_id = $3::uuid,
                 status = 'READY_FOR_REVIEW', exif_stripped = true, updated_at = NOW()
             WHERE id = $1::uuid AND status IN ('UPLOADED_PRIVATE','PROCESSING','READY_FOR_REVIEW')
             RETURNING portfolio_item_id::text AS item_id`,
            [mediaId, displayId, thumbnailId],
          );
          const itemId = updated.rows[0]?.item_id;
          if (itemId === undefined) throw new PortfolioStoreError('PORTFOLIO_CONFLICT');
          await client.query(
            `UPDATE portfolio_item item
             SET status = 'READY_FOR_REVIEW', updated_at = NOW()
             WHERE item.id = $1::uuid AND item.rights_evidence IS NOT NULL
               AND NOT EXISTS (
                 SELECT 1 FROM portfolio_media media
                 WHERE media.portfolio_item_id = item.id AND media.status <> 'READY_FOR_REVIEW'
               )`,
            [itemId],
          );
          await audit(client, null, correlationId, 'portfolio.media_processed', mediaId);
        },
        mapError,
      );
    },

    async getPublishedMedia(mediaId, variant) {
      if (!uuid(mediaId)) return null;
      const column = variant === 'thumbnail' ? 'thumbnail_asset_id' : 'display_asset_id';
      const result = await pool.query<{ mime_type: string; object_key: string }>(
        `SELECT asset.mime_type, asset.object_key
         FROM portfolio_media media
         JOIN portfolio_item item ON item.id = media.portfolio_item_id
         JOIN media_asset asset ON asset.id = media.${column}
         WHERE media.id = $1::uuid AND item.status = 'PUBLISHED'
           AND media.status = 'PUBLICATION_APPROVED'
           AND media.publication_status = 'PUBLICATION_APPROVED'
           AND asset.publication_status = 'PUBLICATION_APPROVED'`,
        [mediaId],
      );
      const row = result.rows[0];
      return row === undefined ? null : { mimeType: row.mime_type, objectKey: row.object_key };
    },

    async hideItem(input) {
      assertCommand(input);
      if (!uuid(input.itemId) || input.role === 'MANAGER') {
        throw new PortfolioStoreError('PORTFOLIO_AUTHORIZATION');
      }
      await cartTransaction(
        pool,
        async (client) => {
          await requireStaff(client, input);
          const result = await client.query(
            `UPDATE portfolio_item SET status = 'HIDDEN', updated_by_id = $2::uuid, updated_at = NOW()
             WHERE id = $1::uuid AND status = 'PUBLISHED'`,
            [input.itemId, input.actorId],
          );
          if (result.rowCount !== 1) throw new PortfolioStoreError('PORTFOLIO_CONFLICT');
          await client.query(
            `UPDATE media_asset SET publication_status = 'PUBLICATION_BLOCKED', updated_at = NOW()
             WHERE id IN (
               SELECT display_asset_id FROM portfolio_media WHERE portfolio_item_id = $1::uuid
               UNION SELECT thumbnail_asset_id FROM portfolio_media WHERE portfolio_item_id = $1::uuid
             )`,
            [input.itemId],
          );
          await client.query(
            `UPDATE portfolio_media SET status = 'PUBLICATION_BLOCKED',
               publication_status = 'PUBLICATION_BLOCKED', updated_at = NOW()
             WHERE portfolio_item_id = $1::uuid`,
            [input.itemId],
          );
          await audit(
            client,
            input.actorId,
            input.correlationId,
            'portfolio.item_hidden',
            input.itemId,
          );
        },
        mapError,
      );
    },

    async listAdminItems(input) {
      assertCommand(input);
      return cartTransaction(
        pool,
        async (client) => {
          await requireStaff(client, input);
          const [items, media] = await Promise.all([
            client.query<ItemRow>(
              `SELECT id::text, slug, title, description, locality, category, completed_on,
                      status::text, rights_evidence, publication_version, published_at,
                      created_at, updated_at
               FROM portfolio_item ORDER BY updated_at DESC, id DESC LIMIT 100`,
            ),
            client.query<MediaRow>(
              `SELECT id::text, portfolio_item_id::text, safe_name, detected_mime_type,
                      width, height, exif_stripped, status::text, publication_status::text
               FROM portfolio_media ORDER BY created_at, id LIMIT 500`,
            ),
          ]);
          const byItem = new Map<string, PortfolioMediaView[]>();
          for (const row of media.rows) {
            const values = byItem.get(row.portfolio_item_id) ?? [];
            values.push(mapMedia(row));
            byItem.set(row.portfolio_item_id, values);
          }
          await audit(
            client,
            input.actorId,
            input.correlationId,
            'portfolio.admin_listed',
            input.actorId,
          );
          return items.rows.map((item) => mapItem(item, byItem.get(item.id) ?? []));
        },
        mapError,
      );
    },

    async listPublishedItems() {
      const items = await pool.query<ItemRow>(
        `SELECT id::text, slug, title, description, locality, category, completed_on,
                status::text, rights_evidence, publication_version, published_at,
                created_at, updated_at
         FROM portfolio_item WHERE status = 'PUBLISHED'
         ORDER BY completed_on DESC NULLS LAST, published_at DESC LIMIT 100`,
      );
      const media = await pool.query<{ id: string; portfolio_item_id: string }>(
        `SELECT id::text, portfolio_item_id::text FROM portfolio_media
         WHERE status = 'PUBLICATION_APPROVED' AND publication_status = 'PUBLICATION_APPROVED'
         ORDER BY created_at, id`,
      );
      return items.rows.map((item) => ({
        category: item.category,
        completedOn: item.completed_on?.toISOString().slice(0, 10) ?? null,
        description: item.description,
        id: item.id,
        locality: item.locality,
        mediaIds: media.rows
          .filter((entry) => entry.portfolio_item_id === item.id)
          .map((entry) => entry.id),
        slug: item.slug,
        title: item.title,
      }));
    },

    async publishItem(input) {
      assertCommand(input);
      if (!uuid(input.itemId) || input.role === 'MANAGER') {
        throw new PortfolioStoreError('PORTFOLIO_AUTHORIZATION');
      }
      await cartTransaction(
        pool,
        async (client) => {
          await requireStaff(client, input);
          const item = await client.query<{ rights_evidence: string | null }>(
            `SELECT rights_evidence FROM portfolio_item
             WHERE id = $1::uuid AND status IN ('RIGHTS_REVIEW','READY_FOR_REVIEW')
             FOR UPDATE`,
            [input.itemId],
          );
          const readiness = await client.query<{ media_count: string; ready_count: string }>(
            `SELECT count(*)::text AS media_count,
                    count(*) FILTER (
                      WHERE status = 'READY_FOR_REVIEW'
                        AND display_asset_id IS NOT NULL
                        AND thumbnail_asset_id IS NOT NULL
                    )::text AS ready_count
             FROM portfolio_media WHERE portfolio_item_id = $1::uuid`,
            [input.itemId],
          );
          const row = readiness.rows[0];
          if (
            item.rows[0]?.rights_evidence === null ||
            item.rows[0] === undefined ||
            row === undefined ||
            Number(row.media_count) < 1 ||
            row.media_count !== row.ready_count
          ) {
            throw new PortfolioStoreError('PORTFOLIO_CONFLICT');
          }
          await client.query(
            `UPDATE media_asset SET publication_status = 'PUBLICATION_APPROVED', updated_at = NOW()
             WHERE id IN (
               SELECT display_asset_id FROM portfolio_media WHERE portfolio_item_id = $1::uuid
               UNION SELECT thumbnail_asset_id FROM portfolio_media WHERE portfolio_item_id = $1::uuid
             )`,
            [input.itemId],
          );
          await client.query(
            `UPDATE portfolio_media SET status = 'PUBLICATION_APPROVED',
               publication_status = 'PUBLICATION_APPROVED', updated_at = NOW()
             WHERE portfolio_item_id = $1::uuid`,
            [input.itemId],
          );
          await client.query(
            `UPDATE portfolio_item SET status = 'PUBLISHED', publication_version = publication_version + 1,
               published_at = NOW(), updated_by_id = $2::uuid, updated_at = NOW()
             WHERE id = $1::uuid`,
            [input.itemId, input.actorId],
          );
          await audit(
            client,
            input.actorId,
            input.correlationId,
            'portfolio.item_published',
            input.itemId,
          );
        },
        mapError,
      );
    },

    async registerMedia(input) {
      assertCommand(input);
      if (
        !uuid(input.itemId) ||
        !/^[0-9a-f]{64}$/u.test(input.fileHash) ||
        !/^[0-9a-f]{64}$/u.test(input.originalSha256) ||
        !/^portfolio\/original\/[0-9a-f]{2}\/[0-9a-f]{64}\.webp$/u.test(input.objectKey) ||
        !/^image\/(?:jpeg|png|webp)$/u.test(input.detectedMimeType) ||
        input.byteSize < 1 ||
        input.byteSize > 8_388_608 ||
        input.width < 1 ||
        input.height < 1 ||
        input.width * input.height > 40_000_000 ||
        input.safeName.length < 1 ||
        input.safeName.length > 180
      ) {
        throw new PortfolioStoreError('PORTFOLIO_INVALID_INPUT');
      }
      return cartTransaction(
        pool,
        async (client) => {
          await requireStaff(client, input);
          const item = await client.query<{ id: string }>(
            `SELECT id::text FROM portfolio_item
             WHERE id = $1::uuid AND status IN ('DRAFT','RIGHTS_REVIEW','READY_FOR_REVIEW') FOR UPDATE`,
            [input.itemId],
          );
          if (item.rows[0] === undefined) throw new PortfolioStoreError('PORTFOLIO_CONFLICT');
          const assetId = await insertAsset(client, {
            byteSize: input.byteSize,
            fileHash: input.fileHash,
            height: input.height,
            mimeType: 'image/webp',
            objectKey: input.objectKey,
            width: input.width,
          });
          const result = await client.query<{ id: string }>(
            `INSERT INTO portfolio_media (
               portfolio_item_id, original_asset_id, source_class, safe_name,
               original_sha256, detected_mime_type, width, height, exif_stripped,
               status, rights_status, publication_status, updated_at
             ) VALUES ($1::uuid,$2::uuid,'LOCAL_PORTFOLIO',$3,$4,$5,$6,$7,true,
               'UPLOADED_PRIVATE','OWNER_CREATED','PENDING',NOW())
             RETURNING id::text`,
            [
              input.itemId,
              assetId,
              input.safeName,
              input.originalSha256,
              input.detectedMimeType,
              input.width,
              input.height,
            ],
          );
          const mediaId = result.rows[0]?.id;
          if (mediaId === undefined) throw new PortfolioStoreError('PORTFOLIO_DATABASE');
          await audit(
            client,
            input.actorId,
            input.correlationId,
            'portfolio.media_registered',
            mediaId,
          );
          return mediaId;
        },
        mapError,
      );
    },
  };
}
