import { describe, expect, it } from 'vitest';

import {
  CatalogSourceError,
  FixtureCatalogSourceAdapter,
  type CatalogSourceAdapter,
} from '../src/index.js';
import { createFixtureDataset } from './support/fixture-dataset.js';

async function exerciseAdapterContract(adapter: CatalogSourceAdapter): Promise<void> {
  const categories = await adapter.discoverCategories();
  expect(categories).toHaveLength(1);
  expect((await adapter.fetchCategory('category-1')).data.identity.sourceId).toBe('category-1');
  expect((await adapter.fetchProduct('system-1')).data.identity.sourceId).toBe('system-1');
  expect((await adapter.fetchMaterial('material-1')).data.identity.sourceId).toBe('material-1');
  expect((await adapter.fetchPrice('material-1')).data.amountMinor).toBe(150_000);
  expect((await adapter.fetchMediaManifest('material-1')).data.media).toHaveLength(1);
  expect((await adapter.getSourceVersion()).version).toBe('fixture-v1');
  expect((await adapter.healthCheck()).status).toBe('healthy');
}

describe('FixtureCatalogSourceAdapter contract', () => {
  it('implements every provider-neutral source operation', async () => {
    await exerciseAdapterContract(new FixtureCatalogSourceAdapter(createFixtureDataset()));
  });

  it('returns defensive copies and safe not-found errors', async () => {
    const adapter = new FixtureCatalogSourceAdapter(createFixtureDataset());
    const first = await adapter.discoverCategories();
    const second = await adapter.discoverCategories();
    expect(first).not.toBe(second);
    await expect(adapter.fetchMaterial('missing')).rejects.toMatchObject({
      code: 'SOURCE_ID_NOT_FOUND',
      retryable: false,
    });
  });

  it('rejects duplicate fixture source identities', () => {
    const dataset = createFixtureDataset();
    expect(
      () =>
        new FixtureCatalogSourceAdapter({
          ...dataset,
          categories: [dataset.categories[0]!, dataset.categories[0]!],
        }),
    ).toThrowError(CatalogSourceError);
  });
});
