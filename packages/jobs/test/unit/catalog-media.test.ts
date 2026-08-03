import { describe, expect, it } from 'vitest';
import { sha256 } from '@project-name/catalog';

import { inspectCatalogImage } from '../../src/catalog/media.js';
import { createJobsCatalogFixture } from '../support/catalog-fixture.js';

describe('catalog media validation', () => {
  it('sniffs a bounded PNG and returns persisted dimensions', () => {
    const file = createJobsCatalogFixture().mediaFiles[0]!;
    expect(inspectCatalogImage(file, 1024)).toMatchObject({
      capturedAt: file.capturedAt,
      extension: 'png',
      height: 1,
      httpStatus: 200,
      mimeType: 'image/png',
      originalFilename: 'jobs-material-roller-1001.png',
      width: 1,
    });
  });

  it('rejects unsafe source metadata, MIME spoofing, oversized files, and bad checksums', () => {
    const file = createJobsCatalogFixture().mediaFiles[0]!;
    expect(() =>
      inspectCatalogImage({ ...file, originalFilename: '../material.png' }, 1024),
    ).toThrow();
    expect(() => inspectCatalogImage({ ...file, httpStatus: 404 }, 1024)).toThrow();
    expect(() => inspectCatalogImage({ ...file, contentType: 'image/jpeg' }, 1024)).toThrow();
    expect(() => inspectCatalogImage({ ...file, contentHash: '0'.repeat(64) }, 1024)).toThrow();
    expect(() => inspectCatalogImage(file, file.body.byteLength - 1)).toThrow();
  });

  it('rejects decompression-sized image dimensions', () => {
    const file = createJobsCatalogFixture().mediaFiles[0]!;
    const oversizedDimensions = Uint8Array.from(file.body);
    oversizedDimensions.set([0, 0, 46, 225, 0, 0, 46, 225], 16);
    expect(() =>
      inspectCatalogImage(
        {
          ...file,
          body: oversizedDimensions,
          contentHash: sha256(oversizedDimensions),
        },
        1024,
      ),
    ).toThrow();
  });
});
