# Phase 1E — cart, guest requests, WhatsApp and basic order intake completion report

## 0. Result

`PASSED_PHASE_1E_CART_WHATSAPP_ORDERS` on 2026-08-09. The phase delivers a guest multi-item cart, immutable request intake, fixed-recipient WhatsApp handoff, PII-free public summary and minimal staff processing. Phase 1F was not started.

## 1. Base and branch

Base: merged Phase 1D `main` commit `65780067537418a3230bb3d32ef3fb8e0af06917`. Branch: `phase/1e-cart-whatsapp-orders`. The initial tree was clean; `main` was fast-forwarded without history rewrite, and PostgreSQL/object-storage volumes were preserved.

## 2. Logical commits

`d6be02f` authorization; `488651a` cart domain; `c1809e6` immutable checkout snapshot; `6c2443d` request intake; `ca4efff` WhatsApp; `b08bb40` safe summary; `9c63049` administration; `0444a5d` configurator/preview integration; `1068e87` verification and hydration-safe catalog pagination; the completion documentation commit closes this report.

## 3. Routes

- Cart: `http://127.0.0.1:3000/cart`.
- Checkout: `http://127.0.0.1:3000/checkout`.
- Safe summary: `http://127.0.0.1:3000/request/{cryptographic-public-reference}`.
- Staff intake: `http://127.0.0.1:3000/admin/requests` and `/admin/requests/{requestNumber}`.

## 4. Cart and immutable request model

`GuestCartSession` stores only a token hash and lifecycle; the random token is carried in an HttpOnly/SameSite cookie and becomes Secure in production. `GuestCart` owns `CartItem`; each item points to one immutable `QuoteSnapshot`, while `CartItemRevision` records add/replace/duplicate/remove history. Editing restores the original selection, creates a new quote and replaces only the item reference.

Checkout atomically creates `OrderInquiry` plus immutable `cartSnapshot` and `RequestItemSnapshot` rows. It pins request number, guest/cart, contacts and consent, flags, known subtotal/status, catalog/price version sets, source/correlation/audit context and item quote/preview snapshots. Database triggers reject update/delete of request composition and amount/version fields.

## 5. Pricing result

`FULLY_PRICED`, `PARTIALLY_PRICED` and `PRICE_ON_REQUEST` are supported. `CALCULATED`, `PRICE_ON_REQUEST` and `MANUAL_REVIEW_REQUIRED` item states receive human labels; no unknown amount is rendered or summed as zero. The mixed-cart browser case showed the known preliminary subtotal, one clarification count and «Часть стоимости уточнит менеджер». Measurement, delivery and installation are separate free rows.

An active PriceVersion change never mutates old quote/request bytes. The server reports «Расчёт создан по предыдущей версии цены. Менеджер подтвердит сумму» and leaves recalculation voluntary.

## 6. Guest checkout and services

Name, normalized phone, locality, optional bounded address/comment, consent, free measurement and installment-interest fields are validated server-side. The request body has no amount field and checkout is idempotent. The real PostgreSQL test persisted both optional flags and four exact outbox topics without inventing installment conditions or claiming an order.

## 7. WhatsApp handoff

The server owns the literal recipient `79635851036` and returns only `https://wa.me/79635851036?text={encoded-message}`; a client recipient or amount field is rejected. The message includes greeting, request number, item count and safe item labels/article/dimensions/quantity, known preliminary amount/manual-price note, measurement/installment requests, locality and safe public link. It excludes UUIDs, version IDs, storage keys, audit and contact details.

Only `REQUEST_CREATED`, `WHATSAPP_LINK_GENERATED`, `WHATSAPP_LINK_OPENED`, `MESSAGE_COPIED` and `STATUS_CHANGED` exist. Opening a deep link records only `WHATSAPP_LINK_OPENED`; no sent/delivered/read claim or automatic attachment exists. Local UI also exposes copyable text and the localhost limitation.

## 8. Safe public summary

The public token is 256-bit random, non-sequential and non-PII; only its SHA-256 hash is indexed and it can be revoked. The summary exposes immutable items, safe preview proxy, pricing disclosure, free services, 2–7 calendar-day lead time and 12-month warranty. It excludes phone, exact address, notes, audit, internal IDs and storage credentials; guessed references return neutral `404` under a rate limit.

## 9. Staff intake and authorization

Existing synthetic OWNER/ADMIN/MANAGER sessions protect list/detail/status/note/cancel actions. OWNER/ADMIN can use the complete five-status transition policy. MANAGER can read, add notes and use allowlisted normal transitions, but cannot reopen cancelled requests or mutate quote, PriceVersion or captured amount. Status/note commands use optimistic concurrency, CSRF/origin, idempotency, audit and safe errors.

## 10. Verification evidence

`pnpm test:phase1e` passed one real PostgreSQL integration scenario and one Chromium end-to-end scenario. The database case proves quote→cart, mixed totals, edit/new quote, immutable old quote/request, simulated active-price drift, idempotent checkout, flags, exact audit/outbox topics, public redaction and staff permissions. The browser case proves calculated plus request-price items, duplicate/edit/remove, mobile cart/checkout, price/recipient/CSRF/ownership tamper rejection, request/WhatsApp/copy/public/admin/status/note flows and zero page/console errors.

Recovery mapping tests return safe retryable `503` for database failure and safe `404/503` for missing/unavailable preview. A graceful full local stop/start retained all 40 Phase 1E outbox rows and restored database, storage, web and worker health. WhatsApp-open failure retains message/copy fallback; changed PriceVersion and stale edit state remain explicit.

Seven runtime log files were scanned for the synthetic test name/phone/address with zero matches. No Phase 1E analytics call accepts contact name, phone, address or comment. Public-summary and cross-guest tests exclude PII and enforce ownership.

## 11. Final gate and delivery

Pinned Node 24 `pnpm ci:verify` passed all 9 stages in 349.4 seconds: frozen install; format/docs/scope/boundary; lint/type; unit/contract coverage; empty/repeat/upgrade/drift/recovery migrations; storage restart; build/artifact/scale; 25 baseline and 5 active-catalog browser cases; repository secret and configured critical-advisory gate. One high advisory remains below the configured critical threshold and is not represented as production readiness. A post-CI `pnpm test:phase1e` again passed the real PostgreSQL and Chromium flow.

The branch is pushed and an unmerged Draft PR titled `Phase 1E: cart, guest requests and WhatsApp handoff` targets `main`; its URL is recorded in the final handoff.

Online payment/acquiring, credit automation, SMS/e-mail auth, accounts, full CRM/manufacturing, client-photo/AI, final landing/starfield/redesign, production deployment and Phase 1F are absent.
