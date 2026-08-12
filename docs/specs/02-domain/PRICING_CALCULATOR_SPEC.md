# Pricing calculator specification PROJECT_NAME

## Active Phase 2C exact AMIGO calculation

`OWNER-DECISION-025` and ADR-0015 supersede the Phase 2A `AREA/FIXED/MANUAL` public path for new quotes. A published material now has a current versioned AMIGO `FROM` card amount and one unambiguous calculator model/material mapping. The customer selects the material and enters only integer width/height; quantity is one in the calculator and MAY be changed later through server recalculation in the cart. The server calls only the pinned allowlisted AMIGO calculator adapter or an exact complete cache key and returns integer kopecks. No local minimum, local formula, local override, zero or manager-price placeholder is permitted. Historical Phase 1C/2A snapshots retain their old versioned rules and are not recalculated.

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Phase 2C exact AMIGO version `amigo-67c782a10449cdb7` active for 1,131 mapped materials; historical versions retained |
| Версия | 0.6.0 |
| Дата | 2026-08-13 |
| Policy | [PRICING_SOURCE_POLICY.md](../../00-global/PRICING_SOURCE_POLICY.md) 2.2.0 |
| Inputs | [PRODUCT_CONFIGURATOR_SPEC.md](PRODUCT_CONFIGURATOR_SPEC.md) |

## 1. Назначение, границы и запрещённые выводы

Документ определяет versioned, deterministic, auditable preliminary pricing without inventing AMIGO formulas. It covers provider contract, source/local layers, exact arithmetic, status, breakdown, history, activation, fallback and parity testing.

Out of scope until confirmed: unverified option selection, tax display, discount rules and price validity period. The 1500-ruble per-item minimum remains historical evidence under `OWNER-DECISION-003` but is superseded for every new public quote by `OWNER-DECISION-025`. No sample number in this spec is a new business price.

## 2. Термины, акторы и roles

`Source Price` is authorized AMIGO-origin value/rule in a captured context and remains AMIGO-owned. `Local Sale Price` equals verified source price absent a Business Owner-approved active override. `PriceVersion` is immutable approved set. `Quote` is immutable calculation result. `Manual Quote` contains no fabricated numeric result. PostgreSQL is the operational store for these layers and their history, not the authority allowed to blur them.

Actors: guest/customer requester, manager draft/confirmation role, price editor, separate activator/owner, sync system, pricing provider adapter and auditor.

## 3. Pricing aggregate and fields

### PriceVersion

`priceVersionId`, semantic/internal version, supplier/sourceCatalog/context/region, sourceVersion/evidence, captured/verified/approved/effective/retired timestamps, status, currency, rule set refs, category mappings, override set refs, checksum, author/approver, validation/parity report, comments.

### PriceRule

`ruleId/revision`, applicability (family/system/model/material/sourcePriceCategory/mounting/dimensions/options/context), priority/specificity, input contract, expression in approved declarative vocabulary, rounding stage/rule reference, output component, effective interval, source/evidence, status.

### Quote

`quoteId/revision`, configuration revision, price version, calculation timestamp/context/region/currency, raw/normalized inputs, rule IDs/revisions, line breakdown, source/local/override values, services, subtotal/adjustments/total, status, preliminary disclosure, freshness/expiry if approved, actor/provider/correlation/checksum.

## 4. Нормативные требования

- **PRICE-SPEC-001 — MUST:** quote calculation uses exactly one active verified PriceVersion; mixing versions inside a result is prohibited.
- **PRICE-SPEC-002 — MUST:** all money operations use exact decimal/minor units with explicit currency and approved rounding stages; binary floating-point output is prohibited.
- **PRICE-SPEC-003 — MUST:** each numeric component traces to rule, inputs, source/local/override layer and version.
- **PRICE-SPEC-004 — MUST:** `localSalePrice = verifiedSourcePrice` when no active applicable override exists.
- **PRICE-SPEC-005 — MUST:** override is versioned, scoped, justified, approved, effective/expiring and cannot mutate source value.
- **PRICE-SPEC-006 — MUST:** allowed conceptual overrides are absolute replacement, additive amount, multiplicative/percentage adjustment or explicit rule replacement; exact permitted set/precedence remains owner-approved.
- **PRICE-SPEC-007 — MUST:** `sourcePriceCategory` accepts dynamic source strings; unknown category stores safely but blocks price unless an applicable rule exists.
- **PRICE-SPEC-008 — MUST:** service lines for confirmed free measurement/delivery/installation are shown separately as zero only within approved region/scope and never alter mechanism formula.
- **PRICE-SPEC-009 — MUST:** historical snapshots created under `OWNER-DECISION-003` reproduce the 1500-ruble per-item minimum. `OWNER-DECISION-025` supersedes this requirement for all new public quotes, which MUST NOT apply any local minimum.
- **PRICE-SPEC-010 — MUST:** missing input/rule/version/currency/context returns `UNAVAILABLE` or `MANUAL_REQUIRED`, never zero/guess/partial total.
- **PRICE-SPEC-011 — MUST:** historical quote and its inputs/version/breakdown are immutable after creation; recalculation creates a new revision.
- **PRICE-SPEC-012 — MUST:** price activation is atomic, preserves previous active version and is allowed only to `OWNER` or `ADMIN` after exact diff review and explicit confirmation; every attempt/outcome is audited.
- **PRICE-SPEC-013 — MUST:** scheduled activation uses one authoritative clock and non-overlapping effective intervals.
- **PRICE-SPEC-014 — MUST:** public output is labelled preliminary and distinct from manager-confirmed final quote.
- **PRICE-SPEC-015 — MUST:** fallback uses only approved active local snapshot, manual quote or explicit price unavailable; live source runtime is not required.
- **PRICE-SPEC-016 — MUST:** parity comparison records identical normalized inputs, local result, authorized source result, absolute/percent difference, versions/context and explanation.
- **PRICE-SPEC-017 — MUST:** with identical source version, system, material, dimensions, hardware, options and quantity, absolute local/source difference up to 1 ruble inclusive passes tolerance; a larger difference is parity error.
- **PRICE-SPEC-018 — MUST:** rule errors/conflicts/overflow/non-finite values fail closed and generate no amount.
- **PRICE-SPEC-019 — MUST:** manager adjustment does not overwrite preliminary quote and needs authorization/reason/client-visible explanation.
- **PRICE-SPEC-020 — MUST:** client/API payload excludes proprietary internal expression/source credentials while retaining an understandable breakdown and version reference.
- **PRICE-SPEC-021 — MUST:** AMIGO-origin base prices are source-owned immutable snapshots; import, normalization, activation or admin UI MUST NOT edit the captured AMIGO amount in place.
- **PRICE-SPEC-022 — MUST:** Business Owner is decision authority for local price overrides and commercial conditions; each is a separate versioned/audited layer with applicable approval/legal/financial gates and never rewrites the base price.
- **PRICE-SPEC-023 — MUST:** PostgreSQL stores source snapshots, override/commercial-condition revisions, active pointers and quote history as the operational system of record; physical presence of imported rows does not make an incomplete or unverified PriceVersion active.
- **PRICE-SPEC-024 — MUST:** public calculation input resolution follows `OWNER-DECISION-009`: server runtime reads only compatible active approved `CatalogVersion` and `PriceVersion` records from PostgreSQL. AMIGO adapters, raw captures, staged candidates and rebuildable cache/search projections MUST NOT become independent calculation sources; every quote snapshot pins both version IDs and the selected source/override revisions.
- **PRICE-SPEC-025 — MUST:** every active public material has one current AMIGO source-card `FROM` amount, source card identity, capture time and semantic source version; the card renders that amount as «от … ₽».
- **PRICE-SPEC-026 — MUST:** every active public material maps to exactly one pinned calculator model ID and material ID inside its authorized family; zero or multiple matches exclude it from public projection.
- **PRICE-SPEC-027 — MUST:** new calculator input is material slug plus integer `widthMm`/`heightMm`; quantity defaults to one and client-supplied amount/model/options/version are never trusted.
- **PRICE-SPEC-028 — MUST:** the server adapter uses only the pinned HTTPS origin and `/api/calculate`, rejects redirects, bounds timeout/concurrency/body size, validates the response schema/currency/integer amount and fails closed.
- **PRICE-SPEC-029 — MUST:** exact cache identity includes source version, calculator model/material IDs and both dimensions; a partial or cross-version key is invalid.
- **PRICE-SPEC-030 — MUST:** order creation recalculates server-side and persists the exact cache-verified amount plus source/model/material version snapshots; historical order-item rows are immutable.
- **PRICE-SPEC-031 — MUST NOT:** public/admin runtime edits AMIGO source price, substitutes a local override/formula/minimum, or publishes incomplete mapping as `MANUAL`.
- **PRICE-SPEC-032 — MUST:** activation is atomic, keeps previous versions immutable and exposes only complete priceable descendant groups; the active evidence contains 1,131 materials/seven groups, including 137 Zebra materials.

## 5. Provider contract

Conceptual operations:

| Operation | Input | Output |
|---|---|---|
| `resolveVersion` | calculation time, region/context | one active version or unavailable reason |
| `validateInputs` | configuration + version | normalized inputs/errors/missing rules |
| `calculate` | validated immutable input snapshot | quote result or typed failure |
| `explain` | quote ID/revision | permitted breakdown/provenance summary |
| `compareParity` | one input case + source/local adapters | versioned difference record |
| `stageVersion` | authorized snapshot/rules | immutable candidate + validation report |
| `activate/rollback` | approved command/current version | atomic pointer transition/audit |

Provider types: `AdminManagedPricingProvider`, `AmigoAuthorizedProvider`, `AmigoSnapshotProvider`, `ManualQuoteProvider` and test-only `MockPricingProvider`. Exact transport is an adapter behind the contract and requires evidence/ADR.

The active public provider is `AmigoExactPriceProvider` under ADR-0015. Historical provider types remain solely for old snapshot reproduction and non-public evidence.

## 6. Symbolic calculation pipeline

No business coefficient is assigned here. A rule set MAY conceptually compute:

1. normalize verified width/height/quantity using approved dimension policy;
2. resolve system/model/material/sourcePriceCategory and active base rule;
3. derive billable measure (area/linear/unit) only by rule version;
4. calculate base product component;
5. calculate approved mechanism/hardware/control/option components;
6. apply approved local override precedence;
7. apply the approved 1500-ruble minimum independently to each manufactured item only after other pricing gates are approved;
8. add separate service lines (confirmed zero where applicable);
9. apply tax/display/rounding policy at defined stages;
10. validate invariants and store breakdown/checksum.

Conceptual pseudocode, not implementation:

```text
version = resolveActiveVersion(context, at)
inputs = validateAndNormalize(configurationRevision, version)
rules = resolveOneConsistentRuleSet(inputs, version)
components = evaluateExactly(rules, inputs)
local = applyApprovedOverrides(components, version)
total = applyApprovedRoundingAndMinimum(local, version)
return immutablePreliminaryQuote(inputs, rules, components, total)
```

If any referenced policy is unknown, evaluation stops before returning `total`.

## 7. Source, local and override precedence

| Layer | Purpose | Can change source value? | Approval |
|---|---|---:|---|
| Source capture | Preserve authorized AMIGO value/rule/context | No | Verification |
| Normalized source | Typed representation without business change | No | Mapping validation |
| Local override | Intentional local price policy | Source remains immutable | Price approval |
| Manager adjustment | Case-specific post-measurement revision | New quote only | Manager/owner policy |
| Display | Formatting/rounding disclosure | Only approved presentation stage | Policy/legal |

Multiple applicable overrides require explicit precedence and conflict detection. An expired, draft, rejected or unrelated override is ignored and logged as such, not applied.

## 8. States and transitions

### PriceVersion

`DRAFT → STAGED → VALIDATING → REVIEW_REQUIRED → APPROVED → SCHEDULED/ACTIVE → RETIRED`; any pre-active state may `REJECTED`; active may `ROLLED_BACK` by switching pointer while version remains immutable.

### Quote

`REQUESTED → PRELIMINARY` or `UNAVAILABLE/MANUAL_REQUIRED`; later `STALE/SUPERSEDED`; manager-created revision may be `CONFIRMED` after approved process. `STALE` does not rewrite amount.

## 9. Validation and invariants

- exactly one active version for given context/time;
- currency and region/context match;
- configuration revision is valid and all rule inputs present;
- each selectable priced item maps to exactly one applicable rule outcome or explicit conflict;
- no overlapping ambiguous override/rule with equal precedence;
- amount/components fit bounded numeric range and sum exactly under rounding policy;
- quantity positive integer within approved limit;
- no negative total/component unless explicitly allowed discount/refund model (not approved);
- zero product price requires explicit verified zero rule, never missing-data fallback;
- checksum/replay on same versions/inputs returns identical result;
- services zero only within `BUSINESS-REGION-001` and confirmed scope;
- source and local values both retained when override applies.

## 10. Breakdown and client disclosure

Client breakdown SHOULD include product/system/material/quantity, base/options/services/adjustment groups, total/currency, preliminary label, data freshness/version reference and manager-confirmation note. It MUST NOT reveal confidential formula expressions, credentials, internal margins or security metadata.

If exact line-level transparency is unresolved (`TBD-PRICE-011`), safe minimum is total status/amount, included free services, preliminary nature and why price is unavailable/stale. No fake validity deadline is shown before `TBD-PRICE-008`.

## 11. Errors and edge cases

| Error | Trigger | Result |
|---|---|---|
| `NO_ACTIVE_VERSION` | No approved effective version | `UNAVAILABLE` |
| `INPUT_INVALID` | Configuration/dimension invalid | Field/reason, no quote |
| `RULE_MISSING` | No applicable base/option rule | Manual required |
| `RULE_CONFLICT` | Multiple equal precedence rules | Block + data alert |
| `CATEGORY_UNSUPPORTED` | New dynamic source category lacks rule | Store category, no amount |
| `CURRENCY_CONTEXT_MISMATCH` | Wrong region/currency | Block |
| `ARITHMETIC_ERROR` | Overflow/non-exact invalid result | Block/critical alert |
| `VERSION_CHANGED` | Activation race | Retry consistently or finish pinned version per policy |
| `SOURCE_STALE` | Freshness threshold exceeded | Approved stale disclosure or unavailable, policy TBD |
| `OVERRIDE_EXPIRED` | Override inactive | Use source layer if valid; audit |

Edge cases: quantity >1 with per-item minimum; mixed cart versions; daylight/timezone activation; retroactive correction; source category string casing; missing option price; zero/free service; negative adjustment; customer reopens old quote; source removal; rollback after new quotes. Each requires table/property tests.

## 12. Failure and degradation

Source outage: active local verified PriceVersion continues only under approved staleness policy. Pricing engine outage: save configuration/cart and route manual. Partial activation: atomic rollback. Audit/outbox failure: price activation/confirmation fails closed. Cache mismatch: version key/checksum prevents mixed result. Manual quote contains no synthetic amount until authorized manager provides one.

## 13. Security, privacy, performance and analytics

Price editor/activator capabilities are separated and audited. Rule/evidence endpoints are admin-only; public calculation rate-limited and validates server-side. Pricing requires no client photo. Quote/customer identifiers are scoped; analytics use amount bands only if approved, price status/version/error codes and funnel conversion without PII. Performance budgets cover deterministic calculation under bounded rules; no numerical SLA is invented before infrastructure decisions.

## 14. Parity test matrix contract

Each parity case stores:

`caseId`, description, input configuration revision/snapshot, source context/version/timestamp/result, local version/result, absolute difference, percentage difference where denominator nonzero, component comparison, expected tolerance/status, reviewer and evidence.

Required case classes:

- minimum/maximum verified dimensions and just-inside/outside boundaries;
- each active family/system/model/material source category;
- each mounting/control/hardware/option price effect;
- quantities 1 and multiple;
- no override and every approved override type;
- free services within region and out-of-scope region behavior;
- per-item minimum cases including 1100→1500 and two units→3000 once the pricing engine phase is authorized;
- rounding thresholds, currency scale and exact replay;
- stale/version activation/rollback/historical quote;
- unknown category/missing rule/conflict/outage.

No automated case may bypass AMIGO access or use volatile public UI as an unapproved production oracle.

## 15. Acceptance, tests, dependencies and risks

AC: `AC-PRICE-001`, `AC-PRICE-ACTIVATE-001`, `AC-QUOTE-HISTORY-001`, `AC-QUOTE-CONFIRM-001`, `AC-CART-001`.

Tests: unit rule components, table/property dimension/rounding, provider contracts, version activation concurrency, override precedence/conflict, exact arithmetic, replay checksum, parity fixtures, cart mixed states, security/RBAC, source/engine/audit/cache failures and historical reproducibility.

Dependencies: catalog/configurator/cart/admin/sync/data/API/security/test strategy. Remaining blockers affect expansion only: partially resolved `TBD-PRICE-002`–`005` and `TBD-SIZE-001`, plus open `TBD-PRICE-006`, `TBD-PRICE-008`–`010`, `TBD-MECHANISM-001`, `TBD-DIM-*` and legal/tax display. Resolved `TBD-PRICE-001`, `TBD-PRICE-007`, `TBD-PRICE-SOURCE-001`–`002`, `TBD-PRICE-PARITY-001` and `TBD-MIN-PRICE-001` remain traceable. Risks: invented formulas, mixed versions, floating-point errors, hidden overrides, false zero, wrong minimum application, source/runtime coupling and unverifiable parity.

### 15.1. Phase 1C implementation record

Active calculation version v5 `7618714e-0baf-463a-8311-e9cf84879dd1` pins source version `amigo-public-calculator-2026-08-08-9f9246330385`, four reviewed rules and 40 dated fixtures. Roller MINI and Zebra MINI use exact dimension lookups. Horizontal model 28/material 918 and vertical model 43/material 1006 use verified integer half-up area rules within their captured envelopes; maximum observed parity deviation is 100 kopecks. A parity failure above the approved tolerance blocks rule activation.

The independent server-only engine accepts integer millimetres and emits integer kopecks. It resolves active local override before source price, applies `max(unitPriceBeforeMinimum, 150000)` to each unit before quantity and lists measurement, delivery and installation separately at zero. Public calculation rejects inactive versions and unverified combinations without a fabricated amount. Successful quote snapshots pin labels/articles, selections, breakdown, active CatalogVersion/PriceVersion/source version, override/minimum evidence and correlation ID. OWNER/ADMIN operations are authorization-checked, idempotent and audited; MANAGER cannot activate a version.

## 16. Связанные требования и история

Links: `PRICING-SOURCE-*`, `PRICING-SNAPSHOT-*`, `PRICING-VERSION-*`, `PRICING-LOCAL-*`, `PRICING-HISTORY-*`, `PRICING-QUOTE-*`, `PRICING-TEST-*`, `FR-PRICE-*`, `FR-CALC-*`, `PRICE-SPEC-001`–`020`.

| Версия | Дата | Изменение |
|---|---|---|
| 0.6.0 | 2026-08-13 | Activated `OWNER-DECISION-025`/ADR-0015 exact AMIGO mapping, `FROM` cards, width/height-only server calculation/cache, fail-closed projection and immutable order snapshots; retired the local minimum for new quotes. |
| 0.1.0 | 2026-08-02 | Определены provider contract, symbolic pipeline, versions/overrides, exact arithmetic, breakdown, failures and parity matrix without invented business values. |
| 0.2.0 | 2026-08-02 | Зафиксированы per-item minimum, `OWNER`/`ADMIN` activation с diff/audit и parity tolerance ≤1 рубля; pricing implementation остаётся вне Phase 1A. |
| 0.3.0 | 2026-08-02 | По `OWNER-DECISION-008` AMIGO base-price authority отделена от Business Owner overrides/commercial conditions и PostgreSQL operational storage; Phase 1C gates сохранены. |
| 0.4.0 | 2026-08-02 | По `OWNER-DECISION-009` public calculation path ограничен совместимыми active approved PostgreSQL `CatalogVersion`/`PriceVersion`; direct AMIGO/staging/derived-source reads запрещены, quote pinning уточнён. |
| 0.5.0 | 2026-08-08 | Recorded active pricing v5, four verified rule scopes/40 fixtures/≤1 RUB parity, integer per-unit minimum, free-service lines, overrides, immutable quotes, safe fallbacks and audited administration delivered in Phase 1C. |
