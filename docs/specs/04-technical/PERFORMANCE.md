# Performance and capacity specification PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Draft numeric budgets `BLOCKED_BY_TBD-INFRA-003/005`; Phase 1B.2 scale and Phase 1D preview structural gates executed |
| Версия | 0.4.0 |
| Дата | 2026-08-08 |
| Architecture | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Responsive UX | [RESPONSIVE_SPEC.md](../03-ux/RESPONSIVE_SPEC.md) |

## 1. Purpose and principles

Performance preserves the primary catalog/configuration/contact task on target Chechen Republic networks/devices and isolates heavy preview/AI/admin/sync work. Numeric budgets require a measured support matrix; this spec does not invent traffic, concurrency or network targets.

- **PERF-SPEC-001 — MUST:** budgets are defined by route/task, target device/network/region and percentile/error conditions, not one global average.
- **PERF-SPEC-002 — MUST:** public shell/catalog/configurator/contact load and remain usable without standard preview/AI/admin/sync bundles or live AMIGO.
- **PERF-SPEC-003 — MUST:** layout reserves media/font/async space and meets approved visual stability budget.
- **PERF-SPEC-004 — MUST:** user input/press gets immediate visible feedback; authoritative async completion is shown separately.
- **PERF-SPEC-005 — MUST:** images/fonts/code/data are budgeted, responsive, compressed/cached/lazy-loaded by intent and rights.
- **PERF-SPEC-006 — MUST:** lists/search/facets/admin diffs are bounded/paginated/indexed/virtualized where measured need, never unbounded browser payload.
- **PERF-SPEC-007 — MUST:** quote calculation is deterministic/bounded and no external source request sits on critical calculation path.
- **PERF-SPEC-008 — MUST:** standard preview and AI pipelines have separate queues/resources/timeouts/fallbacks and cannot starve cart/contact.
- **PERF-SPEC-009 — MUST:** every external adapter has timeout/circuit breaker/backpressure/retry policy and safe local/manual degradation.
- **PERF-SPEC-010 — MUST:** capacity limits/quotas/rate controls are explicit by guest/account/staff/job and return recoverable status.
- **PERF-SPEC-011 — MUST:** cache keys include locale/content/catalog/price/asset/profile/renderer versions and authorization; private responses never use shared public cache.
- **PERF-SPEC-012 — MUST:** performance regression is release-blocking when critical budget/task fails on representative conditions.
- **PERF-SPEC-013 — MUST:** monitoring separates frontend, API, DB/search/cache, storage/media, queue/worker, provider and regional network latency/error/saturation.
- **PERF-SPEC-014 — MUST:** optimization cannot weaken privacy/security/rights/version correctness or serve wrong/stale material/price.
- **PERF-SPEC-015 — MUST:** budgets, tests and capacity model update when category/media/model/traffic behavior changes.
- **PERF-SPEC-016 — MUST:** regional production verification covers Grozny, Urus-Martan, Argun and Gudermes without VPN, mobile plus home/office Wi-Fi, at least two different routes, mobile Chrome and desktop Chrome.
- **PERF-SPEC-017 — MUST:** the Phase 1B.2 scale gate uses a disposable synthetic catalog larger than the dated real discovery, preserves the public item guard and page limits, traverses every cursor page without duplicate/omission, records heap/time/query-plan evidence, proves constant application statement counts for public/admin/bulk paths and rejects temporary-block spill or partial bulk apply. Its observed values are regression evidence, never production SLA or traffic capacity.

## 2. Performance budget template

Numeric cells stay `TBD` until `TBD-INFRA-003/005` closes with field measurements.

| Journey/component | Conditions | Metric/budget to approve | Degraded behavior |
|---|---|---|---|
| Home/hero | First/return, reduced/normal, target phone/network | Content/CTA readiness, visual stability, transfer/CPU | Static starfield/hero; catalog CTA immediate |
| Catalog/category | Cold/warm, normal/large dataset | Task-ready, query latency, payload/card images | Local cached version, pagination, lower-res media |
| Search/facets | Typical/worst facet cardinality | Input response/query/result render | Debounce, server query, partial safe filters |
| Configurator | Each step/rule graph | Field feedback, validation, schema payload | Text/manual review; preview deferred |
| Quote | Typical/boundary config | Calculation latency/replay throughput | Async/manual/unavailable, no zero |
| Standard preview | Target devices/families | First ready/control update/frame stability | Static/text fallback |
| Photo upload | Target file/network | Initiate/upload/validation progress | Guidance/retry/resume policy |
| Base AI | Queue idle/load/model cases | Queue + stage latency/success/correction | Manual geometry/standard preview |
| Refinement | Provider normal/outage | Queue/provider latency/cost/success | Keep base only |
| Cart/handoff | Multi-item/retry | Mutation/submit/task-ready | Preserve draft/manual contact |
| Account/admin | Typical/large lists/diffs | Auth/query/mutation/command status | Read-only/status/retry, safe fail |
| Sync | Small/large source change | Stage throughput/memory/activation | Active version remains |

## 3. Target condition matrix

Must define before implementation approval:

- representative Android/iOS/desktop device classes, browser/versions and memory/CPU;
- the four cities, connection classes, route diversity and Chrome form factors from `OWNER-DECISION-007`; exact device/browser versions and network budgets remain `TBD-INFRA-005`;
- viewport/zoom/reduced-motion/save-data/background conditions;
- cold/warm cache and first/return visit;
- catalog/material/option/card counts and growth scenarios;
- photo file/dimensions and concurrent upload/base/refinement jobs;
- normal/peak/spike traffic and admin/sync batch sizes (`TBD-INFRA-003`);
- external provider normal/throttled/outage latency.

Results store test build/version, data versions, location/network/device, methodology, sample/percentiles, errors, trace IDs and date.

## 4. Frontend budgets and strategies

Separate route/feature bundles; minimal critical styles/fonts; system/metric-compatible fallback; starfield/standard preview/AI/admin lazy-loaded; responsive images with dimensions/format; no unneeded third-party script; prefetch only likely/budgeted and not private. Main-thread long work moves to worker/server where architecture permits; animations use compositor-safe transforms and stop when hidden/reduced.

Loading UX follows motion/screen specs: feedback immediate, skeleton/progress only for meaningful wait, content not blocked by decorative/analytics dependency. No performance optimization removes labels/focus/zoom or degrades exact material.

## 5. API, data and cache

Bound all request/response/query sizes and validation complexity. Use cursor pagination, allowlisted indexed filters/sorts, query plans/slow-query monitoring after DB choice, no N+1-like unbounded domain access, batched media metadata, ETag/version semantics. Writes use optimistic concurrency/idempotency and should not wait on notifications/analytics.

Public catalog/content/media cache by immutable version and purge/revoke; price/configuration authorization/version correctness precedes cache. Private/account/admin responses are not shared. Search projection freshness visible; mutation rechecks authoritative store.

## 6. Media and visualization performance

Public derivatives sized by role/viewport/DPR budget, not originals. Exact material texture can use higher fidelity only when preview requested. Standard renderer caches by configuration/scene/assets/profile/renderer versions; unsupported/weak device static fallback.

Photo upload normalizes once; stages reuse exact owner/policy artifacts. Queues isolate validate/detect/base/refine/delete; deletion/security jobs have priority over optional refinement. Quotas prevent abuse. Provider timeout/circuit breaker returns base/manual. Cost is a capacity signal alongside latency.

## 7. Capacity and load model

Capacity worksheet includes sessions/catalog requests, configurations/quotes, uploads bytes, active/private objects, jobs by type/concurrency/duration/resource, source sync records/assets, staff operations, logs/metrics/backup and provider quotas/cost. Numeric values remain TBD, but each has owner, measurement source, forecast horizon, headroom policy and scale/limit response.

Load patterns: steady, campaign/spike, source sync concurrent with traffic, provider outage/retry storm, large media import later, bot/abuse, restore/reindex and deployment warmup. Critical product queues/resources are isolated from bulk/optional work.

## 8. Failure, backpressure and edge cases

- slow client disconnect/upload resume/abandoned multipart cleanup;
- cache stampede/version activation/purge;
- large dynamic category/facet cardinality;
- quote rule conflict cannot be cached as amount;
- queue surge/poison job/retry storm/dead letter;
- provider throttling/global outage/late callback;
- storage/CDN/database/search partial outage;
- low memory/background tab/orientation/zoom;
- sync/backup/reindex competes with public traffic;
- rate limiter unavailable must not fail open for costly/private action;
- stale read model before admin mutation.

Each gets bounded timeout, queue/limit, rejection/shed priority, retry budget and user/operator fallback.

## 9. Observability and regression

Measure route/task user timing, API/query/cache/storage, job stages/queue, provider and regional synthetic/manual probes. Tag safe build/catalog/price/asset/model versions and coarse device/network, no fingerprinting/PII. Dashboards compare release/baseline and error/saturation/cost. Alert only actionable budget/SLO symptoms with runbook/owner once `TBD-INFRA-008` closes.

Performance tests: lab synthetic, real-device/manual regional, API/component benchmark, load/stress/soak/spike, queue/backpressure, provider fault, frontend bundle/media/CLS/interaction, DB/query after selection and recovery/restore contention.

### 9.1. Phase 1B.2 synthetic catalog-scale evidence

The reproducible Windows gate `pnpm test:catalog-scale` uses an exact disposable PostgreSQL 18.4 database with `pg_stat_statements`, reviewed migrations and the least-privilege runtime role. Its synthetic input contains 2,048 materials, 32 categories and 16 systems, exceeding the dated real discovery of 1,655 materials without becoming catalog truth. Fixture construction and normalized persistence are chunked at 400 records; public projection retains the 10,000-item fail-closed guard; public navigation traverses 41 cursor pages of at most 50 items with no duplicate or omission.

The final 2026-08-03 CI-equivalent execution observed: fixture construction/persistence 2,999.07 ms and 47,304,032-byte process heap delta; active public projection 51.88 ms through one planned statement; bounded 50-row admin page 80.08 ms through four planned statements; 2,048-target bulk preview 810.61 ms through six planned statements; atomic bulk apply 782.67 ms through twelve planned statements and one immutable command. PostgreSQL reported zero temporary blocks for all measured operations. These single-machine observations establish the regression baseline and constant-query/no-N+1 shape only; they do not close `TBD-INFRA-003/005`, approve traffic/concurrency/device/network budgets or substitute the Stage 12 real importer run.

### 9.2. Phase 1D standard-preview evidence

The configurator does not load preview scene/product layers before explicit intent. `/preview` requests one selected material visualization, one system layer and the current scene only; it never enumerates or decodes the 1,655-variant catalog. SVG geometry is memoized from canonical state, has fixed 1500×937 dimensions to avoid layout shift and uses CSS/SVG transforms rather than WebGL or a render loop. Scene bytes are checksum-versioned immutable resources; private state and state-scoped layers are not publicly cached. Fixed desktop and 375×812 browser cases pass without horizontal overflow, and repeated control updates do not trigger remote AMIGO traffic.

## 10. Acceptance criteria and tests

Primary: `AC-PERF-001`, plus task AC under representative budgets. `AC-PERF-001` cannot fully pass until numeric budgets/support matrix are approved; safe progressive/degraded behavior is immediately testable.

Release evidence includes budget table, build/data/provider versions, baseline diff, failures/waivers owner/expiry and no security/privacy/accessibility regression. Waiver cannot silently become permanent target.

## 11. Dependencies, risks and open questions

Dependencies: UX, architecture/data/API/media/AI/storage/observability/deployment/test strategy. `TBD-INFRA-002` is resolved by `OWNER-DECISION-007`; open: `TBD-INFRA-003/005/008`, hosting/network/provider choices, concrete budgets/traffic/quotas and performance ownership. Risks: heavy starfield/AI blocks funnel, originals over-delivered, cache serves wrong version, retry storm, provider cost/latency and optimizing desktop while target mobile networks fail.

## 12. History

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Defined task budgets template, target matrix, frontend/data/media/AI strategies, capacity and regression without invented numbers. |
| 0.2.0 | 2026-08-02 | Региональная матрица без VPN закреплена `OWNER-DECISION-007`; numeric performance budgets остаются TBD. |
| 0.3.0 | 2026-08-03 | Added the executed 2,048-material Phase 1B.2 synthetic scale method, constant query/plan counts, cursor completeness, bounded fixture persistence and atomic bulk evidence without declaring production SLA. |
| 0.4.0 | 2026-08-08 | Recorded Phase 1D lazy route loading, current-configuration-only layers, fixed-size SVG composition, safe caching and narrow-viewport evidence without inventing production budgets. |
