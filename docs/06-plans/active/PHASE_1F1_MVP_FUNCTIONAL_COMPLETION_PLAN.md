# Phase 1F.1 — MVP functional completion plan

## 0. Execution record

| Field | Value |
|---|---|
| Status | `AUTHORIZED_PHASE_1F1_IN_PROGRESS` |
| Authorized by | `OWNER-DECISION-019`, 2026-08-12 |
| Base | merged Phase 1F `main` commit `289b1baef0b53ac7da457098353ee5e7c1e1953f` |
| Branch | `phase/1f1-mvp-functional-completion` |
| Verifiable outcome | Every published material is searchable through a bounded server-side configurator projection; compatible automatic/manual combinations produce honest quote-backed cart items; public technical leakage and critical mobile failures are removed; named staff use Argon2id password authentication and governed sessions; Russian-VPS deployment templates are prepared without deployment; the next AI approach is documentation-only. |
| Phase hold | Client accounts, client-photo upload, AI calls/generation, SAM/Python AI service, final design, Motion/Three.js/starfield, payment and Phase 1G implementation remain excluded. |

## 1. Entry evidence

- Phase 1F is reachable from `origin/main` through merge commit `289b1baef0b53ac7da457098353ee5e7c1e1953f`; the starting worktree was clean and `main` was updated with `--ff-only`.
- `/`, `/catalog`, `/configure`, `/preview`, `/cart` and `/checkout` return `200`; the pre-existing `/admin` correctly requires staff authentication.
- PostgreSQL, VersityGW, Graphile Worker and readiness endpoints are healthy; no database or storage volume was removed.
- A 390×844 Chromium pre-flight shows content, zero framework overlay/console error and zero horizontal overflow.
- The active catalog continues to use stable PostgreSQL `MaterialVariant` UUIDs and immutable `QuoteSnapshot` is already the only cart price authority.
- Node `24.18.1` exposes Argon2id through `node:crypto`; no external credential or identity provider is required.

## 2. Canonical specification boundary

- Product behavior MUST be specified once in the existing canonical files under `docs/specs/`: product, domain, UX and technical folders.
- Existing `PRODUCT_CONFIGURATOR_SPEC`, `CART_CHECKOUT_ORDERS_SPEC`, `AUTH_ACCOUNTS_SPEC`, `ADMIN_PANEL_SPEC`, `RESPONSIVE_SPEC`, `SECURITY_PRIVACY`, `DATA_MODEL`, `API_SPEC`, `ARCHITECTURE` and `DEPLOYMENT` are extended instead of creating parallel specifications.
- A new specification is created only when no canonical concern exists. Plans, ADR, policy, registers, quality gates and reports remain outside `docs/specs/` as required by `AGENTS.md`.
- Documentation validation MUST reject duplicate normative IDs, duplicate canonical spec names and misplaced `*_SPEC.md` product specifications.

## 3. Stages

| Stage | Result | Status |
|---|---|---|
| 1. Authorization and pre-flight | Decision, ADR, canonical spec profiles, gate and active plan | IN PROGRESS |
| 2. Configurator coverage | Cursor search, compatibility/manual classification and admin coverage control | PENDING |
| 3. Cart and public language | QuoteSnapshot cart actions, idempotency, Russian safe labels/errors | PENDING |
| 4. Mobile baseline | 320–430 px public/admin task paths without overflow or covered controls | PENDING |
| 5. Staff security | Argon2id login, rotation/revocation, password lifecycle, CLI and RBAC guards | PENDING |
| 6. VPS readiness and AI decision | Docker/Nginx/checklists plus documentation-only Polza/Gemini decision | PENDING |
| 7. Verification | Unit, PostgreSQL, browser, security, recovery, build and CI-equivalent | PENDING |
| 8. Documentation and delivery | Code/spec audit, completion report, clean push and Draft PR | PENDING |

Only one stage is active. Mapping gaps do not block the phase: they remain non-selectable diagnostics or explicit manual-pricing combinations where compatibility is known.

## 4. Implementation invariants

- Search is server-side, cursor-paginated and active-version-bound; the browser never receives the complete 1,655-item catalog in one bootstrap response.
- Published does not imply compatibility. Only exact active `CompatibilityRule` or an audited local coverage override may make a system/material pair selectable.
- Missing pricing never becomes a guessed formula or zero; it becomes `PRICE_ON_REQUEST` or `MANUAL_REVIEW_REQUIRED` and retains a user-facing explanation.
- Cart creation accepts only a server-created immutable quote token and is idempotent; browser amount/status/version fields are never authoritative.
- Public DTO/HTML uses Russian labels and excludes internal UUID/source/rule/version/debug fields. Owner/admin diagnostics use deliberate progressive disclosure.
- Passwords exist only transiently in process memory and as Argon2id PHC-style records at rest; no password, hash or session token is logged, put in URL, `.env` or CLI output.
- Customer authentication/routes remain absent. Only active OWNER/ADMIN/MANAGER staff may authenticate to `/admin`.
- Coverage and staff changes are validated, append-only audited and stored in local/versioned layers that AMIGO sync cannot silently overwrite.
- Production templates expose only Nginx HTTP/HTTPS; PostgreSQL, storage admin, worker, Mailpit and internal metrics are private.
- No Phase 1F.1 runtime imports, calls or instantiates Polza AI or any image-generation provider.

## 5. Verification matrix

- Unit: coverage classification/precedence/manual fallback, public labels/cart eligibility, Argon2id, throttling, rotation, staff policy and last OWNER.
- PostgreSQL: complete cursor traversal, gap diagnostics/overrides/audit, quote-to-cart/manual cart, staff login/password/session/audit and migration recovery.
- Browser: early/middle/late catalog search; automatic/manual configuration; configure/preview cart; checkout; staff login; 320/375/430 public and admin paths.
- Security: client price/status tamper, CSRF/origin, brute force/lock, fixation, development auth in production, privilege escalation, last OWNER and secret/technical-data scans.
- Recovery: database/storage failure, stale mapping, removed material, inactive PriceVersion, duplicate cart command and revoked/expired staff session.
- Final: docs/IDs/links/spec uniqueness, format, architecture, lint, typecheck, tests/coverage, migrations, production build, browser, artifacts/secrets and exact CI-equivalent gate.

## 6. Logical commits

1. `docs: authorize Phase 1F.1`
2. `fix: complete configurator material coverage`
3. `feat: add configurator coverage diagnostics`
4. `fix: restore configurator and preview cart actions`
5. `fix: replace client technical labels`
6. `fix: establish critical mobile responsiveness`
7. `feat: add production staff password authentication`
8. `feat: add staff security administration`
9. `chore: add Russian VPS deployment readiness`
10. `test: verify MVP functional completion`
11. `docs: complete Phase 1F.1`

## 7. Stop and delivery

Stop only at the user-defined destructive/source-model/QuoteSnapshot/Argon2/AI/final-design boundaries. Do not reset history, delete data, deploy production, merge the PR or begin the next phase. Completion requires QG-431–480 evidence, clean worktree, pushed branch and an unmerged Draft PR titled `Phase 1F.1: MVP functional completion and staff authentication`.
