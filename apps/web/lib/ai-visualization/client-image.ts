'use client';

import { createSupabaseBrowserClient } from '../phase2a/browser';
import type { SupportedImageMime } from './types';

const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_LONG_SIDE = 2048;
const MIN_SIDE = 320;
const MAX_PIXELS = 40_000_000;

export class ClientImageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ClientImageError';
  }
}

export type PreparedWindowImage = {
  blob: Blob;
  byteSize: number;
  height: number;
  mimeType: 'image/jpeg';
  sha256: string;
  width: number;
};

function detectedMime(bytes: Uint8Array): SupportedImageMime | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    bytes.length >= 24 &&
    bytes[0] === 137 &&
    bytes[1] === 80 &&
    bytes[2] === 78 &&
    bytes[3] === 71 &&
    bytes[4] === 13 &&
    bytes[5] === 10 &&
    bytes[6] === 26 &&
    bytes[7] === 10
  ) {
    return 'image/png';
  }
  if (
    bytes.length >= 30 &&
    String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

function jpegDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  let offset = 2;
  const startOfFrame = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
  ]);
  while (offset + 8 < bytes.length) {
    if (bytes[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    while (bytes[offset] === 0xff) offset += 1;
    const marker = bytes[offset];
    offset += 1;
    if (marker === undefined || marker === 0xda || marker === 0xd9) return null;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const length = ((bytes[offset] ?? 0) << 8) | (bytes[offset + 1] ?? 0);
    if (length < 2 || offset + length > bytes.length) return null;
    if (startOfFrame.has(marker)) {
      const height = ((bytes[offset + 3] ?? 0) << 8) | (bytes[offset + 4] ?? 0);
      const width = ((bytes[offset + 5] ?? 0) << 8) | (bytes[offset + 6] ?? 0);
      return width > 0 && height > 0 ? { height, width } : null;
    }
    offset += length;
  }
  return null;
}

function webpDimensions(bytes: Uint8Array): { width: number; height: number } | null {
  const chunk = String.fromCharCode(...bytes.subarray(12, 16));
  if (chunk === 'VP8X' && bytes.length >= 30) {
    const width = 1 + (bytes[24] ?? 0) + ((bytes[25] ?? 0) << 8) + ((bytes[26] ?? 0) << 16);
    const height = 1 + (bytes[27] ?? 0) + ((bytes[28] ?? 0) << 8) + ((bytes[29] ?? 0) << 16);
    return { height, width };
  }
  if (chunk === 'VP8L' && bytes.length >= 25 && bytes[20] === 0x2f) {
    const b1 = bytes[21] ?? 0;
    const b2 = bytes[22] ?? 0;
    const b3 = bytes[23] ?? 0;
    const b4 = bytes[24] ?? 0;
    return {
      height: 1 + (b2 >> 6) + (b3 << 2) + ((b4 & 0x0f) << 10),
      width: 1 + b1 + ((b2 & 0x3f) << 8),
    };
  }
  if (
    chunk === 'VP8 ' &&
    bytes.length >= 30 &&
    bytes[23] === 0x9d &&
    bytes[24] === 0x01 &&
    bytes[25] === 0x2a
  ) {
    return {
      height: ((bytes[28] ?? 0) | ((bytes[29] ?? 0) << 8)) & 0x3fff,
      width: ((bytes[26] ?? 0) | ((bytes[27] ?? 0) << 8)) & 0x3fff,
    };
  }
  return null;
}

function encodedDimensions(
  bytes: Uint8Array,
  mimeType: SupportedImageMime,
): { width: number; height: number } | null {
  if (mimeType === 'image/jpeg') return jpegDimensions(bytes);
  if (mimeType === 'image/png') {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { height: view.getUint32(20), width: view.getUint32(16) };
  }
  return webpDimensions(bytes);
}

function validateDimensions(dimensions: { width: number; height: number } | null): void {
  if (!dimensions || Math.min(dimensions.width, dimensions.height) < MIN_SIDE) {
    throw new ClientImageError('Фотография слишком маленькая. Выберите более чёткое фото.');
  }
  if (
    Math.max(dimensions.width, dimensions.height) > 20_000 ||
    dimensions.width * dimensions.height > MAX_PIXELS
  ) {
    throw new ClientImageError(
      'Фотография имеет слишком большое разрешение. Выберите другое фото.',
    );
  }
}

function canvasBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new ClientImageError('Не удалось подготовить фото.')),
      'image/jpeg',
      quality,
    );
  });
}

async function sha256(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function prepareWindowImage(file: File): Promise<PreparedWindowImage> {
  if (file.size === 0) throw new ClientImageError('Файл пуст. Выберите фотографию окна.');
  if (file.size > MAX_SOURCE_BYTES) {
    throw new ClientImageError('Фотография слишком большая. Выберите файл до 20 МБ.');
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new ClientImageError('Поддерживаются только JPEG, PNG и WebP.');
  }
  const sourceBytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = detectedMime(sourceBytes);
  if (!mimeType || mimeType !== file.type) {
    throw new ClientImageError('Тип файла не соответствует содержимому фотографии.');
  }
  validateDimensions(encodedDimensions(sourceBytes, mimeType));
  if (typeof createImageBitmap !== 'function') {
    throw new ClientImageError('Браузер не может безопасно обработать это фото. Выберите другое.');
  }

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    validateDimensions({ height: bitmap.height, width: bitmap.width });
    const scale = Math.min(1, MAX_LONG_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new ClientImageError('Не удалось подготовить фотографию.');
    context.drawImage(bitmap, 0, 0, width, height);
    let blob = await canvasBlob(canvas, 0.9);
    for (const quality of [0.82, 0.74, 0.66]) {
      if (blob.size <= MAX_UPLOAD_BYTES) break;
      blob = await canvasBlob(canvas, quality);
    }
    canvas.width = 1;
    canvas.height = 1;
    if (blob.size === 0 || blob.size > MAX_UPLOAD_BYTES) {
      throw new ClientImageError('Не удалось уменьшить фото до 4 МБ. Выберите другое.');
    }
    return {
      blob,
      byteSize: blob.size,
      height,
      mimeType: 'image/jpeg',
      sha256: await sha256(blob),
      width,
    };
  } catch (error) {
    if (error instanceof ClientImageError) throw error;
    throw new ClientImageError('Браузер не может безопасно обработать это фото. Выберите другое.');
  } finally {
    bitmap?.close();
  }
}

type SignedUploadResponse = {
  bucket: string;
  path: string;
  token: string;
};

async function safeJson(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function confirmUploadedImage(
  publicReference: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  let lastPayload: Record<string, unknown> = {};
  for (const delayMs of [0, 300, 900]) {
    if (delayMs > 0) await new Promise((resolve) => globalThis.setTimeout(resolve, delayMs));
    const response = await fetch(`/api/ai-visualizations/${publicReference}/upload/confirm`, {
      body: JSON.stringify(metadata),
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
    });
    lastPayload = await safeJson(response);
    if (response.ok) return;
    if (response.status < 500) break;
  }
  throw new ClientImageError(apiMessage(lastPayload));
}

function apiMessage(payload: Record<string, unknown>): string {
  const error = payload['error'];
  return typeof error === 'object' && error !== null && 'message' in error
    ? String(error.message)
    : 'Не удалось загрузить фотографию. Попробуйте позже.';
}

export async function uploadWindowImageDirectly(
  publicReference: string,
  image: PreparedWindowImage,
  idempotencyKey: string,
): Promise<void> {
  const metadata = {
    byteSize: image.byteSize,
    height: image.height,
    idempotencyKey,
    mimeType: image.mimeType,
    sha256: image.sha256,
    width: image.width,
  };
  const signedResponse = await fetch(`/api/ai-visualizations/${publicReference}/upload`, {
    body: JSON.stringify(metadata),
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
  const signedPayload = await safeJson(signedResponse);
  if (!signedResponse.ok) throw new ClientImageError(apiMessage(signedPayload));
  const signed = signedPayload as SignedUploadResponse;
  if (
    !signed.bucket?.match(/^[a-z0-9][a-z0-9-]{1,62}$/u) ||
    !signed.path?.match(/^[0-9a-f-]{36}\/window\.(jpg|png|webp)$/u) ||
    !signed.token
  ) {
    throw new ClientImageError('Не удалось получить безопасную ссылку загрузки.');
  }
  const client = createSupabaseBrowserClient();
  if (!client) throw new ClientImageError('Хранилище фотографий временно недоступно.');
  const { error } = await client.storage
    .from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, image.blob, {
      contentType: image.mimeType,
      upsert: false,
    });
  if (error) throw new ClientImageError('Не удалось загрузить фотографию. Попробуйте снова.');
  await confirmUploadedImage(publicReference, metadata);
}
