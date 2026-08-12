# Реестр внешних источников PROJECT_NAME

## 0. Статус документа

| Поле | Значение |
|---|---|
| Статус | Нормативный глобальный реестр; accepted local AMIGO catalog plus Phase 2B Polza Media API contract evidence |
| Версия | 1.11.0 |
| Дата проверки источников | 2026-08-12, Europe/Moscow |
| Главный источник правды | [GLOBAL_SPEC.md](../specs/GLOBAL_SPEC.md) |
| Связанные политики | [PRICING_SOURCE_POLICY.md](PRICING_SOURCE_POLICY.md), [ASSET_RIGHTS_REGISTER.md](ASSET_RIGHTS_REGISTER.md) |

Документ регистрирует внешние изменяемые источники, подтверждённое партнёрское отношение и допустимые способы работы с ними. Он не является копией каталога AMIGO и не подтверждает существование официального публичного API; права задаются отдельным permission scope и asset-level governance.

## 1. Нормативные правила

- **EXTSRC-001 — MUST:** каждое внешнее значение хранится как версионируемый snapshot с источником, временем фиксации и статусом проверки, а не как бессрочный локальный факт.
- **EXTSRC-002 — MUST:** snapshot внешнего значения содержит `sourceId`, `sourceUrl`, `sourceEntityId` или `sourceSlug`, `sourceTitle`, `capturedAt`, `lastVerifiedAt`, `sourcePrice`, `sourceCurrency`, `sourceContext`, применимый `sourceCity`, `sourceVersion`, `localOverride`, `verificationStatus` и `administrativeComment`.
- **EXTSRC-003 — MUST:** `localOverride` хранится отдельно от исходного значения и не изменяет историю source snapshot.
- **EXTSRC-004 — MUST:** внешнее значение не становится опубликованным локальным значением до административной проверки, кроме безопасной ссылки на сам публичный источник.
- **EXTSRC-005 — MUST:** AMIGO считается `AUTHORIZED_PARTNER_SOURCE` для разрешённых каталоговых данных, систем, материалов, тканей, артикулов, названий, опубликованных характеристик, изображений, примеров изделий, предварительных цен и наблюдаемой логики пользовательского сценария калькулятора.
- **EXTSRC-006 — MUST NOT:** наличие публичной страницы трактуется как лицензия на коммерческое использование текста, фотографии, дизайна, программного кода, закрытого алгоритма или товарного знака.
- **EXTSRC-007 — MUST NOT:** запрещены обход авторизации, CAPTCHA, rate limit, ограничений доступа и обращение к закрытым интерфейсам без полномочий.
- **EXTSRC-008 — MUST:** официальный партнёрский статус подтверждён `PARTNER-001`; конкретный transport партнёрского кабинета/API/export и schema не предполагаются и остаются `TBD-SOURCE-AMIGO-002`, тогда как cadence/staleness заданы `OWNER-DECISION-005`.
- **EXTSRC-009 — MUST:** отключение или изменение AMIGO не останавливает публичный сайт PROJECT_NAME; применяются подтверждённая локальная версия, ручной процесс либо безопасное сообщение об отсутствии подтверждённых данных.
- **EXTSRC-010 — MUST:** получение, проверка, отклонение, локальная корректировка и публикация внешних данных оставляют audit trail.
- **EXTSRC-011 — MUST:** permission scope AMIGO охватывает каталог, названия, артикулы, технические сведения, цены, фотографии товаров/материалов/примеров, самостоятельное воспроизведение калькуляторной логики и партнёрский бейдж; код, DOM, закрытые API, обход доступа и training use в scope не входят.
- **EXTSRC-012 — MUST:** публичные страницы остаются изменяемыми research/acquisition endpoints даже при партнёрском статусе; `AUTHORIZED_PARTNER_SOURCE` не делает их URL, структуру или iframe постоянными.
- **EXTSRC-013 — MUST:** будущая проверка обновлений выполняется автоматически раз в сутки и вручную администратором; после 7 дней показывается `STALE_WARNING`, а возраст более 30 дней требует admin verification до публикации изменённой цены или нового товара.
- **EXTSRC-014 — MUST:** по `OWNER-DECISION-008` AMIGO является upstream authority для AMIGO-origin products, materials, technical data, catalog images и base prices; capture/normalization MAY менять представление, но MUST NOT менять их бизнес-смысл без новой source version/evidence.
- **EXTSRC-015 — MUST:** локальная PostgreSQL-проекция хранит source snapshots и решения Business Owner, но AMIGO sync MUST NOT перезаписывать local availability, local visibility/publication, local price overrides, local portfolio или commercial conditions. Эти поля имеют отдельные provenance, версии и audit.
- **EXTSRC-016 — MUST:** по `OWNER-DECISION-009` AMIGO является только upstream acquisition source, а не public-serving runtime source. Catalog/search/filter/configurator/calculation/lead/analytics flows MUST использовать активную одобренную PostgreSQL `CatalogVersion` и связанные транзакционные записи; raw/staging/rejected data публично не читаются.
- **EXTSRC-017 — MUST:** AMIGO addition/change/removal сначала создаёт immutable capture, staged candidate и diff. Source removal MUST NOT автоматически удалять, скрывать или архивировать локальные сущности, local-only data, Business Owner overlays или историю.
- **EXTSRC-018 — MUST:** опубликованная локальная версия требует Business Owner approval и явной administrator activation; applicable local overrides имеют приоритет только в composed public projection и не меняют source snapshot.
- **EXTSRC-019 — MUST:** каждая `CatalogVersion` хранит timestamp и source/source-version manifest, а capture/import/validation/diff/override/approval/activation/rejection/rollback/projection rebuild оставляют audit trail.
- **EXTSRC-020 — MUST:** в Phase 1B.1 выбран только owner-authorized public-page transport четырёх явных `shop.amigo.ru` material paths из dated transport discovery: concurrency `1`, bounded rate/backoff/timeout/redirects, descriptive user agent, HTTPS/host/path allowlist, без cookies/login/CAPTCHA/search/filter/action/Bitrix endpoints. Нормализация ограничена 32-ID manifest; это решение не доказывает официальный API/export и не разрешает полный crawl/import.
- **EXTSRC-021 — MUST:** `OWNER-DECISION-012` разрешает Phase 1B.2 расширить существующий adapter до полного доступного разрешённого catalog discovery. Каждый обнаруженный category/page path MUST сначала пройти HTTPS host/path classification, access/CAPTCHA/identity/parser preflight и затем войти в dated allowlist/manifest; concurrency, rate, timeout, retry/backoff/jitter, redirects, payload limits, checkpoint/resume/cancellation и graceful shutdown остаются bounded и диагностируемыми.
- **EXTSRC-022 — MUST:** full catalog semantic source version строится из сортированных безопасных распознанных category/system/model/material facts при pinned parser/mapping versions. Raw HTML hash MAY оставаться capture evidence, но scripts, cookies, form/CAPTCHA/session tokens, персональные данные и capture timestamp MUST NOT попадать в safe snapshot или создавать ложную новую catalog version.
- **EXTSRC-023 — MUST:** full discovery MUST сохранять все обнаруженные категории и честно учитывать failures/skips/duplicates/source-removed/checksums в manifest. Нераспознанная массовая структура, credential/login/CAPTCHA, technical refusal, нестабильная identity, дубликаты или невозможность доказать coverage являются stop condition; частичный результат MUST NOT называться полным каталогом.
- **EXTSRC-024 — MUST:** Phase 1C pricing evidence uses dated, hash-identified, low-rate public calculator input/output captures only for independently implemented parity rules. Public runtime MUST use committed/activated PostgreSQL rules and MUST NOT call the observed customizer endpoint during a client calculation.
- **EXTSRC-025 — MUST:** Polza AI is an external media processor/API provider, not a catalog, price, rights or product authority. Phase 2B uses only the official Media API create/status contract and the server-configured model registry ID verified on 2026-08-12.
- **EXTSRC-026 — MUST:** Polza transport uses authenticated `POST /api/v1/media` and `GET /api/v1/media/{id}` through the server adapter; exact current fields are `model`, `input.prompt`, ordered `input.images[{type,data}]`, supported generation fields, `async` and pseudonymous `user`. Raw provider JSON/usage/reasoning/warnings/content are not product records.
- **EXTSRC-027 — MUST:** a Polza `data.url` is a temporary acquisition locator only. PROJECT_NAME validates and imports result bytes into private Supabase Storage, never publishes or stores the provider URL as the client result.
- **EXTSRC-028 — MUST:** Polza documentation/model availability and contract terms are mutable external facts; provider/model changes require re-verification, tests and when product/security/privacy boundaries change a superseding ADR. Public documentation MUST NOT be treated as proof of no-training, retention, region, DPA or subprocessors.

## 2. Модель внешнего значения

| Поле | Смысл и правило |
|---|---|
| `sourceId` | Стабильный ID из реестра ниже. MUST существовать до принятия значения. |
| `sourceUrl` | Канонический публичный URL либо разрешённый URL партнёрского источника. |
| `sourceEntityId` / `sourceSlug` | Идентификатор или slug сущности у источника; хотя бы одно поле MUST быть заполнено, если оно опубликовано. |
| `sourceTitle` | Название так, как оно было опубликовано источником в момент snapshot. |
| `capturedAt` | Дата и время фиксации значения. Не равно дате публикации источником. |
| `lastVerifiedAt` | Последняя ручная или разрешённая автоматизированная проверка конкретного значения. |
| `sourcePrice` | Исходная числовая цена; nullable, если значение не является ценой. |
| `sourceCurrency` | Валюта исходной цены; nullable вместе с `sourcePrice`, но не угадывается. |
| `sourceContext` | Семейство, система, материал, размеры, опции и иной контекст, без которого значение неоднозначно. |
| `sourceCity` | Город/регион выбранного на внешнем сайте контекста; nullable только когда к значению не применим регион. |
| `sourceVersion` | Внутренне назначенная неизменяемая версия snapshot или версия поставщика, если она опубликована. |
| `localOverride` | Отдельное локальное значение с причиной, автором, временем и областью действия; nullable. |
| `verificationStatus` | `UNVERIFIED`, `RESEARCH_CAPTURED`, `ADMIN_VERIFIED`, `STALE` или `REJECTED`. |
| `administrativeComment` | Непубличное объяснение проверки, ограничения или override; без секретов и персональных данных. |

Карточка `PartnerRelationship` дополнительно содержит `partnerStatus`, `partnerName`, `partnerRegion`, `partnerBadgeAsset`, `permissionScope`, `permissionConfirmedByOwner`, `permissionRecordedAt`, nullable `optionalEvidenceReference` и `brandUsageNotes`.

`capturedAt` и `lastVerifiedAt` не подменяют друг друга. Повторная проверка MAY подтвердить прежнее значение, но изменение источника MUST создавать новую версию, если влияет на каталог, совместимость, цену или публикацию.

## 3. Общий статус AMIGO

| Атрибут | Значение |
|---|---|
| Организация | AMIGO; публичный интернет-магазин `shop.amigo.ru` |
| Статус отношения | `AUTHORIZED_PARTNER_SOURCE`; официальный партнёрский статус подтверждён владельцем |
| Наблюдаемый access method | Controlled public catalog pages: Phase 1B.2 capture 2026-08-03 прошёл 114 safe paths, обнаружил 28 categories/56 systems/9 models/1655 variants при 0 failures. Partner export/API не подтверждён до отдельного доказательства |
| Надёжность | Первичный публичный источник для того, что опубликовано на конкретной странице; не гарантирует локальную применимость, наличие или неизменность |
| Изменяемость | Высокая: ассортимент, названия, цены, город, условия и структура страниц могут изменяться без уведомления PROJECT_NAME |
| Правовое/договорное основание | `PARTNER_LICENSE`, подтверждённое владельцем бизнеса 2026-08-02; копия evidence reference необязательна для документирования |
| Разрешение на изображения | `PARTNER_LICENSE`; локальный файл в подтверждённом scope публикуется при asset record `PUBLICATION_APPROVED` |
| Базовый способ обновления | Предпочтение: partner API/export/file; доказанный Phase 1B.2 fallback: существующий public-page adapter, dynamic dated path/entity manifest, semantic version и stop conditions |
| Базовый fallback | Последняя подтверждённая локальная версия, ручная проверка менеджера либо нейтральное сообщение без выдуманного значения |
| Разделение authority и serving | AMIGO определяет AMIGO-origin source fields; Business Owner определяет локальные availability/visibility/override/portfolio/commercial fields; активная одобренная PostgreSQL `CatalogVersion` является единственным public-serving source, не новым upstream source |

## 4. Зарегистрированные страницы

### SOURCE-AMIGO-HOME-001

| Поле | Значение |
|---|---|
| Организация | AMIGO |
| URL | https://shop.amigo.ru/ |
| Назначение | Точка входа, публичная навигация и общий обзор направлений |
| Разрешённые данные | Название источника, публичные ссылки, обзор существующих у AMIGO направлений и контекст страниц |
| Запрещённые данные/действия | Автоматическая активация всех направлений AMIGO; копирование маркетинговых текстов, дизайна, фото, московских услуг и акций |
| Статус доступа | `PUBLIC_WEB_RESEARCH_ONLY`; страница доступна при ручной проверке |
| Последняя проверка | 2026-08-08; Grozny context; source version `amigo-public-calculator-2026-08-08-9f9246330385` |
| Надёжность | Средняя для навигации; коммерческие значения требуют отдельного snapshot и проверки |
| Изменяемость | Высокая |
| Юридический статус | `AUTHORIZED_PARTNER_SOURCE`; использование разрешённых данных и медиа ограничено `permissionScope` |
| Изображения | `PARTNER_LICENSE`; локальная публикация только через `PUBLICATION_APPROVED` asset record |
| Обновление | Ручная проверка до использования новых направлений или ссылок |
| Fallback | Последняя опубликованная локальная taxonomy; новые source categories остаются review/hidden до решения владельца |
| Связанные требования | `EXTSRC-001`–`010`, `FR-CATALOG-012`, `FR-CATALOG-013` |

### SOURCE-AMIGO-CATALOG-001

| Поле | Значение |
|---|---|
| Организация | AMIGO |
| URL | https://shop.amigo.ru/catalog/ |
| Назначение | Исследование систем, материалов, тканей, артикулов, названий, характеристик и preliminary price references |
| Разрешённые данные | Публичные факты каталога, source slug/ID, артикул, название, характеристика, цена в полном контексте, URL изображения как reference |
| Запрещённые данные/действия | Массовое копирование каталога или фото; hotlink; публикация без проверки; активация неподтверждённых семейств |
| Статус доступа | `PUBLIC_WEB_RESEARCH_ONLY`; страница доступна при ручной проверке, отдельные действия могут требовать CAPTCHA |
| Последняя проверка | 2026-08-02 |
| Надёжность | Средняя: первичный публичный каталог, но локальная совместимость и наличие не гарантированы |
| Изменяемость | Высокая |
| Юридический статус | `AUTHORIZED_PARTNER_SOURCE`; разрешены каталог, названия, артикулы, технические сведения, цены и согласованные media categories |
| Изображения | `PARTNER_LICENSE`; локальная публикация только через `PUBLICATION_APPROVED` asset record |
| Обновление | Предпочтительно разрешённая выгрузка; иначе проверенный ручной snapshot |
| Fallback | Локально подтверждённые каталожные записи; непроверенное скрывается |
| Связанные требования | `EXTSRC-001`–`010`, `FR-MATERIAL-009`–`012`, `ASSET-004`–`006` |

### SOURCE-AMIGO-CALCULATOR-001

| Поле | Значение |
|---|---|
| Организация | AMIGO |
| URL | https://shop.amigo.ru/calculator/ |
| Назначение | Исследование пользовательского сценария, коммерчески необходимых входов и контрольных preliminary price quotes |
| Разрешённые данные | Наблюдаемые публичные входные параметры и результат в полном контексте для ручной parity matrix |
| Запрещённые данные/действия | Копирование кода, сетевых API, дизайна или закрытых алгоритмов; обход CAPTCHA/авторизации/ограничений |
| Статус доступа | `PUBLIC_WEB_RESEARCH_ONLY`; страница доступна при ручной проверке |
| Последняя проверка | 2026-08-02 |
| Надёжность | Средняя для контрольного результата конкретной даты/города; не постоянный прайс |
| Изменяемость | Очень высокая |
| Юридический статус | Разрешено самостоятельно воспроизводить калькуляторную логику по авторизованным данным; code/DOM/closed API не копируются |
| Изображения | В пределах `PARTNER_LICENSE`; price parity не требует скачивания media |
| Обновление | Ручные контрольные расчёты либо разрешённый партнёрский канал |
| Fallback | Локальная подтверждённая price version или Manual Quote |
| Связанные требования | `PRICING-SOURCE-001`–`007`, `PRICING-TEST-001`, `NFR-TEST-001` |

### SOURCE-AMIGO-ROLLER-001

| Поле | Значение |
|---|---|
| Организация | AMIGO |
| URL | https://shop.amigo.ru/rulonnye-shtory/ |
| Назначение | Исследование подтверждённого семейства рулонных жалюзи |
| Разрешённые данные | Системы в allowlist владельца, материалы, артикулы, опубликованные характеристики, reference URL и contextual price snapshot |
| Запрещённые данные/действия | Фото/тексты для публикации без права; неразрешённые системы; скрытые интерфейсы |
| Статус доступа | `PUBLIC_WEB_RESEARCH_ONLY`; страница доступна при ручной проверке |
| Последняя проверка | 2026-08-02 |
| Надёжность | Средняя до локальной проверки совместимости и цены |
| Изменяемость | Высокая |
| Юридический статус | `AUTHORIZED_PARTNER_SOURCE` в пределах `permissionScope` |
| Изображения | `PARTNER_LICENSE`; локальная публикация только через `PUBLICATION_APPROVED` asset record |
| Обновление | Разрешённая выгрузка или проверенный snapshot по сущности |
| Fallback | Опубликованная локальная версия каталога; иначе позиция скрыта/требует менеджера |
| Связанные требования | `FR-CATALOG-001`, `FR-CATALOG-014`, `FR-MATERIAL-009`–`012` |

### SOURCE-AMIGO-ZEBRA-001

| Поле | Значение |
|---|---|
| Организация | AMIGO |
| URL | https://shop.amigo.ru/rulonnye-shtory-zebra/ |
| Назначение | Исследование подтверждённого семейства «Зебра» / «День-Ночь» |
| Разрешённые данные | Подтверждённые модели, материалы, артикулы, опубликованные параметры полос/прозрачности, reference URL и contextual price snapshot |
| Запрещённые данные/действия | Фото/тексты для публикации без права; вывод неизвестных физических параметров из изображения |
| Статус доступа | `PUBLIC_WEB_RESEARCH_ONLY`; страница доступна при ручной проверке |
| Последняя проверка | 2026-08-02 |
| Надёжность | Средняя до проверки конкретного артикула и совместимости |
| Изменяемость | Высокая |
| Юридический статус | `AUTHORIZED_PARTNER_SOURCE` в пределах `permissionScope` |
| Изображения | `PARTNER_LICENSE`; локальная публикация только через `PUBLICATION_APPROVED` asset record |
| Обновление | Разрешённая выгрузка или проверенный snapshot по сущности |
| Fallback | Опубликованная локальная версия; неизвестный параметр не угадывается |
| Связанные требования | `FR-CATALOG-011`, `FR-CATALOG-014`, `FR-MATERIAL-009`–`012` |

### SOURCE-AMIGO-HORIZONTAL-001

| Поле | Значение |
|---|---|
| Организация | AMIGO |
| URL | https://shop.amigo.ru/gorizontalnye-alyuminievye-zhalyuzi/ |
| Назначение | Исследование подтверждённого семейства горизонтальных алюминиевых жалюзи |
| Разрешённые данные | Подтверждённые размеры/формы ленты, материалы, цвета, артикулы, характеристики, reference URL и contextual price snapshot |
| Запрещённые данные/действия | Активация деревянных и иных горизонтальных семейств; фото/тексты без права |
| Статус доступа | `PUBLIC_WEB_RESEARCH_ONLY`; страница доступна при ручной проверке |
| Последняя проверка | 2026-08-02 |
| Надёжность | Средняя до локальной технической и ценовой проверки |
| Изменяемость | Высокая |
| Юридический статус | `AUTHORIZED_PARTNER_SOURCE` в пределах `permissionScope` |
| Изображения | `PARTNER_LICENSE`; локальная публикация только через `PUBLICATION_APPROVED` asset record |
| Обновление | Разрешённая выгрузка или проверенный snapshot по сущности |
| Fallback | Локальный allowlist лент 16/25/50 мм и «Волна» 35 мм; неизвестное требует менеджера |
| Связанные требования | `FR-CATALOG-002`, `FR-CATALOG-014`, `FR-MATERIAL-009`–`012` |

### SOURCE-AMIGO-VERTICAL-001

| Поле | Значение |
|---|---|
| Организация | AMIGO |
| URL | https://shop.amigo.ru/vertikalnye-zhalyuzi/ |
| Назначение | Исследование подтверждённого семейства вертикальных жалюзи |
| Разрешённые данные | Тканевые, «Бриз», пластиковые, алюминиевые и мультифактурные каталожные сущности, материалы, артикулы, характеристики, reference URL и contextual price snapshot |
| Запрещённые данные/действия | Автоматическая активация иных семейств; фото/тексты без права; вывод неизвестной ширины ламели |
| Статус доступа | `PUBLIC_WEB_RESEARCH_ONLY`; страница доступна при ручной проверке |
| Последняя проверка | 2026-08-02 |
| Надёжность | Средняя до локальной технической и ценовой проверки |
| Изменяемость | Высокая |
| Юридический статус | `AUTHORIZED_PARTNER_SOURCE` в пределах `permissionScope` |
| Изображения | `PARTNER_LICENSE`; локальная публикация только через `PUBLICATION_APPROVED` asset record |
| Обновление | Разрешённая выгрузка или проверенный snapshot по сущности |
| Fallback | Локальный allowlist подтверждённых типов; неизвестный параметр требует проверки |
| Связанные требования | `FR-CATALOG-003`, `FR-CATALOG-014`, `FR-MATERIAL-009`–`012` |

### SOURCE-AMIGO-PAYMENTS-001

| Поле | Значение |
|---|---|
| Организация | AMIGO |
| URL | https://shop.amigo.ru/payments/ |
| Назначение | Исследование наблюдаемого процесса заказа и клиентских переходов |
| Разрешённые данные | Наблюдаемые шаги выбора, замера, подтверждения материалов/фурнитуры, расчёта/договора и монтажа как parity evidence |
| Запрещённые данные/действия | Перенос московских контактов, юридических текстов, оплаты, обещаний и дизайна в локальный процесс |
| Статус доступа | Публичная страница; `AUTHORIZED_PARTNER_SOURCE` для разрешённых фактов |
| Последняя проверка | 2026-08-02 |
| Надёжность | Средняя: описывает AMIGO, но локальный workflow утверждается владельцем PROJECT_NAME |
| Изменяемость | Высокая |
| Юридический статус | Партнёрское использование фактов в пределах `permissionScope`; тексты не копируются |
| Изображения | `PARTNER_LICENSE`; asset-level publication rules сохраняются |
| Обновление | Ручная parity-проверка при изменении order flow |
| Fallback | Локальный `QUOTES_ORDERS_SPEC` и WhatsApp flow |
| Связанные требования | `AMIGO-PARITY-001`–`005`, `FR-CART-001`–`007`, `FR-ORDER-*` |

### SOURCE-AMIGO-SERVICES-001

| Поле | Значение |
|---|---|
| Организация | AMIGO |
| URL | https://shop.amigo.ru/services/ |
| Назначение | Исследование структуры описания замера, доставки и монтажа |
| Разрешённые данные | Названия и общая последовательность услуг как parity evidence |
| Запрещённые данные/действия | Перенос московских тарифов, географии, сроков, контактов или условий в Чеченскую Республику |
| Статус доступа | Публичная страница; `AUTHORIZED_PARTNER_SOURCE` для разрешённых фактов |
| Последняя проверка | 2026-08-02 |
| Надёжность | Высокая для текущего AMIGO-текста, низкая для локальных условий PROJECT_NAME |
| Изменяемость | Высокая |
| Юридический статус | Партнёрское использование фактов; локальные business facts имеют высший приоритет |
| Изображения | Не требуются для локального правила бесплатных услуг |
| Обновление | Точечная проверка только для parity; локальные услуги не синхронизируются с AMIGO |
| Fallback | `BUSINESS-FREE-SERVICES-001` и локальные service lines |
| Связанные требования | `FR-CALC-014/015`, `PRICING-LOCAL-002/003` |

### SOURCE-AMIGO-PROJECTS-001

| Поле | Значение |
|---|---|
| Организация | AMIGO |
| URL | https://shop.amigo.ru/projects/ |
| Назначение | Примеры изделий и интерьеров AMIGO, разрешённые для обозначенного партнёрского использования |
| Разрешённые данные | Названия, типы изделий, фотографии примеров и provenance в пределах `PARTNER-002` |
| Запрещённые данные/действия | Выдавать изображения за «Наши работы», менять авторство, удалять водяные знаки или использовать как training data |
| Статус доступа | Публичная страница; `AUTHORIZED_PARTNER_SOURCE` |
| Последняя проверка | 2026-08-02 |
| Надёжность | Средняя; связь конкретного изображения с системой/материалом требует asset mapping |
| Изменяемость | Высокая |
| Юридический статус | `PARTNER_LICENSE` |
| Изображения | Допустимы подписи «Пример оформления», «Изображение из каталога AMIGO», «Доступный вариант», «Пример в интерьере» после `PUBLICATION_APPROVED` |
| Обновление | Версионируемый asset inventory и hash comparison после утверждения import process |
| Fallback | Не показывать AMIGO-пример; использовать approved local portfolio или стандартную сцену |
| Связанные требования | `PARTNER-002/003`, `FR-PORTFOLIO-007`, `ASSET-006` |

### SOURCE-AMIGO-ROLLER-MATERIALS-001

| Поле | Значение |
|---|---|
| Организация | AMIGO |
| URL | https://shop.amigo.ru/rulonnye-shtory1436/rulonnye-tkani4321/ |
| Назначение | Фактический inventory рулонных тканей, свойств, фильтров, source price categories и contextual «от» цен |
| Разрешённые данные | Названия, артикулы/цветовые коды, свойства, фильтры, категории `E`, `1`–`5`, price-on-request, цены и разрешённые изображения |
| Запрещённые данные/действия | Считать видимый список полным вечным каталогом; использовать «от» цену как точный quote; выводить свойства из изображения |
| Статус доступа | Публичная страница; `AUTHORIZED_PARTNER_SOURCE` |
| Последняя проверка | 2026-08-02 |
| Надёжность | Средняя до snapshot, mapping и административной проверки |
| Изменяемость | Очень высокая |
| Юридический статус | `PARTNER_LICENSE` |
| Изображения | Локальный import и публикация разрешены в scope через asset record `PUBLICATION_APPROVED` |
| Обновление | Разрешённый export/import либо проверенный entity snapshot; pagination не обходится скриптом в 0A.1 |
| Fallback | Последняя активная локальная версия или скрытие/Manual Review |
| Связанные требования | `FR-MATERIAL-009`–`014`, `FR-CATALOG-020`, `PRICING-SNAPSHOT-*` |

### SOURCE-AMIGO-ZEBRA-MATERIALS-001

| Поле | Значение |
|---|---|
| Организация | AMIGO |
| URL | https://shop.amigo.ru/rulonnye-shtory-zebra/rulonnye-tkani-zebra/ |
| Назначение | Фактический inventory Zebra-тканей, свойств, фильтров и source price categories |
| Разрешённые данные | Названия, коды, свойства, категории `E`, `0`–`3`, цены, price-on-request и разрешённые изображения |
| Запрещённые данные/действия | Превращать набор категорий конкретной страницы в глобальный enum или угадывать параметры полос |
| Статус доступа | Публичная страница; `AUTHORIZED_PARTNER_SOURCE` |
| Последняя проверка | 2026-08-02 |
| Надёжность | Средняя до snapshot, mapping и административной проверки |
| Изменяемость | Очень высокая |
| Юридический статус | `PARTNER_LICENSE` |
| Изображения | Локальный import и публикация разрешены в scope через asset record `PUBLICATION_APPROVED` |
| Обновление | Разрешённый export/import либо проверенный entity snapshot |
| Fallback | Последняя активная локальная версия или скрытие/Manual Review |
| Связанные требования | `FR-MATERIAL-007/009`–`014`, `FR-CATALOG-020`, `FR-STANDARD-PREVIEW-004` |

### SOURCE-AMIGO-HORIZONTAL-CATEGORY-001

| Поле | Значение |
|---|---|
| Организация | AMIGO |
| URL | https://shop.amigo.ru/gorizontalnye-zhalyuzi/ |
| Назначение | Навигационный источник горизонтальных алюминиевых и деревянных направлений |
| Разрешённые данные | Source taxonomy, ссылки, названия и наблюдаемые различия направлений |
| Запрещённые данные/действия | Смешивать алюминиевые и деревянные изделия в один материал/семейство или автоматически публиковать оба |
| Статус доступа | Публичная страница; `AUTHORIZED_PARTNER_SOURCE` |
| Последняя проверка | 2026-08-02 |
| Надёжность | Средняя для taxonomy |
| Изменяемость | Высокая |
| Юридический статус | Партнёрское использование фактов в пределах scope |
| Изображения | `PARTNER_LICENSE`; asset-level mapping обязателен |
| Обновление | При изменении source taxonomy |
| Fallback | Локальная нормализованная taxonomy и сохранённые source links |
| Связанные требования | `FR-CATALOG-014`–`020` |

### SOURCE-AMIGO-HORIZONTAL-WOOD-001

| Поле | Значение |
|---|---|
| Организация | AMIGO |
| URL | https://shop.amigo.ru/gorizontalnye-derevyannye-zhalyuzi/ |
| Назначение | Source inventory и свойства деревянных горизонтальных жалюзи |
| Разрешённые данные | Системы, материалы, названия, характеристики, цены и разрешённые изображения |
| Запрещённые данные/действия | Считать наличие на AMIGO локальным наличием или автоматически активировать расчёт/заказ |
| Статус доступа | Публичная страница; `AUTHORIZED_PARTNER_SOURCE` |
| Последняя проверка | 2026-08-02 |
| Надёжность | Средняя до локальной технической и ценовой проверки |
| Изменяемость | Высокая |
| Юридический статус | `PARTNER_LICENSE` |
| Изображения | Локальная публикация через `PUBLICATION_APPROVED` asset record |
| Обновление | Разрешённый export/import либо entity snapshot |
| Fallback | Source entity остаётся hidden/manual до локальной готовности |
| Связанные требования | `FR-CATALOG-004`, `FR-CATALOG-013`, `FR-CATALOG-019` |

### SOURCE-AMIGO-CUSTOMIZER-001

| Поле | Значение |
|---|---|
| Организация | AMIGO |
| URL | `https://80bcbf2544d2118d6c1ffc708b32c673.customizer.amigo.ru/` — re-observed 2026-08-08; volatile, не канонический постоянный URL |
| Назначение | Наблюдение functional parity, category/system hierarchy, шагов Size → Material → Options, preview и cart entry |
| Разрешённые данные | Наблюдаемые labels, states, flows, validation outcomes и контрольные quotes в авторизованном scope |
| Запрещённые данные/действия | iframe как основное решение; копирование DOM/code/network API/закрытого алгоритма; обход login/CAPTCHA/rate limits |
| Статус доступа | Публичный JavaScript customizer, подключённый calculator iframe; `AUTHORIZED_PARTNER_SOURCE` |
| Последняя проверка | 2026-08-08 во встроенном браузере; normalized evidence in `AMIGO_PRICING_VERIFICATION_2026-08-08.md` |
| Надёжность | Высокая для наблюдаемого UI на дату; URL и поведение очень изменяемы |
| Изменяемость | Очень высокая |
| Юридический статус | Разрешено воспроизвести бизнес-логику самостоятельно; реализация AMIGO не копируется |
| Изображения | Наблюдаемый preview; import media регулируется `PARTNER_LICENSE` и asset registry |
| Обновление | Всегда повторно обнаруживать iframe с calculator page; не хардкодить текущий hostname как постоянный |
| Fallback | Документированная parity snapshot и локальный собственный configurator |
| Связанные требования | `AMIGO-PARITY-001`–`005`, `AMIGO-SYNC-001`–`006`, `FR-CONFIG-*` |

### SOURCE-AMIGO-PREVIEW-ASSETS-001

| Поле | Значение |
|---|---|
| Организация | AMIGO |
| URL | `https://94467d4a238359fbf34ad21ca461e711.customizer.amigo.ru/storage-new/` exact paths recorded per asset in `assets/preview/manifest.json`; volatile acquisition host, never runtime authority |
| Назначение | Phase 1D photoreal demonstration scenes and exact product/system visualization layers for four validated configuration scopes |
| Разрешённые данные | Two interior backgrounds, Roller/Zebra/horizontal/vertical material/system PNG layers explicitly requested and permitted by the Product Owner under partner relationship |
| Запрещённые данные/действия | Runtime hotlink, arbitrary crawling, frontend code/DOM copying, credentials, watermark removal, authorship change, customer-photo/AI/training use |
| Статус доступа | `AUTHORIZED_PARTNER_SOURCE`; `OWNER-DECISION-015`; locally mirrored and checksum-bound |
| Последняя проверка | 2026-08-08; 1500×937 PNG, local manifest/storage/browser integrity passed |
| Изменяемость | Высокая upstream; immutable local hash/version used by runtime |
| Fallback | Honest `NORMALIZED_COLOR_ONLY` disclosure or `PREVIEW_UNAVAILABLE`; never remote request/random material |
| Связанные требования | `STD-PREV-003/004/017`, `MEDIA-PIPE-013`, `ASSET-005/013/016`, `QG-285`–`289` |

### SOURCE-POLZA-MEDIA-API-001

| Поле | Значение |
|---|---|
| Организация | Polza AI |
| URL | `https://polza.ai/docs/api-reference/media/create`, `https://polza.ai/docs/api-reference/media/status`, `https://polza.ai/models/google/gemini-3.1-flash-image` |
| Назначение | Phase 2B asynchronous image-editing transport and selected model registry evidence |
| Разрешённые данные | Documented request/response fields, status names, model ID and short-lived private image grants after consent |
| Запрещённые данные/действия | Contact/order/staff data, credentials, service-role key, arbitrary URLs, raw response logging, price/catalog authority, training claim or permanent provider URL dependency |
| Статус доступа | Public official documentation; authenticated API requires server-only `POLZA_AI_API_KEY` |
| Последняя проверка | 2026-08-12; Media create/status pages crawled same day and model page identified `google/gemini-3.1-flash-image` |
| Надёжность | High for the documented API shape on capture date; live behavior unverified without a key |
| Изменяемость | High; API/model availability and pricing/policies may change |
| Юридический статус | Technical API selection accepted by `OWNER-DECISION-023`; DPA/subprocessor/region/training/retention evidence remains `TBD-AI-007`, `TBD-PRIV-005`, `TBD-INFRA-004` |
| Изображения | Window/material sent by short-lived signed URL; result copied immediately to private project storage |
| Обновление | Re-read official create/status/model documentation and contract tests before model/provider rollout |
| Fallback | Disable AI; catalog, calculator, cart, request and WhatsApp remain available |
| Связанные требования | `P2B-AI-005`–`010`, `AI-PIPE-021`–`029`, ADR-0014 |

## 5. Границы ассортимента при обновлении

Импорт или ручная фиксация данных MAY регистрировать любую текущую или будущую категорию AMIGO без изменения программного кода ядра. Наличие сущности на странице AMIGO не активирует локальную публикацию, наличие, pricing readiness, visualizer support или orderability. Эти состояния управляются независимо; сложные категории MAY оставаться `POST_MVP_CANDIDATE` для отдельных функций.

Для AMIGO-origin записи импортируемый набор полей делится до normalization: source-owned поля обновляются только новой доказуемой AMIGO-версией, local-owned поля — только решением Business Owner через локальный audited workflow. Конфликт source/local ownership блокирует affected activation; импорт не использует last-write-wins. Любое изменение сначала попадает в staged candidate и diff, затем получает Business Owner approval и explicit administrator activation точной immutable `CatalogVersion`. Applicable local override имеет приоритет в публичной проекции, не меняя source fact. Catalog/media metadata хранится в PostgreSQL, а разрешённые image binaries — в object storage по `ASSET_RIGHTS_REGISTER` и media specs.

Удаление или исчезновение сущности у AMIGO создаёт source tombstone/removal difference. Оно не запускает автоматическое удаление, скрытие или архивирование локальной сущности, local-only записи, Business Owner overlay или исторической ссылки. Публичные search/filter/cache/analytics projections строятся только из активной `CatalogVersion`, содержат её ID и могут быть пересозданы; они не являются отдельным acquisition channel.

## 6. Решения, которых документ не принимает

- Не утверждается наличие у AMIGO официального публичного API.
- Подтверждён официальный партнёрский статус и permission scope из `PARTNER-001`–`007`; документ не расширяет его на code/DOM/closed API, training use или неразрешённые модификации.
- Не утверждаются конкретный partner API/export format, его schema или credentials до отдельного доказательства.
- Cadence/staleness зафиксированы `OWNER-DECISION-005`; dated Phase 1B.2 discovery доказал full-catalog public-page fallback для текущего доступного каталога, но official partner API/export всё ещё остаётся открытым аспектом `TBD-SOURCE-AMIGO-002` до отдельного доказательства.
- Dated Phase 1C calculator snapshot is explicitly scoped to the visible Grozny context; it is not silently generalized to another city or future source version.
- Phase 1B.1 создал frozen 32-ID pilot; Phase 1B.2 accepted run `7d19a6e8-abcc-4bc6-a180-c0a5b59e17d6` использовал parser/mapping `2.0.1`, semantic source version `sha256:3cf971b0aabe17091ef0804e8d8368fb37182939533a4eef8ee4346f4c59711d` и `COMPLETE` manifest checksum `ea1b2a3148efa6bd1be9a41a8dba8c21e1a4bada1c728fe262047a0b0f52579e`.
- Completion evidence закрывает current public-page inventory aspect `TBD-ASSORT-002`: 114 pages, 28 categories, 56 systems, 9 models, 1 655 variants, 3 053 typed media references and 1 664 price records imported and manually activated. `TBD-SOURCE-AMIGO-002` остаётся открыт только для official partner API/export/file/schema, если такой канал существует.
- `OWNER-DECISION-009` вместе с Phase 1B.2 completion report доказывает фактический import batch, активные CatalogVersion/PriceVersion v2 и готовые approved local assets; оно по-прежнему не превращает snapshot в вечный факт и не доказывает official export.

## 7. История изменений

| Версия | Дата | Изменение |
|---|---|---|
| 1.2.0 | 2026-08-02 | Зафиксированы authorized partner source, daily/manual cadence, staleness и Phase 1A acquisition boundary. |
| 1.3.0 | 2026-08-02 | По `OWNER-DECISION-008` добавлено field-level authority и разделение PostgreSQL operational projection/object-storage media при сохранении import/transport TBD. |
| 1.4.0 | 2026-08-02 | По `OWNER-DECISION-009` AMIGO отделён от единственного PostgreSQL public-serving source; добавлены staged diff, Business Owner/admin activation, no-auto-delete, override precedence, audit и source/timestamp `CatalogVersion`. |
| 1.5.0 | 2026-08-02 | `OWNER-DECISION-010` разрешил bounded public-page transport только для Phase 1B.1; зафиксированы четыре paths, 32-ID manifest, concurrency/rate/security controls и сохранён full-catalog export TBD. |
| 1.6.0 | 2026-08-03 | `OWNER-DECISION-012` разрешил controlled full-catalog discovery через расширение existing adapter с path/entity manifest, bounded load/resume и честными stop/coverage conditions; official API/export не предполагается. |
| 1.7.0 | 2026-08-03 | Зафиксирован успешный dated full public-page discovery: 114 safe pages, 28 categories, 56 systems, 9 models, 1655 variants, 0 failures, semantic source hash и explicit warning/zero-price behavior; official export и import/activation gates сохранены. |
| 1.8.0 | 2026-08-04 | Зафиксированы accepted full manifest/import, active CatalogVersion/PriceVersion v2, 1 655 variants, 2 818 approved local objects, no-op/restart evidence и закрытие current inventory aspect; official partner API/export/file/schema остаётся открытым. |
| 1.9.0 | 2026-08-08 | Added hash/versioned Grozny-context public calculator verification for Phase 1C, four bounded MVP rule scopes and an explicit no-live-AMIGO runtime boundary. |
| 1.10.0 | 2026-08-08 | Registered the exact Phase 1D customizer scene/product asset paths, owner-confirmed partner permission, checksum-bound local serving and no-runtime-hotlink/code-copy boundary. |
| 1.11.0 | 2026-08-12 | Registered Polza AI Media create/status/model documentation for Phase 2B, exact mutable transport boundary, temporary result import and explicit non-evidence for provider legal/privacy claims. |
