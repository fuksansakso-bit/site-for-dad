import { createHash } from 'node:crypto';

import sharp from 'sharp';

export interface PreparedPortfolioImage {
  readonly body: Uint8Array;
  readonly detectedMimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  readonly fileHash: string;
  readonly height: number;
  readonly objectKey: string;
  readonly originalSha256: string;
  readonly safeName: string;
  readonly width: number;
}

function safeName(value: string): string {
  const stem = value
    .normalize('NFKD')
    .replace(/\.[^.]+$/u, '')
    .replace(/[^A-Za-z0-9_-]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 150);
  return `${stem === '' ? 'portfolio-image' : stem}.webp`;
}

export async function preparePortfolioImage(
  name: string,
  bytes: Uint8Array,
): Promise<PreparedPortfolioImage> {
  const image = sharp(bytes, {
    animated: false,
    failOn: 'error',
    limitInputPixels: 40_000_000,
  });
  const metadata = await image.metadata();
  const detectedMimeType =
    metadata.format === 'jpeg'
      ? 'image/jpeg'
      : metadata.format === 'png'
        ? 'image/png'
        : metadata.format === 'webp'
          ? 'image/webp'
          : null;
  if (
    detectedMimeType === null ||
    metadata.width === undefined ||
    metadata.height === undefined ||
    (metadata.pages ?? 1) !== 1
  ) {
    throw new Error('PORTFOLIO_IMAGE_UNSUPPORTED');
  }
  const normalized = await image
    .rotate()
    .webp({ effort: 4, quality: 92 })
    .toBuffer({ resolveWithObject: true });
  const fileHash = createHash('sha256').update(normalized.data).digest('hex');
  return {
    body: normalized.data,
    detectedMimeType,
    fileHash,
    height: normalized.info.height,
    objectKey: `portfolio/original/${fileHash.slice(0, 2)}/${fileHash}.webp`,
    originalSha256: createHash('sha256').update(bytes).digest('hex'),
    safeName: safeName(name),
    width: normalized.info.width,
  };
}
