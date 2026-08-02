# Deployment and release specification PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Draft 0B — vendor-neutral release contract; hosting/CI/CD/runtime not selected |
| Версия | 0.2.0 |
| Дата | 2026-08-02 |
| Architecture | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Quality gate | [SPEC_QUALITY_GATE.md](../../00-global/SPEC_QUALITY_GATE.md) |

## 1. Purpose and boundaries

This document defines environment isolation, build artifact, configuration/secrets, data/content migrations, deployment stages, verification, rollout/rollback, backups/recovery and release evidence. It creates no infrastructure configuration and names no platform.

## 2. Нормативные requirements

- **DEPLOY-SPEC-001 — MUST:** development/test/staging/production identities, data, storage, secrets, domains and provider credentials are isolated; production data/media never copied to lower environments.
- **DEPLOY-SPEC-002 — MUST:** one reviewed immutable build artifact is promoted across environments; environment-specific configuration is injected securely, not rebuilt from unreviewed code.
- **DEPLOY-SPEC-003 — MUST:** artifact is traceable to commit/review/dependencies/tests/spec/gate and includes integrity/provenance metadata appropriate to chosen CI.
- **DEPLOY-SPEC-004 — MUST:** secrets are absent from repository/build/client/log and use approved manager/rotation/revoke/access audit.
- **DEPLOY-SPEC-005 — MUST:** configuration is typed/validated/versioned; missing/invalid critical config fails readiness, not unsafe default.
- **DEPLOY-SPEC-006 — MUST:** database/event/API/object/content/schema changes support backward-compatible rolling deployment or planned downtime/compensation explicitly approved.
- **DEPLOY-SPEC-007 — MUST:** migration has preconditions, dry run where possible, backup/restore/rollback or forward compensation, post-validation and audit.
- **DEPLOY-SPEC-008 — MUST:** catalog/price/content/media/model activation is a separate governed data release from application deployment and can rollback independently.
- **DEPLOY-SPEC-009 — MUST:** release gates include security/privacy/accessibility/performance/functional/recovery/data/content and external provider readiness, not tests alone.
- **DEPLOY-SPEC-010 — MUST:** rollout is progressive/observable where platform permits and has automated/manual stop criteria plus one-command/equivalent rollback path.
- **DEPLOY-SPEC-011 — MUST:** rollback preserves data compatibility and does not restore old code against incompatible irreversible schema without compensation plan.
- **DEPLOY-SPEC-012 — MUST:** deployment never republishes revoked assets, deleted photos, stale catalog/price pointers or disabled roles; startup/restore validates ledgers/active versions.
- **DEPLOY-SPEC-013 — MUST:** workers/jobs/events support old/new versions during transition and do not double-process; queues drain/pause/retry explicitly.
- **DEPLOY-SPEC-014 — MUST:** external adapters/providers have environment-specific endpoints/credentials/test fixtures and production calls are impossible from normal test.
- **DEPLOY-SPEC-015 — MUST:** health/readiness, smoke and synthetic checks verify core and degraded paths before full traffic.
- **DEPLOY-SPEC-016 — MUST:** failed telemetry/alert/backup/audit readiness blocks production according to release risk policy.
- **DEPLOY-SPEC-017 — MUST:** release owner, approvers, change window, support/on-call, communication and rollback authority are recorded.
- **DEPLOY-SPEC-018 — MUST:** emergency/hotfix follows review/test/audit/rollback with expedited scope, never bypasses security/data/privacy permanently.
- **DEPLOY-SPEC-019 — MUST:** hosting/network/data residency/availability/cost/exit is selected by evaluation and ADR, not this spec.
- **DEPLOY-SPEC-020 — MUST:** Phase 1A authorization does not permit production deployment or Phase 1B; each requires a separate written transition/release decision.
- **DEPLOY-SPEC-021 — MUST:** production release evidence includes no-VPN checks in Grozny, Urus-Martan, Argun and Gudermes, mobile and home/office Wi-Fi, at least two network routes, mobile Chrome and desktop Chrome.

## 3. Environment model

| Environment | Data/providers | Purpose |
|---|---|---|
| Local/dev | Synthetic/rights-cleared fixture, mocks/sandboxes | Development after authorization |
| Test/CI | Deterministic fixtures/ephemeral services | Unit/contract/integration/security migration checks |
| Staging | Production-like synthetic/rights-cleared data, provider sandboxes | E2E/performance/accessibility/ops verification |
| Production | Approved real catalog/media/customer data/providers | Customer/staff service only |
| Recovery/restore isolated | Encrypted restore under restricted process | Drill/verification before controlled cutover |

Preview/branch environments, if chosen, cannot receive production secrets/data or call production AMIGO/AI/WhatsApp and require automatic cleanup/access controls.

## 4. Build and artifact lifecycle

Source commit/review → locked dependency resolution and license/vulnerability/secret/static checks → reproducible build → artifact integrity/provenance → tests → immutable artifact registry → environment promotion approvals → deploy. Framework-specific commands wait for implementation.

Artifact manifest includes source revision, build time/toolchain/dependency lock hash, schema/API/event compatibility range, required configuration keys without values, test evidence, vulnerability/license status and rollback-compatible predecessor.

## 5. Configuration and feature controls

Configuration classes: non-secret app/domain, secrets, environment endpoints, active data/model versions, feature/kill switches and operational budgets. Owners/types/default prohibition/effective interval/audit defined. Security/privacy/price/rights cannot be disabled by unreviewed feature flag. Flags have purpose/owner/expiry/removal and fallback.

Kill controls required conceptually for generative refinement, AI upload/base, source sync/activation, public asset/partner badge, price calculation/version and affected contact integrations while preserving safe core/manual paths.

## 6. Data and schema migration

Use expand/contract where possible: deploy readers tolerant of old/new, add/backfill with validation, switch writes/read pointer, monitor, later remove after support window. Event/API changes version schemas. Large backfill is resumable/bounded/observable and does not starve product. Migration never invents business values; unknown remains unknown/TBD/manual.

Irreversible/destructive changes need approved backup/restore or forward compensation, impact and dry-run counts/checksums. Historical quote/source/media/audit integrity is verified.

## 7. Data/content/model release

Application release and active catalog/price/content/media/render/model version are independently recorded. Staged candidate passes its module validation/approval and activates atomically by pointer. Rollback application does not silently change data version; compatibility matrix identifies allowed combinations.

AI model/provider rollout uses rights-cleared benchmark, evaluation, canary/shadow only under privacy approval, quality/cost/latency gates and kill switch. Source/parser rollout uses fixtures/dry run/diff. Media/content release validates rights/placement/accessibility/SEO/cache purge.

## 8. Release gate checklist

Before production:

- approved scope/spec/ADR and requirement/story/AC/test traceability;
- clean reviewed change and immutable artifact;
- unit/contract/integration/E2E/visual/a11y/security/performance/degradation tests;
- dependency/secret/license/vulnerability/config scans;
- migration/backfill dry run, counts/checksums and rollback/compensation;
- backup/restore drill evidence and deletion/revocation validation;
- real approved catalog/price/media/content readiness—not placeholders;
- privacy/legal/provider/consent/retention/delete readiness;
- regional device/network smoke without VPN per approved matrix;
- observability dashboards/alerts/runbooks/owners/support/change communication;
- rollback predecessor/artifact/data compatibility and kill switches.

Any waiver has owner, reason, risk, expiry and follow-up; P0 security/privacy/money/rights/data-loss issue cannot be waived casually.

## 9. Deployment sequence

1. Confirm change record/scope/owner/window/artifact/config/data compatibility.
2. Verify backups/rollback/alerts and freeze conflicting data activations if needed.
3. Deploy backward-compatible schema/config prerequisites.
4. Deploy limited instance/canary or equivalent, keep old capacity.
5. Run health and smoke: public catalog, config/quote safe behavior, cart/contact, auth/admin authorization, private media deletion, degraded dependencies.
6. Observe stop criteria and versions; expand traffic progressively.
7. Run post-deploy E2E/synthetic/data checks and unfreeze approved jobs/activations.
8. Record release evidence and monitor defined period; close/rollback.

## 10. Rollback and recovery

Rollback triggers: security/privacy exposure, wrong price/catalog/material/rights, data corruption/migration error, critical task/error budget, deletion/audit failure or provider incompatibility. Sequence: stop traffic/feature/effect, preserve evidence, switch to known-compatible artifact/data pointers, compensate migration/jobs/events, invalidate caches/grants, verify health/invariants and communicate.

Rollback does not delete failed evidence or revert customer quote/order history. If code rollback unsafe due schema, use forward fix/feature kill/restore as preplanned.

## 11. Failures and edge cases

- partial region/instance rollout and sticky sessions;
- old worker consumes new event or vice versa;
- migration lock/timeout/partial backfill;
- activation coincides with deployment;
- cache serves old revoked/price content;
- secret/config rotated mid-rollout;
- rollback artifact unavailable/corrupt;
- provider sandbox accidentally production;
- queue retries duplicate side effect;
- restore resurrects deleted/revoked records;
- observability green because telemetry missing;
- DNS/certificate/network/provider regional failure.

Each has precondition/stop/rollback/runbook/test and safe customer fallback.

## 12. Security, privacy, performance and audit

CI/deploy identities least privilege/short-lived where available, protected environments/separation, artifact integrity and audit. Deployment logs redact secrets/private values. Capacity/warmup/cache/worker drain and performance comparison are observed. Production access and break-glass, if adopted, require explicit ADR/process. Release evidence retention/access is policy-defined.

## 13. Acceptance and tests

Tests: artifact traceability/reproducibility, environment isolation/no prod data/secrets in test, config missing/invalid, migration old/new/rollback/compensation, event/API rolling compatibility, canary stop/rollback, cache/active pointers, job drain/idempotency, provider sandbox, backup restore/deletion ledger, regional smoke, security/access/audit and failed telemetry/readiness.

## 14. Dependencies, risks and open questions

Dependencies: architecture/data/API/sync/media/AI/storage/security/performance/observability/test strategy/evaluations/ADRs. `TBD-INFRA-002` regional matrix is resolved; open: hosting/CI/CD/runtime, environments/domains, other applicable `TBD-INFRA-*`, RPO/RTO, owners/change windows, release cadence and artifact/signing/flag platforms. Risks: environment leak, irreversible migration, incompatible rollback, unobserved canary, provider prod call from test and data/version coupling.

## 15. History

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Defined vendor-neutral environments, artifact/config/migration/data release, progressive rollout/rollback and release evidence. |
| 0.2.0 | 2026-08-02 | Phase 1A-only authorization and exact future regional production evidence matrix recorded; no production deployment authorized. |
