# PROJECT_NAME

`PROJECT_NAME` — рабочее обозначение веб-приложения локального бизнеса по изготовлению и установке рулонных жалюзи, систем «Зебра»/«День-Ночь», горизонтальных алюминиевых и вертикальных жалюзи.

Продукт должен помочь клиенту изучить реальный ассортимент и наличие, получить предварительный расчёт для одного или нескольких окон, примерить выбранный материал на фотографии и передать результат владельцу бизнеса. Владельцу приложение должно дать единый управляемый контур каталога, цен, остатков, заявок, замеров, заказов, контента и аналитики.

## Текущая фаза

Фаза **1A — FOUNDATION** завершена 2026-08-02 в ветке `phase/1a-foundation` от исходного commit `83ed7c29bfaccf5d6a0efdcaa72db8bb04660990`. Принятые ADR-0007–0010 реализованы и повторно проверены: созданы workspace, минимальные web/BFF и worker shells, PostgreSQL/Prisma migration foundation, Graphile Worker, S3-compatible storage port, synthetic identity/RBAC, observability, security baseline, тесты и provider-neutral CI.

[Phase 1A Acceptance Gate](docs/00-global/SPEC_QUALITY_GATE.md#7-phase-1a-foundation-acceptance-gate) имеет статус `PASSED_PHASE_1A_FOUNDATION`. Отдельно разрешённая `OWNER-DECISION-010` **Phase 1B.1 — AMIGO CATALOG PILOT AND LOCAL PUBLICATION LAYER** завершена 2026-08-03 со статусом `PASSED_PHASE_1B1_AMIGO_CATALOG_PILOT`: опубликованы ровно 32 allowlisted AMIGO-материала, 59 локальных media assets, CatalogVersion/PriceVersion v1 и минимальные `/catalog`/`/admin/catalog`; storage/restart/idempotency/browser/CI gates прошли.

`OWNER-DECISION-012` разрешает начать только **Phase 1B.2 — FULL AUTHORIZED AMIGO CATALOG EXPANSION** в ветке `phase/1b2-amigo-full-catalog` от commit `af8411d2b854e572b6b61b214d3e99a88b96cafc`. Цель — контролируемо расширить существующий importer до полного доступного разрешённого каталога, локальных media/base-price snapshots, diff/review/manual activation, bulk business overlays и масштабируемых public/admin surfaces. Phase 1C, dimensional calculator/configurator/preview/AI/cart/order/WhatsApp/account/final landing и production deployment не разрешены.

Этап Phase 1B.2 discovery завершён фактическим controlled capture: 114 safe pages, 28 categories, 56 systems, 9 models, 1655 variants, semantic source version и 0 failure diagnostics. Результат пока staged: full PostgreSQL/media import, manifest, diff/review и activation выполняются следующими шагами active plan; публичная версия не переключалась. Evidence: [full transport discovery](docs/research/AMIGO_FULL_CATALOG_TRANSPORT_DISCOVERY_2026-08-03.md).

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

- `docs/specs/` содержит глобальную и 33 нормативные профильные спецификации product/domain/UX/technical.
- `docs/00-global/` содержит управляющие и справочные документы: реестры, политики, roadmap, quality gate, допущения и открытые вопросы.
- `docs/quality/` и `docs/evaluations/` содержат test/evaluation artifacts, а `docs/adr/` — десять принятых решений об устойчивых архитектурных границах.
- `docs/06-plans/` содержит frozen MVP, critical-spec audit, implementation roadmap, technology evaluation, стабильные completed Phase 1A/Phase 1B.1 plans, [Phase 1B.1 completion report](docs/06-plans/completed/PHASE_1B1_AMIGO_CATALOG_PILOT_REPORT.md) и активный [Phase 1B.2 plan](docs/06-plans/active/PHASE_1B2_FULL_AMIGO_CATALOG_PLAN.md).

## Референсы

Правила размещения локальных референсов описаны в [reference/README.md](reference/README.md).
Внешние страницы LAYEL и Vengeance UI используются только как источники отдельных идей; их тексты, брендинг и структура не являются частью PROJECT_NAME. AMIGO является авторизованным изменяемым партнёрским источником разрешённых catalog/price/technical/media/brand assets по правилам [EXTERNAL_SOURCES.md](docs/00-global/EXTERNAL_SOURCES.md) и [ASSET_RIGHTS_REGISTER.md](docs/00-global/ASSET_RIGHTS_REGISTER.md), но не источником копируемого кода, DOM, дизайна или неподтверждённых закрытых алгоритмов.

## Статус решений

- Все неподтверждённые исходные решения собраны в `ASSUMPTIONS.md`.
- Все отсутствующие бизнес-данные и выборы имеют уникальные `TBD-*` в `OPEN_QUESTIONS.md`.
- Подтверждены срок изготовления 2–7 календарных дней, гарантия 12 месяцев с условиями, бесплатные услуги, регион, WhatsApp и начальный baseline четырёх семейств/систем.
- Подтверждены официальный партнёрский статус AMIGO, `AUTHORIZED_PARTNER_SOURCE`, permission scope каталога/цен/медиа/калькуляторной логики/бейджа и `PARTNER_LICENSE`; конкретные файлы по-прежнему проходят provenance, mapping и `PUBLICATION_APPROVED`.
- По `OWNER-DECISION-008` AMIGO является authority для AMIGO-origin products/materials/technical data/catalog images/base prices, а Business Owner — для local availability/visibility/price overrides/portfolio/commercial conditions. Phase 1B.1 импортировал frozen 32-ID pilot в PostgreSQL/object storage; Phase 1B.2 discovery доказал текущий source inventory, но ещё не импортировал и не активировал его. Ни один этап не переносит authority между слоями.
- По `OWNER-DECISION-009` публичная часть никогда не читает AMIGO напрямую: единственным каноническим runtime-источником является активная одобренная PostgreSQL `CatalogVersion` и связанные транзакционные записи. Любое обновление проходит staged import, validation/diff, Business Owner approval и явную admin activation; auto-delete локальных данных запрещён, overrides приоритетны в публичной проекции, версии и изменения аудируются. Это не разрешает Phase 1B.
- Каталожная модель динамически поддерживает все текущие и будущие source categories AMIGO; импорт не означает автоматические публикацию, наличие, расчётную готовность или возможность заказа.
- Базовая цена имеет provenance AMIGO. Pilot PriceVersion v1 содержит только 32 проверенные карточные цены «от» и безопасный `PRICE_ON_REQUEST`; формулы, compatibility, расчёт по размерам, minimum-price engine и parity matrix остаются Phase 1C и не реализованы.
- Рассрочка входит в scope только как нейтральный ручной WhatsApp-сценарий; подробные условия, eligibility, порядок заявки и география остаются `TBD-INSTALLMENT-001`–`013`.
- Изображения AMIGO разрешены в партнёрском scope; hotlink, снятие водяных знаков, смена авторства и training use запрещены, а локальная публикация требует asset-level `PUBLICATION_APPROVED`.
- Окончательный бренд, хостинг и AI-провайдер не выбраны.

## Локальная разработка на Windows 11

Требуются Git, Node.js `24.18.1`, pnpm `11.18.0`, PostgreSQL `18.4`, Docker Desktop 4.84.0 или совместимый Linux-container runtime, а также Playwright Chromium/Firefox/WebKit. PostgreSQL по умолчанию ищется в `%USERPROFILE%\.cache\project-name`; нестандартный каталог задаётся через `PROJECT_NAME_POSTGRES_ROOT`. Local/CI object storage запускается из PowerShell как VersityGW `v1.4.1` с зафиксированным image digest; RustFS больше не является active prerequisite.

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd exec playwright install chromium firefox webkit
pnpm.cmd dev
pnpm.cmd dev:status
pnpm.cmd dev:stop
pnpm.cmd test:storage
pnpm.cmd test:catalog-pilot
pnpm.cmd test:catalog-browser
pnpm.cmd test:catalog-scale
```

`pnpm.cmd dev` одной командой поднимает loopback-only PostgreSQL, применяет reviewed migrations, запускает Graphile Worker migrations, private-by-default VersityGW buckets, web и отдельный worker. S3 API слушает `127.0.0.1:4569`, Admin API — `127.0.0.1:4570`; object data, versioning и IAM хранятся в Docker named volumes `project_name_catalog_s3_data`, `project_name_catalog_s3_versioning`, `project_name_catalog_s3_iam`, без bind mount в NTFS. Состояние и диагностические журналы находятся только в игнорируемом `.local/foundation-environment/`; credentials генерируются локально и в вывод не попадают.

Для проверки используйте `pnpm.cmd test:storage`, `pnpm.cmd test:catalog-pilot`, `pnpm.cmd test:catalog-browser`, `pnpm.cmd test:catalog-scale`, `pnpm.cmd check`, `pnpm.cmd test:coverage`, `pnpm.cmd test:browser` или полный `pnpm.cmd ci:verify`. `test:catalog-browser` поднимает изолированные PostgreSQL/VersityGW, публикует только синтетический вложенный каталог и проверяет public catalog во всех пяти browser profiles без runtime-запросов к AMIGO. `test:catalog-scale` использует отдельную одноразовую PostgreSQL с `pg_stat_statements` и 2 048 синтетическими материалами для проверки bounded pagination/memory, постоянного числа public/admin/bulk SQL-операций, отсутствия temporary-block spill и атомарного bulk apply; наблюдаемые времена не объявляются production-SLA. Storage, catalog-browser и catalog-scale gates временно создают и удаляют только свои точные disposable resources; учётные данные в evidence и логи не пишутся. `pnpm.cmd dev:reset` безвозвратно удаляет только проверенные local PostgreSQL data/secrets и три проектных VersityGW named volumes; обычные `dev:stop`/`dev` и Docker restart сохраняют объекты.

Если запуск не удался, проверьте Docker Desktop, занятость loopback-портов web/metrics/PostgreSQL/S3/Admin (`3000`, `9464`, `55432`, `4569`, `4570`), точные версии runtime и журналы `.local/foundation-environment/logs`. Ручное изменение прав NTFS и bind mount object directory не требуются. Production credentials для локального запуска не нужны и использовать их запрещено.

## Текущая граница работы

Phase 1B.1 завершена по [stable plan](docs/06-plans/active/PHASE_1B1_AMIGO_CATALOG_PILOT_PLAN.md) и [completion report](docs/06-plans/completed/PHASE_1B1_AMIGO_CATALOG_PILOT_REPORT.md). Сейчас разрешена только Phase 1B.2 по [active plan](docs/06-plans/active/PHASE_1B2_FULL_AMIGO_CATALOG_PLAN.md): full public-page transport/discovery доказан dated evidence, а full local import/media/manifest/review/activation ещё выполняются. Calculation, compatibility для точного расчёта, privacy/legal production gates и production provider остаются видимыми TBD. Phase 1C+ и production deployment требуют нового письменного решения Product Owner.
