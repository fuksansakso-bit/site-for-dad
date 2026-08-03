# Changelog

Все заметные изменения проекта документируются в этом файле.
Формат основан на [Keep a Changelog](https://keepachangelog.com/ru/1.1.0/), а версии следуют [Semantic Versioning](https://semver.org/lang/ru/) после начала версионируемых выпусков.

## [Unreleased]

### Added

- Добавлены неизменяемые staged `CatalogVersion`/`PriceVersion`, детерминированный exact diff и content/difference checksums, повторное использование одинаковых артефактов без дубликатов, раздельные Business Owner approval и administrator activation, stale-base/ready-state checks, атомарное переключение `PUBLIC`, version-pinned outbox events и проверяемый rollback. Sync по-прежнему останавливается в `AWAITING_APPROVAL` и не публикует source/staging автоматически.
- Добавлен безопасный AMIGO media import для 32-ID Phase 1B.1 pilot: SSRF/redirect/rate/timeout/size/content-type и фактический MIME gate, PNG/JPEG/WebP dimension/decompression limits, SHA-256, generated immutable object keys, provider-neutral private storage, deduplication, provenance/rights metadata, item-level failures и audit events. Реальный recovery run `f9407db3-9e82-4174-9e21-87528bdd7092` импортировал 59/59 изображений для 32/32 `MaterialVariant`, а повторный run `642f2bc2-387b-44fe-9d52-e05cd78e374c` подтвердил отсутствие дубликатов и связал retry lineage через `audit_context`; исторический failed run не изменён.
- Зафиксировано `OWNER-DECISION-011` «LOCAL DEVELOPMENT OBJECT STORAGE»: воспроизводимый Windows 11 отказ RustFS `1.0.0-beta.11` на 159 099/262 144/515 180-byte real-media path переводит active local/CI S3 adapter на digest-pinned VersityGW `v1.4.1` в Docker Compose с POSIX named volumes и all-private trust zones; provider-neutral `StoragePort`, PostgreSQL/Prisma/Graphile и открытый выбор production storage сохранены.
- Зафиксировано `OWNER-DECISION-010`: после `PASSED_PHASE_1A_FOUNDATION` отдельно разрешена только Phase 1B.1 в `phase/1b-amigo-catalog-pilot`; создан active plan и dated transport discovery с owner-authorized low-rate public-page adapter, stable numeric IDs, real 32-material/four-system allowlist, local media/publication boundaries и явным запретом Phase 1B.2/1C+, full import и production.
- Зафиксировано `OWNER-DECISION-009` «LOCAL CATALOG AS PUBLIC SOURCE OF TRUTH»: AMIGO остаётся upstream authority, публичная часть читает только активную одобренную PostgreSQL `CatalogVersion`/transactional state, а source changes проходят import/sync → local staging → validation/diff → Business Owner approval → explicit admin activation. Запрещены auto-delete локальных данных и direct AMIGO/staging runtime reads; local overrides имеют явный приоритет в публичной проекции, все версии/изменения аудируются и имеют source/timestamps/rollback.
- Зафиксировано `OWNER-DECISION-008` и каноническая authority matrix: AMIGO определяет AMIGO-origin products/materials/technical data/catalog images/base prices; Business Owner определяет local availability/visibility/price overrides/portfolio/commercial conditions; PostgreSQL хранит версионированную operational projection, а image binaries — object storage.
- Завершён Phase 1A verification baseline: 61 unit/contract tests с coverage artifacts, 19 реальных PostgreSQL/RustFS/Graphile/identity integration/recovery tests и 20 Playwright smoke scenarios в Chromium, Firefox, WebKit, narrow viewport и reduced-motion profile.
- Добавлен provider-neutral fail-closed CI contract из девяти стадий: frozen install, formatting/docs/scope/boundaries, lint/typecheck, coverage, disposable PostgreSQL migrations/jobs/identity, disposable RustFS storage contract, production build/artifact scan, multi-browser smoke и repository secret/critical advisory scan.
- Добавлен единый Windows 11 lifecycle `dev`/`dev:status`/`dev:stop`/`dev:reset` для loopback-only PostgreSQL, RustFS, web и отдельного worker с безопасной очисткой только `.local/foundation-environment`, повторным запуском миграций и локальными журналами без секретов.
- Добавлен общий `packages/testing` с synthetic environment и bounded wait utilities; все 11 workspace packages имеют непустой публичный интерфейс, направленные зависимости и собственную проверку.
- Добавлены nonce-based CSP, secure headers, exact-origin/CSRF boundary, ограничение JSON request body, provider-neutral rate-limit interface и server-side deny-by-default authorization tests; production CSP не допускает `unsafe-inline`/`unsafe-eval`.
- Добавлен provider-neutral observability foundation: allowlisted structured JSON logs, request/correlation/trace context, safe error classification, redaction of secrets/PII/URLs/paths, bounded dependency readiness, low-cardinality metrics и optional OpenTelemetry OTLP HTTP export; web проверяет process/PostgreSQL/storage, worker — database/queue/worker, а Node telemetry изолирован от Edge proxy.
- Добавлен provider-neutral identity/RBAC foundation с шестью Phase 1A ролями, deny-by-default capability/object policy, synthetic human/workload credentials, HMAC-hashed revocable sessions, current-grant re-evaluation и immutable audit attribution; PostgreSQL contract покрывает ownership denial, role grant/revoke, expiry, session revoke и dependency outage без production auth provider.
- Добавлен отдельный Graphile Worker foundation с versioned synthetic payload, bounded retry/timeout, durable idempotency, permanent-failure inspection, correlation-safe logs, явной operator-only миграцией и RLS hardening для runtime-роли без DDL; реальный PostgreSQL-тест подтверждает replay, retry, timeout, graceful drain и освобождение queue lock.
- Добавлен provider-neutral S3-compatible storage port с отдельными public/private/quarantine namespaces, immutable/checksum metadata, scoped signed grants и реальными negative access/recovery tests на одноразовом loopback-only RustFS без production credentials или медиа.
- Добавлены PostgreSQL/Prisma foundation, три воспроизводимые инфраструктурные миграции, отдельные migrator/runtime роли, append-only audit и автоматическая Windows-проверка clean/repeat/upgrade/drift/forward-recovery на одноразовой SCRAM-базе без бизнес-таблиц.
- Добавлены typed fail-fast environment schemas для local/test/CI, явный public allowlist, `.env.example` без значений секретов, deterministic log redaction и автоматический repository secret scan с подавлением найденных значений.
- Созданы минимальные `apps/web` и отдельный `apps/worker`, versioned liveness/readiness routes, безопасный единый error contract, технические 404/error boundary и проверки health-контрактов без бизнес-функций.
- Добавлены strict TypeScript baseline, fail-closed ESLint/Prettier/Vitest configuration и машинная проверка направлений workspace-зависимостей, циклов, публичных интерфейсов и обязательных package verification scripts.
- Инициализирован Phase 1A workspace: Node.js `24.18.1`, pnpm `11.18.0`, единый exact-version catalog, Turborepo task graph и зафиксированный dependency baseline для Windows 11 без выбора production-провайдера.
- Зафиксированы `OWNER-DECISION-001`–`007`: разделение Product Owner/Business Owner, PriceVersion activation, per-item minimum 1500 рублей, authoritative local availability, AMIGO cadence/staleness, parity tolerance и regional production matrix.
- ADR-0007–0010 приняты Product Owner для Phase 1A после проверки совместимости, Windows 11, migration safety, provider replacement, vendor-neutral secrets, separate worker и observability-from-start.
- Создана рабочая ветка `phase/1a-foundation` от Phase 0C commit `83ed7c29bfaccf5d6a0efdcaa72db8bb04660990`; remote не добавлялся и push не выполнялся.
- Создан baseline commit Phase 0B `7105ef03c1fb1cb726161fcbc02cbb0c340e212e` с сообщением `docs: establish Phase 0B specification baseline` после проверки `.gitignore`, secrets, media, binaries, cache/temp и ссылок; remote/push не создавались.
- Добавлены Phase 0C plans: `MVP_SCOPE.md`, `SPEC_READINESS_AUDIT.md`, `IMPLEMENTATION_ROADMAP.md`, `PHASE_1A_TECHNOLOGY_EVALUATION.md` и `active/PHASE_1A_FOUNDATION_PLAN.md` без приложения, schema, dependencies или production configuration.
- Зафиксирован first-launch MVP из 20 возможностей, 8 cross-cutting safety boundaries и 15 явных post-MVP направлений; полный ассортимент AMIGO не является launch dependency, pilot ограничен 20–50 проверенными материалами.
- Добавлены proposed ADR-0007–0010 для Foundation application stack, PostgreSQL/migration safety, S3-compatible storage/Postgres-backed jobs и identity/secrets/OTLP boundary; они требуют owner acceptance и не разрешают Phase 1A.
- Добавлен `TBD-PREVIEW-001` для проверяемого набора scene/renderer profiles, assets и family coverage standard preview Phase 1D.
- Создан полный нормативный комплект Phase 0B в `docs/specs/`: 5 product, 11 domain, 6 UX и 11 technical/operations документов без production-кода или placeholder-файлов.
- В `USER_STORIES.md`, `ACCEPTANCE_CRITERIA.md` и `TEST_STRATEGY.md` определены соответственно 40 полных stories для восьми акторов, 40 позитивно-негативных acceptance criteria и 40 именованных критических test scenarios.
- Добавлены отдельные спецификации функционального AMIGO parity, динамического каталога, конфигуратора, версионированной цены, standard preview, private AI visualizer, cart/order/WhatsApp, installment, account, admin и content/portfolio.
- Добавлен полный UX-комплект: IA, premium interior-tech design system, starfield/motion, screen, responsive и WCAG 2.2 AA accessibility contracts.
- Добавлен vendor-neutral technical комплект: modular architecture, logical data/API contracts, AMIGO sync, media pipeline/storage, AI pipeline, security/privacy, performance, observability и deployment/rollback.
- Созданы `docs/evaluations/AI_EVALUATION_SPEC.md` с rights-cleared benchmark/hard gates и `docs/quality/TEST_STRATEGY.md` с pricing parity, degradation, privacy, accessibility, recovery и idempotency coverage.
- Приняты шесть содержательных ADR `ADR-0001`–`ADR-0006`: application boundary, AMIGO snapshots, versioned pricing, deterministic standard preview, geometry-first AI и public/private media storage; конкретные vendors оставлены TBD.
- Добавлен `docs/research/AMIGO_PUBLIC_PARITY_SNAPSHOT_2026-08-02.md`: read-only проверка 14 публичных URL и текущего calculator iframe/customizer без скачивания media или обхода доступа.
- Создан `docs/00-global/TRACEABILITY_MATRIX.md` с critical global-to-0B chains, reserved user story/acceptance/test IDs и честными coverage gaps.
- Добавлены `PARTNER-001`–`007`, `AMIGO-PARITY-001`–`005`, `AMIGO-SYNC-001`–`006`, `FR-CONFIG-*`, `FR-STANDARD-PREVIEW-*`, `FR-AI-VIS-001` и `FR-CART-*`.
- В `SPEC_ROADMAP.md` добавлен обязательный модульный набор product, domain, UX, technical, quality и evaluation artifacts 0B без создания пустых файлов.
- Создан выделенный каталог `docs/specs/`, в котором находятся только нормативные спецификации; пустые файлы будущих спек не создавались.
- Добавлен корневой `.gitignore` для секретов, локальных окружений, зависимостей, сборок, кэшей, runtime-данных и приватных пользовательских загрузок.
- Инициализирован локальный Git-репозиторий с основной веткой `main`; удалённый `origin` не задан, поэтому `TBD-INFRA-001` остаётся открытым.
- Добавлена корректирующая документационная фаза 0A.1: External Source, Pricing, Warranty and Asset Governance Update.
- Создан `docs/00-global/EXTERNAL_SOURCES.md` с семью зарегистрированными публичными страницами AMIGO, provenance-моделью, статусами проверки, границами использования, update и fallback.
- Создан `docs/00-global/ASSET_RIGHTS_REGISTER.md` с восемью категориями активов, состояниями прав, publication gate, AI-ограничениями, import metadata и delete paths.
- Создан `docs/00-global/PRICING_SOURCE_POLICY.md` с `PRICING-SOURCE-001`–`007`, immutable snapshots/versions, административным подтверждением, local override, fallback, audit, `PricingProvider` и pricing parity matrix.
- Зафиксированы прямые ответы владельца: 2–7 календарных дней, 12-месячная гарантия с покрытием/исключениями, вся Чеченская Республика, бесплатные замер/доставка/установка, WhatsApp и нейтральный ручной сценарий рассрочки.
- Подтверждены четыре Product Family и полный переданный владельцем allowlist рулонных, Zebra, горизонтальных и вертикальных source/catalog entities AMIGO.
- Добавлены требуемые `TBD-INSTALLMENT-001`–`010` и дополнительные `TBD-INSTALLMENT-011`–`013` для порядка заявки, географии и иных eligibility-критериев, а также source/access, asset-license, source-region/sync и pricing-parity TBD; сохранён `TBD-MIN-PRICE-001`.

### Changed

- Active local/CI object storage переведён с Windows-native RustFS на VersityGW `v1.4.1@sha256:0400cb59f59da0f1cf9f7fd49505191abc348dfadf54509bf1988caaff4eb96f` в Linux Docker Compose: loopback-only S3/Admin, POSIX backend, three persistent named volumes, private buckets, typed environment, graceful shutdown и automatic Docker restart recovery. PostgreSQL, Prisma, Graphile Worker, catalog model и provider-neutral `StoragePort` не менялись.
- Storage contract gate прошёл 15/15 на размерах 1/65,536/131,072/159,099/262,144/515,180/1 MiB/5 MiB/6 MiB: byte-for-byte/SHA-256, head/metadata/type/length, signed read/write, multipart complete/abort, idempotence/dedup/concurrency, invalid input/checksum/timeout/unavailable, delete, graceful restart и named-volume/Docker Desktop persistence. Реальный AMIGO JPEG подтверждён SHA-256 `ac86fc976afc2063cc97e1528611c978a348f357d26c8fe3c59b7c23f113d0cd`.
- `GLOBAL_SPEC.md` обновлён до 0.11.0, storage/media/security/deployment/test specifications, ADR-0009, quality gate QG-177–184, traceability, active plan, Windows runbook и dependency baseline синхронизированы с `OWNER-DECISION-011`; `TBD-INFRA-010` сохраняет production provider невыбранным.
- `GLOBAL_SPEC.md` обновлён до 0.9.0, `ARCHITECTURE.md`/`AMIGO_SYNC_ARCHITECTURE.md`/`DATA_MODEL.md`/`FEATURE_SPEC.md`/`PRICING_CALCULATOR_SPEC.md` — до 0.4.0, `AMIGO_CATALOG_PARITY_SPEC.md` — до 0.3.0, `TRACEABILITY_MATRIX.md`/`SPEC_ROADMAP.md`/`SPEC_QUALITY_GATE.md` — до 1.5.0; glossary/external-source/pricing/open-question/specification-and-implementation-roadmap/test-strategy/index/README контекст и QG-164–168 синхронизированы с `OWNER-DECISION-009`. Existing transport/import/price/asset TBD и запрет Phase 1B сохранены; бизнес-таблицы и импорт не создавались.
- `GLOBAL_SPEC.md` обновлён до 0.8.0; glossary, external/rights/pricing policies, open questions, feature/RBAC, parity/catalog/pricing/admin/content, architecture/data/sync/media/storage, roadmap, traceability, index и README синхронизированы с field-level authority и запретом cross-layer overwrite.
- `SPEC_QUALITY_GATE.md` обновлён до 1.4.0: QG-159–163 фиксируют docs-only audit, успешные documentation/format/phase-scope checks и отсутствие фактической catalog/import implementation; Phase 1B hold сохранён.
- Формулировка «каталог импортируется в локальный PostgreSQL» закреплена как целевая Phase 1B operational topology, а не как доказательство завершённого импорта: текущая Prisma schema по-прежнему содержит только Foundation tables, `TBD-SOURCE-AMIGO-002`/`TBD-ASSORT-002`/pricing и asset inventory остаются открыты, отдельное Phase 1B authorization не получено.
- Phase 1A Foundation завершена со статусом `PASSED_PHASE_1A_FOUNDATION`: полный CI-equivalent конвейер прошёл 9/9 стадий в рабочей копии и в отдельном чистом клоне после frozen установки 638 зависимостей; Phase 1B и production deployment не разрешены.
- Phase 1A plan, accepted ADR-0007–0010, technical implementation notes, roadmap, quality gate, traceability, open-question gate notes, index и README синхронизированы с фактической Foundation реализацией и completion report.
- `QG-147/148` закрыты; gate переведён в `AUTHORIZED_FOR_PHASE_1A_FOUNDATION`. Разрешена только Phase 1A, а Phase 1B+, AMIGO import, business features и production deployment явно остаются запрещены.
- Семь P0 `TBD-BIZ-001`, `TBD-PRICE-007`, `TBD-MIN-PRICE-001`, `TBD-PRICE-SOURCE-002`, `TBD-PRICE-PARITY-001`, `TBD-INVENTORY-002`, `TBD-INFRA-002` переведены в `RESOLVED` без удаления исторических IDs; P0 counts стали 19 resolved и 0 owner-decision-required.
- `GLOBAL_SPEC.md` обновлён до 0.7.0; pricing/catalog/admin/RBAC/sync/performance/observability/deployment/test документы синхронизированы с owner decisions, а pricing/import/business implementation сохранены за пределами Phase 1A.
- Все 61 исторических P0 ID классифицированы для Phase 0C: 12 `RESOLVED`, 7 `OWNER_DECISION_REQUIRED`, 10 `EXTERNAL_AMIGO_DATA_REQUIRED`, 0 `BLOCKER_BEFORE_FOUNDATION`, 20 `BLOCKER_BEFORE_FEATURE`, 7 `SAFE_DEFAULT_AVAILABLE`, 5 `DEFERRED_POST_MVP`, 0 `DUPLICATE`, 0 `INVALIDATED`; unclassified стало 0.
- `GLOBAL_SPEC.md` обновлён до 0.6.0: frozen MVP/basic saved-calculation account/roller+Zebra AI pilot/online-payment deferral и Phase 1A–1H synchronized; `ASM-004/021` перенесены в подтверждённые, `TBD-ACCOUNT-001` закрыт, `TBD-MIN-PRICE-001` оставлен открытым.
- Critical-spec audit проверил 14 документов по 15 dimensions: итог 14 `READY_WITH_NON_BLOCKING_TBD`, 0 `BLOCKED`, 0 `NEEDS_EXPANSION`, 0 `CONTRADICTORY` после focused fixes; feature-specific TBD продолжают fail closed.
- `SPEC_QUALITY_GATE.md` получил QG-131–148 и итог `READY_FOR_OWNER_AUTHORIZATION`: documentation readiness пройдена, но QG-147/148 (acceptance ADR и отдельное разрешение Phase 1A) намеренно не выполнены.
- `SPEC_ROADMAP`, `TRACEABILITY_MATRIX`, `docs/INDEX`, `README` и `AGENTS` синхронизированы с Phase 0C, proposed ADR, P0 gates и запретом автоматического начала разработки.
- Completion gate Phase 0B `QG-112`–`130` пройден: 33 specs, 6 ADR, 40/40/40 story–AC–test, 1 202 уникальных definition IDs, 0 битых ссылок/ошибок таблиц/запрещённых code-media artifacts; проект переведён в transition hold без разрешения реализации.
- `GLOBAL_SPEC.md` обновлён до 0.5.0 и связан с фактически созданными профильными specs, traceability, tests и ADR; устаревшие ссылки на будущие/несуществующие документы заменены каноническими путями 0B.
- `TRACEABILITY_MATRIX.md` обновлён с планового состояния до 18/18 critical chains и полной карты 40 story → 40 AC → 40 test с видимыми `BLOCKED_TBD`.
- `SPEC_ROADMAP.md` и `docs/INDEX.md` переписаны как фактическая карта 33 specs, quality/evaluation artifacts и шести ADR с post-gate порядком без автоматического перехода к коду.
- Entry gate `QG-088`–`111` отмечен `PASSED` по письменному поручению владельца; отдельные completion checks `QG-112`–`130` добавлены для финального аудита Phase 0B.
- `GLOBAL_SPEC.md` обновлён до 0.4.0: зафиксированы официальный партнёрский статус AMIGO, permission scope, динамический каталог, dynamic source price categories, два visualizer flows, cart/handoff и sync boundaries.
- `EXTERNAL_SOURCES.md`, `ASSET_RIGHTS_REGISTER.md` и `PRICING_SOURCE_POLICY.md` обновлены до 1.1.0; `AUTHORIZED_PARTNER_SOURCE`, `PARTNER_LICENSE` и asset-level `PUBLICATION_APPROVED` разделены по своим измерениям.
- Source registry расширен с семи записей до 15: 14 заданных публичных страниц плюс volatile customizer, обнаруженный через calculator iframe.
- Каталог больше не ограничивает data model четырьмя семействами: начальный baseline сохранён, а все текущие/будущие категории AMIGO регистрируются динамически с независимыми publication, availability, pricing и orderability states.
- `sourcePriceCategory` определён строкой, а nullable `localPriceTier` отделён от source code; наблюдаемые наборы `E`, `0`, `1`–`5` больше не моделируются закрытым enum.
- `ASM-001` и `ASM-002` перенесены из активных assumptions в подтверждённые owner decisions; гостевой путь и scope кабинета внесены в нормативные требования.
- `TBD-SOURCE-AMIGO-001`, `TBD-ASSET-AMIGO-001`–`002`, `TBD-PRICE-CATEGORY-001` и `TBD-DESIGN-003` отмечены решёнными; добавлен `TBD-ASSET-AMIGO-003` для точной атрибуции/brand guidelines.
- `GLOBAL_SPEC.md` перемещён из `docs/00-global/` в `docs/specs/` и обновлён до версии 0.3.1 без изменения бизнес-смысла требований.
- Будущие нормативные спецификации в `SPEC_ROADMAP.md` перенаправлены в тематические подкаталоги `docs/specs/`; evaluations, threat model, test strategy и ADR оставлены вне каталога спецификаций.
- `AGENTS.md`, `README.md`, `docs/INDEX.md`, governance-документы и reference-навигация синхронизированы с новой структурой.
- `GLOBAL_SPEC.md` обновлён до версии 0.3.0 и остаётся главным источником правды, с нормативными ссылками на три новых глобальных документа.
- Каталог нормализован: source/marketing title, Product Family, Product Type, Product System, Mechanism Model, Mounting Method, Shaft Enclosure и Lamella Spec больше не смешиваются в одном поле.
- Материал AMIGO теперь моделируется внешней сущностью с source fields, availability/price metadata и обязательным локальным `PUBLICATION_APPROVED` изображением.
- Area/rate/minimum-модель `ASM-020` заменена source-based pricing; неподтверждённая формула удалена из глобальной архитектурной модели.
- Будущие roadmap-файлы переименованы в `CATALOG_INVENTORY_SPEC.md` и `TEST_STRATEGY.md`; последняя обязана включить pricing parity matrix.
- `AGENTS.md`, `README.md`, `docs/INDEX.md`, глоссарий, assumptions, open questions и roadmap синхронизированы с фазой 0A.1.
- `TBD-LEAD-001`, `TBD-SYSTEM-001`, `TBD-HORIZONTAL-001`, `TBD-VERTICAL-001` и `TBD-SERVICE-001`–`003` сохранены как решённые записи с датой и нормативными ссылками.

### Fixed

- RustFS `1.0.0-beta.11` больше не блокирует real Phase 1B.1 media на Windows 11: исторический `HTTP 500 File access denied` при 159,099/262,144 байт и реальном media path устранён local-only adapter replacement без подмены failed sync history или media fixtures.
- Docker Desktop restart recovery исправлен с `restart: unless-stopped` на `restart: always`: VersityGW корректно завершается по SIGTERM и автоматически восстанавливается с теми же named volumes и checksum-preserved objects.
- Устранено противоречие приоритета источников: `GLOBAL_SPEC` → accepted ADR → approved specialized spec; dynamic AMIGO snapshot не может переписать нормативное поведение.
- `STANDARD_INTERIOR_PREVIEW` больше не называется `GEOMETRIC_PREVIEW` в ADR-0004/traceability; client-photo geometry и optional AI result остаются отдельными типами.
- Исправлены stale/nonexistent ID ranges в ADR-0002/0004/0006 и ссылка `ARCHITECTURE` на устаревший `GLOBAL_SPEC` 0.4.0.
- Устранены противоречия о том, что AMIGO используется только для public research, партнёрство/права ожидаются, media всегда `REFERENCE_ONLY`, категории ограничены четырьмя семействами, а price categories — только 1–5.
- Стандартный интерьерный preview отделён от privacy-sensitive примерки на фотографии клиента и optional generative refinement.
- Устранены противоречия: срок больше не помечен как рабочие/календарные дни TBD; гарантия больше не ограничена одним сроком без условий.
- «Зебра» признана отдельным подтверждённым Product Family; пластиковые и мультифактурные вертикальные жалюзи удалены из запрещённого ассортимента.
- Бесплатные услуги больше не сопровождаются открытыми исключениями; московские условия AMIGO явно не применяются к Чеченской Республике.
- Публичные цены и изображения AMIGO больше не могут трактоваться как постоянные локальные значения или разрешённые публикационные активы.

## [0.1.0] - 2026-08-01

### Added

- Создана документационная основа фазы 0A.
- Добавлен `GLOBAL_SPEC.md` как главный источник правды о продукте.
- Добавлены глоссарий, реестр допущений и категоризированный реестр открытых вопросов.
- Добавлены roadmap будущих специализированных спецификаций и проверяемый quality gate.
- Добавлены правила работы агентов, карта документации и правила хранения референсов.
- Зафиксированы результаты первичного анализа LAYEL, Vengeance UI и отсутствие локальных изображений на дату инвентаризации.

Ссылки сравнения версий будут добавлены после появления канонического Git-репозитория (`TBD-INFRA-001`); фиктивный URL намеренно не используется.
