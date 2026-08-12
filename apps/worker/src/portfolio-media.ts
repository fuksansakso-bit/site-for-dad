import { createHash } from 'node:crypto';

import type { PortfolioAdapter, PortfolioProcessedAsset } from '@project-name/db';
import type { ObjectStorage } from '@project-name/storage';
import sharp from 'sharp';

function asset(
  body: Uint8Array,
  info: { readonly height: number; readonly width: number },
  kind: 'display' | 'thumbnail',
): PortfolioProcessedAsset {
  const fileHash = createHash('sha256').update(body).digest('hex');
  return {
    byteSize: body.byteLength,
    fileHash,
    height: info.height,
    mimeType: 'image/webp',
    objectKey: `portfolio/${kind}/${fileHash.slice(0, 2)}/${fileHash}.webp`,
    width: info.width,
  };
}

export async function processPortfolioMedia(
  portfolio: PortfolioAdapter,
  storage: ObjectStorage,
  mediaId: string,
): Promise<void> {
  const correlationId = `portfolio-media-${mediaId}`;
  const claim = await portfolio.claimMediaProcessing(mediaId);
  if (claim === null) return;
  try {
    const original = await storage.get({ key: claim.objectKey, zone: 'private' });
    const source = sharp(original.body, {
      animated: false,
      failOn: 'error',
      limitInputPixels: 40_000_000,
    }).rotate();
    const [displayOutput, thumbnailOutput] = await Promise.all([
      source
        .clone()
        .resize({ fit: 'inside', height: 1_800, withoutEnlargement: true, width: 1_800 })
        .webp({ effort: 4, quality: 86 })
        .toBuffer({ resolveWithObject: true }),
      source
        .clone()
        .resize({ fit: 'cover', height: 480, position: 'attention', width: 480 })
        .webp({ effort: 4, quality: 80 })
        .toBuffer({ resolveWithObject: true }),
    ]);
    const display = asset(displayOutput.data, displayOutput.info, 'display');
    const thumbnail = asset(thumbnailOutput.data, thumbnailOutput.info, 'thumbnail');
    await Promise.all([
      storage.put({
        body: displayOutput.data,
        contentType: display.mimeType,
        locator: { key: display.objectKey, zone: 'private' },
        source: 'LOCAL_PORTFOLIO',
      }),
      storage.put({
        body: thumbnailOutput.data,
        contentType: thumbnail.mimeType,
        locator: { key: thumbnail.objectKey, zone: 'private' },
        source: 'LOCAL_PORTFOLIO',
      }),
    ]);
    await portfolio.completeMediaProcessing(mediaId, display, thumbnail, correlationId);
  } catch (error) {
    await portfolio.blockMediaProcessing(mediaId, correlationId).catch(() => undefined);
    throw error;
  }
}
