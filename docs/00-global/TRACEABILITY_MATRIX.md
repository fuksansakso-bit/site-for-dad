# Матрица трассируемости PROJECT_NAME

## 0. Статус

| Поле | Значение |
|---|---|
| Фаза | 0B — специализированные спецификации, completion gate `PASSED` |
| Версия | 1.0.0 |
| Дата | 2026-08-02, Europe/Moscow |
| Состояние покрытия | `COVERED_WITH_VISIBLE_TBD` |
| Главный источник требований | [GLOBAL_SPEC.md](../specs/GLOBAL_SPEC.md) 0.5.0 |
| Feature contract | [FEATURE_SPEC.md](../specs/01-product/FEATURE_SPEC.md) |
| Stories | [USER_STORIES.md](../specs/01-product/USER_STORIES.md) |
| Acceptance | [ACCEPTANCE_CRITERIA.md](../specs/01-product/ACCEPTANCE_CRITERIA.md) |
| Tests | [TEST_STRATEGY.md](../quality/TEST_STRATEGY.md) |
| Completion gate | [SPEC_QUALITY_GATE.md](SPEC_QUALITY_GATE.md) |

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
| `PARTNER-001` | [GLOBAL_SPEC](../specs/GLOBAL_SPEC.md), [CONTENT_PORTFOLIO_SPEC](../specs/02-domain/CONTENT_PORTFOLIO_SPEC.md) | [US-OWNER-001](../specs/01-product/USER_STORIES.md) | [AC-PARTNER-001](../specs/01-product/ACCEPTANCE_CRITERIA.md) | [TS-PARTNER-001](../quality/TEST_STRATEGY.md) | `COVERED`; персональный approver остаётся `TBD-BIZ-001` |
| `AMIGO-PARITY-001` | [AMIGO_CATALOG_PARITY_SPEC](../specs/02-domain/AMIGO_CATALOG_PARITY_SPEC.md) | [US-GUEST-001](../specs/01-product/USER_STORIES.md) | [AC-AMIGO-PARITY-001](../specs/01-product/ACCEPTANCE_CRITERIA.md) | [TS-AMIGO-PARITY-001](../quality/TEST_STRATEGY.md) | `COVERED_WITH_VISIBLE_TBD`: полный inventory `TBD-ASSORT-002` |
| `AMIGO-SYNC-001` | [AMIGO_SYNC_ARCHITECTURE](../specs/04-technical/AMIGO_SYNC_ARCHITECTURE.md) | [US-SYNC-001](../specs/01-product/USER_STORIES.md) | [AC-AMIGO-SYNC-001](../specs/01-product/ACCEPTANCE_CRITERIA.md) | [TS-AMIGO-SYNC-001](../quality/TEST_STRATEGY.md) | `COVERED_WITH_VISIBLE_TBD`: transport/cadence |
| `FR-CATALOG-001` | [CATALOG_INVENTORY_SPEC](../specs/02-domain/CATALOG_INVENTORY_SPEC.md) | [US-GUEST-002](../specs/01-product/USER_STORIES.md) | [AC-CATALOG-001](../specs/01-product/ACCEPTANCE_CRITERIA.md) | [TS-CATALOG-001](../quality/TEST_STRATEGY.md) | `COVERED` |
| `FR-CATALOG-016` | [CATALOG_INVENTORY_SPEC](../specs/02-domain/CATALOG_INVENTORY_SPEC.md) | [US-ADMIN-001](../specs/01-product/USER_STORIES.md) | [AC-CATALOG-DYNAMIC-001](../specs/01-product/ACCEPTANCE_CRITERIA.md) | [TS-CATALOG-DYNAMIC-001](../quality/TEST_STRATEGY.md) | `COVERED` |
| `FR-CONFIG-001` | [PRODUCT_CONFIGURATOR_SPEC](../specs/02-domain/PRODUCT_CONFIGURATOR_SPEC.md) | [US-GUEST-003](../specs/01-product/USER_STORIES.md) | [AC-CONFIG-001](../specs/01-product/ACCEPTANCE_CRITERIA.md) | [TS-CONFIG-001](../quality/TEST_STRATEGY.md) | `COVERED_WITH_VISIBLE_TBD`: размеры/compatibility |
| `FR-PRICE-001` | [PRICING_CALCULATOR_SPEC](../specs/02-domain/PRICING_CALCULATOR_SPEC.md) | [US-GUEST-004](../specs/01-product/USER_STORIES.md) | [AC-PRICE-001](../specs/01-product/ACCEPTANCE_CRITERIA.md) | [TS-PRICE-001](../quality/TEST_STRATEGY.md) | `COVERED_WITH_VISIBLE_TBD`: active PriceVersion/formula/parity |
| `FR-STANDARD-PREVIEW-001` | [STANDARD_INTERIOR_PREVIEW_SPEC](../specs/02-domain/STANDARD_INTERIOR_PREVIEW_SPEC.md) | [US-GUEST-005](../specs/01-product/USER_STORIES.md) | [AC-STANDARD-PREVIEW-001](../specs/01-product/ACCEPTANCE_CRITERIA.md) | [TS-STANDARD-PREVIEW-001](../quality/TEST_STRATEGY.md) | `COVERED`; profiles/prototype pending |
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
| Dynamic catalog | source snapshot → normalized UUID/source identity → compatibility/property mapping → local readiness/publication | Model complete; real full inventory ожидает transport/data |
| Price | `PricingProvider` → immutable source/price version → exact input/breakdown → quote history → parity suite | Boundary complete; formula/data/tolerance TBD |
| Standard preview | published configuration/material → renderer profile/assets → deterministic `GEOMETRIC_PREVIEW` → fallback | Отдельный от AI обязательный путь |
| AI preview | private upload → user-confirmed geometry → base render → optional constrained refinement → validation/delete | Provider/benchmark/TTL TBD; base/manual fallback обязателен |
| Media | source/right evidence → immutable original → derivatives → asset-level approval → public/private delivery → revoke/delete | Hotlink запрещён; client/AI всегда private |
| Sync | authorized capture → immutable snapshot → normalize/validate → diff → approval → activation/rollback | Live dependency запрещена; transport/cadence TBD |

## 7. Coverage metrics

| Метрика | Значение |
|---|---:|
| Критические requirement chains | 18 / 18 имеют feature/profile + story + AC + test |
| Полные user stories | 40 |
| Acceptance criteria | 40 |
| Именованные test scenarios | 40 |
| Акторы stories | 8 / 8 |
| Нормативные специализированные specs | 33 |
| Quality/evaluation artifacts | 2 |
| ADR | 6 |
| Непокрытые критические chains | 0 |

## 8. Completion conditions

Покрытие считается валидным, если автоматическая проверка подтверждает существование всех linked files и каждого ID, stories сохраняют полный шаблон, acceptance содержит позитивное и негативное проверяемое поведение, test strategy содержит level/preconditions/input/expected result/status, а открытые TBD не обозначены как выполненные tests.

Эта матрица не разрешает implementation. Следующая фаза требует отдельного письменного решения владельца после [completion gate](SPEC_QUALITY_GATE.md).

## 9. История изменений

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Создана плановая global-to-0B матрица с 18 reserved chains. |
| 1.0.0 | 2026-08-02 | Все 18 critical chains и все 40 stories связаны с существующими feature/profile specs, AC и test scenarios; TBD сохранены видимыми. |
