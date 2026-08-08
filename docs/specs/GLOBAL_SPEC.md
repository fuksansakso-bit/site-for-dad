# PROJECT_NAME — глобальная спецификация продукта

## 0. Метаданные документа

| Поле | Значение |
|---|---|
| Статус | Phase 1A, Phase 1B.1, Phase 1B.2 and Phase 1C passed; Phase 1D+ hold |
| Версия | 0.17.0 |
| Дата | 2026-08-08, Europe/Moscow |
| Владелец документа | Product Owner — владелец проекта; Business Owner — отец владельца проекта (`OWNER-DECISION-001`) |
| Продукт | `PROJECT_NAME` до отдельного решения о бренде |
| Язык | Русский; английские идентификаторы и технические термины допустимы |
| Главный источник правды | Этот документ |

### Связанные документы

- [Карта документации](../INDEX.md)
- [Глоссарий](../00-global/GLOSSARY.md)
- [Реестр внешних источников](../00-global/EXTERNAL_SOURCES.md)
- [Реестр прав на изображения и медиа](../00-global/ASSET_RIGHTS_REGISTER.md)
- [Политика источников цены](../00-global/PRICING_SOURCE_POLICY.md)
- [Реестр допущений](../00-global/ASSUMPTIONS.md)
- [Открытые вопросы](../00-global/OPEN_QUESTIONS.md)
- [Roadmap специализированных спецификаций](../00-global/SPEC_ROADMAP.md)
- [Quality gates entry/completion](../00-global/SPEC_QUALITY_GATE.md)
- [Feature specification](01-product/FEATURE_SPEC.md)
- [Матрица трассируемости](../00-global/TRACEABILITY_MATRIX.md)
- [Test strategy](../quality/TEST_STRATEGY.md)
- [MVP scope](../06-plans/MVP_SCOPE.md)
- [Implementation roadmap](../06-plans/IMPLEMENTATION_ROADMAP.md)
- [Specification readiness audit](../06-plans/SPEC_READINESS_AUDIT.md)
- [Phase 1A Foundation plan](../06-plans/active/PHASE_1A_FOUNDATION_PLAN.md)
- [Phase 1B.1 AMIGO catalog pilot plan](../06-plans/active/PHASE_1B1_AMIGO_CATALOG_PILOT_PLAN.md)
- [Phase 1B.1 completion report](../06-plans/completed/PHASE_1B1_AMIGO_CATALOG_PILOT_REPORT.md)
- [Phase 1B.1 transport discovery](../research/AMIGO_PILOT_TRANSPORT_DISCOVERY_2026-08-02.md)
- [Phase 1B.2 full catalog plan](../06-plans/active/PHASE_1B2_FULL_AMIGO_CATALOG_PLAN.md)
- [Phase 1B.2 full transport discovery](../research/AMIGO_FULL_CATALOG_TRANSPORT_DISCOVERY_2026-08-03.md)
- [Phase 1B.2 completion report](../06-plans/completed/PHASE_1B2_FULL_AMIGO_CATALOG_REPORT.md)
- [Phase 1C configurator/pricing plan](../06-plans/active/PHASE_1C_CONFIGURATOR_PRICING_PLAN.md)
- [Phase 1C AMIGO pricing verification](../research/AMIGO_PRICING_VERIFICATION_2026-08-08.md)
- [Phase 1C completion report](../06-plans/completed/PHASE_1C_CONFIGURATOR_PRICING_REPORT.md)
- [Правила работы](../../AGENTS.md)
- [История изменений](../../CHANGELOG.md)
- [Правила референсов](../../reference/README.md)

### История изменений

| Версия | Дата | Изменение |
|---|---|---|
| 0.1.0 | 2026-08-01 | Создана структура глобальной спецификации фазы 0A. |
| 0.2.0 | 2026-08-01 | Внесены прямые ответы владельца о территории, контакте, ассортименте, наличии, цене, услугах, визуализаторе, фотографиях и минимальном workflow заявок. |
| 0.3.0 | 2026-08-02 | Фаза 0A.1: подтверждены календарный срок, гарантия, четыре семейства и системы AMIGO, бесплатные услуги, рассрочка; добавлены governance внешних источников, прав на медиа и source-based pricing. |
| 0.3.1 | 2026-08-02 | Документация организована: глобальная спецификация перенесена в `docs/specs/`, а будущие профильные спецификации направлены в тот же выделенный контур. |
| 0.4.0 | 2026-08-02 | Подтверждены официальный партнёрский статус AMIGO, разрешённый scope каталога, медиа, цен, калькуляторной логики и бейджа; каталог и source price categories сделаны динамическими; разделены стандартный интерьерный preview и примерка на фото клиента; добавлены parity, sync и cart boundaries. |
| 0.5.0 | 2026-08-02 | Глобальная база связана с фактически созданным комплектом 0B, 40 stories/AC/tests, quality/evaluation documents и ADR; неизвестные формулы, providers и business transitions сохранены как TBD. |
| 0.6.0 | 2026-08-02 | Phase 0C: заморожен MVP первого запуска, P0 TBD классифицированы, введён roadmap 1A–1H и readiness gate; базовый кабинет и ограниченный AI pilot включены в MVP, online payment и расширенный ассортимент явно перенесены post-MVP. |
| 0.7.0 | 2026-08-02 | Зафиксированы `OWNER-DECISION-001`–`007`, закрыты семь owner-decision P0 и QG-147/148; письменно разрешена только Phase 1A Foundation без перехода к Phase 1B или production. |
| 0.8.0 | 2026-08-02 | Зафиксировано `OWNER-DECISION-008`: AMIGO и Business Owner разделены как authority для source-backed и локальных полей; PostgreSQL определён как локальная операционная проекция, а не новый upstream-источник. Фактический импорт и Phase 1B этим решением не объявлены завершёнными или разрешёнными. |
| 0.9.0 | 2026-08-02 | Зафиксировано `OWNER-DECISION-009` «LOCAL CATALOG AS PUBLIC SOURCE OF TRUTH»: публичный runtime использует только активную одобренную локальную версию в PostgreSQL, а AMIGO остаётся upstream authority. Добавлены обязательные diff/approval/override/audit/version/rollback границы без разрешения Phase 1B. |
| 0.10.0 | 2026-08-02 | `OWNER-DECISION-010` отдельно разрешил только Phase 1B.1: реальный 32-material AMIGO pilot через ограниченный public-page transport, local publication layer, sync/diff/media/base-price/overlay и минимальные catalog/admin surfaces; Phase 1B.2/1C+ и production остаются запрещены. |
| 0.11.0 | 2026-08-03 | `OWNER-DECISION-011` заменил только active local/CI RustFS adapter на digest-pinned VersityGW Docker/POSIX named-volume runtime после воспроизводимого Windows 11 real-image failure; provider-neutral `StoragePort`, PostgreSQL и выбор production storage не изменены. |
| 0.12.0 | 2026-08-03 | Phase 1B.1 Pilot Acceptance Gate passed: the reviewed 32-variant AMIGO pilot, 59 local media assets, immutable CatalogVersion/PriceVersion v1, business overlays, admin/public catalog, restart/idempotency/recovery and 9/9 CI evidence are recorded without authorizing Phase 1B.2/1C or production. |
| 0.13.0 | 2026-08-03 | `OWNER-DECISION-012` отдельно разрешил только Phase 1B.2 full authorized AMIGO catalog expansion на существующем importer: dynamic discovery, resumable snapshots/manifest, local media/base-price versions, diff/review/manual activation, bulk overlays и scalable catalog/admin; Phase 1C+, dimensional calculation и production остаются запрещены. |
| 0.14.0 | 2026-08-03 | Реальный full discovery существующим adapter подтвердил 28 динамических категорий, 56 систем, 9 моделей и 1655 MaterialVariant при 0 failure diagnostics; semantic source version исключает volatile HTML/form tokens, source `0` нормализуется в `PRICE_ON_REQUEST`, а discovery остаётся staged без activation и без Phase 1C. |
| 0.15.0 | 2026-08-04 | Phase 1B.2 завершена: принят 21 019-item manifest, вручную активированы CatalogVersion/PriceVersion v2, 1 655 variants и 2 818 approved local media objects, проверены rollback/restart/no-op/public/full CI; Phase 1C+ и production не разрешены. |
| 0.16.0 | 2026-08-08 | `OWNER-DECISION-013` отдельно разрешил только Phase 1C: PostgreSQL-only configurator, verified server pricing, per-unit minimum, immutable quote snapshot, price administration and parity tests; Phase 1D+, cart/order/WhatsApp/photo/AI/payment/final design/production remain prohibited. |
| 0.17.0 | 2026-08-08 | Phase 1C завершена: `/configure`, active-only integer pricing v5, four verified scopes/40 fixtures/≤1 RUB parity, local overrides, immutable quote snapshots, minimal pricing admin and acceptance tests реализованы; Phase 1D+ и production не начаты. |

## 1. Нормативный язык и приоритет источников

`MUST` означает обязательное требование; `SHOULD` — требование, от которого можно отступить только с документированной причиной; `MAY` — допустимую опцию.

При конфликте данных MUST применяться такой приоритет:

1. Этот `GLOBAL_SPEC.md`, включая перенесённые сюда подтверждённые владельцем бизнес-данные и границы партнёрского permission scope.
2. Принятые ADR в пределах их решения, если они не меняют бизнес-смысл.
3. Утверждённые специализированные спецификации.
4. Авторизованные versioned snapshots AMIGO для динамических operational values в пределах `EXTERNAL_SOURCES`, rights и pricing policies; snapshot не переписывает нормативное поведение.
5. Неподтверждённые допущения и открытые вопросы, которые не могут переопределять пункты выше.

- **PRINCIPLE-001 — MUST:** подтверждённые данные нельзя заменять догадкой, типичным рыночным правилом или удобством реализации.
- **PRINCIPLE-002 — MUST:** отсутствующее значение оформляется уникальным `TBD-*`; зависимая функция использует безопасный fallback.
- **PRINCIPLE-003 — MUST:** коммерческие и технические факты имеют источник, дату актуальности и ответственного за обновление.
- **PRINCIPLE-013 — MUST:** внешний изменяемый источник хранится через provenance, snapshot, версию и административную проверку; его текущее публичное состояние не является неизменяемой частью спецификации.
- **PRINCIPLE-014 — MUST:** возможность прочитать или сохранить URL медиа не означает права публиковать, копировать, изменять или использовать его в AI.
- **PRINCIPLE-017 — MUST:** партнёрское разрешение определяет допустимый scope использования, но каждая импортированная запись и каждый файл сохраняют provenance, source version, связь с доменной сущностью и собственный publication lifecycle.
- **PRINCIPLE-018 — MUST:** наблюдаемое поведение AMIGO MAY задавать функциональную parity, но код, DOM, дизайн, закрытые интерфейсы и неподтверждённые алгоритмы AMIGO не копируются.

## 2. Подтверждённый бизнес-контекст

Источник всех требований этого раздела — прямые ответы владельца бизнеса от 2026-08-02.

- **BUSINESS-LEAD-TIME-001 — MUST:** срок изготовления изделия составляет от 2 до 7 календарных дней, включая выходные.
- **BUSINESS-WARRANTY-001 — MUST:** гарантийный срок составляет 12 месяцев со дня установки и передачи изделия клиенту.
- **BUSINESS-WARRANTY-002 — MUST:** гарантия распространяется на производственные дефекты, дефекты материалов, дефекты сборки, поломку механизма, отсоединение или разрушение элементов крепления и неисправности при обычной эксплуатации по назначению.
- **BUSINESS-WARRANTY-003 — MUST:** гарантия не распространяется на повреждение, если установлено, что его причиной стали применение чрезмерной силы; резкое дёргание цепи или полотна; порезы, разрывы или удары; самостоятельная разборка; ремонт или переустановка третьими лицами; использование не по назначению; неправильная чистка; агрессивные химические вещества; попадание большого количества воды; пожар; неправильное хранение или перевозка после передачи клиенту; действия третьих лиц; обстоятельства непреодолимой силы; естественный износ расходных частей, не вызванный дефектом. Причина повреждения MUST NOT определяться автоматически; при необходимости проводится осмотр или проверка качества.
- **BUSINESS-INSTALLMENT-001 — MUST:** клиентам доступна рассрочка; пока её условия не подтверждены, разрешена только формулировка «Доступна рассрочка. Уточните условия у менеджера» и ручной сценарий через WhatsApp.
- **BUSINESS-REGION-001 — MUST:** бизнес обслуживает всю Чеченскую Республику.
- **BUSINESS-FREE-SERVICES-001 — MUST:** замер, доставка и установка бесплатны для обслуживаемой территории и подтверждённого ассортимента.
- **BUSINESS-CONTACT-001 — MUST:** основной номер WhatsApp — `+7 963 585-10-36`.

### 2.1. Подтверждённое партнёрство AMIGO

Источник требований `PARTNER-*` — письменное сообщение владельца задачи от 2026-08-02, передающее окончательно подтверждённые Business Owner факты. Копия договора или бейджа является необязательной evidence reference и не блокирует документирование; governance-роли определены `OWNER-DECISION-001`.

- **PARTNER-001 — MUST:** бизнес является официальным партнёром AMIGO; AMIGO имеет relationship status `AUTHORIZED_PARTNER_SOURCE`.
- **PARTNER-002 — MUST:** permission scope охватывает каталог AMIGO; названия, артикулы и технические сведения; цены; фотографии товаров, тканей, материалов и примеров изделий; самостоятельное воспроизведение логики калькулятора; партнёрский бейдж и разрешённые логотипы.
- **PARTNER-003 — MUST:** права на разрешённые AMIGO-медиа фиксируются как `PARTNER_LICENSE`; публичная выдача конкретного локального файла допускается только при `PUBLICATION_APPROVED`, корректном provenance и связи с соответствующей сущностью.
- **PARTNER-004 — MUST:** `PartnerRelationship` хранит `partnerStatus`, `partnerName`, `partnerRegion`, `partnerBadgeAsset`, `permissionScope`, `permissionConfirmedByOwner`, `permissionRecordedAt`, nullable `optionalEvidenceReference` и `brandUsageNotes`.
- **PARTNER-005 — MUST:** отсутствие загруженной копии договора или бейджа не отменяет подтверждённый бизнес-факт и не блокирует подготовку специализированных спецификаций; ограничения конкретного актива, атрибуция и отзыв продолжают контролироваться реестром прав.
- **PARTNER-006 — MUST:** permission scope не включает копирование программного кода, DOM, дизайна, закрытых API, обход доступа, удаление водяных знаков или training use, если для такой отдельной цели нет явного разрешения.
- **PARTNER-007 — MUST:** партнёрский бейдж MAY публиковаться только как идентификация реального партнёрства, без изменения авторства и вне формулировок, создающих неутверждённые гарантии от имени AMIGO.

### 2.2. Решения владельца для implementation governance и будущих feature gates

Источник `OWNER-DECISION-*` — письменные решения Product Owner от 2026-08-02, 2026-08-03 и 2026-08-08. Они задают бизнес- и архитектурные границы; implementation scope расширяется только явным transition decision. Phase 1A, Phase 1B.1, Phase 1B.2 и Phase 1C завершены; Phase 1D+ остаются запрещены.

- **OWNER-DECISION-001 — MUST:** Product Owner — владелец проекта; Business Owner — отец владельца проекта. Product Owner утверждает продуктовые решения, UX, технические этапы, приоритеты и MVP. Business Owner утверждает цены, ассортимент, наличие, правила изготовления, гарантийные решения и коммерческие условия.
- **OWNER-DECISION-002 — MUST:** новую `PriceVersion` может активировать только actor с ролью `OWNER` или `ADMIN`, после просмотра точного diff и явного подтверждения; каждая попытка и успешная активация MUST попадать в audit log.
- **OWNER-DECISION-003 — MUST:** минимальная стоимость 1500 рублей применяется к каждому отдельно изготавливаемому изделию, а не ко всему заказу: изделие с результатом формулы 1100 рублей оценивается в 1500 рублей, два таких изделия — в 3000 рублей. Реализация ценового правила запрещена в Phase 1A и остаётся зависимой от остальных pricing gates.
- **OWNER-DECISION-004 — MUST:** локальная админ-панель является главным источником статуса наличия. AMIGO MAY предоставить предлагаемый статус, но синхронизация MUST NOT автоматически перезаписывать подтверждённое локальное наличие.
- **OWNER-DECISION-005 — MUST:** проверка обновлений AMIGO планируется автоматически один раз в сутки и вручную по запросу администратора. Данные старше 7 дней получают `STALE_WARNING`; данные старше 30 дней требуют обязательной административной проверки перед публикацией изменённой цены или нового товара.
- **OWNER-DECISION-006 — MUST:** при одинаковых source version, системе, материале, размерах, фурнитуре, опциях и количестве абсолютное отклонение локального результата от результата AMIGO MUST быть не более 1 рубля; большее отклонение является parity error.
- **OWNER-DECISION-007 — MUST:** production-доступность без VPN проверяется в Грозном, Урус-Мартане, Аргуне и Гудермесе через мобильное подключение и домашний или офисный Wi-Fi, минимум по двум разным сетевым маршрутам, в mobile Chrome и desktop Chrome. Production infrastructure выбирается позднее отдельным решением.
- **OWNER-DECISION-008 — MUST:** для AMIGO-origin записей AMIGO является upstream authority для продуктов, материалов, технических данных, catalog images и базовых цен; Business Owner является decision authority для локального наличия, локальной видимости/публикации, локальных ценовых override, локального портфолио и коммерческих условий. PostgreSQL хранит версионированные source snapshots, нормализованную локальную проекцию и решения Business Owner как operational system of record, но импорт не переносит authority между слоями и не разрешает редактировать source-поля как локальные факты. Бинарные изображения хранятся в управляемом object storage, а PostgreSQL хранит их provenance, mapping, rights/publication metadata и object references. Решение задаёт ownership данных, но само по себе не доказывает завершённый импорт и не разрешает Phase 1B.
- **OWNER-DECISION-009 — MUST:** «LOCAL CATALOG AS PUBLIC SOURCE OF TRUTH». AMIGO остаётся upstream source of truth для импортируемых product/material metadata, технических спецификаций, identity/provenance изображений поставщика и базовых цен, но публичная часть приложения MUST NOT читать AMIGO напрямую. Активная одобренная `CatalogVersion` и связанные транзакционные записи в PostgreSQL являются единственным каноническим runtime-источником для клиентского каталога, поиска, фильтров, конфигуратора, расчётов, заявок и аналитики. Полный pipeline, правила публикации, приоритета overrides, аудита и версионирования в §2.2.1 являются частью решения. Object storage доставляет только approved image binaries по ссылкам из активной версии и не становится отдельным источником каталожной истины. Решение не доказывает существование business schema/imported data, не закрывает source/price/asset TBD и не разрешает Phase 1B.
- **OWNER-DECISION-010 — MUST:** Product Owner разрешает начать и завершить только Phase 1B.1 на branch `phase/1b-amigo-catalog-pilot`: provider-neutral source adapter; raw/normalized/business-overlay catalog layers; контролируемый реальный allowlist из 32 AMIGO `MaterialVariant` четырёх семейств и четырёх систем; ограниченные licensed media в private-by-default local object storage; daily/manual sync, diff и explicit OWNER/ADMIN activation; source prices «от», `PRICE_ON_REQUEST` и separate local override; минимальные server-authorized APIs, `/admin/catalog` и PostgreSQL-only `/catalog`. Для пилота разрешён low-rate import четырёх явных публичных `shop.amigo.ru` catalog paths без login/CAPTCHA/filter/action endpoints, поскольку официальный API/export не подтверждён; source-specific DOM/selectors остаются только внутри адаптера и не копируются как frontend code. Phase 1B.2/1C+, полный AMIGO import, calculation/configurator/preview/AI/cart/order/WhatsApp/installment/account/final landing/starfield и production deployment MUST NOT начинаться. Fixtures являются только test doubles и не могут подменить Pilot Acceptance Gate.
- **OWNER-DECISION-011 — MUST:** «LOCAL DEVELOPMENT OBJECT STORAGE». RustFS `1.0.0-beta.11` MUST NOT использоваться как активное local-development/CI object storage после воспроизводимого Windows 11 отказа записи на реальных AMIGO JPEG: 65 536 и 131 072 байта сохранялись, а 159 099 и 262 144 байта возвращали `HTTP 500 File access denied`; разрешённый контрольный JPEG имеет размер 515 180 байт. Local development и CI MUST использовать VersityGW `v1.4.1` в Linux-контейнере Docker Compose с POSIX backend и Docker named volumes для object data, versioning и IAM; S3/Admin/Web UI, если включён, публикуются только на loopback, все три trust-zone buckets остаются private и создаются отдельной идемпотентной командой. Bind mount object directory в Windows filesystem запрещён. Существующий provider-neutral `StoragePort`, domain/catalog/media boundaries сохраняются; endpoint, region, credentials, bucket names, path-style, timeouts, retries и multipart thresholds поступают из typed configuration и остаются внутри S3 adapter/infrastructure. VersityGW является только disposable local/CI adapter: production provider/region/credentials не выбраны; Supabase Storage, Cloudflare R2, AWS S3 или иной S3-compatible provider требуют отдельного будущего решения. Решение не меняет PostgreSQL, Prisma, Graphile Worker, catalog/ownership model, другие решения Phase 1A и не разрешает Phase 1C.
- **OWNER-DECISION-012 — MUST:** Product Owner разрешает начать только Phase 1B.2 **FULL AUTHORIZED AMIGO CATALOG EXPANSION** на branch `phase/1b2-amigo-full-catalog` от commit `af8411d2b854e572b6b61b214d3e99a88b96cafc`. Существующий Phase 1B.1 `AmigoCatalogSourceAdapter`, PostgreSQL/Prisma/Graphile Worker pipeline, source/normalized/business-overlay ownership, explicit diff/review/activation и VersityGW `StoragePort` MUST расширяться без второго импортёра. Разрешены dynamic discovery всех доступных без login/CAPTCHA текущих категорий, pagination/nesting, products/systems/models/materials/variants/properties/compatibility source facts, source links, raw snapshots, full import manifest, resumable/cancellable durable jobs, licensed local media, source/base/card/price-from/category/currency/context snapshots, `PRICE_ON_REQUEST`, daily/manual sync, full diff/review, manual `CatalogVersion`/`PriceVersion` activation, transactional audited bulk local controls и scalable `/catalog`/`/admin/catalog`. Все новые full-import candidates получают предлагаемые defaults `visibility = VISIBLE` и `availability = INQUIRY_ONLY`, которые становятся runtime-данными только после review/activation; последующая sync MUST NOT перезаписывать local visibility, availability или local price override. Public runtime MUST читать только active PostgreSQL versions и controlled local media. Official API/export/credential MUST NOT предполагаться; public-page discovery MAY продолжаться только по зафиксированным allowlisted HTTPS paths с bounded load, stable identity и stop conditions. Phase 1B.2 MUST NOT реализовывать dimensional calculator, formula/minimum-price engine, configurator, preview/AI, cart/order/WhatsApp/installment/account, final landing/starfield, production provider/secrets/deployment или Phase 1C+. Завершение Phase 1B.2 не разрешает следующую фазу.
- **OWNER-DECISION-013 — MUST:** Product Owner разрешает начать и завершить только Phase 1C **PRODUCT CONFIGURATOR AND VERIFIED PRICING ENGINE** на branch `phase/1c-configurator-pricing` от merged-main commit `3f1f70c986bd29518364a059393e9abd1b284a02`. Разрешены guest `/configure`, динамическая PostgreSQL-only совместимость, server-side миллиметровая валидация, отдельный deterministic integer-kopeck pricing package, verified AMIGO rules/fixtures, active-only PriceVersion, local price override precedence, per-unit 150,000-kopeck minimum before quantity, zero-cost measurement/delivery/installation lines, immutable quote snapshot, safe `PRICE_ON_REQUEST`/`MANUAL_REVIEW_REQUIRED` fallbacks, minimal OWNER/ADMIN price administration, audit/idempotency/rate/origin/correlation boundaries and unit/contract/integration/browser/parity/property tests. Автоматический расчёт MUST ограничиваться доказанными rule scopes; неподтверждённая формула или размер MUST NOT интерполироваться или выдаваться за точный. Phase 1D+, standard preview, client-photo/AI, cart/order/WhatsApp/installment/payment, final landing/starfield, production secrets/provider/deployment MUST NOT начинаться. Завершение Phase 1C не разрешает следующую фазу.

Гарантийная политика MUST NOT уменьшать обязательные права потребителя, предусмотренные применимым законодательством. Порядок обращения, доказательства, сроки проверки и способы удовлетворения требования остаются в `TBD-WARRANTY-001` и не придумываются.

### 2.2.1. OWNER-DECISION-009 — public-serving catalog pipeline

Канонический поток данных:

```text
AMIGO Source
        ↓
Import/Synchronization Layer
        ↓
PostgreSQL Local Catalog (immutable capture + staged candidate)
        ↓
Validation/Diff
        ↓
Business Owner Approval
        ↓
Public Catalog (explicit administrator activation)
```

Обязательные правила решения:

1. Импорт AMIGO MUST NOT автоматически удалять локальные сущности, local-only данные, Business Owner overlays или исторические ссылки. Исчезновение у источника создаёт source-removal candidate и diff; скрытие, архивирование или иное локальное действие требует явного решения и сохраняет историю.
2. Любое source-изменение сначала создаёт immutable capture, staged candidate и проверяемый field/relationship/price/media diff. Candidate, raw capture и непроверенная версия MUST NOT читаться публичными flows.
3. Business Owner утверждает локальный состав и видимость публичного каталога в пределах `OWNER-DECISION-008`; уполномоченный администратор фиксирует явное подтверждение публикации и атомарно активирует точную одобренную `CatalogVersion`. Наличие обеих полномочий у одного человека не предполагается только из системной роли.
4. Применимый локальный override MUST иметь приоритет в опубликованной локальной проекции, но MUST NOT изменять AMIGO source snapshot. Override хранит scope, причину, автора, approval, effective interval и версию.
5. Capture/import, validation, diff resolution, local edit/override, approval, activation, rejection, hide/archive, rollback и rebuild производных read models MUST оставлять audit trail с actor, временем, причиной, before/after reference и correlation ID.
6. Каждая `CatalogVersion` MUST иметь уникальный ID, `createdAt`, nullable `publishedAt`, source/source-version manifest, ссылки на sync run/captures/diff, Business Owner approval, administrator activation, предыдущую версию и rollback target. Опубликованная версия неизменяема; исправление создаёт новую версию.
7. Search index, cache, filter facets и analytics/read projections MAY использоваться только как rebuildable производные точной активной `CatalogVersion` из PostgreSQL. Они MUST быть version-pinned, MUST NOT принимать AMIGO/staging напрямую и MUST NOT становиться независимым mutation source.

Phase 1B.2 acceptance 2026-08-04 зафиксировал этот pipeline на semantic source version `sha256:3cf971b0aabe17091ef0804e8d8368fb37182939533a4eef8ee4346f4c59711d`: active CatalogVersion v2 `8975b18c-d7de-49cc-a6e6-d7566b69460a`, active PriceVersion v2 `9fdc0a74-9fab-4d63-b4b6-015f534e117d`, 1 739 composition entries, 1 655 public variants и 2 818 approved local media objects. Repeat run `ae9b8759-7b14-4ca6-9b13-b518113a63b0` создал zero versions/differences; v1 сохранена как rollback target. Эти динамические значения являются dated governed evidence, а не неизменяемым ассортиментным enum.

Phase 1C acceptance 2026-08-08 сохранил CatalogVersion v2 и активировал отдельную расчётную PriceVersion v5 `7618714e-0baf-463a-8311-e9cf84879dd1`, source version `amigo-public-calculator-2026-08-08-9f9246330385`. Четыре точных rule scope покрыты 40 fixtures; максимальное отклонение составляет 100 kopecks. Public runtime рассчитывает только server-side из PostgreSQL, сохраняет immutable quote snapshot и не присваивает сумму неподтверждённым сочетаниям.

Причины решения:

1. Независимость от доступности AMIGO.
2. Возможность локальных изменений без повреждения source facts.
3. История версий и воспроизводимость публичного состояния.
4. Контроль владельца бизнеса над публикацией и локальными решениями.
5. Быстрый публичный runtime без live-запросов к поставщику.
6. Возможность атомарного отката на ранее подтверждённую версию.
7. Поддержка нескольких поставщиков в будущем через тот же source/version/approval contract.

### 2.3. Каноническая матрица authority

| Данные | Authority | Локальная запись и допустимое изменение |
|---|---|---|
| AMIGO products и materials | AMIGO | Версионированный snapshot и нормализованная проекция в PostgreSQL; локально меняются только mapping/readiness/override-поля, не исходный факт. |
| AMIGO technical data | AMIGO | Значение хранится с source version/provenance; неизвестное не дополняется догадкой Business Owner или импортёра. |
| AMIGO catalog images | AMIGO в пределах `PARTNER_LICENSE` | PostgreSQL хранит metadata/provenance/mapping/status; разрешённый binary хранится в object storage и публикуется только после asset-level gate. |
| AMIGO base prices | AMIGO | Source snapshot неизменяем; Business Owner MAY утвердить отдельный local override, не переписывая базовую цену. |
| Local availability | Business Owner | Подтверждённое локальное решение записывается в PostgreSQL; AMIGO status MAY храниться только как proposal. |
| Local visibility/publication | Business Owner | Отдельное локальное состояние в PostgreSQL; импорт никогда не публикует запись автоматически. |
| Local price overrides | Business Owner | Отдельная versioned/audited запись с областью и сроком; source price сохраняется без изменения. |
| Local portfolio | Business Owner при наличии прав/согласий на конкретный актив | AMIGO examples остаются partner examples и не становятся `LOCAL_PORTFOLIO`. |
| Commercial conditions | Business Owner с требуемой legal/financial проверкой | Версионируются отдельно от AMIGO; неполные условия остаются соответствующими `TBD-*`. |

Термин `authority` в этой матрице означает полномочие определять бизнес-смысл поля. PostgreSQL является локальным operational system of record для активной версии и аудита, но не заменяет ни upstream AMIGO, ни decision authority Business Owner. Формулировка `LOCAL CATALOG AS PUBLIC SOURCE OF TRUTH` в `OWNER-DECISION-009` означает единственный public-serving/runtime source после approval, а не перенос upstream authority на базу данных.

Прежние идентификаторы сохранены и не переиспользуются:

| Зарезервированный ID | Статус | Нормативная замена |
|---|---|---|
| BUSINESS-001 | Superseded 2026-08-02 | `BUSINESS-REGION-001` |
| BUSINESS-002 | Superseded 2026-08-02 | `BUSINESS-CONTACT-001` |
| BUSINESS-003 | Superseded 2026-08-02 | `BUSINESS-LEAD-TIME-001` |
| BUSINESS-004 | Superseded 2026-08-02 | `BUSINESS-WARRANTY-001`–`003` |

## 3. Краткое описание продукта

`PROJECT_NAME` — публичное веб-приложение и внутренний рабочий контур локального официального партнёра AMIGO, который изготавливает и устанавливает солнцезащитные изделия по индивидуальным размерам. AMIGO-origin каталог обслуживается только из активной одобренной локальной PostgreSQL-версии после import/diff/approval/activation gate, сохраняя authority-разделение `OWNER-DECISION-008`, public-serving boundary `OWNER-DECISION-009` и независимость storefront от live AMIGO.

Клиент сможет увидеть реальный ассортимент и наличие, собрать конфигурацию для одного или нескольких окон, получить предварительную стоимость, примерить выбранный материал на фотографии, сравнить результат и передать расчёт в WhatsApp или заявку на замер/звонок.

Продукт обеспечивает самостоятельную функциональную parity каталога, конфигуратора, предварительного расчёта и передачи заказа AMIGO, но использует собственные бренд, дизайн, frontend, backend, архитектуру, компоненты, анимации, мобильную эргономику, визуализаторы, кабинет и админ-панель. Владелец и уполномоченные сотрудники смогут поддерживать динамический каталог, source price categories, прайс-листы, наличие, контент, заявки, замеры и заказы без изменения программного кода ядра.

## 4. Проблема бизнеса и ценность

### 4.1. Проблема бизнеса

- Клиенты повторно спрашивают об ассортименте, материалах, наличии, цене, размерах и услугах.
- Предварительный выбор зависит от ручной переписки и плохо масштабируется.
- Клиенту трудно представить результат на своём окне до замера и изготовления.
- Неединые объяснения цены и наличия создают риск ошибок и недоверия.
- Изменения ассортимента и цен требуют управляемого источника правды и истории.

### 4.2. Ценность для клиента

- Самостоятельный выбор из реальных, а не демонстрационных позиций.
- Понятный предварительный расчёт нескольких окон с видимой разбивкой.
- Честное указание наличия, бесплатных услуг и необходимости ручной проверки.
- Визуальная примерка конкретного Material Variant с возможностью исправить геометрию.
- Быстрый переход в подтверждённый WhatsApp вместе с контекстом расчёта.

### 4.3. Ценность для владельца

- Меньше однотипных консультаций до квалифицированной заявки.
- Единое управление каталогом, наличием и версией цены.
- Более полные входные данные для разговора, замера и изготовления.
- История административных изменений и статусов обращения.
- Измеримость воронки без раскрытия пользовательских фотографий аналитическим системам.

## 5. Цели продукта и измерение успеха

- **GOAL-001 — MUST:** дать гостю путь от знакомства с ассортиментом до предварительной стоимости без обязательной регистрации.
- **GOAL-002 — MUST:** показывать только реальный подтверждённый ассортимент и актуальный бинарный статус наличия.
- **GOAL-003 — MUST:** сделать расчёт детерминированным, серверным, объяснимым и воспроизводимым по версии прайс-листа.
- **GOAL-004 — MUST:** поддержать несколько окон/изделий в одном расчёте и единый итог.
- **GOAL-005 — MUST:** дать управляемую визуальную примерку конкретного материала без изменения окружающей сцены.
- **GOAL-006 — MUST:** превращать расчёт и визуализацию в структурированную заявку через WhatsApp или форму.
- **GOAL-007 — MUST:** обеспечить владельцу безопасное управление коммерческими данными и audit log.
- **GOAL-008 — SHOULD:** подготовить архитектурные границы к возможному SaaS-развитию без реализации multi-tenancy в первой версии.
- **GOAL-009 — MUST:** обеспечить функциональный охват разрешённого каталога и клиентского заказа AMIGO без копирования его программной реализации или дизайна.
- **GOAL-010 — MUST:** дать два независимых визуальных пути: быстрый стандартный интерьерный preview и приватную примерку на фотографии окна клиента.

Числовые KPI не утверждаются без baseline и владельца метрики. Требуется измерять:

- **METRIC-001:** долю сессий каталога, переходящих к запуску калькулятора.
- **METRIC-002:** долю начатых расчётов, завершённых валидной предварительной стоимостью или осознанным Manual Review.
- **METRIC-003:** распределение количества окон в расчёте и частоту удаления/исправления позиций.
- **METRIC-004:** долю загрузок фото с успешным обнаружением, ручной корректировкой и завершённым рендером.
- **METRIC-005:** время и точки отказа от загрузки фото до результата, без записи URL или содержимого фото.
- **METRIC-006:** переходы из расчёта/визуализации в WhatsApp, заявку или замер.
- **METRIC-007:** качество заявок: наличие размеров, выбранного варианта, фото и контекста расчёта.
- **METRIC-008:** расхождение предварительной и подтверждённой цены с категоризированной причиной.
- **METRIC-009:** свежесть каталога/наличия и частоту административных корректировок.
- **METRIC-010:** доступность и производительность из репрезентативных сетей Чеченской Республики.

## 6. Границы продукта

### 6.1. MVP

- **SCOPE-001 — MUST:** публичная главная страница с реальным предложением бизнеса, регионом, контактом и CTA.
- **SCOPE-002 — MUST:** динамический каталог поддерживает все текущие и будущие категории AMIGO как source-backed сущности без изменения программного кода ядра; публичность и возможность заказа каждой категории управляются отдельным `PublicationState` и локальным решением владельца.
- **SCOPE-003 — MUST:** бинарное наличие `IN_STOCK` / `OUT_OF_STOCK` без показа точных остатков.
- **SCOPE-004 — MUST:** серверный калькулятор предварительной стоимости для одного и нескольких окон.
- **SCOPE-005 — MUST:** отдельные строки «Замер», «Доставка» и «Установка» со значением `0` рублей и подписью «Бесплатно» для всей обслуживаемой Чеченской Республики.
- **SCOPE-006 — MUST:** загрузка фотографии, предложение области окна, ручная правка четырёх углов и геометрический рендер.
- **SCOPE-007 — MUST:** первый проверяемый scope визуализатора — рулонные жалюзи и «Зебра»/«День-Ночь»; остальные семейства проходят отдельный post-MVP gate.
- **SCOPE-008 — MUST:** сравнение исходной фотографии и результата.
- **SCOPE-009 — MUST:** отправка контекста расчёта/визуализации в WhatsApp и создание заявки.
- **SCOPE-010 — MUST:** сохранение расчёта с версией цены доступно в базовом добровольном аккаунте; полноценный гостевой расчёт и заявка не требуют регистрации.
- **SCOPE-011 — MUST:** портфолио только из разрешённых фотографий работ.
- **SCOPE-012 — MUST:** админ-панель для реальных товаров, вариантов, наличия, ценовых категорий, прайс-листов, заявок и контента.
- **SCOPE-013 — MUST:** минимальный жизненный цикл заявки и история изменений.
- **SCOPE-014 — SHOULD:** базовые privacy-aware продуктовые события и операционная наблюдаемость.
- **SCOPE-031 — MUST:** нейтральная отметка о рассрочке, CTA «Узнать условия» и ручная передача запроса менеджеру в WhatsApp.
- **SCOPE-034 — MUST:** мгновенный детерминированный стандартный интерьерный preview выбранного материала на подготовленных демонстрационных сценах без обязательной AI-генерации.
- **SCOPE-035 — MUST:** корзина из одной или нескольких независимых конфигураций, гостевое оформление и структурированный handoff заявки в WhatsApp без обязательной регистрации.
- **SCOPE-036 — MUST:** партнёрский бейдж AMIGO публикуется в разрешённом scope и связан с `PartnerRelationship` и approved asset.
- **SCOPE-037 — MUST:** AMIGO functional parity документируется для каталога, конфигуратора, preview, предварительного расчёта, корзины и процесса заявки; техническая реализация и визуальный язык остаются самостоятельными.
- **SCOPE-038 — MUST:** канонический состав первого запуска задают `MVP-001`–`028` в [MVP_SCOPE](../06-plans/MVP_SCOPE.md); изменение состава требует письменного решения и impact analysis.
- **SCOPE-039 — MUST:** для первого запуска обязательны четыре семейства — рулонные, «Зебра»/«День-Ночь», горизонтальные алюминиевые и вертикальные; полный ассортимент AMIGO не является launch dependency.
- **SCOPE-040 — MUST:** Phase 1B начинает с 20–50 проверенных материалов, а каждая последующая категория/позиция активирует publication, availability, pricing, configurator, preview, AI и orderability независимо.
- **SCOPE-041 — MUST:** первая AI-примерка включает private upload, ручную коррекцию, геометрическую базу, optional gated refinement, before/after, fallback, evaluation и cost limits только для рулонных и Zebra.
- **SCOPE-042 — MUST:** стандартный preview и AI-примерка имеют разные типы результата, data/privacy boundaries и release gates.
- **SCOPE-043 — MUST:** разработка следует Phase 1A–1H из [IMPLEMENTATION_ROADMAP](../06-plans/IMPLEMENTATION_ROADMAP.md); завершение документационного gate не разрешает следующий этап автоматически.

### 6.2. После MVP или после отдельного quality gate

- **SCOPE-015 — MAY:** optional generative refinement входит только в контролируемый MVP pilot рулонных/Zebra после provider, privacy, evaluation, protected-region и cost gates; для иных семейств это post-MVP.
- **SCOPE-016 — MAY:** визуализация горизонтальных и вертикальных жалюзи после подтверждения качества первого scope.
- **SCOPE-017 — MAY:** расширенный клиентский кабинет сверх базового сохранения расчётов — повторные заказы, адресная книга, избранное, полная история статусов и иные CRM-функции — относится к post-MVP, если отдельное решение не изменит scope.
- **SCOPE-018 — MAY:** детальные производственные статусы, расписание и расширенная история заказа по `QUOTES_ORDERS_SPEC.md`.
- **SCOPE-019 — MAY:** расширенная аналитика, сегментация, эксперименты и отчёты по причинам расхождения цены.
- **SCOPE-020 — MAY:** онлайн-оплата после отдельного business/security/legal решения.
- **SCOPE-021 — MAY:** multi-tenant SaaS только как отдельная продуктовая фаза.
- **SCOPE-032 — MAY:** сложные производственные, монтажные, pricing- и visualizer-сценарии ZIP-систем, интерьерных ставней, классических портьер, римских штор, плиссе, гофре, деревянных жалюзи, «Мираж», мансардных и моторизованных систем MAY быть post-MVP, даже если категории уже импортированы и управляются в локальном каталоге.

### 6.3. Явные non-goals

- **SCOPE-022 — MUST NOT:** MVP не принимает онлайн-оплату.
- **SCOPE-023 — MUST NOT:** первая версия не реализует multi-tenant управление, tenant billing или tenant admin.
- **SCOPE-024 — MUST NOT:** обнаружение или импорт новой категории AMIGO не означает автоматическую публикацию, локальное наличие, расчётную готовность или обещание заказа; каждое из этих состояний подтверждается отдельно.
- **SCOPE-025 — MUST NOT:** алюминий не моделируется как Product Family; это подтверждённый материал горизонтальных жалюзи.
- **SCOPE-026 — MUST NOT:** точные складские количества рулонов/комплектующих не показываются клиенту в MVP.
- **SCOPE-027 — MUST NOT:** неизвестные размеры, тарифы, сроки или условия не заменяются среднерыночными значениями.
- **SCOPE-028 — MUST NOT:** визуализация не является гарантией цвета, фактуры, монтажной возможности или конечного внешнего вида.
- **SCOPE-029 — MUST NOT:** AI не меняет комнату и не выбирает товар вместо клиента.
- **SCOPE-030 — MUST NOT:** стиль, тексты, структура или брендинг LAYEL не копируются.
- **SCOPE-033 — MUST NOT:** MVP не выполняет автоматическое кредитное решение и не подписывает договор рассрочки онлайн без отдельной утверждённой спецификации.

## 7. Продуктовые принципы

- **PRINCIPLE-004 — MUST:** реальный каталог важнее визуально полного каталога с вымышленными данными.
- **PRINCIPLE-005 — MUST:** предварительная стоимость явно отделена от подтверждённой цены.
- **PRINCIPLE-006 — MUST:** клиент выбирает конкретный Material Variant; Price Category подставляется системой.
- **PRINCIPLE-007 — MUST:** автоматизация предлагает, но пользователь может исправить границы окна и отказаться от AI.
- **PRINCIPLE-008 — MUST:** приватность фото и безопасность административных изменений являются частью MVP-качества.
- **PRINCIPLE-009 — SHOULD:** каждый отказ даёт понятную причину, сохранение прогресса и следующий безопасный шаг.
- **PRINCIPLE-010 — SHOULD:** mobile-first путь не требует точного pointer input и работает при нестабильном соединении.
- **PRINCIPLE-011 — MUST:** бесплатные услуги показываются отдельно и не маскируются внутри цены механизма.
- **PRINCIPLE-012 — MUST:** экранный цвет и AI-реалистичность сопровождаются честным disclosure.
- **PRINCIPLE-015 — MUST:** AMIGO задаёт provenance базовых внешних данных, но публикация использует локально проверенную версию и не зависит от доступности AMIGO в момент клиентского запроса.
- **PRINCIPLE-016 — MUST:** цена, право на изображение и доступность материала проверяются независимо; подтверждение одного не подтверждает остальные.

## 8. Типы пользователей, обязанности и права

- **ROLE-001 — Гость:** MAY просматривать каталог, наличие и портфолио; MUST иметь доступ к калькулятору и базовому визуализатору; MAY создать заявку; MUST видеть только свои гостевые данные по непредсказуемому токену/сессии; MUST NOT видеть чужие проекты.
- **ROLE-002 — Зарегистрированный клиент:** имеет права гостя; MAY сохранять проекты, историю и видеть связанные заказы; MUST иметь доступ только к подтверждённо принадлежащим ему данным; не управляет коммерческими правилами.
- **ROLE-003 — Менеджер:** обрабатывает заявки, замеры и заказы, связывается с клиентом и обновляет разрешённые статусы; MUST NOT публиковать прайс-лист или менять роли без отдельного права.
- **ROLE-004 — Администратор:** управляет каталогом, вариантами, локальным наличием, прайс-листами, контентом, настройками и разрешёнными аккаунтами; опасные действия подлежат audit log и, где требуется, approval. Активация `PriceVersion` разрешена только при выполнении `OWNER-DECISION-002`.
- **ROLE-005 — OWNER:** высокопривилегированная системная роль для разрешённых approvals и сводной аналитики; она не объединяет автоматически governance-полномочия Product Owner и Business Owner, разделённые `OWNER-DECISION-001`.
- **ROLE-006 — Контент-менеджер:** управляет разрешёнными описаниями, media mapping, alt-text, portfolio labels и drafts в пределах выданного permission; MUST NOT самостоятельно менять price rules, права или owner approvals.
- **ROLE-007 — Система синхронизации:** технический actor создаёт source snapshots/diffs и validation results от имени конкретного run; MUST NOT самостоятельно активировать публикацию или local override.
- **ROLE-008 — AI/CV worker:** технический actor выполняет разрешённые detection/render/refinement jobs с минимальным payload; MUST NOT принимать решения о товаре, цене, правах или публикации.

Разрешения MUST назначаться по операциям, а не только по названию экрана. Одна персона MAY иметь несколько внутренних ролей, но каждое действие фиксирует фактически использованное разрешение.

## 9. End-to-end сценарии

| ID | Сценарий | Основной путь | Безопасный fallback |
|---|---|---|---|
| FLOW-001 | Просмотр каталога | Гость выбирает семейство → систему → материал/вариант → видит свойства и наличие. | Скрытая или неполная позиция не показывается как доступная; предлагается WhatsApp. |
| FLOW-002 | Расчёт одного окна | Выбор системы → ввод целых мм → вариант → количество → серверная стоимость и breakdown. | Неизвестный размер/правило → `REQUIRES_MANUAL_REVIEW`, без точной суммы. |
| FLOW-003 | Расчёт нескольких окон | Пользователь добавляет/копирует позиции, называет окна, редактирует их и получает общий итог. | Ошибка одной позиции не стирает остальные; итог отмечает непосчитанные позиции. |
| FLOW-004 | Загрузка фотографии | Пользователь читает privacy notice, выбирает файл, проходит валидацию и получает preview. | Ошибка формата/качества объясняется; расчёт остаётся доступным без фото. |
| FLOW-005 | Выбор окна/створки | Система показывает найденные кандидаты, пользователь выбирает окно и нужные створки. | Нет/много кандидатов → ручное создание или выбор четырёхугольника. |
| FLOW-006 | Выбор материала | Пользователь выбирает реальный `IN_STOCK` Material Variant из совместимых вариантов. | `OUT_OF_STOCK` остаётся видимым по контент-правилу, но не выдаётся за доступный. |
| FLOW-007 | Получение визуализации | Четыре угла → высота полотна → геометрический render → optional refinement → сравнение. | AI недоступен → геометрический результат; render неуспешен → сохранённая конфигурация и повтор. |
| FLOW-008 | Отправка заявки | Пользователь проверяет контакт и согласия → отправляет расчёт/ссылку в WhatsApp или форму. | Не передавать приватное фото без авторизованной ссылки и явного действия. |
| FLOW-009 | Сохранение проекта | Расчёт получает стабильный ID, snapshot цены и владельца/guest-token. | Истёкший токен не раскрывает данные; предлагается новый расчёт или подтверждение владения. |
| FLOW-010 | Просмотр статуса | Клиент открывает собственный заказ и видит доступный человеку статус/историю. | Детальная taxonomy не определена до `QUOTES_ORDERS_SPEC`; неизвестный статус не угадывается. |
| FLOW-011 | Управление из админки | Уполномоченный сотрудник находит заявку, фиксирует контакт и допустимый переход с комментарием. | Запрещённый переход блокируется и логируется без изменения сущности. |
| FLOW-012 | Запрос рассрочки | Клиент получает предварительный расчёт → видит «Доступна рассрочка» → нажимает «Узнать условия» → отправляет структурированный запрос в WhatsApp. | Условия не подставляются; менеджер отвечает вручную нейтрально до закрытия `TBD-INSTALLMENT-001`–`013`. |
| FLOW-013 | Стандартный preview | Пользователь выбирает конфигурацию → сцену/освещение → положение изделия → сравнивает варианты. | Renderer/scene недоступны → конфигурация и расчёт остаются рабочими. |
| FLOW-014 | Корзина и handoff | Пользователь добавляет несколько конфигураций → редактирует состав → проверяет breakdown и бесплатные услуги → отправляет заявку в WhatsApp. | Непосчитанные позиции явно помечены; сбой handoff сохраняет корзину и безопасную повторную попытку. |

## 10. Функциональные требования

### 10.0. AMIGO functional parity и локальная автономность

- **AMIGO-PARITY-001 — MUST:** parity охватывает обнаружение категории, выбор системы/модели, размеры, материал, совместимые опции, preview, предварительную стоимость, корзину и передачу заявки; parity означает эквивалентную бизнес-возможность, а не копию интерфейса.
- **AMIGO-PARITY-002 — MUST:** PROJECT_NAME использует собственные дизайн, информационную архитектуру, frontend/backend, компоненты, анимации, mobile UX и data model.
- **AMIGO-PARITY-003 — MUST NOT:** iframe AMIGO не является основным production-конфигуратором; текущий volatile customizer URL хранится только как наблюдаемый source endpoint и research evidence.
- **AMIGO-PARITY-004 — MUST:** каждое parity-наблюдение фиксирует source URL/version, дату, выбранный контекст, состояние загрузки, ошибки и применимость к локальному бизнесу.
- **AMIGO-PARITY-005 — MUST:** отсутствие функции или данных в разрешённом source channel приводит к документированному gap, Manual Review или локальному процессу, но не к выдуманному поведению.

- **AMIGO-SYNC-001 — MUST:** сайт обслуживает клиента только из активной одобренной `CatalogVersion` в PostgreSQL и approved binaries в object storage; ни один публичный catalog/search/filter/configurator/calculation/lead/analytics flow не читает AMIGO, raw capture или staged candidate напрямую.
- **AMIGO-SYNC-002 — MUST:** [AMIGO_SYNC_ARCHITECTURE](04-technical/AMIGO_SYNC_ARCHITECTURE.md) поддерживает manual run, scheduled run после утверждения cadence, dry-run, diff preview, административное принятие/отклонение, публикацию и rollback.
- **AMIGO-SYNC-003 — MUST:** sync diff обнаруживает новые, изменённые и удалённые source entities, цену, свойства и media hash; удаление у источника не удаляет автоматически локальные сущности, local-only данные, Business Owner overlays или историю и требует явного локального решения.
- **AMIGO-SYNC-004 — MUST:** source lifecycle поддерживает `SOURCE_ACTIVE`, `SOURCE_CHANGED`, `SOURCE_REMOVED`; local lifecycle — `LOCAL_REVIEW_REQUIRED`, `LOCAL_ACTIVE`, `LOCAL_HIDDEN`, `LOCAL_ARCHIVED`.
- **AMIGO-SYNC-005 — MUST:** каждый run имеет ID, source/version, acquisition method, started/finished timestamps, counters, validation errors, actor, decision и audit reference.
- **AMIGO-SYNC-006 — MUST:** способ получения выбирается по разрешённому приоритету: официальный партнёрский канал/API при доказанном существовании → партнёрский кабинет → официальная выгрузка → разрешённый файл → разрешённая фиксация публичных страниц → ручной ввод.
- **AMIGO-SYNC-007 — MUST:** Phase 1B.2 full discovery использует существующий `AmigoCatalogSourceAdapter`, динамическую иерархию без закрытого enum, strict same-host path/pagination policy, stable source identity, item-level diagnostics и semantic source version из безопасных распознанных catalog facts; volatile scripts, form/CAPTCHA/session tokens и capture time MUST NOT создавать ложную catalog version.
- **AMIGO-SYNC-008 — MUST:** опубликованное upstream значение `0` не является допустимой неизвестной ценой: такая source entity сохраняется, получает диагностируемый `PRICE_ON_REQUEST` и никогда не публикуется как `0 ₽`; информационная category без структурированных cards сохраняется без выдуманных systems/models/materials.

### 10.1. Главная страница

- **FR-HOME-001 — MUST:** объяснять, что бизнес изготавливает и устанавливает жалюзи по индивидуальным размерам в Чеченской Республике.
- **FR-HOME-002 — MUST:** показывать основной WhatsApp `+7 963 585-10-36` без подмены другим контактом.
- **FR-HOME-003 — MUST:** иметь быстрые CTA в каталог, калькулятор, визуализатор, портфолио и заявку на замер.
- **FR-HOME-004 — MUST:** показывать срок изготовления «от 2 до 7 календарных дней, включая выходные».
- **FR-HOME-005 — MUST:** показывать гарантию 12 месяцев со дня установки и передачи изделия клиенту и давать доступ к условиям из `BUSINESS-WARRANTY-002/003` без уменьшения законных прав потребителя.
- **FR-HOME-006 — SHOULD:** выделять «Зебру»/«День-Ночь» как популярное направление со ссылкой на реальные варианты.
- **FR-HOME-007 — MUST:** контент, контакты, регион и CTA управляются настройками с audit trail.
- **FR-HOME-008 — MUST:** показывать только нейтральный текст рассрочки «Доступна рассрочка. Уточните условия у менеджера» и CTA «Узнать условия».
- **FR-HOME-009 — MUST:** указывать обслуживание всей Чеченской Республики и бесплатные замер, доставку и установку без переноса региональных условий AMIGO.
- **FR-HOME-010 — MUST:** показывать approved партнёрский бейдж AMIGO с понятной ролью партнёрства и ссылкой на актуальную карточку `PartnerRelationship` без раскрытия непубличных evidence files.

### 10.2. Каталог, материалы и варианты

- **FR-CATALOG-001 — MUST:** начальный подтверждённый baseline содержит `PRODUCT-FAMILY-001` «Рулонные жалюзи».
- **FR-CATALOG-002 — MUST:** начальный подтверждённый baseline содержит `PRODUCT-FAMILY-002` «Горизонтальные алюминиевые жалюзи».
- **FR-CATALOG-003 — MUST:** начальный подтверждённый baseline содержит `PRODUCT-FAMILY-003` «Вертикальные жалюзи».
- **FR-CATALOG-011 — MUST:** начальный подтверждённый baseline содержит `PRODUCT-FAMILY-004` «Рулонные жалюзи „Зебра“ / „День-Ночь“» как отдельное семейство.
- **FR-CATALOG-004 — MUST:** другие категории AMIGO MAY присутствовать в source registry и локальном catalog inventory, но не считаются доступными, расчётными или заказными без соответствующих локальных состояний.
- **FR-CATALOG-005 — MUST:** иерархия поддерживает `ProductFamily → ProductSystem → Material → MaterialVariant`.
- **FR-CATALOG-006 — MUST:** `MaterialVariant` связывается с `PriceCategory`, `Availability` и `MediaAssets`.
- **FR-CATALOG-007 — MUST:** `supplier_collection` является необязательным; материал без коллекции полностью работоспособен.
- **FR-CATALOG-008 — MUST:** Product System имеет собственные совместимости и технические ограничения, а не наследует вымышленные универсальные значения.
- **FR-CATALOG-009 — SHOULD:** каталог поддерживает поиск и фильтры только по реально заполненным атрибутам.
- **FR-CATALOG-010 — MUST:** скрытие/архивация позиции не уничтожает ссылки из исторических расчётов.
- **FR-CATALOG-012 — MUST:** catalog inventory охватывает все доступные через разрешённый источник текущие категории, системы, модели и варианты AMIGO; раздел 11.1 фиксирует начальный проверенный baseline и наблюдаемые source families, а каждая новая/изменённая source entity проходит snapshot, mapping, compatibility и административную проверку.
- **FR-CATALOG-013 — MUST:** сущность любого семейства имеет независимые `sourceStatus`, `publicationStatus`, `availabilityStatus`, `pricingStatus` и `orderabilityStatus`; одно состояние не выводится автоматически из другого.
- **FR-CATALOG-014 — MUST:** маркетинговое/source-название, Product Family, тип изделия, Product System, модель механизма, способ монтажа, тип корпуса/вала, материал и размер/форма ламели хранятся раздельно и связываются стабильными ID.
- **FR-CATALOG-015 — MUST:** происхождение систем, материалов и характеристик соответствует `EXTSRC-001`–`010`; изменение AMIGO не переписывает опубликованную локальную версию молча.
- **FR-CATALOG-016 — MUST:** ядро каталога не использует закрытый enum Product Family, требующий релиза кода при появлении новой категории AMIGO; категории и их иерархия являются данными с версией схемы.
- **FR-CATALOG-017 — MUST:** администратор может опубликовать, скрыть, упорядочить или архивировать категорию; задать локальное наличие, local override цены, запрет заказа или режим «Только ручной расчёт».
- **FR-CATALOG-018 — MUST:** администратор может добавить локальное описание, разрешённые фотографии выполненных работ и локальный аналог без связи с AMIGO, сохраняя различимое provenance.
- **FR-CATALOG-019 — MUST:** импорт source entity не означает автоматическое обещание наличия, цены, срока, технической совместимости или доступности заказа.
- **FR-CATALOG-020 — MUST:** source price category хранится строкой в `sourcePriceCategory`; nullable `localPriceTier` является отдельным локальным отображением и не заменяет исходный код категории.
- **FR-MATERIAL-001 — MUST:** Material Variant имеет внутренний ID, артикул и клиентское название.
- **FR-MATERIAL-002 — MUST:** вариант хранит Product Family, совместимые Product System и физический материал.
- **FR-MATERIAL-003 — MUST:** вариант MAY хранить цвет, текстуру, рисунок, светопропускание и специальные свойства, если они подтверждены источником.
- **FR-MATERIAL-004 — MUST:** вариант хранит Price Category, бинарное наличие, дату последнего обновления и административный комментарий.
- **FR-MATERIAL-005 — MUST:** вариант поддерживает фотографии и отдельное texture/reference image для визуализатора.
- **FR-MATERIAL-006 — MUST:** вариант поддерживает ширину материала и технические ограничения с обязательным источником; неизвестное значение не заполняется типовым числом.
- **FR-MATERIAL-007 — MUST:** для ткани «Зебра» поддерживаются размер плотной полосы, размер прозрачной полосы, период рисунка, прозрачность и фото на просвет.
- **FR-MATERIAL-008 — MUST:** фотографии портфолио не назначаются texture/reference image автоматически.
- **FR-MATERIAL-009 — MUST:** внешняя каталожная модель материала содержит `supplier`, `sourceMaterialId`, `sourceUrl`, `productFamily`, `compatibleSystems`, `materialName`, `materialCode`, `colorName`, `normalizedColor`, опубликованный `composition`, `textureType`, `patternType`, `transparencyClass`, `blackoutFlag`, `zebraFlag`, `lamellaWidthMm`, `materialWidthMm`, `density`, `specialProperties`, `sourcePriceFrom`, `sourcePriceContext`, `localSalePrice`, `availability`, `sourcePriceCategory`, nullable `localPriceTier`, `sourceImageReference`, `localLicensedImage`, `rightsStatus`, `lastVerifiedAt` и `publicationStatus`.
- **FR-MATERIAL-010 — MUST:** для внешних материалов `supplier = AMIGO`; неизвестные физические свойства остаются пустыми и не выводятся из фото или названия.
- **FR-MATERIAL-011 — MUST:** материал не публикуется без локального разрешённого изображения, связанного с правильным `MaterialVariant`, имеющего `rightsStatus = PARTNER_LICENSE` или иное допустимое основание и `publicationStatus = PUBLICATION_APPROVED`.
- **FR-MATERIAL-012 — MUST:** `sourceImageReference` используется только как provenance/reference; правила импорта, атрибуции, AI и удаления задаёт [ASSET_RIGHTS_REGISTER.md](../00-global/ASSET_RIGHTS_REGISTER.md).
- **FR-MATERIAL-013 — MUST:** property vocabulary допускает подтверждённые значения цвета, transparency/blackout, структуры, фактуры, блеска, вуали, гладкости, жаккарда, жемчуга, матовости, меланжа, мелкой фактуры, имитации натурального материала, принта, люрекса, рисунка и его типа, indoor/wet-room suitability, светоотражающего слоя, состава, ширины, плотности, специальных свойств, совместимости, наличия и price-on-request.
- **FR-MATERIAL-014 — MUST:** неизвестное свойство остаётся отсутствующим; оно не выводится из фотографии, маркетингового названия или сходства с другим материалом.
- **FR-VARIANT-001 — MUST:** source price category является динамической строкой и MAY принимать опубликованные AMIGO значения, включая `E`, `0`, `1`, `2`, `3`, `4`, `5`, без закрытого enum; значение относится к конкретному Material Variant и source context.
- **FR-VARIANT-002 — MUST:** Price Category нельзя автоматически выводить из светопропускания, состава или другого свойства ткани.
- **FR-VARIANT-003 — SHOULD:** локальные клиентские tier labels MAY задаваться через nullable `localPriceTier`; названия «Базовая», «Стандарт», «Комфорт», «Премиум», «Эксклюзив» используются только после подтверждения `ASM-019` и не подменяют source code.
- **FR-VARIANT-004 — MUST:** цвет материала и Hardware Color являются разными параметрами конфигурации.
- **FR-VARIANT-005 — MUST:** доступны Hardware Color `HARDWARE_COLOR_WHITE` («Белый»), `HARDWARE_COLOR_BROWN` («Коричневый»), `HARDWARE_COLOR_GOLDEN_OAK` («Золотой дуб»).
- **FR-VARIANT-006 — MUST:** ни один Hardware Color не считается совместимым со всеми Product System без явного правила.
- **FR-VARIANT-007 — MUST:** фильтры материалов строятся из фактически импортированных нормализованных свойств и доступных значений, а не из захардкоженного универсального списка.

### 10.3. Наличие

- **FR-INVENTORY-001 — MUST:** MVP использует только `IN_STOCK` и `OUT_OF_STOCK`.
- **FR-INVENTORY-002 — MUST:** клиентская подпись `IN_STOCK` — «Материал доступен».
- **FR-INVENTORY-003 — MUST:** клиентская подпись `OUT_OF_STOCK` — «Временно нет в наличии».
- **FR-INVENTORY-004 — MUST:** наличие относится к материалу/ламели, механизму или фурнитуре, а не к готовому изделию по индивидуальному размеру.
- **FR-INVENTORY-005 — MUST:** клиент не видит точное количество рулонов, длину или число комплектующих в MVP.
- **FR-INVENTORY-006 — MUST:** каждое изменение наличия фиксирует автора, время, основание и предыдущий/новый статус.
- **FR-INVENTORY-007 — SHOULD:** при устаревшем или неизвестном источнике система не показывает `IN_STOCK` по умолчанию.
- **FR-INVENTORY-008 — MUST:** расчёт сохраняет snapshot статуса наличия, но перед заявкой система повторно показывает актуальный статус.
- **FR-INVENTORY-009 — MUST:** подтверждённое Business Owner локальное наличие, записанное через авторизованный admin/PostgreSQL workflow, является authoritative local status; предложенное AMIGO значение хранится отдельно и не перезаписывает его автоматически.

### 10.3.1. Собственный конфигуратор

- **FR-CONFIG-001 — MUST:** конфигуратор последовательно позволяет выбрать Product Family, Product System, Product Model, mounting method, width/height, quantity, Material Variant, Hardware Color, control side/type и совместимые дополнительные опции.
- **FR-CONFIG-002 — MUST:** список материалов поддерживает поиск и фильтры по фактически доступным свойствам; выбор материала автоматически подставляет source price category, совместимые системы, цену/price-on-request, ограничения и свойства.
- **FR-CONFIG-003 — MUST:** конфигуратор показывает размерные и compatibility ошибки до добавления в корзину и не предлагает несовместимое значение как доступное.
- **FR-CONFIG-004 — MUST:** пользователь видит preliminary price и breakdown, если существует активная подтверждённая `PriceVersion`; иначе получает `PRICE_ON_REQUEST` или `REQUIRES_MANUAL_REVIEW` с безопасным следующим шагом.
- **FR-CONFIG-005 — MUST:** конфигурацию можно добавить в корзину, дублировать, редактировать, удалить, сохранить в проекте и передать в один из двух visualizer flows без потери stable IDs.
- **FR-CONFIG-006 — MUST:** состояние конфигуратора восстанавливается после безопасного retry и не стирает валидные шаги из-за ошибки одного материала, изображения или price provider.
- **FR-CONFIG-007 — MUST:** мобильный интерфейс сохраняет порядок шагов, доступность поиска/фильтров, числовой ввод и редактирование корзины без горизонтального скролла основного контента.
- **FR-CONFIG-008 — MUST:** интерфейс не раскрывает внутреннюю source price category как обязательный для понимания клиентом выбор.

### 10.4. Калькулятор и цена

- **FR-CALC-001 — MUST:** калькулятор выполняет нормативные правила на сервере; клиентский preview не является источником цены.
- **FR-CALC-002 — MUST:** входы позиции поддерживают Product Family, Product System, конкретный Material Variant, widthMm, heightMm, quantity, способ монтажа, Hardware Color, дополнительные опции, идентификатор окна и отдельное изделие для каждой выбранной створки; Price Category и source context подставляются из проверенного каталога.
- **FR-CALC-003 — MUST:** ширина и высота хранятся целыми миллиметрами; дробный ввод обрабатывается только после решения `TBD-DIM-005`.
- **FR-CALC-004 — MUST:** денежные значения хранятся целыми копейками без `float`; 1500 рублей представляются как 150000 копеек.
- **FR-CALC-005 — MUST:** клиентское название результата — «Предварительная стоимость».
- **FR-CALC-006 — MUST:** расчёт поддерживает добавление, копирование, переименование, изменение и удаление нескольких окон/позиций.
- **FR-CALC-007 — MUST:** каждая позиция имеет собственные размеры, систему, материал, фурнитуру, количество и price breakdown.
- **FR-CALC-008 — MUST:** общий итог не включает позицию без подтверждённого правила и явно показывает её как требующую проверки.
- **FR-CALC-009 — MUST:** минимальная стоимость 1500 рублей применяется отдельно к каждой изготавливаемой единице изделия до умножения/суммирования заказа по `OWNER-DECISION-003`; правило не реализуется в Phase 1A и не активируется до закрытия остальных pricing gates.
- **FR-CALC-010 — MUST:** тарифы, округление, Billable Area, формулы горизонтальных/вертикальных систем и надбавки не активируются до закрытия соответствующих `TBD-PRICE-*`.
- **FR-CALC-011 — MUST:** если размер выходит за подтверждённые ограничения или ограничения отсутствуют, позиция получает `REQUIRES_MANUAL_REVIEW` вместо выдуманной точной цены.
- **FR-CALC-012 — MUST:** при Manual Review показывается: «Размер требует проверки мастером. Отправьте данные в WhatsApp, и мы рассчитаем стоимость вручную».
- **FR-CALC-013 — MUST:** интерфейс не использует фразы «любые размеры без ограничений», «подходит для любого окна» или «система не имеет максимальных размеров».
- **FR-CALC-014 — MUST:** строки «Замер», «Доставка» и «Установка» показываются отдельно со значением `0` рублей и подписью «Бесплатно».
- **FR-CALC-015 — MUST:** бесплатные услуги не считаются частью стоимости механизма и применяются к подтверждённому ассортименту на всей территории обслуживания из `BUSINESS-REGION-001`.
- **FR-CALC-016 — MUST:** Price Category выбранного Material Variant подставляется автоматически и не выбирается клиентом отдельно.
- **FR-CALC-017 — SHOULD:** результат объясняет исходные параметры, применённые правила, скидки/надбавки и округления после их утверждения.
- **FR-CALC-018 — MUST:** повторный расчёт с новыми ценами создаёт новую ревизию, а не изменяет сохранённый результат.
- **FR-CALC-019 — MUST:** базовая предварительная цена и её provenance управляются [PRICING_SOURCE_POLICY.md](../00-global/PRICING_SOURCE_POLICY.md) и требованиями `PRICING-SOURCE-001`–`007`.
- **FR-CALC-020 — MUST:** новый расчёт использует только активную подтверждённую `PriceVersion`; недоступность AMIGO приводит к подтверждённой локальной версии, Manual Quote или тексту «Стоимость требует уточнения».
- **FR-CALC-021 — MUST:** calculation snapshot сохраняет source version, город/регион, систему, материал/артикул, размеры, монтаж, опции, исходную цену, локальные правила, валюту и административный статус проверки.
- **FR-CALC-022 — MUST NOT:** клиентский запрос цены не зависит синхронно от доступности публичного сайта AMIGO и не обращается к неподтверждённому внешнему API.
- **FR-CALC-023 — MUST:** для первой версии `localPrice = sourceAmigoPrice` из активного проверенного snapshot, если отсутствует утверждённый `LocalOverride`; правило не превращает публичную «цену от» в точную цену конфигурации.
- **FR-CALC-024 — MUST:** `LocalOverride` MAY задавать фиксированную цену, процентную надбавку/скидку, minimum, ручной режим или price-on-request с периодом действия и audit; неподтверждённое правило не активируется.

### 10.5. Сохранённые расчёты и предложения

- **FR-SAVED-001 — MUST:** сохранённый расчёт имеет стабильный ID, владельца/guest-token, timestamps и статус.
- **FR-SAVED-002 — MUST:** сохраняются нормализованные входы, выбранные ID, source/price versions, price breakdown, локальные правила, итог и валюта.
- **FR-SAVED-003 — MUST:** исторический расчёт остаётся читаемым после архивирования каталожной позиции.
- **FR-SAVED-004 — MUST:** истёкший прайс-лист не меняет снимок, но UI предупреждает перед новой заявкой.
- **FR-SAVED-005 — MUST:** ссылка гостя непредсказуема, ограничена сроком и не индексируется.
- **FR-SAVED-006 — MUST:** присоединение гостевого расчёта к аккаунту требует подтверждения владения.
- **FR-SAVED-007 — MAY:** пользователь создаёт проект из нескольких расчётов/вариантов после выбора модели аккаунта.

### 10.6. Визуализатор

- **FR-VIS-001 — MUST:** принимать пользовательское фото только после понятного уведомления о приватности и сроке хранения.
- **FR-VIS-002 — MUST:** валидировать формат, фактический тип, размер, декодируемость и ориентацию до постановки в обработку.
- **FR-VIS-003 — MUST:** pipeline обнаружения/сегментации автоматически предлагает одну или несколько областей окна и применимые маски с confidence, не скрывая неопределённость.
- **FR-VIS-004 — MUST:** позволять выбрать найденное окно и отдельные створки.
- **FR-VIS-005 — MUST:** позволять создать/исправить область ручным перемещением четырёх углов.
- **FR-VIS-006 — MUST:** сохранять исходные координаты, пользовательскую геометрию и её ревизии независимо от AI-провайдера.
- **FR-VIS-007 — MUST:** выполнять детерминированный геометрический рендер выбранного Material Variant с коррекцией перспективы.
- **FR-VIS-008 — MUST:** позволять регулировать высоту полотна в допустимой геометрии.
- **FR-VIS-009 — MUST:** поддерживать отдельные полотна/маски для выбранных створок.
- **FR-VIS-010 — MUST:** для «Зебры» моделировать чередование плотных/прозрачных полос из подтверждённых параметров варианта и регулировать их взаимное положение для режимов «День»/«Ночь».
- **FR-VIS-011 — MUST:** texture/reference image связано с известным артикулом, цветом и Price Category.
- **FR-VIS-012 — MUST:** поддерживать маски окна, рамы и окклюзий; ручная маска сохраняется как отдельная производная.
- **FR-VIS-013 — MUST:** AI/generative refinement является опциональным слоем после геометрического результата.
- **FR-VIS-014 — MUST:** внешний image provider доступен только через adapter и не влияет на доменные правила товара/цены.
- **FR-VIS-015 — MUST:** AI не изменяет мебель, стены, потолок, форму комнаты, оконную раму, ручки, число створок или посторонние объекты.
- **FR-VIS-016 — MUST:** refinement не меняет выбранный артикул, Hardware Color, число полотен и пользовательскую геометрию.
- **FR-VIS-017 — MUST:** при недоступном AI сохранять и отдавать геометрический результат с понятным сообщением.
- **FR-VIS-018 — MUST:** сравнение «до/после» использует одинаковое кадрирование и не подменяет исходник.
- **FR-VIS-019 — MAY:** пользователь сохраняет несколько вариантов одного фото для сравнения.
- **FR-VIS-020 — MUST:** исходник, preview, маски, geometry render и refinement имеют происхождение и отдельные lifecycle states.
- **FR-VIS-021 — MUST:** горизонтальные/вертикальные жалюзи не обещаются в первом visualizer scope до отдельного quality gate.
- **FR-VIS-022 — MUST:** результат содержит disclosure о приблизительности цвета/фактуры и необходимости реального образца/замера.

### 10.6.1. Стандартный интерьерный preview

- **FR-STANDARD-PREVIEW-001 — MUST:** стандартный preview не принимает пользовательское фото и не требует генеративной AI-модели; одинаковая конфигурация и версия renderer дают детерминированный результат.
- **FR-STANDARD-PREVIEW-002 — MUST:** подготовленные сцены MAY включать окно крупным планом, гостиную, спальню, кухню, офис, светлый и тёмный интерьер; каждая опубликованная сцена имеет provenance и права.
- **FR-STANDARD-PREVIEW-003 — MUST:** пользователь может переключать сцену, дневное/вечернее освещение, масштаб, положение изделия и высоту открытия без изменения выбранного Material Variant.
- **FR-STANDARD-PREVIEW-004 — MUST:** renderer отображает применимые цвет, texture, transparency/blackout, Zebra-полосы, lamella geometry, короб, направляющие и цепочку только из подтверждённых полей конфигурации.
- **FR-STANDARD-PREVIEW-005 — MUST:** сравнение вариантов использует одну сцену, камеру и освещение, чтобы различие относилось к выбранной конфигурации.
- **FR-STANDARD-PREVIEW-006 — MUST:** ошибка сцены или renderer не блокирует конфигуратор, предварительный расчёт или передачу заявки.
- **FR-STANDARD-PREVIEW-007 — MUST:** результат явно называется демонстрационным preview и не выдаётся за фотографию работы бизнеса или точную цветопробу.
- **FR-STANDARD-PREVIEW-008 — MUST:** стандартный preview и примерка на фото клиента имеют разные data classes, privacy rules, analytics events и acceptance criteria.

- **FR-AI-VIS-001 — MUST:** примерка на фото клиента создаёт минимум `GEOMETRIC_PREVIEW`; optional `AI_REFINED_PREVIEW` является отдельной производной и не заменяет геометрический результат.

### 10.7. Заявки, замеры и заказы

- **FR-LEAD-001 — MUST:** заявка может быть создана из расчёта, визуализации, запроса звонка или запроса замера.
- **FR-LEAD-002 — MUST:** основное направление заявки — подтверждённый WhatsApp из `BUSINESS-CONTACT-001`; конкретный integration mode зависит от `TBD-INFRA-006`.
- **FR-LEAD-003 — MUST:** перед отправкой пользователь видит передаваемые контактные и конфигурационные данные.
- **FR-LEAD-004 — MUST:** WhatsApp payload содержит краткое резюме и безопасную ссылку, а не публичный URL фотографии.
- **FR-LEAD-005 — MUST:** минимальные статусы заявки: `CREATED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` с русскими подписями.
- **FR-LEAD-006 — MUST:** каждое изменение статуса заявки сохраняет автора, время и основание.
- **FR-LEAD-007 — MUST:** срок изготовления отображается как 2–7 календарных дней, включая выходные.
- **FR-LEAD-008 — MUST:** гарантия отображается как 12 месяцев со дня установки и передачи изделия; покрытие и исключения соответствуют `BUSINESS-WARRANTY-002/003`, а неподтверждённый порядок обращения не придумывается.
- **FR-WARRANTY-001 — MUST:** клиенту доступна гарантийная политика с подтверждёнными покрытием, исключениями и указанием, что она не уменьшает обязательные права потребителя по применимому законодательству.
- **FR-WARRANTY-002 — MUST:** система MUST NOT автоматически назначать причину повреждения, отказывать в гарантии или классифицировать случай только по тексту/фото клиента; при необходимости обращение направляется на осмотр или проверку качества.
- **FR-WARRANTY-003 — MUST:** результат рассмотрения хранит обращение, проверявшую роль, дату, установленные факты, решение и основание без выдуманного автоматического диагноза.
- **FR-WARRANTY-004 — MUST:** канал обращения, документы, сроки проверки и способы удовлетворения требований не утверждаются до закрытия `TBD-WARRANTY-001` и применимой юридической проверки.
- **FR-MEASURE-001 — MUST:** клиент может запросить бесплатный замер и указать минимально необходимые контакт/адрес с согласием.
- **FR-MEASURE-002 — MUST:** бесплатный замер доступен на всей обслуживаемой территории Чеченской Республики для подтверждённого ассортимента.
- **FR-MEASURE-003 — SHOULD:** концептуальные состояния замера — `REQUESTED`, `SCHEDULED`, `COMPLETED`, `CANCELLED`; границы и неподтверждённые переходы описаны в [CART_CHECKOUT_ORDERS_SPEC.md](02-domain/CART_CHECKOUT_ORDERS_SPEC.md).
- **FR-MEASURE-004 — MUST:** подтверждённый замер не перезаписывает пользовательские размеры; создаётся новая проверенная ревизия.
- **FR-ORDER-001 — MUST:** заявка, расчёт, замер и заказ являются разными сущностями со ссылками между ними.
- **FR-ORDER-002 — MUST:** заказ не создаётся автоматически только из факта расчёта или сообщения WhatsApp.
- **FR-ORDER-003 — MUST:** предложенная модель статусов и переходов находится в [CART_CHECKOUT_ORDERS_SPEC.md](02-domain/CART_CHECKOUT_ORDERS_SPEC.md), но не получает implementation approval до закрытия указанных business TBD.
- **FR-ORDER-004 — MUST:** отсутствие подтверждённого перехода не разрешает UI придумывать этап производства; используется безопасный общий статус или ручное уточнение.
- **FR-ORDER-005 — SHOULD:** клиент видит только разрешённую внешнюю историю, а внутренние комментарии остаются внутренними.

### 10.7.1. Корзина и гостевое оформление

- **FR-CART-001 — MUST:** корзина содержит одну или несколько конфигураций с независимыми stable IDs, размерами, материалами, артикулами, количеством, price status и visualizer links.
- **FR-CART-002 — MUST:** пользователь может изменить количество, открыть редактирование конфигурации, дублировать и удалить позицию без потери остальных позиций.
- **FR-CART-003 — MUST:** общая сумма включает только рассчитанные позиции и отдельно показывает `PRICE_ON_REQUEST`/`REQUIRES_MANUAL_REVIEW`; неизвестная позиция не превращается в `0`.
- **FR-CART-004 — MUST:** гостевой handoff доступен без обязательной регистрации и собирает только минимально необходимые контактные данные с применимыми consent/disclosure.
- **FR-CART-005 — MUST:** перед отправкой показываются номер расчёта, состав заказа, системы, материалы/артикулы, размеры, количество, preliminary price, бесплатные услуги, срок 2–7 календарных дней, гарантия 12 месяцев и neutral installment CTA.
- **FR-CART-006 — MUST:** WhatsApp payload использует `BUSINESS-CONTACT-001`, безопасную ссылку на конфигурацию и при явном действии ссылку на приватную визуализацию; публичный URL пользовательского фото запрещён.
- **FR-CART-007 — MUST:** отправка заявки не создаёт заказ автоматически; расчёт, cart, lead, measurement request и order остаются разными сущностями.

### 10.8. Рассрочка

- **FR-INSTALLMENT-001 — MUST:** минимальный MVP-сценарий начинается только после получения «Предварительной стоимости» и показывает отметку «Доступна рассрочка» с действием «Узнать условия».
- **FR-INSTALLMENT-002 — MUST:** до закрытия `TBD-INSTALLMENT-001`–`013` единственная разрешённая коммерческая формулировка — «Доступна рассрочка. Уточните условия у менеджера».
- **FR-INSTALLMENT-003 — MUST NOT:** запрещено обещать «0%», «без переплат», конкретный срок, одобрение каждому клиенту или отсутствие первоначального взноса.
- **FR-INSTALLMENT-004 — MUST:** WhatsApp payload запроса содержит номер расчёта, сумму, выбранные изделия, размеры, имя клиента при его вводе и явный запрос на рассрочку.
- **FR-INSTALLMENT-005 — MUST:** менеджер сообщает условия вручную; MVP не принимает кредитное решение, не оформляет заявку во внешней кредитной организации и не подписывает договор онлайн.
- **FR-INSTALLMENT-006 — MUST:** организация, срок, взнос, проценты/переплата, требования, minimum, документы, возраст, досрочная оплата, сторона договора, обработка персональных данных, порядок заявки и доступность по населённым пунктам остаются неизвестными до связанных `TBD-INSTALLMENT-*`.

### 10.9. Аккаунты

- **FR-AUTH-001 — MUST:** каталог, конфигуратор, стандартный preview, примерка на фото, расчёт, корзина и отправка заявки доступны гостю без обязательной регистрации.
- **FR-AUTH-002 — MUST:** клиентская и административная аутентификация имеют раздельные политики и точки входа по `ASM-003`.
- **FR-AUTH-003 — MUST:** зарегистрированный клиент видит только собственные проекты, фото и подтверждённо связанные заказы.
- **FR-AUTH-004 — MUST:** внутренние роли используют least privilege и deny-by-default.
- **FR-AUTH-005 — MUST:** чувствительные административные действия требуют свежей/усиленной аутентификации после security design.
- **FR-AUTH-006 — MUST:** восстановление доступа не раскрывает существование чужого аккаунта или заказа.
- **FR-AUTH-007 — MUST:** базовый MVP-кабинет поддерживает собственные сохранённые расчёты. Расширенные проекты, повторные заказы, сохранённые визуализации, избранное, полная история статусов, адреса и CRM-функции требуют отдельного post-MVP scope decision.
- **FR-AUTH-008 — MUST:** наличие кабинета не меняет и не блокирует гостевой путь каталога, конфигуратора, preview, расчёта, корзины и заявки.

### 10.10. Портфолио

- **FR-PORTFOLIO-001 — MUST:** Business Owner определяет состав локального портфолио из подтверждённых работ бизнеса; конкретная фотография публикуется только после проверки provenance, прав/согласий, PII и asset-level `PUBLICATION_APPROVED`.
- **FR-PORTFOLIO-002 — MUST:** исходные файлы работ не удаляются в рамках подготовки публикационной версии.
- **FR-PORTFOLIO-003 — MUST:** обработанные версии хранятся отдельно и имеют связь с исходником.
- **FR-PORTFOLIO-004 — MUST:** отсутствие подтверждённых оригиналов без водяных знаков не компенсируется удалением водяных знаков или вымышленным исходником.
- **FR-PORTFOLIO-005 — MUST:** пользовательское фото окна не попадает в портфолио без отдельного, доказуемого согласия клиента.
- **FR-PORTFOLIO-006 — SHOULD:** работа имеет alt-text, тип изделия и только подтверждённые подписи; точный адрес не публикуется.
- **FR-PORTFOLIO-007 — MUST:** публикация любого портфолио-актива проходит asset-level gate [ASSET_RIGHTS_REGISTER.md](../00-global/ASSET_RIGHTS_REGISTER.md); пример AMIGO не может выдаваться за работу бизнеса.

### 10.11. Админ-панель и настройки

- **FR-ADMIN-001 — MUST:** управлять Product Family/System, материалами, Material Variant и публикацией.
- **FR-ADMIN-002 — MUST:** управлять совместимостью систем, материалов и Hardware Color.
- **FR-ADMIN-003 — MUST:** назначать Price Category варианту без массового автоматического вывода из свойств.
- **FR-ADMIN-004 — MUST:** изменять бинарное наличие с причиной и audit log.
- **FR-ADMIN-005 — MUST:** создавать draft версии прайс-листа, валидировать и активировать их отдельным действием; активация доступна только `OWNER` или `ADMIN` после просмотра diff и подтверждения.
- **FR-ADMIN-006 — MUST:** опубликованная версия цены неизменяема; исправление создаёт новую версию.
- **FR-ADMIN-007 — MUST:** управлять заявками в минимальном lifecycle и видеть связанную конфигурацию.
- **FR-ADMIN-008 — SHOULD:** после профильной спеки управлять замерами и заказами в пределах роли.
- **FR-ADMIN-009 — MUST:** управлять портфолио, главной страницей, контактами, регионом и disclosure-текстами.
- **FR-ADMIN-010 — MUST:** опасное удаление заменяется архивированием, если сущность используется историей.
- **FR-ADMIN-011 — MUST:** административные комментарии и закупочные данные не выводятся клиенту.
- **FR-ADMIN-012 — MUST:** UI показывает источник и свежесть коммерческого/технического поля.
- **FR-ADMIN-013 — MUST:** массовые операции имеют preview, scope, подтверждение и отчёт об ошибках.
- **FR-ADMIN-014 — MUST:** администратор видит provenance, source snapshot, verification status, local override и историю активации внешних каталожных и ценовых данных.
- **FR-ADMIN-015 — MUST:** публикация материала и медиа блокируется без `PUBLICATION_APPROVED`; approval прав отделён от наличия и цены.
- **FR-ADMIN-016 — MUST:** администратор может перевести источник/версию в `STALE` или `REJECTED` без изменения исторических расчётов.
- **FR-ADMIN-017 — MUST:** отдельный экран AMIGO sync показывает источник и версию, время последнего run, новые/изменённые/удалённые сущности, price/media changes, ошибки, dry-run diff и действия принять, отклонить, опубликовать и откатить.
- **FR-ADMIN-018 — MUST:** администратор управляет `PartnerRelationship`, permission scope, badge asset, brand usage notes и evidence reference в пределах отдельного permission; изменение не переписывает историческую запись подтверждения.
- **FR-ADMIN-019 — MUST:** права на активы, publication approval, наличие, pricing и orderability имеют независимые административные controls и фильтры.
- **FR-ADMIN-020 — MUST:** администратор может перевести категорию или позицию в manual calculation/order blocked без удаления source data или исторических ссылок.
- **FR-ADMIN-021 — MUST:** все попытки и успешные активации `PriceVersion` фиксируются в audit log с actor, diff/version, confirmation, outcome и correlation ID.
- **FR-SETTINGS-001 — MUST:** сайт хранит версионируемые контакты, регион обслуживания, срок изготовления и гарантийный срок.
- **FR-SETTINGS-002 — MUST:** настройки бесплатных услуг разделены по услуге, но их подтверждённое значение для всей обслуживаемой территории равно `0` рублей; изменение бизнес-смысла требует нового решения владельца.
- **FR-SETTINGS-003 — MUST:** privacy/consent тексты версионируются с датой вступления в силу.
- **FR-SETTINGS-004 — MUST:** feature flags MAY отключать AI/refinement без отключения геометрического визуализатора и калькулятора.
- **FR-SETTINGS-005 — MUST:** нейтральный текст рассрочки и WhatsApp-контакт версионируются; администратор не может опубликовать неподтверждённые финансовые обещания без нового нормативного решения.

### 10.12. Аналитика

- **FR-ANALYTICS-001 — MUST:** аналитика не получает фото, маски, object keys, приватные share tokens, телефон или свободный текст заявки.
- **FR-ANALYTICS-002 — MUST:** события используют анонимный session/project ID и версию event schema.
- **FR-ANALYTICS-003 — MUST:** consent-required события не отправляются до соответствующего согласия.
- **FR-ANALYTICS-004 — SHOULD:** админ видит воронку, ошибки калькуляции/визуализации, свежесть данных и обращения без доступа к лишним персональным данным.
- **FR-ANALYTICS-005 — MUST:** определение каждой метрики фиксирует событие, знаменатель, исключения, владельца и качество данных.

## 11. Концептуальные модели

### 11.1. Каталог

Каноническая source/domain цепочка: **Supplier → PartnerRelationship → SourceCatalog → ProductFamily → ProductType → ProductSystem → ProductModel → ProductConfiguration**. `MountingType`, `ControlType`, `Material`, `MaterialVariant`, `MaterialProperty`, `Color`, `Pattern`, `Texture`, `Composition`, `TransparencyClass`, `HardwareOption`, `OptionGroup`, `OptionValue`, `CompatibilityRule`, `DimensionConstraint`, `AvailabilityRecord`, `PriceCategory`, `PriceRule`, `PriceSnapshot`, `MediaAsset`, `SourceAsset`, `LocalOverride`, `PublicationState`, `CatalogSyncRun` и `CatalogSyncDifference` моделируются раздельно и связываются stable UUID. `supplier_collection` — необязательная группировка, не обязательный уровень. Детализация выполняется в `CATALOG_INVENTORY_SPEC.md` по [roadmap](../00-global/SPEC_ROADMAP.md).

Нормализованные измерения каталога:

| Измерение | Смысл |
|---|---|
| `Supplier` | Поставщик/источник; для AMIGO-source entities значение `AMIGO` |
| `PartnerRelationship` | Версионируемый партнёрский статус, permission scope, badge и evidence metadata из `PARTNER-001`–`007` |
| `SourceCatalog` | Версия разрешённого внешнего каталога или иного source channel |
| `ProductFamily` | Динамическая верхнеуровневая категория; не материал и не способ монтажа |
| `SourceCatalogEntity` | Точное изменяемое название/ID AMIGO с provenance; MAY быть составным маркетинговым названием |
| `ProductSystem` | Стабильная локальная конструктивная система, связанная с одной или несколькими source entities |
| `ProductModel` | Конкретная модель/линейка внутри системы, отделённая от маркетингового title |
| `ProductType` | Конструктивный/материальный тип внутри семейства; не рекламное название |
| `MechanismModel` | MINI, ROLLA, UNI, BENTHIN, AMG, MG, LVT или иная подтверждённая модель/линейка; точная декомпозиция требует source mapping |
| `MountingMethod` | На оконную раму, в проём или на проём; хранится отдельно от системы |
| `ShaftEnclosureType` | Открытый или закрытый вал, когда применимо |
| `LamellaSpec` | Ширина/форма ламели или ленты, когда применимо |
| `MarketingLabel` | Клиентское или source-название, которое не является ключом совместимости |

Составное source-название с `/`, словом «Кассета», размером или способом установки MUST сохраняться в `sourceTitle`, а его нормализованные части — в отдельных связанных полях. До проверки mapping оно не разрезается догадкой.

Начальный проверенный baseline source/catalog entities четырёх семейств:

| Product Family ID | Семейство | Поддерживаемые системы/типы | Отдельные нормализованные параметры |
|---|---|---|---|
| `PRODUCT-FAMILY-001` | Рулонные жалюзи | `MINI`; `ROLLA`; `MINI / ROLLA`; `UNI1`; `UNI2`; `UNI1 / UNI2`; `ROLLA Кассета`; `BENTHIN Классика`; `BENTHIN Кассета`; `BENTHIN M`; `BENTHIN M+`; `BENTHIN L`; `AMG Классика`; `AMG Кассета`; `MG`; `ROLLA 25`; `MG / ROLLA 25` | вал: открытый/закрытый; монтаж: на раму/в проём/на проём |
| `PRODUCT-FAMILY-004` | «Зебра» / «День-Ночь» | `Mini-зебра`; `UNI 1-зебра`; `UNI 2-зебра`; `Классика LVT-зебра`; `Кассета LVT-зебра`; `специальные модели LVT-зебра` | монтаж: на оконную раму/в проём/на проём |
| `PRODUCT-FAMILY-002` | Горизонтальные алюминиевые жалюзи | алюминиевая горизонтальная система; точная source entity сохраняется отдельно | лента 16 мм; 25 мм; 50 мм; «Волна» 35 мм |
| `PRODUCT-FAMILY-003` | Вертикальные жалюзи | тканевые; «Бриз»; пластиковые; алюминиевые; мультифактурные | размер ламели не угадывается и остаётся source-backed полем |

Публичные страницы и текущий JavaScript customizer AMIGO на 2026-08-02 дополнительно показывают категории/направления ZIP/LOCK, готовые решения, интерьерные ставни, римские шторы, классические портьеры, плиссе, гофре, горизонтальные деревянные жалюзи, «Мираж», моторизованные и мансардные системы, шторные карнизы и LIFT. Они MUST регистрироваться динамически; их наличие у источника не означает локальное наличие, pricing readiness, visualizer support или автоматическую публикацию.

Для каждой внешней сущности дополнительно хранятся `supplier`, `sourceId`, `sourceSlug`, `sourceUrl`, `sourceTitle`, `sourceCategory`, `sourceUpdatedAt`, `capturedAt`, `lastVerifiedAt`, `sourceHash`, `sourceStatus` и `localStatus`.

Технические границы `ProductSystem` включают `minimumWidthMm`, `maximumWidthMm`, `minimumHeightMm`, `maximumHeightMm`, `maximumAreaM2`, ограничения материала и provenance. Пока конкретное значение не подтверждено источником и администратором, конфигурация не считается универсально допустимой.

### 11.2. Остатки

Концептуальные сущности: Stock Item (материал/ламель/механизм/фурнитура), Location, optional Batch/Roll, Stock Movement, Reservation и публичный Availability.

Физические единицы, источник правды, партии и резервы определяются `TBD-INVENTORY-*`. MVP MAY хранить внутренние количества, но публично выдаёт только два утверждённых статуса.

### 11.3. Прайс-листы и правила расчёта

Концептуальные сущности: `SourcePriceSnapshot`, immutable `PriceVersion`, `PriceCategory`, `PriceRule`, `LocalPricingRule`, `LocalOverride`, `ServiceLine`, `QuoteCalculation`, `QuoteItem`, `PriceBreakdown` и `PricingProvider`. `PriceCategory` сохраняет `sourcePriceCategory: string` и nullable `localPriceTier: string`; опубликованные source codes не ограничиваются диапазоном 1–5. Канонические provenance, versioning, fallback и audit правила находятся в [PRICING_SOURCE_POLICY.md](../00-global/PRICING_SOURCE_POLICY.md), а boundary формулы и acceptance cases — в [PRICING_CALCULATOR_SPEC.md](02-domain/PRICING_CALCULATOR_SPEC.md). Сама формула остаётся `BLOCKED_BY_TBD`.

Формула площади × тариф, округления, минимальная оплачиваемая площадь и надбавки не считаются подтверждёнными только потому, что они типичны. `ASM-020` заменено source-based моделью. До получения разрешённых данных и контрольных примеров автоматический расчёт MUST использовать только активную подтверждённую версию или безопасный Manual Review.

- **FR-PRICE-001 — MUST:** AMIGO является основным внешним источником базовой предварительной цены, но клиентский расчёт использует локально зафиксированную, проверенную и активную `PriceVersion`.
- **FR-PRICE-002 — MUST:** каждое внешнее значение и локальное правило имеет ID, версию, область действия, приоритет, входы, происхождение, результат и тестовые примеры после их получения.
- **FR-PRICE-003 — MUST:** опубликованная `PriceVersion` неизменяема и имеет автора, время публикации, source versions и статус; срок предложения не назначается до `TBD-PRICE-008`.
- **FR-PRICE-004 — MUST:** calculation snapshot содержит ID версии, source/region context, все входы, применённые snapshots и локальные правила, промежуточные значения, округления и итог в копейках с валютой.
- **FR-PRICE-005 — MUST:** изменение текущей версии не влияет на прошлый snapshot.
- **FR-PRICE-006 — MUST:** предложение не пересчитывается молча после изменения цены или истечения будущего утверждённого срока; создаётся новая явная ревизия.
- **FR-PRICE-007 — MUST:** ручная корректировка подтверждённой цены хранит исходную сумму, новую сумму, причину и автора.
- **FR-PRICE-012 — MUST:** active pointer `PriceVersion` может изменить только actor `OWNER` или `ADMIN` после просмотра exact diff и явного подтверждения; операция атомарна и аудируется.

### 11.4. Предварительная и подтверждённая цена

- **FR-PRICE-008 — MUST:** «Предварительная стоимость» сопровождается указанием, что финальная цена может зависеть от проверки размеров и условий.
- **FR-PRICE-009 — MUST:** подтверждённая цена создаётся только уполномоченной ролью после проверки применимых данных.
- **FR-PRICE-010 — MUST:** различие предварительной и подтверждённой цены имеет категоризированную причину, видимую согласно роли.
- **FR-PRICE-011 — MUST:** бесплатные строки остаются в breakdown и не исчезают из-за нулевой суммы.

## 12. Точность, ограничения и ошибки визуализатора

### 12.1. Требования к точности

- **FR-VIS-023 — MUST:** геометрический слой совпадает с четырьмя подтверждёнными пользователем углами и сохраняет их перспективу.
- **FR-VIS-024 — MUST:** разные створки не сливаются автоматически в одно полотно без выбора пользователя.
- **FR-VIS-025 — MUST:** ритм полос «Зебра» строится из полей конкретного варианта, а не декоративного шаблона по умолчанию.
- **FR-VIS-026 — MUST:** цветовой pipeline документируется, но не заявляет физически точный цвет на некалиброванном экране.
- **FR-VIS-027 — MUST:** критерии pixel/geometric/subjective accuracy и пороги определяются на разрешённом benchmark по `TBD-AI-002`.
- **FR-VIS-028 — SHOULD:** результат сохраняет резкость рамы/ручек через маски и не размывает всю сцену.

### 12.2. Известные ограничения

Отражения, сильные блики, занавески, растения, низкая освещённость, motion blur, экстремальная перспектива, широкоугольные искажения, частично закрытая рама и неизвестный масштаб могут снизить точность. Экран, камера и освещение изменяют воспринимаемый цвет. Геометрический результат не проверяет физическую возможность монтажа.

### 12.3. Ошибочные сценарии

| Требование | Сценарий | Обязательное поведение |
|---|---|---|
| FR-VIS-029 | Окно не найдено | Предложить ручные четыре угла; не блокировать калькулятор. |
| FR-VIS-030 | Найдено несколько объектов | Показать кандидатов, не выбирать скрытно; разрешить несколько створок. |
| FR-VIS-031 | Низкое качество | Объяснить проблему и дать рекомендации пересъёмки/ручного режима. |
| FR-VIS-032 | Слишком тёмное фото | Предупредить о снижении достоверности; разрешить замену без потери расчёта. |
| FR-VIS-033 | AI-провайдер недоступен | Завершить геометрическим результатом или поставить осознанный retry. |
| FR-VIS-034 | Превышен лимит | Объяснить лимит без раскрытия внутренних anti-abuse сигналов; сохранить текущий проект. |
| FR-VIS-035 | Неправильный формат | Отклонить до хранения/обработки и перечислить утверждённые форматы после `TBD-AI-003`. |
| FR-VIS-036 | Обработка зависла | Перевести job в timeout/failed, разрешить безопасный повтор и исключить двойное списание лимита. |
| FR-VIS-037 | Пользователь закрыл страницу | Background job продолжает или отменяется по политике, а статус восстанавливается по ID. |

## 13. Концептуальные статусы

| Сущность | Концептуальные статусы | Комментарий |
|---|---|---|
| Расчёт | `DRAFT`, `PRICED`, `REQUIRES_MANUAL_REVIEW`, `SUBMITTED`, `EXPIRED`, `ARCHIVED` | `PRICED` означает только предварительный результат. |
| Визуализация | `UPLOADED`, `DETECTING`, `NEEDS_CORRECTION`, `READY_TO_RENDER`, `RENDERING`, `REFINING`, `COMPLETED`, `FAILED`, `CANCELLED`, `DELETED` | Геометрический `COMPLETED` допустим без refinement. |
| Заявка | `CREATED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` | Минимальная подтверждённая концепция; переходы уточняются позднее. |
| Замер | `REQUESTED`, `SCHEDULED`, `COMPLETED`, `CANCELLED` | Предлагаемая концепция, требует утверждения в профильной спеке. |
| Заказ | `INQUIRY`, `MEASURE_REQUESTED`, `MEASURE_SCHEDULED`, `QUOTE_PENDING`, `QUOTE_CONFIRMED`, `ORDER_CONFIRMED`, `IN_FULFILMENT`, `INSTALL_SCHEDULED`, `COMPLETED`, `CANCELLED` | Proposed mapping в `CART_CHECKOUT_ORDERS_SPEC`; фактические переходы `BLOCKED_BY_TBD-BIZ-004`. |
| Наличие | `IN_STOCK`, `OUT_OF_STOCK` | Клиентские подписи заданы в `FR-INVENTORY-002/003`. |
| Source entity | `SOURCE_ACTIVE`, `SOURCE_CHANGED`, `SOURCE_REMOVED` | Не определяет локальную публикацию автоматически. |
| Local catalog entity | `LOCAL_REVIEW_REQUIRED`, `LOCAL_ACTIVE`, `LOCAL_HIDDEN`, `LOCAL_ARCHIVED` | История и source links сохраняются. |
| Цена позиции | `CALCULATED`, `PRICE_ON_REQUEST`, `MANUAL_REVIEW_REQUIRED`, `SOURCE_UNAVAILABLE`, `CONFIGURATION_INVALID`, `EXPIRED`, `CONFIRMED` | `0` не используется как fallback неизвестной цены. |
| Preview result | `STANDARD_INTERIOR_PREVIEW`, `GEOMETRIC_PREVIEW`, `AI_REFINED_PREVIEW` | Это тип результата, не общий job status. |

- **STATE-001 — MUST:** переход имеет исходный/целевой статус, actor, timestamp, reason и policy check.
- **STATE-002 — MUST:** неизвестный статус внешней зависимости отображается как безопасное общее состояние, но не сохраняется как вымышленный доменный статус.
- **STATE-003 — MUST:** удаление приватного файла переводит его в `DELETED` и делает недоступным, даже если бизнес-сущность сохраняется.

## 14. UX, motion, мобильность и доступность

### 14.1. UX-принципы

- **NFR-UX-001 — MUST:** основная задача на каждом шаге очевидна, а коммерчески важные оговорки видимы до действия.
- **NFR-UX-002 — MUST:** пользователь может вернуться к предыдущему шагу без потери валидных данных.
- **NFR-UX-003 — MUST:** ошибки привязаны к полю/позиции и содержат способ исправления.
- **NFR-UX-004 — SHOULD:** сложные термины сопровождаются схемой/подсказкой, особенно размеры и монтажная область.
- **NFR-UX-005 — MUST:** `OUT_OF_STOCK`, Manual Review и предварительная цена различаются не только цветом.
- **NFR-UX-006 — MUST:** загрузка фото и AI не являются обязательными для получения расчёта.

### 14.2. Starfield-вступление

Вдохновение ограничено идеей короткого полёта между звёздами и появления приветственного текста на LAYEL. PROJECT_NAME использует самостоятельные графику, текст, темп, палитру и переход к продукту.

- **NFR-MOTION-001 — SHOULD:** starfield является вступлением продолжительностью не более 2–3 секунд, после которого без дополнительного действия доступна главная страница.
- **NFR-MOTION-002 — MUST:** вступление имеет заметный skip и не блокирует загрузку/семантику основного контента.
- **NFR-MOTION-003 — MUST:** при `prefers-reduced-motion` полёт отключается и сразу показывается статичное приветствие/главная.
- **NFR-MOTION-004 — MUST:** отсутствие WebGL/Canvas/GPU не мешает навигации и CTA.
- **NFR-MOTION-005 — MUST:** вступление не повторяется на каждой странице, имеет skip, сохраняет безопасный признак уже выполненного показа и упрощается на слабых устройствах; оно не блокирует загрузку каталога.

### 14.3. Motion design

- **NFR-MOTION-006 — MUST:** анимации объясняют причинно-следственную связь, состояние или пространственный переход, а не задерживают задачу.
- **NFR-MOTION-007 — MUST:** бесконечные декоративные эффекты не конкурируют с чтением, вводом размеров и ручной геометрией.
- **NFR-MOTION-008 — MUST:** каждый Vengeance UI компонент проверяется по конкретной версии, лицензии, зависимостям, copyright notice, accessibility и performance до использования.
- **NFR-MOTION-009 — SHOULD:** длительности/easing задаются tokens из [MOTION_ANIMATION_SPEC.md](03-ux/MOTION_ANIMATION_SPEC.md), а не копируются с референса.
- **NFR-DESIGN-001 — MUST:** визуальное направление является самостоятельным premium interior-tech style — современным, понятным, mobile-first, быстрым, читаемым и ориентированным на реальные материалы.
- **NFR-DESIGN-002 — SHOULD:** базовая палитра использует графит, тёплый белый/слоновую кость, оттенки дерева и мягкое золото с одним дополнительным акцентом; бирюзово-белая стилистика AMIGO не копируется как основа.

### 14.4. Мобильная адаптация

- **NFR-MOBILE-001 — MUST:** каталог, multi-window расчёт, upload, четыре угла, сравнение и заявка работают на touch-устройствах.
- **NFR-MOBILE-002 — MUST:** числовой ввод использует подходящую клавиатуру, единицы и явную валидацию.
- **NFR-MOBILE-003 — MUST:** drag handles достаточно различимы и имеют не-жестовый альтернативный способ коррекции.
- **NFR-MOBILE-004 — SHOULD:** загрузки переживают кратковременный разрыв сети без повторной отправки успешного файла.
- **NFR-MOBILE-005 — MUST:** viewport не требует горизонтального скролла для основного контента.

### 14.5. Доступность

- **NFR-ACCESS-001 — MUST:** критические гостевые и административные flows имеют проверяемые keyboard, screen-reader semantics, contrast, status announcement и reduced-motion acceptance criteria; детализация трассируется к `NFR-A11Y-001`–`006`.
- **NFR-A11Y-001 — MUST:** целевой уровень соответствия WCAG уточняется, но MVP MUST проектироваться не ниже применимых практик WCAG 2.2 AA.
- **NFR-A11Y-002 — MUST:** весь путь кроме пиксельной оценки фото доступен с клавиатуры; редактор геометрии имеет числовую/кнопочную альтернативу.
- **NFR-A11Y-003 — MUST:** focus order, visible focus, headings, labels, errors и status announcements семантически корректны.
- **NFR-A11Y-004 — MUST:** контраст, состояния наличия/ошибки и before/after не зависят только от цвета.
- **NFR-A11Y-005 — MUST:** изображения каталога и работ имеют полезный alt либо корректно помечены декоративными.
- **NFR-A11Y-006 — MUST:** reduced motion распространяется на starfield и все подключённые анимационные компоненты.

## 15. SEO, производительность и доступность сайта

### 15.1. SEO и локальный поиск

- **NFR-SEO-001 — MUST:** публичные страницы имеют уникальные title, description, canonical и логическую heading-структуру.
- **NFR-SEO-002 — MUST:** индексируются только опубликованные реальные семейства/системы/материалы с содержательным контентом.
- **NFR-SEO-003 — MUST:** регион обслуживания — Чеченская Республика; отдельные населённые пункты не перечисляются как обслуживаемые без данных.
- **NFR-SEO-004 — SHOULD:** использовать применимую structured data для LocalBusiness, Product/Service и портфолио после проверки фактов.
- **NFR-SEO-005 — MUST:** приватные проекты, guest links, фото, admin и API закрыты от индексации и не попадают в sitemap.
- **NFR-SEO-006 — MUST:** контент не копируется с LAYEL, AMIGO, поставщиков или конкурентов сверх разрешённых фактов, provenance и допустимого цитирования; каталожный факт не переносит права на текст или изображение.

### 15.2. Производительность

- **NFR-PERF-001 — MUST:** performance budgets утверждаются для устройств/сетей из `TBD-INFRA-005`; до решения числа не выдумываются, а методика задана в [PERFORMANCE.md](04-technical/PERFORMANCE.md).
- **NFR-PERF-002 — MUST:** основной контент и CTA доступны независимо от загрузки starfield, тяжёлых изображений и AI SDK.
- **NFR-PERF-003 — SHOULD:** каталог использует responsive images, lazy loading вне первого экрана и предсказуемые размеры для снижения layout shift.
- **NFR-PERF-004 — MUST:** upload показывает прогресс, а background processing не удерживает открытое HTTP-соединение как единственный источник статуса.
- **NFR-PERF-005 — MUST:** калькулятор имеет server timeout и идемпотентный безопасный retry.
- **NFR-PERF-006 — SHOULD:** производительность измеряется real-user и synthetic метриками без персональных payload.

### 15.3. Доступность для целевой аудитории

- **NFR-AVAIL-001 — MUST:** публичный сайт, его критические assets, API и CAPTCHA/consent зависимости работают из Чеченской Республики без VPN.
- **NFR-AVAIL-002 — MUST:** окончательный hosting выбирается только после сравнительной оценки и ADR с проверкой матрицы регионов, подключений, маршрутов и Chrome из `OWNER-DECISION-007`.
- **NFR-AVAIL-003 — MUST:** отказ AI, аналитики или необязательной анимации не делает каталог, калькулятор и контакт недоступными.
- **NFR-AVAIL-004 — SHOULD:** критические внешние зависимости имеют timeout, circuit breaker/fallback и наблюдаемый статус.

## 16. Безопасность, приватность и audit log

### 16.1. Безопасность

- **NFR-SEC-001 — MUST:** весь production-трафик использует HTTPS и безопасные настройки transport/cookies.
- **NFR-SEC-002 — MUST:** client/admin authorization проверяется сервером на каждом объекте и действии.
- **NFR-SEC-003 — MUST:** административные и клиентские сессии имеют раздельные политики, ограниченный срок и защищённое завершение.
- **NFR-SEC-004 — MUST:** формы и API защищены от CSRF, XSS, injection, IDOR, SSRF и mass assignment пропорционально поверхности.
- **NFR-SEC-005 — MUST:** uploads проверяются по содержимому, декодируются безопасно, переименовываются сервером и не исполняются.
- **NFR-SEC-006 — MUST:** rate limits и квоты различают расчёт, upload, detection, render, refinement, auth и lead submission.
- **NFR-SEC-007 — MUST:** secrets не хранятся в репозитории, клиентском bundle, логах или audit diff.
- **NFR-SEC-008 — MUST:** private share token имеет достаточную энтропию, scope, expiry, revocation и не раскрывается в analytics/referrer.
- **NFR-SEC-009 — SHOULD:** threat model и security tests утверждаются до работы с реальными пользовательскими фото.
- **NFR-SEC-010 — MUST:** зависимости и Vengeance UI компоненты проходят license/security/provenance review по зафиксированной версии.

### 16.2. Приватность фотографий

- **NFR-PRIV-001 — MUST:** пользовательские оригиналы, preview, маски, geometry render и refinement являются приватными.
- **NFR-PRIV-002 — MUST:** эти объекты не размещаются в публичном bucket; доступ выдаётся краткоживущими авторизованными ссылками.
- **NFR-PRIV-003 — MUST:** цель, правовое основание, срок и внешние обработчики показываются до upload/AI-обработки по `TBD-PRIV-*`.
- **NFR-PRIV-004 — MUST:** EXIF/метаданные минимизируются в производных файлах; допустимый оригинал обрабатывается по retention policy.
- **NFR-PRIV-005 — MUST:** пользователь может запросить удаление доступными каналами; выполнение трассируется без сохранения содержимого.
- **NFR-PRIV-006 — MUST:** фото не используется для портфолио, обучения, benchmark или отладки без отдельного основания/согласия.
- **NFR-PRIV-007 — MUST:** внешний провайдер получает минимальный payload и только после проверки запрета обучения, retention и географии обработки.
- **NFR-PRIV-008 — MUST:** ошибки, логи, traces и аналитика не содержат бинарные данные, presigned URL, object key или свободный текст с адресом.

### 16.3. Политика удаления гостевых загрузок

- **NFR-PRIV-009 — MUST:** точный TTL утверждается до production-upload по `TBD-PRIV-001` и виден гостю до загрузки.
- **NFR-PRIV-010 — MUST:** scheduled deletion каскадно удаляет оригинал, preview, маски, промежуточные и конечные результаты.
- **NFR-PRIV-011 — MUST:** job удаления идемпотентен, повторяется при временной ошибке и отправляет неуспех в контролируемый dead-letter/alert flow.
- **NFR-PRIV-012 — MUST:** сохранённый бизнес-факт заявки не продлевает хранение фото без отдельного основания; исключения документируются.
- **NFR-PRIV-013 — MUST:** резервные копии обрабатывают удаление по утверждённой процедуре `TBD-PRIV-006`.

### 16.4. Права на медиа и внешние изображения

- **NFR-ASSET-001 — MUST:** состояния прав, публикации, AI-использования и удаления соответствуют [ASSET_RIGHTS_REGISTER.md](../00-global/ASSET_RIGHTS_REGISTER.md).
- **NFR-ASSET-002 — MUST:** URL и названия AMIGO MAY храниться как provenance; даже при подтверждённом партнёрстве запрещены hotlink, неуправляемое массовое скачивание, удаление водяных знаков, смена авторства и использование вне permission scope.
- **NFR-ASSET-003 — MUST:** разрешённый импорт партнёрского изображения сохраняет источник, правообладателя, `PARTNER_LICENSE`, дату подтверждения разрешения, применимые ограничения, дату импорта, hash, ревизию и связь с `MaterialVariant`/другой доменной сущностью.
- **NFR-ASSET-004 — MUST:** официальный медиакит, партнёрский бейдж и иные материалы проходят asset-level mapping и publication check; отсутствие копии договора не отменяет `PARTNER-001`, но неизвестная связь файла или использование вне scope блокируют конкретный актив.
- **NFR-ASSET-005 — MUST NOT:** материалы или работы AMIGO не используются как обучающий датасет, собственное портфолио или иллюстрация работ бизнеса без отдельного разрешения.

### 16.5. Audit log

- **NFR-AUDIT-001 — MUST:** логировать публикацию/изменение каталога, Price Category, наличия, прайс-листа, совместимости, ролей, настроек, статусов и privacy policy.
- **NFR-AUDIT-002 — MUST:** запись содержит actor, permission, timestamp, entity, action, before/after diff или безопасный hash, reason и correlation ID.
- **NFR-AUDIT-003 — MUST:** audit log append-only для обычных ролей; изменение или очистка запрещены через стандартную админку.
- **NFR-AUDIT-004 — MUST:** чувствительные значения редактируются/маскируются; фото, secrets, tokens и полный контакт не попадают в diff.
- **NFR-AUDIT-005 — MUST:** просмотр audit log сам ограничен и журналируется; retention определяется legal/security review.
- **NFR-AUDIT-006 — MUST:** журнал охватывает capture/verification внешнего источника, price version, local override, asset-rights переход и publication approval/revocation.

## 17. Концептуальная техническая архитектура

- **NFR-ARCH-001 — Web application:** публичный responsive UI, клиентский кабинет при включении и отдельная административная поверхность.
- **NFR-ARCH-002 — API:** единая серверная граница авторизации, каталога, расчёта, проектов, заявок и orchestrated jobs.
- **NFR-ARCH-003 — Database:** PostgreSQL является локальным транзакционным operational system of record для source snapshots, нормализованных каталоговых проекций, локальных решений, версий цены, расчётов, заявок, статусов, consent и audit references. По `OWNER-DECISION-009` его активная одобренная версия является единственным каноническим runtime-источником публичных catalog/search/filter/configurator/calculation/lead/analytics данных; это MUST NOT подменять upstream/decision authority из `OWNER-DECISION-008`, а object storage и rebuildable projections остаются delivery/derived layers.
- **NFR-ARCH-004 — Object storage:** private хранилище оригиналов и производных с lifecycle controls; провайдер не выбран.
- **NFR-ARCH-005 — Background jobs:** идемпотентные задачи upload processing, detection, render, refinement, уведомлений и удаления.
- **NFR-ARCH-006 — AI/CV worker:** изолированная вычислительная граница для detection/segmentation/rendering без коммерческих правил.
- **NFR-ARCH-007 — External image provider adapter:** внутренний контракт, provider-specific mapping, timeout, retry, cost/usage metadata и fallback.
- **NFR-ARCH-008 — Monitoring:** logs, metrics, traces, synthetic checks, alert routing и privacy-safe correlation.
- **NFR-ARCH-009 — MUST:** multi-tenancy не реализуется, но новые глобальные сущности SHOULD допускать будущий ownership scope без преждевременных tenant features.
- **NFR-ARCH-010 — MUST:** окончательные технологии и topology оформляются ADR после профильных спек.
- **NFR-ARCH-011 — MUST:** цена доступна через концептуальный `PricingProvider` с операциями `getCatalogSnapshot()`, `getMaterialSnapshot()`, `getPriceQuote()`, `getSourceVersion()` и `healthCheck()`.
- **NFR-ARCH-012 — MUST:** предусмотрены `AdminManagedPricingProvider`, `AmigoAuthorizedProvider`, `AmigoSnapshotProvider`, `ManualQuoteProvider` и тестовый `MockPricingProvider`; партнёрский статус разрешает проектировать `AmigoAuthorizedProvider`, но конкретный transport/API/export и production-интеграция не утверждаются без evidence/ADR.
- **NFR-ARCH-013 — MUST:** отсутствие публичного AMIGO, смена его разметки или отказ price provider не останавливают локальный каталог, контакты, исторические расчёты и Manual Quote fallback.
- **NFR-ARCH-014 — MUST:** предпочтение способа получения цены: официальный партнёрский/B2B-источник → выгрузка поставщика → проверенный ручной импорт → публичная страница как временный research source.
- **NFR-ARCH-015 — MUST NOT:** существование официального публичного API AMIGO не предполагается до документального подтверждения; код, закрытые API и алгоритмы источника не копируются.

## 18. Резервное копирование, логирование и наблюдаемость

### 18.1. Резервное копирование

- **NFR-BACKUP-001 — MUST:** scope включает database, критические конфигурации, опубликованные price versions и audit data.
- **NFR-BACKUP-002 — MUST:** стратегия object storage согласует backup с retention/удалением приватных фото.
- **NFR-BACKUP-003 — MUST:** backups шифруются, доступ ограничен и отделён от обычных admin credentials.
- **NFR-BACKUP-004 — MUST:** restore регулярно проверяется на изолированной среде с доказательством целостности.
- **NFR-BACKUP-005 — MUST:** RPO, RTO и backup retention не назначаются без `TBD-INFRA-007`.

### 18.2. Логи и наблюдаемость

- **NFR-OBS-001 — MUST:** структурированные логи имеют timestamp, severity, service, environment, event name и correlation/job/request ID.
- **NFR-OBS-002 — MUST:** метрики покрывают API, database, queue depth/age, job duration/result, provider errors, deletion lag и storage failures.
- **NFR-OBS-003 — MUST:** distributed trace не переносит фото, контакт, адрес, token или полный calculation payload.
- **NFR-OBS-004 — MUST:** алерт имеет severity, владельца, actionable condition и runbook; часы реакции зависят от `TBD-INFRA-008`.
- **NFR-OBS-005 — SHOULD:** synthetic checks выполняются из утверждённых точек Чеченской Республики и проверяют путь до каталога/расчёта/контакта.
- **NFR-OBS-006 — MUST:** стоимость и quota usage AI видимы отдельно от персональных пользовательских данных.

## 19. Аналитические события

Минимальный словарь событий для будущей `ANALYTICS_MEASUREMENT_SPEC`:

`home_viewed`, `catalog_viewed`, `product_system_viewed`, `material_variant_viewed`, `availability_viewed`, `calculator_started`, `calculation_item_added`, `calculation_requested`, `calculation_priced`, `manual_review_shown`, `photo_upload_started`, `photo_upload_succeeded`, `photo_upload_failed`, `window_detection_completed`, `window_candidate_selected`, `window_boundary_adjusted`, `material_selected`, `visualization_requested`, `geometry_render_completed`, `refinement_requested`, `visualization_completed`, `visualization_failed`, `before_after_used`, `calculation_saved`, `whatsapp_handoff_started`, `installment_terms_requested`, `lead_submitted`, `measurement_requested`, `order_status_viewed`.

- **NFR-ANALYTICS-001 — MUST:** событие имеет schema version, timestamp, anonymous/session ID, surface, outcome и применимые catalog/price version IDs.
- **NFR-ANALYTICS-002 — MUST:** поля причин ошибок используют ограниченную taxonomy, не raw provider response или пользовательский текст.
- **NFR-ANALYTICS-003 — MUST:** бизнес-метрика не выводится до проверки полноты, дедупликации, consent bias и bot/internal traffic.
- **NFR-ANALYTICS-004 — MUST:** срок хранения событий определяется `TBD-ANALYTICS-004`; default бессрочного хранения запрещён.

### 19.1. Будущая проверка ценового соответствия

- **NFR-TEST-001 — MUST:** [TEST_STRATEGY.md](../quality/TEST_STRATEGY.md) содержит pricing parity matrix с одинаковыми source version, системой, материалом, размерами, фурнитурой, опциями и количеством.
- **NFR-TEST-002 — MUST:** для каждого случая сохраняются результат AMIGO, результат локального калькулятора, абсолютная и процентная разница и source version.
- **NFR-TEST-003 — MUST:** абсолютное отклонение до 1 рубля включительно допустимо только при полностью одинаковых входах `NFR-TEST-001`; большее отклонение является parity error. Тест не обходит авторизацию, CAPTCHA или ограничения доступа.

## 20. Основные риски и снижение

| ID | Риск | Снижение |
|---|---|---|
| RISK-001 | Нет разрешённой активной версии AMIGO и подтверждённых локальных правил; калькулятор выдаст неверную цену. | Блокировать `PRICING_CALCULATOR_SPEC` Approved и production-pricing до source verification, `TBD-PRICE-001`–`005` и parity cases; использовать Manual Review. |
| RISK-002 | Неизвестные размеры/ограничения создадут неисполняемый заказ. | Источник на Product System, `TBD-SIZE-001`, server validation и `REQUIRES_MANUAL_REVIEW`. |
| RISK-003 | Неактуальное наличие разочарует клиента. | Бинарный статус, freshness, audit, повторная проверка перед заявкой. |
| RISK-004 | Экранная/AI-визуализация исказит материал. | Известные reference images, geometric-first, disclosure, benchmark и запрет менять товар. |
| RISK-005 | AI изменит интерьер или геометрию окна. | Маски, инварианты `FR-VIS-015/016`, visual regression и fallback без AI. |
| RISK-006 | Утечка фотографий интерьера. | Private storage, short-lived access, least privilege, retention/delete tests, no URLs in analytics. |
| RISK-007 | Внешний AI недоступен или заблокирован в регионе. | Adapter, provider evaluation, geometric fallback, network tests без VPN. |
| RISK-008 | Стоимость AI станет неконтролируемой. | Quotas, rate limits, usage metrics, feature flag и cost alerts без выдуманных лимитов. |
| RISK-009 | Старое предложение изменится после прайс-листа. | Immutable Price List Version и полный calculation snapshot. |
| RISK-010 | Клиент примет предварительную сумму за обязательную финальную. | Нормативное название, заметный disclaimer, статус и подтверждённая ревизия цены. |
| RISK-011 | Региональные цены/условия услуг AMIGO будут ошибочно перенесены в локальный расчёт. | Локальные строки замера, доставки и установки всегда отдельны и равны 0 рублей по `BUSINESS-FREE-SERVICES-001`; source region сохраняется. |
| RISK-012 | Импортированная категория будет ошибочно выдана за доступный локальный ассортимент. | Независимые publication/availability/pricing/orderability states, owner-controlled workflow и контент-аудит. |
| RISK-013 | Анимация ухудшит конверсию/доступность. | Skip, reduced motion, progressive enhancement, измерение и motion budget. |
| RISK-014 | Один человек получит избыточные admin-права. | Granular RBAC, separate auth, step-up и audit review. |
| RISK-015 | Backup восстановит удалённые приватные данные в активный доступ. | Privacy-aware restore runbook, tombstones/изоляция и проверка `TBD-PRIV-006`. |
| RISK-016 | AMIGO изменит страницу, цену, название или удалит сущность. | Immutable snapshots, freshness/status, административное подтверждение, локальная активная версия и provider fallback. |
| RISK-017 | Изображение AMIGO будет опубликовано вне партнёрского scope, с неверной связью или через hotlink. | `PARTNER_LICENSE`, локальный asset, asset-level mapping, `PUBLICATION_APPROVED`, provenance, отзыв и запреты `ASSET-*`. |
| RISK-018 | Нейтральная рассрочка превратится в ложное обещание кредита. | Единственный утверждённый текст, запрещённые claims, manual WhatsApp и `TBD-INSTALLMENT-001`–`013`. |
| RISK-019 | Локальный калькулятор разойдётся с контрольным результатом AMIGO. | Pricing parity matrix, source version, diff, owner-approved tolerance и остановка автоматической публикации при необъяснённом расхождении. |
| RISK-020 | Публичный flow, search/cache/analytics projection или импорт обойдёт активную PostgreSQL `CatalogVersion`, покажет staged AMIGO data либо автоматически удалит локальное решение. | Запрет direct AMIGO/staging reads, version-pinned rebuildable projections, обязательные diff/Business Owner approval/admin activation, no-auto-delete, audit и rollback по `OWNER-DECISION-009`. |

## 21. Поэтапный roadmap без календарных обещаний

1. **0A — Global documentation:** завершённая исходная глобальная продуктовая база.
2. **0A.1 — External source, pricing, warranty and asset governance update:** завершённая корректирующая документационная фаза; entry gate пройден 2026-08-02.
3. **0B — Specialized specifications:** обязательный комплект создан; completion gate пройден 2026-08-02 без разрешения кода/import/media ingestion.
4. **0C — Implementation readiness, MVP freeze and P0 TBD triage:** MVP, P0 classification, critical spec audit, sequence 1A–1H и Foundation plan подготовлены; итог gate не является implementation authorization.
5. **1A — Foundation:** завершённые monorepo, web/BFF, data/storage/jobs, environment/CI/tests, auth/observability/security baseline без бизнес-функций.
6. **1B.1 — AMIGO catalog pilot:** завершённый allowlisted import 32 verified materials, 59 local media assets, diff/version/approval/overlays и минимальный public/admin catalog.
7. **1B.2 — Full authorized AMIGO catalog expansion:** завершённое расширение существующего importer до полного доступного разрешённого каталога, controlled local media/base prices, resumable manifest, review/manual activation, bulk overlays и scalable public/admin catalog без dimensional calculation.
8. **1C — Configurator and pricing:** compatibility, millimetres/quantity, versioned preliminary price, override/manual fallback и parity tests; не разрешена автоматически после 1B.2.
9. **1D — Standard preview:** deterministic prepared-scene rendering for supported MVP profiles.
10. **1E — Cart, WhatsApp and orders:** multi-item cart, guest/measurement lead, neutral installment request and saved calculation.
11. **1F — Admin and accounts:** operational admin surfaces, RBAC and basic saved-calculation account.
12. **1G — AI visualizer pilot:** private geometry-first roller/Zebra pilot, manual correction, optional refinement and evaluation/cost gates.
13. **1H — Hardening and release:** security/accessibility/performance/browser/mobile/recovery/monitoring/deployment and launch gate.
14. **Post-MVP:** только перечисленные в [MVP_SCOPE §3](../06-plans/MVP_SCOPE.md#3-post-mvp-scope) функции по отдельным решениям.

## 22. Definition of Ready для специализированных спек

- **DOR-001:** `GLOBAL_SPEC.md` проверен владельцем, а изменения зафиксированы в changelog.
- **DOR-002:** quality gate имеет явный итог `PASSED`, а не только заполненные чекбоксы.
- **DOR-003:** владелец, scope, зависимости и выходной gate конкретной спеки известны.
- **DOR-004:** связанные P0-TBD закрыты либо формально признаны блокерами, не замещены догадками.
- **DOR-005:** реальные источники ассортимента/технических данных зарегистрированы; партнёрский permission scope подтверждён, а конкретный transport/export и provenance/verification plan явно известны либо остаются видимым блокером соответствующей спеки.
- **DOR-006:** requirement IDs и термины определены без конфликтов.
- **DOR-007:** privacy/security impact определён для данных и интеграций.
- **DOR-008:** для значимого технологического выбора запланированы сравнение и ADR.
- **DOR-009:** активный план содержит проверку, ревью и обновление документации.
- **DOR-010:** `PRICING_CALCULATOR_SPEC` не Ready for Approval без разрешённой подтверждённой price version, реальных данных `TBD-PRICE-001` и контрольной parity matrix.

## 23. Definition of Done документации фаз 0A/0A.1

- **DOD-001:** созданы только перечисленные документы, служебные файлы подготовки репозитория и каталоги референсов, без production-кода и зависимостей.
- **DOD-002:** `GLOBAL_SPEC.md` покрывает продукт, scope, роли, flows, функции, модели, NFR, риски и gates.
- **DOD-003:** подтверждённые факты находятся в нормативных требованиях, а не в активных assumptions.
- **DOD-004:** исходные допущения имеют ID, влияние, проверку и статус.
- **DOD-005:** все неизвестные данные видимы в категоризированном `OPEN_QUESTIONS.md`.
- **DOD-006:** идентификаторы требований и TBD уникальны и не обозначают разные смыслы.
- **DOD-007:** глоссарий покрывает домен каталога, производства, цены и визуализатора.
- **DOD-008:** roadmap не содержит пустых специализированных файлов и отражает зависимости.
- **DOD-009:** reference rules отражают права, исходники/производные и отсутствие локальных файлов при инвентаризации.
- **DOD-010:** ссылки, Markdown-структура и line-count проверены автоматически/вручную.
- **DOD-011:** `SPEC_QUALITY_GATE.md` содержит доказательства self-check и нерешённые approval-блокеры.
- **DOD-012:** 0A завершена по прямому сообщению владельца, а entry gate версии 0.4.0 после 0A.1 пройден 2026-08-02 по письменному поручению начать 0B; исторический `TBD-BIZ-001` впоследствии закрыт `OWNER-DECISION-001` без выдумывания персональных имён.
- **DOD-013:** `EXTERNAL_SOURCES.md` регистрирует 14 заданных публичных страниц AMIGO и volatile customizer, partner/access distinction, изменяемость, legal/asset status, update и fallback.
- **DOD-014:** `ASSET_RIGHTS_REGISTER.md` покрывает категории активов, подтверждённый `PARTNER_LICENSE` AMIGO и блокирует публикацию конкретного файла без корректной связи и `PUBLICATION_APPROVED`.
- **DOD-015:** `PRICING_SOURCE_POLICY.md` фиксирует authorized source, dynamic source price categories, snapshots, `PricingProvider`, локальные бесплатные услуги, minimum-price TBD, fallback, audit и parity testing без копирования AMIGO.
- **DOD-016:** в фазе 0A.1 не созданы код, scraping/import scripts, база, UI, зависимости или локальные изображения AMIGO.

## 24. Перечень открытых вопросов

Полные формулировки, приоритет, владелец ответа и критерий закрытия находятся только в [OPEN_QUESTIONS.md](../00-global/OPEN_QUESTIONS.md), чтобы не дублировать реестр.

Критические группы:

- бизнес/гарантия: `TBD-BIZ-*`, `TBD-WARRANTY-001`;
- ассортимент и совместимость: `TBD-ASSORT-*`, `TBD-SIZE-001`, `TBD-ASSET-*`;
- цена и источник: частично открытые `TBD-PRICE-002`–`005`, открытые `TBD-PRICE-006`, `TBD-PRICE-008`–`010`, `TBD-SOURCE-AMIGO-002`, `TBD-MECHANISM-001`; решённые `TBD-PRICE-001`, `TBD-PRICE-007`, `TBD-PRICE-SOURCE-001`–`002`, `TBD-PRICE-PARITY-001`, `TBD-MIN-PRICE-001`, `TBD-SOURCE-AMIGO-001` и `TBD-PRICE-CATEGORY-001` сохраняются исторически;
- рассрочка: `TBD-INSTALLMENT-001`–`013`;
- наличие/размеры: `TBD-INVENTORY-*`, `TBD-DIM-*`;
- монтаж/доставка/аккаунты: `TBD-INSTALL-*`, `TBD-DELIVERY-*`, `TBD-ACCOUNT-*`;
- дизайн/preview/AI: `TBD-DESIGN-*`, `TBD-PREVIEW-*`, `TBD-AI-*`;
- инфраструктура/privacy/analytics: `TBD-INFRA-*`, `TBD-PRIV-*`, `TBD-ANALYTICS-*`.

`TBD-LEAD-001`, `TBD-SYSTEM-001`, `TBD-HORIZONTAL-001`, `TBD-VERTICAL-001`, `TBD-SERVICE-001`–`003` и `TBD-ACCOUNT-001` сохраняются в реестре как решённые и не считаются открытыми блокерами.

## 25. Специализированная документация фазы 0B

Канонический перечень, фактический статус и зависимости 33 нормативных модулей находятся в [SPEC_ROADMAP.md](../00-global/SPEC_ROADMAP.md). Быстрые входы:

- product scope, роли и проверка: [FEATURE_SPEC](01-product/FEATURE_SPEC.md), [USER_STORIES](01-product/USER_STORIES.md), [USER_FLOWS](01-product/USER_FLOWS.md), [ROLES_PERMISSIONS](01-product/ROLES_PERMISSIONS.md), [ACCEPTANCE_CRITERIA](01-product/ACCEPTANCE_CRITERIA.md);
- AMIGO/catalog/configuration/price: [AMIGO_CATALOG_PARITY_SPEC](02-domain/AMIGO_CATALOG_PARITY_SPEC.md), [CATALOG_INVENTORY_SPEC](02-domain/CATALOG_INVENTORY_SPEC.md), [PRODUCT_CONFIGURATOR_SPEC](02-domain/PRODUCT_CONFIGURATOR_SPEC.md), [PRICING_CALCULATOR_SPEC](02-domain/PRICING_CALCULATOR_SPEC.md);
- два preview-пути: [STANDARD_INTERIOR_PREVIEW_SPEC](02-domain/STANDARD_INTERIOR_PREVIEW_SPEC.md) и [AI_WINDOW_VISUALIZER_SPEC](02-domain/AI_WINDOW_VISUALIZER_SPEC.md);
- operations: [CART_CHECKOUT_ORDERS_SPEC](02-domain/CART_CHECKOUT_ORDERS_SPEC.md), [INSTALLMENT_SPEC](02-domain/INSTALLMENT_SPEC.md), [AUTH_ACCOUNTS_SPEC](02-domain/AUTH_ACCOUNTS_SPEC.md), [ADMIN_PANEL_SPEC](02-domain/ADMIN_PANEL_SPEC.md), [CONTENT_PORTFOLIO_SPEC](02-domain/CONTENT_PORTFOLIO_SPEC.md);
- UX: [information architecture](03-ux/INFORMATION_ARCHITECTURE.md), [design system](03-ux/DESIGN_SYSTEM.md), [motion](03-ux/MOTION_ANIMATION_SPEC.md), [screens](03-ux/SCREEN_SPECS.md), [responsive](03-ux/RESPONSIVE_SPEC.md), [accessibility](03-ux/ACCESSIBILITY_SPEC.md);
- technical boundaries: [architecture](04-technical/ARCHITECTURE.md), [data model](04-technical/DATA_MODEL.md), [API](04-technical/API_SPEC.md), [sync](04-technical/AMIGO_SYNC_ARCHITECTURE.md), [media pipeline](04-technical/ASSET_MEDIA_PIPELINE.md), [storage](04-technical/STORAGE_MEDIA.md), [AI pipeline](04-technical/AI_PIPELINE.md), [security/privacy](04-technical/SECURITY_PRIVACY.md), [performance](04-technical/PERFORMANCE.md), [observability](04-technical/OBSERVABILITY.md), [deployment](04-technical/DEPLOYMENT.md).

Quality/evaluation artifacts находятся вне нормативного каталога: [TEST_STRATEGY](../quality/TEST_STRATEGY.md), [AI_EVALUATION_SPEC](../evaluations/AI_EVALUATION_SPEC.md) и [traceability matrix](../00-global/TRACEABILITY_MATRIX.md). Открытые TBD сохраняют безопасные fallback и не разрешают автоматически начинать реализацию.
