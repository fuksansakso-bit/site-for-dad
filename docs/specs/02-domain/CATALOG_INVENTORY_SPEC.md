# Catalog and inventory specification PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Phase 1B.2 full source review/activation, transactional overlays and full admin/public inventory projections accepted |
| Версия | 0.13.0 |
| Дата | 2026-08-04 |
| Sources | [EXTERNAL_SOURCES.md](../../00-global/EXTERNAL_SOURCES.md) |
| Rights | [ASSET_RIGHTS_REGISTER.md](../../00-global/ASSET_RIGHTS_REGISTER.md) |

## 1. Назначение и границы

Документ нормализует partner source catalog, local catalog readiness и inventory/availability without inventing stock. It is canonical for entities, identifiers, properties, states and relationships consumed by configurator, pricing, media, sync and admin.

In scope: supplier/partner/source catalogs, dynamic product hierarchy, materials/variants/properties, options/compatibility/dimensions, source/local states, provenance, aliases and availability records.

Out of scope: real stock quantities, unverified technical limits, price formulas/calculation, configurator/order flows and production deployment. Phase 1B.2 MAY capture and normalize the full currently discoverable authorized AMIGO source catalog under the active plan; import never implies local publication, availability, pricing, orderability or closure of `TBD-ASSORT-002` before accepted manifest/coverage/activation evidence.

## 2. Акторы, термины и ownership

Actors: public reader, catalog admin, content manager, owner/approver, sync system, pricing/configurator consumers. `Source Catalog` is a captured external namespace/version; `Local Catalog` is independently governed projection. `Availability` is evidence-backed status, not inferred from publication, image or price.

AMIGO owns the meaning of AMIGO-origin products, materials, technical data, catalog-image identity and base-price fields. Business Owner owns local availability, visibility/publication, price overrides, portfolio composition and commercial conditions. Catalog admin records delegated mapping/readiness operations; content owns media mapping; pricing role operates approved price data; supply/manager records availability evidence. PostgreSQL is the operational system of record for snapshots, normalized projections and local decisions, not the authority that may redefine either layer.

## 3. Entity model

| Entity | Identity / purpose | Required relationships |
|---|---|---|
| `Supplier` | AMIGO or future supplier stable local ID | PartnerRelationship, SourceCatalog |
| `PartnerRelationship` | Status/scope/region/badge/evidence | Supplier, MediaAsset, approvals |
| `SourceCatalog` | Source namespace, context and captured version | Supplier, SourceEntity, SyncRun |
| `SourceEntity` | Raw external identity/title/type/parent/version | Mapped local entity or conflict |
| `ProductFamily` | Dynamic top-level commercial family | ProductType/System, local states |
| `ProductType` | Optional intermediate source/business grouping | Family/System |
| `ProductSystem` | Technical system identity | Models, constraints, options |
| `ProductModel` | Specific model within system | Configuration schema, options |
| `ProductConfiguration` | Versioned user selections | System/model/material/options |
| `MountingType` | Mounting semantic and instructions | Compatibility/constraints |
| `ControlType` | Chain/cord/motor/manual control semantic | Options/compatibility |
| `Material` | Shared material identity/collection | MaterialVariant/property |
| `MaterialVariant` | Selectable color/article/source variant | Asset, category, compatibility |
| `MaterialPropertyDefinition` | Typed property and unit/semantics | Values and filter behavior |
| `MaterialPropertyValue` | Source/local value + evidence | Material or variant |
| `OptionGroup` / `OptionValue` | Configurable hardware/control/extras | Model and compatibility rule |
| `CompatibilityRule` | Evidence-backed allow/deny/require relation | Versioned subjects/conditions |
| `DimensionConstraint` | Min/max/area/shape/conditional limit | System/model/material/mounting |
| `AvailabilityRecord` | Status/quantity optional/unit/location/evidence | Variant/component/version |
| `PriceCategory` | Dynamic source category string/context | Variant/system/source version |
| `MediaAsset` / `SourceAsset` | Managed original/derivative/provenance | Exact domain entity + assetRole |
| `LocalOverride` | Versioned local field override with reason | Target field/entity/source version |
| `PublicationState` | Public exposure decision | Local entity/revision |
| `CatalogSyncRun/Difference` | Capture, mapping, diff and approval evidence | Source/local versions |

## 4. Identifier and version rules

- **CAT-INV-001 — MUST:** every local entity has immutable UUID/ULID-like identifier independent of source slug/title.
- **CAT-INV-002 — MUST:** source identity is `(supplierId, sourceCatalogId/context, sourceEntityId)`; text labels cannot be the sole key.
- **CAT-INV-003 — MUST:** source aliases/slugs are versioned and retain rename/move history.
- **CAT-INV-004 — MUST:** mapping supports one-to-one, one-to-many and explicit conflict; automatic many-to-one merge is prohibited.
- **CAT-INV-005 — MUST:** mutable records use revision/version and optimistic concurrency; historical configuration references immutable revisions.
- **CAT-INV-006 — MUST:** physical deletion is prohibited while a quote/order/audit references the entity; retire/tombstone is used.

## 5. Independent readiness states

Each selectable/public entity has four independent dimensions:

| Dimension | States | Meaning |
|---|---|---|
| Publication | `DRAFT`, `REVIEW`, `PUBLISHED`, `HIDDEN`, `RETIRED`, `BLOCKED` | Public discovery/detail visibility |
| Availability | `UNKNOWN`, `AVAILABLE`, `UNAVAILABLE`, `ORDER_ONLY`, `DISCONTINUED` | Evidence-backed supply state |
| Pricing | `UNKNOWN`, `READY`, `STALE`, `UNAVAILABLE`, `MANUAL_ONLY` | Whether active price can be calculated |
| Orderability | `UNKNOWN`, `INQUIRY_ONLY`, `CONFIGURABLE`, `ORDERABLE`, `BLOCKED` | Allowed customer action |

- **CAT-INV-007 — MUST:** no dimension implies another; `PUBLISHED` does not mean available/priced/orderable.
- **CAT-INV-008 — MUST:** public CTA is derived from all four dimensions and rights/compatibility gates.
- **CAT-INV-009 — MUST:** unknown is preserved as unknown and displayed safely; it never defaults to positive.
- **CAT-INV-010 — MUST:** source disappearance proposes `RETIRED/HIDDEN/UNKNOWN` impact but requires policy/approval before local activation.

## 6. Material model and filter semantics

Required variant fields:

`materialId`, `variantId`, `sourceEntityId`, `article/SKU`, `sourceName`, `localDisplayName`, `collection`, `colorName/code/family`, `pattern`, `texture/structure`, `composition`, `transparencyClass`, `usageTags`, `wetRoomSuitability`, `reflectiveLayer`, `sourcePriceCategory`, nullable `localPriceTier`, `compatibilityRefs`, `availabilityState`, `publicationState`, `pricingState`, `orderabilityState`, `primaryAssetId`, `sourceVersion`, verification metadata.

Property definitions include `propertyKey`, localized label, data type (`boolean`, `triState`, `enum`, `multiEnum`, `number`, `text`), optional unit, allowed source values, normalized value mapping, filter/operator semantics, unknown behavior and provenance.

- **CAT-INV-011 — MUST:** observed `E`, `0`, `1`–`5` are dynamic `sourcePriceCategory` strings scoped by source version/context, not fixed enum.
- **CAT-INV-012 — MUST:** filter facets show only definitions with meaningful verified values and counts for current compatible result set.
- **CAT-INV-013 — MUST:** unknown value is not grouped into `Нет/Не подходит`; it remains unknown/omitted per facet policy.
- **CAT-INV-014 — MUST:** color/pattern/texture can be normalized for discovery while preserving exact source label/code.
- **CAT-INV-015 — MUST:** composition/use/reflective properties do not create performance/safety claims beyond source evidence.

## 7. Compatibility and dimension constraints

Compatibility is an explicit graph, not hardcoded UI branching. A rule has `ruleId`, version, subject types/IDs, condition expression in approved declarative vocabulary, outcome (`ALLOW`, `DENY`, `REQUIRE`, `LIMIT`, `WARN`, `MANUAL_REVIEW`), reason code/message key, source/evidence and effective interval.

Dimension constraints use millimetres and square metres conceptually but exact normalization/rounding is TBD. They can depend on family/system/model/material/mounting/control/shape/quantity. More specific verified rule overrides a general rule only through declared precedence; conflicts block validation.

- **CAT-INV-016 — MUST:** no compatibility/limit is inferred from mere source UI visibility.
- **CAT-INV-017 — MUST:** rule evaluation is deterministic, explainable and versioned with the configuration.
- **CAT-INV-018 — MUST:** missing required rule produces `MANUAL_REVIEW`, not allow.

## 8. Availability and physical inventory boundary

`AvailabilityRecord` fields: target entity/component, authoritative local status, optional source-proposed status, optional quantity, unit, location, lot/batch, captured/verified/effective/expires timestamps, source, actor, evidence and version. Quantitative stock, units, reserves and lots remain inactive until their open `TBD-INVENTORY-*` close.

- **CAT-INV-019 — MUST:** availability cannot be inferred from AMIGO page presence, price or image.
- **CAT-INV-020 — MUST:** stale/expired evidence becomes `UNKNOWN/STALE` under approved policy, not permanently available.
- **CAT-INV-021 — MUST:** negative quantity and unbalanced movements are invalid if quantitative inventory is introduced.
- **CAT-INV-022 — MUST:** reserved/order quantities are separate from on-hand and need auditable movements; no model is assumed before approval.
- **CAT-INV-023 — MUST:** Business Owner-confirmed local status, recorded through the authorized admin/PostgreSQL workflow, is the availability operational source of record; an AMIGO-proposed status is stored separately and never auto-overwrites it.
- **CAT-INV-024 — MUST:** source age over 7 days carries `STALE_WARNING`; age over 30 days requires admin verification before a new product is published.
- **CAT-INV-025 — MUST:** AMIGO-origin product/material/technical/image/base-price fields are source-owned and change only through a new versioned AMIGO capture plus mapping/verification; a local editor MUST NOT overwrite their source value in place.
- **CAT-INV-026 — MUST:** local availability, visibility/publication, price overrides, portfolio relations and commercial conditions are Business Owner-owned overlays with independent version, provenance, approval and audit; sync MUST NOT overwrite them.
- **CAT-INV-027 — MUST:** PostgreSQL stores immutable captures, normalized local catalog projections, readiness overlays and active pointers. A database row is operational state, not evidence that its value came from the correct authority.
- **CAT-INV-028 — MUST:** every sync/import field has declared authority (`AMIGO_SOURCE` or `BUSINESS_OWNER_LOCAL`); missing/ambiguous ownership or an attempted cross-layer update blocks the affected candidate instead of using last-write-wins.
- **CAT-INV-029 — MUST:** PostgreSQL stores catalog-image metadata, provenance, exact entity mapping, rights/publication state and object reference; image binary originals/derivatives are stored in managed object storage under media policy.
- **CAT-INV-030 — MUST:** an explicit publication-preparation operation MAY create missing local business entries with reviewed `VISIBLE`, `APPROVED`, `INQUIRY_ONLY` and `PUBLISHED` defaults only after its readiness checks. It MUST NOT overwrite any pre-existing local description, order, note, visibility, review, availability, publication or price override, and source import alone never performs this transition.
- **CAT-INV-031 — MUST:** catalog and price candidate approval requires an append-only, checksum-bound review history in which every applicable difference is explicitly `APPROVED`; `DEFERRED` or selected `REJECTED` results remain visible and block approval until a later explicit review resolves them, while all-scope `REJECTED` terminally rejects that candidate.
- **CAT-INV-032 — MUST:** bulk category-subtree, typed-filter and explicit-selection commands MAY change only independently owned material-variant visibility, manual-review, availability and publication overlays before candidate composition. They revalidate exact source/run/candidate and current state, apply atomically with immutable before/after evidence, and never mutate source identity/data, base price, local description/order/notes or local price override.
- **CAT-INV-033 — MUST:** the authorized administrative inventory projection represents the complete dynamic category hierarchy and all normalized source variants for its selected source independently of public activation and the historical Phase 1B.1 allowlist. It exposes source facts and Business Owner overlays as separate fields, uses bounded server-side filters/pages and never turns a staged, hidden, unreviewed or source-removed entity into public content.
- **CAT-INV-034 — MUST:** the authorized public inventory projection exposes the complete hierarchy, linked systems and eligible material variants only from one compatible `ACTIVE/PUBLIC` immutable `CatalogVersion`/`PriceVersion` composition. Search, descendant-category filtering, system/color/availability/property filters, stable sort/cursor navigation, material detail and media delivery MUST resolve against that same composition; staged, hidden, unreviewed, unpublished, source-removed or runtime AMIGO data never enters the response.
- **CAT-INV-035 — MUST:** AMIGO `sourceEntityId` remains the stable variant identity. `article/SKU` is a preserved, searchable source fact and MUST NOT be treated as unique: distinct source variants with the same family/material/article remain separate without loss or automatic merge.
- **CAT-INV-036 — MUST:** catalog media occupies a semantic target/role/order placement independently of parser-generated source-media identity. A current authorized capture MAY rebind that placement to its current source reference while historical capture/reference evidence remains immutable; identical binaries remain deduplicated by checksum and MUST NOT be published as duplicate placements solely because a parser/mapping identity changed.

## 9. Core flows and state transitions

### Source-to-local mapping

`DISCOVERED → CAPTURED → NORMALIZED → MAPPED/CONFLICT → REVIEWED → ACTIVE/REJECTED`. Mapping revisions do not mutate raw capture. New/changed/removed entities are classified by sync diff.

### Publication readiness

Local draft passes required field validation, partner scope, rights/asset mapping, compatibility evidence, and relevant approval. It may then become `PUBLISHED` while remaining inquiry-only if price/availability/orderability are not ready.

### Retirement

Source removal or business decision creates proposed retirement. New discovery/configuration is disabled at effective time; historical references and audit remain. Alternative/replacement mapping is explicit, never silently substituted.

## 10. Validation and invariants

- unique source identity within catalog/context and unique active local alias where required;
- acyclic parent hierarchy and no entity as its own ancestor;
- exact domain type/relationship cardinality;
- no published variant without approved primary media mapping;
- no configurable variant without system/model/compatibility mapping;
- no `READY` pricing without active applicable price version/reference;
- no `ORDERABLE` while availability/orderability/business rule conflicts;
- version effective intervals do not overlap illegally;
- local override includes field, previous/source value, new value, reason, actor, approval and expiry/review;
- unknown fields are nullable/explicit, not empty string/default zero masquerading as known.

## 11. Errors, edge cases and failure behavior

| Case | Required handling |
|---|---|
| Duplicate source ID with changed type | Quarantine/schema conflict, no activation |
| Rename/move | Alias/history update, stable local ID retained |
| Split/merge | Explicit mapping revision and impact review |
| Circular source hierarchy | Validation failure and affected subtree blocked |
| Material asset maps wrong variant | Publication blocked; existing exposure revoked if confirmed |
| Price category unseen value | Store dynamic string; pricing remains unknown until rule exists |
| Availability feed absent | `UNKNOWN`, inquiry path only |
| Concurrent admin edits | Optimistic conflict, no last-write-wins |
| Source outage | Active local version remains; staleness visible |
| Partial activation failure | Atomic rollback/compensation and alert |

## 12. Security, privacy, performance and analytics

Catalog public projection excludes partner credentials, internal notes, source transport details and non-public assets. Admin mutations follow RBAC/audit. Catalog data contains no client photos. Query/index design must support faceted search and dynamic categories within approved performance budgets; high-cardinality/source text is bounded/normalized. Analytics track searches, zero results, filter use, inquiry-only gaps, stale/unknown states and mapping conflicts without private inputs.

## 13. Acceptance criteria and test scenarios

Primary AC: `AC-CATALOG-001`, `AC-CATALOG-DYNAMIC-001`, `AC-AMIGO-PARITY-001`, `AC-ASSET-MAP-001`, `AC-ADMIN-001`.

Tests: unique IDs/aliases; parent cycle; new price category `X`; unknown property; rename/move/split/merge; publication readiness matrix; missing/wrong asset; compatibility conflict; dimension boundary tables; stale availability; source removal; concurrent edit; historical quote after retirement; source outage and rollback; active hierarchy/descendant filters; filter-bound cursors; material detail/media pinned to the exact active catalog and price pair.

- **CAT-INV-037 — MUST:** public category/system/color/material route and filter slugs are deterministic bounded lowercase ASCII projections of the immutable composed slug. Retained technical separators such as `category:path:` are normalized without changing source identity or provenance; an empty, overlong or colliding public slug fails closed instead of producing an invalid or ambiguous URL.

The active public baseline is the reviewed Phase 1B.2 CatalogVersion v2 `8975b18c-d7de-49cc-a6e6-d7566b69460a` with compatible PriceVersion v2 `9fdc0a74-9fab-4d63-b4b6-015f534e117d`. Its immutable composition contains 28 categories, 56 systems and 1 655 MaterialVariant; v1 remains a rollback target. The public projection excludes any entry unless visibility is `VISIBLE`, manual review is `APPROVED`, publication is `PUBLISHED`, availability is a known allowed state, price is explicit or safely `PRICE_ON_REQUEST`, and primary media has permitted rights plus `PUBLICATION_APPROVED`. Local override takes precedence only inside the pinned composition; source price history remains unchanged. Missing active version is an empty unpublished catalog, while database or object-integrity failure is a degraded state and never falls back to AMIGO/staging.

## 14. Dependencies, risks and open questions

Dependencies: parity, configurator, pricing, media, sync, admin, data model. Open: `TBD-ASSORT-003`–`005`, `TBD-ASSORT-007`, applicable `TBD-SYSTEM-*`, `TBD-SIZE-001`, `TBD-INVENTORY-001/004-007`, official-export aspect `TBD-SOURCE-AMIGO-002`, `TBD-ASSET-AMIGO-003` and applicable dimensional `TBD-PRICE-*`. `TBD-ASSORT-002`, `TBD-ASSORT-006`, `TBD-PRICE-001` and `TBD-INVENTORY-002` are resolved by accepted evidence/owner decisions.

## 14. Phase 2A target exclusion

- **CATALOG-P2A-001 — MUST:** the Supabase target catalog excludes the five exact business categories named by `OWNER-DECISION-022` and every descendant material/variant/media mapping; all other approved categories remain eligible for migration.
- **CATALOG-P2A-002 — MUST:** exclusion is implemented through a checksum-bound manifest of stable source category IDs/slugs with reason `OWNER_EXCLUDED_NOT_OFFERED`, not a runtime display-name comparison.
- **CATALOG-P2A-003 — MUST:** transform/verify evidence records source and retained category/material/media counts plus the exact excluded delta; a repeat run is a no-op.
- **CATALOG-P2A-004 — MUST NOT:** this target exclusion deletes or mutates the Phase 1 source database, dump, object storage or source history.

Risks: text-key merges, auto-publication, unknown-as-positive, mismapped images, stale availability, fixed price-category enum and history loss. Mitigations are stable identities, independent states, explicit mappings, approvals and immutable revisions.

## 15. Связанные требования и история

Links: `FR-CATALOG-*`, `FR-MATERIAL-*`, `FR-VARIANT-*`, `AMIGO-SYNC-*`, `ASSET-*`, `PRICING-*`, `CAT-INV-001`–`037`.

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Определены normalized entity model, identifiers, four readiness dimensions, material properties, compatibility, availability boundary and lifecycle. |
| 0.2.0 | 2026-08-02 | Локальная admin availability закреплена как source of truth; AMIGO proposal и 7/30-day freshness gates разделены. |
| 0.3.0 | 2026-08-02 | По `OWNER-DECISION-008` добавлены field-level authority, PostgreSQL operational projection, защита local overlays от sync и object-storage boundary для image binaries. |
| 0.4.0 | 2026-08-02 | Phase 1B.1 32-variant source/overlay pilot authorized while full inventory remained gated. |
| 0.5.0 | 2026-08-03 | Recorded the active-version-only public projection, explicit readiness/price/media gates, normalized pilot facets and safe empty/degraded behavior. |
| 0.6.0 | 2026-08-03 | Synchronized the authorized Phase 1B.2 full source capture/import boundary while retaining independent local publication, availability, pricing, orderability and accepted-manifest gates. |
| 0.7.0 | 2026-08-03 | Required missing-entry-only inquiry publication preparation, preservation of every existing Business Owner overlay and explicit checksum-bound review of all catalog/price differences before candidate approval. |
| 0.8.0 | 2026-08-03 | Added exact candidate-bound category-subtree/filter/selected bulk local-overlay controls with atomic apply, stale-preview rejection and immutable per-target evidence while preserving source and other owner fields. |
| 0.9.0 | 2026-08-03 | Required and recorded the complete dynamic admin inventory projection with hierarchy facets, bounded server filtering/pagination and strict separation from public activation and the historical pilot allowlist. |
| 0.10.0 | 2026-08-03 | Required the complete active-only public hierarchy, descendant-aware filtering, stable sort/cursors and material detail/media to resolve from one compatible catalog/price composition without AMIGO or staging reads. |
| 0.11.0 | 2026-08-03 | Recorded real full-catalog identity evidence: article is non-unique descriptive source data, while distinct AMIGO source IDs remain lossless variant identities. |
| 0.12.0 | 2026-08-03 | Required semantic media placements to rebind to current parser-generated source references without duplicate public slots or loss of historical provenance. |
| 0.13.0 | 2026-08-04 | Required deterministic bounded public slugs for retained full-catalog technical category identities without mutating source identity/provenance. |
