import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const artifact = JSON.parse(
  await readFile('tooling/phase2a/generated/amigo-exact-price-version.json', 'utf8'),
);

test('generated AMIGO version is internally complete and has no local minimum', () => {
  assert.match(artifact.sourceVersion, /^amigo-[0-9a-f]{16}$/u);
  assert.equal(artifact.rows.length, artifact.rowCount);
  assert.equal(
    artifact.rows.filter((row) => row.mappingStatus === 'READY').length,
    artifact.readyCount,
  );
  for (const row of artifact.rows.filter((candidate) => candidate.mappingStatus === 'READY')) {
    assert.ok(row.fromPriceKopecks > 0);
    assert.ok(row.calculatorModelId > 0);
    assert.ok(row.calculatorMaterialId > 0);
    assert.notEqual(row.cardSourceId, String(row.calculatorMaterialId));
    assert.equal('minimumPriceKopecks' in row, false);
  }
});

test('Zebra parent group has live priceable descendants', () => {
  const zebra = artifact.rows.filter(
    (row) =>
      row.sourceCollectionPath === '/rulonnye-shtory-zebra/rulonnye-tkani-zebra/' &&
      row.mappingStatus === 'READY',
  );
  assert.ok(zebra.length >= 100);
});
