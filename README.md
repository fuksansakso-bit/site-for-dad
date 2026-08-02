# PROJECT_NAME

`PROJECT_NAME` — рабочее обозначение веб-приложения локального бизнеса по изготовлению и установке рулонных жалюзи, систем «Зебра»/«День-Ночь», горизонтальных алюминиевых и вертикальных жалюзи.

Продукт должен помочь клиенту изучить реальный ассортимент и наличие, получить предварительный расчёт для одного или нескольких окон, примерить выбранный материал на фотографии и передать результат владельцу бизнеса. Владельцу приложение должно дать единый управляемый контур каталога, цен, остатков, заявок, замеров, заказов, контента и аналитики.

## Текущая фаза

Фаза **0C — IMPLEMENTATION READINESS, MVP FREEZE AND P0 TBD TRIAGE** документально завершена 2026-08-02; исходный commit Phase 1A — `83ed7c29bfaccf5d6a0efdcaa72db8bb04660990`. `GLOBAL_SPEC.md` обновлён до 0.7.0, семь owner-decision P0 закрыты, ADR-0007–0010 приняты, а Product Owner разрешил только **Phase 1A — FOUNDATION**.

На входе Phase 1A frontend/backend foundation, база, миграции и зависимости ещё отсутствовали; import/scraping и AMIGO data не создавались. [Implementation Readiness Gate](docs/00-global/SPEC_QUALITY_GATE.md#6-implementation-readiness-gate-phase-0c) имеет статус `AUTHORIZED_FOR_PHASE_1A_FOUNDATION`. Phase 1B, бизнес-функции и production deployment не разрешены.

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
- `docs/06-plans/` содержит frozen MVP, critical-spec audit, implementation roadmap, technology evaluation и активный Phase 1A plan.

## Референсы

Правила размещения локальных референсов описаны в [reference/README.md](reference/README.md).
Внешние страницы LAYEL и Vengeance UI используются только как источники отдельных идей; их тексты, брендинг и структура не являются частью PROJECT_NAME. AMIGO является авторизованным изменяемым партнёрским источником разрешённых catalog/price/technical/media/brand assets по правилам [EXTERNAL_SOURCES.md](docs/00-global/EXTERNAL_SOURCES.md) и [ASSET_RIGHTS_REGISTER.md](docs/00-global/ASSET_RIGHTS_REGISTER.md), но не источником копируемого кода, DOM, дизайна или неподтверждённых закрытых алгоритмов.

## Статус решений

- Все неподтверждённые исходные решения собраны в `ASSUMPTIONS.md`.
- Все отсутствующие бизнес-данные и выборы имеют уникальные `TBD-*` в `OPEN_QUESTIONS.md`.
- Подтверждены срок изготовления 2–7 календарных дней, гарантия 12 месяцев с условиями, бесплатные услуги, регион, WhatsApp и начальный baseline четырёх семейств/систем.
- Подтверждены официальный партнёрский статус AMIGO, `AUTHORIZED_PARTNER_SOURCE`, permission scope каталога/цен/медиа/калькуляторной логики/бейджа и `PARTNER_LICENSE`; конкретные файлы по-прежнему проходят provenance, mapping и `PUBLICATION_APPROVED`.
- Каталожная модель динамически поддерживает все текущие и будущие source categories AMIGO; импорт не означает автоматические публикацию, наличие, расчётную готовность или возможность заказа.
- Базовая цена имеет provenance AMIGO. Owner утвердил activation roles, daily/manual cadence, staleness thresholds, parity tolerance ≤1 рубля и minimum 1500 рублей на каждую единицу изделия; реальные PriceVersion/formulas/source data по-прежнему отсутствуют и не реализуются в Phase 1A.
- Рассрочка входит в scope только как нейтральный ручной WhatsApp-сценарий; подробные условия, eligibility, порядок заявки и география остаются `TBD-INSTALLMENT-001`–`013`.
- Изображения AMIGO разрешены в партнёрском scope; hotlink, снятие водяных знаков, смена авторства и training use запрещены, а локальная публикация требует asset-level `PUBLICATION_APPROVED`.
- Окончательный бренд, хостинг и AI-провайдер не выбраны.

## Текущая разрешённая работа

Разрешена только Phase 1A Foundation по активному плану: workspace, shells, PostgreSQL/migrations, отдельный worker, storage/identity ports, observability, tests, CI и локальные инструкции. Нерешённые pricing, export, privacy и legal TBD блокируют указанные feature gates и не подменяются догадками. Import, media ingestion, бизнес-функции и Phase 1B не начинаются автоматически.
