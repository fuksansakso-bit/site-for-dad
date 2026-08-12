# PROJECT_NAME

> Phase 2C final premium design is authorized and in progress on `phase/2c-final-premium-design` from protected target-main baseline `bdaa053`. The configured Supabase development project now serves the migrated exact catalog and OWNER Auth. Phase 2B remains `IMPLEMENTATION_COMPLETE_POLZA_LIVE_PROVIDER_PENDING`: one bounded rights-cleared attempt reached a normalized provider error without a successful Polza result. Phase 2C is Preview-only; merge and production promotion are not authorized.

> Active runtime remains Next.js App Router + Supabase PostgreSQL/Storage/staff-only Auth/RLS and optional guest-only Polza AI visualization. `OWNER-DECISION-024` defines the premium visual system. The narrower `OWNER-DECISION-025` additionally activates version `amigo-67c782a10449cdb7`: 1,131 retained materials in seven public groups have current AMIGO `FROM` prices and unambiguous calculator IDs; 297 incomplete materials fail closed. New quotes use material + width + height and no longer apply the local 1,500-ruble minimum or a manager-price placeholder.

`PROJECT_NAME` — рабочее обозначение веб-приложения локального бизнеса по изготовлению и установке рулонных жалюзи, систем «Зебра»/«День-Ночь», горизонтальных алюминиевых и вертикальных жалюзи.

Продукт помогает клиенту изучить реальный ассортимент и наличие, получить простой предварительный расчёт, собрать гостевую корзину и передать заявку владельцу бизнеса через WhatsApp. Владельцу приложение даёт лёгкий управляемый контур каталога, цен, наличия, заявок, портфолио и настроек без клиентских аккаунтов и сложной CRM.

## Текущая фаза

Фаза **1A — FOUNDATION** завершена 2026-08-02 в ветке `phase/1a-foundation` от исходного commit `83ed7c29bfaccf5d6a0efdcaa72db8bb04660990`. Принятые ADR-0007–0010 реализованы и повторно проверены: созданы workspace, минимальные web/BFF и worker shells, PostgreSQL/Prisma migration foundation, Graphile Worker, S3-compatible storage port, synthetic identity/RBAC, observability, security baseline, тесты и provider-neutral CI.

[Phase 1A Acceptance Gate](docs/00-global/SPEC_QUALITY_GATE.md#7-phase-1a-foundation-acceptance-gate) имеет статус `PASSED_PHASE_1A_FOUNDATION`. Отдельно разрешённая `OWNER-DECISION-010` **Phase 1B.1 — AMIGO CATALOG PILOT AND LOCAL PUBLICATION LAYER** завершена 2026-08-03 со статусом `PASSED_PHASE_1B1_AMIGO_CATALOG_PILOT`: опубликованы ровно 32 allowlisted AMIGO-материала, 59 локальных media assets, CatalogVersion/PriceVersion v1 и минимальные `/catalog`/`/admin/catalog`; storage/restart/idempotency/browser/CI gates прошли.

`OWNER-DECISION-012` разрешила **Phase 1B.2 — FULL AUTHORIZED AMIGO CATALOG EXPANSION**; фаза завершена 2026-08-04 со статусом `PASSED_PHASE_1B2_FULL_AMIGO_CATALOG`.

Принятый run обработал 114 safe pages и 21 019 normalized items: 28 categories, 56 systems, 9 models и 1 655 variants. Активны CatalogVersion v2 и каталожная PriceVersion v2, 2 818 локальных approved media objects проверены после перезапуска, а public `/catalog` обслуживает каталог только из PostgreSQL/local storage. Evidence: [transport discovery](docs/research/AMIGO_FULL_CATALOG_TRANSPORT_DISCOVERY_2026-08-03.md) и [completion report](docs/06-plans/completed/PHASE_1B2_FULL_AMIGO_CATALOG_REPORT.md).

`OWNER-DECISION-013` разрешила только **Phase 1C — PRODUCT CONFIGURATOR AND VERIFIED PRICING ENGINE**. Фаза завершена 2026-08-08 со статусом `PASSED_PHASE_1C_CONFIGURATOR_PRICING`: гостевой `/configure` использует активный PostgreSQL-каталог, server-only integer pricing и immutable quote snapshots. Активная расчётная PriceVersion v5 содержит четыре проверенных rule scope и 40 parity fixtures с максимальным отклонением 1 ₽; остальные сочетания безопасно возвращают `PRICE_ON_REQUEST` или `MANUAL_REVIEW_REQUIRED`. Evidence: [pricing verification](docs/research/AMIGO_PRICING_VERIFICATION_2026-08-08.md) и [completion report](docs/06-plans/completed/PHASE_1C_CONFIGURATOR_PRICING_REPORT.md).

**Phase 1D — DETERMINISTIC STANDARD WINDOW PREVIEW** завершена на ветке `phase/1d-standard-preview` от merged-main commit `58eb25dcde460291ad98fde157956d7f264a666d`. Гостевой `/preview` использует две локальные photoreal scenes, четыре deterministic family profiles, approved partner layers через `StoragePort`, server-side preview state и visual regression. [Отчёт](docs/06-plans/completed/PHASE_1D_STANDARD_PREVIEW_REPORT.md) и [mapping gaps](docs/06-plans/PREVIEW_AND_CONFIGURATOR_MAPPING_GAPS.md).

Phase 1E завершена со статусом `PASSED_PHASE_1E_CART_WHATSAPP_ORDERS`. Суженная `OWNER-DECISION-018` **Phase 1F — BUSINESS ADMINISTRATION, REQUEST MANAGEMENT, PORTFOLIO AND SETTINGS** завершена со статусом `PASSED_PHASE_1F_BUSINESS_ADMINISTRATION`: staff-only passwordless authentication, OWNER/ADMIN/MANAGER lifecycle, русская admin shell, request-derived CustomerContact/notes, portfolio, SiteSettings и audit работают; customer accounts отсутствуют.

`OWNER-DECISION-021/022` и ADR-0013 завершили **Phase 2A — Supabase + Vercel simplification**: один Next.js App Router, Supabase PostgreSQL/Storage/staff Auth/RLS, простой калькулятор, localStorage-корзина, гостевая заявка/WhatsApp и русская админка. Docker/Prisma/Graphile/VersityGW/Mailpit/AI/сложный preview не входят в активный runtime. Облачная Supabase activation остаётся ручным шагом без credentials; Preview Vercel создан только для тестирования. [План](docs/06-plans/active/PHASE_2A_SUPABASE_VERCEL_MIGRATION_PLAN.md) и [отчёт](docs/06-plans/completed/PHASE_2A_SUPABASE_VERCEL_MIGRATION_REPORT.md).

`OWNER-DECISION-023` и ADR-0014 завершили implementation **Phase 2B — SIMPLE POLZA GEMINI AI WINDOW VISUALIZATION**: private direct upload в Supabase, закрытый prompt, асинхронный Polza Media job, private result import, consent/ownership/limits/24-hour cleanup, before/after и безопасная связь с корзиной/заявкой. Live/cloud activation остаётся pending без credentials. [План](docs/06-plans/active/PHASE_2B_GEMINI_AI_VISUALIZATION_PLAN.md) и [отчёт](docs/06-plans/completed/PHASE_2B_GEMINI_AI_VISUALIZATION_REPORT.md).

`OWNER-DECISION-024` разрешает **Phase 2C — PREMIUM INTERIOR TECH DESIGN, TYPOGRAPHY, MOTION, ERGONOMICS AND RELEASE POLISH** из target `main` commit `bdaa053eee6491a9286355707008a39cbac1abff`. Работа охватывает финальную систему токенов и типографики, короткое first-visit starfield-вступление, полноценную главную, все существующие публичные и административные маршруты, mobile navigation, доступность, performance и visual regression. `OWNER-DECISION-025` отдельно и узко заменяет только новый public-pricing path: AMIGO `FROM` cards, server-only exact calculator/cache, fail-closed mapping and immutable historical snapshots по [ADR-0015](docs/adr/ADR-0015-amigo-exact-price-adapter.md). Финальный бренд/логотип остаётся `TBD-DESIGN-001`; `PROJECT_NAME` — только внутренний codename. [Активный план Phase 2C](docs/06-plans/active/PHASE_2C_FINAL_DESIGN_PLAN.md).

`OWNER-DECISION-021` заменил прежнюю траекторию и разрешил **Phase 2A — SUPABASE + VERCEL SIMPLIFICATION MIGRATION** из commit `3a0d7662a1b22724641ab29ca1cbd55fd575598e`, защищённого тегом `pre-supabase-vercel-migration`. Phase 2A завершена на границе code/Preview; Prisma, Graphile Worker, VersityGW, Mailpit, обязательный Docker, сложный конфигуратор/preview и AI исключены из active runtime, а история сохранена в Git и [LEGACY_FEATURES.md](LEGACY_FEATURES.md). [План Phase 2A](docs/06-plans/active/PHASE_2A_SUPABASE_VERCEL_MIGRATION_PLAN.md).

## С чего начать

Читайте документы в таком порядке:

1. [AGENTS.md](AGENTS.md) — обязательные правила работы.
2. [Карта документации](docs/INDEX.md).
3. [GLOBAL_SPEC.md](docs/specs/GLOBAL_SPEC.md) — главный источник правды о продукте.
4. [Глоссарий](docs/00-global/GLOSSARY.md).
5. [Реестр внешних источников](docs/00-global/EXTERNAL_SOURCES.md).
6. [Реестр прав на изображения и медиа](docs/00-global/ASSET_RIGHTS_REGISTER.md).
7. [Политика источников цены](docs/00-global/PRICING_SOURCE_POLICY.md).
8. [Допущения](docs/00-global/ASSUMPTIONS.md) и [открытые вопросы](docs/00-global/OPEN_QUESTIONS.md).
9. [Roadmap спецификаций](docs/00-global/SPEC_ROADMAP.md).
10. [Quality gate](docs/00-global/SPEC_QUALITY_GATE.md).
11. [CHANGELOG.md](CHANGELOG.md).

## Структура документации

- `docs/specs/` содержит единственный канонический комплект нормативных спецификаций product/domain/UX/technical; правила уникальности и размещения описаны в [docs/specs/README.md](docs/specs/README.md).
- `docs/00-global/` содержит управляющие и справочные документы: реестры, политики, roadmap, quality gate, допущения и открытые вопросы.
- `docs/quality/` и `docs/evaluations/` содержат test/evaluation artifacts, а `docs/adr/` — принятые решения об устойчивых архитектурных границах.
- `docs/06-plans/` содержит frozen MVP, critical-spec audit, implementation roadmap, technology evaluation и records завершённых Phase 1A–1F.

## Референсы

Правила размещения локальных референсов описаны в [reference/README.md](reference/README.md).
Внешние страницы LAYEL и Vengeance UI используются только как источники отдельных идей; их тексты, брендинг и структура не являются частью PROJECT_NAME. AMIGO является авторизованным изменяемым партнёрским источником разрешённых catalog/price/technical/media/brand assets по правилам [EXTERNAL_SOURCES.md](docs/00-global/EXTERNAL_SOURCES.md) и [ASSET_RIGHTS_REGISTER.md](docs/00-global/ASSET_RIGHTS_REGISTER.md), но не источником копируемого кода, DOM, дизайна или неподтверждённых закрытых алгоритмов.

## Статус решений

- Все неподтверждённые исходные решения собраны в `ASSUMPTIONS.md`.
- Все отсутствующие бизнес-данные и выборы имеют уникальные `TBD-*` в `OPEN_QUESTIONS.md`.
- Подтверждены срок изготовления 2–7 календарных дней, гарантия 12 месяцев с условиями, бесплатные услуги, регион, WhatsApp и начальный baseline четырёх семейств/систем.
- Подтверждены официальный партнёрский статус AMIGO, `AUTHORIZED_PARTNER_SOURCE`, permission scope каталога/цен/медиа/калькуляторной логики/бейджа и `PARTNER_LICENSE`; конкретные файлы по-прежнему проходят provenance, mapping и `PUBLICATION_APPROVED`.
- По `OWNER-DECISION-008` AMIGO является authority для AMIGO-origin products/materials/technical data/catalog images/base prices, а Business Owner — для local availability/visibility/price overrides/portfolio/commercial conditions. Phase 1B.2 приняла полный текущий source inventory и вручную активировала reviewed local v2 composition; ни один этап не переносит authority между слоями.
- По `OWNER-DECISION-009` публичная часть никогда не читает AMIGO напрямую: единственным каноническим runtime-источником является активная одобренная PostgreSQL `CatalogVersion` и связанные транзакционные записи. Любое обновление проходит staged import, validation/diff, Business Owner approval и явную admin activation; auto-delete локальных данных запрещён, overrides приоритетны в публичной проекции, версии и изменения аудируются. Это не разрешает Phase 1B.
- Каталожная модель динамически поддерживает все текущие и будущие source categories AMIGO; импорт не означает автоматические публикацию, наличие, расчётную готовность или возможность заказа.
- Базовая цена имеет provenance AMIGO. Каталожная v2 сохраняет 1 664 source card/base/price-from records; отдельная активная расчётная PriceVersion v5 фиксирует четыре проверенных rule scope, source metadata, parity evidence и local override precedence. Не доказанные формулы не получают числовую цену.
- Рассрочка входит в scope только как нейтральный ручной WhatsApp-сценарий; подробные условия, eligibility, порядок заявки и география остаются `TBD-INSTALLMENT-001`–`013`.
- Изображения AMIGO разрешены в партнёрском scope; hotlink, снятие водяных знаков, смена авторства и training use запрещены, а локальная публикация требует asset-level `PUBLICATION_APPROVED`.
- Окончательный бренд и commercial hosting launch не утверждены; Phase 2B AI provider выбран как Polza Media API, но live/provider-contract/privacy evidence остаётся gated.

## Локальная разработка Phase 2A/2B

Требуются Git, Node.js `24.18.1` и pnpm `11.18.0`. Создайте ignored `apps/web/.env.local` по корневому `.env.example`, затем:

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd dev
pnpm.cmd check
pnpm.cmd build
```

`pnpm dev` запускает только Next.js и подключается к development Supabase по environment variables. Docker, локальный PostgreSQL, VersityGW, Mailpit и worker не запускаются. Для миграции и cloud activation используйте `SUPABASE_SETUP.md`; прежняя инфраструктура сохранена только в `legacy/infrastructure` и через `legacy:dev`.

## Исторический локальный workflow Phase 1 (legacy)

Требуются Git, Node.js `24.18.1`, pnpm `11.18.0`, PostgreSQL `18.4`, Docker Desktop 4.84.0 или совместимый Linux-container runtime, а также Playwright Chromium/Firefox/WebKit. PostgreSQL по умолчанию ищется в `%USERPROFILE%\.cache\project-name`; нестандартный каталог задаётся через `PROJECT_NAME_POSTGRES_ROOT`. Local/CI object storage запускается из PowerShell как VersityGW `v1.4.1` с зафиксированным image digest; RustFS больше не является active prerequisite.

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd exec playwright install chromium firefox webkit
pnpm.cmd dev
pnpm.cmd dev:status
pnpm.cmd dev:stop
pnpm.cmd test:storage
pnpm.cmd test:catalog-pilot
pnpm.cmd test:catalog-full
pnpm.cmd test:catalog-browser
pnpm.cmd test:catalog-scale
pnpm.cmd --filter @project-name/db pricing:bootstrap
```

`pnpm.cmd dev` одной командой поднимает loopback-only PostgreSQL, применяет reviewed migrations, запускает Graphile Worker migrations, private-by-default VersityGW buckets, web и отдельный worker. S3 API слушает `127.0.0.1:4569`, Admin API — `127.0.0.1:4570`; object data, versioning и IAM хранятся в Docker named volumes `project_name_catalog_s3_data`, `project_name_catalog_s3_versioning`, `project_name_catalog_s3_iam`, без bind mount в NTFS. Состояние и диагностические журналы находятся только в игнорируемом `.local/foundation-environment/`; credentials генерируются локально и в вывод не попадают.

Для проверки используйте `pnpm.cmd test:storage`, `pnpm.cmd test:catalog-pilot`, `pnpm.cmd test:catalog-full`, `pnpm.cmd test:catalog-browser`, `pnpm.cmd test:catalog-scale`, `pnpm.cmd check`, `pnpm.cmd test:coverage`, `pnpm.cmd test:browser` или полный `pnpm.cmd ci:verify`. `test:catalog-full` проверяет активную real v2 pair, manifest/repeat/recovery lineage, полный public traversal и byte/SHA-integrity каждого local media object; run IDs можно передать параметрами. `test:catalog-browser` поднимает изолированные PostgreSQL/VersityGW, публикует только синтетический вложенный каталог и проверяет public catalog во всех пяти browser profiles без runtime-запросов к AMIGO. `test:catalog-scale` использует отдельную одноразовую PostgreSQL с `pg_stat_statements` и 2 048 синтетическими материалами для проверки bounded pagination/memory, постоянного числа public/admin/bulk SQL-операций, отсутствия temporary-block spill и атомарного bulk apply; наблюдаемые времена не объявляются production-SLA. Storage, catalog-browser и catalog-scale gates временно создают и удаляют только свои точные disposable resources; учётные данные в evidence и логи не пишутся. `pnpm.cmd dev:reset` безвозвратно удаляет только проверенные local PostgreSQL data/secrets и три проектных VersityGW named volumes; обычные `dev:stop`/`dev` и Docker restart сохраняют объекты.

Если запуск не удался, проверьте Docker Desktop, занятость loopback-портов web/metrics/PostgreSQL/S3/Admin (`3000`, `9464`, `55432`, `4569`, `4570`), точные версии runtime и журналы `.local/foundation-environment/logs`. Ручное изменение прав NTFS и bind mount object directory не требуются. Production credentials для локального запуска не нужны и использовать их запрещено.

## Текущая граница работы

Phase 1A–1F и Phase 2A завершены; Phase 2B implementation завершена со статусом `IMPLEMENTATION_COMPLETE_POLZA_LIVE_PROVIDER_PENDING`; Phase 2C final premium design авторизована и выполняется. Customer accounts, payment, direct Google AI, SAM/Python/GPU/worker service, удаление исходных данных, merge и production launch остаются на hold.
