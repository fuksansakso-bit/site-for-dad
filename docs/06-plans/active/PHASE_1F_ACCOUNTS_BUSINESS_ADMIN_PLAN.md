# Phase 1F — business administration, request management, portfolio and settings plan

## 0. Execution record

| Field | Value |
|---|---|
| Status | `COMPLETED — PASSED_PHASE_1F_BUSINESS_ADMINISTRATION` |
| Authorized by | `OWNER-DECISION-017`, narrowed by `OWNER-DECISION-018`, 2026-08-09 |
| Base | merged `main` commit `49695099b0eee3db4a4357eb3f3eb36f78fa3389` |
| Branch | `phase/1f-accounts-business-admin` |
| Verifiable outcome | A unified Russian staff administration workspace, request/CRM-contact operations, portfolio and settings operate on the existing PostgreSQL, Prisma, Graphile Worker, StoragePort, RBAC, audit, outbox and error boundaries while the customer journey remains entirely guest-only. |
| Next phase | Phase 1G, client-photo/AI, payment and production deployment remain excluded. |

## 1. Entry evidence

- Phase 1E is contained in merged `origin/main`; the starting tree was clean and `main` was fast-forwarded without history rewrite.
- PostgreSQL, VersityGW, Graphile Worker and web are healthy; `/catalog`, `/configure`, `/preview`, `/cart`, `/checkout` and `/api/v1/health/ready` respond successfully.
- Existing guest flow remains authoritative; customer registration and login are absent from MVP.
- `TBD-BIZ-005` and `TBD-PRIV-002/004/005/006` continue to block production PII and production rollout; Phase 1F verification uses local Mailpit and synthetic identities/data.

## 2. Fixed scope

In scope: staff-only passwordless e-mail code login through `EmailDeliveryPort`, local Mailpit, hashed one-time codes and staff sessions, OWNER-created staff invitations and OWNER/ADMIN/MANAGER roles, unified Russian `/admin`, request operations, `CustomerContact`/lead CRM views derived from request contacts, internal manager notes, portfolio lifecycle and local media processing, `SiteSettings`, audit and durable background tasks.

Out of scope and deferred post-MVP: customer registration/login/OTP/provider/session, every `/account` route, guest-to-account migration, saved cross-device projects, account favorites/order history/reorder, password/social/SMS auth, production e-mail provider, arbitrary historical request claiming, payment/acquiring, automated installment, full CRM/manufacturing, client photos, AI, final landing/starfield redesign, production deployment and Phase 1G+.

## 3. Stages

| Stage | Result | Status |
|---|---|---|
| 1. Authorization and revised scope | Decision, ADR amendment, profile specs, gate and this plan | COMPLETED |
| 2. Staff identity | Staff-only OTP, sessions, Mailpit and invitation delivery | COMPLETED |
| 3. Staff and admin shell | Role lifecycle, last-OWNER guard and unified Russian admin | COMPLETED |
| 4. Business operations | Requests, CRM contacts/notes, portfolio, SiteSettings, audit and worker tasks | COMPLETED |
| 5. Verification | Unit, contract, PostgreSQL, browser, security, guest regression, build and CI-equivalent | COMPLETED |
| 6. Documentation and delivery | Completion report/gates, clean tree, push and unmerged Draft PR | COMPLETED |

Only one stage is active. Concrete verification failures may add a small reviewable fix commit; history is not squashed.

## 4. Security and data boundaries

- Codes expire after 10 minutes, allow at most five checks and cannot be resent before 60 seconds. Only keyed hashes are stored; responses and timings remain enumeration-neutral.
- Staff sessions have an absolute 12-hour limit and rotate/revoke on security or privilege changes. Cookies are HttpOnly, SameSite=Strict and Secure in production.
- Staff authorization is checked at the data-access boundary. Staff creation is invitation-only except the local-only OWNER bootstrap. No customer authentication provider or account credential exists.
- CRM contacts are business records derived from voluntarily supplied request contact fields, not identities. Repeat request linking never creates an account or rewrites immutable request snapshots.
- Portfolio originals enter private storage, pass bounded MIME/signature/decode/dimension/hash/filename/metadata checks, and become publicly deliverable only after explicit rights and publication approval. Client photos are never eligible.
- E-mail/invitation delivery, staff session/code cleanup and media processing use versioned Graphile Worker jobs with minimal non-PII payloads.

## 5. Logical commits

1. `docs: authorize Phase 1F`
2. `docs: narrow Phase 1F to business administration`
3. `feat: add staff passwordless authentication`
4. `feat: add staff invitations and role lifecycle`
5. `feat: unify Russian administration shell`
6. `feat: expand request management`
7. `feat: add customer contact administration`
8. `feat: add portfolio administration`
9. `feat: add site settings and audit views`
10. `feat: complete Phase 1F background jobs`
11. `test: verify Phase 1F flows`
12. `docs: complete Phase 1F`

## 6. Verification matrix

- Unit/contract: staff OTP expiry/attempt/resend, token hashing/rotation/revocation, permission matrix, invite lifecycle, last-OWNER guard, CRM-contact linking, settings validation, portfolio validation and safe DTO/errors.
- PostgreSQL: additive clean/repeat/upgrade/drift migration, staff auth/session/invite transactions, immutable request preservation, contact deduplication, audit/outbox and worker replay.
- Browser: guest funnel unchanged and never asks for registration; staff login/logout/invite/role; all required admin routes; request/contact/settings/portfolio actions; 375×812, keyboard/focus and no console/page errors.
- Security/privacy: enumeration, brute force/rate, CSRF/origin, fixation/replay, IDOR, vertical/horizontal privilege escalation, filename/MIME/polyglot/EXIF rejection, log/artifact/HTML secret and PII scans.
- Recovery: Mailpit unavailable, worker restart, expired/replayed code/invite, revoked session, database/storage/media failure and preserved retryable state.
- Final: format, docs/IDs/links/scope, lint, typecheck, coverage, migrations, production build, browser and exact CI-equivalent gate.

## 7. Stop and rollback

Stop if Phase 1E is absent, any customer account/authentication route appears, the guest funnel requires registration, browser price becomes authoritative, production e-mail/provider/PII is required, last OWNER can be removed, private/client media can become public, or Phase 1G/payment/AI is required. Rollback disables staff routes and delivery jobs, revokes staff sessions/invitations, preserves append-only audit and immutable business records, and uses forward migration compensation without deleting PostgreSQL or object-storage volumes.

## 8. Completion

The revised QG-371–420 evidence, twelve logical commits, completion report, clean worktree, pushed branch and unmerged Draft PR [#5](https://github.com/bataevabdullah2009-pixel/site-for-dad/pull/5) satisfy completion. Final result: `PASSED_PHASE_1F_BUSINESS_ADMINISTRATION`. Phase 1G remains untouched.
