# PROJECT_NAME

`PROJECT_NAME` — рабочее обозначение веб-приложения локального бизнеса по изготовлению и установке рулонных жалюзи, систем «Зебра»/«День-Ночь», горизонтальных алюминиевых и вертикальных жалюзи.

Продукт должен помочь клиенту изучить реальный ассортимент и наличие, получить предварительный расчёт для одного или нескольких окон, примерить выбранный материал на фотографии и передать результат владельцу бизнеса. Владельцу приложение должно дать единый управляемый контур каталога, цен, остатков, заявок, замеров, заказов, контента и аналитики.

## Текущая фаза

Фаза **1A — FOUNDATION** завершена 2026-08-02 в ветке `phase/1a-foundation` от исходного commit `83ed7c29bfaccf5d6a0efdcaa72db8bb04660990`. Принятые ADR-0007–0010 реализованы и повторно проверены: созданы workspace, минимальные web/BFF и worker shells, PostgreSQL/Prisma migration foundation, Graphile Worker, S3-compatible storage port, synthetic identity/RBAC, observability, security baseline, тесты и provider-neutral CI.

[Phase 1A Acceptance Gate](docs/00-global/SPEC_QUALITY_GATE.md#7-phase-1a-foundation-acceptance-gate) имеет статус `PASSED_PHASE_1A_FOUNDATION`. `OWNER-DECISION-010` отдельно разрешил начать только **Phase 1B.1 — AMIGO CATALOG PILOT AND LOCAL PUBLICATION LAYER** в ветке `phase/1b-amigo-catalog-pilot`. Активный план фиксирует реальный allowlist из 32 AMIGO-материалов четырёх семейств, четыре системы, bounded public-page transport и PostgreSQL-only publication layer. Phase 1B.2/1C+, полный импорт, calculation/configurator/preview/AI/cart/order/WhatsApp/account/final landing и production deployment не разрешены.

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
- `docs/06-plans/` содержит frozen MVP, critical-spec audit, implementation roadmap, technology evaluation, завершённый Phase 1A plan/report и активный [Phase 1B.1 catalog pilot plan](docs/06-plans/active/PHASE_1B1_AMIGO_CATALOG_PILOT_PLAN.md).

## Референсы

Правила размещения локальных референсов описаны в [reference/README.md](reference/README.md).
Внешние страницы LAYEL и Vengeance UI используются только как источники отдельных идей; их тексты, брендинг и структура не являются частью PROJECT_NAME. AMIGO является авторизованным изменяемым партнёрским источником разрешённых catalog/price/technical/media/brand assets по правилам [EXTERNAL_SOURCES.md](docs/00-global/EXTERNAL_SOURCES.md) и [ASSET_RIGHTS_REGISTER.md](docs/00-global/ASSET_RIGHTS_REGISTER.md), но не источником копируемого кода, DOM, дизайна или неподтверждённых закрытых алгоритмов.

## Статус решений

- Все неподтверждённые исходные решения собраны в `ASSUMPTIONS.md`.
- Все отсутствующие бизнес-данные и выборы имеют уникальные `TBD-*` в `OPEN_QUESTIONS.md`.
- Подтверждены срок изготовления 2–7 календарных дней, гарантия 12 месяцев с условиями, бесплатные услуги, регион, WhatsApp и начальный baseline четырёх семейств/систем.
- Подтверждены официальный партнёрский статус AMIGO, `AUTHORIZED_PARTNER_SOURCE`, permission scope каталога/цен/медиа/калькуляторной логики/бейджа и `PARTNER_LICENSE`; конкретные файлы по-прежнему проходят provenance, mapping и `PUBLICATION_APPROVED`.
- По `OWNER-DECISION-008` AMIGO является authority для AMIGO-origin products/materials/technical data/catalog images/base prices, а Business Owner — для local availability/visibility/price overrides/portfolio/commercial conditions. Целевая PostgreSQL-проекция хранит версии и локальные решения, image binaries остаются в object storage; фактический импорт в текущей Phase 1A не реализован.
- По `OWNER-DECISION-009` публичная часть никогда не читает AMIGO напрямую: единственным каноническим runtime-источником является активная одобренная PostgreSQL `CatalogVersion` и связанные транзакционные записи. Любое обновление проходит staged import, validation/diff, Business Owner approval и явную admin activation; auto-delete локальных данных запрещён, overrides приоритетны в публичной проекции, версии и изменения аудируются. Это не разрешает Phase 1B.
- Каталожная модель динамически поддерживает все текущие и будущие source categories AMIGO; импорт не означает автоматические публикацию, наличие, расчётную готовность или возможность заказа.
- Базовая цена имеет provenance AMIGO. Owner утвердил activation roles, daily/manual cadence, staleness thresholds, parity tolerance ≤1 рубля и minimum 1500 рублей на каждую единицу изделия; реальные PriceVersion/formulas/source data по-прежнему отсутствуют и не реализуются в Phase 1A.
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
```

`pnpm.cmd dev` одной командой поднимает loopback-only PostgreSQL, применяет reviewed migrations, запускает Graphile Worker migrations, private-by-default VersityGW buckets, web и отдельный worker. S3 API слушает `127.0.0.1:4569`, Admin API — `127.0.0.1:4570`; object data, versioning и IAM хранятся в Docker named volumes `project_name_catalog_s3_data`, `project_name_catalog_s3_versioning`, `project_name_catalog_s3_iam`, без bind mount в NTFS. Состояние и диагностические журналы находятся только в игнорируемом `.local/foundation-environment/`; credentials генерируются локально и в вывод не попадают.

Для проверки используйте `pnpm.cmd test:storage`, `pnpm.cmd check`, `pnpm.cmd test:coverage`, `pnpm.cmd test:browser` или полный `pnpm.cmd ci:verify`. Storage gate временно создаёт и удаляет свои точные containers/volumes; учётные данны в evidence и логи не пишутся. `pnpm.cmd dev:reset` безвозвратно удаляет только проверенные local PostgreSQL data/secrets и три проектных VersityGW named volumes; обычные `dev:stop`/`dev` и Docker restart сохраняют объекты.

Если запуск не удался, проверьте Docker Desktop, занятость loopback-портов web/metrics/PostgreSQL/S3/Admin (`3000`, `9464`, `55432`, `4569`, `4570`), точные версии runtime и журналы `.local/foundation-environment/logs`. Ручное изменение прав NTFS и bind mount object directory не требуются. Production credentials для локального запуска не нужны и использовать их запрещено.

## Текущая разрешённая работа

Разрешена только Phase 1B.1 по [active plan](docs/06-plans/active/PHASE_1B1_AMIGO_CATALOG_PILOT_PLAN.md): controlled real catalog import, local media, sync/diff/version/overlays и минимальные admin/public catalog surfaces. Нерешённые full-export, calculation, compatibility, privacy и legal TBD блокируют только соответствующие поздние gates и не подменяются догадками. Phase 1B.2/1C+ и production deployment не начинаются автоматически.
