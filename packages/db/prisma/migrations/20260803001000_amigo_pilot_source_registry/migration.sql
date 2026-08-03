-- PLAN-1B1 migration risk: LOW; seed only the owner-authorized AMIGO pilot source registry.
-- Recovery: retain source-backed history and disable the catalog_source in a forward migration.
BEGIN;

INSERT INTO "supplier" ("id", "slug", "name", "created_at", "updated_at")
VALUES (
    '00000000-0000-4000-8000-000000000101',
    'amigo',
    'AMIGO',
    '2026-08-02T00:00:00+03:00',
    '2026-08-02T00:00:00+03:00'
);

INSERT INTO "supplier_relationship" (
    "id",
    "supplier_id",
    "version",
    "status",
    "partner_name",
    "permission_scope",
    "permission_confirmed_by_owner",
    "permission_recorded_at",
    "optional_evidence_reference",
    "brand_usage_notes",
    "effective_at",
    "created_at"
)
VALUES (
    '00000000-0000-4000-8000-000000000102',
    '00000000-0000-4000-8000-000000000101',
    1,
    'AUTHORIZED_PARTNER_SOURCE',
    'PROJECT_NAME',
    '{
      "catalog": true,
      "images": true,
      "prices": true,
      "technicalData": true,
      "phase": "1B.1",
      "pilotOnly": true,
      "fullImportRequiresPilotGate": true
    }'::jsonb,
    true,
    '2026-08-02T00:00:00+03:00',
    'OWNER-DECISION-010',
    'Partner data and media retain AMIGO provenance; no hotlink or authorship change.',
    '2026-08-02T00:00:00+03:00',
    '2026-08-02T00:00:00+03:00'
);

INSERT INTO "catalog_source" (
    "id",
    "supplier_id",
    "supplier_relationship_id",
    "source_type",
    "name",
    "base_url",
    "parser_version",
    "mapping_version",
    "maximum_concurrency",
    "minimum_delay_ms",
    "enabled",
    "created_at",
    "updated_at"
)
VALUES (
    '00000000-0000-4000-8000-000000000103',
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000102',
    'AUTHORIZED_PUBLIC_WEB',
    'AMIGO authorized public catalog pilot',
    'https://shop.amigo.ru',
    'amigo-public-html/1.0.0',
    'amigo-public-pilot-mapping/1.0.0',
    1,
    1200,
    true,
    '2026-08-02T00:00:00+03:00',
    '2026-08-02T00:00:00+03:00'
);

COMMIT;
