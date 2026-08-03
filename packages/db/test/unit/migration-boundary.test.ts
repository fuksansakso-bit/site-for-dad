import { readFile, readdir } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const migrationsRoot = new URL('../../prisma/migrations/', import.meta.url);
const forbiddenLaterPhaseEntity =
  /\b(?:customer[_ ]?photos?|orders?|quotes?|visualizations?|carts?|configurators?)\b/i;

describe('Phase 1B.2 migration boundary', () => {
  it('contains only reviewed Foundation and catalog tables through Phase 1B.2', async () => {
    const migrationDirectories = (await readdir(migrationsRoot, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    expect(migrationDirectories).toEqual([
      '20260802160000_foundation_identity_audit',
      '20260802161000_foundation_delivery_health',
      '20260802162000_workload_audit_context',
      '20260802233000_catalog_source_model',
      '20260803001000_amigo_pilot_source_registry',
      '20260803133000_phase_1b2_resumable_catalog_import',
      '20260803170000_phase_1b2_full_catalog_media',
      '20260803190000_phase_1b2_full_catalog_prices',
    ]);

    const tables = new Set<string>();
    for (const directory of migrationDirectories) {
      const sql = await readFile(new URL(`${directory}/migration.sql`, migrationsRoot), 'utf8');
      expect(sql).toMatch(/PLAN-(?:1A|1B1|1B2) migration risk: (?:LOW|MEDIUM)/);
      expect(sql).toMatch(/\bBEGIN;/);
      expect(sql).toMatch(/\bCOMMIT;/);
      expect(sql).not.toMatch(/\b(?:DROP\s+TABLE|TRUNCATE)\b/i);
      expect(sql).not.toMatch(forbiddenLaterPhaseEntity);
      for (const match of sql.matchAll(/CREATE TABLE "([a-z_]+)"/g)) {
        tables.add(match[1] ?? '');
      }
    }

    expect([...tables].sort()).toEqual([
      'actor_identity',
      'audit_event',
      'availability_record',
      'business_catalog_entry',
      'catalog_import_manifest',
      'catalog_source',
      'catalog_sync_checkpoint',
      'catalog_sync_difference',
      'catalog_sync_item',
      'catalog_sync_run',
      'catalog_version',
      'catalog_version_entry',
      'color',
      'compatibility_rule',
      'dimension_constraint',
      'idempotency_record',
      'local_price_override',
      'material',
      'material_media_asset',
      'material_property',
      'material_variant',
      'media_asset',
      'outbox_event',
      'price_version',
      'price_version_record',
      'product_category',
      'product_family',
      'product_model',
      'product_system',
      'publication_record',
      'role_grant',
      'service_heartbeat',
      'source_entity',
      'source_media_asset',
      'source_price_record',
      'source_snapshot',
      'supplier',
      'supplier_relationship',
      'synthetic_session',
    ]);
  });

  it('separates source, normalized catalog, and business overlay models', async () => {
    const schema = await readFile(new URL('../../prisma/schema.prisma', import.meta.url), 'utf8');
    expect(schema).not.toMatch(forbiddenLaterPhaseEntity);
    expect(schema).toContain('model AuditEvent');
    expect(schema).toContain('model IdempotencyRecord');
    expect(schema).toContain('model SourceEntity');
    expect(schema).toContain('model MaterialVariant');
    expect(schema).toContain('model BusinessCatalogEntry');
    expect(schema).toContain('@@unique([catalogSourceId, sourceType, sourceId]');
    expect(schema).toMatch(/status\s+AvailabilityStatus/);
    expect(schema).toMatch(/amountMinor\s+Int\?/);
  });

  it('enforces source/local and immutable-version invariants in SQL', async () => {
    const sql = await readFile(
      new URL(
        '../../prisma/migrations/20260802233000_catalog_source_model/migration.sql',
        import.meta.url,
      ),
      'utf8',
    );
    expect(sql).toContain('business_catalog_entry_target_check');
    expect(sql).toContain('source_price_record_value_check');
    expect(sql).toContain('prevent_catalog_immutable_mutation');
    expect(sql).toContain('catalog_version_activation_check');

    const resumableSql = await readFile(
      new URL(
        '../../prisma/migrations/20260803133000_phase_1b2_resumable_catalog_import/migration.sql',
        import.meta.url,
      ),
      'utf8',
    );
    expect(resumableSql).toContain('source_snapshot_run_capture_key');
    expect(resumableSql).toContain('catalog_sync_checkpoint_counts_check');
    expect(resumableSql).toContain('catalog_import_manifest_append_only');

    const fullMediaSql = await readFile(
      new URL(
        '../../prisma/migrations/20260803170000_phase_1b2_full_catalog_media/migration.sql',
        import.meta.url,
      ),
      'utf8',
    );
    expect(fullMediaSql).toContain('source_media_asset_exact_target_check');
    expect(fullMediaSql).toContain('category_id');
    expect(fullMediaSql).toContain('system_id');
    expect(fullMediaSql).toContain('model_id');

    const fullPriceSql = await readFile(
      new URL(
        '../../prisma/migrations/20260803190000_phase_1b2_full_catalog_prices/migration.sql',
        import.meta.url,
      ),
      'utf8',
    );
    expect(fullPriceSql).toContain('source_price_record_exact_target_check');
    expect(fullPriceSql).toContain('source_version');
    expect(fullPriceSql).toContain('model_id');
    expect(fullPriceSql).toContain('source_price_record_append_only');
  });
});
