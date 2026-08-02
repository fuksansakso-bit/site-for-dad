# Feature specification PROJECT_NAME

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Draft 0B — продуктовый scope зафиксирован; профильные функции могут быть `BLOCKED_BY_TBD` |
| Версия | 0.1.0 |
| Дата | 2026-08-02, Europe/Moscow |
| Владелец | Владелец бизнеса / Product Owner; имя `TBD-BIZ-001` |
| Главный источник | [GLOBAL_SPEC.md](../GLOBAL_SPEC.md) 0.4.0 |
| Связанные документы | [USER_STORIES.md](USER_STORIES.md), [USER_FLOWS.md](USER_FLOWS.md), [ROLES_PERMISSIONS.md](ROLES_PERMISSIONS.md), [ACCEPTANCE_CRITERIA.md](ACCEPTANCE_CRITERIA.md) |

## 1. Назначение и границы ответственности

Документ превращает глобальную концепцию в управляемый feature portfolio. Он отвечает, какую ценность и сквозное поведение должен обеспечить продукт, но передаёт точные domain rules профильным спецификациям. При конфликте действует `GLOBAL_SPEC`, затем принятый ADR, затем профильная спецификация.

In scope:

- каталог авторизованного партнёра AMIGO и локальная готовность позиций;
- собственный конфигуратор и предварительный расчёт;
- стандартный интерьерный preview и отдельная AI-примерка;
- корзина, сохранение, WhatsApp handoff, заявка, замер и заказ;
- нейтральный ручной flow рассрочки;
- гостевой режим, аккаунт, административные и контентные операции;
- синхронизация source snapshots, media rights, наблюдаемость и безопасная деградация;
- самостоятельный premium UX, responsive и accessibility.

Out of scope фазы 0B:

- production-код, конкретный framework, база, миграции и инфраструктура;
- фактический импорт/скачивание AMIGO data или media;
- утверждение отсутствующих price formulas, size limits, availability и installment terms;
- копирование кода, DOM, закрытого API или design AMIGO;
- автоматическая покупка, банковское одобрение и приём платежа;
- выбор AI/hosting/storage provider без evaluation и ADR.

## 2. Термины и акторы

Нормативные термины определены в [GLOSSARY.md](../../00-global/GLOSSARY.md). В этом документе:

- `source-backed` означает наличие source ID/URL, capture/verification timestamps, version и administrative status;
- `locally ready` означает отдельное положительное решение по publication, availability, pricing и orderability;
- `standard preview` — детерминированная сцена без пользовательской фотографии;
- `AI visualizer` — geometry-first обработка приватной фотографии клиента с необязательным generative refinement;
- `handoff` — передача минимального безопасного контекста менеджеру без создания подтверждённого заказа.

Акторы: гость, зарегистрированный клиент, менеджер, администратор, владелец, контент-менеджер, система синхронизации и AI worker. Их права канонически заданы в [ROLES_PERMISSIONS.md](ROLES_PERMISSIONS.md).

## 3. Feature portfolio и приоритет

| Feature | Ценность | MVP | Каноническая спецификация | Approval blocker |
|---|---|---|---|---|
| Partner identity | Доверие и доказуемое происхождение | Да | `AMIGO_CATALOG_PARITY_SPEC` | Brand placement `TBD-ASSET-AMIGO-003` не блокирует нейтральную подпись |
| Dynamic catalog | Выбор всего подтверждённого ассортимента | Да | `CATALOG_INVENTORY_SPEC` | Полный inventory `TBD-ASSORT-002` |
| Product configurator | Совместимая конфигурация изделия | Да | `PRODUCT_CONFIGURATOR_SPEC` | Compatibility/size `TBD-ASSORT-003`, `TBD-SIZE-001` |
| Preliminary price | Воспроизводимый расчёт | Да | `PRICING_CALCULATOR_SPEC` | Active version/formulas/parity TBD |
| Standard preview | Быстрый visual feedback | Да | `STANDARD_INTERIOR_PREVIEW_SPEC` | Scene/assets inventory |
| AI window visualizer | Персональная примерка | Да, base geometry; refinement optional | `AI_WINDOW_VISUALIZER_SPEC` | Benchmark/privacy/provider TBD |
| Cart/project | Несколько конфигураций и редактирование | Да | `CART_CHECKOUT_ORDERS_SPEC` | Guest TTL TBD |
| WhatsApp/order handoff | Связь с локальным менеджером | Да | `CART_CHECKOUT_ORDERS_SPEC` | Confirmed contact/SLA TBD |
| Installment inquiry | Безопасный интерес к рассрочке | Да, manual neutral | `INSTALLMENT_SPEC` | `TBD-INSTALLMENT-001`–`013` |
| Account/history | Возврат к проектам и статусам | Да | `AUTH_ACCOUNTS_SPEC` | Auth/recovery decisions TBD |
| Admin operations | Управляемые данные и approvals | Да | `ADMIN_PANEL_SPEC` | Named role assignments |
| Portfolio/content | Локальное доказательство работ | Да | `CONTENT_PORTFOLIO_SPEC` | Content inventory/rights |
| AMIGO sync | Обновления без runtime dependency | Да, controlled process | `AMIGO_SYNC_ARCHITECTURE` | Transport/cadence TBD |
| Premium experience | Отличимый бренд и удобство | Да | UX specs | Final brand/name/content TBD |

## 4. Нормативные feature requirements

### 4.1. Partner и catalog

- **FTR-001 — MUST:** интерфейс показывает партнёрский статус только вместе с подтверждённой relationship record и разрешённым badge asset либо нейтральным текстовым fallback.
- **FTR-002 — MUST:** каждая source entity сохраняет provenance и не становится автоматически публичной, доступной, оценённой или заказываемой.
- **FTR-003 — MUST:** новые source categories появляются через data/configuration workflow без обязательного релиза кода.
- **FTR-004 — MUST:** неизвестная совместимость, размер, цена или availability даёт честный blocked/manual state, а не положительное предположение.
- **FTR-005 — MUST:** материал не показывается как выбираемый без локального mapped asset с допустимыми rights/publication states.

### 4.2. Configure и price

- **FTR-006 — MUST:** конфигуратор ведёт пользователя family → system → model → mounting → dimensions → quantity → material → hardware/control/options → validation → price → cart/preview.
- **FTR-007 — MUST:** любое изменение upstream-поля инвалидирует или повторно проверяет зависимые selections и quote.
- **FTR-008 — MUST:** предварительная цена всегда связана с immutable input snapshot, price version, currency, breakdown и status.
- **FTR-009 — MUST:** при отсутствии активной подтверждённой цены продукт не показывает `0`, догадку или устаревшее значение как актуальное.
- **FTR-010 — MUST:** сохранённый quote воспроизводится по своей версии и не меняется после source sync или override.
- **FTR-011 — MUST:** source price и local override показываются в audit trail раздельно; отсутствие override означает local sale price = verified source price.

### 4.3. Preview и AI

- **FTR-012 — MUST:** standard preview работает без загрузки пользовательского фото и использует выбранный реальный material variant.
- **FTR-013 — MUST:** standard preview отражает family-specific geometry, hardware color, control side и допустимое положение изделия.
- **FTR-014 — MUST:** AI visualizer требует явного выбора/коррекции окна и сохраняет рамы, ручки, окклюзии и перспективу.
- **FTR-015 — MUST:** geometry render является самостоятельным результатом; generative refinement не блокирует его и не может менять SKU/фактуру без disclosure.
- **FTR-016 — MUST:** фотографии клиента, masks и outputs приватны, не попадают в публичный CDN/logs/analytics/training и удаляются по утверждённой policy.

### 4.4. Cart, handoff и account

- **FTR-017 — MUST:** корзина хранит несколько независимых configuration revisions, quantity, quote reference и optional preview reference.
- **FTR-018 — MUST:** cart item можно edit, duplicate и remove без скрытого изменения других items.
- **FTR-019 — MUST:** WhatsApp payload содержит только минимально необходимый summary и безопасную ссылку/identifier, а не private media URL или internal price rules.
- **FTR-020 — MUST:** заявка на замер не становится подтверждённым заказом до действий менеджера и согласования.
- **FTR-021 — MUST:** до решения installment TBD интерфейс использует только текст «Доступна рассрочка. Уточните условия у менеджера».
- **FTR-022 — MUST:** гостевой проект можно использовать без обязательной регистрации; привязка к аккаунту требует доказанного ownership и не меняет quote history.

### 4.5. Operations и quality

- **FTR-023 — MUST:** sync проходит staging → validation → diff → approval → activation либо rejection/rollback и никогда не публикует данные напрямую из transport.
- **FTR-024 — MUST:** опасные административные действия требуют permission check, reason и audit event; price activation и rights/publication approval разделяются.
- **FTR-025 — MUST:** source/AI/WhatsApp/analytics outage сохраняет каталог из последней подтверждённой локальной версии и ручной контактный путь.
- **FTR-026 — MUST:** critical state transitions идемпотентны и имеют actor, timestamp, from/to state, reason и correlation ID.
- **FTR-027 — MUST:** responsive layout сохраняет порядок задач и доступность controls при narrow viewport, zoom и touch.
- **FTR-028 — MUST:** keyboard, screen reader semantics, focus, contrast и reduced motion входят в acceptance, а не считаются post-launch enhancement.
- **FTR-029 — MUST:** аналитика использует минимальные events без фото, masks, object URLs, свободного private text и credentials.
- **FTR-030 — MUST:** ни один `BLOCKED_BY_TBD` capability не может перейти в `APPROVED_FOR_IMPLEMENTATION` без закрытия указанного вопроса и повторной проверки зависимых AC/tests.

## 5. Основные и альтернативные сценарии

Основные сценарии определены в [USER_FLOWS.md](USER_FLOWS.md). Общий happy path: обнаружение → каталог → конфигурация → проверенный quote → preview → cart → WhatsApp/замер → manager confirmation. Альтернативы обязательны:

- неизвестная category/system mapping → карточка скрыта либо `Уточнить у менеджера`;
- несовместимое поле → понятная причина и ближайшие допустимые варианты;
- нет active price → `Цена уточняется`, cart draft разрешён без ценового обещания;
- standard asset отсутствует → нейтральный preview/fallback, но не чужая ткань;
- AI quality низкая → ручная коррекция или base render;
- WhatsApp недоступен → подтверждённый телефон/форма, если утверждены;
- сессия истекла → объяснение и recovery по утверждённой guest policy;
- sync rejected → прежняя active version продолжает обслуживать продукт.

## 6. Состояния и переходы

| Aggregate | Минимальные состояния | Разрешённый принцип перехода |
|---|---|---|
| Catalog record | `DISCOVERED`, `STAGED`, `VERIFIED`, `ACTIVE`, `HIDDEN`, `RETIRED` | Только approved sync/admin action; source disappearance не удаляет историю |
| Configuration | `DRAFT`, `VALID`, `INVALID`, `QUOTED`, `IN_CART`, `ARCHIVED` | Изменение входа возвращает к validation |
| Quote | `UNAVAILABLE`, `PRELIMINARY`, `STALE`, `SUPERSEDED`, `CONFIRMED` | Исторический snapshot immutable |
| Preview | `REQUESTED`, `VALIDATING`, `READY`, `FAILED`, `EXPIRED`, `DELETED` | AI refinement — отдельная revision |
| Cart | `ACTIVE`, `SUBMITTED`, `ABANDONED`, `EXPIRED` | Submit фиксирует snapshot, но не заказ |
| Lead/order | `CREATED`, `IN_REVIEW`, `MEASUREMENT_PENDING`, `QUOTED`, `CONFIRMED`, `IN_FULFILLMENT`, `COMPLETED`, `CANCELLED` | Детали зависят от `TBD-BIZ-004` |
| Sync run | `CREATED`, `FETCHING`, `STAGED`, `VALIDATING`, `REVIEW_REQUIRED`, `APPROVED`, `ACTIVATED`, `REJECTED`, `ROLLED_BACK`, `FAILED` | Activation только после diff approval |

## 7. Данные, поля и связи

Feature-level contract требует:

- stable IDs и immutable revisions для catalog/configuration/quote/preview/cart/order/sync;
- `sourceId`, `sourceEntityId`, `sourceVersion`, `capturedAt`, `verifiedAt` для внешних данных;
- независимые `publicationState`, `availabilityState`, `pricingState`, `orderabilityState`;
- `rightsStatus`, `publicationStatus`, `assetRole`, hash и domain mapping для media;
- `actorId/actorType`, `correlationId`, reason и timestamps для mutation audit;
- version references вместо копирования изменяемых правил в client payload.

Логическая структура задана в `DATA_MODEL.md`; конкретные database types не выбираются в 0B.

## 8. Валидация, совместимость и edge cases

- входы нормализуются в единицах, определённых domain spec; округления не предполагаются;
- whitespace/case/locale не должны создавать duplicate source identity;
- одна category может иметь несколько systems, aliases и historical slugs;
- material может существовать без orderable configuration и наоборот не допускается;
- исчезнувшая source entity становится inactive/retired, а не физически удаляется из historical quote;
- два окна, несколько створок, нестандартная форма и частичная окклюзия требуют явной geometry support state;
- duplicate submit/retry не создаёт два lead/order/sync activation;
- stale browser tab получает version conflict и безопасный refresh/merge path;
- cancelled/expired private output не остаётся доступным по старой ссылке.

## 9. Ошибки и деградация

| Класс | Клиентское поведение | Операционное поведение |
|---|---|---|
| Validation | Поле и причина, focus на ошибку | Без error-level alert |
| Missing domain rule | Нейтральный manual quote/manager path | Data-quality task с TBD/source context |
| Source unavailable | Последняя verified local version + freshness disclosure | Retry/backoff, no active overwrite |
| Pricing unavailable | Нет суммы; configuration сохраняется | Alert владельцу price data |
| Renderer failure | Retry/base fallback; выбранные данные сохранены | Correlation ID без image contents |
| Unauthorized | Нейтральный отказ без existence leak | Security audit event |
| Conflict | Предложение обновить revision | Optimistic concurrency evidence |

## 10. Security, privacy, performance и analytics

Security: deny-by-default RBAC, ownership checks, short-lived private access, upload validation, rate limits, idempotency and audit. Privacy: purpose limitation, data minimization, consent/notice, retention and deletion. Performance: budgets задаются в `PERFORMANCE.md`; до закрытия `TBD-INFRA-*` не выдумываются численные SLA. Analytics: события отражают funnel и failures, но не содержат чувствительных payloads.

## 11. Acceptance criteria и тесты

Критические feature AC определены в [ACCEPTANCE_CRITERIA.md](ACCEPTANCE_CRITERIA.md), а test scenarios — в [TEST_STRATEGY.md](../../quality/TEST_STRATEGY.md). Минимальный gate:

- `AC-AMIGO-PARITY-001`, `AC-CATALOG-DYNAMIC-001`, `AC-CONFIG-001`, `AC-PRICE-001`;
- `AC-STANDARD-PREVIEW-001`, `AC-AI-VIS-001`, `AC-CART-001`, `AC-ORDER-001`;
- `AC-AMIGO-SYNC-001`, `AC-SEC-001`, `AC-PRIV-001`, `AC-ACCESS-001`.

## 12. Зависимости, риски и открытые вопросы

Ключевые зависимости: source inventory/export, price data/rules, compatibility/dimensions, rights inventory, client-photo policy, auth/WhatsApp choices and operational workflow. Канонические открытые вопросы находятся в [OPEN_QUESTIONS.md](../../00-global/OPEN_QUESTIONS.md), прежде всего `TBD-ASSORT-002/003`, `TBD-SOURCE-AMIGO-002`, `TBD-PRICE-*`, `TBD-SIZE-001`, `TBD-AI-*`, `TBD-PRIV-*`, `TBD-ACCOUNT-*`, `TBD-INSTALLMENT-*`.

Главные риски: ложная parity, неверный SKU/material, устаревшая цена, несанкционированная публикация, утечка фото, generative drift, inaccessible interaction и неаудируемая admin mutation. Каждый риск имеет профильные controls и negative tests.

## 13. Связанные требования

`PARTNER-*`, `AMIGO-PARITY-*`, `AMIGO-SYNC-*`, `FR-CATALOG-*`, `FR-CONFIG-*`, `FR-PRICE-*`, `FR-STANDARD-PREVIEW-*`, `FR-VIS-*`, `FR-AI-VIS-001`, `FR-CART-*`, `FR-ORDER-*`, `FR-INSTALLMENT-*`, `FR-AUTH-*`, `FR-ADMIN-*`, `NFR-*`, `FTR-001`–`030`.

## 14. История изменений

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Создан полный feature portfolio 0B, boundaries, requirements, states, failure modes и ссылки на AC/tests. |
