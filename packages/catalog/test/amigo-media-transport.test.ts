import { describe, expect, it } from 'vitest';

import { AmigoMediaTransport } from '../src/adapters/amigo/media-transport.js';

const mediaUrl = 'https://shop.amigo.ru/upload/iblock/abc/material.png';
const imageBody = Uint8Array.from(
  Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  ),
);

describe('AMIGO bounded media transport', () => {
  it('downloads an allowlisted pilot image with a bounded content type', async () => {
    const transport = new AmigoMediaTransport({
      fetchImplementation: async () =>
        new Response(imageBody, { headers: { 'content-type': 'image/png' }, status: 200 }),
      hostResolver: async () => ['93.184.216.34'],
      maximumMediaBytes: 1024,
      minimumDelayMs: 0,
    });

    await expect(transport.fetchMedia(mediaUrl)).resolves.toMatchObject({
      contentType: 'image/png',
      httpStatus: 200,
      originalFilename: 'material.png',
      sourceUrl: mediaUrl,
    });
  });

  it('rejects unsupported MIME, excessive size, and cross-origin redirects', async () => {
    const unsupported = new AmigoMediaTransport({
      fetchImplementation: async () =>
        new Response(imageBody, { headers: { 'content-type': 'image/svg+xml' }, status: 200 }),
      hostResolver: async () => ['93.184.216.34'],
      maximumAttempts: 1,
      maximumMediaBytes: 1024,
      minimumDelayMs: 0,
    });
    await expect(unsupported.fetchMedia(mediaUrl)).rejects.toMatchObject({
      code: 'SOURCE_CONTENT_INVALID',
    });

    const excessive = new AmigoMediaTransport({
      fetchImplementation: async () =>
        new Response(imageBody, {
          headers: { 'content-length': '2048', 'content-type': 'image/png' },
          status: 200,
        }),
      hostResolver: async () => ['93.184.216.34'],
      maximumAttempts: 1,
      maximumMediaBytes: 1024,
      minimumDelayMs: 0,
    });
    await expect(excessive.fetchMedia(mediaUrl)).rejects.toMatchObject({
      code: 'SOURCE_CONTENT_TOO_LARGE',
    });

    const redirected = new AmigoMediaTransport({
      fetchImplementation: async () =>
        new Response(null, { headers: { location: 'https://example.com/image.png' }, status: 302 }),
      hostResolver: async () => ['93.184.216.34'],
      maximumAttempts: 1,
      maximumMediaBytes: 1024,
      minimumDelayMs: 0,
    });
    await expect(redirected.fetchMedia(mediaUrl)).rejects.toMatchObject({
      code: 'SOURCE_URL_REJECTED',
    });
  });
});
