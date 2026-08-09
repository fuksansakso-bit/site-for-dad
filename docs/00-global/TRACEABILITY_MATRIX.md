# Матрица трассируемости PROJECT_NAME

## 0. Статус

| Поле | Значение |
|---|---|
| Фаза | Phase 1A–1D passed; Phase 1E authorized/in progress; Phase 1F+ hold |
| Версия | 1.14.0 |
| Дата | 2026-08-09, Europe/Moscow |
| Состояние покрытия | `COVERED_WITH_VISIBLE_TBD` |
| Главный источник требований | [GLOBAL_SPEC.md](../specs/GLOBAL_SPEC.md) 0.20.0 |
| Feature contract | [FEATURE_SPEC.md](../specs/01-product/FEATURE_SPEC.md) |
| Stories | [USER_STORIES.md](../specs/01-product/USER_STORIES.md) |
| Acceptance | [ACCEPTANCE_CRITERIA.md](../specs/01-product/ACCEPTANCE_CRITERIA.md) |
| Tests | [TEST_STRATEGY.md](../quality/TEST_STRATEGY.md) |
| Completion gate | [SPEC_QUALITY_GATE.md](SPEC_QUALITY_GATE.md) |
| MVP / sequence | [MVP_SCOPE](../06-plans/MVP_SCOPE.md), [IMPLEMENTATION_ROADMAP](../06-plans/IMPLEMENTATION_ROADMAP.md) |
| Critical audit | [SPEC_READINESS_AUDIT](../06-plans/SPEC_READINESS_AUDIT.md) |

Матрица подтверждает существование и связь документов, а не готовность production-реализации. `COVERED_WITH_VISIBLE_TBD` означает: требование, профильная спека, story, проверяемый acceptance criterion и test scenario существуют, но фактический тест MAY оставаться `BLOCKED_TBD` до подтверждения формулы, лимита, договора, benchmark, технологии или бизнес-перехода.

## 1. Правила

- Identifier имеет одно нормативное значение и не переиспользуется.
- Нормативный текст требования находится в `GLOBAL_SPEC.md` или профильной спецификации; матрица только связывает его с проверкой.
- Каждая критическая цепочка содержит feature/profile link, story, acceptance criterion и test scenario.
- Ссылка `BLOCKED_TBD` запрещает подменять неизвестное выдуманным значением, но не обнуляет документированное покрытие.
- Story/AC/test связаны точным ID; проверка ссылки на файл и наличие ID входит в completion gate.
- Удалённые или superseded ID остаются зарезервированными в каноническом документе.

## 2. Статусы покрытия

| Статус | Значение |
|---|---|
| `COVERED` | Все звенья созданы, а сценарий не зависит от открытого решения для проектного уровня |
| `COVERED_WITH_VISIBLE_TBD` | Все звенья созданы; выполнение/approval теста ожидает перечисленный TBD/evidence |
| `BLOCKED_TBD` | Зависимое утверждение или реализация запрещены до решения |
| `SUPERSEDED` | Историческая связь сохранена и заменена новой |

## 3. Критические продуктовые цепочки

Каждая строка включает общий feature contract [FEATURE_SPEC.md](../specs/01-product/FEATURE_SPEC.md) и профильную нормативную спецификацию.

| Requirement | Каноническая feature/profile спека | User story | Acceptance criterion | Test scenario | Статус / блокер |
|---|---|---|---|---|---|
| `PARTNER-001` | [GLOBAL_SPEC](../specs/GLOBAL_SPEC.md), [CONTENT_PORTFOLIO_SPEC](../specs/02-domain/CONTENT_PORTFOLIO_SPEC.md) | [US-OWNER-001](../specs/01-product/USER_STORIES.md) | [AC-PARTNER-001](../specs/01-product/ACCEPTANCE_CRITERIA.md) | [TS-PARTNER-001](../quality/TEST_STRATEGY.md) | `COVERED`; governance owners resolved by `OWNER-DECISION-001` |
| `AMIGO-PARITY-001` | [AMIGO_CATALOG_PARITY_SPEC](../specs/02-domain/AMIGO_CATALOG_PARITY_SPEC.md) | [US-GUEST-001](../specs/01-product/USER_STORIES.md) | [AC-AMIGO-PARITY-001](../specs/01-product/ACCEPTANCE_CRITERIA.md) | [TS-AMIGO-PARITY-001](../quality/TEST_STRATEGY.md) | `COVERED_WITH_VISIBLE_TBD`: полный inventory `TBD-ASSORT-002` |
| `AMIGO-SYNC-001` | [AMIGO_SYNC_ARCHITECTURE](../specs/04-technical/AMIGO_SYNC_ARCHITECTURE.md) | [US-SYNC-001](../specs/01-product/USER_STORIES.md) | [AC-AMIGO-SYNC-001](../specs/01-product/ACCEPTANCE_CRITERIA.md) | [TS-AMIGO-SYNC-001](../quality/TEST_STRATEGY.md) | `COVERED_WITH_VISIBLE_TBD`: transport; cadence resolved |
| `FR-CATALOG-001` | [CATALOG_INVENTORY_SPEC](../specs/02-domain/CATALOG_INVENTORY_SPEC.md) | [US-GUEST-002](../specs/01-product/USER_STORIES.md) | [AC-CATALOG-001](../specs/01-product/ACCEPTANCE_CRITERIA.md) | [TS-CATALOG-001](../quality/TEST_STRATEGY.md) | `COVERED` |
| `FR-CATALOG-016` | [CATALOG_INVENTORY_SPEC](../specs/02-domain/CATALOG_INVENTORY_SPEC.md) | [US-ADMIN-001](../specs/01-product/USER_STORIES.md) | [AC-CATALOG-DYNAMIC-001](../specs/01-product/ACCEPTANCE_CRITERIA.md) | [TS-CATALOG-DYNAMIC-001](../quality/TEST_STRATEGY.md) | `COVERED` |
| `FR-CONFIG-001` | [PRODUCT_CONFIGURATOR_SPEC](../specs/02-domain/PRODUCT_CONFIGURATOR_SPEC.md) | [US-GUEST-003](../specs/01-product/USER_STORIES.md) | [AC-CONFIG-001](../specs/01-product/ACCEPTANCE_CRITERIA.md) | [TS-CONFIG-001](../quality/TEST_STRATEGY.md) | `COVERED_WITH_VISIBLE_TBD`: размеры/compatibility |
| `FR-PRICE-001` | [PRICING_CALCULATOR_SPEC](../specs/02-domain/PRICING_CALCULATOR_SPEC.md) | [US-GUEST-004](../specs/01-product/USER_STORIES.md) | [AC-PRICE-001](../specs/01-product/ACCEPTANCE_CRITERIA.md) | [TS-PRICE-001](../quality/TEST_STRATEGY.md) | `COVERED_WITH_VISIBLE_TBD`: active PriceVersion/formula/source fixtures; parity tolerance resolved |
| `FR-STANDARD-PREVIEW-001` | [STANDARD_INTERIOR_PREVIEW_SPEC](../specs/02-domain/STANDARD_INTERIOR_PREVIEW_SPEC.md) | [US-GUEST-005](../specs/01-product/USER_STORIES.md) | [AC-STANDARD-PREVIEW-001](../specs/01-product/ACCEPTANCE_CRITERIA.md) | [TS-STANDARD-PREVIEW-001](../quality/TEST_STRATEGY.md) | `IMPLEMENTED_PHASE_1D`: launch profiles/assets passed; broader gaps remain explicit |
| `FR-AI-VIS-001` | [AI_WINDOW_VISUALIZER_SPEC](../specs/02-domain/AI_WINDOW_VISUALIZER_SPEC.md) | [US-GUEST-006](../specs/01-product/USER_STORIES.md) | [AC-AI-VIS-001](../specs/01-product/ACCEPTANCE_CRITERIA.md) | [TS-AI-VIS-001](../quality/TEST_STRATEGY.md) | `COVERED_WITH_VISIBLE_TBD`: benchmark/privacy/provider |
| `FR-CART-001` | [CART_CHECKOUT_ORDERS_SPEC](../specs/02-domain/CART_CHECKOUT_ORDERS_SPEC.md) | [US-GUEST-007](../specs/01-product/USER_STORIES.md) | [AC-CART-001](../specs/01-product/ACCEPTANCE_CRITERIA.md) | [TS-CART-001](../quality/TEST_STRATEGY.md) | `COVERED` |
| `FR-ORDER-001` | [CART_CHECKOUT_ORDERS_SPEC](../specs/02-domain/CART_CHECKOUT_ORDERS_SPEC.md) | [US-MANAGER-001](../specs/01-product/USER_STORIES.md) | [AC-ORDER-001](../specs/01-product/ACCEPTANCE_CRITERIA.md) | [TS-ORDER-001](../quality/TEST_STRATEGY.md) | `COVERED_WITH_VISIBLE_TBD`: business state machine |
| `FR-INSTALLMENT-001` | [INSTALLMENT_SPEC](../specs/02-domain/INSTALLMENT_SPEC.md) | [US-GUEST-008](../specs/01-product/USER_STORIES.md) | [AC-INSTALLMENT-001](../specs/01-product/ACCEPTANCE_CRITERIA.md) | [TS-INSTALLMENT-001](../quality/TEST_STRATEGY.md) | `COVERED`; условия `TBD-INSTALLMENT-*` не обещаются |
| `FR-AUTH-001` | [AUTH_ACCOUNTS_SPEC](../specs/02-domain/AUTH_ACCOUNTS_SPEC.md) | [US-CUSTOMER-001](../specs/01-product/USER_STORIES.md) | [AC-AUTH-001](../specs/01-product/ACCEPTANCE_CRITERIA.md) | [TS-AUTH-001](../quality/TEST_STRATEGY.md) | `COVERED_WITH_VISIBLE_TBD`: auth/session method |
| `FR-ADMIN-001` | [ADMIN_PANEL_SPEC](../specs/02-domain/ADMIN_PANEL_SPEC.md) | [US-ADMIN-002](../specs/01-product/USER_STORIES.md) | [AC-ADMIN-001](../specs/01-product/ACCEPTANCE_CRITERIA.md) | [TS-ADMIN-001](../quality/TEST_STRATEGY.md) | `COVERED` |

## 4. Критические NFR-цепочки

| Requirement | Каноническая feature/profile спека | User story | Acceptance criterion | Test scenario | Статус / блокер |
|---|---|---|---|---|---|
| `NFR-PERF-001` | [PERFORMANCE](../specs/04-technical/PERFORMANCE.md) | [US-GUEST-009](../specs/01-product/USER_STORIES.md) | [AC-PERF-001](../specs/01-product/ACCEPTANCE_CRITERIA.md) | [TS-PERF-001](../quality/TEST_STRATEGY.md) | `COVERED_WITH_VISIBLE_TBD`: target budgets/region/device |
| `NFR-SEC-001` | [SECURITY_PRIVACY](../specs/04-technical/SECURITY_PRIVACY.md) | [US-ADMIN-003](../specs/01-product/USER_STORIES.md) | [AC-SEC-001](../specs/01-product/ACCEPTANCE_CRITERIA.md) | [TS-SEC-001](../quality/TEST_STRATEGY.md) | `COVERED` at specification level |
| `NFR-PRIV-001` | [SECURITY_PRIVACY](../specs/04-technical/SECURITY_PRIVACY.md) | [US-GUEST-010](../specs/01-product/USER_STORIES.md) | [AC-PRIV-001](../specs/01-product/ACCEPTANCE_CRITERIA.md) | [TS-PRIV-001](../quality/TEST_STRATEGY.md) | `COVERED_WITH_VISIBLE_TBD`: basis/TTL/subprocessors |
| `NFR-ACCESS-001` | [ACCESSIBILITY_SPEC](../specs/03-ux/ACCESSIBILITY_SPEC.md) | [US-GUEST-011](../specs/01-product/USER_STORIES.md) | [AC-ACCESS-001](../specs/01-product/ACCEPTANCE_CRITERIA.md) | [TS-ACCESS-001](../quality/TEST_STRATEGY.md) | `COVERED`; implementation/AT matrix later |

## 5. Полная story → AC → test карта

| Story | Acceptance | Test | Профиль |
|---|---|---|---|
| `US-GUEST-001` | `AC-AMIGO-PARITY-001` | `TS-AMIGO-PARITY-001` | [AMIGO parity](../specs/02-domain/AMIGO_CATALOG_PARITY_SPEC.md) |
| `US-GUEST-002` | `AC-CATALOG-001` | `TS-CATALOG-001` | [Catalog](../specs/02-domain/CATALOG_INVENTORY_SPEC.md) |
| `US-GUEST-003` | `AC-CONFIG-001` | `TS-CONFIG-001` | [Configurator](../specs/02-domain/PRODUCT_CONFIGURATOR_SPEC.md) |
| `US-GUEST-004` | `AC-PRICE-001` | `TS-PRICE-001` | [Pricing](../specs/02-domain/PRICING_CALCULATOR_SPEC.md) |
| `US-GUEST-005` | `AC-STANDARD-PREVIEW-001` | `TS-STANDARD-PREVIEW-001` | [Standard preview](../specs/02-domain/STANDARD_INTERIOR_PREVIEW_SPEC.md) |
| `US-GUEST-006` | `AC-AI-VIS-001` | `TS-AI-VIS-001` | [AI visualizer](../specs/02-domain/AI_WINDOW_VISUALIZER_SPEC.md) |
| `US-GUEST-007` | `AC-CART-001` | `TS-CART-001` | [Cart/orders](../specs/02-domain/CART_CHECKOUT_ORDERS_SPEC.md) |
| `US-GUEST-008` | `AC-INSTALLMENT-001` | `TS-INSTALLMENT-001` | [Installment](../specs/02-domain/INSTALLMENT_SPEC.md) |
| `US-GUEST-009` | `AC-PERF-001` | `TS-PERF-001` | [Performance](../specs/04-technical/PERFORMANCE.md) |
| `US-GUEST-010` | `AC-PRIV-001` | `TS-PRIV-001` | [Security/privacy](../specs/04-technical/SECURITY_PRIVACY.md) |
| `US-GUEST-011` | `AC-ACCESS-001` | `TS-ACCESS-001` | [Accessibility](../specs/03-ux/ACCESSIBILITY_SPEC.md) |
| `US-GUEST-012` | `AC-WHATSAPP-001` | `TS-WHATSAPP-001` | [Cart/orders](../specs/02-domain/CART_CHECKOUT_ORDERS_SPEC.md) |
| `US-CUSTOMER-001` | `AC-AUTH-001` | `TS-AUTH-001` | [Accounts](../specs/02-domain/AUTH_ACCOUNTS_SPEC.md) |
| `US-CUSTOMER-002` | `AC-PROJECT-SAVE-001` | `TS-PROJECT-SAVE-001` | [Accounts](../specs/02-domain/AUTH_ACCOUNTS_SPEC.md) |
| `US-CUSTOMER-003` | `AC-QUOTE-HISTORY-001` | `TS-QUOTE-HISTORY-001` | [Pricing](../specs/02-domain/PRICING_CALCULATOR_SPEC.md) |
| `US-CUSTOMER-004` | `AC-VIS-DELETE-001` | `TS-VIS-DELETE-001` | [AI visualizer](../specs/02-domain/AI_WINDOW_VISUALIZER_SPEC.md) |
| `US-CUSTOMER-005` | `AC-ORDER-STATUS-001` | `TS-ORDER-STATUS-001` | [Cart/orders](../specs/02-domain/CART_CHECKOUT_ORDERS_SPEC.md) |
| `US-MANAGER-001` | `AC-ORDER-001` | `TS-ORDER-001` | [Cart/orders](../specs/02-domain/CART_CHECKOUT_ORDERS_SPEC.md) |
| `US-MANAGER-002` | `AC-MEASURE-001` | `TS-MEASURE-001` | [Cart/orders](../specs/02-domain/CART_CHECKOUT_ORDERS_SPEC.md) |
| `US-MANAGER-003` | `AC-QUOTE-CONFIRM-001` | `TS-QUOTE-CONFIRM-001` | [Pricing](../specs/02-domain/PRICING_CALCULATOR_SPEC.md) |
| `US-MANAGER-004` | `AC-MANAGER-CONTEXT-001` | `TS-MANAGER-CONTEXT-001` | [Cart/orders](../specs/02-domain/CART_CHECKOUT_ORDERS_SPEC.md) |
| `US-MANAGER-005` | `AC-WARRANTY-001` | `TS-WARRANTY-001` | [Cart/orders](../specs/02-domain/CART_CHECKOUT_ORDERS_SPEC.md) |
| `US-ADMIN-001` | `AC-CATALOG-DYNAMIC-001` | `TS-CATALOG-DYNAMIC-001` | [Catalog](../specs/02-domain/CATALOG_INVENTORY_SPEC.md) |
| `US-ADMIN-002` | `AC-ADMIN-001` | `TS-ADMIN-001` | [Admin](../specs/02-domain/ADMIN_PANEL_SPEC.md) |
| `US-ADMIN-003` | `AC-SEC-001` | `TS-SEC-001` | [Security/privacy](../specs/04-technical/SECURITY_PRIVACY.md) |
| `US-ADMIN-004` | `AC-PRICE-ACTIVATE-001` | `TS-PRICE-ACTIVATE-001` | [Pricing](../specs/02-domain/PRICING_CALCULATOR_SPEC.md) |
| `US-ADMIN-005` | `AC-ROLLBACK-001` | `TS-ROLLBACK-001` | [Deployment](../specs/04-technical/DEPLOYMENT.md) |
| `US-OWNER-001` | `AC-PARTNER-001` | `TS-PARTNER-001` | [Content/partner](../specs/02-domain/CONTENT_PORTFOLIO_SPEC.md) |
| `US-OWNER-002` | `AC-OWNER-DASHBOARD-001` | `TS-OWNER-DASHBOARD-001` | [Admin](../specs/02-domain/ADMIN_PANEL_SPEC.md) |
| `US-OWNER-003` | `AC-BUSINESS-RULE-001` | `TS-BUSINESS-RULE-001` | [Feature](../specs/01-product/FEATURE_SPEC.md) |
| `US-CONTENT-001` | `AC-ASSET-MAP-001` | `TS-ASSET-MAP-001` | [Media pipeline](../specs/04-technical/ASSET_MEDIA_PIPELINE.md) |
| `US-CONTENT-002` | `AC-PORTFOLIO-001` | `TS-PORTFOLIO-001` | [Content/portfolio](../specs/02-domain/CONTENT_PORTFOLIO_SPEC.md) |
| `US-CONTENT-003` | `AC-BADGE-001` | `TS-BADGE-001` | [Content/partner](../specs/02-domain/CONTENT_PORTFOLIO_SPEC.md) |
| `US-CONTENT-004` | `AC-ASSET-REVOKE-001` | `TS-ASSET-REVOKE-001` | [Media pipeline](../specs/04-technical/ASSET_MEDIA_PIPELINE.md) |
| `US-SYNC-001` | `AC-AMIGO-SYNC-001` | `TS-AMIGO-SYNC-001` | [AMIGO sync](../specs/04-technical/AMIGO_SYNC_ARCHITECTURE.md) |
| `US-SYNC-002` | `AC-SYNC-DIFF-001` | `TS-SYNC-DIFF-001` | [AMIGO sync](../specs/04-technical/AMIGO_SYNC_ARCHITECTURE.md) |
| `US-SYNC-003` | `AC-SYNC-ROLLBACK-001` | `TS-SYNC-ROLLBACK-001` | [AMIGO sync](../specs/04-technical/AMIGO_SYNC_ARCHITECTURE.md) |
| `US-AI-001` | `AC-AI-UPLOAD-001` | `TS-AI-UPLOAD-001` | [AI pipeline](../specs/04-technical/AI_PIPELINE.md) |
| `US-AI-002` | `AC-GEOMETRY-001` | `TS-GEOMETRY-001` | [AI pipeline](../specs/04-technical/AI_PIPELINE.md) |
| `US-AI-003` | `AC-AI-REFINE-001` | `TS-AI-REFINE-001` | [AI pipeline](../specs/04-technical/AI_PIPELINE.md) |

## 6. Partner, catalog, price, visualizer и media chains

| Цепочка | Нормативная связь | Состояние |
|---|---|---|
| Partner permission | `PARTNER-001` → `AMIGO-PERMISSION-2026-08-02-001` → asset-level rights/publication → audit | Source scope подтверждён; конкретные assets проходят mapping |
| Dynamic catalog | AMIGO authority → controlled discovery/import/sync → manifest + PostgreSQL staged local catalog → validation/diff → Business Owner review → explicit admin activation of immutable `CatalogVersion` → overlay composition → version-pinned public/derived reads | Phase 1B.2 accepted: 21 019-item manifest, active v2 composition and 1 655 public variants |
| Price | AMIGO base-price authority → immutable source/price version in PostgreSQL → applicable Business Owner local override with explicit precedence → exact input/breakdown → quote history → parity suite | Phase 1C passed for four dated scopes/40 fixtures/≤1 RUB; other formulas remain request/manual and public calculation never reads AMIGO directly |
| Standard preview | published configuration/material → renderer profile/assets → deterministic `STANDARD_INTERIOR_PREVIEW` → fallback | Отдельный от client-photo geometry/AI обязательный путь |
| AI preview | private upload → user-confirmed geometry → base render → optional constrained refinement → validation/delete | Provider/benchmark/TTL TBD; base/manual fallback обязателен |
| Media | source/right evidence → immutable original → derivatives → asset-level approval → public/private delivery → revoke/delete | 2 818 approved local catalog objects accepted; hotlink запрещён; client/AI всегда private |
| Sync | authorized capture → immutable snapshot/manifest/checkpoint/staged candidate in PostgreSQL → validate/diff → Business Owner review → admin activation/rollback → rebuild version-pinned projections | Full transport, restart resume, daily/manual history, rollback and semantic no-op repeat passed; live/staging dependency and auto activation/delete remain prohibited |

### 6.1. Owner decision chains

| Decision | Closed TBD | Canonical/profile propagation | Verification / phase |
|---|---|---|---|
| `OWNER-DECISION-001` | `TBD-BIZ-001` | `GLOBAL_SPEC`, glossary, roles, quality gate | Governance review; QG-147/148 |
| `OWNER-DECISION-002` | `TBD-PRICE-007` | pricing policy/spec, admin, RBAC, audit | `TS-PRICE-ACTIVATE-001`; Phase 1C |
| `OWNER-DECISION-003` | `TBD-MIN-PRICE-001` | `FR-CALC-009`, pricing policy/spec, MVP | pricing table/property cases; Phase 1C, not 1A |
| `OWNER-DECISION-004` | `TBD-INVENTORY-002` | catalog/admin/sync specs | availability conflict/overwrite tests; Phase 1B+ |
| `OWNER-DECISION-005` | `TBD-PRICE-SOURCE-002` | external/pricing/sync/admin/observability | freshness boundary tests; Phase 1B/1C |
| `OWNER-DECISION-006` | `TBD-PRICE-PARITY-001` | global/pricing/test strategy | pricing parity suite; Phase 1C |
| `OWNER-DECISION-007` | `TBD-INFRA-002` | performance/observability/deployment/tests | `TS-PERF-001`; Phase 1H |
| `OWNER-DECISION-008` | Authority split clarified; `TBD-SOURCE-AMIGO-002`, `TBD-ASSORT-002`, `TBD-PRICE-001` and asset inventory remain open | `GLOBAL_SPEC`, glossary, external/pricing/rights policies, catalog/parity/pricing/admin/content, architecture/data/sync/media/storage specs | `TS-AMIGO-SYNC-001`, `TS-CATALOG-DYNAMIC-001`, `TS-PRICE-001`, `TS-PORTFOLIO-001`; Phase 1B/1C/1F |
| `OWNER-DECISION-009` | No TBD closed: public-serving topology, approval/no-delete/override/audit/version rules resolved; `TBD-SOURCE-AMIGO-002`, `TBD-ASSORT-002`, `TBD-PRICE-001` and asset inventory remain open | `GLOBAL_SPEC`, feature/parity/pricing, glossary, external/pricing policies, architecture, data model, AMIGO sync, specification/implementation roadmaps, quality gate, test strategy and this matrix | `TS-AMIGO-SYNC-001`, `TS-SYNC-DIFF-001`, `TS-SYNC-ROLLBACK-001`, `TS-CATALOG-DYNAMIC-001`, `TS-PRICE-001`; Phase 1B/1C, not Phase 1A implementation evidence |
| `OWNER-DECISION-010` | No full-catalog/formula/provider TBD closed: authorized frozen Phase 1B.1 pilot is complete | `GLOBAL_SPEC`, stable Phase 1B.1 plan, dated transport discovery, quality gate and completion report | `QG-169`–`176`, `QG-185`–`194`; real 32-ID pilot passed |
| `OWNER-DECISION-011` | No production TBD closed; `TBD-INFRA-010` created to preserve provider selection gate | `GLOBAL_SPEC`, ADR-0009, architecture/storage/media/security/deployment/test specs, local/CI scripts, README and dependency baseline | `STORAGE-SPEC-022`–`027`, `TEST-SPEC-019`–`021`; VersityGW 15/15 contract and Docker restart persistence passed 2026-08-03 |
| `OWNER-DECISION-012` | No TBD closed in advance; accepted evidence later closed `TBD-ASSORT-002`, `TBD-ASSORT-006` and catalog PriceVersion aspect `TBD-PRICE-001` | `GLOBAL_SPEC`, source/rights/pricing policies, implementation/spec roadmaps, QG-195–230, stable plan and completion report | QG-195–230 passed; Phase 1C+ explicitly excluded |
| `OWNER-DECISION-013` | Active calculation aspect of `TBD-PRICE-001` resolved; `TBD-PRICE-002`–`005` and `TBD-SIZE-001` partially evidenced only for four scopes | `GLOBAL_SPEC`, configurator/pricing/data/API/architecture/test specs, QG-231–270, dated fixtures, stable plan and completion report | QG-231–270 passed; Phase 1D+ explicitly excluded |
| `OWNER-DECISION-014/015` | Initial two-scene/four-family launch aspect of `TBD-PREVIEW-001` resolved with registered photoreal partner layers; individual exact-swatch gaps remain explicit | `GLOBAL_SPEC`, standard preview/configurator/media/storage/data/API/architecture/security/performance/test specs, QG-271–310, plan/report and mapping-gap register | `PASSED_PHASE_1D_STANDARD_PREVIEW`; Phase 1E+ excluded |
| `OWNER-DECISION-016` | Phase 1E request statuses/fixed recipient/safe handoff are resolved for the local/CI scope; production PII/legal/retention and official WhatsApp API remain open | `GLOBAL_SPEC`, cart/configurator/preview/roles/data/API/architecture/security/test specs, QG-311–360 and active plan | `AUTHORIZED_PHASE_1E_IN_PROGRESS`; Phase 1F+ excluded |

## 7. Phase 0C MVP and implementation traceability

| Freeze / plan requirement | Canonical behavior | Existing story / AC / test | Implementation phase | Gate |
|---|---|---|---|---|
| `MVP-001/002` | `SCOPE-001`, `NFR-MOTION-001`–`005`, landing/UX specs | `US-GUEST-009/011` → `AC-PERF/ACCESS-001` → `TS-PERF/ACCESS-001` | 1A shell; release in 1H | Brand/assets/performance evidence |
| `MVP-003`–`007`, `MVP-021/022` | `SCOPE-002/003/039/040`, catalog/parity/sync specs, `OWNER-DECISION-008/009` | `US-GUEST-001/002`, `US-ADMIN-001`, `US-SYNC-001` and linked AC/tests | 1B | Authorized source/pilot/rights plus local staged diff, Business Owner approval, admin activation, immutable `CatalogVersion`, audit and rollback evidence |
| `MVP-008/009` | `FR-CONFIG-*`, configurator spec | `US-GUEST-003` → `AC-CONFIG-001` → `TS-CONFIG-001` | 1C | Compatibility/size/dimension evidence |
| `MVP-010/024` | `FR-PRICE-*`, pricing policy/spec | `US-GUEST-004`, `US-ADMIN-004` and linked AC/tests | 1C | Formula/PriceVersion/source fixtures; per-item minimum/parity/activator resolved |
| `MVP-011/023` | `SCOPE-034/042`, `FR-STANDARD-PREVIEW-*`, `STD-PREV-*`, `OWNER-DECISION-014` | `US-GUEST-005` → `AC-STANDARD-PREVIEW-001` → `TS-STANDARD-PREVIEW-001` | 1D | QG-271–310; exact mapping gaps remain visible |
| `MVP-012`–`016` | `FR-CART-008`–`012`, `FR-REQUEST-001`–`011`, cart/order/installment specs | Phase 1E unit/contract/integration/browser/security/recovery matrix in active plan | 1E | QG-311–360; synthetic local/CI PII only |
| `MVP-017` | content/portfolio and asset rights specs | `US-CONTENT-002` → `AC-PORTFOLIO-001` → `TS-PORTFOLIO-001` | 1F | Own-work rights/consent |
| `MVP-018/019` | `SCOPE-010/012`, `FR-AUTH-007/008`, admin/auth specs | `US-ADMIN-002`, `US-CUSTOMER-001/002` and linked AC/tests | 1F | Identity/recovery/role gates; `TBD-ACCOUNT-001` resolved |
| `MVP-020/026` | `SCOPE-007/041/042`, AI visualizer/pipeline/evaluation | `US-GUEST-006`, `US-AI-001`–`003` and linked AC/tests | 1G | Provider/privacy/TTL/evaluation/cost gates |
| `ROADMAP-1A-001`, `PLAN-1A-001` | Architecture + accepted ADR-0007–0010 | `PLAN-1A-AC-001`–`010` execution evidence in [Phase 1A report](../06-plans/completed/PHASE_1A_FOUNDATION_REPORT.md) | 1A | `PASSED_PHASE_1A_FOUNDATION`; Phase 1B forbidden |
| `ROADMAP-1C-001`, `OWNER-DECISION-013` | `FR-CONFIG-*`, `FR-PRICE-*`, `FR-CALC-*`, active catalog/price/quote/admin contracts | Pricing unit/contract/integration/parity and browser evidence in [Phase 1C report](../06-plans/completed/PHASE_1C_CONFIGURATOR_PRICING_REPORT.md) | 1C | `PASSED_PHASE_1C_CONFIGURATOR_PRICING`; Phase 1D forbidden |
| `ROADMAP-1D-001`, `OWNER-DECISION-014/015` | `FR-STANDARD-PREVIEW-*`, `STD-PREV-*`, ADR-0004/0006 and active local catalog/configuration | Preview domain/API/renderer/browser/visual/recovery evidence in [Phase 1D report](../06-plans/completed/PHASE_1D_STANDARD_PREVIEW_REPORT.md) | 1D | QG-271–310 passed; Phase 1E forbidden |
| `ROADMAP-1E-001`, `OWNER-DECISION-016` | `FR-CART-008`–`012`, `FR-REQUEST-001`–`011`, `CART-SPEC-023`–`036` and ADR-0001/0003/0008/0010 | [Phase 1E plan](../06-plans/active/PHASE_1E_CART_WHATSAPP_ORDERS_PLAN.md), future package/API/UI/test/report evidence | 1E | QG-311–320 passed; QG-321–360 in progress; Phase 1F forbidden |
| `ROADMAP-1H-001` | deployment/security/performance/a11y/test specs | NFR stories/AC/tests + recovery/admin chains | 1H | Full launch checklist and go/no-go |

Post-MVP IDs `POST-MVP-001`–`015` have no Phase 1 delivery commitment and MUST NOT be inferred from existing general feature stories without a future scope/traceability update.

## 8. Phase 1A execution evidence

| Acceptance | Реализация | Проверка / результат |
|---|---|---|
| `PLAN-1A-AC-001` | [Windows lifecycle](../../tooling/scripts/foundation-environment.ps1), [local contract](../../infrastructure/local/README.md) | Clean bootstrap, healthy status, stop, restart with no pending migrations, reset passed |
| `PLAN-1A-AC-002` | [CI contract](../../infrastructure/ci/pipeline.json), [verification runner](../../tooling/scripts/verify-foundation.ps1) | 9 / 9 stages passed in worktree and clean clone; browser 20 / 20 |
| `PLAN-1A-AC-003` | Workspace package manifests and public `src/index.ts` interfaces | [Boundary checker](../../tooling/scripts/check-boundaries.mjs) passed for 11 workspaces |
| `PLAN-1A-AC-004` | [Typed config](../../packages/config/src/server.ts), redaction and artifact scanner | Config negative tests, repository/build scans and generated secret canaries passed |
| `PLAN-1A-AC-005` | [Prisma schema](../../packages/db/prisma/schema.prisma), three versioned migrations | Empty/repeat/upgrade/drift/failed recovery/forward compensation passed on PostgreSQL 18.4 |
| `PLAN-1A-AC-006` | [S3 storage port](../../packages/storage/src/types.ts), [local provisioning](../../packages/storage/src/provision-local.ts) | Historical Phase 1A RustFS synthetic contract passed; active adapter superseded by `OWNER-DECISION-011` after real-image Windows failure |
| `PLAN-1A-AC-007` | [Graphile adapter](../../packages/jobs/src/adapter.ts), [worker runtime](../../apps/worker/src/runtime.ts) | Retry, timeout, durable idempotency, permanent failure, graceful drain and queue-lock release passed |
| `PLAN-1A-AC-008` | [Identity port/policy](../../packages/identity/src/policy.ts), [request security](../../packages/identity/src/request-security.ts) | Deny-by-default, role/object matrix, revoke/expiry/current grants, workload separation passed |
| `PLAN-1A-AC-009` | [Observability package](../../packages/observability/src/index.ts), web/worker readiness | Safe errors/logs/context/metrics/OTLP boundary and dependency degradation tests passed |
| `PLAN-1A-AC-010` | [Phase scope scanner](../../tooling/scripts/validate-phase-scope.mjs) | No AMIGO/business/media/AI/production surfaces or tables found |

Detailed runtime versions, commit list, skipped production-only checks and acceptance decision are in [PHASE_1A_FOUNDATION_REPORT.md](../06-plans/completed/PHASE_1A_FOUNDATION_REPORT.md).

### 8.1. Phase 1B.1 local storage recovery evidence

| Requirement / decision | Implementation | Verification / result |
|---|---|---|
| `OWNER-DECISION-011`, `ARCH-SPEC-029/030`, `DEPLOY-SPEC-022/023` | [VersityGW Compose](../../infrastructure/local/compose.storage.yml), [Windows lifecycle](../../tooling/scripts/foundation-environment.ps1) | Exact v1.4.1 digest, loopback S3/Admin, POSIX data/versioning/IAM named volumes, graceful shutdown and Docker Desktop auto-recovery passed |
| `STORAGE-SPEC-022`–`027`, `TEST-SPEC-019`–`021` | [S3 adapter](../../packages/storage/src/s3-object-storage.ts), [contract suite](../../packages/storage/test/integration/storage-contract.integration.test.ts), [gate runner](../../tooling/scripts/storage-integration.ps1) | 15/15; all nine sizes byte/SHA-equal; signed read/write, multipart complete/abort, private buckets, failures/concurrency/idempotence and restart persistence passed |
| `MEDIA-PIPE-024` | Real allowlisted AMIGO JPEG gate and media importer | 515,180 bytes, SHA-256 `ac86fc976afc2063cc97e1528611c978a348f357d26c8fe3c59b7c23f113d0cd`; 59/59 allowlisted assets imported and reverified after restart |

### 8.2. Phase 1B.1 pilot execution evidence

| Gate / behavior | Implementation | Verification / result |
|---|---|---|
| `QG-185`–`188`, catalog/source/version/overlay requirements | Catalog adapters/jobs, PostgreSQL source/version/business models and admin commands | Run `9bd1a4f8-e456-4617-9e16-7f5604c1c65c` completed 275/275; 32 variants, 59 media, 32 prices and 40 composition entries; OWNER-approved/ADMIN-activated CatalogVersion/PriceVersion v1 |
| `QG-189`, `FR-CATALOG-001/016`, public-serving requirements | `/admin/catalog`, `/catalog`, material API and controlled version-pinned media route | 32 public items/primary images; allowlisted search/facets, HMAC cursor, outage/stale/unknown rejection and no source/object/credential leak passed |
| `QG-190/191`, idempotency/recovery/storage requirements | Full lifecycle restart plus `catalog-pilot-acceptance` runner | 59 objects/8,340,101 bytes verified; historical failed run unchanged; no-op repeat created zero versions/duplicates and changed no active pointer/count |
| `QG-192`–`194`, final quality/scope requirements | Root CI, documentation/scope/boundary/security validators and completion report | 9/9 CI stages, VersityGW 15/15, Playwright 25/25, build/scans passed; Phase 1C and production remain absent |

### 8.3. Phase 1B.2 full catalog execution evidence

| Gate / behavior | Implementation | Verification / result |
|---|---|---|
| `QG-203`–`210`, discovery/import/media/price/overlay | Existing adapter, resumable jobs, normalized source layers, local media and price snapshots | Run `7d19a6e8-abcc-4bc6-a180-c0a5b59e17d6` completed 21 019/21 019 with 0 errors; 28 categories, 56 systems, 9 models, 1 655 variants, 2 818 objects and 1 664 price records |
| `QG-211`–`218`, bulk/review/activation/rollback/recovery | Exact bulk commands, checksum-bound review, immutable v2 versions and restart-safe storage/checkpoints | OWNER/ADMIN activated CatalogVersion `8975b18c-d7de-49cc-a6e6-d7566b69460a` and PriceVersion `9fdc0a74-9fab-4d63-b4b6-015f534e117d`; selected bulk, v2→v1→v2 rollback, failed/cancelled lineage and two restarts passed |
| `QG-219`–`227`, scale/unit/contract/integration/browser/recovery/CI | 2 048-item scale harness, catalog/full acceptance, five browser profiles and root exact-toolchain CI | Bounded queries/cursors/no spill, semantic repeat `ae9b8759-7b14-4ca6-9b13-b518113a63b0` with zero versions/differences, full 2 818-object verification and all CI stages passed |
| `QG-228`–`230`, docs/history/scope | Canonical specs, policies, stable plan, report, changelog and final commit | Phase 1B.2 evidence synchronized; Phase 1C+, production provider/secrets/deployment absent |

### 8.4. Phase 1C configurator and pricing execution evidence

| Gate / behavior | Implementation | Verification / result |
|---|---|---|
| `QG-241`–`252`, configurator/pricing/quote/admin/security | [`packages/pricing`](../../packages/pricing/), [PostgreSQL adapter](../../packages/db/src/pricing.ts), [public flow](../../apps/web/app/configure/) and versioned API routes | Active CatalogVersion v2 + calculation PriceVersion v5; dynamic eligibility/dimensions, server totals, local override, immutable quote, safe statuses, OWNER/ADMIN and CSRF/origin/rate/idempotency/audit boundaries passed |
| `QG-253`–`258`, unit/contract/integration/browser/parity/property | [engine tests](../../packages/pricing/test/engine.test.ts), [real PostgreSQL test](../../packages/db/test/integration/pricing-real.integration.test.ts), [browser tests](../../tests/browser/configurator-pricing.spec.ts) | 13 pricing unit/property + 9 contract + real PostgreSQL scenario + 8 Playwright scenarios passed; 40/40 fixtures, maximum deviation 100 kopecks |
| `QG-259`–`269`, performance/degradation/migration/quality/history | Version/configuration indexes, bounded projections, additive migration, no-store snapshots, transaction/idempotency checks and repository gates | No N+1/full-browser catalog load/live AMIGO; migration preserves v2 data/volumes; rollback/duplicate/old-snapshot assertions and CI-equivalent quality checks passed; Phase 1D absent |
| `QG-270`, documentation | Canonical affected specs, plan, report, changelog and traceability | Base/branch/commits/routes/families/rules/fixtures/deviation/examples/version/snapshot/tests/skips/gate/PR/status/TBD recorded |

## 9. Coverage metrics

| Метрика | Значение |
|---|---:|
| Критические requirement chains | 18 / 18 имеют feature/profile + story + AC + test |
| Полные user stories | 40 |
| Acceptance criteria | 40 |
| Именованные test scenarios | 40 |
| Акторы stories | 8 / 8 |
| Нормативные специализированные specs | 33 |
| Quality/evaluation artifacts | 2 |
| ADR | 10 accepted |
| Непокрытые критические chains | 0 |
| Phase 0C critical spec audit | 14 / 14 reviewed; 0 blocked/contradictory after fixes |
| P0 classification | 61 / 61 classified; 0 unclassified |
| Phase 1A acceptance | 10 / 10 `PLAN-1A-AC-*`; QG-149–158 passed |
| Phase 1A automated tests | 61 unit/contract + 19 integration/recovery + 20 browser |
| Phase 1B.1 acceptance | QG-169–194 passed; real 32-ID/59-media publication pilot and final CI completed |
| Phase 1B.2 acceptance | QG-195–230 passed; real full manifest, active v2 versions, media/restart/no-op/public/CI evidence completed |
| Phase 1C acceptance | QG-231–270 passed; four verified scopes, 40 fixtures, active calculation v5, immutable quotes, admin and CI evidence completed |
| Phase 1D acceptance | `PASSED_PHASE_1D_STANDARD_PREVIEW`; QG-271–310 passed |

## 10. Completion conditions

Покрытие считается валидным, если автоматическая проверка подтверждает существование всех linked files и каждого ID, stories сохраняют полный шаблон, acceptance содержит позитивное и негативное проверяемое поведение, test strategy содержит level/preconditions/input/expected result/status, а открытые TBD не обозначены как выполненные tests.

Матрица отражает завершённые Phase 1A–1D и разрешённую Phase 1E с открытым completion gate; Phase 1D evidence is in the [completion report](../06-plans/completed/PHASE_1D_STANDARD_PREVIEW_REPORT.md), а Phase 1E — в [active plan](../06-plans/active/PHASE_1E_CART_WHATSAPP_ORDERS_PLAN.md). Phase 1F+ и production deployment не разрешены.

## 11. История изменений

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Создана плановая global-to-0B матрица с 18 reserved chains. |
| 1.0.0 | 2026-08-02 | Все 18 critical chains и все 40 stories связаны с существующими feature/profile specs, AC и test scenarios; TBD сохранены видимыми. |
| 1.1.0 | 2026-08-02 | Добавлены MVP/Phase 1A–1H chains, P0/audit metrics и исправлен тип standard preview; implementation остаётся не разрешена. |
| 1.2.0 | 2026-08-02 | Добавлены chains `OWNER-DECISION-001`–`007`, accepted ADR/QG status и Phase 1A-only authorization boundaries. |
| 1.3.0 | 2026-08-02 | Все `PLAN-1A-AC-001`–`010` связаны с фактическими ports, scripts и tests; добавлены Phase 1A counts/report и запрет перехода к 1B. |
| 1.4.0 | 2026-08-02 | Добавлена цепочка `OWNER-DECISION-008` для AMIGO/Business Owner authority и PostgreSQL/object-storage projection; existing import/price/asset TBD и Phase 1B hold сохранены. |
| 1.5.0 | 2026-08-02 | Добавлена цепочка `OWNER-DECISION-009` для единственного PostgreSQL public-serving source, обязательных diff/owner/admin activation, no-auto-delete, override precedence, audit/version/rollback и существующих test chains; Phase 1B hold сохранён. |
| 1.6.0 | 2026-08-02 | `OWNER-DECISION-010`, QG-169–176, active 32-ID plan и dated transport evidence связаны как Phase 1B.1 entry; later-phase hold и незавершённый acceptance сохранены. |
| 1.7.0 | 2026-08-03 | `OWNER-DECISION-011` связан с provider-neutral VersityGW adapter, exact contract/restart evidence и новым `TBD-INFRA-010`; production storage и Phase 1C остаются gated. |
| 1.8.0 | 2026-08-03 | Phase 1B.1 implementation, real run/version/media/public delivery, restart/no-op recovery, QG-185–194 and final 9/9 CI evidence linked; later-phase hold preserved. |
| 1.9.0 | 2026-08-03 | `OWNER-DECISION-012`, active Phase 1B.2 plan and QG-195–230 linked without claiming full import evidence; Phase 1C+ and production hold preserved. |
| 1.10.0 | 2026-08-04 | Linked accepted real run/manifest, active v2 pair, 2 818 media objects, bulk/rollback/restart/no-op/public/scale/CI evidence and QG-203–230; later-phase hold preserved. |
| 1.11.0 | 2026-08-08 | Linked `OWNER-DECISION-013`, active catalog/calculation v5, four verified scopes/40 fixtures/≤1 RUB parity, configurator/quote/admin/security/tests and QG-231–270; Phase 1D+ hold preserved. |
| 1.12.0 | 2026-08-08 | Linked `OWNER-DECISION-014`, standard preview requirements/ADR, active plan and QG-271–310; Phase 1D entry passed while completion evidence and mapping gaps remain open, and Phase 1E+ stays prohibited. |
| 1.13.0 | 2026-08-08 | Closed Phase 1D traceability with `OWNER-DECISION-015`, photoreal local layers, four renderer/visual profiles, state/API/storage/mobile/recovery evidence, gap register and QG-271–310; Phase 1E stays prohibited. |
| 1.14.0 | 2026-08-09 | Linked `OWNER-DECISION-016`, immutable quote-backed cart/request snapshot, fixed-recipient handoff, safe public summary, minimal staff administration, active plan and QG-311–360; production PII and Phase 1F+ stay prohibited. |
