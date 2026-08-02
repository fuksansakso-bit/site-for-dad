# User stories PROJECT_NAME

## 0. Метаданные и правила

| Поле | Значение |
|---|---|
| Статус | Draft 0B — 40 содержательных stories определены |
| Версия | 0.2.0 |
| Дата | 2026-08-02, Europe/Moscow |
| Scope | Гость, клиент, менеджер, администратор, владелец, контент-менеджер, sync system, AI worker |
| Acceptance source | [ACCEPTANCE_CRITERIA.md](ACCEPTANCE_CRITERIA.md) |
| Flow source | [USER_FLOWS.md](USER_FLOWS.md) |

Story описывает ценность и наблюдаемое поведение, но не заменяет профильную спецификацию. `BLOCKED_BY_TBD` запрещает утверждать зависимое правило; безопасная альтернатива остаётся частью истории. IDs не переиспользуются.

## 1. Гость

### US-GUEST-001 — увидеть подтверждённый функциональный охват

| Поле | Значение |
|---|---|
| Роль / цель | Как гость, я хочу видеть доступные категории и системы партнёра, чтобы выбрать релевантное изделие у локального продавца. |
| Ценность | Доверие и полный путь от source assortment к локальной услуге. |
| Preconditions | Есть verified source snapshot и независимо approved local records. |
| Основной сценарий | Открыть каталог → перейти по category/system → увидеть provenance/partner context и доступные действия. |
| Альтернатива | Source category известна, но локально не готова: показать `Уточнить у менеджера`, не обещая цену/наличие. |
| Acceptance | `AC-AMIGO-PARITY-001` |
| Связи | `AMIGO-PARITY-001`, `PARTNER-001`, `FTR-001`–`004` |
| Priority / scope | P0 / MVP |

### US-GUEST-002 — найти материал фильтрами

| Поле | Значение |
|---|---|
| Роль / цель | Как гость, я хочу искать и фильтровать материалы по реальным свойствам, чтобы сузить выбор. |
| Ценность | Быстрый выбор без выдуманных свойств. |
| Preconditions | Material/variant/property mappings verified; asset approved. |
| Основной сценарий | Ввести запрос → применить несколько фильтров → открыть variant → увидеть цвет, pattern, texture, composition, transparency/use properties. |
| Альтернатива | Свойство неизвестно: не включать variant в положительный filter match и не подставлять default. |
| Acceptance | `AC-CATALOG-001` |
| Связи | `FR-CATALOG-001`, `FR-MATERIAL-013/014`, `FTR-002/005` |
| Priority / scope | P0 / MVP |

### US-GUEST-003 — собрать совместимую конфигурацию

| Поле | Значение |
|---|---|
| Роль / цель | Как гость, я хочу пошагово настроить изделие, чтобы получить проверяемую конфигурацию. |
| Ценность | Снижение ошибок до замера и понятный выбор. |
| Preconditions | Family/system/model definitions активны; compatibility/limits имеют evidence. |
| Основной сценарий | Выбрать family → system → model → mounting → dimensions → material → hardware/control/options → validation. |
| Альтернатива | Правило отсутствует или комбинация несовместима: объяснить причину и предложить только доказанные варианты/manual review. |
| Acceptance | `AC-CONFIG-001` |
| Связи | `FR-CONFIG-001`–`008`, `FTR-006/007` |
| Priority / scope | P0 / MVP |

### US-GUEST-004 — получить предварительную цену

| Поле | Значение |
|---|---|
| Роль / цель | Как гость, я хочу увидеть воспроизводимую предварительную стоимость, чтобы оценить бюджет. |
| Ценность | Прозрачное ожидание без ложной точности. |
| Preconditions | Configuration valid; active verified PriceVersion применима ко всем строкам. |
| Основной сценарий | Запросить расчёт → увидеть сумму, валюту, breakdown, preliminary label, version/freshness context. |
| Альтернатива | Нет цены/правила: сохранить configuration и показать `Цена уточняется`, не `0`. |
| Acceptance | `AC-PRICE-001` |
| Связи | `FR-PRICE-001`, `FR-CALC-023/024`, `FTR-008`–`011` |
| Priority / scope | P0 / MVP; approval `BLOCKED_BY_TBD` price rules |

### US-GUEST-005 — увидеть изделие в стандартном интерьере

| Поле | Значение |
|---|---|
| Роль / цель | Как гость, я хочу мгновенно увидеть выбранное изделие на демонстрационном окне без загрузки фото. |
| Ценность | Быстрая визуальная проверка material/system choices. |
| Preconditions | Valid configuration, mapped publication-approved assets and supported renderer profile. |
| Основной сценарий | Открыть preview → изменить material/hardware/control/position → получить deterministic revision. |
| Альтернатива | Asset/profile отсутствует: нейтральный честный fallback без подмены материала. |
| Acceptance | `AC-STANDARD-PREVIEW-001` |
| Связи | `FR-STANDARD-PREVIEW-001`–`008`, `FTR-012/013` |
| Priority / scope | P0 / MVP |

### US-GUEST-006 — примерить изделие на своём окне

| Поле | Значение |
|---|---|
| Роль / цель | Как гость, я хочу загрузить фото и скорректировать окно, чтобы получить персональную геометрическую визуализацию. |
| Ценность | Осознанный выбор до замера. |
| Preconditions | Upload notice/consent, supported format, private session and valid configuration. |
| Основной сценарий | Загрузить → validate → detect → выбрать/скорректировать точки/маску → render → сравнить before/after → attach to project. |
| Альтернатива | Auto detection/AI fails: manual correction/base geometry path; исходное фото не публикуется. |
| Acceptance | `AC-AI-VIS-001` |
| Связи | `FR-AI-VIS-001`, `FR-VIS-001`–`022`, `FTR-014`–`016` |
| Priority / scope | P0 / MVP base; refinement optional |

### US-GUEST-007 — управлять корзиной конфигураций

| Поле | Значение |
|---|---|
| Роль / цель | Как гость, я хочу добавить, изменить, дублировать и удалить несколько конфигураций, чтобы собрать проект для разных окон. |
| Ценность | Один связный запрос вместо повторных действий. |
| Preconditions | Guest cart token active; each item has configuration revision. |
| Основной сценарий | Add → change quantity → duplicate/edit → review totals/statuses → continue. |
| Альтернатива | Quote stale/unavailable: item сохраняется, price status объясняется, submit не обещает старую сумму. |
| Acceptance | `AC-CART-001` |
| Связи | `FR-CART-001`–`007`, `FTR-017/018` |
| Priority / scope | P0 / MVP |

### US-GUEST-008 — уточнить рассрочку безопасно

| Поле | Значение |
|---|---|
| Роль / цель | Как гость, я хочу сообщить менеджеру об интересе к рассрочке, чтобы получить подтверждённые условия. |
| Ценность | Возможность обращения без юридически неподтверждённых обещаний. |
| Preconditions | Нейтральный текст и ручной WhatsApp route доступны. |
| Основной сценарий | Увидеть утверждённую фразу → выбрать `Уточнить` → получить handoff с суммой/проектом, если цена доступна. |
| Альтернатива | Нет суммы или provider terms: запрос всё равно передаёт только интерес, без срока/0%/approval claims. |
| Acceptance | `AC-INSTALLMENT-001` |
| Связи | `FR-INSTALLMENT-001`, `TBD-INSTALLMENT-001`–`013`, `FTR-021` |
| Priority / scope | P0 / MVP manual |

### US-GUEST-009 — пользоваться сайтом на слабом устройстве

| Поле | Значение |
|---|---|
| Роль / цель | Как гость, я хочу начать выбор без ожидания тяжёлых preview/AI ресурсов. |
| Ценность | Доступ к основному funnel при медленной сети. |
| Preconditions | Progressive loading and performance budgets configured. |
| Основной сценарий | Получить usable shell/catalog → lazy-load media/renderer только по намерению. |
| Альтернатива | Network/save-data constraint: static fallback and textual configuration remain usable. |
| Acceptance | `AC-PERF-001` |
| Связи | `NFR-PERF-001`, `FTR-025/027` |
| Priority / scope | P0 / MVP; численные budgets TBD |

### US-GUEST-010 — контролировать приватное фото

| Поле | Значение |
|---|---|
| Роль / цель | Как гость, я хочу понимать цель хранения фото и удалить его, чтобы контролировать личные данные. |
| Ценность | Доверие и privacy-by-design. |
| Preconditions | Notice available; private object and deletion workflow exist. |
| Основной сценарий | До upload прочитать notice → загрузить → увидеть retention/delete control → удалить → получить confirmation. |
| Альтернатива | Backup deletion асинхронна: доступ прекращается сразу, срок окончательного удаления показывается после policy approval. |
| Acceptance | `AC-PRIV-001` |
| Связи | `NFR-PRIV-001`, `FTR-016`, `TBD-PRIV-*` |
| Priority / scope | P0 / MVP |

### US-GUEST-011 — выполнить задачу доступным способом

| Поле | Значение |
|---|---|
| Роль / цель | Как пользователь клавиатуры/screen reader/reduced motion, я хочу пройти каталог и заявку без барьеров. |
| Ценность | Равный доступ к основному funnel. |
| Preconditions | Semantic controls, focus order, labels and motion preference supported. |
| Основной сценарий | Skip intro → navigate/filter/configure → understand errors/price → submit using keyboard and announcements. |
| Альтернатива | Canvas preview недоступен: получить equivalent textual summary and controls. |
| Acceptance | `AC-ACCESS-001` |
| Связи | `NFR-ACCESS-001`, `FTR-027/028` |
| Priority / scope | P0 / MVP |

### US-GUEST-012 — передать проект менеджеру

| Поле | Значение |
|---|---|
| Роль / цель | Как гость, я хочу отправить краткий проект в WhatsApp и запросить бесплатный замер. |
| Ценность | Быстрый переход к локальной услуге без потери контекста. |
| Preconditions | Confirmed WhatsApp route; cart/configuration has share-safe snapshot. |
| Основной сценарий | Review summary → choose measurement/consultation → create minimal handoff → open WhatsApp with editable message. |
| Альтернатива | Deep link не открылся: показать подтверждённый contact и copyable reference; private URLs исключены. |
| Acceptance | `AC-WHATSAPP-001` |
| Связи | `FTR-019/020`, `BUSINESS-FREE-SERVICES-001` |
| Priority / scope | P0 / MVP |

## 2. Зарегистрированный клиент

### US-CUSTOMER-001 — войти и владеть своими данными

| Поле | Значение |
|---|---|
| Роль / цель | Как клиент, я хочу безопасно войти, чтобы видеть только свои проекты и обращения. |
| Ценность | Удобное возвращение без утечки чужих данных. |
| Preconditions | Approved auth method, verified identity and RBAC policy. |
| Основной сценарий | Authenticate → establish session → open owned resources. |
| Альтернатива | Invalid/expired credential: neutral error and approved recovery without account enumeration. |
| Acceptance | `AC-AUTH-001` |
| Связи | `FR-AUTH-001`, `NFR-SEC-001` |
| Priority / scope | P0 / MVP; auth method TBD |

### US-CUSTOMER-002 — сохранить гостевой проект

| Поле | Значение |
|---|---|
| Роль / цель | Как клиент, я хочу привязать доказанно мой гостевой проект к аккаунту. |
| Ценность | Продолжение работы на другом устройстве. |
| Preconditions | Valid guest ownership token and authenticated account. |
| Основной сценарий | Sign in → verify token → attach immutable project history → confirm. |
| Альтернатива | Token expired/already claimed: deny without revealing owner and offer safe recovery. |
| Acceptance | `AC-PROJECT-SAVE-001` |
| Связи | `FTR-022`, `FR-CART-005` |
| Priority / scope | P0 / MVP |

### US-CUSTOMER-003 — открыть исторический расчёт

| Поле | Значение |
|---|---|
| Роль / цель | Как клиент, я хочу видеть сохранённую сумму и её версию, чтобы понимать прежнее предложение. |
| Ценность | Предсказуемость после обновления прайса. |
| Preconditions | Owned project and immutable quote snapshot. |
| Основной сценарий | Open project → see original inputs/version/amount/status → optionally request current recalculation as new revision. |
| Альтернатива | Version retired: original remains visible; new price never overwrites it. |
| Acceptance | `AC-QUOTE-HISTORY-001` |
| Связи | `FTR-008`–`010`, `PRICING-HISTORY-001` |
| Priority / scope | P0 / MVP |

### US-CUSTOMER-004 — удалить визуализацию

| Поле | Значение |
|---|---|
| Роль / цель | Как клиент, я хочу удалить фото и связанные outputs, не теряя товарный расчёт. |
| Ценность | Privacy control и data minimization. |
| Preconditions | Owned visualization revision exists. |
| Основной сценарий | Select delete → confirm scope → revoke access → schedule original/mask/output deletion → retain non-sensitive audit. |
| Альтернатива | Active job exists: cancel/mark deletion and prevent new access; complete idempotently. |
| Acceptance | `AC-VIS-DELETE-001` |
| Связи | `FTR-016`, `NFR-PRIV-*` |
| Priority / scope | P0 / MVP |

### US-CUSTOMER-005 — отслеживать обращение

| Поле | Значение |
|---|---|
| Роль / цель | Как клиент, я хочу видеть понятный подтверждённый статус обращения/заказа. |
| Ценность | Меньше неопределённости и повторных сообщений. |
| Preconditions | Manager-created/linked lead with customer-safe status mapping. |
| Основной сценарий | Open account → see current status, last update and allowed next action. |
| Альтернатива | Internal status cannot be exposed: show mapped neutral status, not operational notes. |
| Acceptance | `AC-ORDER-STATUS-001` |
| Связи | `FR-ORDER-*`, `FTR-020/026` |
| Priority / scope | P1 / MVP if workflow approved |

## 3. Менеджер

### US-MANAGER-001 — обработать заявку до заказа

| Поле | Значение |
|---|---|
| Роль / цель | Как менеджер, я хочу проверить заявку и зафиксировать допустимый статус, чтобы согласовать следующий шаг. |
| Ценность | Управляемая воронка без автоматического обещания заказа. |
| Preconditions | Authorized manager; lead snapshot and transition policy. |
| Основной сценарий | Open queue → inspect safe context → contact client → record outcome/reason → transition. |
| Альтернатива | Transition prohibited/missing data: block mutation and request required evidence. |
| Acceptance | `AC-ORDER-001` |
| Связи | `FR-ORDER-001`, `FTR-020/026` |
| Priority / scope | P0 / MVP; detailed workflow TBD |

### US-MANAGER-002 — согласовать бесплатный замер

| Поле | Значение |
|---|---|
| Роль / цель | Как менеджер, я хочу согласовать замер с подтверждённым регионом и контекстом проекта. |
| Ценность | Реалистичное планирование услуги. |
| Preconditions | Client contact and region/service eligibility known. |
| Основной сценарий | Review request → confirm location/scope → propose slot through approved process → mark scheduled. |
| Альтернатива | Slot/process unknown: keep requested and contact manually; не показывать ложное бронирование. |
| Acceptance | `AC-MEASURE-001` |
| Связи | `FR-MEASURE-*`, `TBD-INSTALL-003` |
| Priority / scope | P0 / MVP |

### US-MANAGER-003 — подтвердить итоговую цену после замера

| Поле | Значение |
|---|---|
| Роль / цель | Как менеджер, я хочу создать новый подтверждённый quote с причиной изменений. |
| Ценность | Прозрачное согласование реального заказа. |
| Preconditions | Measurement result, active rules and authorization. |
| Основной сценарий | Compare preliminary → enter verified inputs/allowed adjustments → explain diff → issue new immutable quote. |
| Альтернатива | Rule/approval missing: сохранить draft и route owner review, не подтверждать сумму. |
| Acceptance | `AC-QUOTE-CONFIRM-001` |
| Связи | `FTR-008`–`011`, `TBD-PRICE-009/010` |
| Priority / scope | P0 / MVP |

### US-MANAGER-004 — открыть безопасный контекст WhatsApp

| Поле | Значение |
|---|---|
| Роль / цель | Как менеджер, я хочу по reference открыть разрешённый summary проекта. |
| Ценность | Быстрый ответ без пересылки чувствительных ссылок. |
| Preconditions | Authorized session and valid handoff reference. |
| Основной сценарий | Resolve reference → verify permission/expiry → see cart/quote/preview metadata allowed for support. |
| Альтернатива | Reference invalid/expired: neutral not-found and audit; client can resend. |
| Acceptance | `AC-MANAGER-CONTEXT-001` |
| Связи | `FTR-019`, `NFR-SEC-*`, `NFR-PRIV-*` |
| Priority / scope | P0 / MVP |

### US-MANAGER-005 — зарегистрировать гарантийное обращение

| Поле | Значение |
|---|---|
| Роль / цель | Как менеджер, я хочу связать обращение с заказом и доказательствами, не уменьшая права клиента. |
| Ценность | Аудируемая поддержка после установки. |
| Preconditions | Order identity and approved warranty workflow. |
| Основной сценарий | Identify order → record issue/minimal evidence → acknowledge → route inspection/outcome. |
| Альтернатива | Order not found: manual identity path; не отклонять автоматически по неподтверждённой причине. |
| Acceptance | `AC-WARRANTY-001` |
| Связи | `BUSINESS-WARRANTY-001`–`003`, `TBD-WARRANTY-001` |
| Priority / scope | P1 / MVP after legal review |

## 4. Администратор

### US-ADMIN-001 — добавить новую source category без релиза кода

| Поле | Значение |
|---|---|
| Роль / цель | Как администратор, я хочу сопоставить новую категорию AMIGO с локальной моделью. |
| Ценность | Динамический каталог без ложной автоматической публикации. |
| Preconditions | Staged source entity and mapping permission. |
| Основной сценарий | Review source → create stable mapping/aliases → set independent states → request approval/activate. |
| Альтернатива | Schema/compatibility unknown: keep staged/hidden and create data-quality item. |
| Acceptance | `AC-CATALOG-DYNAMIC-001` |
| Связи | `FR-CATALOG-016`–`020`, `FTR-002`–`004` |
| Priority / scope | P0 / MVP |

### US-ADMIN-002 — управлять каталогом безопасно

| Поле | Значение |
|---|---|
| Роль / цель | Как администратор, я хочу изменять разрешённые states и видеть impact, чтобы поддерживать актуальную выдачу. |
| Ценность | Контролируемые операции с rollback. |
| Preconditions | Admin RBAC and versioned entity. |
| Основной сценарий | Open record → inspect source/local versions → change one state with reason → validate → commit audit event. |
| Альтернатива | Stale version/permission conflict: reject without partial mutation. |
| Acceptance | `AC-ADMIN-001` |
| Связи | `FR-ADMIN-001`–`020`, `FTR-024/026` |
| Priority / scope | P0 / MVP |

### US-ADMIN-003 — получать безопасный отказ

| Поле | Значение |
|---|---|
| Роль / цель | Как уполномоченный администратор, я хочу, чтобы система блокировала действия вне моей роли и фиксировала попытку. |
| Ценность | Least privilege и расследуемость. |
| Preconditions | Authenticated actor and deny-by-default policy. |
| Основной сценарий | Attempt allowed action → permission and object scope verified → mutation proceeds. |
| Альтернатива | Missing permission/ownership: no state change, neutral response and security audit. |
| Acceptance | `AC-SEC-001` |
| Связи | `NFR-SEC-001`, `FTR-024` |
| Priority / scope | P0 / MVP |

### US-ADMIN-004 — активировать price version

| Поле | Значение |
|---|---|
| Роль / цель | Как `OWNER` или `ADMIN` с `price.activate`, я хочу проверить и активировать новую версию с эффективной датой. |
| Ценность | Управляемая актуальность без изменения истории. |
| Preconditions | Staged version, source evidence, validation and parity results; role `OWNER`/`ADMIN`; activation permission. |
| Основной сценарий | Review exact diff/tests → explicitly confirm → schedule/activate atomically → audit attempt/outcome → retain previous version for history/rollback. |
| Альтернатива | Validation/parity/TBD fails: reject and keep current active version. |
| Acceptance | `AC-PRICE-ACTIVATE-001` |
| Связи | `PRICING-VERSION-*`, `FTR-008`–`011` |
| Priority / scope | P0 / MVP; active data TBD |

### US-ADMIN-005 — откатить ошибочную публикацию

| Поле | Значение |
|---|---|
| Роль / цель | Как администратор, я хочу rollback catalog/price/media activation, чтобы быстро ограничить ошибку. |
| Ценность | Безопасная эксплуатация и сохранение evidence. |
| Preconditions | Previous valid revision, rollback permission and impact preview. |
| Основной сценарий | Select revision → inspect affected records → enter reason → atomically restore pointers → audit/alert. |
| Альтернатива | Historical dependency prevents deletion: deactivate exposure while retaining immutable records. |
| Acceptance | `AC-ROLLBACK-001` |
| Связи | `FTR-023`–`026`, `AMIGO-SYNC-005` |
| Priority / scope | P0 / MVP |

## 5. Владелец

### US-OWNER-001 — подтвердить партнёрский scope

| Поле | Значение |
|---|---|
| Роль / цель | Как владелец, я хочу видеть и подтверждать partner permission scope, чтобы публикации имели доказуемое основание. |
| Ценность | Управление брендом, источниками и правами. |
| Preconditions | Partner relationship record and proposed scope/evidence reference. |
| Основной сценарий | Review fields → confirm scope/date/notes → approve badge/media/data use boundaries. |
| Альтернатива | Scope revoked/changed: block new publication, initiate impact/delete review. |
| Acceptance | `AC-PARTNER-001` |
| Связи | `PARTNER-001`–`007`, `ASSET-013`–`015` |
| Priority / scope | P0 / MVP |

### US-OWNER-002 — видеть очередь критических решений

| Поле | Значение |
|---|---|
| Роль / цель | Как владелец, я хочу видеть blocked P0 items, approvals и freshness, чтобы принимать решения по риску. |
| Ценность | Никакие TBD не скрываются за зелёным статусом. |
| Preconditions | Aggregated read model from catalog/price/rights/sync/lead. |
| Основной сценарий | Open dashboard → filter stale/blocked/pending → inspect evidence → delegate/approve where authorized. |
| Альтернатива | Metric incomplete: mark data-quality gap, not zero/healthy. |
| Acceptance | `AC-OWNER-DASHBOARD-001` |
| Связи | `FTR-024/029/030`, `OWNER-DECISION-001` |
| Priority / scope | P1 / MVP admin |

### US-OWNER-003 — утвердить бизнес-правило

| Поле | Значение |
|---|---|
| Роль / цель | Как владелец, я хочу закрыть TBD с evidence и effective date, чтобы зависимые спецификации стали проверяемыми. |
| Ценность | Управляемое изменение продукта. |
| Preconditions | Unique TBD, impact, options and verification criterion. |
| Основной сценарий | Review → record decision/source/date → update canonical spec/changelog → rerun affected gate. |
| Альтернатива | Ответ недостаточен: keep open and preserve safe behavior. |
| Acceptance | `AC-BUSINESS-RULE-001` |
| Связи | `FTR-030`, `DOD-*` |
| Priority / scope | P0 / 0B governance |

## 6. Контент-менеджер

### US-CONTENT-001 — сопоставить партнёрский asset

| Поле | Значение |
|---|---|
| Роль / цель | Как контент-менеджер, я хочу создать provenance/mapping для разрешённого файла, чтобы публиковать только правильный material/SKU. |
| Ценность | Точное изображение и доказательство прав. |
| Preconditions | Authorized file/source reference; partner scope valid. |
| Основной сценарий | Register original → hash → rights metadata → map domain entity/assetRole → validate derivatives → request publication approval. |
| Альтернатива | Duplicate/hash/mapping conflict: quarantine and block publication. |
| Acceptance | `AC-ASSET-MAP-001` |
| Связи | `ASSET-001`–`015`, `FTR-005` |
| Priority / scope | P0 / MVP; actual import later phase |

### US-CONTENT-002 — опубликовать собственную работу

| Поле | Значение |
|---|---|
| Роль / цель | Как контент-менеджер, я хочу публиковать только доказанные локальные работы с корректной подписью. |
| Ценность | Доверие без присвоения чужих примеров. |
| Preconditions | Owner-created asset, consent/rights and approved content record. |
| Основной сценарий | Add project facts/media → review rights/PII → publish with local label. |
| Альтернатива | AMIGO example: publish only as partner catalog/example label, never `Наши работы`. |
| Acceptance | `AC-PORTFOLIO-001` |
| Связи | `FTR-005`, `ASSET-014`, `CONTENT-*` |
| Priority / scope | P1 / MVP |

### US-CONTENT-003 — разместить партнёрский badge

| Поле | Значение |
|---|---|
| Роль / цель | Как контент-менеджер, я хочу использовать badge в разрешённых местах с fallback. |
| Ценность | Проверяемый partner trust signal. |
| Preconditions | Badge asset/evidence or approved textual fallback; brand notes. |
| Основной сценарий | Choose approved placement → validate variant/alt/attribution → publish. |
| Альтернатива | Asset unavailable/revoked: remove image and retain truthful text only. |
| Acceptance | `AC-BADGE-001` |
| Связи | `PARTNER-006/007`, `TBD-ASSET-AMIGO-003` |
| Priority / scope | P1 / MVP |

### US-CONTENT-004 — отозвать asset

| Поле | Значение |
|---|---|
| Роль / цель | Как контент-менеджер, я хочу прекратить публикацию отозванного/ошибочного файла и всех derivatives. |
| Ценность | Соблюдение прав и быстрое исправление. |
| Preconditions | Asset graph and revoke permission. |
| Основной сценарий | Block publication → resolve usages/derivatives → invalidate delivery → retain audit → delete per policy. |
| Альтернатива | Historical quote references asset: replace public access with tombstone, preserve non-public evidence. |
| Acceptance | `AC-ASSET-REVOKE-001` |
| Связи | `ASSET-012/015`, `FTR-024/026` |
| Priority / scope | P0 / MVP |

## 7. Система синхронизации

### US-SYNC-001 — получить source snapshot контролируемо

| Поле | Значение |
|---|---|
| Роль / цель | Как sync system, я хочу ingest разрешённый snapshot в staging, чтобы не зависеть от live AMIGO runtime. |
| Ценность | Устойчивость и provenance. |
| Preconditions | Approved transport credentials/process and source policy. |
| Основной сценарий | Acquire → identify version/context → store immutable raw metadata → normalize to staging → record run. |
| Альтернатива | Source/format/auth failure: fail run, retain current active data, no partial publish. |
| Acceptance | `AC-AMIGO-SYNC-001` |
| Связи | `AMIGO-SYNC-001`–`006`, `FTR-023/025` |
| Priority / scope | P0 / MVP process; transport TBD |

### US-SYNC-002 — построить объяснимый diff

| Поле | Значение |
|---|---|
| Роль / цель | Как sync system, я хочу классифицировать additions/changes/removals/conflicts, чтобы reviewer понимал impact. |
| Ценность | Безопасное обновление ассортимента и цены. |
| Preconditions | Previous active and new staged normalized snapshots. |
| Основной сценарий | Match stable IDs → compare fields/relations/assets/prices → assign severity → validate invariants → request review. |
| Альтернатива | Ambiguous mapping/schema drift: conflict blocks affected activation. |
| Acceptance | `AC-SYNC-DIFF-001` |
| Связи | `AMIGO-SYNC-002`–`005`, `FTR-023` |
| Priority / scope | P0 / MVP |

### US-SYNC-003 — выполнить безопасный rollback

| Поле | Значение |
|---|---|
| Роль / цель | Как sync system, я хочу восстановить предыдущие active pointers, не стирая новый failed evidence. |
| Ценность | Быстрое восстановление и расследование. |
| Preconditions | Approved rollback command and previous valid revision. |
| Основной сценарий | Lock activation → switch catalog/price references atomically → invalidate caches → verify health → mark run rolled back. |
| Альтернатива | Partial downstream failure: continue compensation/retry idempotently and raise critical alert. |
| Acceptance | `AC-SYNC-ROLLBACK-001` |
| Связи | `AMIGO-SYNC-005/006`, `FTR-023/026` |
| Priority / scope | P0 / MVP |

## 8. AI worker

### US-AI-001 — проверить загрузку до обработки

| Поле | Значение |
|---|---|
| Роль / цель | Как AI worker, я хочу принимать только разрешённые безопасные inputs, чтобы ограничить угрозы и лишнюю обработку. |
| Ценность | Security/privacy и предсказуемое качество. |
| Preconditions | Authorized short-lived job reference, consent/purpose and validation policy. |
| Основной сценарий | Fetch privately → verify MIME/signature/size/orientation/malware/quality → strip prohibited metadata → emit validated reference. |
| Альтернатива | Invalid/suspicious/low quality: reject or request better photo; never log content/object URL. |
| Acceptance | `AC-AI-UPLOAD-001` |
| Связи | `NFR-UPLOAD-*`, `FTR-016` |
| Priority / scope | P0 / MVP |

### US-AI-002 — создать geometry-first render

| Поле | Значение |
|---|---|
| Роль / цель | Как AI worker, я хочу построить mask/perspective render из confirmed geometry и exact material asset. |
| Ценность | Трассируемая персональная визуализация. |
| Preconditions | Validated image, selected/corrected window points, supported system and mapped asset. |
| Основной сценарий | Detect/accept geometry → create mask/occlusion layers → project product/material → validate invariants → save private revision. |
| Альтернатива | Confidence below threshold: return correction task/base failure, not fabricated geometry. |
| Acceptance | `AC-GEOMETRY-001` |
| Связи | `FR-VIS-*`, `FTR-014/015` |
| Priority / scope | P0 / MVP |

### US-AI-003 — улучшить результат без изменения товара

| Поле | Значение |
|---|---|
| Роль / цель | Как AI worker, я хочу опционально улучшить blending, сохраняя protected regions и product identity. |
| Ценность | Более реалистичный вид без ложной рекомендации. |
| Preconditions | Base render ready, explicit invocation and provider/privacy approval. |
| Основной сценарий | Build constrained request → refine allowed pixels → compare invariants → accept or discard → label AI revision. |
| Альтернатива | Provider unavailable/drift detected: return unchanged base render and record failure. |
| Acceptance | `AC-AI-REFINE-001` |
| Связи | `FR-VIS-013`–`017`, `FTR-015/016` |
| Priority / scope | P1 / post-MVP-capable optional enhancement |

## 9. Coverage summary

| Роль | Stories | P0 | P1 | MVP / optional-post-MVP |
|---|---:|---:|---:|---:|
| Гость | 12 | 12 | 0 | 12 / refinement optional |
| Клиент | 5 | 4 | 1 | 5 / 0 |
| Менеджер | 5 | 4 | 1 | 5 / 0 |
| Администратор | 5 | 5 | 0 | 5 / 0 |
| Владелец | 3 | 2 | 1 | 3 / 0 |
| Контент-менеджер | 4 | 2 | 2 | 4 / 0 |
| Sync system | 3 | 3 | 0 | 3 / 0 |
| AI worker | 3 | 2 | 1 | 2 / 1 optional |
| **Итого** | **40** | **34** | **6** | **39 / 1** |

## 10. Риски, TBD и история

Stories не закрывают оставшиеся открытыми `TBD-ASSORT-*`, `TBD-SOURCE-AMIGO-*`, `TBD-PRICE-*`, `TBD-SIZE-*`, `TBD-AI-*`, `TBD-PRIV-*`, `TBD-ACCOUNT-*`, `TBD-INSTALLMENT-*`, `TBD-BIZ-004/005`. Решённые IDs сохраняются исторически; до остальных решений соответствующие AC используют safe fallback.

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-02 | Определены 40 stories для восьми обязательных ролей с preconditions, primary/alternative flows, AC, requirement links, priority и scope. |
| 0.2.0 | 2026-08-02 | `US-ADMIN-004` синхронизирована с `OWNER-DECISION-002`: только OWNER/ADMIN, exact diff, confirmation и audit. |
