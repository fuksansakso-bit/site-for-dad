# Admin panel specification PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Draft 0B — operational capabilities/workflows defined; UI/technology not selected |
| Версия | 0.1.0 |
| Дата | 2026-08-02 |
| Permissions | [ROLES_PERMISSIONS.md](../01-product/ROLES_PERMISSIONS.md) |
| Source flows | Catalog, pricing, media, sync and order specs |

## 1. Назначение and boundaries

Admin panel provides safe, explainable and audited operations for catalog, mappings, readiness, pricing versions, media rights/publication, partner record, sync runs, leads/orders, users/roles, content and operational status.

Out of scope: unrestricted database editor, arbitrary code/expression execution, secret display, provider console replacement, production implementation and bypassing approvals/TBD.

## 2. Actors and capability groups

| Actor/capability group | Primary scope |
|---|---|
| Catalog operator | Source/local entities, mappings, states, constraints/options review |
| Price editor | Staged snapshots/rules/overrides/validation |
| Price approver | Activate/schedule/rollback versions |
| Content manager | Media provenance/mapping/derivatives/content drafts |
| Rights approver/owner | Partner scope, publication/revocation decisions |
| Manager | Assigned leads, measurements, quotes, orders, warranty |
| Identity admin | Staff roles/scopes/session revocation |
| Owner | High-risk approvals, business decisions, dashboards |
| Auditor/read-only | Evidence/history without mutation |

## 3. Нормативные требования

- **ADMIN-SPEC-001 — MUST:** navigation/actions are capability and object-scope filtered, but server authorization remains authoritative.
- **ADMIN-SPEC-002 — MUST:** dashboard distinguishes `unknown`, `stale`, `blocked`, `pending`, `failed` and zero/healthy; missing telemetry is not green.
- **ADMIN-SPEC-003 — MUST:** every list supports stable IDs, states, source/local versions, freshness and actionable filters; sensitive fields are minimized/redacted.
- **ADMIN-SPEC-004 — MUST:** record detail separates immutable source capture, normalized mapping, local overrides and active public projection.
- **ADMIN-SPEC-005 — MUST:** high-risk mutation shows impact/diff, required evidence, target version/state and rollback/recovery before confirmation.
- **ADMIN-SPEC-006 — MUST:** catalog/price/media/role operations use typed forms/commands; arbitrary database field or executable expression editing is prohibited.
- **ADMIN-SPEC-007 — MUST:** optimistic concurrency prevents silent overwrite and offers compare/reload, not last-write-wins.
- **ADMIN-SPEC-008 — MUST:** catalog publication, availability, pricing and orderability are edited/approved independently.
- **ADMIN-SPEC-009 — MUST:** new dynamic category/source value can be staged/mapped without code release, but activation requires schema/readiness validation.
- **ADMIN-SPEC-010 — MUST:** pricing editor cannot activate own change when separation policy applies; missing parity/evidence/TBD blocks activation.
- **ADMIN-SPEC-011 — MUST:** media panel shows original/derivative graph, rights/publication states, domain mapping, usages, attribution/brand notes and delete/revoke path.
- **ADMIN-SPEC-012 — MUST:** partner scope changes are versioned, owner-approved and trigger impact review for data/media/badge surfaces.
- **ADMIN-SPEC-013 — MUST:** sync run view exposes capture version/context, stages, validation/diff/conflicts/approvals/activation/rollback without credentials.
- **ADMIN-SPEC-014 — MUST:** lead/order transition UI shows only policy-allowed targets and requires reason/evidence where specified.
- **ADMIN-SPEC-015 — MUST:** role management grants explicit capability/scope/effective interval, never a silent super-admin shortcut.
- **ADMIN-SPEC-016 — MUST:** every mutation creates immutable audit with actor, capability, before/after/version, reason, time and correlation; audit cannot be edited through panel.
- **ADMIN-SPEC-017 — MUST:** destructive/revocation operations are recoverable where possible, confirm exact targets and never use broad/unresolved selection.
- **ADMIN-SPEC-018 — MUST:** bulk operations preview exact count/IDs/impact, validate each item, report partial outcomes and use idempotent command IDs.
- **ADMIN-SPEC-019 — MUST:** exports apply row/field permissions, redaction, purpose, audit and expiry; secrets/private object URLs are excluded.
- **ADMIN-SPEC-020 — MUST:** admin dependency failures fail closed for mutation while preserving read-only evidence/known-safe operations when possible.
- **ADMIN-SPEC-021 — MUST:** admin UI meets keyboard/screen reader/focus/contrast/reduced-motion requirements, including data grids and dialogs.
- **ADMIN-SPEC-022 — MUST:** support access to customer/private visualization content is denied by default and never enabled by broad admin role.
- **ADMIN-SPEC-023 — MUST:** secrets/credentials are configured through approved secret workflow and displayed only as metadata/status, never plaintext.
- **ADMIN-SPEC-024 — MUST:** environment (development/staging/production) is prominent and dangerous production actions cannot be confused with preview.

## 4. Information architecture

| Module | Key screens/tasks |
|---|---|
| Overview | P0 blocked items, freshness, sync/price/media/lead health, approvals |
| Sources & partner | Source registry status, PartnerRelationship versions/scope/badge/evidence |
| Catalog | Hierarchy, source/local mappings, variants/properties/options/constraints/readiness |
| Availability | Evidence/status; quantitative inventory only after approval |
| Pricing | Versions, rules/categories/overrides, validation/parity, activation/rollback |
| Media & rights | Assets, mappings, derivatives/usages, publication/revocation/delete |
| Content | Pages, portfolio, partner examples, review/publication |
| Sync | Runs, captures, diffs, conflicts, approvals, activation/rollback |
| Leads & orders | Queue, assignment, measurement, quote, state transitions, warranty |
| Accounts & roles | Staff status, capability assignments, session revocation |
| Audit | Search/read/export under authorization |
| System health | Dependency/readiness/runbook links, no secret payload |

## 5. Core workflows

### Catalog mapping/publication

Review staged source entity → compare existing mapping/aliases → choose/create typed local entity → validate hierarchy/schema/relationships → set independent proposed states → review media/price/availability/orderability gates → approve/publish or leave blocked. Source capture remains immutable.

### Price activation

Open staged version → verify source/context/checksum → inspect rule/category/override diff → run validation/parity → resolve/accept approved exceptions → separate approver schedules/activates → health check/cache update → rollback if needed. Current version remains active on failure.

### Media publication/revoke

Register/review hash/provenance/rights → map exact entity/assetRole → inspect derivatives/usages/attribution → separate publication approval → deliver. Revoke blocks first, invalidates, traverses usages/derivatives and executes retention/delete.

### Sync conflict

Open run/diff conflict → see raw/normalized/current/new values and evidence → map/ignore/reject with reason → revalidate affected subset → approve activation only when all blocking conflicts resolved.

### Lead/order

Open assigned queue → inspect minimal client/project/quote context → contact/record outcome → select allowed transition → add required evidence/public note → commit/outbox. No direct status field editing.

### Role assignment

Find verified staff identity → choose explicit capabilities/scopes/effective period → impact/separation check → authorized grant → revoke affected sessions where needed → audit. Removal follows same rigor.

## 6. State and form behavior

Every edit form identifies entity/revision/environment, dirty state and last update. It supports cancel without mutation, server validation, field-level + summary errors, conflict comparison and success audit reference. Draft save never equals approval/activation.

High-risk states use two-step intent/confirmation, but confirmation is not security by itself. Typed confirmation MAY be used for revocation/rollback/bulk operations alongside capability and exact target validation. Browser back/refresh cannot resubmit command due idempotency.

## 7. Data grids, filters and detail views

Grids need server-backed pagination/filter/sort, stable row identity, column semantics, empty/error/loading states, saved views only per approved preference policy, accessible headings and no color-only status. Export is not a workaround for missing filters.

Detail view sections: identity/status, source/provenance, current local projection, relations/impact, versions/history, approvals, audit, errors/runbook. Deep links require authorization and return neutral not-found on denial.

## 8. Validation and invariants

- capability/object/environment/current version valid;
- exact target IDs resolved; no action on hidden cross-page selection without preview;
- reason/evidence/approval requirements satisfied;
- source captures/audit immutable;
- no publication without rights/mapping; no price activation without version validation;
- no order transition outside matrix; no role grant violating separation/owner policy;
- bulk command has bounded count/rate and per-item outcome;
- secrets/private URLs/customer photo contents absent from forms/exports/logs;
- stale form cannot overwrite; activation/rollback atomic/idempotent;
- approval actor distinct where policy requires.

## 9. Errors, edge cases and failures

| Case | Required behavior |
|---|---|
| Permission revoked while page open | Submit denied, no mutation, reauth/refresh |
| Concurrent edit | Conflict view with current/proposed diff |
| Partial bulk validation | No unreviewed activation; report per item; atomicity per operation policy |
| Approval target changed | Approval invalidated/re-review exact revision |
| Audit/outbox unavailable | Critical mutation fails closed or durable approved outbox |
| Search/index stale | Show freshness and fetch authoritative detail before mutation |
| Sync/provider/storage outage | Read status/runbook; no unsafe override |
| Rollback dependency issue | Keep exposure blocked, retry compensation/alert |
| Browser retry | Idempotent result/audit, no duplicate |
| Large diff | Paginate/summarize but retain exact export under permission |

## 10. Security and privacy

Staff auth/step-up/MFA boundary, CSRF/XSS/CSP, same-site/session security, strict object authorization, rate limits and secure headers are required. Admin route is not security perimeter alone. Customer PII/private media is minimized/redacted; access reason and audit required where future support access approved. Export watermarks/expiry are optional controls requiring decision; data itself remains protected.

## 11. Performance, observability and analytics

Lists use bounded queries, async jobs for large diff/export/bulk, progress/cancel/status and idempotency. No high-risk action times out ambiguously; status can be reloaded by command ID. Operational telemetry: page/task latency, validation/conflict/failure, approval age, stale data, rollback, unauthorized attempts and queue age, excluding sensitive payload. Product analytics of staff performance must have purpose/owner and avoid surveillance by default.

## 12. Acceptance criteria and tests

Primary: `AC-ADMIN-001`, `AC-CATALOG-DYNAMIC-001`, `AC-PRICE-ACTIVATE-001`, `AC-ASSET-MAP-001`, `AC-ASSET-REVOKE-001`, `AC-ROLLBACK-001`, `AC-SEC-001`, `AC-OWNER-DASHBOARD-001`.

Tests: full role/capability matrix; object/environment scope; stale edit; approval separation; exact target/bulk; dynamic category; price validation/activation/rollback; media revoke graph; sync conflicts; order transitions; role revoke/session; audit/outbox failure; export redaction; no private media; keyboard/screen reader/zoom; large lists/diffs and dependency outages.

## 13. Dependencies, risks and open questions

Dependencies: all domain modules, RBAC/auth, sync/media/storage/data/API/security/observability/deployment. Open: named roles/approvers, separation thresholds, support/private access, audit/export retention, bulk limits, alert owners, staff/team assignment and emergency access. Risks: broad admin, direct state edit, stale overwrite, approval of changed revision, secret/PII exposure, inaccessible grids and dangerous production confusion.

## 14. Связанные требования and history

Links: `FR-ADMIN-*`, `RBAC-*`, `NFR-AUDIT-*`, `ADMIN-SPEC-001`–`024`.

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Определены admin IA, capability workflows, safe mutation/approval/bulk/export contracts, failures and tests. |
