-- Phase 1B.1 local runtime grants. This file is applied explicitly after schema/queue migrations.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO foundation_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON
    actor_identity,
    role_grant,
    synthetic_session,
    outbox_event,
    idempotency_record,
    service_heartbeat
TO foundation_runtime;
GRANT SELECT, INSERT ON audit_event TO foundation_runtime;
GRANT SELECT, INSERT, UPDATE ON
    supplier,
    supplier_relationship,
    catalog_source,
    source_entity,
    catalog_sync_run,
    catalog_sync_item,
    catalog_sync_difference,
    catalog_version,
    product_family,
    product_category,
    product_system,
    product_model,
    material,
    color,
    material_variant,
    material_property,
    media_asset,
    source_media_asset,
    material_media_asset,
    compatibility_rule,
    dimension_constraint,
    price_version,
    business_catalog_entry,
    availability_record,
    local_price_override,
    publication_record
TO foundation_runtime;
GRANT SELECT, INSERT ON
    source_snapshot,
    source_price_record,
    price_version_record,
    catalog_version_entry
TO foundation_runtime;
