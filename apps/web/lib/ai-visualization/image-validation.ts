import 'server-only';

import { createHash } from 'node:crypto';

import { AiVisualizationError } from './errors';
import type { SupportedImageMime } from './types';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export function detectImageMime(bytes: Uint8Array): SupportedImageMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (bytes.length >= 8 && Buffer.from(bytes.subarray(0, 8)).equals(PNG_SIGNATURE)) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    Buffer.from(bytes.subarray(0, 4)).toString('ascii') === 'RIFF' &&
    Buffer.from(bytes.subarray(8, 12)).toString('ascii') === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

type ValidationLimits = {
  maximumBytes: number;
  maximumLongSide: number;
  maximumPixels: number;
  minimumSide: number;
};

export type ValidatedImage = {
  byteSize: number;
  bytes: Buffer;
  height: number;
  mimeType: SupportedImageMime;
  sha256: string;
  width: number;
};

export async function validateImageBytes(
  source: ArrayBuffer | Uint8Array,
  declaredMime: string | null,
  limits: ValidationLimits,
): Promise<ValidatedImage> {
  const bytes = source instanceof ArrayBuffer ? Buffer.from(source) : Buffer.from(source);
  if (bytes.length === 0) throw new AiVisualizationError('INVALID_IMAGE');
  if (bytes.length > limits.maximumBytes) throw new AiVisualizationError('IMAGE_TOO_LARGE');
  const mimeType = detectImageMime(bytes);
  if (!mimeType || (declaredMime !== null && declaredMime !== mimeType)) {
    throw new AiVisualizationError('UNSUPPORTED_IMAGE_TYPE');
  }

  try {
    // @ts-expect-error sharp 0.35.0 ships declarations but omits the `types` export condition.
    const { default: sharp } = await import('sharp');
    const image = sharp(bytes, { failOn: 'error', limitInputPixels: limits.maximumPixels });
    const metadata = await image.metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    const formatMime =
      metadata.format === 'jpeg'
        ? 'image/jpeg'
        : metadata.format === 'png'
          ? 'image/png'
          : metadata.format === 'webp'
            ? 'image/webp'
            : null;
    if (formatMime !== mimeType) throw new AiVisualizationError('INVALID_IMAGE');
    if (Math.min(width, height) < limits.minimumSide) {
      throw new AiVisualizationError('IMAGE_TOO_SMALL');
    }
    if (
      Math.max(width, height) > limits.maximumLongSide ||
      width * height > limits.maximumPixels
    ) {
      throw new AiVisualizationError('IMAGE_TOO_LARGE');
    }
    await image.stats();
    return {
      byteSize: bytes.length,
      bytes,
      height,
      mimeType,
      sha256: createHash('sha256').update(bytes).digest('hex'),
      width,
    };
  } catch (error) {
    if (error instanceof AiVisualizationError) throw error;
    throw new AiVisualizationError('INVALID_IMAGE', { cause: error });
  }
}

export const INPUT_IMAGE_LIMITS = {
  maximumBytes: 4 * 1024 * 1024,
  maximumLongSide: 2048,
  maximumPixels: 40_000_000,
  minimumSide: 320,
} as const;

const MATERIAL_IMAGE_LIMITS = {
  maximumBytes: 8 * 1024 * 1024,
  maximumLongSide: 8192,
  maximumPixels: 40_000_000,
  minimumSide: 16,
} as const;

const PROVIDER_RESULT_LIMITS = {
  maximumBytes: 10 * 1024 * 1024,
  maximumLongSide: 8192,
  maximumPixels: 40_000_000,
  minimumSide: 320,
} as const;

export async function validateMaterialImage(
  source: ArrayBuffer | Uint8Array,
  declaredMime: string | null,
): Promise<ValidatedImage> {
  return validateImageBytes(source, declaredMime, MATERIAL_IMAGE_LIMITS);
}

export async function normalizeProviderResult(
  source: ArrayBuffer | Uint8Array,
  declaredMime: string | null,
  expectedAspectRatio: number,
): Promise<ValidatedImage> {
  const sourceImage = await validateImageBytes(source, declaredMime, PROVIDER_RESULT_LIMITS);
  if (Math.abs(Math.log(sourceImage.width / sourceImage.height / expectedAspectRatio)) > 0.3) {
    throw new AiVisualizationError('OUTPUT_INVALID');
  }
  try {
    // @ts-expect-error sharp 0.35.0 ships declarations but omits the `types` export condition.
    const { default: sharp } = await import('sharp');
    const normalized = await sharp(sourceImage.bytes, {
      failOn: 'error',
      limitInputPixels: PROVIDER_RESULT_LIMITS.maximumPixels,
    })
      .rotate()
      .resize({
        fit: 'inside',
        height: 2048,
        width: 2048,
        withoutEnlargement: true,
      })
      .jpeg({ chromaSubsampling: '4:4:4', quality: 90 })
      .toBuffer();
    return validateImageBytes(normalized, 'image/jpeg', {
      ...PROVIDER_RESULT_LIMITS,
      maximumLongSide: 2048,
    });
  } catch (error) {
    if (error instanceof AiVisualizationError) throw error;
    throw new AiVisualizationError('OUTPUT_INVALID', { cause: error });
  }
}
