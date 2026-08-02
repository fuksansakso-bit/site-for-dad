-- Phase 1A local runtime grants. This file is applied explicitly after schema/queue migrations.
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
