# Phase 1F — customer accounts and business administration plan

## 0. Execution record

| Field | Value |
|---|---|
| Status | `IN_PROGRESS — AUTHORIZED_PHASE_1F` |
| Authorized by | `OWNER-DECISION-017`, 2026-08-09 |
| Base | merged `main` commit `49695099b0eee3db4a4357eb3f3eb36f78fa3389` |
| Branch | `phase/1f-accounts-business-admin` |
| Verifiable outcome | Optional passwordless customer accounts and a unified Russian staff administration workspace operate on the existing PostgreSQL, Prisma, Graphile Worker, StoragePort, RBAC, audit, outbox and error boundaries. |
| Next phase | Phase 1G, client-photo/AI, payment and production deployment remain excluded. |

## 1. Entry evidence

- Phase 1E is contained in merged `origin/main`; the starting tree was clean and `main` was fast-forwarded without history rewrite.
- PostgreSQL, VersityGW, Graphile Worker and web are healthy; `/catalog`, `/configure`, `/preview`, `/cart`, `/checkout` and `/api/v1/health/ready` respond successfully.
- Existing guest flow remains authoritative and registration stays optional.
- `TBD-BIZ-005` and `TBD-PRIV-002/004/005/006` continue to block production PII and production rollout; Phase 1F verification uses local Mailpit and synthetic identities/data.

## 2. Fixed scope

In scope: passwordless e-mail code login through `EmailDeliveryPort`, local Mailpit, hashed one-time codes and sessions, account workspace, guest ownership migration, saved projects/calculations/requests/favorites/profile/security, OWNER-created staff invitations and OWNER/ADMIN/MANAGER roles, unified Russian `/admin`, customer/request operations, portfolio lifecycle and local media processing, `SiteSettings`, audit and durable background tasks.

Out of scope: password auth, social login, SMS, production e-mail provider, arbitrary historical request claiming, account deletion without retention decision, payment/acquiring, automated installment, full CRM/manufacturing, client photos, AI, final landing/starfield redesign, production deployment and Phase 1G+.

## 3. Stages

| Stage | Result | Status |
|---|---|---|
| 1. Authorization and entry gate | Decision, ADR, profile specs, QG-361–370 and this plan | COMPLETED |
| 2. Identity and guest migration | OTP, sessions, Mailpit, account ownership migration | IN_PROGRESS |
| 3. Customer workspace | Account shell, projects, calculations, requests, favorites, profile/security | PENDING |
| 4. Staff and admin shell | Invitations, role lifecycle, last-OWNER guard and unified Russian admin | PENDING |
| 5. Business operations | Customer/request views, portfolio, SiteSettings, audit and worker tasks | PENDING |
| 6. Verification | Unit, contract, PostgreSQL, browser, security, recovery, build and CI-equivalent | PENDING |
| 7. Documentation and delivery | Completion report/gates, clean tree, push and unmerged Draft PR | PENDING |

Only one stage is active. Concrete verification failures may add a small reviewable fix commit; history is not squashed.

## 4. Security and data boundaries

- Codes expire after 10 minutes, allow at most five checks and cannot be resent before 60 seconds. Only keyed hashes are stored; responses and timings remain enumeration-neutral.
- Customer sessions expire after 30 days and rotate; staff sessions have an absolute 12-hour limit. Cookies are HttpOnly, SameSite and Secure in production; login, privilege and role changes rotate or revoke sessions.
- Customer and staff authorization is checked at the data-access boundary. Staff creation is invitation-only; customer login never grants staff access.
- Guest migration requires the same browser's hashed cart/preview ownership secrets and is atomic/idempotent. Immutable quote/request bytes are not rewritten.
- Portfolio originals enter private storage, pass bounded MIME/signature/decode/dimension/hash/filename/metadata checks, and become publicly deliverable only after explicit rights and publication approval. Client photos are never eligible.
- E-mail/invitation delivery, guest migration, session/code cleanup and media processing use versioned Graphile Worker jobs with minimal non-PII payloads.

## 5. Logical commits

1. `docs: authorize Phase 1F`
2. `feat: add passwordless email authentication`
3. `feat: migrate guest ownership into accounts`
4. `feat: add customer account workspace`
5. `feat: add saved projects and favorites`
6. `feat: add staff invitations and role lifecycle`
7. `feat: unify Russian administration shell`
8. `feat: add customer administration`
9. `feat: add portfolio administration`
10. `feat: add site settings and audit views`
11. `test: verify Phase 1F flows`
12. `docs: complete Phase 1F`

## 6. Verification matrix

- Unit/contract: OTP expiry/attempt/resend, token hashing/rotation/revocation, permission matrix, invite lifecycle, last-OWNER guard, settings validation, portfolio validation and safe DTO/errors.
- PostgreSQL: additive clean/repeat/upgrade/drift migration, auth/session/invite transactions, guest claim idempotency, immutable quote/request preservation, audit/outbox and worker replay.
- Browser: guest funnel unchanged; registration/login/logout; account sections; staff invite/role; all required admin routes; request/customer/settings/portfolio actions; 375×812, keyboard/focus and no console/page errors.
- Security/privacy: enumeration, brute force/rate, CSRF/origin, fixation/replay, IDOR, vertical/horizontal privilege escalation, filename/MIME/polyglot/EXIF rejection, log/artifact/HTML secret and PII scans.
- Recovery: Mailpit unavailable, worker restart, expired/replayed code/invite, revoked session, database/storage/media failure and preserved retryable state.
- Final: format, docs/IDs/links/scope, lint, typecheck, coverage, migrations, production build, browser and exact CI-equivalent gate.

## 7. Stop and rollback

Stop if Phase 1E is absent, guest funnel must require registration, browser price becomes authoritative, production e-mail/provider/PII is required, last OWNER can be removed, private/client media can become public, or Phase 1G/payment/AI is required. Rollback disables new routes and delivery jobs, revokes new sessions/invitations, preserves append-only audit and immutable business records, and uses forward migration compensation without deleting PostgreSQL or object-storage volumes.

## 8. Completion

Completion requires QG-371–420 evidence, twelve logical commits, completed report, clean worktree, pushed branch and an unmerged Draft PR titled `Phase 1F: customer accounts and business administration`. Phase 1G must remain untouched.
