# Observability and runbooks specification PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Draft / alert ownership and SLO numbers `BLOCKED_BY_TBD-INFRA-008` |
| Версия | 0.1.0 |
| Дата | 2026-08-02 |
| Privacy/security | [SECURITY_PRIVACY.md](SECURITY_PRIVACY.md) |
| Performance | [PERFORMANCE.md](PERFORMANCE.md) |

## 1. Purpose and principles

Observability makes customer tasks, data freshness/versions, jobs/providers, security/privacy and recovery explainable without exposing sensitive content. It combines metrics, structured logs, traces, audit and runbooks; analytics is not operational telemetry.

- **OBS-SPEC-001 — MUST:** every request/command/event/job carries correlation and causation identifiers across allowed boundaries.
- **OBS-SPEC-002 — MUST:** telemetry uses schema allowlists/redaction and excludes credentials, tokens, cookies, private/source URLs, image/mask/prompt contents, full contact/address and sensitive free text.
- **OBS-SPEC-003 — MUST:** logs are structured with timestamp/environment/service/build/route-job template/status/error/version IDs, not raw request dump.
- **OBS-SPEC-004 — MUST:** metrics cover user task, latency/error/saturation, data freshness/quality, queue/job/provider, security/privacy/deletion/backup and cost.
- **OBS-SPEC-005 — MUST:** traces sample/retain under approved privacy/cost policy and use route templates/pseudonymous IDs.
- **OBS-SPEC-006 — MUST:** business audit remains immutable/separate from mutable operational logs and has restricted access/export.
- **OBS-SPEC-007 — MUST:** alerts are actionable, symptom-based, deduplicated/routed and link dashboard/runbook/owner; unknown owner blocks launch readiness.
- **OBS-SPEC-008 — MUST:** health distinguishes liveness, readiness, dependency status and data-version freshness; optional dependency does not mark all product down.
- **OBS-SPEC-009 — MUST:** observability/analytics outage does not break customer product, while critical unaudited mutation fails according to security policy.
- **OBS-SPEC-010 — MUST:** telemetry changes are versioned/tested; redaction regression is security/privacy release blocker.
- **OBS-SPEC-011 — MUST:** dashboards show unknown/missing telemetry separately from zero/healthy and include data completeness/last update.
- **OBS-SPEC-012 — MUST:** incidents preserve minimized evidence and timeline while restricting private/partner data.
- **OBS-SPEC-013 — MUST:** retention/access/export/deletion of telemetry follow approved data policy; no indefinite default.
- **OBS-SPEC-014 — MUST:** synthetic probes do not upload real client/partner data, place real orders or bypass external access.
- **OBS-SPEC-015 — MUST:** SLO/error budget values are measured/approved after target support and ownership decisions; no numbers are invented.

## 2. Telemetry taxonomy

| Signal | Example dimensions | Prohibited dimensions |
|---|---|---|
| Public UX | route template, build, catalog version, coarse region/network, task state | raw URL/query/contact/device fingerprint |
| API | route/operation, status/error code, latency, auth class, version | body, token, raw ID where unnecessary |
| Catalog/price | active version, freshness, validation/parity status, counts | confidential rules/source payload |
| Media/storage | class/role/format/bytes/status/error, purge/delete age | object key/URL/image metadata/content |
| AI jobs | stage/model/provider version, queue/run, quality outcome/cost | photo/prompt/coordinates/object refs |
| Sync | source record/run/stage/version, safe counts/diff severity | credentials/raw export/media |
| Cart/order | state transition type/status/duration | contact/address/free notes |
| Auth/security | event type/result/risk class/rate | credential/identifier/raw IP beyond policy |
| Audit | actor/object/capability/from-to/reason ref | secrets/private payload |

## 3. Structured log schema

Required safe fields where applicable: timestamp, severity, environment, service/component, build/deploy ID, event name/schema, route/job/command/event template, outcome/error code/retryable, duration, safe actor type/pseudonymous ID, aggregate type/pseudonymous ID, correlation/causation/idempotency, catalog/price/content/asset/model/provider versions, attempt and redacted metadata.

Exception/stack information is restricted server-side and scrubbed. Original exception message from providers/parsers is not emitted before redaction/classification. Client error receives correlation ID only.

## 4. Metrics and dashboards

### Customer funnel health

Home/catalog/configurator/quote/standard preview/AI/cart/handoff availability, task success/error/manual fallback and latency, segmented by safe build/version/device/network class. No false conversion from external WhatsApp open.

### Data readiness

Active catalog/price/content/media version/freshness, four readiness dimensions, unknown/stale/blocked counts, sync run/diff/conflicts/approval age, price parity and rights expiration/revocation.

### Jobs/providers

Queue depth/age, throughput, stage success/failure/retry/dead-letter/cancel/delete, worker utilization, provider latency/error/throttle/circuit, quality distributions and cost. Optional refinement separated from base/deletion.

### Security/privacy

Auth/rate/authorization deny anomalies, upload/security rejection, secret/PII scan results, private access, revoke/purge/delete pending/failure/age, provider deletion, backup/restore, audit gaps and role/approval changes. Dashboards are restricted.

### Infrastructure/runtime

Request latency/error/saturation, DB/search/cache/storage/queue health, connection/resource limits, deployment/migration, backup and regional probes. Exact signals depend on selected platform.

## 5. Health/readiness model

| Check | Meaning | Public effect |
|---|---|---|
| Process liveness | Runtime event loop/process alive | Restart policy only |
| App readiness | Can serve safe core path and required data/store | Remove from traffic if unsafe |
| Catalog readiness | Active verified local catalog exists | Catalog or maintenance/manual fallback |
| Pricing readiness | Active price version/engine healthy | Price unavailable/manual; catalog stays |
| Public media | Delivery/manifest healthy | Text/static fallback |
| Private media | Upload/delivery/delete healthy | Visualizer/private operations fail safe |
| AI base/refinement | Queue/worker/provider status separately | Standard/base/manual fallback |
| Sync/source | Last run/freshness, not public runtime | Stale alert; active catalog stays |
| Audit/outbox | Critical integrity channel | Mutations policy-specific fail closed |

Health endpoints expose minimal status and no internal topology/versions to unauthorized public clients.

## 6. SLO and error budget process

For each critical journey define owner, user-visible SLI numerator/denominator, target conditions/regions, exclusions, target/window, data source/completeness and error-budget action. Candidate journeys: catalog availability, valid quote, cart/handoff acceptance, private media access/delete, admin price/catalog activation and sync freshness. `TBD-INFRA-002/005/008` and operations review must close values.

Planned maintenance, provider outage and safe fallback are not automatically excluded; measure what user experiences. Unknown/incomplete telemetry cannot claim SLO success.

## 7. Alert severity and routing template

| Severity concept | Customer/data impact | Response expectation |
|---|---|---|
| Critical | Private exposure, wrong active price/mass rights issue, irreversible data loss, core funnel widespread unavailable | Immediate containment/escalation; exact timing/owner TBD |
| High | Core task degraded/no safe fallback, deletion/backup failure beyond policy, sync/price stale beyond threshold | Prompt owner/runbook action |
| Medium | Partial category/provider/queue/admin issue with fallback | Business-hours/process response TBD |
| Low/info | Non-actionable trend/review | Dashboard/task, not pager |

Alert must include symptom, environment/version, started/detected, scope, safe correlation, dashboard/runbook and owner. No image/contact/source secret. Avoid alerts on every individual validation/user error.

## 8. Runbook template and required runbooks

Each runbook: purpose/symptoms/severity, safe access, dashboards/queries, containment, diagnosis decision tree, recovery/rollback, validation, privacy/security evidence/notification decision, escalation/owner, post-incident follow-up and test link.

Required before launch: wrong active price/version; catalog/sync mass diff/rollback; partner permission/asset revoke; public/private storage exposure; private media delete stuck/late callback; AI provider outage/drift/cost; auth outage/abuse/role compromise; WhatsApp/contact outage; audit/outbox failure; DB/search/cache/storage/queue saturation; deploy/migration rollback; backup restore and secret leak/rotation.

## 9. Failure and edge cases

- telemetry pipeline down/lagging/duplicating/out-of-order;
- high-cardinality IDs explode cost;
- exception/provider payload contains PII/secret;
- client clock/skew/offline batches;
- alert storm/cascade during provider outage;
- dashboards green because data missing;
- sampling drops rare security/deletion event;
- trace crosses private provider boundary;
- restore/deploy changes metric names;
- synthetic probe affects real lead/source rate.

Controls: local buffering/drop policy, schema validation/cardinality limits, always-retain critical counters/audit, completeness signals, dedupe/inhibition, version compatibility and synthetic isolation.

## 10. Security, privacy, performance and access

Telemetry endpoints/storage/access use least privilege, encryption, environment separation, SSO/MFA after choice, immutable audit for sensitive queries/exports and retention. Search by private identifiers is restricted and preferably pseudonymous. Redaction happens before external telemetry processor. Observability overhead is budgeted and never serially blocks public requests; audit/outbox integrity remains separate.

## 11. Acceptance and tests

Tests: correlation across request→command→event→job/provider; safe schemas and PII/secret/image URL scan under failures; metric correctness/completeness; health dependency isolation; alert rule fixtures/no storm; runbook tabletop; telemetry outage/product behavior; audit immutability/access/export; deletion/restore visibility; versioned dashboard after deploy; regional synthetic no real data/order.

Primary AC: `AC-PERF-001`, `AC-SEC-001`, `AC-PRIV-001`, `AC-AMIGO-SYNC-001`, `AC-PRICE-ACTIVATE-001`, `AC-VIS-DELETE-001`.

## 12. Dependencies, risks and open questions

Dependencies: all modules, security/performance/deployment/testing. Open: telemetry platform, `TBD-INFRA-002/008`, SLO targets/windows, on-call roles/hours, retention/sampling/cardinality/cost, incident comms and synthetic locations. Risks: PII leakage, unactionable alert noise, missing-data green, cost explosion, blind async/provider stages and no reachable owner.

## 13. History

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Defined safe telemetry schemas, dashboard/health/SLO/alert/runbook process, privacy boundaries and verification. |
