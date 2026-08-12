import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  canonicalStringify,
  executeMediaPipeline,
  normalizeStorageObjectKey,
  parseCategoryExclusionsDocument,
  parseCsv,
  parseMaterialsDocument,
} from './phase2a-media.js';

const temporaryDirectories: string[] = [];

async function temporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), 'phase2a-media-test-'));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map(async (directory) => {
      const resolved = path.resolve(directory);
      if (!path.basename(resolved).startsWith('phase2a-media-test-')) {
        throw new Error('refusing to remove an unexpected test directory');
      }
      await rm(resolved, { force: true, recursive: true });
    }),
  );
});

describe('Phase 2A catalog media contracts', () => {
  it('parses RFC 4180 quoted CSV fields', () => {
    expect(parseCsv('a,b\r\n"one,two","three""four"\r\n')).toEqual([
      ['a', 'b'],
      ['one,two', 'three"four'],
    ]);
  });

  it('accepts canonical array and compatibility wrapper material documents', () => {
    const material = {
      categoryLegacySourceId: 'category:1',
      legacySourceId: 'catalog:material:1',
      primaryMedia: null,
    };
    expect(parseMaterialsDocument([material])).toHaveLength(1);
    expect(parseMaterialsDocument({ materials: [material] })).toHaveLength(1);
  });

  it('rejects storage traversal and canonicalizes JSON keys', () => {
    expect(() => normalizeStorageObjectKey('../secret', 'objectKey')).toThrow(
      /safe storage object key/u,
    );
    expect(canonicalStringify({ z: 1, a: { y: 2, b: 3 } })).toBe('{"a":{"b":3,"y":2},"z":1}');
  });

  it('validates owner exclusion totals exactly', () => {
    const valid = {
      exclusions: [
        {
          categoryCount: 2,
          descendantCategoryLegacyIds: ['legacy-child'],
          distinctPrimaryMediaCount: 3,
          legacyId: 'legacy-root',
          materialCount: 4,
          name: 'Excluded',
          ownerLabel: 'Excluded',
          primaryMediaBytes: 5,
          sourceId: 'source-1',
          sourceSlug: 'excluded',
        },
      ],
      reason: 'OWNER_EXCLUDED_NOT_OFFERED',
      sourceCatalogVersionId: 'version-1',
      totals: {
        categoryCount: 2,
        distinctPrimaryMediaCount: 3,
        materialCount: 4,
        primaryMediaBytes: 5,
      },
    };
    expect(parseCategoryExclusionsDocument(valid, 1).totals.materialCount).toBe(4);
    expect(() =>
      parseCategoryExclusionsDocument(
        { ...valid, totals: { ...valid.totals, primaryMediaBytes: 6 } },
        1,
      ),
    ).toThrow(/totals do not equal/u);
  });
});

describe('Phase 2A local media pipeline', () => {
  it('optimizes once, is idempotent on repeat, and verifies every output', async () => {
    const repoRoot = process.cwd();
    const root = await temporaryDirectory();
    const transformDirectory = path.join(root, 'transform');
    const sourceDirectory = path.join(root, 'source');
    const legacyRoot = path.join(root, 'legacy');
    const workDirectory = path.join(root, 'work');
    const objectKey = 'catalog/test/source.png';
    await Promise.all([
      mkdir(transformDirectory, { recursive: true }),
      mkdir(sourceDirectory, { recursive: true }),
      mkdir(path.dirname(path.join(legacyRoot, ...objectKey.split('/'))), { recursive: true }),
    ]);

    const sourceBytes = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAUCAYAAAC07qxWAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAG0lEQVR4nGOoCND4TwxmGFVYMRo8AaOJQuM/APOGgsg58YfBAAAAAElFTkSuQmCC',
      'base64',
    );
    const sourceHash = createHash('sha256').update(sourceBytes).digest('hex');
    await writeFile(path.join(legacyRoot, ...objectKey.split('/')), sourceBytes);

    const materials = [
      {
        categoryLegacySourceId: 'kept-category',
        legacyId: 'legacy-material-id',
        legacySourceId: 'catalog:material-1',
        primaryMedia: {
          byteSize: sourceBytes.byteLength,
          fileHash: sourceHash,
          height: 20,
          mimeType: 'image/png',
          objectKey,
          publicationStatus: 'PUBLICATION_APPROVED',
          rightsStatus: 'PARTNER_LICENSE',
          sourceId: 'source-material-1',
          sourceUrl: 'https://example.test/material-1',
          width: 10,
        },
      },
    ];
    const exclusions = {
      exclusions: [
        {
          categoryCount: 1,
          descendantCategoryLegacyIds: [],
          distinctPrimaryMediaCount: 1,
          legacyId: 'excluded-category',
          materialCount: 2,
          name: 'Excluded',
          ownerLabel: 'Excluded',
          primaryMediaBytes: 123,
          sourceId: 'excluded-source',
          sourceSlug: 'excluded',
        },
      ],
      reason: 'OWNER_EXCLUDED_NOT_OFFERED',
      sourceCatalogVersionId: 'catalog-version-1',
      totals: {
        categoryCount: 1,
        distinctPrimaryMediaCount: 1,
        materialCount: 2,
        primaryMediaBytes: 123,
      },
    };
    const materialsPath = path.join(transformDirectory, 'materials.json');
    const exclusionsPath = path.join(transformDirectory, 'category-exclusions.json');
    const sourceManifestPath = path.join(sourceDirectory, 'media-manifest.csv');
    await Promise.all([
      writeFile(materialsPath, `${JSON.stringify(materials)}\n`, 'utf8'),
      writeFile(exclusionsPath, `${JSON.stringify(exclusions)}\n`, 'utf8'),
      writeFile(
        sourceManifestPath,
        [
          'object_key,file_hash,byte_size,mime_type,width,height,rights_status,publication_status,active_primary',
          `${objectKey},${sourceHash},${sourceBytes.byteLength},image/png,10,20,PARTNER_LICENSE,PUBLICATION_APPROVED,t`,
          '',
        ].join('\n'),
        'utf8',
      ),
    ]);

    const commonArguments = [
      '--root',
      repoRoot,
      '--materials',
      materialsPath,
      '--source-manifest',
      sourceManifestPath,
      '--exclusions',
      exclusionsPath,
      '--legacy-root',
      legacyRoot,
      '--work-dir',
      workDirectory,
      '--expected-exclusions',
      '1',
      '--concurrency',
      '2',
    ];
    const first = await executeMediaPipeline(['optimize', ...commonArguments]);
    expect(first).toMatchObject({
      createdObjectCount: 1,
      manifestChanged: true,
      mode: 'optimize',
      objectCount: 1,
      ok: true,
      reusedObjectCount: 0,
    });

    const uploadManifestPath = path.join(workDirectory, 'catalog-upload-manifest.json');
    const firstManifestStat = await stat(uploadManifestPath);
    const firstManifest = JSON.parse(await readFile(uploadManifestPath, 'utf8')) as {
      objects: Array<{ localRelativePath: string; sha256: string; storagePath: string }>;
    };
    expect(firstManifest.objects[0]?.storagePath).toMatch(
      /^materials\/[a-f0-9]{2}\/[a-f0-9]{64}\.webp$/u,
    );
    const localObjectPath = path.join(
      workDirectory,
      ...(firstManifest.objects[0]?.localRelativePath.split('/') ?? []),
    );
    expect(
      createHash('sha256')
        .update(await readFile(localObjectPath))
        .digest('hex'),
    ).toBe(firstManifest.objects[0]?.sha256);

    const second = await executeMediaPipeline(['optimize', ...commonArguments]);
    const secondManifestStat = await stat(uploadManifestPath);
    expect(second).toMatchObject({
      createdObjectCount: 0,
      deferredManifestChanged: false,
      manifestChanged: false,
      reusedObjectCount: 1,
    });
    expect(secondManifestStat.mtimeMs).toBe(firstManifestStat.mtimeMs);

    await expect(executeMediaPipeline(['verify', ...commonArguments])).resolves.toMatchObject({
      mode: 'verify',
      objectCount: 1,
      ok: true,
      remoteVerified: false,
      repeatNoOp: true,
    });
  });
});
