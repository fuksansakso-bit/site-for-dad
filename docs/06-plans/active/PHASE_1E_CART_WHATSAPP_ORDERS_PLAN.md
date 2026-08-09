# Phase 1E — cart, guest requests, WhatsApp and basic order intake plan

## 0. Execution record

| Field | Value |
|---|---|
| Status | `IN_PROGRESS` |
| Authorized by | `OWNER-DECISION-016`, 2026-08-09 |
| Base | merged `main` commit `65780067537418a3230bb3d32ef3fb8e0af06917` |
| Branch | `phase/1e-cart-whatsapp-orders` |
| Verifiable outcome | Guest can collect multiple immutable quote snapshots, submit one immutable request, open/copy a fixed-recipient WhatsApp summary, view a PII-free public summary, and staff can process the request without changing its price history. |
| Next phase | Phase 1F is explicitly excluded and requires a separate written decision. |

## 1. Entry evidence

- Phase 1D tip `64ecf6e034e06137442fc1d38259b069277b46b2` is contained in merged `origin/main` commit `65780067537418a3230bb3d32ef3fb8e0af06917`.
- Initial tree was clean before environment start and after reverting the Next-generated `next-env.d.ts` path change.
- `main` was updated with `git pull --ff-only`; history and volumes were not rewritten or deleted.
- PostgreSQL, VersityGW, worker and web report healthy; `/catalog`, `/configure`, `/preview` and readiness return HTTP 200.
- Existing real Chromium gates pass: configurator/pricing/immutable quote `4/4`; standard preview `9/9` excluding unchanged visual snapshots.
- `TBD-BIZ-005` and `TBD-PRIV-002/004/005` remain production PII blockers. Phase 1E local/CI evidence uses synthetic contact data and does not deploy production collection.

## 2. Fixed scope

In scope: HttpOnly guest cart, multiple quote-backed items, duplicate/remove/clear/edit-via-new-snapshot, server totals and mixed statuses, guest checkout, free measurement, neutral installment interest, immutable request snapshots, fixed `wa.me` recipient, copy/open communication events, revocable PII-free summary, minimal OWNER/ADMIN/MANAGER administration, audit and transactional outbox.

Out of scope: payment/acquiring, automated credit/installment, official WhatsApp API or delivery status, SMS/email auth, accounts, CRM/production board, client-photo/AI, landing/starfield/redesign, production provider/secrets/deployment, catalog/pricing expansion and Phase 1F+.

## 3. Stages

| Stage | Result | Status |
|---|---|---|
| 1. Authorization and plan | Canonical decision, cart spec, entry QG and active plan | COMPLETED |
| 2. Guest cart domain | Contracts, exact totals/statuses, guest ownership and persistence | **IN_PROGRESS** |
| 3. Immutable checkout/request | Cart/item snapshots, idempotent intake, audit/outbox | PENDING |
| 4. WhatsApp and public summary | Fixed recipient, safe message/events, revocable PII-free route | PENDING |
| 5. Basic administration and integrations | Request list/detail/status/notes plus configure/preview cart CTA | PENDING |
| 6. Verification | Unit/contract/integration/browser/security/recovery/build/CI-equivalent | PENDING |
| 7. Documentation and delivery | Completion docs/QG, clean tree, push and unmerged Draft PR | PENDING |

Only one stage is in progress. A stage advances only after its relevant tests and documentation are current.

## 4. Implementation boundaries

- Domain code remains framework-independent; Next.js Route Handlers/pages orchestrate existing packages.
- PostgreSQL/Prisma migration is additive and reviewed; immutable request/item snapshots and audit/outbox evidence cannot be updated as price source data.
- Guest secrets and public reference tokens are random; only hashes are stored. Public reference does not authorize PII/admin access.
- Cart amounts are reconstructed from `QuoteSnapshot.snapshot`; request inputs have no amount field.
- Request transaction writes snapshot, communication/audit evidence and required outbox rows atomically.
- Admin dev sessions reuse existing identity/RBAC. MANAGER never changes quote/price/version fields.
- No external message is sent. `WHATSAPP_LINK_OPENED` records only an attempted handoff.

## 5. Logical commits

1. `docs: authorize Phase 1E`
2. `feat: add guest cart domain`
3. `feat: add immutable cart checkout snapshot`
4. `feat: add guest request intake`
5. `feat: add WhatsApp handoff`
6. `feat: add safe request summary`
7. `feat: add basic request administration`
8. `feat: integrate cart with configurator and preview`
9. `test: verify cart requests and WhatsApp flow`
10. `docs: complete Phase 1E`

Small gate-fix commits MAY be added when a concrete verification failure requires a separately reviewable correction; history will not be squashed or rewritten.

## 6. Verification matrix

- Unit: totals, mixed statuses, quantity, free services, old-version warning, phone normalization, reference entropy/hash, WhatsApp formatting and status transitions.
- Contract: cart/checkout/summary/handoff/admin schemas, strict unknown fields, safe errors and fixed recipient.
- Integration: quote→cart, edit replacement, immutable old quote/request, idempotent checkout, audit/outbox, public redaction and permissions.
- Browser: calculated/request/manual items, multiple items, remove/checkout/measurement/installment/copy/open/public/admin/status and 375×812 layout.
- Security/privacy: CSRF/origin, cross-guest ownership, price/recipient tamper, public enumeration/PII exclusion, manager price denial and log/analytics scan.
- Recovery: database/preview/WhatsApp unavailable, worker restart, changed PriceVersion and stale cart item.
- Final: format, docs/IDs/links/scope, lint, typecheck, coverage, migrations, build, browser, secret/PII scans and `ci:verify` or an exact documented equivalent.

## 7. Stop and rollback

Stop only for the explicit user conditions: Phase 1D absent from main, unusable immutable quote, required client-price trust, unsafe guest session/public reference, official WhatsApp API/production secret requirement, forced account/AI/payment scope or data-model conflict with immutable snapshots.

Rollback disables cart/request routes, preserves immutable quotes/audit/outbox/request records under the unresolved retention gate, stops future worker effects safely and uses forward migration compensation. PostgreSQL and object-storage volumes are never removed.

## 8. Completion

Completion requires every QG-321+ acceptance item to have repository/runtime evidence, updated report and traceability, clean worktree, pushed branch and an unmerged Draft PR titled `Phase 1E: cart, guest requests and WhatsApp handoff`. Phase 1F remains untouched.
