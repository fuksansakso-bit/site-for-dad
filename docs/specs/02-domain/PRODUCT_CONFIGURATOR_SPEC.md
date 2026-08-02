# Product configurator specification PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Draft 0B — flow/contract defined; real compatibility and limits `BLOCKED_BY_TBD` |
| Версия | 0.1.0 |
| Дата | 2026-08-02 |
| Catalog model | [CATALOG_INVENTORY_SPEC.md](CATALOG_INVENTORY_SPEC.md) |
| Pricing | [PRICING_CALCULATOR_SPEC.md](PRICING_CALCULATOR_SPEC.md) |

## 1. Назначение и границы

Конфигуратор создаёт versioned, explainable and valid product configuration using locally approved AMIGO catalog data. It is a domain state machine, not a copied source UI.

In scope: selection sequence, dynamic schema, dependencies, compatibility, dimensions, materials/filters, options, validation, drafts/revisions, quote/preview/cart handoffs.

Out of scope: exact formulas/technical limits until evidence, DOM/pixel behavior, order confirmation, payment, production implementation and arbitrary free-form rules.

## 2. Акторы, роли и permissions

Guest/customer creates and owns draft revisions. Manager may inspect handoff and create a verified post-measurement revision. Catalog admin publishes schemas/rules, price admin versions pricing, content manager maps assets. No actor may bypass missing compatibility evidence by UI-only selection.

## 3. Configuration aggregate and fields

| Group | Fields | Rule |
|---|---|---|
| Identity | `configurationId`, `revisionId`, owner/guest scope, status, created/updated | Revisions immutable after quote/cart reference |
| Catalog | family/system/model source+local revision refs | All active and compatible |
| Mounting | mounting type, surface/context optional | Evidence-backed schema |
| Dimensions | width, height, quantity, optional sash/window geometry | Raw input + normalized value + unit |
| Material | material/variant/article/source category/asset revision | Exact mapped selectable variant |
| Hardware | color, frame/cassette/rail, chain/cord, control type/side/length | Dynamic option groups |
| Product behavior | opening/position/stripe alignment/motor options where supported | System-specific |
| Extras | allowed option values and quantity | Compatibility/price aware |
| Notes | constrained customer comment | Not a substitute for structured selection |
| Evidence | schema/rule/catalog versions and validation timestamp | Reproducibility |

## 4. Нормативные требования

- **CONFIG-SPEC-001 — MUST:** step schema is data-driven by active family/system/model revision and can add a new category without code-specific branch where generic semantics suffice.
- **CONFIG-SPEC-002 — MUST:** canonical order is family → system → model → mounting → dimensions → quantity → material search/filter/select → hardware/control/options → validation → price/preview/cart.
- **CONFIG-SPEC-003 — MUST:** a step MAY be hidden only when its value is not applicable or uniquely determined by verified rule; hidden default is stored/explained.
- **CONFIG-SPEC-004 — MUST:** changing an upstream value invalidates/revalidates all dependent selections, quote and preview; invalid values are never silently retained.
- **CONFIG-SPEC-005 — MUST:** compatibility outcomes are `ALLOW`, `DENY`, `REQUIRE`, `LIMIT`, `WARN` or `MANUAL_REVIEW` with reason/message.
- **CONFIG-SPEC-006 — MUST:** missing required compatibility or dimension rule yields `MANUAL_REVIEW/INVALID_FOR_QUOTE`, not allow.
- **CONFIG-SPEC-007 — MUST:** raw dimension text and normalized numeric value/unit are stored separately; normalization/rounding follows approved rule version.
- **CONFIG-SPEC-008 — MUST:** system validates width, height, area and conditional material/mounting/control limits together.
- **CONFIG-SPEC-009 — MUST:** material picker contains only publication-approved, mapped variants compatible with current configuration; availability/pricing states remain visible.
- **CONFIG-SPEC-010 — MUST:** search supports name/article/aliases and typed facets without inferring unknown properties.
- **CONFIG-SPEC-011 — MUST:** option groups declare cardinality, requiredness, default policy, dependencies, incompatibilities and price effect reference.
- **CONFIG-SPEC-012 — MUST:** user can see why an option/material is unavailable and which upstream selection caused it.
- **CONFIG-SPEC-013 — MUST:** free comment is length/content constrained and cannot override safety, size, compatibility or price rules.
- **CONFIG-SPEC-014 — MUST:** valid configuration stores exact catalog/schema/rule revisions for reproducibility.
- **CONFIG-SPEC-015 — MUST:** duplicate creates a new configuration identity from a source revision; edit creates a new revision within identity.
- **CONFIG-SPEC-016 — MUST:** simultaneous stale edits result in version conflict, not silent last-write-wins.
- **CONFIG-SPEC-017 — MUST:** quote/preview/cart consume a referenced valid revision and return their own revision/reference; they do not mutate configuration.
- **CONFIG-SPEC-018 — MUST:** unsupported complex shape, multi-sash or motorized case is explicitly flagged and can route manual review.
- **CONFIG-SPEC-019 — MUST:** validation is equivalent server-side; client filtering is only assistance.
- **CONFIG-SPEC-020 — MUST:** each error has stable code, affected field/path, non-sensitive explanation and recovery action.

## 5. Step schema

Each `ConfiguratorStep` has:

`stepId`, `order`, `labelKey`, `fieldPaths`, `applicabilityExpression`, `requiredExpression`, `optionQuery/filter`, `defaultPolicy`, `validationRuleRefs`, `dependencyPaths`, `helpContentRef`, `analyticsKey`, `accessibilityHint`, `fallback`.

Expressions use a restricted declarative vocabulary defined/versioned by product, not arbitrary executable source code. Unknown operand yields `UNKNOWN`, which blocks a positive decision when safety/compatibility/price depends on it.

## 6. Primary flow

1. Create `DRAFT` with active schema/catalog context.
2. Select family; resolve active systems.
3. Select system/model; generate applicable steps and dependencies.
4. Select mounting and enter dimensions/quantity.
5. Normalize and run partial validation; explain missing/invalid fields.
6. Query compatible publication-approved materials, search/filter/select exact variant.
7. Select hardware color, control side/type/length, frame/cassette/rail and extras as applicable.
8. Re-evaluate full rule graph; status becomes `VALID`, `INVALID` or `MANUAL_REVIEW`.
9. From `VALID`, request preliminary quote and standard preview; AI visualizer is optional.
10. Add the exact revision to cart, duplicate/edit or save project.

## 7. Alternative flows

- category exists but no local schema → inquiry-only path;
- model has one verified mounting → auto-select and disclose;
- no result after filters → preserve configuration, show removable filter chips and contact route;
- selected material becomes hidden/stale → historical revision remains, new quote/submit requires replacement or review;
- size outside verified range → field error, no price; manager measurement route;
- price unavailable → configuration/preview/cart draft allowed with `Цена уточняется`;
- asset missing → material cannot newly select/public preview; no substitute;
- source sync changes schema during edit → draft stays on pinned revision and user may migrate explicitly;
- multiple windows → separate items/revisions or approved group schema, never one ambiguous dimension set.

## 8. State machine

| State | Entry | Allowed actions | Exit |
|---|---|---|---|
| `DRAFT` | Created/edited | Select fields, save, abandon | `VALIDATING`, `ARCHIVED` |
| `VALIDATING` | Submit/change | Evaluate rules | `VALID`, `INVALID`, `MANUAL_REVIEW` |
| `INVALID` | Rule/field failure | Correct/inspect | `VALIDATING`, `ARCHIVED` |
| `MANUAL_REVIEW` | Missing/complex rule | Save/contact/manager revise | `VALIDATING`, `ARCHIVED` |
| `VALID` | All required rules allow | Quote/preview/cart/edit | `QUOTED`, `IN_CART`, new `DRAFT` revision |
| `QUOTED` | Quote returned | Preview/cart/recalculate | `IN_CART`, new revision |
| `IN_CART` | Cart item references revision | Duplicate/edit/remove | Historical reference retained |
| `ARCHIVED` | User/system policy | Read if allowed | Restore only by new revision |

## 9. Validation order and precedence

1. Structural: required paths/types/units/reference existence.
2. Publication/rights/readiness: catalog and material eligible for selection.
3. Hierarchy: family/system/model/mounting relationships.
4. Compatibility: allow/deny/require/options.
5. Dimensions: min/max/area/conditional constraints.
6. Availability/orderability: affects CTA, not geometric validity.
7. Pricing readiness: determines quote, not configuration preservation.
8. Preview capability: determines available visualization routes.

Conflict between equally specific rules yields `RULE_CONFLICT` and blocks affected positive decision. No hidden priority by creation order.

## 10. Dimension and geometry contract

Inputs use user-facing unit defined by locale, normalize conceptually to integer millimetres only after approved policy. Exact rounding, billable area, deductions and sash rules remain `TBD-PRICE-002/003`, `TBD-DIM-*`, `TBD-SIZE-001`.

The validation record stores raw input, parsed value, normalized value, rule version, each constraint result and aggregate status. A warning may allow progression only when rule explicitly says `WARN`; technical safety failures cannot be dismissed by guest.

## 11. Material and option behavior

Facets include source-backed color, pattern, texture/structure, composition, transparency, use, wet-room and reflective properties, plus dynamic source category. Counts recompute within current compatibility result. Search ranking never elevates incompatible/blocked variant.

Hardware/options are source/system scoped, not global enums. Observed example colors (white, oak, brown, dark-grey, black) are data values for a captured context only. Motorization, complex geometry and control length require explicit constraints.

## 12. Errors, edge cases and failure behavior

| Code | Meaning | User recovery |
|---|---|---|
| `FIELD_REQUIRED/FORMAT` | Missing/unparseable | Focus and valid example |
| `REFERENCE_INACTIVE` | Catalog revision not selectable | Choose active alternative/contact |
| `COMBINATION_DENIED` | Verified incompatibility | Explain source selections and alternatives |
| `RULE_MISSING` | Necessary evidence absent | Save/manual review |
| `DIMENSION_OUT_OF_RANGE` | Verified technical limit | Correct/request measurement |
| `RULE_CONFLICT` | Data inconsistency | No quote; operator alert |
| `MATERIAL_RIGHTS_BLOCKED` | No public approved asset | Choose other/contact |
| `PRICE_UNAVAILABLE` | No active rule/version | Save and request manager |
| `VERSION_CONFLICT` | Concurrent/stale edit | Reload/compare/reapply |

Catalog/pricing/renderer outage keeps draft locally/server-side according to approved storage policy and offers retry/contact. A partial downstream failure never changes configuration status or identity.

## 13. Security, privacy, performance and analytics

Guest/customer ownership is checked server-side. Notes are sanitized and excluded from logs/analytics except length/reason metadata. The configurator does not require client photos. Rule/evidence/admin fields are not sent publicly. Dependency graph/filter queries must be bounded/cacheable by revisions; heavy preview code loads only on intent. Analytics: step view/completion/backtrack, validation codes, zero results, manual review and quote/preview/cart conversion using stable non-sensitive IDs/versions.

## 14. Acceptance criteria and test scenarios

Primary: `AC-CONFIG-001`, `AC-CATALOG-001`, `AC-PRICE-001`, `AC-STANDARD-PREVIEW-001`, `AC-CART-001`, `AC-ACCESS-001`.

Tests include every step happy path; required/optional/cardinality; upstream invalidation; all compatibility outcomes; missing/conflicting rule; dimension boundary table/property-based cases; dynamic category/option; unknown facet; no asset/price; duplicate/edit concurrency; stale schema migration; multi-window/manual-review; keyboard/screen-reader error handling; retry/idempotency.

## 15. Dependencies, risks, TBD and links

Dependencies: catalog, pricing, preview, AI, cart, accounts, admin, data/API. Open: `TBD-ASSORT-003`, `TBD-SIZE-001`, `TBD-DIM-*`, `TBD-PRICE-*`, `TBD-MECHANISM-001`, motor/complex-shape rules. Risks: UI-only validation, silent defaults, invalid dependent selections, material substitution, stale quote, rule conflicts and category-specific hardcoding.

Links: `FR-CONFIG-001`–`008`, `FTR-006/007`, `CAT-INV-*`, `CONFIG-SPEC-001`–`020`.

## 16. История изменений

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Созданы data-driven step schema, configuration aggregate, validation precedence, state machine, fallbacks and test coverage. |
