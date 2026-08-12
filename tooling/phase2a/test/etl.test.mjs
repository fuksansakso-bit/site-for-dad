import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MINIMUM_PRICE_KOPECKS,
  OWNER_CATEGORY_EXCLUSIONS,
  OWNER_EXCLUSION_REASON,
} from '../constants.mjs';
import { assertUnique, canonicalJson, sha256 } from '../io.mjs';
import { buildCategoryExclusions } from '../legacy-export.mjs';
import {
  explicitAreaRate,
  mapAvailability,
  transformMaterial,
  transformOrder,
} from '../transform.mjs';

test('canonical JSON and checksum are independent of object key insertion order', () => {
  const left = { beta: 2, alpha: { zeta: 3, eta: 1 } };
  const right = { alpha: { eta: 1, zeta: 3 }, beta: 2 };
  assert.equal(canonicalJson(left), canonicalJson(right));
  assert.equal(sha256(left), sha256(right));
  assert.match(
    canonicalJson({ when: new Date('2026-08-12T00:00:00Z') }),
    /2026-08-12T00:00:00\.000Z/u,
  );
});

test('duplicate stable identities stop transformation', () => {
  assert.throws(
    () =>
      assertUnique(
        [{ legacySourceId: 'source:one' }, { legacySourceId: 'source:one' }],
        'legacySourceId',
        'materials',
      ),
    /duplicate legacySourceId/u,
  );
});

test('owner exclusions resolve by stable source identity and include descendants', () => {
  const categories = OWNER_CATEGORY_EXCLUSIONS.map((entry, index) => ({
    legacyId: `root-${index}`,
    name: entry.name,
    parentLegacyId: null,
    sourceId: entry.sourceId,
    sourceSlug: entry.sourceSlug,
  }));
  categories.push({
    legacyId: 'child-0',
    name: 'child',
    parentLegacyId: 'root-0',
    sourceId: 'child-source',
    sourceSlug: 'child-slug',
  });
  const materials = categories.map((category, index) => ({
    categoryLegacyId: category.legacyId,
    legacyId: `material-${index}`,
    primaryMedia: {
      byteSize: 100 + index,
      fileHash: `hash-${index}`,
    },
  }));
  const result = buildCategoryExclusions('catalog-v2', categories, materials);
  assert.equal(result.manifest.reason, OWNER_EXCLUSION_REASON);
  assert.equal(result.manifest.exclusions.length, 5);
  assert.equal(result.manifest.totals.categoryCount, 6);
  assert.equal(result.manifest.totals.materialCount, 6);
  assert.deepEqual(
    result.manifest.exclusions.map((entry) => entry.sourceId),
    [...OWNER_CATEGORY_EXCLUSIONS].map((entry) => entry.sourceId).sort(),
  );
});

test('card/base and legacy base prices are never reinterpreted as an area rate', () => {
  assert.equal(
    explicitAreaRate({
      basePriceMinor: 241_800,
      kind: 'AREA_MINIMUM',
      parityStatus: 'PASSED',
      ruleData: { minimumBillableAreaSquareMm: 1_000_000 },
      verificationStatus: 'VERIFIED',
    }),
    null,
  );
  const transformed = transformMaterial(
    {
      article: 'A-1',
      availability: 'AVAILABLE',
      collectionName: 'Collection',
      legacyId: 'variant-1',
      legacySourceId: 'source:variant-1',
      name: 'Material',
      primaryMedia: null,
      pricingRuleFact: {
        basePriceMinor: 241_800,
        kind: 'AREA_MINIMUM',
        parityStatus: 'PASSED',
        ruleData: { minimumBillableAreaSquareMm: 1_000_000 },
        verificationStatus: 'VERIFIED',
      },
      slug: 'material',
    },
    'source:category-1',
  );
  assert.equal(transformed.pricingMode, 'MANUAL');
  assert.equal(transformed.pricePerM2Kopecks, null);
  assert.equal(transformed.minimumPriceKopecks, null);
});

test('only an explicitly named verified square-metre rate becomes AREA pricing', () => {
  assert.equal(
    explicitAreaRate({
      kind: 'AREA_MINIMUM',
      parityStatus: 'PASSED',
      ruleData: { pricePerM2Kopecks: 123_400 },
      verificationStatus: 'VERIFIED',
    }),
    123_400,
  );
  assert.equal(mapAvailability('AVAILABLE'), 'AVAILABLE');
  assert.equal(mapAvailability('OUT_OF_STOCK'), 'OUT_OF_STOCK');
  assert.equal(mapAvailability('UNREVIEWED'), 'INQUIRY_ONLY');
});

test('mock orders are skipped and a valid immutable item keeps snapshots', () => {
  const material = {
    article: 'A-1',
    legacySourceId: 'source:variant-1',
    name: 'Material',
  };
  const baseOrder = {
    address: null,
    comment: null,
    createdAt: '2026-08-12T00:00:00Z',
    customerName: 'Real Customer',
    customerPhone: '+79991234567',
    installmentInterest: false,
    items: [
      {
        configurationSnapshot: { ids: { materialVariantId: 'variant-1' } },
        knownTotalKopecks: '300000',
        legacyId: 'item-1',
        pricingStatus: 'CALCULATED',
        sequence: 1,
        snapshot: {
          product: { heightMm: 1000, material: 'Snapshot Name', quantity: 2, widthMm: 800 },
          quantityTotalKopecks: 300000,
          unitPriceKopecks: 150000,
        },
      },
    ],
    knownTotalKopecks: '300000',
    legacyId: 'order-1',
    locality: 'Grozny',
    measurementRequested: true,
    pricingStatus: 'FULLY_PRICED',
    publicReferenceHash: 'a'.repeat(64),
    requestNumber: 'REQ-1',
    status: 'NEW',
    updatedAt: '2026-08-12T00:00:00Z',
  };
  const materialMap = new Map([['variant-1', material]]);
  assert.equal(
    transformOrder({ ...baseOrder, customerName: 'Synthetic Client' }, materialMap).reason,
    'TECHNICAL_MOCK_ORDER',
  );
  const transformed = transformOrder(baseOrder, materialMap);
  assert.equal(transformed.reason, null);
  assert.equal(transformed.row.items[0].nameSnapshot, 'Snapshot Name');
  assert.equal(transformed.row.items[0].materialLegacySourceId, material.legacySourceId);
  assert.equal(transformed.row.items[0].totalPriceKopecks, 300000);
});
