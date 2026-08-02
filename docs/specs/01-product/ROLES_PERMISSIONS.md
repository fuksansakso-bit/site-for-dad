# Roles and permissions PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Draft 0B — logical RBAC/ownership contract |
| Версия | 0.1.0 |
| Дата | 2026-08-02 |
| Scope | Public, client, staff, service identities and approvals |
| Security detail | [SECURITY_PRIVACY.md](../04-technical/SECURITY_PRIVACY.md) |

## 1. Назначение и границы

Документ задаёт capability-based RBAC, object ownership, separation of duties и audit requirements. Он не выбирает identity provider, session implementation или MFA technology. Любая операция, не разрешённая явно, запрещена.

Actors:

- `GUEST` — anonymous browser with scoped guest capabilities/tokens;
- `CUSTOMER` — authenticated person with ownership-limited access;
- `MANAGER` — staff actor handling leads, measurements, quotes and communications;
- `ADMIN` — operational catalog/system administrator, not automatically owner of every approval;
- `OWNER` — business decision and high-risk approval role;
- `CONTENT_MANAGER` — content/media lifecycle role;
- `SYNC_SYSTEM` — non-human identity limited to ingest/staging/diff/activation commands granted by policy;
- `AI_WORKER` — non-human identity limited to private visualization jobs;
- future support/security/auditor capabilities may be separate; they are not silently inherited from `ADMIN`.

## 2. Нормативные требования

- **RBAC-001 — MUST:** authorization is deny-by-default and checks actor, capability, object scope, current state and requested transition server-side.
- **RBAC-002 — MUST:** authentication alone does not grant access to a cart, project, photo, quote, lead or order; ownership/assignment is checked independently.
- **RBAC-003 — MUST:** guest tokens are opaque, narrowly scoped, revocable and expiring; they are not user IDs and do not authorize administrative actions.
- **RBAC-004 — MUST:** customer access is limited to resources owned/claimed by that account or explicitly shared through an approved mechanism.
- **RBAC-005 — MUST:** manager access to leads/orders is assignment/team/policy scoped and excludes price-rule, partner-rights and role administration unless separately granted.
- **RBAC-006 — MUST:** `ADMIN` is decomposed into capabilities; a broad label never bypasses separation of duties.
- **RBAC-007 — MUST:** partner permission scope and high-risk rights revocation require `OWNER` or a separately delegated rights approver.
- **RBAC-008 — MUST:** content mapping and publication approval are distinct capabilities; policy MAY require different actors for high-risk assets.
- **RBAC-009 — MUST:** creating/editing a price version and activating it are distinct capabilities; self-approval is blocked when separation policy applies.
- **RBAC-010 — MUST:** sync identity writes only immutable captures/staging/diffs and executes activation/rollback only under an approved command/policy.
- **RBAC-011 — MUST:** AI worker receives only a job-scoped input/output reference, configuration/geometry/assets required for the job and no catalog/admin/account browsing permission.
- **RBAC-012 — MUST:** private media access uses short-lived authorized delivery; object names/URLs are not authorization evidence.
- **RBAC-013 — MUST:** role/capability changes revoke or re-evaluate active sessions/tokens according to risk and create an audit event.
- **RBAC-014 — MUST:** forbidden and cross-tenant/cross-owner attempts return a neutral response without resource-existence disclosure.
- **RBAC-015 — MUST:** every mutation stores actor/service identity, capability, object, from/to version/state, timestamp, reason and correlation ID.
- **RBAC-016 — MUST:** audit access is read-only, scoped and logged; an actor cannot edit/delete its own audit evidence through normal product operations.
- **RBAC-017 — MUST:** emergency access, if adopted, needs time limit, explicit reason, alert and post-event review; none is assumed in 0B.
- **RBAC-018 — MUST:** exports exclude secrets/private media and apply the same row/object permissions as interactive access.
- **RBAC-019 — MUST:** support impersonation is prohibited unless separately designed, approved and visibly audited; it is not an implicit admin feature.
- **RBAC-020 — MUST:** service credentials and user sessions are separate identities with minimum scopes, rotation/revocation and no shared secret in logs/docs.

## 3. Capability catalog

| Capability | Meaning | High-risk |
|---|---|---|
| `catalog.read_public` | Read locally published catalog | No |
| `project.guest_manage` | Manage one guest-token project/cart | Medium |
| `project.own_manage` | Manage owned customer project/cart | Medium |
| `visualization.own_create` | Upload/process own private photo | High privacy |
| `visualization.own_delete` | Revoke/delete own private revisions | High privacy |
| `lead.own_create` | Submit own/guest lead | Medium |
| `lead.assigned_read/update` | Handle assigned leads | High PII |
| `order.assigned_transition` | Apply allowed operational transition | High business |
| `quote.create` | Create preliminary/manager draft quote | High money |
| `quote.confirm` | Confirm allowed quote revision | High money |
| `catalog.stage/edit` | Edit local/staged catalog mapping | High data |
| `catalog.publish` | Activate/publicize catalog records | High public |
| `price.stage/edit` | Prepare rules/snapshot version | Critical money |
| `price.activate/rollback` | Change active version pointer | Critical money |
| `asset.register/map` | Register provenance and mappings | High rights |
| `asset.publish/revoke` | Change public delivery status | Critical rights |
| `partner.scope_approve` | Confirm/modify permission scope | Critical legal/brand |
| `sync.capture/stage/diff` | Automated source processing | High data |
| `sync.activate/rollback` | Execute approved activation | Critical data |
| `user.role_manage` | Grant/revoke staff capabilities | Critical security |
| `audit.read` | Inspect immutable audit events | High security |
| `system.configure` | Change safe operational config | Critical operations |

## 4. Permission matrix

Legend: `A` allowed within scope, `R` request/review only, `—` denied, `P` policy/approval command only.

| Resource / operation | Guest | Customer | Manager | Admin | Owner | Content | Sync | AI worker |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Published catalog read | A | A | A | A | A | A | limited | limited job |
| Guest project/cart CRUD | A token | claim only | R by handoff | R support policy | R | — | — | — |
| Owned project/cart CRUD | — | A own | R by assignment | R support policy | R | — | — | — |
| Private photo upload/read | A own token | A own | R explicit support | — default | — default | — | — | P job only |
| Private photo delete | A own token | A own | R request | — default | — default | — | — | P delete job only |
| Lead create | A | A | A manual | A support | A | — | — | — |
| Lead read/update | own receipt | own safe view | A assigned | A scoped | A scoped | — | — | — |
| Order transition | — | — | A allowed | A allowed | A override policy | — | — | — |
| Quote draft | request | request | A | A | A | — | — | — |
| Quote confirm | — | accept evidence | A capability | A capability | A | — | — | — |
| Catalog stage/edit | — | — | R | A capability | A | A content fields | P staging | — |
| Catalog publish | — | — | — | A capability | A | R | P approved command | — |
| Price stage/edit | — | — | R | A capability | A | — | P staging | — |
| Price activate/rollback | — | — | — | A separate capability | A | — | P approved command | — |
| Asset register/map | — | own upload only | R | A capability | A | A | P metadata | job input read |
| Asset publish/revoke | — | own delete only | — | A capability | A | A capability | P invalidation | P output only |
| Partner scope approve | — | — | — | R | A | R | — | — |
| Role management | — | own profile only | — | A delegated | A | — | — | — |
| Audit read | own receipts | own receipts | scoped | A capability | A | scoped | own run | own job |
| Audit modify/delete | — | — | — | — | — | — | — | — |

## 5. Object-level ownership and assignment

| Object | Access boundary | Claim/share rule |
|---|---|---|
| Guest cart/project | Hashed scoped token + expiry | Can be claimed once after proving token and account identity |
| Customer project | `ownerAccountId` | Share only via separately approved invitation; none assumed |
| Visualization | Project ownership + revision purpose | Manager access requires explicit support purpose/policy, not a WhatsApp URL |
| Lead | Submitter safe receipt; staff assignment/team | Linking customer requires proof; phone match alone is insufficient |
| Order | Customer relationship + staff assignment | Internal notes remain staff-only |
| Catalog/price version | Capability + state/version | Activation subject to approval policy |
| Media asset | Rights/content capability + domain mapping | Public read only if delivery status active |
| Sync run | Service identity + operator read scope | Manual actions require admin/owner capability |
| Audit event | Subject-scoped receipt or authorized reviewer | Immutable; sensitive details minimized/redacted |

## 6. State-transition authorization

A role cannot set arbitrary target state. Authorization uses a transition policy:

`authorize(actor, capability, aggregateId, currentVersion, fromState, requestedTransition, context)`

The conceptual response is `ALLOW`, `DENY`, `REAUTH_REQUIRED`, `APPROVAL_REQUIRED` or `CONFLICT`. It includes a non-sensitive reason code. Business transition matrices reside in domain specs.

Examples:

- manager may move assigned `CREATED → IN_REVIEW`, but not activate a PriceVersion;
- content manager may stage/mapping assets, but rights scope change routes owner review;
- sync worker may create `STAGED`, but cannot invent approval identity;
- customer may request cancellation, but operational state changes only through approved workflow;
- AI worker may write its job revision but cannot list another project.

## 7. Authentication/session assumptions and TBD

No auth method is chosen. `TBD-ACCOUNT-*` must determine login identifiers, verification, recovery, MFA, session duration, device management and deletion. Until then:

- specs require phishing/replay/enumeration-resistant behavior but do not name a provider;
- admin/owner high-risk actions require step-up capability in design, mechanism TBD;
- session cookies/tokens must be protected, rotated and revocable;
- CSRF/XSS/session fixation controls are mandatory independent of provider;
- service identities use workload credentials, never staff passwords.

## 8. Validation, errors and edge cases

- stale role/session after revocation → deny/re-auth, no mutation;
- two concurrent approvers → version conflict; only one transition commits;
- actor loses assignment mid-form → recheck on submit;
- guessed sequential ID → neutral not found/denied and rate-limit evidence;
- guest token leaked → short scope/TTL/revocation; no account/admin access;
- deleted account with legal/audit retention → revoke access, pseudonymize where policy permits;
- owner unavailable → no implicit promotion of admin; approval stays pending;
- sync/AI retry → same service identity/job key and idempotent result;
- support screenshot/export → policy and redaction, no private object URL.

## 9. Failure behavior

| Failure | Required behavior |
|---|---|
| Identity provider unavailable | Existing valid sessions follow approved risk policy; login/high-risk reauth may fail closed; public catalog remains |
| Authorization service/config unavailable | Mutations and private reads fail closed; public reads may continue from safe config |
| Audit sink unavailable | Critical mutations fail or use an approved durable local outbox; never silently unaudited |
| Session store conflict | Reauthenticate/refresh; never broaden permissions |
| Clock skew | Server authority and bounded validation; log operational signal without secrets |

## 10. Security, privacy, performance and analytics

Authorization decisions must not include secrets in client errors. Private access and failed attempts are auditable; logs use object/actor pseudonymous IDs and reason codes. Permission checks are designed for bounded latency and cache only safe policy data with revocation strategy. Analytics may count auth success/failure and role-level workflow completion in aggregates, never credentials, tokens, photo URLs or sensitive lead contents.

## 11. Acceptance and tests

Core AC: `AC-AUTH-001`, `AC-ADMIN-001`, `AC-SEC-001`, `AC-PARTNER-001`, `AC-ASSET-MAP-001`, `AC-PRICE-ACTIVATE-001`. Required tests: anonymous/object ownership matrix, horizontal/vertical privilege escalation, stale role, CSRF, session expiry, service identity scope, approval separation, audit failure and export redaction.

## 12. Dependencies, risks and open questions

Dependencies: `AUTH_ACCOUNTS_SPEC`, `ADMIN_PANEL_SPEC`, `SECURITY_PRIVACY`, domain state machines and ADR for auth. Open: `TBD-BIZ-001`, `TBD-ACCOUNT-*`, `TBD-INFRA-*`, staff/team model, emergency access and approval thresholds. Main risks are role explosion, broad admin bypass, broken object-level authorization, leaked guest tokens and unaudited service identities.

## 13. История изменений

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Определены восемь actors, 22 capabilities, object ownership, separation of duties, state authorization и failure behavior. |
