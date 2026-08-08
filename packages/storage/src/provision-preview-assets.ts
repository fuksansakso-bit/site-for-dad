import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { parseStorageEnvironment } from '@project-name/config/server';

import { isStorageError } from './errors.js';
import { S3ObjectStorage } from './s3-object-storage.js';
import { amigoAuthorizedPreviewObjectSource } from './types.js';

const manifestPath = fileURLToPath(
  new URL('../../../assets/preview/manifest.json', import.meta.url),
);
const assetRoot = new URL('../../../assets/preview/', import.meta.url);

interface PreviewAssetManifestEntry {
  readonly byteSize: number;
  readonly contentType: 'image/png';
  readonly file: string;
  readonly height: number;
  readonly id: string;
  readonly objectKey: string;
  readonly publicationStatus: 'PUBLICATION_APPROVED';
  readonly rightsStatus: 'PARTNER_LICENSE';
  readonly role: string;
  readonly sha256: string;
  readonly sourceUrl: string;
  readonly width: number;
}

interface PreviewAssetManifest {
  readonly assets: readonly PreviewAssetManifestEntry[];
  readonly permissionBasis: string;
  readonly runtimeRemoteFetch: false;
  readonly schemaVersion: 1;
}

function isManifest(value: unknown): value is PreviewAssetManifest {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    record['schemaVersion'] === 1 &&
    record['runtimeRemoteFetch'] === false &&
    typeof record['permissionBasis'] === 'string' &&
    Array.isArray(record['assets'])
  );
}

export async function readPreviewAssetManifest(): Promise<PreviewAssetManifest> {
  const parsed: unknown = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (!isManifest(parsed)) throw new TypeError('PREVIEW_ASSET_MANIFEST_INVALID');
  return parsed;
}

export async function provisionPreviewAssets(
  storage = new S3ObjectStorage(parseStorageEnvironment(process.env)),
): Promise<{ readonly provisioned: number; readonly reused: number }> {
  const manifest = await readPreviewAssetManifest();
  let provisioned = 0;
  let reused = 0;
  for (const asset of manifest.assets) {
    if (
      asset.contentType !== 'image/png' ||
      asset.publicationStatus !== 'PUBLICATION_APPROVED' ||
      asset.rightsStatus !== 'PARTNER_LICENSE' ||
      !/^[a-f0-9]{64}$/u.test(asset.sha256) ||
      !asset.objectKey.endsWith(`${asset.sha256}.png`) ||
      asset.file.includes('..') ||
      !asset.sourceUrl.startsWith(
        'https://94467d4a238359fbf34ad21ca461e711.customizer.amigo.ru/storage-new/',
      )
    ) {
      throw new TypeError('PREVIEW_ASSET_MANIFEST_ENTRY_INVALID');
    }
    const body = new Uint8Array(await readFile(new URL(asset.file, assetRoot)));
    const checksumSha256 = createHash('sha256').update(body).digest('hex');
    if (body.byteLength !== asset.byteSize || checksumSha256 !== asset.sha256) {
      throw new TypeError('PREVIEW_ASSET_INTEGRITY_INVALID');
    }
    const locator = { key: asset.objectKey, zone: 'private' } as const;
    try {
      const existing = await storage.head(locator);
      if (
        existing.checksumSha256 !== asset.sha256 ||
        existing.contentLength !== asset.byteSize ||
        existing.contentType !== asset.contentType ||
        existing.source !== amigoAuthorizedPreviewObjectSource
      ) {
        throw new TypeError('PREVIEW_ASSET_STORAGE_CONFLICT');
      }
      reused += 1;
    } catch (error) {
      if (!isStorageError(error) || error.code !== 'STORAGE_NOT_FOUND') throw error;
      await storage.put({
        body,
        contentType: asset.contentType,
        locator,
        source: amigoAuthorizedPreviewObjectSource,
      });
      provisioned += 1;
    }
  }
  return { provisioned, reused };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await provisionPreviewAssets();
  process.stdout.write(`${JSON.stringify({ event: 'preview.assets.provisioned', ...result })}\n`);
}
