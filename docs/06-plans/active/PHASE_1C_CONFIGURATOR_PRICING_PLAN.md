# Phase 1C — configurator and verified pricing plan

## 0. Execution record

| Field | Value |
|---|---|
| Status | `COMPLETED`; acceptance evidence is frozen in the completion report |
| Authorized scope | Phase 1C only; no preview, photo/AI, cart, order, WhatsApp, payment, final landing or production deployment |
| Base commit | `3f1f70c986bd29518364a059393e9abd1b284a02` |
| Branch | `phase/1c-configurator-pricing` |
| Catalog evidence | Active PostgreSQL CatalogVersion v2 `8975b18c-d7de-49cc-a6e6-d7566b69460a`; PriceVersion v2 `9fdc0a74-9fab-4d63-b4b6-015f534e117d` |
| Price evidence | [AMIGO pricing verification 2026-08-08](../../research/AMIGO_PRICING_VERIFICATION_2026-08-08.md) |
| Completion evidence | `../completed/PHASE_1C_CONFIGURATOR_PRICING_REPORT.md` after acceptance |

## 1. Verifiable outcome

Deliver a guest `/configure` flow backed only by the active PostgreSQL catalog, a server-only integer pricing package, verified rules for the four MVP families, safe non-numeric fallback elsewhere, immutable quote snapshots, and minimal OWNER/ADMIN pricing administration. Completion requires parity fixtures, database/API/browser/security tests, production build, CI-equivalent verification, a clean branch, push and a Draft PR without merge.

## 2. Stages

- [x] Read required governance/specification/ADR/report documents; verify merged Phase 1B.2, clean baseline, preserved Docker volumes, real public/admin catalog surfaces and active versions.
- [x] Capture bounded public AMIGO calculator evidence without login, CAPTCHA bypass, secrets or runtime dependency; classify only proven rules as automatic.
- [x] Authorize Phase 1C in canonical governance and commit the dated evidence.
- [x] Add immutable schema, indexes and PostgreSQL adapters for rule versions, compatibility, dimensions, overrides, idempotency, parity and quote snapshots.
- [x] Add independent deterministic pricing/configuration packages and contracts.
- [x] Add public configuration, validation, pricing and quote APIs with safe errors, correlation, rate/origin/idempotency boundaries.
- [x] Add responsive `/configure` flow and immutable quote view.
- [x] Extend the existing admin surface for price review, activation/rejection, override, audit and parity verification.
- [x] Add unit, property/boundary, contract, integration, parity and browser verification.
- [x] Update only affected documentation, run acceptance/CI gates, create logical commits, push and open the Draft PR.

## 3. Pricing safety boundary

- Horizontal `Классика 25` and vertical `Ткань` use the verified one-square-metre minimum-area rule only inside the committed verified envelopes.
- Roller `MINI` and Zebra `Зебра MINI` use exact verified dimension lookup fixtures only; unverified dimensions require manual review.
- Imported combinations without a proven rule return `PRICE_ON_REQUEST` or `MANUAL_REVIEW_REQUIRED`; no interpolation or guessed formula is permitted.
- Source amounts and all derived amounts are integer kopecks; the 150,000-kopeck per-unit local minimum is applied before quantity.
- Public runtime never calls AMIGO. Price activation and local override mutations are OWNER/ADMIN-only and audited.

## 4. Logical commits

1. `docs: authorize Phase 1C`
2. `feat: add configurator domain model`
3. `feat: add compatibility and dimension validation`
4. `feat: add versioned pricing engine`
5. `feat: add immutable quote snapshots`
6. `feat: add configurator APIs`
7. `feat: add public configurator flow`
8. `feat: add price version administration`
9. `test: add pricing parity and configurator verification`
10. `docs: complete Phase 1C`

## 5. Blockers and decisions

No entry blocker remains. The Product Owner's 2026-08-08 Phase 1C instruction is `OWNER-DECISION-013`; unsupported or unproved combinations degrade independently and do not block the supported families. The pre-existing user WIP is preserved in `stash@{0}` and is not part of this phase unless deliberately reconciled. Phase 1D remains prohibited.
