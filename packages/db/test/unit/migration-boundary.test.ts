import { readFile, readdir } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

const migrationsRoot = new URL('../../prisma/migrations/', import.meta.url);
const forbiddenLaterPhaseEntity =
  /\b(?:customer[_ ]?photos?|visualizations?|payment[_ ]?intents?|accounts?)\b/i;

describe('Phase 1E migration boundary', () => {
  it('contains only reviewed Foundation through cart/request-intake tables', async () => {
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
      '20260803200000_phase_1b2_catalog_review_activation',
      '20260803210000_phase_1b2_catalog_bulk_controls',
      '20260803223000_phase_1b2_family_identity_compatibility',
      '20260803224000_phase_1b2_product_model_upgrade_compatibility',
      '20260803225000_phase_1b2_nonunique_material_articles',
      '20260803226000_phase_1b2_ambiguous_price_parser',
      '20260803227000_phase_1b2_media_join_index',
      '20260808150000_phase_1c_configurator_pricing',
      '20260808190000_phase_1d_standard_preview',
      '20260809113000_phase_1e_cart_request_intake',
      '20260809114500_phase_1e_cart_money_bigint',
      '20260809121000_phase_1e_communication_idempotency',
    ]);

    const tables = new Set<string>();
    for (const directory of migrationDirectories) {
      const sql = await readFile(new URL(`${directory}/migration.sql`, migrationsRoot), 'utf8');
      if (directory === '20260808150000_phase_1c_configurator_pricing') {
        expect(sql).toContain('Phase 1C configurator/pricing append-only rule');
        expect(sql).toContain('Recovery uses forward compensation');
      } else if (directory === '20260808190000_phase_1d_standard_preview') {
        expect(sql).toContain('PLAN-1D migration risk: MEDIUM');
        expect(sql).toContain('Recovery uses forward compensation');
      } else if (directory === '20260809113000_phase_1e_cart_request_intake') {
        expect(sql).toContain('Phase 1E migration risk: MEDIUM');
        expect(sql).toContain('Forward compensation');
      } else if (directory === '20260809114500_phase_1e_cart_money_bigint') {
        expect(sql).toContain('Phase 1E migration risk: LOW');
        expect(sql).toContain('Forward compensation');
      } else if (directory === '20260809121000_phase_1e_communication_idempotency') {
        expect(sql).toContain('Phase 1E migration risk: LOW');
        expect(sql).toContain('Forward compensation');
      } else {
        expect(sql).toMatch(/PLAN-(?:1A|1B1|1B2) migration risk: (?:LOW|MEDIUM)/);
      }
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
      'cart_item',
      'cart_item_revision',
      'catalog_bulk_command',
      'catalog_difference_review_batch',
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
      'guest_cart',
      'guest_cart_session',
      'idempotency_record',
      'local_price_override',
      'material',
      'material_media_asset',
      'material_property',
      'material_variant',
      'media_asset',
      'order_inquiry',
      'outbox_event',
      'price_version',
      'price_version_record',
      'pricing_calculation',
      'pricing_parity_run',
      'pricing_rule',
      'pricing_version_decision',
      'product_category',
      'product_family',
      'product_model',
      'product_system',
      'publication_record',
      'quote_snapshot',
      'request_communication_event',
      'request_internal_note',
      'request_item_snapshot',
      'role_grant',
      'service_heartbeat',
      'source_entity',
      'source_media_asset',
      'source_price_record',
      'source_snapshot',
      'standard_preview_state',
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
    expect(schema).toContain('model PricingRule');
    expect(schema).toContain('model PricingCalculation');
    expect(schema).toContain('model QuoteSnapshot');
    expect(schema).toContain('model StandardPreviewState');
    expect(schema).toContain('model GuestCartSession');
    expect(schema).toContain('model CartItem');
    expect(schema).toContain('model OrderInquiry');
    expect(schema).toContain('model RequestItemSnapshot');
    expect(schema).toContain('@@unique([catalogSourceId, sourceType, sourceId]');
    expect(schema).toContain(
      '@@index([materialId, article], map: "material_variant_material_article_idx")',
    );
    expect(schema).not.toContain('@@unique([materialId, article]');
    expect(schema).toContain(
      '@@index([sourceEntityId], map: "source_media_asset_source_entity_idx")',
    );
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

    const reviewSql = await readFile(
      new URL(
        '../../prisma/migrations/20260803200000_phase_1b2_catalog_review_activation/migration.sql',
        import.meta.url,
      ),
      'utf8',
    );
    expect(reviewSql).toContain('catalog_difference_review_exact_target_check');
    expect(reviewSql).toContain('catalog_difference_review_idempotency_key');
    expect(reviewSql).toContain('catalog_difference_review_batch_append_only');

    const bulkSql = await readFile(
      new URL(
        '../../prisma/migrations/20260803210000_phase_1b2_catalog_bulk_controls/migration.sql',
        import.meta.url,
      ),
      'utf8',
    );
    expect(bulkSql).toContain('catalog_bulk_command_counts_check');
    expect(bulkSql).toContain('catalog_bulk_command_idempotency_key');
    expect(bulkSql).toContain('catalog_bulk_command_append_only');

    const pricingSql = await readFile(
      new URL(
        '../../prisma/migrations/20260808150000_phase_1c_configurator_pricing/migration.sql',
        import.meta.url,
      ),
      'utf8',
    );
    expect(pricingSql).toContain('pricing_rule_append_only');
    expect(pricingSql).toContain('pricing_calculation_append_only');
    expect(pricingSql).toContain('quote_snapshot_append_only');
    expect(pricingSql).toContain('pricing_version_decision_append_only');

    const previewSql = await readFile(
      new URL(
        '../../prisma/migrations/20260808190000_phase_1d_standard_preview/migration.sql',
        import.meta.url,
      ),
      'utf8',
    );
    expect(previewSql).toContain('standard_preview_state_owner_hash_check');
    expect(previewSql).toContain('standard_preview_state_scene_check');
    expect(previewSql).toContain('ON DELETE RESTRICT');

    const requestSql = await readFile(
      new URL(
        '../../prisma/migrations/20260809113000_phase_1e_cart_request_intake/migration.sql',
        import.meta.url,
      ),
      'utf8',
    );
    expect(requestSql).toContain('guest_cart_one_active_per_session_key');
    expect(requestSql).toContain('request_item_snapshot_immutable');
    expect(requestSql).toContain('order_inquiry_snapshot_immutable');
    expect(requestSql).toContain('order_inquiry_public_reference_hash_check');
    expect(requestSql).not.toMatch(/\b(?:DROP\s+TABLE|TRUNCATE)\b/i);
  });
});
