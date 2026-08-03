import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';

import {
  parseDatabaseEnvironment,
  parseStorageEnvironment,
} from '../../packages/config/dist/server.js';
import { createPrismaClient } from '../../packages/db/dist/client.js';
import { createS3ObjectStorage } from '../../packages/storage/dist/index.js';

const ids = {
  actorAdmin: '00000000-0000-4000-8000-00000000b002',
  actorOwner: '00000000-0000-4000-8000-00000000b001',
  assetAurora: '00000000-0000-4000-8000-00000000b201',
  assetLinen: '00000000-0000-4000-8000-00000000b204',
  assetNocturne: '00000000-0000-4000-8000-00000000b202',
  assetZebra: '00000000-0000-4000-8000-00000000b203',
  catalogVersion: '00000000-0000-4000-8000-00000000b004',
  categoryBlackout: '00000000-0000-4000-8000-00000000b011',
  categoryRoller: '00000000-0000-4000-8000-00000000b010',
  categoryZebra: '00000000-0000-4000-8000-00000000b012',
  materialAurora: '00000000-0000-4000-8000-00000000b301',
  materialLinen: '00000000-0000-4000-8000-00000000b304',
  materialNocturne: '00000000-0000-4000-8000-00000000b302',
  materialZebra: '00000000-0000-4000-8000-00000000b303',
  priceVersion: '00000000-0000-4000-8000-00000000b005',
  run: '00000000-0000-4000-8000-00000000b003',
  systemRoller: '00000000-0000-4000-8000-00000000b020',
  systemZebra: '00000000-0000-4000-8000-00000000b021',
  variantAurora: '00000000-0000-4000-8000-00000000b101',
  variantLinen: '00000000-0000-4000-8000-00000000b104',
  variantNocturne: '00000000-0000-4000-8000-00000000b102',
  variantZebra: '00000000-0000-4000-8000-00000000b103',
};

const catalogSourceId = '00000000-0000-4000-8000-000000000103';
const activatedAt = new Date('2026-08-03T18:00:00.000Z');

function crc32(value) {
  let crc = 0xffffffff;
  for (const byte of value) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
  return Buffer.concat([length, typeBytes, data, checksum]);
}

function makePatternPng(width, height, first, second) {
  const stride = width * 4 + 1;
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    const row = y * stride;
    pixels[row] = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = row + 1 + x * 4;
      const blend = (x + y) / (width + height - 2);
      pixels[offset] = Math.round(first[0] * (1 - blend) + second[0] * blend);
      pixels[offset + 1] = Math.round(first[1] * (1 - blend) + second[1] * blend);
      pixels[offset + 2] = Math.round(first[2] * (1 - blend) + second[2] * blend);
      pixels[offset + 3] = 255;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a', 'hex'),
    pngChunk('IHDR', header),
    pngChunk('IDAT', deflateSync(pixels, { level: 9 })),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function publishedOverlay(availability, localOrder, localDescription = null) {
  return {
    availability: { status: availability },
    localDescription,
    localOrder,
    localPriceOverride: null,
    manualReviewState: 'APPROVED',
    publication: { status: 'PUBLISHED' },
    visibility: 'VISIBLE',
  };
}

function category(id, name, slug, sortOrder, parentId = null) {
  return {
    entity: { id, name, parentId, slug, sortOrder },
    entityType: 'CATEGORY',
    overlay: publishedOverlay('INQUIRY_ONLY', sortOrder),
  };
}

function system(id, categoryId, name, slug, sortOrder) {
  return {
    entity: { categoryId, id, name, slug, sortOrder },
    entityType: 'SYSTEM',
    overlay: publishedOverlay('INQUIRY_ONLY', sortOrder),
  };
}

function material(input) {
  return {
    entity: {
      article: input.article,
      color: input.color,
      id: input.id,
      isBlackout: input.isBlackout,
      isZebra: input.isZebra,
      material: {
        categoryId: input.categoryId,
        id: input.materialId,
        name: input.materialName,
        slug: input.materialSlug,
      },
      name: input.name,
      primarySystemId: input.systemId,
      slug: input.slug,
      widthMm: input.widthMm,
    },
    entityType: 'MATERIAL_VARIANT',
    overlay: publishedOverlay(input.availability, input.order, input.description),
    primaryMedia: {
      byteSize: input.media.byteSize,
      fileHash: input.media.checksum,
      height: input.media.height,
      id: input.media.id,
      mimeType: 'image/png',
      objectKey: input.media.objectKey,
      publicationStatus: 'PUBLICATION_APPROVED',
      rightsStatus: 'PARTNER_LICENSE',
      storageZone: 'private',
      width: input.media.width,
    },
    sourcePrice: {
      amountMinor: input.amountMinor,
      currency: 'RUB',
      kind: 'FROM',
      status: input.amountMinor === null ? 'PRICE_ON_REQUEST' : 'AVAILABLE',
    },
  };
}

const imageFixtures = [
  {
    body: makePatternPng(320, 240, [237, 227, 202], [186, 145, 94]),
    id: ids.assetAurora,
    objectKey: 'catalog/browser/aurora-ivory.png',
  },
  {
    body: makePatternPng(320, 240, [63, 67, 75], [13, 16, 20]),
    id: ids.assetNocturne,
    objectKey: 'catalog/browser/nocturne-graphite.png',
  },
  {
    body: makePatternPng(320, 240, [215, 193, 151], [146, 104, 69]),
    id: ids.assetZebra,
    objectKey: 'catalog/browser/zebra-sand.png',
  },
  {
    body: makePatternPng(320, 240, [186, 210, 214], [77, 119, 132]),
    id: ids.assetLinen,
    objectKey: 'catalog/browser/linen-sky.png',
  },
].map((fixture) => ({
  ...fixture,
  byteSize: fixture.body.byteLength,
  checksum: createHash('sha256').update(fixture.body).digest('hex'),
  height: 240,
  width: 320,
}));

const mediaById = new Map(imageFixtures.map((fixture) => [fixture.id, fixture]));
const requiredMedia = (id) => {
  const fixture = mediaById.get(id);
  if (fixture === undefined) throw new Error('CATALOG_BROWSER_MEDIA_FIXTURE_MISSING');
  return fixture;
};

const composition = [
  category(ids.categoryRoller, 'Рулонные шторы', 'rulonnye-shtory', 1),
  category(ids.categoryBlackout, 'Blackout', 'blackout', 1, ids.categoryRoller),
  category(ids.categoryZebra, 'День–ночь', 'den-noch', 2, ids.categoryRoller),
  system(ids.systemRoller, ids.categoryRoller, 'Мини', 'mini', 1),
  system(ids.systemZebra, ids.categoryZebra, 'Зебра Мини', 'zebra-mini', 2),
  material({
    amountMinor: 125_000,
    article: 'TEST-101',
    availability: 'AVAILABLE',
    categoryId: ids.categoryRoller,
    color: { hex: '#EDE3CA', name: 'Слоновая кость', slug: 'slonovaya-kost' },
    description: 'Светлая фактура для мягкого рассеивания дневного света.',
    id: ids.variantAurora,
    isBlackout: false,
    isZebra: false,
    materialId: ids.materialAurora,
    materialName: 'Аврора',
    materialSlug: 'avrora',
    media: requiredMedia(ids.assetAurora),
    name: 'Аврора, слоновая кость',
    order: 1,
    slug: 'avrora-slonovaya-kost',
    systemId: ids.systemRoller,
    widthMm: '2000',
  }),
  material({
    amountMinor: 189_900,
    article: 'TEST-102',
    availability: 'OUT_OF_STOCK',
    categoryId: ids.categoryBlackout,
    color: { hex: '#3F434B', name: 'Графит', slug: 'grafit' },
    description: 'Плотный затемняющий материал с глубоким графитовым тоном.',
    id: ids.variantNocturne,
    isBlackout: true,
    isZebra: false,
    materialId: ids.materialNocturne,
    materialName: 'Ноктюрн',
    materialSlug: 'noktyurn',
    media: requiredMedia(ids.assetNocturne),
    name: 'Ноктюрн, графит',
    order: 2,
    slug: 'noktyurn-grafit',
    systemId: ids.systemRoller,
    widthMm: '2200',
  }),
  material({
    amountMinor: null,
    article: 'TEST-103',
    availability: 'INQUIRY_ONLY',
    categoryId: ids.categoryZebra,
    color: { hex: '#D7C197', name: 'Песочный', slug: 'pesochnyy' },
    description: 'Чередование прозрачных и плотных полос для управления светом.',
    id: ids.variantZebra,
    isBlackout: false,
    isZebra: true,
    materialId: ids.materialZebra,
    materialName: 'Баланс',
    materialSlug: 'balans',
    media: requiredMedia(ids.assetZebra),
    name: 'Баланс, песочный',
    order: 3,
    slug: 'balans-pesochnyy',
    systemId: ids.systemZebra,
    widthMm: null,
  }),
  material({
    amountMinor: 159_000,
    article: 'TEST-104',
    availability: 'AVAILABLE',
    categoryId: ids.categoryRoller,
    color: { hex: '#BAD2D6', name: 'Небесный', slug: 'nebesnyy' },
    description: 'Спокойная льняная фактура холодного небесного оттенка.',
    id: ids.variantLinen,
    isBlackout: false,
    isZebra: false,
    materialId: ids.materialLinen,
    materialName: 'Лён',
    materialSlug: 'len',
    media: requiredMedia(ids.assetLinen),
    name: 'Лён, небесный',
    order: 4,
    slug: 'len-nebesnyy',
    systemId: ids.systemRoller,
    widthMm: '1800',
  }),
];

const databaseEnvironment = parseDatabaseEnvironment(process.env);
const storageEnvironment = parseStorageEnvironment(process.env);
const prisma = createPrismaClient(databaseEnvironment);
const storage = createS3ObjectStorage(storageEnvironment);

try {
  for (const fixture of imageFixtures) {
    await storage.put({
      body: fixture.body,
      contentType: 'image/png',
      locator: { key: fixture.objectKey, zone: 'private' },
      source: 'AMIGO_AUTHORIZED_CATALOG',
    });
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.actorIdentity.createMany({
      data: [
        { id: ids.actorOwner, provider: 'synthetic', subject: 'catalog-browser-owner' },
        { id: ids.actorAdmin, provider: 'synthetic', subject: 'catalog-browser-admin' },
      ],
    });
    await transaction.catalogSyncRun.create({
      data: {
        attempt: 1,
        auditContext: { fixture: 'PLAN-1B2-VERIFY-001', synthetic: true },
        catalogSourceId,
        completedAt: activatedAt,
        correlationId: 'catalog-browser-acceptance',
        discoveredCount: composition.length,
        errorCount: 0,
        id: ids.run,
        idempotencyKey: 'catalog-browser-acceptance-v1',
        lastHeartbeatAt: activatedAt,
        mappingVersion: 'catalog-browser-fixture/1.0.0',
        parserVersion: 'catalog-browser-fixture/1.0.0',
        processedCount: composition.length,
        requestedByActorId: ids.actorOwner,
        sourceVersion: 'catalog-browser-fixture-v1',
        startedAt: activatedAt,
        status: 'COMPLETED',
        trigger: 'TEST',
      },
    });
    await transaction.catalogVersion.create({
      data: {
        activatedAt,
        activatedByActorId: ids.actorAdmin,
        activationKey: 'PUBLIC',
        approvedAt: activatedAt,
        approvedByActorId: ids.actorOwner,
        captureChecksum: 'a'.repeat(64),
        differenceChecksum: 'b'.repeat(64),
        id: ids.catalogVersion,
        publishedAt: activatedAt,
        safeNotes: 'Synthetic browser acceptance fixture',
        sourceManifest: { composition, fixture: 'PLAN-1B2-VERIFY-001' },
        sourceVersion: 'catalog-browser-fixture-v1',
        status: 'ACTIVE',
        syncRunId: ids.run,
        versionNumber: 7_001,
      },
    });
    await transaction.priceVersion.create({
      data: {
        activatedAt,
        activatedByActorId: ids.actorAdmin,
        activationKey: 'PUBLIC',
        approvedAt: activatedAt,
        approvedByActorId: ids.actorOwner,
        differenceChecksum: 'c'.repeat(64),
        id: ids.priceVersion,
        sourceManifest: { fixture: 'PLAN-1B2-VERIFY-001' },
        status: 'ACTIVE',
        syncRunId: ids.run,
        versionNumber: 7_001,
      },
    });
  });

  process.stdout.write(
    `${JSON.stringify({ catalogVersion: ids.catalogVersion, categories: 3, items: 4, media: 4, priceVersion: ids.priceVersion, status: 'seeded' })}\n`,
  );
} finally {
  await prisma.$disconnect();
}
