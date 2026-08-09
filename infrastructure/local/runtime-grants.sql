-- Phase 1F local runtime grants. This file is applied explicitly after schema/queue migrations.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO foundation_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON
    actor_identity,
    role_grant,
    synthetic_session,
    outbox_event,
    idempotency_record,
    service_heartbeat,
    standard_preview_state
TO foundation_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON
    one_time_code_challenge,
    staff_session,
    email_delivery,
    auth_rate_limit
TO foundation_runtime;
GRANT SELECT, INSERT, UPDATE ON
    staff_invitation,
    customer_contact,
    portfolio_item,
    portfolio_media,
    site_settings_revision,
    site_settings_pointer
TO foundation_runtime;
GRANT SELECT, INSERT, UPDATE ON
    guest_cart_session,
    guest_cart,
    cart_item,
    order_inquiry
TO foundation_runtime;
GRANT SELECT, INSERT ON audit_event TO foundation_runtime;
GRANT SELECT, INSERT, UPDATE ON
    supplier,
    supplier_relationship,
    catalog_source,
    source_entity,
    catalog_sync_run,
    catalog_sync_item,
    catalog_sync_checkpoint,
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
    catalog_import_manifest,
    catalog_difference_review_batch,
    catalog_bulk_command,
    source_price_record,
    price_version_record,
    catalog_version_entry,
    pricing_rule,
    pricing_parity_run,
    pricing_calculation,
    quote_snapshot,
    pricing_version_decision,
    cart_item_revision,
    request_item_snapshot,
    request_communication_event,
    request_internal_note,
    customer_contact_request,
    customer_contact_note
TO foundation_runtime;
