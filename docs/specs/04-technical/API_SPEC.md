# API and integration contract specification PROJECT_NAME

## Phase 2B AI contracts

Public metadata-only routes create a job, issue an exact signed upload, confirm the direct Storage upload, start/retry generation, poll owned status, issue short-lived input/result URLs and delete the owned job. They never accept full image bodies, client storage paths, material image URLs or provider responses. Admin actions expose aggregates/filters/settings/cleanup/delete/audited image grants by role; `/api/internal/ai-cleanup` accepts only a constant-time validated `CRON_SECRET`. Mutations apply origin validation, opaque guest ownership, rate limits, idempotency and correlation IDs, then map Polza diagnostics to the documented safe public error taxonomy.

## Phase 2A HTTP surface

The active surface is public/catalog/calculator/cart/checkout/request pages, a server-authoritative quote/order endpoint, `/api/health`, and staff-authenticated admin mutations. The browser cannot insert orders with the anon key. Zod validation, generic Russian errors, opaque references, origin/CSRF controls and fresh server price calculation are mandatory; UUIDs, enum internals, SQL/RLS errors and service-role details are never public DTO fields.

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Phase 1F.1 search/coverage/cart/staff-security contracts authorized and in progress |
| Версия | 0.15.0 |
| Дата | 2026-08-12 |
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
- **API-SPEC-021 — MUST:** Phase 1A error envelope contains machine-readable `code`, safe `message`, `correlationId`, HTTP status and optional validation details; server mapping also assigns logging severity.
- **API-SPEC-022 — MUST:** no client error contains stack trace, SQL, secret, internal filesystem path or another actor's data.

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

- **API-SPEC-023 — MUST:** `GET /api/v1/catalog/materials` accepts only the allowlisted search, category, system, color, availability, blackout, zebra, sort, limit and cursor fields. It returns bounded safe DTOs, hierarchy/facet counts and an opaque HMAC cursor bound to the exact filters, sort and active catalog/price version IDs; category selection includes its active descendant subtree and a stale or modified cursor is rejected.
- **API-SPEC-024 — MUST:** `GET /api/v1/catalog/materials/{slugOrId}` resolves only an eligible material in the same compatible active catalog/price pair as the list and returns a safe canonical detail DTO with active hierarchy and same-origin media reference. Missing/stale identity is neutral `404`; database/storage/integrity failure is safe `503`; list, detail and media routes never read AMIGO or staging at request time and never disclose object keys, source hashes, raw snapshots, provider URLs or credentials.

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

Implemented Phase 1C contracts:

| Route | Authoritative behavior |
|---|---|
| `GET /api/v1/configurator` | Returns only bounded compatible next values from the active PostgreSQL catalog; progressive query fields select the current step |
| `POST /api/v1/configurator/validate` | Strictly validates the current IDs/options/integer millimetres and returns safe field details/status |
| `POST /api/v1/pricing/calculate` | Re-authorizes the active CatalogVersion/PriceVersion and computes the server result; no client amount field exists |
| `POST /api/v1/quotes` | Saves only an authoritative successful calculation by idempotency key as an immutable snapshot |
| `GET /api/v1/quotes/{token}` | Returns the no-store public-safe historical snapshot through an opaque high-entropy token |

## 6. Preview and visualization contracts

| Command/query | Privacy | Result |
|---|---|---|
| `GET /api/v1/previews/scenes` | Public, fixed registry | Two safe scene descriptors; no storage locator/source URL |
| `POST /api/v1/previews/eligibility` | Guest calculation/quote ownership | Revalidated family/material/compatibility/evidence result |
| `POST /api/v1/previews` | Same-origin/CSRF/idempotency plus owned opaque calculation/quote | Guest-owned state ID and `/preview?state={id}` only |
| `GET /api/v1/previews/{id}` | Guest owner cookie | Private no-store state and safe same-origin layer references |
| `PATCH /api/v1/previews/{id}` | Guest owner, strict family-aware bounded patch | Revalidated state/checksum; immutable source snapshot untouched |
| `DELETE /api/v1/previews/{id}` | Guest owner | Deletes only temporary preview state |
| `GET /api/v1/previews/{id}/asset` | Guest owner | Exact current material bytes through `StoragePort` with MIME/hash/length checks |
| `GET /api/v1/previews/{id}/layers/{role}` | Guest owner, allowlisted role | Exact configuration product/hardware layer; no arbitrary URL |
| `GET /api/v1/previews/scenes/{sceneId}/asset` | Allowlisted scene | Immutable approved local photoreal scene bytes |
| `GET /api/v1/admin/previews/diagnostics` | OWNER/ADMIN | Aggregate eligibility/evidence/gap counts without private state/credentials |
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

Phase 1E concrete same-origin BFF contracts are:

| Route | Behavior |
|---|---|
| `GET/DELETE /api/v1/cart` | Create/read owned guest cart or idempotently clear it; server summary only |
| `POST /api/v1/cart/items` | Add an owned immutable quote and optional preview; no client amount/status |
| `PATCH/DELETE /api/v1/cart/items/{itemReference}` | Replace through a new quote or remove with revision/idempotency checks |
| `POST .../{itemReference}/duplicate`, `GET .../edit-source` | Duplicate snapshot reference or return server-owned configuration source |
| `POST /api/v1/requests` | Idempotent consented checkout into immutable `OrderInquiry` snapshots |
| `GET /api/v1/requests/public/{publicReference}` | Rate-limited PII-free immutable summary with neutral enumeration behavior |
| `POST /api/v1/requests/{publicReference}/handoff` | Fixed-recipient WhatsApp URL/message; recipient cannot be supplied |
| `POST /api/v1/requests/{publicReference}/events` | Idempotent `WHATSAPP_LINK_OPENED` or `MESSAGE_COPIED` evidence only |
| `GET /api/v1/requests/public/{publicReference}/items/{sequence}/preview` | Safe same-origin preview proxy/fallback |

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

Phase 1C implements `GET /api/v1/admin/pricing`, `POST /api/v1/admin/pricing/activate`, `POST /api/v1/admin/pricing/reject`, `POST /api/v1/admin/pricing/parity` and `POST`/`DELETE /api/v1/admin/pricing/overrides`. Mutations require a current OWNER/ADMIN session, exact version/rule state, signed same-origin request, idempotency key, reason and correlation; MANAGER and anonymous actors fail closed. Responses expose safe diff/parity/audit summaries, never raw source payloads or internals.

Phase 1E implements `GET /api/v1/admin/requests`, `GET/DELETE /api/v1/admin/requests/{requestNumber}`, `POST .../status` and `POST .../notes`. Existing session/RBAC is re-evaluated per request. Status/note/cancel commands require same-origin CSRF, idempotency and expected version; no endpoint accepts quote, PriceVersion or captured amount mutation.

## 9. Event and webhook contract

Event envelope: `eventId`, `eventType`, `schemaVersion`, `occurredAt`, aggregate type/ID/revision, actor type/ID safe, correlation/causation/command, business scope, redacted payload refs and classification. Consumers store processed event ID.

Representative events: catalog version activated/rolled back; price version activated; quote created; asset published/revoked; visualization ready/deletion requested/completed; handoff accepted; lead/order transitioned; role changed; sync run completed/failed. Private content/credentials absent.

Provider callback additionally validates signature/key ID/timestamp/nonce/environment, body size/schema, expected job/provider state and replay. Unknown/late/deleted callback is acknowledged/ignored safely and audited.

## 10. Error taxonomy and HTTP semantics

| Class/code examples | Semantic response |
|---|---|
| `VALIDATION_ERROR` / 400 | Client-correctable fields in optional details, no mutation |
| `AUTHENTICATION_REQUIRED` / 401, `PERMISSION_DENIED` / 403, `NOT_FOUND` / 404 | Neutral anti-enumeration policy |
| `CONFLICT` / 409 | Version/state conflict + safe current actions where authorized |
| `DOMAIN_DATA_MISSING`, `PRICE_UNAVAILABLE`, `MANUAL_REVIEW` | Successful domain status or typed conflict, no fake value |
| `RATE_LIMITED` / 429 | Retry guidance bounded |
| `DEPENDENCY_UNAVAILABLE` / 503 | Retryable flag/fallback; no provider details |
| `INTEGRITY/SECURITY_REJECTED` | Fail closed, correlation, audit |
| `INTERNAL_ERROR` / 500 | Generic safe response; detailed redacted telemetry only |

The eight Phase 1A foundation codes and mappings above are fixed. More specific future domain codes MAY extend them without exposing internals. Domain unavailability is not always server failure; response must remain machine-readable.

## 11. Pagination, filtering and concurrency

Cursors are opaque and bound to query/sort/version/authorization; clients cannot edit offset to discover data. Sort/filter fields allowlisted and type-validated. Cursor expiry/version change returns restart instruction. Version/precondition applies to update/command; last-write-wins only for noncritical explicitly approved preferences.

## 12. Security, privacy, performance and analytics

TLS, secure session/CSRF/CORS/CSP, object authorization, rate/abuse, schema validation, output encoding, upload isolation, egress and secret controls are specified in security spec. Data minimization and purpose/retention apply per endpoint. Public queries support versioned cache/ETag-like semantics; private/admin no unsafe shared cache. Traces/metrics use route templates/status/code/latency/version, not raw path IDs/query/contact/body.

## 13. Acceptance and tests

Contract tests cover schemas/unknown fields as policy, auth/object matrix, idempotency, version conflicts, errors, exact money, pagination/cursors, upload spoof/completion, late callback/delete, public/private caching, redaction, event compatibility/dedup/order, provider outages and old/new client rolling compatibility. Domain AC/TS map to endpoints but API tests do not replace business tests.

## 14. Phase 1A–1F implementation record

Phase 1A concrete routes remain `GET /api/v1/health/live` and `GET /api/v1/health/ready`. Phase 1B implements the server-authorized `/admin/catalog` slice through Next.js Server Actions rather than a generic CRUD route. The Phase 1B.2 staff read model covers the complete selected AMIGO source with bounded server filters/pages, hierarchy facets, safe sealed-manifest counts, run stages/checkpoints, differences and immutable review/bulk history; object keys, credentials, source hashes, raw snapshots and parser-internal payloads remain redacted. Every mutation re-evaluates the HttpOnly SameSite session and role server-side. OWNER/ADMIN commands keep preparation, exact two-step bulk apply, composition, selected/all difference review, approval, activation, rollback, cancellation and retry distinct and bind them to exact source/run/version/checksum/count state with generated correlation/idempotency evidence.

The Phase 1B.2 public catalog implements `GET /api/v1/catalog/materials` and `GET /api/v1/catalog/materials/{slugOrId}` with strict unknown-field rejection, a maximum page size of 50, active hierarchy/facets, allowlisted search/category/system/color/availability/blackout/zebra filters, four allowlisted sort modes and an opaque HMAC cursor bound to the exact query plus active catalog and price version IDs. Both routes resolve only one compatible `ACTIVE/PUBLIC` immutable `CatalogVersion` and `PriceVersion` pair; no active pair yields a safe empty catalog and no staging/source fallback. List/detail DTOs expose safe display fields, category path, explicit availability/price status and same-origin media references but no object key, source hash, raw snapshot or storage credential. `GET /api/v1/catalog/media/{assetId}?v={catalogVersionId}` accepts only a media asset pinned in the current active composition with approved rights/publication, loads through the provider-neutral storage port and verifies MIME, byte length and SHA-256 again before delivery. Stale entity/version/asset references are neutral `404`; database/storage/integrity failure is safe `503`; no signed provider URL or anonymous bucket is exposed.

Phase 1C routes use strict shared runtime schemas, 32 KiB mutation bodies, same-origin signed double-submit CSRF, an explicit 60-request/minute in-process boundary, correlation IDs, idempotent calculation/save/admin mutations and `Cache-Control: no-store` for pricing and snapshots. The adapter resolves all labels, compatibility, rules, active versions and totals from PostgreSQL in one server trust boundary. Safe statuses include `CALCULATED`, `PRICE_ON_REQUEST`, `MANUAL_REVIEW_REQUIRED`, `CONFIGURATION_INVALID`, `SOURCE_DATA_STALE`, `PRICE_VERSION_INACTIVE` and `DEPENDENCY_UNAVAILABLE`; SQL, stack traces, secret values and internal dependency details are excluded.

Phase 1D preview routes reuse the same origin/CSRF/rate/idempotency/correlation boundary and accept only Zod-validated safe IDs, scene IDs, layer roles and bounded controls. Every private read/update/delete resolves the owner-key hash from the HttpOnly guest cookie; state responses are `no-store`. Product assets resolve server-side from the validated family/model/article mapping and checksum-bound manifest, then `StoragePort` revalidates source marker, MIME, length and SHA-256. No route accepts a remote URL, trusted price or full configuration object, and safe errors expose neither stack traces nor object-storage credentials.

Phase 1E cart/request routes use strict shared Zod schemas, 32 KiB mutation limits, signed same-origin CSRF, hashed HttpOnly guest ownership, per-boundary rate limits, correlation and private/no-store responses. Quote, product labels, statuses, versions and money are reloaded server-side. Checkout/audit/outbox is one PostgreSQL transaction; public reads are hash-verified, revocable, rate-limited and PII-free. The fixed WhatsApp recipient is a contract literal, not request input.

## 15. Phase 1F contract profile

- **P1F-API-001 — MUST:** staff-auth contracts expose request-code, verify-code, session/logout and invitation acceptance with strict schemas, neutral responses, no code/session hash and `no-store`; they never create customer credentials.
- **P1F-API-002 — SUPERSEDED:** every customer account contract is deferred post-MVP by `OWNER-DECISION-018`; `/v1/account/*` is absent in Phase 1F.
- **P1F-API-003 — MUST:** admin contracts expose bounded dashboard/customer/portfolio/settings/staff/audit data and preserve existing catalog/pricing/request commands instead of generic CRUD.
- **P1F-API-004 — MUST:** portfolio upload accepts bounded multipart bytes, ignores client filename for storage identity and returns no object key, signed URL or processing internals.
- **P1F-API-005 — MUST:** mutations enforce content/body limits, origin/CSRF, current session/capability, optimistic concurrency and idempotency where retry can duplicate effects.
- **P1F-API-006 — MUST:** staff-only CustomerContact/list/detail/request-history/note contracts are bounded, capability-filtered and never return credentials, auth state or internal notes to a publicReference endpoint.
- **P1F-API-007 — MUST NOT:** any customer-facing request, checkout, WhatsApp or publicReference contract requires login or issues a customer session.

## 16. Dependencies, risks and open questions

### 16.1. Phase 1F.1 API profile

- **P1F1-API-001 — MUST:** configurator material search is `GET`, active-version bound and accepts family/system/model/query/filter/cursor/limit; response includes only public display fields, compatibility/pricing classification and next cursor.
- **P1F1-API-002 — MUST:** complete cursor traversal is deterministic, capped and rejects invalid/stale/context-mismatched cursors without exposing signature or query internals.
- **P1F1-API-003 — MUST:** coverage summary/list and mutation endpoints are staff-authorized, no-store, runtime-validated, revision/idempotency/audit aware and return safe reason codes plus optional authorized diagnostic projection.
- **P1F1-API-004 — MUST:** cart add from configuration/preview accepts a quote token only; server resolves guest ownership and cart eligibility and returns cart item count plus stable item reference.
- **P1F1-API-005 — MUST:** staff password login accepts `identifier` and `password` only, returns generic success/failure DTO, rotates cookie server-side and never returns actor existence, password/hash or raw session token.
- **P1F1-API-006 — MUST:** password change, logout-all, individual revoke and staff lifecycle endpoints require current session, CSRF/origin, expected revision/idempotency where mutating and return no secret material.
- **P1F1-API-007 — MUST:** public error payload has Russian explanation, action/retry path and optional correlation ID; raw exception/debug/internal IDs are forbidden.

Dependencies: all domain/technical specs, auth/provider/hosting ADRs. Next.js same-origin BFF and Foundation error status mapping are accepted; open: public API exposure, browser upload flow, future webhook transport, concrete rate limits, API lifecycle/support window and WhatsApp mode. Risks: CRUD bypass of invariants, IDOR, non-idempotent retry, private URL leak, mixed version, error data exposure and contract overcoupling to vendor.

## 17. History

| Версия | Дата | Изменение |
|---|---|---|
| 0.15.0 | 2026-08-12 | Authorized bounded configurator coverage, quote-only cart and password/session/staff API profiles. |
| 0.1.0 | 2026-08-02 | Defined versioned resource/command/query, public/admin/visualization contracts, errors, events, idempotency and privacy boundaries. |
| 0.2.0 | 2026-08-02 | Fixed the eight Phase 1A safe error codes, HTTP mapping, correlation/validation envelope and prohibited disclosures. |
| 0.3.0 | 2026-08-02 | Recorded the two implemented health routes and verified that no business API or mutation route entered Phase 1A. |
| 0.5.0 | 2026-08-03 | Recorded the implemented Phase 1B.1 catalog-admin Server Actions, exact role/checksum/idempotency boundaries and token/object-key redaction; public catalog routes remain gated. |
| 0.6.0 | 2026-08-03 | Recorded the active-version-only public catalog/material-media routes, allowlisted facets, version-bound HMAC cursor, safe empty/degraded behavior and byte/MIME/SHA delivery checks without object-locator disclosure. |
| 0.7.0 | 2026-08-03 | Recorded the Phase 1B.2 full-source admin read model and separately authorized typed Server Actions for safe manifest/progress/diff/history display, exact bulk/review/composition/activation/rollback flows and per-submit server authorization. |
| 0.8.0 | 2026-08-03 | Recorded the full active-only public hierarchy/list/detail contracts, allowlisted sort and descendant filters, query/version-bound HMAC cursor, safe DTO/ETag behavior and PostgreSQL-only runtime with version-pinned local media. |
| 0.9.0 | 2026-08-08 | Recorded the concrete configurator/validation/calculation/quote and pricing-admin routes with strict schemas, active-version authority, CSRF/origin/rate/idempotency/correlation/no-store boundaries and safe statuses delivered in Phase 1C. |
| 0.10.0 | 2026-08-08 | Recorded the scenes/eligibility/state/asset/layer/delete/admin-diagnostics contracts, guest ownership, safe caching/errors and local-only asset resolution delivered in Phase 1D. |
| 0.11.0 | 2026-08-09 | Recorded concrete Phase 1E cart/request/public-summary/WhatsApp/admin routes with immutable server authority, guest/RBAC ownership, idempotency, safe errors and fixed recipient. |
| 0.12.0 | 2026-08-09 | Authorized strict neutral auth, self-scoped account and bounded business-admin/portfolio/settings contracts for Phase 1F. |
| 0.13.0 | 2026-08-09 | `OWNER-DECISION-018` removes customer account contracts and narrows auth to staff; adds bounded credential-free CustomerContact/history/note administration while preserving guest/publicReference APIs. |
| 0.14.0 | 2026-08-09 | Recorded implemented staff auth/session/invitation, unified admin, CustomerContact/note, portfolio/settings/audit routes and safe errors/caching/rate/origin/idempotency evidence; `/account` and customer-auth contracts remain absent. |
