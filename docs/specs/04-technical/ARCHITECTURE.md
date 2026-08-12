# Application architecture specification PROJECT_NAME

## Phase 2B Polza visualization profile

ADR-0014 adds the visualizer inside the same Next.js runtime. The browser prepares a JPEG/PNG/WebP photo and uploads it directly through an exact-path signed grant to private Supabase Storage. Server routes own the guest job, material revalidation, consent, limits, idempotency and asynchronous Polza polling. `PolzaImageVisualizationProvider` hides the official Media API transport; a completed provider image is validated and copied to private `ai-results` before the browser receives a short-lived Supabase URL. No direct Google SDK/API, worker, SAM, mask, Python or GPU service is introduced.

## Phase 2A active architecture

ADR-0013 replaces the active runtime with one portable Next.js App Router application and Supabase PostgreSQL, Storage and staff-only Auth. Browser code receives only publishable configuration; trusted order creation, price recalculation and staff authorization run server-side. Prisma, Graphile Worker, separate worker, local S3 server, mandatory Docker, AI and complex preview/configurator are legacy, not deployment dependencies.

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Phase 1F.1 MVP repair and production-template architecture authorized; AI runtime remains gated |
| Версия | 0.13.0 |
| Дата | 2026-08-12 |
| Global baseline | [GLOBAL_SPEC.md](../GLOBAL_SPEC.md) 0.25.0 |
| Decisions | [docs/adr](../../adr/) |

## 1. Назначение and boundaries

Architecture defines logical components, trust/data boundaries, synchronous/asynchronous responsibilities, provider adapters, availability/degradation and evolutionary constraints. It does not select framework, language, cloud, database, queue, object storage, auth or AI provider.

## 2. Architectural drivers

1. Dynamic authorized AMIGO catalog with local snapshots and no critical runtime dependency.
2. Reproducible money/history and controlled price activation.
3. Exact material/product identity across catalog, standard preview and private AI visualization.
4. Private photo processing, short-lived access and deletion graph.
5. Guest-first funnel plus staff RBAC/audit.
6. Sync/diff/approval/rollback and media rights governance.
7. Mobile/accessibility/performance and local WhatsApp/manual fallback.
8. Provider/vendor replaceability until formal ADR.
9. Field-level authority: AMIGO source data and Business Owner local decisions share one PostgreSQL operational plane without overwriting one another.
10. One public-serving catalog truth: active approved PostgreSQL `CatalogVersion`, never live AMIGO or unapproved staging.

## 3. Нормативные requirements

- **ARCH-SPEC-001 — MUST:** product is separated into domain modules with explicit contracts: Catalog, Configuration, Pricing, Preview, Visualization, Cart/Orders, Identity, Content/Media, Sync, Admin/Audit.
- **ARCH-SPEC-002 — MUST:** public web/API never treats live AMIGO as a critical request-path dependency; it reads active local projections/versions.
- **ARCH-SPEC-003 — MUST:** external integrations are behind replaceable adapters with timeouts, retries/circuit breakers, typed errors and audit.
- **ARCH-SPEC-004 — MUST:** immutable source/price/configuration/quote/media/job revisions are distinct from mutable active pointers/read models.
- **ARCH-SPEC-005 — MUST:** transactional state change and its external side effects use an outbox/equivalent durable pattern; retries are idempotent.
- **ARCH-SPEC-006 — MUST:** long-running sync/media/AI/export/delete tasks execute asynchronously and expose job state/cancel/retry where allowed.
- **ARCH-SPEC-007 — MUST:** user-photo storage/processing is a private trust zone separate from public catalog/media delivery.
- **ARCH-SPEC-008 — MUST:** client and admin UI do not contain partner/provider credentials, proprietary rule internals or direct object-storage authorization.
- **ARCH-SPEC-009 — MUST:** authorization is enforced at application/domain boundaries for actor, capability, object and transition; UI hiding is insufficient.
- **ARCH-SPEC-010 — MUST:** critical mutations are audited with correlation/command ID; audit failure behavior is explicit.
- **ARCH-SPEC-011 — MUST:** versioned APIs/events/storage formats support backward-compatible rolling change and historical replay.
- **ARCH-SPEC-012 — MUST:** cache keys include all behavior-affecting versions; invalidation/revocation prevents stale public/price/media exposure.
- **ARCH-SPEC-013 — MUST:** source/AI/analytics/WhatsApp outage preserves local catalog, saved history and manual contact path.
- **ARCH-SPEC-014 — MUST:** secrets, private URLs/media and sensitive metadata are excluded from telemetry by schema/redaction, not convention alone.
- **ARCH-SPEC-015 — MUST:** chosen infrastructure supports backup/restore, deletion/retention, regional access testing, observability and exit/rollback.
- **ARCH-SPEC-016 — MUST:** architecture remains single-business/simple by default but IDs/ownership prevent future data collision; speculative multi-tenancy is not implemented.
- **ARCH-SPEC-017 — MUST:** production technology/hosting/provider choices require evaluation/ADR and may not be inferred from document examples.
- **ARCH-SPEC-018 — MUST:** health/readiness checks distinguish process alive from dependencies/data versions ready; public catalog can degrade independently from AI/sync.
- **ARCH-SPEC-019 — MUST:** PostgreSQL is the local transactional operational system of record for source captures, normalized catalog projections, local overlays, active pointers and audit; it is not authority to redefine AMIGO-origin or Business Owner-owned values.
- **ARCH-SPEC-020 — MUST:** source-owned fields (AMIGO products, materials, technical data, catalog-image identity and base prices) and local-owned fields (availability, visibility/publication, price overrides, portfolio and commercial conditions) use separate version/provenance/mutation paths; cross-layer last-write-wins is prohibited.
- **ARCH-SPEC-021 — MUST:** AMIGO image metadata, provenance, mapping, rights/publication state and object references MAY reside in PostgreSQL, while binary originals/derivatives MUST remain in managed object storage under ADR-0006/0009.
- **ARCH-SPEC-022 — MUST:** `OWNER-DECISION-010` authorizes only the reviewed Phase 1B.1 catalog schema/import/publication slice; documenting later topology does not assert completion or authorize Phase 1B.2/1C+.
- **ARCH-SPEC-023 — MUST:** by `OWNER-DECISION-009`, the public application MUST NOT read AMIGO, raw captures or staged candidates directly. Client catalog, search, filters, configurator, calculations, leads and analytics use PostgreSQL active approved catalog/transactional state as their only canonical runtime source.
- **ARCH-SPEC-024 — MUST:** cache, search index, filter facets, analytics datasets and other read projections MAY serve requests only when derived from and pinned to an exact active `CatalogVersion`; they are rebuildable/disposable and cannot accept AMIGO directly or become a mutation authority.
- **ARCH-SPEC-025 — MUST:** every AMIGO change follows `source capture → import/synchronization → PostgreSQL staged local catalog → validation/diff → Business Owner approval → explicit administrator activation → public catalog`. No adapter, worker, cache or admin shortcut may bypass a stage.
- **ARCH-SPEC-026 — MUST:** import/source removal MUST NOT automatically delete, clear, hide or retire a local entity, local-only record, Business Owner overlay or historical reference. It creates a reviewed difference/proposal; any local lifecycle transition is an explicit audited command.
- **ARCH-SPEC-027 — MUST:** applicable local overrides take precedence when composing the public projection, without mutating immutable AMIGO source values. Precedence is typed, scoped, versioned, effective-dated and conflict-checked rather than last-write-wins.
- **ARCH-SPEC-028 — MUST:** every catalog version and lifecycle mutation records source/source-version manifest, timestamps, capture/sync/diff, approvals, activation actor, audit correlation, predecessor and rollback target; published versions are immutable.
- **ARCH-SPEC-029 — MUST:** `OWNER-DECISION-011` changes only the local/CI implementation behind the existing provider-neutral `StoragePort`: VersityGW-specific endpoint, path-style SigV4, credentials, retry/timeout and multipart settings remain in typed configuration/S3 adapter and MUST NOT enter catalog domain, media domain or client code.
- **ARCH-SPEC-030 — MUST:** local VersityGW runs as a Linux Docker Compose service with POSIX data/versioning/IAM named volumes and loopback-only S3/Admin endpoints; its selection MUST NOT be treated as a production object-storage decision.
- **ARCH-SPEC-031 — MUST:** Phase 1B.2 full discovery remains inside the existing catalog source boundary: `AmigoCatalogSourceAdapter` owns source-specific selectors/path policy/parser versions, exposes provider-neutral typed category/system/model/material/price/media facts, and never leaks AMIGO DOM or live requests into public/admin runtime modules.

## 4. Logical context

```mermaid
flowchart LR
  U["Guest / Customer"] --> W["Public Web UI"]
  S["Manager / Admin / Owner / Content"] --> AUI["Staff UI"]
  W --> APP["Application API / Use Cases"]
  AUI --> APP
  APP --> DOM["Domain Modules"]
  DOM --> DB["Transactional Data + Versions"]
  DOM --> OBJ["Managed Media Storage"]
  DOM --> OUT["Outbox / Job Commands"]
  OUT --> WK["Background Workers"]
  WK --> EXT["AMIGO / AI / Messaging Adapters"]
  WK --> DB
  WK --> OBJ
  APP --> READ["Search / Read Projections / Cache"]
  DB --> READ
  APP --> TEL["Logs / Metrics / Traces / Audit"]
  WK --> TEL
```

Names are logical roles, not deployment units. They MAY be one deployable modular application plus workers initially; service extraction requires measured need and ADR.

### 4.1. Public catalog serving path

```mermaid
flowchart LR
  AMIGO["AMIGO Source"] --> SYNC["Import / Synchronization Layer"]
  SYNC --> STAGE["PostgreSQL Local Catalog<br/>immutable captures + staged candidate"]
  STAGE --> DIFF["Validation / Diff"]
  DIFF --> BO["Business Owner Approval"]
  BO --> ACT["Explicit Admin Activation"]
  ACT --> ACTIVE["PostgreSQL Active CatalogVersion"]
  ACTIVE --> PUBLIC["Catalog / Search / Filters / Configurator / Calculations / Leads / Analytics"]
  ACTIVE --> DERIVED["Version-pinned Cache / Search / Analytics Projections"]
  DERIVED --> PUBLIC
  OBJECTS["Managed Object Storage<br/>approved binaries only"] --> PUBLIC
```

Only `ACTIVE` is catalog truth for runtime decisions. `DERIVED` is rebuildable from that version; object storage delivers approved bytes referenced by it. Neither layer may ingest AMIGO independently.

## 5. Module boundaries

| Module | Owns | Consumes / emits |
|---|---|---|
| Catalog | Source/local entities, mappings, readiness, compatibility | Sync/media/price refs; catalog-version events |
| Configuration | Draft/revisions and validation evidence | Catalog/schema/rules; valid revision events |
| Pricing | Versions/rules/overrides/quotes/parity | Valid config; quote/version events |
| Standard Preview | Guest-owned state, scene registry, deterministic renderer and approved layer mapping | Pricing calculation/quote, active catalog, `StoragePort`; preview lifecycle |
| Visualization | Private photo/geometry/masks/jobs/revisions/deletion | Config/media/AI adapters; private events |
| Cart/Orders | Project/cart/handoff/lead/measurement/order/warranty | Config/quote/preview/account; state events |
| Identity/RBAC | Accounts/sessions/guest ownership/capabilities | Authorization decisions/audit |
| Content/Media | Content/assets/rights/publication/derivatives | Catalog/partner; revoke/publication events |
| Sync | Captures/runs/diffs/activation/rollback commands | External adapter; staged/active events |
| Admin/Audit | Use-case orchestration, approvals/read models/audit | All modules via explicit application interfaces |

Modules do not reach into another module's tables/objects as an implicit API. Cross-module references use stable IDs/revisions; transaction scope is explicit.

## 6. Command/query/event model

Commands express intent and carry actor/object/current version/idempotency/reason. Domain validates and commits aggregate state plus outbox event. Queries read authorized projections with freshness/version. Events are immutable facts with schema/version and no secrets/private payload; consumers deduplicate by event ID.

Events are not used to hide strong consistency requirements: price activation pointer, quote creation, project claim, rights revoke and state transition require atomic domain decision. Search/cache/notifications/analytics may update asynchronously with visible freshness.

## 7. Synchronous request path

Typical public request: edge/gateway protection → session/guest context → application use case → authorization/input validation → domain/query → response DTO → telemetry. Heavy rendering/source calls are not performed inline. Quote calculation MAY be synchronous if bounded/deterministic; otherwise job contract must preserve one version and clear progress.

Admin mutation: staff auth/step-up → exact capability/object/version → impact/command validation → transaction/outbox/audit → accepted result/command status. External effect follows asynchronously.

## 8. Background job model

Job envelope: `jobId`, type/schema version, tenant/business scope, actor/purpose, aggregate/revision refs, idempotency key, priority, created/scheduled/deadline, attempt/max policy, state, correlation/causation, input refs, output refs, cancellation/deletion flags and redacted failure.

Workers lease jobs, heartbeat bounded tasks, commit outputs atomically/idempotently and avoid processing after delete/revoke. Retry only transient classes with backoff/jitter; permanent/data/security failures stop and require action. Dead-letter is an operational state with runbook, not data disposal.

## 9. External adapters

| Adapter | Required boundary |
|---|---|
| AMIGO source | Approved transport, capture/version/context, credentials isolation, no runtime public dependency |
| Pricing provider | `resolve/validate/calculate/explain/parity`; immutable version contract |
| AI/CV/refinement | Job-scoped private input, model/version, no training, timeout/delete/late callback controls |
| Object storage/media delivery | Private/public namespaces, signed authorization, integrity, derivatives, revoke/delete |
| WhatsApp | Deep-link/share-safe payload; future API requires contract/consent/idempotency |
| Auth | Standards-based adapter; account/object authorization remains local |
| Analytics | Consent/minimal event schema; product works when unavailable |

## 10. Data and storage boundaries

PostgreSQL stores domain revisions/relationships, immutable AMIGO captures, staged candidates, immutable published `CatalogVersion` records, normalized local catalog projections, Business Owner overlays, active pointers and minimal PII. Object storage holds originals/derivatives with metadata and opaque object references in PostgreSQL. Search/filter/cache/analytics projections are rebuildable from an exact active catalog version and never the authority for mutations. Audit is immutable/tamper-evident by controls. Backups map data classes and deletion/restore procedures.

No local file-system dependency is assumed for production. Storage/database vendors and topology are `TBD-INFRA-*`/ADR.

## 11. Security and privacy architecture

Trust zones: public edge, authenticated customer, privileged staff, application/domain, background workers, public approved media, private user media, external providers and operations. Least privilege/network egress/secret isolation apply. Private media uses direct upload only through authorized short-lived grant or controlled proxy; completion validates object/hash/owner. Staff/public deliveries are separate.

Threat model covers IDOR/BOLA, upload/parser abuse, XSS/CSRF, SSRF/egress, job poisoning/replay, signed URL leakage, prompt/provider data leakage, role/approval bypass, source credential exposure and supply-chain risk.

## 12. Availability and degradation matrix

| Failure | Remains available | Fails/changes safely |
|---|---|---|
| AMIGO/source transport | Active local catalog/history/contact | Sync freshness/updates alert |
| Pricing provider/engine | Catalog/config/cart draft/manual | Numeric quote unavailable, no fake zero |
| Public media | Text/catalog identity/contact | Broken asset hidden/fallback, no hotlink |
| Standard renderer | Config/price/cart/contact | Static/text preview fallback |
| AI/CV/refinement | Standard preview/base/manual/contact | Stage failure/retry; no private leak |
| Auth provider | Public/guest/manual path | Account/staff/high-risk operations fail safe |
| WhatsApp | Cart/project/reference/contact display | Deep link/message status explicit |
| Analytics | Full product behavior | Events buffer/drop per policy |
| Search projection | Authoritative detail/basic browse if designed | Staleness shown/rebuild |
| Audit/outbox | Reads; low-risk policy-specific | Critical mutation fails closed/durable outbox |

## 13. Performance and scalability principles

Optimize public shell/catalog separately from heavy visualizers. Use route/feature/media lazy loading, bounded queries/pagination, versioned caching, asynchronous transformations, queue isolation by workload, backpressure and resource quotas. Scale decisions follow measurements; no microservice/service split is justified by fashion. Numeric budgets live in `PERFORMANCE.md`.

## 14. Observability and operations

Every request/job/command carries correlation/causation and safe version identifiers. Metrics cover latency/error/saturation/freshness/queue/cost/quality/business state. Logs are structured/redacted. Alerts link owner/runbook and avoid private payload. Deployment includes migrations/backward compatibility, health gates, canary/rollback and restore drills.

## 15. Validation, errors and edge cases

- mixed source/catalog/price/asset revisions rejected or pinned explicitly;
- duplicate command/event/job/callback deduplicated;
- out-of-order event cannot regress aggregate state;
- stale read model revalidates authoritative version before mutation;
- asset/permission revoke during AI/render/public delivery blocks output;
- deletion race/late callback cannot resurrect media;
- time-zone/effective-date uses authoritative UTC + business display timezone;
- cache/search/worker partial outage has rebuild/retry/rollback;
- rolling deployment supports old/new event/API/data versions;
- restore does not silently republish revoked/deleted/stale state.

## 16. Acceptance criteria and tests

Architecture acceptance is covered by domain AC plus contract/component/integration/failure/recovery/security tests in `TEST_STRATEGY`. Required architecture tests: adapter outage, no live AMIGO/staging dependency, exact active-version pinning of public and derived reads, source-removal no-auto-delete, override precedence without source mutation, approval/activation authorization, version/audit completeness, rollback, outbox atomicity, job idempotency/cancel/delete, mixed-version rejection, cache invalidation, role/object checks, secret/private telemetry scan, rolling compatibility and backup/restore.

## 17. Implementation record

Phase 1A topology matches ADR-0007–0010: Next.js same-origin web/BFF, separate Node worker, PostgreSQL/Prisma, Graphile Worker, S3-compatible and identity ports, shared contracts/config/observability/testing packages and automated acyclic dependency direction. Evidence: [Phase 1A report](../../06-plans/completed/PHASE_1A_FOUNDATION_REPORT.md).

For Phase 1B.1, `OWNER-DECISION-011` replaced the unreliable Windows-native RustFS process only in local/CI infrastructure. The application port and trust-zone model did not change; Docker Compose now supplies digest-pinned VersityGW with three named volumes. The 2026-08-03 contract gate passed byte-for-byte real-image, signed URL, multipart, outage and restart-persistence scenarios without selecting production storage.

The completed Phase 1B.1 slice adds source/normalized/business-overlay modules behind the established boundaries, separate worker synchronization/media stages, immutable PostgreSQL catalog/price versions, audited OWNER approval/ADMIN activation, and same-origin public/admin catalog surfaces. Real run `9bd1a4f8-e456-4617-9e16-7f5604c1c65c` activated an exact 40-entry/32-price composition; the public projection returned 32 items and 32 checksum-verified primary images without any live AMIGO/staging dependency. Restart and no-op repeat evidence preserved active pointers/history and produced no duplicate/version drift. No configurator, pricing engine, preview, cart, AI or production topology was added. Evidence: [Phase 1B.1 report](../../06-plans/completed/PHASE_1B1_AMIGO_CATALOG_PILOT_REPORT.md).

Completed Phase 1B.2 extends that same adapter boundary with dynamic catalog-index traversal, nested collections, strict pagination, structured ready-made model details, broader controlled media URL shapes, semantic source versions and item diagnostics. The accepted run persisted 114 pages/5 181 snapshots/21 019 normalized items through resumable Graphile stages, stored 2 818 private catalog objects, and activated compatible immutable CatalogVersion/PriceVersion v2 only after checksum-bound OWNER review and ADMIN activation. Public/admin runtime continues to read PostgreSQL/local storage only; semantic repeat produced zero versions/differences, v1 rollback and two full restarts preserved history/pointers/objects. No configurator, dimensional pricing, preview, cart, AI or production topology was added. Evidence: [transport discovery](../../research/AMIGO_FULL_CATALOG_TRANSPORT_DISCOVERY_2026-08-03.md) and [Phase 1B.2 report](../../06-plans/completed/PHASE_1B2_FULL_AMIGO_CATALOG_REPORT.md).

Completed Phase 1C adds one independent `packages/pricing` domain boundary and shared contracts without a live AMIGO dependency. The same-origin Next.js BFF requests bounded active-catalog projections from `packages/db`, revalidates all selections, invokes the deterministic integer engine, persists idempotent calculations and immutable quote snapshots, and emits only safe DTOs. PriceVersion activation, parity, rejection and overrides remain server-authorized transactional commands with append-only decision/audit evidence. Cacheable reference data is version-keyed; activation invalidates the active-version projection, while quote responses are always private/no-store. Browser code renders results but cannot submit an authoritative total. Evidence: [Phase 1C report](../../06-plans/completed/PHASE_1C_CONFIGURATOR_PRICING_REPORT.md).

## 18. Dependencies, risks and open questions

### 18.1. Phase 1F.1 architecture profile

- **P1F1-ARCH-001 — MUST:** configurator bootstrap contains families/system schema only; material discovery is a bounded query port over the active catalog projection and is consumed incrementally by the client.
- **P1F1-ARCH-002 — MUST:** coverage classification is one domain policy shared by public search, validation/calculation and admin diagnostics; layers MUST NOT independently reinterpret compatibility or pricing readiness.
- **P1F1-ARCH-003 — MUST:** source-backed records, local coverage overrides, immutable pricing rules and cart quotes remain separate ownership layers; sync cannot overwrite business coverage decisions and browser state cannot become price authority.
- **P1F1-ARCH-004 — MUST:** staff password hashing/authentication remains inside identity/database ports using Node runtime; web routes do not access raw credential storage directly and no external auth provider is required.
- **P1F1-ARCH-005 — MUST:** production remains the existing modular monolith plus separate Graphile Worker, PostgreSQL, StoragePort and Nginx boundary; no new microservice, Python service, GPU or AI runtime is introduced.
- **P1F1-ARCH-006 — MUST:** `ImageVisualizationProvider` is documentation-only in Phase 1F.1; no production interface file, adapter, route, task or provider request is compiled or deployed.

Phase 1D keeps the accepted modular/BFF topology: `/configure` creates an opaque `StandardPreviewState` through a server use case; `/preview` lazy-loads `standard-svg-v2`; the renderer consumes canonical state plus same-origin scene/product layers. Layer descriptors are an allowlisted server mapping from active family/model/article to a checksum-bound manifest. Bytes are provisioned and read through provider-neutral `StoragePort`; the browser never receives object keys or calls AMIGO. Approved supplier raster layers are composed by project-owned SVG/controls, not supplier frontend code. Preview state and immutable pricing snapshots remain separate.

Phase 1E adds framework-independent `packages/cart` totals/status/message/transition policy plus PostgreSQL cart/request adapters behind the same BFF. The browser carries only opaque quote/item/public references; the adapter reloads immutable quotes and writes checkout, audit and outbox atomically. Public request projection is distinct from contact/admin projection. WhatsApp is a fixed-recipient deep-link adapter with copy fallback and no outbound worker/API. Existing worker consumes only durable outbox infrastructure; a restart preserves pending/history rows.

Dependencies: all specs, ADR/evaluations, data/API/sync/media/AI/storage/security/performance/observability/deployment and `OWNER-DECISION-008/009/013/014/015/016`. Foundation runtime/framework/database/queue boundaries are fixed by ADR-0007–0010; open: production object/auth/telemetry/hosting providers, PII/legal/retention, search, AI, region/network and RPO/RTO. Risks: premature microservices, provider lock-in, hidden live-source dependency, derived-projection drift, asset/profile mismatch, privacy boundary collapse and untestable recovery.

## 19. История изменений

| Версия | Дата | Изменение |
|---|---|---|
| 0.13.0 | 2026-08-12 | Authorized one shared coverage policy, existing identity extension, VPS templates and documentation-only AI provider boundary. |
| 0.1.0 | 2026-08-02 | Defined vendor-neutral modular architecture, boundaries, commands/events/jobs, adapters, degradation and operational constraints. |
| 0.2.0 | 2026-08-02 | Recorded Phase 1A implementation conformance and resolved Foundation stack/topology unknowns while retaining production provider gates. |
| 0.3.0 | 2026-08-02 | Added `OWNER-DECISION-008` authority boundaries, PostgreSQL operational projection and object-storage image binary split without claiming Phase 1B implementation. |
| 0.4.0 | 2026-08-02 | Applied `OWNER-DECISION-009`: active approved PostgreSQL `CatalogVersion` is the only public-serving runtime truth; added version-pinned derived projections, mandatory source→diff→owner/admin activation, no-auto-delete, override precedence, audit and rollback boundaries. |
| 0.5.0 | 2026-08-02 | Added the authorized Phase 1B.1 catalog pilot topology and preserved all later-phase boundaries. |
| 0.6.0 | 2026-08-03 | Applied local-only `OWNER-DECISION-011`: VersityGW Docker/POSIX named-volume adapter replaced active RustFS while `StoragePort`, catalog/media boundaries and production-provider gate remained neutral. |
| 0.7.0 | 2026-08-03 | Recorded completed Phase 1B.1 source/version/overlay/worker/admin/public topology, active real pilot versions and restart/idempotency evidence without starting later domains or production. |
| 0.8.0 | 2026-08-03 | Recorded Phase 1B.2 full discovery inside the existing adapter boundary, including dynamic hierarchy/models/pagination, semantic source hashing and real 28/56/9/1655 evidence without activation or Phase 1C. |
| 0.9.0 | 2026-08-04 | Recorded completed Phase 1B.2 resumable import, active v2 governance, local media, public/admin, rollback/restart/no-op evidence inside the existing adapter/PostgreSQL/StoragePort boundaries; later phases remain gated. |
| 0.10.0 | 2026-08-08 | Recorded the independent pricing package, active PostgreSQL adapter, same-origin BFF, immutable quote/admin transaction boundaries, version-keyed reference cache and completed Phase 1C without Phase 1D topology. |
| 0.11.0 | 2026-08-08 | Recorded the Phase 1D guest-state/BFF, lazy deterministic SVG renderer, allowlisted local supplier-layer manifest, `StoragePort` delivery and zero-runtime-AMIGO boundary. |
| 0.12.0 | 2026-08-09 | Recorded Phase 1E cart domain/PostgreSQL adapters, immutable transactional request/audit/outbox, split public/admin projections and fixed-recipient no-send WhatsApp boundary. |
