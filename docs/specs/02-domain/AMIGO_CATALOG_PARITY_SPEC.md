# AMIGO catalog and functional parity specification

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Phase 1B.1 32-item factual pilot authorized; full parity/assortment remains gated |
| Версия | 0.4.0 |
| Дата | 2026-08-02 |
| Source evidence | [AMIGO public parity snapshot](../../research/AMIGO_PUBLIC_PARITY_SNAPSHOT_2026-08-02.md) |
| Pilot transport | [AMIGO Phase 1B.1 discovery](../../research/AMIGO_PILOT_TRANSPORT_DISCOVERY_2026-08-02.md) |
| Governance | [EXTERNAL_SOURCES.md](../../00-global/EXTERNAL_SOURCES.md), [ASSET_RIGHTS_REGISTER.md](../../00-global/ASSET_RIGHTS_REGISTER.md) |

## 1. Назначение, ответственность и non-goals

Спека определяет функциональный охват AMIGO собственным продуктом PROJECT_NAME. Parity означает достижение пользовательской цели на разрешённых данных, а не копирование DOM, кода, закрытых API, текста, дизайна или алгоритма.

In scope: partner identity, dynamic catalog, material discovery, configurator, preliminary pricing, standard preview, cart/project, WhatsApp/order handoff, source synchronization and provenance. PROJECT_NAME расширяет этот путь AI-визуализатором, локальными услугами, account/admin workflows и stronger privacy/accessibility.

Out of scope: pixel parity, live iframe as product solution, automated checkout/payment, unverified availability, reuse of AMIGO customer/project data, scraping without permission, and any assertion that a public API exists.

## 2. Термины, акторы и статусы

| Status | Meaning |
|---|---|
| `MATCHED` | Та же пользовательская capability реализуема собственным UX/domain contract |
| `EXTENDED` | PROJECT_NAME добавляет локальную/AI/privacy/accessibility ценность |
| `DEFERRED` | Capability осознанно не входит в MVP или требует readiness |
| `BLOCKED_BY_TBD` | Target известен, но data/rule/evidence недостаточны |
| `NOT_APPLICABLE` | Source behavior не переносится из-за локальной модели бизнеса |

Actors: guest/customer, local manager/admin/content/owner, sync system and AI worker. Public AMIGO observations are research evidence, not production dependency.

## 3. Нормативные требования parity

- **PARITY-SPEC-001 — MUST:** каждая parity claim имеет source capability, local target, status, evidence date и gap/owner.
- **PARITY-SPEC-002 — MUST:** dynamic source category никогда не активируется только потому, что появилась на AMIGO.
- **PARITY-SPEC-003 — MUST:** locally exposed category сохраняет source identity и собственные publication/availability/pricing/orderability states.
- **PARITY-SPEC-004 — MUST:** AMIGO catalog, price and media rights используются в подтверждённом partner scope, но конкретный transport и asset mapping проверяются отдельно.
- **PARITY-SPEC-005 — MUST:** iframe/customizer разрешён только как read-only research reference; production flow собственный.
- **PARITY-SPEC-006 — MUST:** exact source terminology/SKU сохраняется там, где это нужно для идентичности, а UX labels MAY локализоваться без изменения смысла.
- **PARITY-SPEC-007 — MUST:** feature, которой не хватает verified rules/data, получает manual/deferred behavior, а не фальшивый `MATCHED`.
- **PARITY-SPEC-008 — MUST:** source outage не прекращает работу последней подтверждённой локальной версии и contact flow.
- **PARITY-SPEC-009 — MUST:** parity coverage пересматривается при каждом source snapshot/version change.
- **PARITY-SPEC-010 — MUST:** AMIGO examples маркируются как партнёрские примеры, не как выполненные PROJECT_NAME работы.
- **PARITY-SPEC-011 — MUST:** public source price/category/availability observation не заменяет active local approval.
- **PARITY-SPEC-012 — MUST:** расширения PROJECT_NAME не должны искажать identity выбранного AMIGO product/material.
- **PARITY-SPEC-013 — MUST:** AMIGO is source authority for AMIGO-origin products, materials, technical data, catalog images and base prices; local parity maps/presents those values but does not redefine them.
- **PARITY-SPEC-014 — MUST:** Business Owner is authority for local availability, visibility/publication, price overrides, portfolio and commercial conditions; parity with AMIGO MUST NOT copy AMIGO-local conditions into those fields or overwrite their PostgreSQL revisions.

## 4. Полная category target map

Динамический scope не является закрытым enum. Таблица фиксирует текущий обязательный target inventory по owner request; точный source entity inventory и локальная готовность — `TBD-ASSORT-002`.

| Category target | Наблюдение/основание | Local target | Initial status | Gate |
|---|---|---|---|---|
| Рулонные шторы | Public catalog/customizer | Full family/system/model/config flow | `BLOCKED_BY_TBD` inventory/limits | Catalog mapping + price version |
| Рулонные Zebra / День-Ночь | Public catalog/customizer | Separate family with stripe/position behavior | `BLOCKED_BY_TBD` | Compatibility/render rules |
| ZIP/LOCK systems | Customizer branch | Source system, options and constraints | `DEFERRED` until complex readiness | Technical matrix |
| Мансардные/ROOF | Customizer branch | Roof-specific mounting/configuration | `DEFERRED` | Size/install evidence |
| Шторы плиссе | Public/customizer | MIDI/MAXI/MINI/RUS variants as source-backed systems | `BLOCKED_BY_TBD` | Full mapping and price |
| Сотовые шторы / гофре | Public/customizer | MIDI/MAXI/RUS source systems | `BLOCKED_BY_TBD` | Full mapping and price |
| Горизонтальные алюминиевые | Public catalog/customizer | 16/25/50 mm and Wave 35 where verified | `BLOCKED_BY_TBD` | System/size/price matrix |
| Горизонтальные деревянные | Public page/customizer | 25/50 source systems | `BLOCKED_BY_TBD` | Materials/options/prices |
| Вертикальные тканевые | Public catalog/customizer | Fabric vertical system | `BLOCKED_BY_TBD` | Lamella/rail rules |
| Вертикальные пластиковые | Public catalog/customizer | Plastic variant | `BLOCKED_BY_TBD` | Inventory/rules |
| Вертикальные алюминиевые | Public catalog/customizer | Aluminum variant | `BLOCKED_BY_TBD` | Inventory/rules |
| Вертикальные «Бриз» | Public catalog/customizer | Breeze type | `BLOCKED_BY_TBD` | Inventory/rules |
| Вертикальные мультифактурные | Public catalog | Multifactor composition | `DEFERRED` | Composition/config model |
| Mirage | Public/customizer | Independent family/system | `BLOCKED_BY_TBD` | Full source mapping |
| Римские шторы | Public/customizer | Roman variants, separate geometry | `BLOCKED_BY_TBD` | Model/option/price rules |
| Портьеры / шторы | Public/customizer | Drapery variants | `DEFERRED` for complex fulfillment | Fabric/measurement/sewing rules |
| Карнизы | Customizer | Accessory/product family | `DEFERRED` | Local offering decision |
| LIFT / motorized | Customizer/owner target | Motor/control option or family per source | `DEFERRED` | Electrical/compatibility/safety |
| Ставни / shutters | Customizer | 1–4 section systems | `DEFERRED` | Geometry/install/price readiness |
| Готовые решения | Owner target/public navigation | Curated source-backed configurations | `BLOCKED_BY_TBD` | Definition/publication/availability |
| Будущая новая category | Dynamic requirement | Staged schema/mapping workflow | `DEFERRED` until reviewed | `AC-CATALOG-DYNAMIC-001` |

`DEFERRED` здесь не исключает категорию из dynamic catalog model; он запрещает обещать готовый configurator/price/order flow до прохождения её readiness gate.

## 5. Source customizer hierarchy snapshot

Наблюдаемые branches на дату research snapshot используются как evidence, а не вечный список:

- Roller: MINI, UNI, Classic, complex shapes, cassette, ROOF, ZIP/LOCK;
- Zebra: MINI, UNI, Classic, cassette, complex shapes;
- Pleated: MIDI, MAXI, MINI, RUS;
- Cellular: MIDI, MAXI, RUS;
- Horizontal aluminum: Classic 25/16, cassette 25/16, System 50, interframe;
- Horizontal wood: cassette 25, System 25/50;
- Vertical: fabric, plastic, aluminum, assembled rail, Breeze;
- Mirage; Roman/drapery variants; curtain rods/LIFT; shutters 1–4 sections.

Activation still depends on stable IDs, source capture, local mapping and readiness. Labels seen in UI may differ from export terminology and require alias records.

## 6. Functional parity matrix

| Capability | AMIGO observation | PROJECT_NAME contract | Status | Owner/gap |
|---|---|---|---|---|
| Category navigation | Public catalog categories | Dynamic IA backed by local states | `MATCHED` design / data blocked | Catalog manager |
| Family/system/model hierarchy | Customizer branching | Normalized source/domain chain | `MATCHED` model | Full inventory TBD |
| Material search | Search in customizer | Search aliases/name/article | `MATCHED` | Index/data |
| Material filters | Pattern/structure/use/wet/reflective/composition | Typed property facets with unknown semantics | `MATCHED` target | Complete mapping TBD |
| Source price categories | Observed `E`, `0`, `1`–`5` | Dynamic string + separate local tier | `MATCHED` | Source contexts TBD |
| Dimensions | Width/height inputs | Unit-aware validated dimensions | `BLOCKED_BY_TBD` | Limits/rounding |
| Mounting/model/options | Configurator choices | Compatibility graph and explainable filtering | `BLOCKED_BY_TBD` | Matrix evidence |
| Hardware colors | White/oak/brown/dark-grey/black observed for sample | Source option values, not global enum | `MATCHED` target | Per-system mapping |
| Control/length/comment | Sample customizer | Typed control/options + free comment only where safe | `MATCHED` target | Compatibility |
| Preliminary price | Public calculator | Versioned local pricing provider and breakdown | `BLOCKED_BY_TBD` | Active rules/parity |
| Standard interior visualization | Customizer scene | Own deterministic renderer | `MATCHED` target | Asset/scene profiles |
| Download visualization | Observed control | Accessible export/share-safe revision | `MATCHED` target | Format/rights |
| Cart icon/add flow | Observed in customizer | Own multi-item cart/project | `MATCHED` target | Exact source UX irrelevant |
| Payment/installment page | Public informational surface | Neutral manual installment handoff | `NOT_APPLICABLE` exact terms | Local provider/legal TBD |
| Services | Public AMIGO service content | Local free measure/delivery/install across confirmed region | `EXTENDED/LOCALIZED` | Operational workflow |
| Project examples | Public projects page | Separate partner examples and local portfolio | `EXTENDED` | Asset mapping |
| Client-photo AI visualization | Not observed as same flow | Geometry-first private visualizer | `EXTENDED` | AI/privacy benchmark |
| Accounts/history | Target owner requirement | Own customer project/quote history | `EXTENDED` | Auth decisions |
| Admin sync/diff/rollback | Not public user capability | Controlled source governance | `EXTENDED` | Transport/cadence |
| Accessibility/reduced motion | Not established by research | Required equivalent routes | `EXTENDED` | UX testing |

## 7. Material property parity

| Property dimension | Observed examples | Local modeling rule |
|---|---|---|
| Structure/texture | Surface structure | Typed property/value with source label and normalized optional semantic |
| Pattern | Pattern category | Multi-valued facet; no inference from image alone |
| Use/purpose | Room/use hints | Source-backed tags; no safety claim beyond evidence |
| Wet-room suitability | Wet-room filter | Boolean/tri-state with source/version |
| Reflective layer | Reflective/backing filter | Structured value and evidence, not assumed thermal performance |
| Composition | Material composition | Text/structured components preserving source units/meaning |
| Color | Visual/source name/code | Variant-level; color family optional normalized value |
| Transparency | Where available | Enumerated only after source semantics mapping |
| Price category | `E`, `0`, `1`–`5` observed | Dynamic string scoped by source/catalog/version |
| Article/SKU | Product/material identifiers | Stable source identifier/alias, never generated silently |

## 8. Data and provenance contract

Every parity record contains `parityCapabilityId`, `sourceRecordId`, `sourceUrlOrAuthorizedReference`, `observedAt`, `sourceVersion/context`, `localFeatureId`, `status`, `evidenceSummary`, `gap`, `owner`, `reviewedAt`, `nextReviewTrigger`. Category/system/material parity additionally links stable domain IDs and readiness states.

Source values enter PostgreSQL staging and an exact diff, never directly public UI. Only an active approved `CatalogVersion` after Business Owner approval and explicit administrator activation may serve parity capabilities; version-pinned derived projections are rebuildable from it. PartnerRelationship stores fields mandated by `PARTNER-004`; asset records follow the rights register; price follows version policy.

## 9. Validation, errors, compatibility and edge cases

- source category renamed/moved → preserve stable local/source ID and alias history;
- duplicate labels/slugs → disambiguate by source ID/context, never merge by text alone;
- one material belongs to multiple compatible systems → shared material + explicit variant/compatibility edges;
- observed UI option absent in export → conflict requiring evidence, not deletion;
- source removal → create tombstone/proposed diff; never auto-retire/hide/delete local data or Business Owner overlays; an explicit approved local transition may later stop new selection while historical quote remains;
- asset and catalog revisions out of sync → publication blocked for mismatched variant;
- source category appears but prices do not → catalog inquiry may exist, priced cart cannot;
- category changes classification → versioned mapping and impact review.

Errors use `SOURCE_UNAVAILABLE`, `SOURCE_SCHEMA_CHANGED`, `MAPPING_AMBIGUOUS`, `RIGHTS_BLOCKED`, `LOCAL_NOT_READY`, `PRICE_UNAVAILABLE` and correlation IDs. Users see neutral language; operators see evidence links without credentials.

## 10. Failure behavior and rollback

AMIGO unavailability uses the last active verified local snapshot subject to freshness policy. Failed capture/diff never overwrites active data. Post-activation anomaly can rollback active pointers while retaining failed revisions/evidence. Public pages never fetch AMIGO at runtime for critical catalog/cart/quote functions.

## 11. Security, privacy, performance and analytics

Partner credentials/references are secrets and excluded from logs/client bundles. AMIGO customer data is not imported. Catalog data is cacheable only by local publication state; private AI/account data is unrelated. Parity analytics track capability usage/gaps/version freshness, never source credentials or private images. Performance is measured on local catalog and own renderer, not AMIGO response time.

## 12. Acceptance criteria and tests

Primary AC: `AC-AMIGO-PARITY-001`, `AC-CATALOG-DYNAMIC-001`, `AC-CONFIG-001`, `AC-PRICE-001`, `AC-STANDARD-PREVIEW-001`, `AC-CART-001`, `AC-AMIGO-SYNC-001`, `AC-PARTNER-001`.

Required tests include source taxonomy fixtures, rename/remove/schema drift, property mapping, unknown category, offline source, rights-blocked asset, missing price, exact material identity and parity status completeness. Test cases use captured authorized fixtures when available; browser automation must not bypass access or scrape production.

## 13. Dependencies, risks and open questions

Dependencies: catalog/configurator/pricing/preview/cart/sync/media specs. Blockers: `TBD-ASSORT-002/003`, `TBD-SOURCE-AMIGO-002`, `TBD-PRICE-*`, `TBD-SIZE-001`, `TBD-ASSET-AMIGO-003`. Risks: marketing overstates parity, dynamic category becomes silently active, source semantics mistranslated, examples misattributed, volatile customizer treated as API.

## 14. Связанные требования и история

Links: `PARTNER-*`, `AMIGO-PARITY-*`, `AMIGO-SYNC-*`, `FR-CATALOG-*`, `FR-CONFIG-*`, `FR-PRICE-*`, `FR-STANDARD-PREVIEW-*`, `FR-CART-*`, `PARITY-SPEC-001`–`012`.

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Созданы category target map, customizer hierarchy snapshot, capability/property parity matrices и readiness rules. |
| 0.2.0 | 2026-08-02 | Added AMIGO-vs-Business Owner data authority boundary from `OWNER-DECISION-008`; local PostgreSQL projection remains distinct from parity/source truth. |
| 0.3.0 | 2026-08-02 | Aligned parity with `OWNER-DECISION-009`: only active PostgreSQL `CatalogVersion` serves public capabilities; source removal becomes reviewed diff and never auto-deletes/hides local data. |
