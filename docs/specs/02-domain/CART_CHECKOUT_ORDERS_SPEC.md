# Cart, checkout and orders specification PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Draft 0B — cart/handoff contract defined; final operational state machine `BLOCKED_BY_TBD-BIZ-004` |
| Версия | 0.1.0 |
| Дата | 2026-08-02 |
| Pricing | [PRICING_CALCULATOR_SPEC.md](PRICING_CALCULATOR_SPEC.md) |
| Installment | [INSTALLMENT_SPEC.md](INSTALLMENT_SPEC.md) |

## 1. Назначение и границы

Документ задаёт multi-item cart/project, save/share, WhatsApp/measurement handoff, lead, quote and order lifecycle. PROJECT_NAME is consultation/measurement-driven; public handoff is not automatic purchase or order confirmation.

In scope: guest/customer ownership, item revisions/quantity, totals/statuses, stale price handling, share-safe snapshot, minimal contact data, free measurement request, manager workflow, confirmed quote relationship, order/client-safe statuses, cancellation/warranty linkage.

Out of scope: online payment, unconfirmed scheduling UI, automated installment approval, final manufacturing workflow/stock reservation before business process approval and legal terms not provided.

## 2. Actors and permissions

Guest/customer manages own cart/project and creates handoff. Manager handles assigned lead/measurement/quote/order transitions. Admin/owner reviews exceptions and policies. Sync/AI do not create orders. WhatsApp is a communication channel; it is not the source of truth for order state.

## 3. Aggregate model

| Aggregate/entity | Key fields and relationships |
|---|---|
| `Project` | ID/revision, guest/account owner, title optional, status, configuration/preview references |
| `Cart` | ID/revision, owner scope, status, item IDs, totals/status summary, created/updated/expiry |
| `CartItem` | configuration revision, quantity, quote revision/status, optional preview revision, warnings |
| `HandoffSnapshot` | immutable share-safe cart/project summary, purpose, opaque ref, expiry/revocation |
| `Lead` | source/purpose, contact consent/data, snapshot ref, state, assignment, audit |
| `MeasurementRequest` | lead/project, region/address scope, requested/scheduled/completed/cancelled states |
| `Quote` | immutable preliminary/manager-confirmed revisions from pricing spec |
| `Order` | confirmed quote/customer/measurement refs, state, customer-safe mapping, audit |
| `WarrantyClaim` | order, issue/evidence refs, state/outcome, statutory safeguard |

## 4. Нормативные требования

- **CART-SPEC-001 — MUST:** cart item references an immutable configuration revision; editing creates a new revision and updates only that item.
- **CART-SPEC-002 — MUST:** quantity is an explicit positive integer within approved limits; duplicate is a separate item identity with copied revision.
- **CART-SPEC-003 — MUST:** cart supports multiple windows/items with independent validity, price, preview and warning states.
- **CART-SPEC-004 — MUST:** cart total is shown only for components with a consistent valid interpretation; unavailable/stale items are explicit and never treated as zero-priced products.
- **CART-SPEC-005 — MUST:** historical quote amount remains visible as historical, but submission requiring current price must revalidate or flag manager confirmation.
- **CART-SPEC-006 — MUST:** guest use does not require registration; ownership token is scoped/expiring and claim to account is secure/idempotent.
- **CART-SPEC-007 — MUST:** handoff snapshot is immutable, minimal and separate from mutable cart so manager sees exactly what was sent.
- **CART-SPEC-008 — MUST:** WhatsApp message is editable and includes opaque reference plus approved summary, not credentials, internal rules/notes or private storage URLs.
- **CART-SPEC-009 — MUST:** failed WhatsApp deep link offers a confirmed fallback contact/reference without falsely recording a sent message.
- **CART-SPEC-010 — MUST:** lead creation/submit is idempotent and distinct from opening an external WhatsApp client.
- **CART-SPEC-011 — MUST:** handoff/lead/measurement request does not create `CONFIRMED` order or promise slot/price/availability.
- **CART-SPEC-012 — MUST:** free measurement, delivery and installation statements apply only to confirmed assortment and `BUSINESS-REGION-001` scope.
- **CART-SPEC-013 — MUST:** preliminary lead summary uses confirmed lead time 2–7 calendar days including weekends only with the product/service scope and disclosure defined in global spec; no exact completion date is inferred.
- **CART-SPEC-014 — MUST:** warranty statement is 12 months from installation/handover with confirmed coverage/exclusions and statutory-rights safeguard; claim process details stay pending.
- **CART-SPEC-015 — MUST:** manager transitions require role, assignment, current version/state, reason/evidence and audit.
- **CART-SPEC-016 — MUST:** customer sees only safe mapped order status and public notes; internal notes, costs and staff data remain private.
- **CART-SPEC-017 — MUST:** manager-confirmed quote is a new revision and never overwrites preliminary quote.
- **CART-SPEC-018 — MUST:** cancellation/request does not physically delete financial/audit records; access/retention follows legal/privacy policy.
- **CART-SPEC-019 — MUST:** warranty issue cannot be automatically rejected because order lookup/evidence is incomplete or exclusion causation is unproven.
- **CART-SPEC-020 — MUST:** duplicate/retry/out-of-order channel callbacks cannot create multiple leads/orders or regress state.
- **CART-SPEC-021 — MUST:** account/contact/WhatsApp payload collects only data needed for selected purpose and displays required notice/consent.
- **CART-SPEC-022 — MUST:** cart/contact flow works without standard/AI preview and without AMIGO runtime.

## 5. Cart and project flows

### Create/add

Create cart under guest/account scope. Add exact configuration revision, quantity and current quote/preview references. Server validates ownership and reference readiness. Same idempotency key returns the prior result.

### Edit/duplicate/remove

Edit opens a new configuration revision; when valid, cart item swaps reference with optimistic concurrency. Duplicate creates new item. Remove tombstones item revision in history/audit as policy requires. Other items remain unchanged.

### Total/status

Each item has configuration `VALID/MANUAL_REVIEW/INVALID`, price `CURRENT/STALE/UNAVAILABLE`, preview optional and orderability status. Totals explicitly state inclusion. A mixed cart can be sent for manager review, but cannot present incomplete sum as full total.

### Save/claim

Guest cart/project can be claimed after authentication and proof of guest token. Claim is one-time/idempotent; histories, quotes and photo privacy remain. Token rotation/revocation follows account policy.

## 6. Share-safe WhatsApp handoff

Allowed summary:

- project/reference identifier;
- requested purpose: consultation, free measurement or installment inquiry;
- item count/quantity and safe product/system/material article/name summaries;
- preliminary total/status/version freshness only where valid;
- confirmation that preview exists via opaque app reference, not object URL;
- customer-entered message/contact fields necessary for follow-up;
- approved local service/lead-time/warranty/neutral installment text.

Prohibited payload:

- photo, mask, private CDN/object/signed URL, auth/guest token;
- source credentials, full internal pricing formula/margin/override notes;
- admin comments, other customer's data, raw analytics IDs;
- unconfirmed exact availability/date/installment terms.

Flow distinguishes `SNAPSHOT_CREATED`, `LEAD_ACCEPTED` and `EXTERNAL_CLIENT_OPENED` because only the first two can be known server-side.

## 7. Proposed lead/order state machines

### Lead

`CREATED → IN_REVIEW → CONTACTED → MEASUREMENT_PENDING/QUOTE_PENDING → CONVERTED/CLOSED/CANCELLED`. Exact states/transitions are provisional until `TBD-BIZ-004`. Failed contact does not auto-close without approved policy.

### Measurement

`REQUESTED → SCHEDULED → COMPLETED` or `CANCELLED`. `SCHEDULED` requires confirmed process/slot; no UI reserves times before `TBD-INSTALL-003`.

### Order

`DRAFT → CONFIRMED → IN_FULFILLMENT → READY/INSTALLATION_SCHEDULED → COMPLETED` with `CANCELLED` only by approved transition. This is a target model, not current operational fact; detailed manufacturing/payment/installation statuses remain TBD.

### Warranty claim

`RECEIVED → REVIEWING → INSPECTION_REQUIRED/DECISION_PENDING → RESOLVED/CLOSED`; exact SLA/evidence/remedies stay `TBD-WARRANTY-001`.

## 8. Transition contract

Each transition has `transitionId`, aggregate ID/revision, from/to state, command ID/idempotency key, actor/capability/assignment, timestamp, reason code/text, evidence refs, public note optional, policy version, correlation and outcome. State cannot be set directly.

Invalid transition returns current safe state/version and allowed next actions without applying partial side effects. External messages/notifications are outbox effects after commit and retry idempotently.

## 9. Validation and invariants

- cart owner and all referenced project/configuration/quote/preview resources match scope;
- active item quantity positive, item identity unique and references readable;
- no private URL/token/internal note in handoff snapshot;
- contact data format/purpose/notice/consent validated;
- exactly one lead per accepted idempotency command/purpose as policy;
- preliminary vs confirmed quote types cannot be conflated;
- order requires allowed lead/customer/quote/measurement prerequisites;
- state transition is allowed from current version and actor assignment;
- client-safe state mapping exists before exposure;
- service/lead/warranty/installment claims use approved content version;
- cancellation/deletion preserves mandatory audit and removes/restricts private media per policy.

## 10. Errors, edge cases and recovery

| Case | Safe behavior |
|---|---|
| Cart item catalog/price retired | Keep historical snapshot; mark stale/manual and prevent false current claim |
| One item invalid in multi-item cart | Identify it; other items preserved; no misleading full total |
| Duplicate submit/callback | Same lead/transition result via idempotency |
| WhatsApp not installed/deep link blocked | Copy contact/reference; no false sent event |
| Guest token expired | Explain recovery/claim policy without resource leak |
| Account claim conflict | Deny neutrally, no ownership transfer |
| Manager concurrent edits | Optimistic state/version conflict |
| Notification failure after commit | Outbox retry; state remains committed |
| Customer requests cancel during fulfilment | Record request and route approved policy, not immediate arbitrary state |
| Warranty order unavailable | Manual verification path, not auto rejection |
| Photo deleted after handoff | Snapshot shows preview unavailable; order/config data remains |

Source/pricing/AI/WhatsApp outage leaves cart/project and manual contact path. Audit/outbox failures for critical transitions fail closed or use approved durable transactional pattern.

## 11. Security and privacy

Server-side ownership/RBAC, CSRF protection, input/output encoding, contact rate limiting, anti-spam, opaque random refs, expiry/revocation and no account enumeration are required. Public/shared references reveal only allowed snapshot. Contact/address/order/warranty data has purpose, access, retention/delete policy; client photos remain separate private graph. WhatsApp is an external recipient and notice must describe what leaves the system.

## 12. Performance, analytics and accessibility

Cart operations are deterministic/lightweight and usable without renderer. Large preview data never embeds in cart payload. Analytics: item add/edit/remove, price status, handoff purpose, snapshot/lead accepted, manager transition and time-in-state; contact/media/free text excluded or minimized. Forms have semantic labels, error summary/focus, keyboard operation, non-color statuses and no timer pressure.

## 13. Acceptance criteria and tests

Primary: `AC-CART-001`, `AC-WHATSAPP-001`, `AC-MANAGER-CONTEXT-001`, `AC-ORDER-001`, `AC-MEASURE-001`, `AC-ORDER-STATUS-001`, `AC-QUOTE-HISTORY-001`, `AC-QUOTE-CONFIRM-001`, `AC-WARRANTY-001`, `AC-INSTALLMENT-001`.

Tests: multi-item mixed status/total; edit/duplicate/remove; stale/retired/history; guest claim/cross-owner; WhatsApp content allow/deny; idempotent submit/callback; transition table and concurrent updates; notification outage; safe customer mapping; cancel/warranty alternatives; contact validation/rate limit/CSRF; keyboard/screen reader/responsive; AMIGO/price/AI/WhatsApp outage.

## 14. Dependencies, risks and open questions

Dependencies: configurator/pricing/preview/AI/installment/auth/admin/data/API/security/observability. Open: `TBD-BIZ-003/004/005`, `TBD-INSTALL-*`, `TBD-DELIVERY-*`, `TBD-WARRANTY-001`, `TBD-ACCOUNT-*`, `TBD-PRIV-*`, `TBD-INSTALLMENT-*`, contact confirmation/SLA and cart/share TTL. Risks: handoff treated as order, private URL leak, stale price promise, duplicate lead, broad staff access, invented slot/status and legal content drift.

## 15. Связанные требования и история

Links: `FR-CART-*`, `FR-ORDER-*`, `FR-MEASURE-*`, `BUSINESS-*`, `NFR-PRIV-*`, `NFR-SEC-*`, `CART-SPEC-001`–`022`.

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Определены cart/project, safe handoff, lead/measurement/order/warranty target states, transitions, failures and tests. |
