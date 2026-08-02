# PHASE 1A — FOUNDATION plan PROJECT_NAME

## 0. Control block

| Поле | Значение |
|---|---|
| Plan ID | `PLAN-1A-001` |
| Статус | **AUTHORIZED / IN PROGRESS — STEP 1A-12** |
| Проверяемый результат | На чистой машине локально и в CI воспроизводится secure modular foundation с web/BFF, PostgreSQL, object adapter, durable worker, auth boundary, tests and operations; бизнес-функции отсутствуют. |
| Scope source | [Implementation roadmap §1](../IMPLEMENTATION_ROADMAP.md#1-phase-1a--foundation) |
| Technology evaluation | [PHASE_1A_TECHNOLOGY_EVALUATION](../PHASE_1A_TECHNOLOGY_EVALUATION.md) |
| Required decisions | Accepted [ADR-0007](../../adr/ADR-0007-foundation-application-stack.md), [ADR-0008](../../adr/ADR-0008-postgresql-and-migration-safety.md), [ADR-0009](../../adr/ADR-0009-object-storage-and-background-jobs.md), [ADR-0010](../../adr/ADR-0010-identity-secrets-and-observability-boundary.md) |

Product Owner 2026-08-02 разрешил только Phase 1A Foundation. AMIGO Catalog Pilot, import, business features, user media, AI и production deployment остаются запрещены; Phase 1B не начинается автоматически.

## 1. Entry gate and stop conditions

Phase 1A MUST NOT start until all conditions are evidenced:

- [x] владелец отдельно письменно разрешил только Phase 1A после Phase 0C report (`QG-148`);
- [x] Phase 0C baseline commit `83ed7c29bfaccf5d6a0efdcaa72db8bb04660990` существует, исходное дерево было clean;
- [x] `MVP_SCOPE`, `IMPLEMENTATION_ROADMAP`, this plan and P0 triage current;
- [x] critical spec audit имеет zero `BLOCKED` and `CONTRADICTORY` results;
- [x] ADR-0007–0010 приняты (`QG-147`);
- [x] exact Node/package-manager/framework/database-tool versions, licenses and current advisories reverified in `tooling/DEPENDENCY_BASELINE.md`;
- [x] secret storage method and migration rollback policy remain known and assigned;
- [x] production AMIGO data, user media, customer PII and shared credentials не нужны Foundation;
- [x] exactly one execution step is marked `in_progress` in §15.

If any condition fails, work stops at documentation/research; no partial scaffold is justified.

## 2. Recommended stack

| Layer | Recommended baseline | Decision |
|---|---|---|
| Runtime/language | Node.js 24 Active LTS exact patch; strict TypeScript ESM | ADR-0007 |
| Workspace/task graph | pnpm workspace, one frozen lockfile; Turborepo task graph/cache | ADR-0007 |
| Web and API | Next.js 16 App Router; Route Handlers as versioned same-origin BFF | ADR-0007 |
| Primary data | PostgreSQL supported release; Prisma ORM/Migrate after compatibility spike | ADR-0008 |
| Background work | Separate Node worker using Graphile Worker/PostgreSQL | ADR-0009 |
| Objects | S3-compatible port and disposable local emulator; no production bucket | ADR-0006/0009 |
| Identity | Better Auth compatibility spike; synthetic DB sessions and RBAC only | ADR-0010 |
| Observability | Structured JSON logs, correlation IDs, OpenTelemetry/OTLP | ADR-0010 |
| Test baseline | Vitest, real dependency contract tests, Playwright browser/E2E | ADR-0007 + TEST_STRATEGY |

Exact versions are implementation inputs, not frozen in Phase 0C. The first permitted commit MUST pin them and record the verification date.

## 3. Planned repository structure

```text
apps/
  web/            public, account, admin surfaces and BFF adapters
  worker/         durable task execution only
packages/
  domain/         entities, value objects, policies, state machines; no framework/I/O
  application/    use cases, ports, commands/queries, transaction boundaries
  contracts/      runtime input/output/event schemas and versioned DTOs
  db/             PostgreSQL adapter, schema mapping and migration tooling
  storage/        object-storage port and S3-compatible adapter
  jobs/           task names, payload schemas, enqueue/handler contracts
  auth/           identity/session adapter and capability checks
  config/         environment schemas and typed server/public access
  observability/  logging, tracing, metrics, redaction and correlation
  ui/             accessible presentation primitives without business rules
  testing/        synthetic factories, dependency harnesses and shared assertions
  tooling/        lint, TypeScript and test configuration
docs/             canonical specifications, ADR, plans and evidence
```

- **PLAN-1A-STRUCT-001 — MUST:** dependencies point `apps/adapters → application → domain`; `domain` imports no framework, database, storage, auth or telemetry implementation.
- **PLAN-1A-STRUCT-002 — MUST:** `contracts` carries external DTO/event compatibility, while domain models are not exposed directly.
- **PLAN-1A-STRUCT-003 — MUST:** only `db`, `storage`, `jobs`, `auth` and observability adapters perform external I/O; use cases depend on ports.
- **PLAN-1A-STRUCT-004 — MUST:** admin/public/account presentation may share UI primitives, never privilege checks or data-fetch shortcuts.
- **PLAN-1A-STRUCT-005 — MUST:** dependency graph and forbidden imports are machine-tested in CI.

## 4. Responsibility boundaries

| Boundary | Owns | MUST NOT own |
|---|---|---|
| `apps/web` | HTTP, SSR, route composition, cookies, DTO mapping, UI | Price/catalog truth, durable jobs, direct object policy |
| `apps/worker` | Claim/retry/execute task, heartbeat, shutdown | User-facing authorization decisions or unversioned payloads |
| `domain` | Money/dimension types, invariants, state transitions | Network, ORM, environment variables, logs |
| `application` | Use-case orchestration, ports, transaction/idempotency intent | Vendor SDK details or page rendering |
| `contracts` | Input validation and response/event versions | Persistence representation |
| adapters | Translate approved ports to dependencies | Mutate domain meaning or silently fall back |

## 5. Environment and secrets management

1. Define distinct `local`, `test`, `CI`, `staging` and `production` profiles; Phase 1A provisions only local/test/CI.
2. Maintain an `.env.example` with variable names, class (`public/server/secret`), purpose, required environments and safe placeholder syntax—never values.
3. Local secrets live in ignored `.env.local` or OS secret storage. Tests generate disposable synthetic values. CI uses its managed encrypted secret store.
4. A single typed schema validates values at process start, rejects unknown public exposure and exits non-zero on missing/invalid requirements.
5. `PUBLIC_*` variables use an explicit allowlist. Database URLs, object keys, session keys, telemetry headers and AMIGO credentials remain server-only.
6. Build cache keys and artifacts exclude secret values. Logs/errors show variable names only, not values or connection strings.
7. Secret scanning runs on committed content and generated artifacts; rotation/revocation rehearsal occurs before any shared credential.
8. Production store/provider selection remains a deployment ADR update after `TBD-INFRA-004`; the known method is managed runtime injection, never committed environment files.

Acceptance: missing/invalid/publicly misclassified values fail safely; a seeded canary secret never appears in client bundle, log, test report or cache artifact.

## 6. Local development contract

- One documented bootstrap command group installs the pinned toolchain and starts web, worker, PostgreSQL and object emulator after explicit permission.
- Windows 11 with PowerShell is a first-class supported local environment; Bash/WSL is not a mandatory prerequisite.
- Dependencies are disposable and isolated by project-specific names/ports; no global/shared production database.
- Schema creation uses committed migrations, not auto-sync; synthetic seed is deterministic, rights-free and contains no AMIGO/customer data.
- Web/worker support graceful shutdown and dependency-ready health; worker concurrency defaults low.
- Local HTTPS/cookie constraints are documented and production-secure settings cannot be weakened silently.
- A full cleanup path targets only project-owned disposable resources and is verified before use.

Acceptance: a second developer can follow README/runbook from clean supported machine, run checks, stop and restart without manual database repair.

## 7. CI baseline

Required provider-neutral stages, fail-closed and reproducible:

1. toolchain/version and lockfile verification;
2. frozen clean dependency install with lifecycle-script policy;
3. formatting and documentation/link/ID checks;
4. lint, strict typecheck and architecture-boundary checks;
5. unit/property tests with coverage report;
6. PostgreSQL/object/job/auth contract and integration tests in isolated services;
7. migration replay, previous-to-current upgrade, drift and recovery/compensation rehearsal;
8. production build and client-bundle secret scan;
9. Playwright smoke across Chromium, Firefox and WebKit plus narrow viewport/reduced motion;
10. dependency/license/advisory and committed-secret scanning;
11. artifact manifest with tool versions, commit and test evidence.

No deployment, AMIGO import or external messaging occurs in Phase 1A CI. Flaky retries do not convert failure into pass without tracking.

## 8. Database strategy

- `DATA_MODEL` remains the semantic source; a Phase 1A schema covers only shared primitives, identity foundation, audit/job infrastructure and migration mechanics necessary for tests.
- IDs are stable UUIDs; timestamps are UTC instants; money/dimensions use integer representations; uniqueness/foreign keys/checks enforce invariants where known.
- Each migration is generated create-only or written explicitly, reviewed as SQL, classified by lock/data risk and committed with test evidence.
- Shared environments use migrate-deploy semantics only. Applied migrations are immutable.
- Expand/contract rollout preserves N/N-1 application compatibility. Data backfills are resumable/idempotent jobs with reconciliation, never hidden inside a long blocking schema change.
- Before shared/production use: preflight, backup/PITR, restore proof and owner. Failed migration uses tool recovery; successful breaking change uses forward compensation or restore runbook.

Phase 1A proof: empty replay, upgrade from previous synthetic snapshot, interrupted job/retry, application rollback against expanded schema and documented compensation all pass.

## 9. Storage strategy

- Implement only the object port, trust-zone naming, checksums, metadata and local S3-compatible adapter from ADR-0006/0009.
- Local fixtures are tiny generated text/test images with explicit synthetic rights; no AMIGO or customer media.
- Public reads are possible only for objects marked public; private/quarantine access requires server-issued short-lived scoped grants. Listing and cross-zone access are denied.
- Upload limits, MIME/magic-byte validation, checksum, immutable key and deletion tombstone behavior are contract-tested.
- Backup/restore and provider-region claims remain unactivated until production provider evaluation.

## 10. Background job strategy

- `apps/worker` is a distinct process with graceful drain, concurrency cap and dependency readiness.
- Task names and payload schemas are versioned; payloads contain IDs/minimal metadata, never object bytes, secrets or unnecessary PII.
- Enqueue and related domain change use a transactional/outbox-safe boundary where consistency demands it.
- Delivery is at least once; every handler proves idempotency, bounded retries/backoff, timeout, terminal failure/dead-letter review and replay safety.
- Metrics cover queued/running/succeeded/retried/failed age and duration without payload leakage.

Foundation tasks are synthetic health/idempotency tasks only. AMIGO sync, media processing and AI tasks wait for their phases.

## 11. Auth boundary

- Define anonymous, synthetic customer and synthetic admin principals plus capability-based server checks; no public signup in 1A.
- Central DAL/use-case authorization checks object ownership and capability on every sensitive read/write. UI/proxy redirects are convenience only.
- Shortlisted Better Auth integration must prove database session creation, expiry, revocation, cookie security, CSRF/origin defense and rate limiting.
- Bootstrap admin is local/CI only, generated per environment, never fixed or committed; shared/production bootstrap requires a separate runbook and named approver.
- Account recovery, verification channel, public registration, legal notices and real roles stay disabled until Phase 1F gates.

## 12. Observability and health

- Structured JSON events use timestamp, level, service, environment, correlation/trace ID, stable event code and sanitized error class.
- Explicit denylist includes phone/e-mail, addresses, cookies/tokens, object URLs/keys, image content, request bodies, source credentials and raw provider payloads.
- OpenTelemetry instruments HTTP, DB, queue and object operations behind OTLP; exporter may be no-op/local in Phase 1A.
- Liveness answers only whether process runs. Readiness tests required dependencies and returns generic status without secrets or stack traces.
- Alerts/runbooks are designed for health failure, job backlog, migration failure, auth anomaly and secret/config failure; paging vendor waits for Phase 1H.

## 13. Security baseline

1. Threat-model the Foundation trust boundaries and record abuse cases.
2. Validate all external inputs at adapters; reject oversized/unknown content and genericize client errors.
3. Least-privilege separate database/object credentials for web, worker and migration roles when environment supports it.
4. Default security headers/CSP, secure cookies, CSRF/origin controls, request limits and timeouts.
5. No dynamic code execution, unsafe deserialization, arbitrary URL fetch or filesystem path from user input.
6. Dependencies pinned; license/advisory review and update policy; install scripts explicitly reviewed.
7. Logs, telemetry, errors, fixtures and snapshots tested for forbidden data.
8. Document incident contact, credential revoke, session revoke and vulnerable dependency response before shared access.

## 14. Testing baseline and evidence

| Layer | Foundation evidence |
|---|---|
| Unit/property | Value-object primitives, config schemas, redaction, idempotency and transition helpers |
| Architecture | Dependency direction and forbidden imports |
| Contract | API envelope/errors, storage grants, task payload versions, identity port |
| Integration | Real PostgreSQL migration/transaction, object emulator access, queue retry/replay, session database |
| E2E/browser | Health/shell pages, protected-route denial, reduced motion, keyboard and three browser engines |
| Security | Secret/client bundle scan, auth denial/CSRF/rate limit, log/telemetry PII canary |
| Recovery | Empty/upgrade migration, failed/forward compensation, worker restart, object/service outage |

Tests MUST reference stable requirement IDs and include negative/degraded paths. Coverage percentage alone is not a gate.

## 15. Planned execution steps

Only one item may be `in_progress` in the future execution copy:

| Step | Result | Dependency | Status now |
|---|---|---|---|
| 1A-01 | Record owner authorization, accept ADRs, pin verified toolchain | Phase 0C gate | `completed` |
| 1A-02 | Bootstrap workspace/task graph and root quality commands | 1A-01 | `completed` |
| 1A-03 | Add tooling configs and enforce dependency boundaries | 1A-02 | `completed` |
| 1A-04 | Create minimal web/BFF and worker shells with liveness/readiness | 1A-03 | `completed` |
| 1A-05 | Add typed environment and secrets/redaction protections | 1A-04 | `completed` |
| 1A-06 | Add PostgreSQL adapter and reviewed baseline migration/recovery tests | 1A-05 | `completed` |
| 1A-07 | Add S3-compatible local adapter and trust-zone contract tests | 1A-06 | `completed` |
| 1A-08 | Add durable job adapter/worker retry-idempotency tests | 1A-06 | `completed` |
| 1A-09 | Add synthetic identity/RBAC/session boundary | 1A-06 | `completed` |
| 1A-10 | Add OTel/logging/health integration and denylist tests | 1A-07–09 | `completed` |
| 1A-11 | Complete CI, browser/recovery/security gates and clean-machine runbook | 1A-10 | `completed` |
| 1A-12 | Audit against acceptance/traceability, update docs and request phase sign-off | 1A-11 | `in_progress` |

## 16. Planned commit sequence

Each commit remains independently reviewable and green; names are intentions, not commands executed in Phase 0C:

1. `build: bootstrap pinned monorepo workspace`
2. `chore: enforce types lint formatting and package boundaries`
3. `feat: add minimal web bff and worker health surfaces`
4. `feat: validate runtime environment and protect secrets`
5. `feat: establish postgres persistence and migration safety`
6. `feat: establish object storage trust zones`
7. `feat: establish durable background job boundary`
8. `feat: establish synthetic identity and authorization boundary`
9. `feat: add structured telemetry and health diagnostics`
10. `test: complete foundation recovery security and browser gates`
11. `docs: record Phase 1A evidence and operating runbooks`

No commit combines schema migration with unrelated framework changes. Failed review is fixed forward or commit is reverted before shared application; history rewriting of applied migrations is forbidden.

## 17. Phase 1A acceptance criteria

- **PLAN-1A-AC-001:** clean-machine local bootstrap and shutdown follow one verified runbook.
- **PLAN-1A-AC-002:** locked install, lint, typecheck, unit, integration, contract, build and browser smoke pass in CI.
- **PLAN-1A-AC-003:** package boundary test prevents framework/infrastructure imports into domain/application ports.
- **PLAN-1A-AC-004:** environment misconfiguration fails before serving traffic and no canary secret reaches client/log/artifact.
- **PLAN-1A-AC-005:** database migration replay, upgrade, failed recovery and forward compensation are rehearsed with synthetic data.
- **PLAN-1A-AC-006:** private/quarantine objects cannot be listed/read publicly; grants are scoped and expiring.
- **PLAN-1A-AC-007:** killed/restarted worker retries without duplicate synthetic side effect.
- **PLAN-1A-AC-008:** anonymous/customer/admin negative capability matrix is enforced server-side and sessions revoke.
- **PLAN-1A-AC-009:** liveness/readiness and telemetry degrade safely without leaking internals/PII.
- **PLAN-1A-AC-010:** repository contains no AMIGO import, business catalog, pricing, preview, lead, AI, real media/PII or production credentials.

## 18. Definition of Done and handoff

Phase 1A is done only when all `PLAN-1A-AC-001`–`010` have linked evidence; ADRs are accepted; documentation/traceability/changelog updated; dependency/advisory review current; migrations and runbooks reviewed; worktree clean; and owner records Phase 1A acceptance. Completion MAY authorize planning/entry review for Phase 1B, never automatic import.

## 19. Rollback plan

Before shared data, commits/resources are reversible in reverse dependency order and disposable local data may be recreated. Once any shared migration is applied:

1. stop rollout and new worker claims;
2. keep expanded schema compatible with previous application;
3. revert application only to tested N-1 build;
4. use failed-migration recovery or reviewed forward compensation; restore only through rehearsed backup runbook;
5. revoke sessions/credentials/grants created by the failed change;
6. verify health, reconciliation and audit evidence before resuming;
7. document incident and update ADR/test coverage.

## 20. History

| Версия | Дата | Изменение |
|---|---|---|
| 1.0.0 | 2026-08-02 | Подготовлен детальный, неисполняемый в 0C Foundation plan со stack, boundaries, CI, data/storage/jobs/auth/observability/security/testing, commits and rollback. |
| 1.1.0 | 2026-08-02 | Product Owner разрешил только Phase 1A; QG-147/148 закрыты, ADR-0007–0010 accepted, Windows 11 закреплена; 1A-01 начат до pinning зависимостей. |
| 1.2.0 | 2026-08-02 | Закреплены exact Node/pnpm/toolchain versions, проверены compatibility и advisory feeds, создан workspace/task graph и включены strict tooling/package-boundary gates; активирован 1A-04. |
| 1.3.0 | 2026-08-02 | Созданы минимальные web/BFF и отдельный worker shells, безопасные error/health contracts, 404/error boundary и Windows runtime smoke; после transitive dependency controls audit/build прошли, активирован 1A-05. |
| 1.4.0 | 2026-08-02 | Добавлены typed environment schemas, public/server allowlist, fail-fast startup, redaction и repository secret scan; synthetic server canary не попал в build artifacts, активирован 1A-06. |
| 1.5.0 | 2026-08-02 | Добавлены Prisma/PostgreSQL adapter, две инфраструктурные миграции без бизнес-таблиц, отдельные migrator/runtime roles и реальные проверки empty/repeat/upgrade/drift/append-only audit/forward-recovery на одноразовом PostgreSQL 18.4; активирован 1A-07. |
| 1.6.0 | 2026-08-02 | Добавлены provider-neutral object port, три trust-zone bucket namespaces, checksum/metadata/immutable semantics и scoped grants; RustFS 1.0.0-beta.11 на loopback прошёл signed/anonymous-deny/cross-zone/dependency-failure contracts, активирован 1A-08. |
| 1.7.0 | 2026-08-02 | Добавлены operator-only Graphile migrations с RLS runtime hardening, versioned synthetic task, bounded retry/timeout, durable idempotency/permanent failure и отдельный worker lifecycle; реальный PostgreSQL прогон подтвердил replay, graceful drain и отсутствие остаточного queue lock, активирован 1A-09. |
| 1.8.0 | 2026-08-02 | Добавлены provider-neutral IdentityPort, шесть Phase 1A ролей, deny-by-default capability/object policy, synthetic human/workload separation, HMAC-hashed revocable sessions и audit context; forward migration разрешила атрибуцию workload identity, реальные session/RBAC/revocation/outage contracts прошли, активирован 1A-10. |
| 1.9.0 | 2026-08-02 | Добавлены allowlisted JSON logs, async request/correlation/trace context, safe error classification/redaction, low-cardinality metrics, optional OTLP HTTP export и dependency readiness web/worker; forced Next build без Edge warnings и реальные PostgreSQL/RustFS/worker regressions прошли, активирован 1A-11. |
| 1.10.0 | 2026-08-02 | Добавлены CSP nonce, CSRF/origin/rate-limit/request-size boundary, coverage, provider-neutral CI, artifact/secret/scope/docs gates, Playwright Chromium/Firefox/WebKit и единый Windows lifecycle PostgreSQL/RustFS/web/worker; полный CI-equivalent прошёл 9/9 стадий, активирован итоговый аудит 1A-12. |
