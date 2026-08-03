# Installment specification PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Draft / `BLOCKED_BY_TBD-INSTALLMENT-001`–`013`; neutral manual MVP flow approved |
| Версия | 0.1.0 |
| Дата | 2026-08-02 |
| Canonical phrase | «Доступна рассрочка. Уточните условия у менеджера» |
| Handoff | [CART_CHECKOUT_ORDERS_SPEC.md](CART_CHECKOUT_ORDERS_SPEC.md) |

## 1. Назначение and boundaries

Спека позволяет клиенту выразить интерес к рассрочке без неподтверждённых финансовых обещаний. Until provider, legal basis, terms, eligibility, payload and privacy are approved, the product performs no calculation, application, scoring, document collection or approval.

## 2. Actors, roles and permissions

Guest/customer views neutral text and sends interest. Manager responds manually using approved information outside/through future controlled workflow. Owner/legal/provider approve content, eligibility and processing. Admin cannot invent terms. No AI/sync worker evaluates applicants.

## 3. Нормативные требования

- **INST-SPEC-001 — MUST:** every public mention uses exactly the approved neutral phrase until all dependent legal/content decisions are accepted.
- **INST-SPEC-002 — MUST:** no claim of `0%`, no overpayment, no down payment, a specific term/rate, universal availability or guaranteed approval appears without evidence and legal approval.
- **INST-SPEC-003 — MUST:** CTA wording is `Уточнить условия`/equivalent inquiry, not `Оформить/Получить одобрение`.
- **INST-SPEC-004 — MUST:** current flow records only inquiry purpose and minimal cart/quote/contact context permitted for manager response.
- **INST-SPEC-005 — MUST:** installment interest does not change lead/order/quote state to approved/paid/confirmed.
- **INST-SPEC-006 — MUST:** preliminary amount may accompany the inquiry only with its own preliminary/version/stale status.
- **INST-SPEC-007 — MUST:** missing price does not block inquiry and does not create an amount.
- **INST-SPEC-008 — MUST:** no passport, income, employment, credit, bank or sensitive financial documents are uploaded/collected in neutral MVP flow.
- **INST-SPEC-009 — MUST:** any future provider data transfer requires separate notice/legal basis/consent as applicable, data minimization, contract and security/privacy review.
- **INST-SPEC-010 — MUST:** provider response/webhook cannot become authoritative order payment state without authenticated, idempotent, approved contract.
- **INST-SPEC-011 — MUST:** refusal/eligibility details are not inferred, exposed to unauthorized staff or used for unrelated analytics.
- **INST-SPEC-012 — MUST:** terms/content are versioned by effective interval, provider/product/region and retained with any future application.
- **INST-SPEC-013 — MUST:** installment surfaces fail closed to neutral inquiry when provider/terms/configuration is unavailable.
- **INST-SPEC-014 — MUST:** manager free text cannot be promoted automatically to public financial terms.
- **INST-SPEC-015 — MUST:** acceptance tests scan all public/metadata/structured-data surfaces for prohibited claims.

## 4. Current MVP flow

1. Product shows the canonical phrase near eligible consultation/cart contexts without claiming eligibility.
2. User selects `Уточнить условия у менеджера`.
3. Handoff snapshot includes `purpose=INSTALLMENT_INQUIRY`, project/cart reference, preliminary quote status/amount if available, and minimal contact data.
4. WhatsApp message remains editable and neutral.
5. Lead records interest only; manager follows approved manual process.
6. Product stores no sensitive financial application data and shows no automated result.

Alternative: WhatsApp unavailable → confirmed contact/reference. Price unavailable → message says project/price requires clarification, not a guessed amount. User declines contact consent → no lead; catalog/cart remain.

## 5. Future state model (inactive until approval)

Possible conceptual states: `INTEREST_RECORDED`, `TERMS_PRESENTED`, `CONSENTED`, `APPLICATION_STARTED`, `SUBMITTED`, `PROVIDER_PENDING`, `APPROVED`, `DECLINED`, `EXPIRED`, `CANCELLED`, `ERROR`. These are not operationally approved. Each future transition would require provider/version/actor/timestamp/evidence and separate client/order mapping.

Current system only uses `INTEREST_RECORDED` at lead-purpose level; it MUST NOT imply provider application state.

## 6. Data contract

Current allowed fields: inquiry ID, lead/project/cart/quote opaque refs, purpose, contact channel/data required for reply, notice/consent version if applicable, createdAt, source surface and status `INTEREST_RECORDED`.

Prohibited current fields: passport/identity document, income/employer, credit history, bank/card/account data, desired fabricated term/rate, scoring attributes and provider tokens.

Future application schema is not defined until `TBD-INSTALLMENT-001`–`013` and legal/privacy/security reviews close.

## 7. Validation, errors and edge cases

- stale quote → preserve status/date/version in inquiry;
- no quote → no numeric substitute;
- multiple cart items → summary can show item count/current partial status, not misleading eligible total;
- underage/capacity/region/product eligibility → no automatic claim before rules; manager clarification;
- duplicate click → idempotent interest/lead according to handoff key;
- terms change → historical application (future) pins version; current public content uses active approved version;
- provider/WhatsApp outage → neutral manual contact or unavailable message, no fake acceptance;
- deleted project/photo → inquiry retains minimal business reference, no private media;
- manager responds with unapproved term → not stored/published as product truth.

Errors: `INQUIRY_CONTACT_INVALID`, `HANDOFF_UNAVAILABLE`, `QUOTE_STALE`, `TERMS_NOT_APPROVED`, `PROVIDER_UNAVAILABLE` (future). They never disclose financial eligibility.

## 8. Security, privacy, performance and analytics

Contact fields use cart/lead security, CSRF/rate-limit/anti-spam and purpose limitation. No financial/special-category data collection in current flow. Future provider redirect/API/webhook needs signed state, anti-replay/idempotency, secret isolation, data inventory, retention/delete and DSAR mapping.

Current flow adds negligible payload and cannot block catalog/cart. Analytics may count neutral CTA view/click and inquiry accepted by surface/quote status, not inferred credit eligibility, sensitive fields or manager chat content.

## 9. Acceptance criteria and tests

Primary: `AC-INSTALLMENT-001`, `AC-WHATSAPP-001`, `AC-PRIV-001`, `AC-SEC-001`.

Tests: exact phrase across screens/SEO/schema/messages; prohibited claim keyword/content review; no sensitive fields/network payload; no price fallback; stale/missing quote; duplicate inquiry; WhatsApp outage; cross-owner reference; lead state remains inquiry; admin/content cannot publish unapproved terms; future provider states inaccessible.

## 10. Dependencies, risks and open questions

All `TBD-INSTALLMENT-001`–`013` are canonical: provider/legal basis, term, down payment, interest/overpayment/disclosure, eligibility/approval, geography/products, application route/payload, documents, privacy/retention/subprocessor and order interaction. Dependencies: cart/order, content, security/privacy, API and legal review.

Risks: misleading advertising, sensitive data collection without basis, manager statements becoming public truth, provider spoofing, installment approval conflated with order confirmation and privacy leakage. Current neutral flow is the risk control.

## 11. Связанные требования and history

Links: `FR-INSTALLMENT-001`, `TBD-INSTALLMENT-001`–`013`, `INST-SPEC-001`–`015`, `CART-SPEC-*`.

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Определён neutral manual inquiry, prohibited claims/data, inactive future state boundary and complete fallback/testing contract. |
