# API and integration contract specification PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Draft 0B — conceptual HTTP/event contracts; no routes implemented |
| Версия | 0.1.0 |
| Дата | 2026-08-02 |
| Architecture/data | [ARCHITECTURE.md](ARCHITECTURE.md), [DATA_MODEL.md](DATA_MODEL.md) |
| Security | [SECURITY_PRIVACY.md](SECURITY_PRIVACY.md) |

## 1. Purpose and boundaries

This document defines resource/command/query semantics, versioning, auth/object scope, idempotency, errors, pagination, async jobs/events and external adapters. Paths are proposed public contracts, not production code or framework selection.

Out of scope: live implementation, provider-specific AMIGO/auth/AI/WhatsApp APIs, webhook secrets, infrastructure hostnames and undocumented admin database access.

## 2. Global contract rules

- **API-SPEC-001 — MUST:** API is versioned; breaking change uses new version/contract and migration window, while additive compatible fields do not change meaning.
- **API-SPEC-002 — MUST:** every protected request authenticates actor/service and authorizes capability, object scope, state transition and current version server-side.
- **API-SPEC-003 — MUST:** resource IDs are opaque stable identifiers; public slugs are aliases and never authorization.
- **API-SPEC-004 — MUST:** critical mutation accepts idempotency/command key and returns the same semantic outcome on safe retry.
- **API-SPEC-005 — MUST:** mutable resource update uses version/precondition; stale update returns conflict with safe current version/next action.
- **API-SPEC-006 — MUST:** error envelope uses stable code, safe message, field paths optional, retryability, correlation ID and no stack/secret/private URL.
- **API-SPEC-007 — MUST:** unknown/empty/zero/unavailable states are explicit in DTOs; missing field cannot silently mean positive/zero.
- **API-SPEC-008 — MUST:** money has exact decimal string/minor-unit representation, currency, price/status/version; no JSON binary float as canonical amount.
- **API-SPEC-009 — MUST:** date/time is unambiguous ISO-like UTC instant plus timezone/context where needed; effective intervals explicit.
- **API-SPEC-010 — MUST:** lists are bounded and use cursor/stable pagination/filter/sort allowlists; total count MAY be omitted/approximate only when labelled.
- **API-SPEC-011 — MUST:** long-running task returns job/operation resource with stage/state/progress if known/cancel/retry/result reference.
- **API-SPEC-012 — MUST:** file upload/download is authorized purpose/object scoped; completion verifies hash/metadata; API never trusts client MIME/key alone.
- **API-SPEC-013 — MUST:** private media and signed URLs are not returned in share/analytics/admin-list DTOs; delivery grant is separate and short-lived.
- **API-SPEC-014 — MUST:** events/webhooks are versioned, authenticated, replay-protected/idempotent and contain minimum safe refs.
- **API-SPEC-015 — MUST:** rate/size/complexity limits have typed errors and do not reveal internal thresholds where unsafe.
- **API-SPEC-016 — MUST:** external dependency failure maps to safe domain status/fallback rather than generic success/zero.
- **API-SPEC-017 — MUST:** no API contract claims an AMIGO public API; partner transport is internal adapter after evidence/ADR.
- **API-SPEC-018 — MUST:** deprecated fields/states remain interpretable for supported clients/history; removal needs impact/migration plan.
- **API-SPEC-019 — MUST:** public caches vary by locale/catalog/content/version and never cache personalized/private/authorization responses.
- **API-SPEC-020 — MUST:** request/response/event logs apply schema allowlist/redaction and never record credentials, full contact, private image or free-text payload by default.

## 3. Common envelopes

Success query concept:

```text
data: resource or collection
meta: apiVersion, resourceVersion, generatedAt, dataVersion/freshness, pagination
links: typed next/previous/self where safe
```

Error concept:

```text
error: code, safeMessage, fieldErrors[], retryable, currentVersion?, allowedAction?, correlationId
```

Async command: accepted operation ID/state/location plus idempotency key echo; final resource is queried/announced separately. No `200 success` when job merely queued unless status says accepted.

## 4. Public catalog contracts

| Method/path concept | Purpose | Key response/guards |
|---|---|---|
| `GET /v1/catalog/categories` | Dynamic published families/categories | Locale, source/local version, four readiness states, cursor |
| `GET /v1/catalog/categories/{slugOrId}` | Family/system hierarchy/detail | Canonical ID/slug, aliases, media/content, readiness |
| `GET /v1/catalog/systems/{id}` | System/model/config schema summary | Verified constraints only; missing data explicit |
| `GET /v1/materials` | Compatible search/facets | Query/filter/context config; unknown semantics safe |
| `GET /v1/materials/{id}` | Exact variant identity/properties | Article/source category/assets/readiness/provenance summary |
| `GET /v1/content/{slug}` | Published page content | Active content revision, rights-approved placements |

Unpublished/blocked entities return neutral not-found/inquiry projection per policy. Client cannot request arbitrary internal fields/source credentials via include/select parameters.

## 5. Configuration and pricing contracts

| Command/query | Input | Result |
|---|---|---|
| `POST /v1/projects/configurations` | Guest/account ownership, optional base context | Draft ID/revision/schema version |
| `PATCH /v1/configurations/{id}` | Current revision, typed field changes, idempotency | New revision + invalidated dependencies/validation |
| `POST /v1/configurations/{id}:validate` | Exact revision | ValidationRun with field/rule outcomes |
| `POST /v1/configurations/{id}:duplicate` | Exact revision | New identity/revision |
| `POST /v1/quotes` | Valid configuration revision/context | Immutable preliminary quote or typed unavailable |
| `GET /v1/quotes/{id}` | Owner/share-safe permission | Historical amount/version/status/breakdown allowed |
| `POST /v1/quotes/{id}:recalculate` | Current config/context | New quote linked as superseding, old unchanged |

Dimension inputs carry raw string/value/unit; server normalizes under rule version. Price unavailable is a valid domain response status, not transport success with amount `0`.

## 6. Preview and visualization contracts

| Command/query | Privacy | Result |
|---|---|---|
| `POST /v1/previews` | Public-approved assets, owned config | Standard preview job/revision |
| `GET /v1/previews/{id}` | Owner or public-safe output scope | Status/text summary/output grant if permitted |
| `POST /v1/visualizations/uploads:initiate` | Owner/purpose/notice | Short-lived upload grant and upload ID, constraints |
| `POST /v1/visualizations/uploads/{id}:complete` | Ownership/hash/metadata | Validation job, no trust of client claims |
| `GET /v1/visualizations/{id}/candidates` | Owner only | Candidate geometry metadata and authorized display grant |
| `PUT /v1/visualizations/{id}/geometry` | Current version, normalized points/sashes | Confirmed geometry revision/validation |
| `POST /v1/visualizations/{id}:render-base` | Config/geometry revisions | Async base job |
| `POST /v1/visualizations/{id}:refine` | Ready base + consent/provider policy | Optional separate job |
| `GET /v1/visualizations/{id}` | Owner only | Safe state/revision/invariant/disclosure and short delivery grant |
| `DELETE /v1/visualizations/{id}` | Reauth/ownership as policy | Immediate access revoke + deletion operation |

Upload grants never authorize read/list, and object names cannot select another project. Late callback/complete checks deletion/expiry/current job.

## 7. Project, cart, handoff and account contracts

| Contract | Key behavior |
|---|---|
| `GET/POST /v1/projects` | Guest/account scoped; project claim separate |
| `POST /v1/projects/{id}:claim` | Account + guest proof; one-time/idempotent/no owner leak |
| `GET/POST/PATCH /v1/carts` | Revisioned owned cart; item operations commands preferred |
| `POST /v1/carts/{id}/items` | Exact configuration/quote/preview refs + quantity |
| `POST /v1/cart-items/{id}:duplicate`, `PATCH`, `DELETE` | Target-only effects and version conflicts |
| `POST /v1/handoffs` | Purpose + share-safe snapshot + minimal contact/consent |
| `GET /v1/handoffs/{opaqueRef}` | Assigned manager/owner-safe summary; expiry/revoke |
| `POST /v1/leads/{id}/transitions` | Allowed from/to command/reason/evidence/idempotency |
| `GET /v1/account/projects` | Owned customer-safe project projection |
| `GET /v1/account/requests` | Owned customer-safe request/order projection |
| `POST /v1/account/export` | Reauth/policy + async export operation/status |
| `POST /v1/account/delete` | Reauth/policy + async deletion operation/status |

External WhatsApp deep link is generated from safe snapshot/client side/server response; API does not claim delivery/read.

## 8. Admin contracts

Admin endpoints use same resources/commands under privileged versioned namespace/permissions, not arbitrary CRUD:

- source/partner records and scope revisions;
- catalog mappings/readiness/constraints/options and typed transitions;
- price versions/rules/overrides validation, approve/schedule/activate/rollback commands;
- media register/map/publish/revoke/delete impact commands;
- content revisions/review/publish/retire;
- sync run/diff/conflict resolution/approve/activate/rollback;
- lead/order/measurement/warranty transitions;
- staff capability assignments/session revoke;
- audit/health/job queries/exports under redaction.

Each mutation requires capability, exact object/revision/environment, reason, and approval evidence as policy. Generic `PATCH any field` is prohibited for state/approval/security changes.

## 9. Event and webhook contract

Event envelope: `eventId`, `eventType`, `schemaVersion`, `occurredAt`, aggregate type/ID/revision, actor type/ID safe, correlation/causation/command, business scope, redacted payload refs and classification. Consumers store processed event ID.

Representative events: catalog version activated/rolled back; price version activated; quote created; asset published/revoked; visualization ready/deletion requested/completed; handoff accepted; lead/order transitioned; role changed; sync run completed/failed. Private content/credentials absent.

Provider callback additionally validates signature/key ID/timestamp/nonce/environment, body size/schema, expected job/provider state and replay. Unknown/late/deleted callback is acknowledged/ignored safely and audited.

## 10. Error taxonomy and HTTP semantics

| Class/code examples | Semantic response |
|---|---|
| `VALIDATION_*` | Client-correctable fields, no mutation |
| `AUTH_REQUIRED`, `ACCESS_DENIED`, `RESOURCE_NOT_FOUND` | Neutral anti-enumeration policy |
| `VERSION_CONFLICT`, `STATE_TRANSITION_INVALID` | Conflict + safe current version/actions |
| `DOMAIN_DATA_MISSING`, `PRICE_UNAVAILABLE`, `MANUAL_REVIEW` | Successful domain status or typed conflict, no fake value |
| `RATE_LIMITED`, `PAYLOAD_TOO_LARGE` | Retry guidance bounded |
| `DEPENDENCY_UNAVAILABLE`, `TIMEOUT` | Retryable flag/fallback; no provider details |
| `INTEGRITY/SECURITY_REJECTED` | Fail closed, correlation, audit |
| `INTERNAL_ERROR` | Generic safe response; detailed redacted telemetry only |

Status code mapping is implementation contract after protocol selection, but semantics above are fixed. Domain unavailability is not always server failure; response must remain machine-readable.

## 11. Pagination, filtering and concurrency

Cursors are opaque and bound to query/sort/version/authorization; clients cannot edit offset to discover data. Sort/filter fields allowlisted and type-validated. Cursor expiry/version change returns restart instruction. Version/precondition applies to update/command; last-write-wins only for noncritical explicitly approved preferences.

## 12. Security, privacy, performance and analytics

TLS, secure session/CSRF/CORS/CSP, object authorization, rate/abuse, schema validation, output encoding, upload isolation, egress and secret controls are specified in security spec. Data minimization and purpose/retention apply per endpoint. Public queries support versioned cache/ETag-like semantics; private/admin no unsafe shared cache. Traces/metrics use route templates/status/code/latency/version, not raw path IDs/query/contact/body.

## 13. Acceptance and tests

Contract tests cover schemas/unknown fields as policy, auth/object matrix, idempotency, version conflicts, errors, exact money, pagination/cursors, upload spoof/completion, late callback/delete, public/private caching, redaction, event compatibility/dedup/order, provider outages and old/new client rolling compatibility. Domain AC/TS map to endpoints but API tests do not replace business tests.

## 14. Dependencies, risks and open questions

Dependencies: all domain/technical specs, auth/provider/hosting ADRs. Open: protocol/framework, public API exposure, exact status codes, browser upload flow, event broker/webhook provider, rate limits, API lifecycle/support window and WhatsApp integration mode. Risks: CRUD bypass of invariants, IDOR, non-idempotent retry, private URL leak, mixed version, error data exposure and contract overcoupling to vendor.

## 15. History

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Defined versioned resource/command/query, public/admin/visualization contracts, errors, events, idempotency and privacy boundaries. |
