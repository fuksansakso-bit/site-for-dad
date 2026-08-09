# Phase 1F — business administration, request management, portfolio and settings completion report

## 0. Result

| Field | Evidence |
|---|---|
| Status | `PASSED_PHASE_1F_BUSINESS_ADMINISTRATION` |
| Product decisions | `OWNER-DECISION-017`, narrowed by `OWNER-DECISION-018` before customer-authentication WIP was committed |
| Base | merged `main` commit `49695099b0eee3db4a4357eb3f3eb36f78fa3389` |
| Branch | `phase/1f-accounts-business-admin` |
| Delivery | Unmerged Draft PR [#5](https://github.com/bataevabdullah2009-pixel/site-for-dad/pull/5) targeting `main` |
| Scope boundary | Staff/business administration only; customer accounts and Phase 1G are absent |

Phase 1F delivers a single Russian staff workspace for requests, request-derived customer contacts, catalog/pricing/sync operations, portfolio, business settings, staff and audit. The public customer journey remains guest-only and does not require registration.

## 1. Delivered runtime

- `/login` provides staff-only passwordless e-mail authentication. A code is single-use, stored only as a keyed hash, expires after 10 minutes, allows five attempts and has a 60-second resend boundary. Requests are enumeration-neutral and rate-limited.
- `EmailDeliveryPort` uses local Mailpit for development and CI. Sealed delivery payload tests prove that OTP, invitation token and recipient are absent from stored plaintext, API responses, logs and audit metadata.
- Staff sessions are hash-only, revocable and rotation-aware, expire absolutely after 12 hours and use HttpOnly, SameSite=Strict cookies with Secure enabled in production.
- OWNER, ADMIN and MANAGER have server-side capabilities. Invitations are hash-only and single-use, role changes revoke sessions, and PostgreSQL advisory locks/triggers protect the final active passwordless OWNER.
- `/admin`, `/admin/requests`, `/admin/customers`, `/admin/portfolio`, `/admin/settings`, `/admin/staff`, `/admin/audit`, `/admin/sync`, `/admin/catalog`, `/admin/pricing` and `/admin/preview` share one responsive Russian shell.
- Request administration keeps immutable captured prices and public references, adds bounded status changes and staff-attributed internal notes, and supports revoking a public reference.
- `CustomerContact`, `CustomerContactRequest` and `CustomerContactNote` form a credential-free CRM projection derived from request phone/e-mail data. Repeated normalized phones link to request history without creating an identity or rewriting request snapshots.
- Portfolio originals enter private `StoragePort` storage, undergo bounded image validation and derivative processing, and require separate rights/publication review before controlled public delivery. No real Business Owner work was seeded or published by this phase.
- Versioned `SiteSettings` drive WhatsApp/contact data, free services, 2–7-day manufacturing lead time, 12-month warranty and the exact neutral installment text. Settings changes and business mutations are audited.
- Versioned Graphile Worker jobs cover e-mail delivery, staff cleanup and portfolio processing; no customer migration or customer-authentication job exists.

## 2. Customer-account removal

No customer registration, login, OTP, magic link, account provider/session, `/account`, saved account project, account favorite, guest migration, account order history or customer security screen exists. `CUSTOMER` remains only a reserved architectural role. `/account` returns 404.

The unchanged customer path is `/catalog` → `/configure` → `/preview` → `/cart` → `/checkout` → request → WhatsApp/publicReference. Public request summaries remain the post-submission access mechanism.

## 3. Data and recovery

The additive Phase 1F migrations create staff challenges/sessions/invitations, sealed e-mail delivery, rate limits, request-derived contacts/notes, portfolio and SiteSettings. A forward schema-alignment migration preserves already-created local Phase 1F data and makes Prisma relation/update semantics drift-free.

Empty deploy, repeated deploy, upgrade, drift, queue migration replay and rollback-compensation gates pass. The preserved local PostgreSQL/VersityGW environment survived a graceful stop/start; database, storage, Mailpit, web and worker returned healthy without volume reset.

## 4. Verification evidence

- `pnpm check`: formatting, architecture boundaries, lint, strict typecheck and all workspace tests passed.
- Exact Node 24.18.1 / pnpm 11.18.0 stages passed for frozen install, documentation/ID/link/scope validation, lint/typecheck, coverage, PostgreSQL migration/job/identity integration, VersityGW contract/restart, production build, artifact scan and the 2,048-item scale gate.
- After replacing the obsolete shared-admin-token browser assertion with the staff `/login` contract, the pinned browser smoke passed 25/25 across Chromium, Firefox, WebKit, narrow mobile and reduced-motion profiles; 75 data-plane-dependent cases were intentionally skipped in that isolated smoke.
- The isolated active-catalog browser acceptance passed 5/5 across the same profiles with zero runtime AMIGO requests.
- Committed-secret scan passed across 573 repository files; critical dependency audit and license inventory exited successfully. The audit reported two non-critical-for-the-configured-threshold high findings and zero critical findings.
- Live local checks passed OWNER bootstrap, neutral code request, Mailpit/worker delivery, code verification, invitation acceptance, MANAGER login, authenticated access to every required admin section, last-OWNER denial, CustomerContact backfill/notes and registration-free public routes.

The exact nine-stage CI-equivalent acceptance is complete. During the final umbrella run, the first seven stages passed before an obsolete Phase 1A browser assertion stopped stage eight; that assertion was corrected and the pinned browser, catalog-browser and final security/license stages were rerun successfully.

## 5. Commit and delivery record

The branch keeps twelve reviewable logical commits:

1. `docs: authorize Phase 1F`
2. `docs: narrow Phase 1F to business administration`
3. `feat: add staff passwordless authentication`
4. `feat: add staff invitations and role management`
5. `feat: add unified business admin shell`
6. `feat: expand staff request management`
7. `feat: add request-derived customer contacts`
8. `feat: add governed local portfolio`
9. `feat: add business settings and audit`
10. `fix: complete business administration runtime`
11. `test: verify Phase 1F scope`
12. `docs: complete Phase 1F`

## 6. Remaining holds

Production PII/legal/retention/provider decisions remain blocked by their existing `TBD-*` records. Real portfolio content still requires Business Owner assets and rights evidence. Production deployment/providers, payment/credit automation, client-photo/AI, final redesign, full CRM/manufacturing, customer accounts and Phase 1G+ remain outside this result.

Completion of Phase 1F grants no authority to start Phase 1G.
