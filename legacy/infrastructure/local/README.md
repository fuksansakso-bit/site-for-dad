# Local development infrastructure

The executable Windows 11 lifecycle is `tooling/scripts/foundation-environment.ps1`; `runtime-grants.sql` applies least-privilege application grants after explicit Prisma and Graphile migrations. PostgreSQL and Graphile Worker remain unchanged by `OWNER-DECISION-011`.

`compose.storage.yml` runs digest-pinned VersityGW `v1.4.1` with a POSIX backend. S3 and Admin endpoints bind only to loopback. Object data, versioning state and IAM state use the Docker named volumes `${CATALOG_S3_VOLUME_PREFIX}_catalog_s3_data`, `${CATALOG_S3_VOLUME_PREFIX}_catalog_s3_versioning` and `${CATALOG_S3_VOLUME_PREFIX}_catalog_s3_iam`; a Windows bind mount is intentionally not supported. The service has a bounded healthcheck, graceful 30-second stop and `restart: always` so it recovers after Docker Desktop restarts.

Buckets are named by typed environment configuration and created idempotently by `pnpm --filter @project-name/storage storage:provision:local`, never in an HTTP request. All three trust zones are private; `PUBLIC_DELIVERY` means controlled signed delivery of an approved object, not anonymous listing/read/write. Root credentials must be process environment values. `.env.example` contains placeholders only, and local lifecycle credentials remain in the ignored `.local/foundation-environment/secrets.json`.

From PowerShell use `pnpm.cmd dev`, `pnpm.cmd dev:status`, `pnpm.cmd dev:stop` and `pnpm.cmd test:storage`. `dev:stop` preserves PostgreSQL data and named volumes; `dev:reset` deliberately removes only the validated project-local runtime and the three project-named storage volumes.

This is not a production deployment definition or provider selection. VersityGW is a disposable local/CI adapter behind the provider-neutral `StoragePort`; a production provider requires a separate future decision.
