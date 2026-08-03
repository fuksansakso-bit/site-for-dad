# Quality gate документации PROJECT_NAME

## 0. Статус

| Поле | Значение |
|---|---|
| Версия gate | 1.8.0 |
| Проверяемая входная база | Phase 0B baseline `7105ef03c1fb1cb726161fcbc02cbb0c340e212e`; Phase 0C baseline `83ed7c29bfaccf5d6a0efdcaa72db8bb04660990`; Phase 1A completion `943d4a2efa5e05f0d05493633cf5eb549e072a22`; Phase 1B.1 recovery baseline `d851647ab243e432641d650cb29e3d8132a92af1`; `GLOBAL_SPEC.md` 0.12.0 |
| Дата entry self-audit | 2026-08-03, Europe/Moscow |
| Решение по входу в 0B | **PASSED** |
| Основание письменного решения | Приложенное владельцем задание «AUTHORIZED AMIGO FUNCTIONAL PARITY AND SPECIALIZED SPECS» и повторное указание «так приступай к работе» |
| Утверждающие роли | Product Owner — владелец проекта; Business Owner — отец владельца проекта (`OWNER-DECISION-001`) |
| Текущий gate завершения 0B | **PASSED** — документационная фаза завершена |
| Phase 0C Implementation Readiness Gate | **AUTHORIZED_FOR_PHASE_1A_FOUNDATION** — QG-147/148 закрыты 2026-08-02 |
| Phase 1A Foundation Acceptance Gate | **PASSED_PHASE_1A_FOUNDATION** — QG-149–158 закрыты 2026-08-02 |
| Post-Phase 1A Owner Decision Documentation Audit | **PASSED_DOCS_ONLY** — QG-159–168 закрыты 2026-08-02 как исторический pre-transition audit |
| Phase 1B.1 Entry Gate | **AUTHORIZED_PHASE_1B1_IN_PROGRESS** — QG-169–176 закрыты 2026-08-02 |
| Phase 1B.1 Local Storage Recovery Gate | **PASSED_PHASE_1B1_STORAGE_RECOVERY** — QG-177–184 закрыты 2026-08-03 |
| Phase 1B.1 Pilot Acceptance Gate | **PASSED_PHASE_1B1_AMIGO_CATALOG_PILOT** — QG-185–194 закрыты 2026-08-03 |
| Разрешённая реализация | Только Phase 1B.1 catalog pilot/local publication layer; Phase 1B.2/1C+ и production запрещены |

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

## 7. Phase 1A Foundation Acceptance Gate

Acceptance audit выполнен 2026-08-02 только для Foundation scope. Проверяемое implementation evidence собрано в [PHASE_1A_FOUNDATION_REPORT.md](../06-plans/completed/PHASE_1A_FOUNDATION_REPORT.md); production deployment, AMIGO data и Phase 1B surfaces не входили в проверку.

### 7.1. Reproducibility and runtime

- [x] **QG-149 — MUST:** отдельный чистый clone commit `0a4379cad3cd513863c366ff0b1e3849829c61ef` установил 638 packages через frozen lockfile и прошёл provider-neutral `ci:verify` без незакоммиченных prerequisite artifacts.
- [x] **QG-150 — MUST:** Windows 11 lifecycle запускает и останавливает web, отдельный worker, loopback-only PostgreSQL и RustFS одной root command; повторный запуск видит zero pending Prisma/Graphile migrations.
- [x] **QG-151 — MUST:** PostgreSQL 18.4 и Prisma 7.9.1 применяют три reviewed infrastructure-only migrations на empty/repeat/upgrade paths; drift, runtime DDL denial, append-only audit и failed-migration forward recovery проверены.
- [x] **QG-152 — MUST:** Graphile Worker retry/timeout/idempotency/permanent-failure/graceful-drain contracts и S3 port private/quarantine/public policy, checksum, immutable put, signed grants and outage contracts проверены на disposable dependencies.

### 7.2. Identity, security and observability

- [x] **QG-153 — MUST:** synthetic IdentityPort поддерживает `GUEST`, `CUSTOMER`, `MANAGER`, `ADMIN`, `OWNER`, `SYSTEM_WORKER`, deny-by-default capability/object checks, current grants, revoke/expiry, workload separation and immutable audit attribution без production identity provider.
- [x] **QG-154 — MUST:** typed environment validation, server/public allowlist, CSP/headers, origin/CSRF/request-size/rate boundary, safe errors, secret/PII redaction, request/correlation/trace context, structured logs, low-cardinality metrics and bounded liveness/readiness не раскрывают internals.

### 7.3. Verification, scope and handoff

- [x] **QG-155 — MUST:** 61 unit/contract, 19 integration/recovery и 20 browser tests пройдены; strict typecheck, lint, formatting, production build и package-boundary checks успешны.
- [x] **QG-156 — MUST:** repository/build secret scans, generated-canary scan и critical dependency advisory scan прошли; известных vulnerabilities нет, production secrets/credentials не требовались.
- [x] **QG-157 — MUST:** автоматический scope gate подтверждает отсутствие catalog/material/price/configurator/preview/cart/order/business-admin/account/customer-photo/AI/AMIGO-import/production-deployment surfaces и business tables.
- [x] **QG-158 — MUST:** README, roadmap, gate, traceability, open questions, plan, accepted ADR, affected technical specs, changelog и completion report отражают фактическую реализацию; logical commits сохранены, remote/push отсутствуют, финальный worktree clean.

### 7.4. Decision record

| Поле | Значение |
|---|---|
| Gate result | **PASSED_PHASE_1A_FOUNDATION** |
| Baseline | `83ed7c29bfaccf5d6a0efdcaa72db8bb04660990` |
| Branch | `phase/1a-foundation` |
| Acceptance evidence | [PHASE_1A_FOUNDATION_REPORT.md](../06-plans/completed/PHASE_1A_FOUNDATION_REPORT.md) |
| Required checks | 10 / 10 passed (`QG-149`–`QG-158`) |
| Remaining TBD | 99 open; 0 reclassified or invented by Foundation |
| Skipped by scope | Production regional/VPN matrix, production providers/secrets and all business/AMIGO/AI checks |
| Allowed now | Review, verification and correction of Phase 1A Foundation/documentation artifacts |
| Forbidden now | Phase 1B+, AMIGO pilot/import, all business features, user media/AI and production deployment |

Gate confirms technical completion of the authorized phase only. It neither approves launch nor grants a Phase 1B transition; a new explicit Product Owner decision is required.

### 7.5. Post-Phase 1A authority documentation audit

- [x] **QG-159 — MUST:** письменное решение `OWNER-DECISION-008` закрепляет AMIGO как upstream authority для AMIGO-origin products/materials/technical data/catalog images/base prices, Business Owner как decision authority для local availability/visibility/price overrides/portfolio/commercial conditions и PostgreSQL как operational system of record, который не переносит authority между слоями.
- [x] **QG-160 — MUST:** authority matrix синхронизирована с glossary, external/rights/pricing policies, open questions, feature/RBAC, catalog/parity/pricing/admin/content и architecture/data/sync/media/storage specs без изменения принятых ADR задним числом.
- [x] **QG-161 — MUST:** проверка фактического репозитория подтверждает, что Prisma schema и три migration остаются Foundation-only, catalog/import surfaces отсутствуют, а документация не выдаёт owner statement за доказательство завершённого импорта.
- [x] **QG-162 — MUST:** `TBD-SOURCE-AMIGO-002`, `TBD-ASSORT-002`, `TBD-PRICE-001` и связанные asset/portfolio evidence остаются открыты; `OWNER-DECISION-008` не интерпретируется как Phase 1B transition decision и не вводит выдуманные business data.
- [x] **QG-163 — MUST:** `docs:check` прошёл для 70 Markdown-файлов и 1269 normative IDs, `phase-scope:check` подтвердил только Foundation surfaces/tables, `format:check` и `git diff --check` прошли без ошибок.

Результат `PASSED_DOCS_ONLY` подтверждает только согласованность документации после owner decision. Он не изменяет `PASSED_PHASE_1A_FOUNDATION`, не утверждает существование catalog schema/import batch и не разрешает Phase 1B.

### 7.6. Post-Phase 1A public-serving catalog documentation audit

- [x] **QG-164 — MUST:** письменное решение `OWNER-DECISION-009` закрепляет AMIGO как upstream source для импортируемых product/material metadata, technical specifications, supplier-image identity/provenance и base prices, а активную одобренную PostgreSQL `CatalogVersion`/transactional state — как единственный канонический public-serving runtime source; public flows не читают AMIGO или staging напрямую.
- [x] **QG-165 — MUST:** `GLOBAL_SPEC`, feature/parity/pricing, architecture, AMIGO sync, data model, test strategy и traceability, а также glossary, external/pricing/open-question governance, specification/implementation roadmaps, index/README/changelog синхронизированы с source→staging→validation/diff→Business Owner approval→explicit admin activation pipeline без изменения accepted ADR задним числом.
- [x] **QG-166 — MUST:** импорт не удаляет local/local-only/Business Owner/history data автоматически; applicable local overrides имеют declared priority без изменения AMIGO snapshot; все catalog changes audited, а `CatalogVersion` хранит source/timestamps/approvals/predecessor/rollback.
- [x] **QG-167 — MUST:** `docs:check` прошёл для 70 Markdown-файлов и 1303 normative IDs, `format:check` и `git diff --check` прошли без ошибок; ссылки, таблицы и identifiers валидны.
- [x] **QG-168 — MUST:** `phase-scope:check` подтверждает только Foundation surfaces/tables; `OWNER-DECISION-009` не закрывает `TBD-SOURCE-AMIGO-002`, `TBD-ASSORT-002`, `TBD-PRICE-001`/asset evidence, не доказывает active catalog/import и не разрешает Phase 1B.

Результат остаётся `PASSED_DOCS_ONLY`. Он уточняет архитектурный контракт будущих Phase 1B/1C, но не является transition decision и не изменяет фактическую Phase 1A schema.

## 8. Phase 1B.1 entry and pilot acceptance gate

### 8.1. Entry gate

- [x] **QG-169 — MUST:** `OWNER-DECISION-010` письменно разрешает только Phase 1B.1 и явно запрещает Phase 1B.2/1C+, full import, calculator/configurator/preview/AI/cart/order/WhatsApp/account/final landing/starfield и production deployment.
- [x] **QG-170 — MUST:** Phase 1A завершена `PASSED_PHASE_1A_FOUNDATION`; исходный commit `943d4a2efa5e05f0d05493633cf5eb549e072a22`, branch `phase/1b-amigo-catalog-pilot` и clean pre-change tree подтверждены.
- [x] **QG-171 — MUST:** transport discovery прошёл в требуемом приоритете; official API/export/file не выдуманы, partner cabinet подтверждён без использования credentials, а owner-authorized public pages выбраны как bounded pilot fallback.
- [x] **QG-172 — MUST:** четыре явных material paths отвечают без login/CAPTCHA и публикуют stable numeric material/system IDs, source section/path/title, текущую карточную цену и media paths; dated evidence сохранено.
- [x] **QG-173 — MUST:** active plan фиксирует real allowlist из 32 material IDs четырёх семейств и четырёх real systems, включая roller/Zebra blackout, aluminum lamella и vertical fabric; fixture не считается import evidence.
- [x] **QG-174 — MUST:** `PARTNER_LICENSE`, asset-level `PUBLICATION_APPROVED`, private-by-default object storage, no-hotlink и bounded media validation применяются; pilot JPEG preflight прошёл без скачивания полного медиакаталога.
- [x] **QG-175 — MUST:** source/normalized/business-overlay ownership и PostgreSQL-only public runtime остаются каноническими по `OWNER-DECISION-008/009`; sync не активирует версии и не перезаписывает local decisions.
- [x] **QG-176 — MUST:** active plan содержит один `IN_PROGRESS` step, stop conditions, exact commit sequence, verification/recovery и обязательный completion report; full-catalog `TBD-SOURCE-AMIGO-002` перенесён только в Phase 1B.2 gate.

Entry result: **AUTHORIZED_PHASE_1B1_IN_PROGRESS**. Pilot completion остаётся непроверенным до implementation/test/media/import evidence; новый phase transition этим статусом не выдаётся.

### 8.2. Local storage recovery gate

- [x] **QG-177 — MUST:** Product Owner подтвердил `OWNER-DECISION-011`; исходный commit `d851647ab243e432641d650cb29e3d8132a92af1`, четыре существующих Phase 1B.1 commits, full diff, media WIP и historical failed run сохранены без reset/rollback/rewrite.
- [x] **QG-178 — MUST:** RustFS удалён из active local/CI configuration; VersityGW `v1.4.1@sha256:0400cb59f59da0f1cf9f7fd49505191abc348dfadf54509bf1988caaff4eb96f` запущен в Linux Docker Compose с POSIX backend, loopback-only S3/Admin и тремя named volumes без Windows bind mount.
- [x] **QG-179 — MUST:** внешний `StoragePort` остался provider-neutral; endpoint/region/credentials/buckets/path-style/retries/timeouts/multipart typed в environment, buckets идемпотентно провиженятся отдельно и все три остаются private.
- [x] **QG-180 — MUST:** contract matrix `1`, `65,536`, `131,072`, `159,099`, `262,144`, `515,180`, `1 MiB`, `5 MiB`, `6 MiB` прошла put/head/get/byte equality/SHA/type/length/metadata/delete/missing-head; реальный AMIGO JPEG имеет SHA-256 `ac86fc976afc2063cc97e1528611c978a348f357d26c8fe3c59b7c23f113d0cd` до и после round trip.
- [x] **QG-181 — MUST:** path-style SigV4 signed read/write, expiration/scope, multipart complete/abort, idempotent same-body put, content dedup, immutable conflicting same-key behavior и anonymous list/read/write denial прошли.
- [x] **QG-182 — MUST:** invalid MIME, oversize, wrong checksum, timeout/retry/unavailable, concurrent different files/same-key safety, graceful container restart, full Docker Desktop auto-recovery и named-volume persistence прошли; formal harness result 15/15, exit 0.
- [x] **QG-183 — MUST:** root PowerShell `dev`/`dev:status` работают без Bash и NTFS permission changes; credentials не закоммичены/не попали в logs, PostgreSQL не менялся, а run `798d5513-27b1-48e3-ab8e-389eeb672db4` остался `FAILED / CATALOG_PIPELINE_STORAGE_UNAVAILABLE`.
- [x] **QG-184 — MUST:** storage recovery разрешает продолжить только существующий Phase 1B.1 media WIP новым run/correlation ID; production storage (`TBD-INFRA-010`) и Phase 1C не выбраны/не начаты.

Storage result: **PASSED_PHASE_1B1_STORAGE_RECOVERY**. Этот статус не объявляет media import, publication или весь Phase 1B.1 завершёнными.

### 8.3. Pilot acceptance gate

- [x] **QG-185 — MUST:** исходный commit `d851647ab243e432641d650cb29e3d8132a92af1`, существующие четыре Phase 1B.1 commits, media WIP и historical run `798d5513-27b1-48e3-ab8e-389eeb672db4` сохранены без reset/rewrite; failed run остаётся `FAILED / CATALOG_PIPELINE_STORAGE_UNAVAILABLE`.
- [x] **QG-186 — MUST:** новый recovery lineage создан; 32/32 allowlisted `MaterialVariant` имеют локальные изображения, 59/59 media assets (8,340,101 bytes) прошли byte/SHA/MIME/dimension/provenance validation с нулём item-level failures и без hotlink.
- [x] **QG-187 — MUST:** реальный run `9bd1a4f8-e456-4617-9e16-7f5604c1c65c` завершил 275/275 операций с нулём ошибок и создал exact 40-entry catalog composition и 32-record price candidate без дубликатов source entities, variants, prices, assets или links.
- [x] **QG-188 — MUST:** separate OWNER approval и ADMIN activation активировали immutable CatalogVersion `41b039a5-951d-4de3-873e-7565e2c7e9b0` и PriceVersion `ec19a7d7-c19a-45e1-86f9-269f01007fd0`; overlays, `INQUIRY_ONLY`, visibility, publication approvals и local override precedence не изменяют AMIGO source facts.
- [x] **QG-189 — MUST:** `/admin/catalog`, `/catalog`, public material API и controlled media route читают только active PostgreSQL versions, поддерживают exact commands/search/filters/facets, скрывают staged/secret/object/source internals и fail closed при stale/invalid/unavailable storage/data.
- [x] **QG-190 — MUST:** graceful full-environment restart сохранил database history, active pointers и все 59 objects; no-op repeat `aee135bd-855a-4fb6-a8e1-2fe60e61728a` завершил 275/275, создал zero versions и не изменил counts/pointers.
- [x] **QG-191 — MUST:** `pnpm.cmd test:catalog-pilot` повторно проверил historical failure, lineage, versions/counts, 59 objects, 32 public primary images, signed read, 515,180-byte SHA, filters/errors and dedup; результат `PASSED`.
- [x] **QG-192 — MUST:** exact-toolchain `pnpm.cmd ci:verify` прошёл 9/9 stages: Node 24.18.1/pnpm 11.18.0/PostgreSQL 18.4, coverage, migration/recovery, VersityGW 15/15, production build, artifact/repository secret scans, 25/25 Playwright scenarios and critical advisory scan.
- [x] **QG-193 — MUST:** canonical specs, ADR-0009, test strategy, plan, traceability, open questions, README, changelog and completion report synchronized; production storage remains `TBD-INFRA-010`, and no production credential/provider/anonymous bucket was selected.
- [x] **QG-194 — MUST:** final format/docs/scope/boundary/lint/type/test/build/security checks pass, tracked worktree is clean at handoff, and Phase 1B.2/1C/configurator/calculation/preview/cart/WhatsApp/AI/production work is absent.

Gate result: **PASSED_PHASE_1B1_AMIGO_CATALOG_PILOT**. Evidence is frozen in [PHASE_1B1_AMIGO_CATALOG_PILOT_REPORT.md](../06-plans/completed/PHASE_1B1_AMIGO_CATALOG_PILOT_REPORT.md). This result completes only Phase 1B.1 and grants no permission to start Phase 1B.2, Phase 1C or production infrastructure selection.

## 9. История изменений

| Версия | Дата | Изменение |
|---|---|---|
| 1.0.0 | 2026-08-02 | Completion checks `QG-112`–`130` пройдены на полном комплекте 0B; зафиксированы counts, unique IDs, links/tables/no-code evidence и запрет автоматического старта реализации. |
| 1.1.0 | 2026-08-02 | Добавлены QG-131–148 для Phase 0C baseline/P0/MVP/audit/roadmap/Foundation safety; результат `READY_FOR_OWNER_AUTHORIZATION`, QG-147/148 намеренно открыты. |
| 1.2.0 | 2026-08-02 | `OWNER-DECISION-001`–`007` закрыли owner P0; ADR-0007–0010 приняты после десяти проверок, QG-147/148 закрыты и разрешена только Phase 1A Foundation. |
| 1.3.0 | 2026-08-02 | Добавлены QG-149–158 с clean-clone, runtime, migration, jobs/storage, identity/security/observability, test/scan/scope/docs evidence; Phase 1A получила `PASSED_PHASE_1A_FOUNDATION`, Phase 1B осталась запрещена. |
| 1.4.0 | 2026-08-02 | Добавлены QG-159–163 для `OWNER-DECISION-008`: authority matrix синхронизирована и механически проверена, отсутствие catalog/import implementation подтверждено, Phase 1B hold сохранён. |
| 1.5.0 | 2026-08-02 | Добавлены QG-164–168 для `OWNER-DECISION-009`: PostgreSQL public-serving contract, diff/owner/admin activation, no-auto-delete, override/audit/version/rollback синхронизированы и проверены; Phase 1B hold сохранён. |
| 1.6.0 | 2026-08-02 | `OWNER-DECISION-010` и QG-169–176 отдельно разрешили только Phase 1B.1 после real public-page transport/ID/media preflight; pilot acceptance оставлен `IN PROGRESS`, Phase 1B.2/1C+ запрещены. |
| 1.7.0 | 2026-08-03 | QG-177–184 зафиксировали passed local VersityGW real-image/signed/multipart/restart recovery gate; media/pilot completion и production/Phase 1C остались gated. |
| 1.8.0 | 2026-08-03 | QG-185–194 зафиксировали completed real 32-variant/59-media pilot, approved active catalog/price versions, restart/no-op recovery, public/admin surfaces and passed 9/9 CI gate; later phases and production remain unauthorized. |
| 0.2.0 | 2026-08-02 | Entry gate обновлён для `GLOBAL_SPEC` 0.4.0 и partner-authorized scope; письменное поручение владельца зафиксировано как разрешение начать 0B; добавлен отдельный completion gate 0B. |
| 0.1.0 | 2026-08-02 | Предыдущий self-audit 0A.1 для версии 0.3.1; проверки `QG-001`–`087` впоследствии зарезервированы. |
