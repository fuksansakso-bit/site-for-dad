# Quality gate документации PROJECT_NAME

## 0. Статус

| Поле | Значение |
|---|---|
| Версия gate | 1.2.0 |
| Проверяемая входная база | Phase 0B baseline `7105ef03c1fb1cb726161fcbc02cbb0c340e212e`; Phase 0C baseline `83ed7c29bfaccf5d6a0efdcaa72db8bb04660990`; `GLOBAL_SPEC.md` 0.7.0 |
| Дата entry self-audit | 2026-08-02, Europe/Moscow |
| Решение по входу в 0B | **PASSED** |
| Основание письменного решения | Приложенное владельцем задание «AUTHORIZED AMIGO FUNCTIONAL PARITY AND SPECIALIZED SPECS» и повторное указание «так приступай к работе» |
| Утверждающие роли | Product Owner — владелец проекта; Business Owner — отец владельца проекта (`OWNER-DECISION-001`) |
| Текущий gate завершения 0B | **PASSED** — документационная фаза завершена |
| Phase 0C Implementation Readiness Gate | **AUTHORIZED_FOR_PHASE_1A_FOUNDATION** — QG-147/148 закрыты 2026-08-02 |
| Разрешённая реализация | Только Phase 1A Foundation; Phase 1B+, AMIGO data и production deployment запрещены |

Entry gate подтверждает, что исправления 0A.1 внесены и письменное решение начать документную фазу 0B получено. Он не означает готовность ценовой формулы, импорта, приложения или запуска. Открытые TBD блокируют утверждение зависимой спецификации или функции, но не отменяют разрешение создавать документацию 0B с безопасным поведением.

Идентификаторы `QG-001`–`QG-087` принадлежали предыдущему self-audit версии 0.3.1, заменены этим обновлением и навсегда зарезервированы. Новые проверки продолжают нумерацию без переиспользования смысла.

## 1. Правила оценки

- `[x]` означает наличие проверяемого доказательства в репозитории или зафиксированного письменного решения владельца.
- `[ ]` означает невыполненный пункт; обязательный невыполненный пункт не допускает итог `PASSED` соответствующего gate.
- `BLOCKED_BY_TBD` допустим только для статуса отдельной профильной спецификации и требует ссылки на конкретный `TBD-*`, безопасного поведения и критерия закрытия.
- Публичная страница подтверждает наблюдение на дату проверки, но не является доказательством вечной цены, наличия, лицензии или официального API.
- Любая содержательная правка после `PASSED` повторно проходит затронутые проверки и отражается в `CHANGELOG.md`.

## 2. Entry gate 0A.1 → 0B

### 2.1. Границы и состав репозитория

- [x] **QG-088 — MUST:** прочитаны обязательные документы в порядке `AGENTS.md`; противоречие между прежним `REFERENCE_ONLY` и окончательным партнёрским решением устранено в канонических документах.
- [x] **QG-089 — MUST:** до entry decision специализированные спецификации, production-код, `package.json`, зависимости, API routes, SQL и миграции отсутствовали.
- [x] **QG-090 — MUST:** scraping/import scripts, локальный массив AMIGO, hotlink и обход закрытых интерфейсов не создавались.
- [x] **QG-091 — MUST:** нормативные спецификации запланированы только в `docs/specs/`; gate, реестры, evaluations, test strategy и ADR остаются в профильных каталогах.
- [x] **QG-092 — MUST:** `TRACEABILITY_MATRIX.md` создан как честная карта планируемого покрытия и не выдаёт отсутствующие stories/AC/tests за готовые.

### 2.2. Каноническая продуктовая база

- [x] **QG-093 — MUST:** entry baseline `GLOBAL_SPEC.md` 0.4.0 сохранял подтверждённые owner/partner facts выше assumptions/TBD; текущий repository precedence Global → accepted ADR → approved specialized spec уточнён в 0.6.0 и проверен QG-138.
- [x] **QG-094 — MUST:** партнёрский статус, permission scope, badge и обязательные partner metadata описаны требованиями `PARTNER-001`–`007`.
- [x] **QG-095 — MUST:** AMIGO является `AUTHORIZED_PARTNER_SOURCE`; разрешённые активы используют `PARTNER_LICENSE`, а публикация конкретного файла требует отдельный `PUBLICATION_APPROVED` record.
- [x] **QG-096 — MUST:** каталог динамический и охватывает текущие и будущие source categories без автоматической публикации, доступности, цены или orderability.
- [x] **QG-097 — MUST:** `sourcePriceCategory` является динамической строкой и отделён от необязательного локального tier; наблюдаемые `E`, `0`, `1`–`5` не превращены в закрытый enum.
- [x] **QG-098 — MUST:** локальная цена равна подтверждённой source price при отсутствии активного override; минимум 1500 рублей не применяется до `TBD-MIN-PRICE-001`.
- [x] **QG-099 — MUST:** стандартный детерминированный preview отделён от AI-примерки на фотографии клиента; генеративный refinement необязателен.
- [x] **QG-100 — MUST:** корзина, WhatsApp handoff, синхронизация, админское подтверждение и собственный storage описаны концептуально без преждевременной реализации.
- [x] **QG-101 — MUST:** starfield-вступление и премиальный самостоятельный visual language подтверждены вместе с reduced-motion и accessibility boundary.

### 2.3. Provenance, права и исследование

- [x] **QG-102 — MUST:** `EXTERNAL_SOURCES.md` содержит 15 source records: 14 публичных страниц и изменяемый customizer endpoint, с датой проверки, ограничениями и fallback.
- [x] **QG-103 — MUST:** исследование AMIGO выполнено read-only; публичные страницы и customizer проверены без скачивания каталога, отправки формы, добавления в корзину или обхода доступа.
- [x] **QG-104 — MUST:** `AMIGO_PUBLIC_PARITY_SNAPSHOT_2026-08-02.md` отделяет наблюдаемые факты от требований и неизвестных transport/formula/availability данных.
- [x] **QG-105 — MUST:** восемь категорий активов имеют provenance, rights, publication, attribution, AI-use, retention и delete governance.
- [x] **QG-106 — MUST:** AMIGO examples запрещено маркировать как «Наши работы»; импортируемые originals и derivatives получают собственные asset records и hashes.
- [x] **QG-107 — MUST:** существование официального public API, partner export или стабильность DOM не утверждается без доказательства.

### 2.4. Механическая проверка и решение владельца

- [x] **QG-108 — MUST:** на entry snapshot было 16 непустых Markdown-файлов, 15 source records, восемь asset categories, 118 уникальных TBD и ни одной специализированной спецификации 0B.
- [x] **QG-109 — MUST:** на entry snapshot все 118 TBD имели уникальные ID: 12 решённых и 106 открытых; открытые значения не были выдуманы.
- [x] **QG-110 — MUST:** локальные Markdown-ссылки, уникальность requirement IDs, структура таблиц и отсутствие запрещённых артефактов проверены автоматически.
- [x] **QG-111 — MUST:** владелец письменно поручил выполнить 0B после исправления глобальной документации; это поручение является transition decision по роли, а `TBD-BIZ-001` сохраняет запрос персонального имени для долгосрочного audit trail.

## 3. Решение entry gate

| Поле | Значение |
|---|---|
| Решение | **PASSED** |
| Версия базы | `GLOBAL_SPEC.md` 0.4.0; `EXTERNAL_SOURCES.md`, `ASSET_RIGHTS_REGISTER.md`, `PRICING_SOURCE_POLICY.md` 1.1.0 |
| Утверждающая роль | Владелец бизнеса / Product Owner через письменное задание пользователя |
| Дата | 2026-08-02, Europe/Moscow |
| Разрешённый следующий шаг | Создание и проверка документации Phase 0B |
| Не разрешено | Импорт данных, скачивание массива медиа, production storage, приложение, frontend/backend, auth, AI API и иная реализация |

## 4. Completion gate Phase 0B

Completion self-audit выполнен 2026-08-02 на полном комплекте 0B. Открытые TBD не скрыты: они блокируют зависимые formulas/providers/limits/business transitions и фактическое выполнение тестов, но не полноту документационной boundary и safe fallback.

### 4.1. Полнота артефактов

- [x] **QG-112 — MUST:** создан весь обязательный модульный набор product/domain/UX/technical specs из `SPEC_ROADMAP.md`; пустых и placeholder-файлов нет.
- [x] **QG-113 — MUST:** test strategy и AI evaluation находятся вне `docs/specs/`, а ADR находятся в `docs/adr/` и содержат реальные решения, а не пустые заготовки.
- [x] **QG-114 — MUST:** каждая основная спецификация содержит metadata, boundaries, scope, actors, flows, states, rules, data, validation, failures, security/privacy/performance/analytics, AC, tests, dependencies, risks, TBD, requirement links и history — непосредственно либо канонической ссылкой без дублирования.
- [x] **QG-115 — MUST:** создано не менее 35 содержательных user stories для восьми требуемых ролей; каждая имеет preconditions, основной/альтернативный сценарий, AC, связи, priority и MVP/post-MVP.

### 4.2. Функциональная полнота

- [x] **QG-116 — MUST:** parity matrix охватывает AMIGO catalog, configurator, pricing, preview, cart/order и partner provenance и явно показывает `MATCHED`, `EXTENDED`, `DEFERRED` или `BLOCKED_BY_TBD`.
- [x] **QG-117 — MUST:** catalog spec охватывает динамические categories, нормализованные entities, свойства/фильтры материалов и независимые publication/availability/pricing/orderability states.
- [x] **QG-118 — MUST:** configurator описывает полный пошаговый flow, compatibility, errors, editable cart items и безопасное поведение при неизвестной матрице.
- [x] **QG-119 — MUST:** pricing spec описывает snapshots/versions, source/local/override layers, exact money arithmetic, immutable historical quotes, fallback и parity cases без выдуманной формулы.
- [x] **QG-120 — MUST:** standard preview и AI visualizer разделены; оба имеют geometry/material mapping, quality gates, privacy, failure modes и test scenarios.
- [x] **QG-121 — MUST:** sync и media pipeline описывают source priority, staging, diff, validation, approval, activation, rollback, local storage, provenance, derivatives и deletion.
- [x] **QG-122 — MUST:** cart, WhatsApp, order, installment, accounts, admin and content flows имеют state/permission/error/privacy boundaries.

### 4.3. UX, NFR и операции

- [x] **QG-123 — MUST:** IA, screen specs, design system, motion, responsive и accessibility specs образуют непротиворечивый самостоятельный UX и включают reduced motion/keyboard/screen-reader behavior.
- [x] **QG-124 — MUST:** architecture, data, API, security/privacy, storage, performance, observability и deployment documents остаются vendor-neutral там, где ADR/TBD ещё не выбраны.
- [x] **QG-125 — MUST:** test strategy покрывает unit, property/table, contract, integration, E2E, visual, accessibility, security, retention, backup/restore, idempotency, degradation и pricing parity.
- [x] **QG-126 — MUST:** AI evaluation задаёт разрешённый benchmark, метрики, thresholds/TBD, human review и запрет training use партнёрских/клиентских изображений без отдельного основания.

### 4.4. Трассируемость и проверка

- [x] **QG-127 — MUST:** каждое критическое requirement связано минимум с feature spec, user story, acceptance criterion и test scenario; матрица не содержит ложных `COVERED`.
- [x] **QG-128 — MUST:** все новые requirement/story/AC/test/ADR IDs уникальны, ссылки разрешаются, таблицы валидны, changelog и index обновлены.
- [x] **QG-129 — MUST:** все `BLOCKED_BY_TBD` перечислены в финальном отчёте с безопасным поведением; неизвестные цены, доступность, сроки, юрусловия и технические пределы не придуманы.
- [x] **QG-130 — MUST:** Git/file audit подтверждает отсутствие production-кода, dependencies, import/scraping tools, скачанного каталога и пользовательских/AMIGO media.

### 4.5. Evidence snapshot

| Проверка | Результат |
|---|---:|
| Профильные нормативные specs | 33: product 5, domain 11, UX 6, technical 11 |
| Quality/evaluation artifacts | 2 |
| ADR с решениями | 6 |
| Полные stories / AC / named tests | 40 / 40 / 40 |
| Critical chains | 18 / 18 покрыты feature/profile + story + AC + test |
| Нормативные definition IDs без QG/TS | 1119 / 1119 уникальны |
| Все definition IDs вместе с QG/TS | 1202 / 1202 уникальны |
| TBD registry | 118 уникальных: 12 решены, 106 открыты (P0 50, P1 53, P2 3) |
| Локальные Markdown links | 0 broken |
| Markdown table structure | 0 ошибок колонок |
| Пустые/короткие менее 80 строк профильные specs | 0 |
| Запрещённые code/dependency/media artifacts | 0 |

Evidence получен read-only PowerShell/`rg` проверками рабочего дерева. Сценарии tests имеют проектные статусы `DESIGNED`/`BLOCKED_TBD`, а не ложный runtime `PASS`, поскольку Phase 0B не создаёт приложение.

## 5. Запись решения Completion gate 0B

| Поле | Значение |
|---|---|
| Решение | **PASSED — документационная Phase 0B завершена** |
| Утверждающий | Владелец бизнеса / Product Owner; персональное имя `TBD-BIZ-001` |
| Дата | 2026-08-02, Europe/Moscow |
| Проверяемая версия | `GLOBAL_SPEC.md` 0.5.0; roadmap/traceability 1.0.0; 33 specs + 2 quality/evaluation + 6 ADR |
| Остаточные блокеры | 106 открытых `TBD-*`; они не препятствуют завершению boundary-документации, но блокируют соответствующие approvals/implementation |
| Следующий шаг после `PASSED` | Только новое письменное решение владельца о следующей фазе; разработка автоматически не начинается |

## 6. Implementation Readiness Gate Phase 0C

Phase 0C проверяет готовность к контролируемому решению о Foundation, а не готовность продукта к launch. Product Owner 2026-08-02 принял ADR-0007–0010 и отдельно разрешил только Phase 1A Foundation.

### 6.1. Baseline, scope and P0 triage

- [x] **QG-131 — MUST:** первый Git commit существует: `7105ef03c1fb1cb726161fcbc02cbb0c340e212e`, message `docs: establish Phase 0B specification baseline`; remote/push не создавались.
- [x] **QG-132 — MUST:** до baseline проверены `.gitignore`, filenames/content и binary signatures; secrets, customer photos, temp/cache/system files and unnecessary binaries не обнаружены.
- [x] **QG-133 — MUST:** все 61 исторических P0 ID получили одну из девяти Phase 0C classifications; до triage было 50 открытых/unclassified и 11 historical resolved, после — 0 unclassified.
- [x] **QG-134 — MUST:** `MVP_SCOPE.md` фиксирует 20 обязательных first-launch capabilities, dynamic catalog boundary and 15 explicit post-MVP items; full AMIGO assortment не является launch dependency.
- [x] **QG-135 — MUST:** подтверждённые owner facts не возвращены в TBD; после `OWNER-DECISION-001`–`007` семь owner-decision P0 закрыты, а их IDs сохранены для истории.

### 6.2. Critical specifications and consistency

- [x] **QG-136 — MUST:** 14 critical documents audited across requirements, I/O, states/transitions, rules, errors/fallback/edges, security, AC/tests, traceability, dependencies and open questions.
- [x] **QG-137 — MUST:** итог audit — 14 `READY_WITH_NON_BLOCKING_TBD`, 0 `BLOCKED`, 0 `NEEDS_EXPANSION`, 0 `CONTRADICTORY` after fixes for Foundation entry review.
- [x] **QG-138 — MUST:** precedence conflict and standard-preview result-type conflict corrected; catalog/price/rights/privacy boundaries have no unresolved direct contradiction.
- [x] **QG-139 — MUST:** stale/nonexistent ADR references and Architecture global-baseline version corrected; new real preview coverage gap registered as `TBD-PREVIEW-001`.

### 6.3. Implementation sequence and Foundation safety

- [x] **QG-140 — MUST:** `IMPLEMENTATION_ROADMAP.md` defines Phase 1A–1H with objective, dependencies, entry, deliverables, acceptance, tests, risks, DoD, forbidden changes and rollback.
- [x] **QG-141 — MUST:** `PHASE_1A_FOUNDATION_PLAN.md` defines recommended stack, repository/modules, responsibilities, environment/local/CI, database/storage/jobs/auth/observability/security/testing, commit sequence, acceptance and rollback without code.
- [x] **QG-142 — MUST:** secret strategy is known: ignored local/OS values, names-only example, managed CI/runtime injection, typed public/server allowlist, scanning, redaction and rotation/revocation gate.
- [x] **QG-143 — MUST:** migration rollback strategy is known: versioned reviewed SQL history, expand/contract, N/N-1 compatibility, failed-migration recovery, forward compensation and rehearsed backup/restore for destructive risk.
- [x] **QG-144 — MUST:** technology comparison exists and every proposed Foundation choice maps to ADR-0007–0010; hosting, production region and AI provider remain unselected rather than guessed.

### 6.4. Repository and transition decision

- [x] **QG-145 — MUST:** Phase 0C changed only Markdown/governance/reference files; no package, dependency, application, SQL, migration, import/media or production configuration was created.
- [x] **QG-146 — MUST:** final mechanical verification covers links, unique IDs, tables, whitespace, prohibited artifacts and committed clean worktree; evidence is recorded in final Phase 0C report.
- [x] **QG-147 — MUST BEFORE PHASE 1A:** Product Owner принял ADR-0007–0010 после проверки условий ниже.
- [x] **QG-148 — MUST BEFORE PHASE 1A:** Product Owner отдельно и явно разрешил Phase 1A Foundation 2026-08-02 после Phase 0C report.

#### QG-147 acceptance review

1. ADR-0007–0010 не противоречат `GLOBAL_SPEC.md` 0.7.0.
2. ADR не противоречат `PHASE_1A_FOUNDATION_PLAN.md` и ограничивают решения Foundation.
3. Next.js/BFF, PostgreSQL/Prisma, отдельный Graphile Worker, S3 port, identity boundary и OpenTelemetry имеют отдельную ответственность.
4. Модульный monolith и один PostgreSQL control plane исключают преждевременные microservices/extra broker/provider commitments.
5. ADR-0007/0009 явно закрепляют Windows 11, PowerShell-safe root commands и disposable local dependencies.
6. ADR-0008 закрепляет reviewed migrations, drift, empty/upgrade replay, expand/contract, failed recovery и forward compensation.
7. ADR-0007/0009/0010 сохраняют ports, S3/OTLP contracts и superseding migration path для смены infrastructure provider.
8. Secrets поступают через ignored local/OS либо managed CI/runtime injection и не зависят от hosting vendor.
9. ADR-0001/0007/0009 требуют отдельный worker process; durable jobs не выполняются внутри обычного HTTP request.
10. Structured logs, tracing, metrics и liveness/readiness входят в первый Foundation этап по ADR-0010.

### 6.5. Decision record

| Поле | Значение |
|---|---|
| Gate result | **AUTHORIZED_FOR_PHASE_1A_FOUNDATION** |
| Documentation readiness | **PASS** |
| Critical spec blockers before Foundation | **0** |
| Feature-specific P0 gates retained | 20 `BLOCKER_BEFORE_FEATURE`, 10 `EXTERNAL_AMIGO_DATA_REQUIRED`, 0 `OWNER_DECISION_REQUIRED` |
| Unmet transition decisions | Нет для входа в Phase 1A |
| Allowed now | Только Phase 1A Foundation по active plan |
| Forbidden now | Phase 1B+, AMIGO catalog pilot/import, pricing/configurator/preview/cart/order/admin business UI/account/photo/AI и production deployment |

Разрешение ограничено Phase 1A. Completion Phase 1A не разрешает автоматически начинать Phase 1B; нужен отдельный письменный transition decision.

## 7. История изменений

| Версия | Дата | Изменение |
|---|---|---|
| 1.0.0 | 2026-08-02 | Completion checks `QG-112`–`130` пройдены на полном комплекте 0B; зафиксированы counts, unique IDs, links/tables/no-code evidence и запрет автоматического старта реализации. |
| 1.1.0 | 2026-08-02 | Добавлены QG-131–148 для Phase 0C baseline/P0/MVP/audit/roadmap/Foundation safety; результат `READY_FOR_OWNER_AUTHORIZATION`, QG-147/148 намеренно открыты. |
| 1.2.0 | 2026-08-02 | `OWNER-DECISION-001`–`007` закрыли owner P0; ADR-0007–0010 приняты после десяти проверок, QG-147/148 закрыты и разрешена только Phase 1A Foundation. |
| 0.2.0 | 2026-08-02 | Entry gate обновлён для `GLOBAL_SPEC` 0.4.0 и partner-authorized scope; письменное поручение владельца зафиксировано как разрешение начать 0B; добавлен отдельный completion gate 0B. |
| 0.1.0 | 2026-08-02 | Предыдущий self-audit 0A.1 для версии 0.3.1; проверки `QG-001`–`087` впоследствии зарезервированы. |
