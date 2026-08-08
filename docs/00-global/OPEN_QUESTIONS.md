# Открытые вопросы PROJECT_NAME

## Как использовать реестр

Каждый пробел имеет уникальный идентификатор и не должен скрываться в тексте другой спецификации. Приоритеты: `P0` блокирует утверждение соответствующей специализированной спеки или запуск; `P1` нужен до реализации функции; `P2` допускает позднее уточнение без потери базовой архитектуры.

Вопрос имеет статус `Открыт`, пока ответ не подтверждён владельцем решения и не перенесён в нормативный документ. Решённая запись не удаляется: она получает дату, ссылку на нормативное решение и сохраняет исторический ID. `Владелец ответа` обозначает роль, а не назначенного человека.

## Phase 0C — triage всех P0

Классификация не заменяет статус вопроса и не выдаёт fallback за решение. Она отвечает, где именно неизвестное останавливает работу:

- `RESOLVED` — есть доказуемое нормативное решение;
- `OWNER_DECISION_REQUIRED` — требуется явный ответ владельца, но до указанного момента действует безопасное поведение;
- `EXTERNAL_AMIGO_DATA_REQUIRED` — нужны авторизованные данные, выгрузка или подтверждение AMIGO;
- `BLOCKER_BEFORE_FOUNDATION` — вопрос должен быть закрыт до начала Phase 1A;
- `BLOCKER_BEFORE_FEATURE` — Foundation не блокируется, но указанная функция не активируется;
- `SAFE_DEFAULT_AVAILABLE` — безопасный MVP-вариант уже определён, вопрос остаётся открытым для улучшения;
- `DEFERRED_POST_MVP` — решение не нужно для замороженного MVP;
- `DUPLICATE` — смысл полностью покрыт другим ID;
- `INVALIDATED` — предпосылка вопроса больше не действует.

Risk отражает последствия неверного предположения, а не исходный приоритет `P0`. `До какого момента` является gate, а не календарным обещанием.

| ID | Формулировка | Категория / затронутые функции | Risk | Классификация | Решение и источник | Безопасный fallback | До какого момента | Владелец решения |
|---|---|---|---|---|---|---|---|---|
| `TBD-BIZ-001` | Кто является именованным Product Owner и финальным утверждающим? | Governance; approvals всех фаз | High | `RESOLVED` | Product Owner — владелец проекта; Business Owner — отец владельца проекта; полномочия разделены `OWNER-DECISION-001` | — | Закрыт 2026-08-02 | Product Owner / Business Owner |
| `TBD-BIZ-004` | Как устроена фактическая воронка от сообщения до завершённого заказа? | Lead, measure, order, admin, account status | High | `BLOCKER_BEFORE_FEATURE` | Доказанного workflow нет | MVP создаёт заявку и использует только общий безопасный статус; заказ автоматически не создаётся | До реализации переходов заказа в Phase 1E/1F | Владелец бизнеса |
| `TBD-BIZ-005` | Какие юридические реквизиты, документы и формулировки обязательны? | Legal pages, lead, account, warranty, privacy | Critical | `BLOCKER_BEFORE_FEATURE` | Юридическое заключение отсутствует | Не публиковать вымышленные реквизиты/обещания; shared/production-сбор PII выключен | До публичного запуска форм и аккаунтов | Владелец бизнеса / юрист |
| `TBD-LEAD-001` | Срок 2–7 дней календарный или рабочий? | Landing, cart, WhatsApp, orders | High | `RESOLVED` | Календарные дни, включая выходные; `BUSINESS-LEAD-TIME-001` | — | Закрыт 2026-08-02 | Владелец бизнеса |
| `TBD-WARRANTY-001` | Как подаётся и рассматривается гарантийное обращение? | Warranty content/workflow, admin | High | `SAFE_DEFAULT_AVAILABLE` | Покрытие и исключения подтверждены, процесс нет; `BUSINESS-WARRANTY-001`–`003` | Показать подтверждённые условия и ручной контакт; не обещать сроки и не выносить авто-решение | До автоматизации warranty workflow; юридический текст — до launch | Владелец бизнеса / юрист |
| `TBD-ASSORT-002` | Каков полный inventory AMIGO и какие позиции локально активны? | Import, catalog, filters, orderability | High | `RESOLVED` | Phase 1B.2 accepted manifest: 28 categories/56 systems/9 models/1655 variants; reviewed v2 composition активна с `VISIBLE`, `PUBLISHED`, `INQUIRY_ONLY` и approved local media | — | Закрыт 2026-08-04; exact configurator compatibility остаётся `TBD-ASSORT-003` | Владелец / менеджер каталога / AMIGO |
| `TBD-ASSORT-003` | Какова совместимость механизмов, кассет, направляющих и опций? | Configurator, price, preview, order | Critical | `EXTERNAL_AMIGO_DATA_REQUIRED` | Матрица не предоставлена | Неизвестное сочетание → `MANUAL_REVIEW`, без точной цены/обещания заказа | До активации соответствующей комбинации в Phase 1C | Мастер / владелец / AMIGO |
| `TBD-SYSTEM-001` | Какие рулонные системы производятся? | Catalog baseline | High | `RESOLVED` | Перечень зафиксирован в [GLOBAL_SPEC §11.1](../specs/GLOBAL_SPEC.md#111-каталог) | — | Закрыт 2026-08-02 | Владелец / мастер |
| `TBD-HORIZONTAL-001` | Какие размеры алюминиевых ламелей доступны? | Horizontal catalog | High | `RESOLVED` | 16/25/50 мм и «Волна» 35 мм; [GLOBAL_SPEC §11.1](../specs/GLOBAL_SPEC.md#111-каталог) | — | Закрыт 2026-08-02 | Владелец / мастер |
| `TBD-VERTICAL-001` | Какие типы вертикальных жалюзи доступны? | Vertical catalog | High | `RESOLVED` | Тканевые, «Бриз», пластиковые, алюминиевые, мультифактурные; [GLOBAL_SPEC §11.1](../specs/GLOBAL_SPEC.md#111-каталог) | — | Закрыт 2026-08-02 | Владелец / мастер |
| `TBD-SOURCE-AMIGO-001` | Подтверждены ли партнёрство и permission scope AMIGO? | Catalog, price, media, badge | Critical | `RESOLVED` | `PARTNER-001`–`006` | — | Закрыт 2026-08-02 | Владелец / AMIGO |
| `TBD-SOURCE-AMIGO-002` | Каков разрешённый полный export/transport AMIGO и процесс обновления? | Phase 1B.2 full import, Phase 1C price sync | Critical | `EXTERNAL_AMIGO_DATA_REQUIRED` | Public-page fallback принят: 114 safe paths, semantic source version, full manifest/import/activation и no-op evidence; official API/export/file/schema всё ещё не доказаны | Активная локальная v2 остаётся доступной; любое будущее обновление сначала staged и останавливается при credential/CAPTCHA/access/identity/parser blockers | Public-page aspect принят 2026-08-04; official export aspect остаётся открытым без evidence | Владелец / AMIGO / менеджер каталога |
| `TBD-ASSET-AMIGO-001` | Разрешён ли локальный импорт/публикация изображений AMIGO? | Catalog media, preview, badge | Critical | `RESOLVED` | `PARTNER_LICENSE`, `PARTNER-002/003`, `ASSET-013`–`015` | — | Закрыт 2026-08-02 | Владелец / AMIGO |
| `TBD-ASSET-AMIGO-002` | Какие категории media покрывает разрешение? | Product/material/examples/badge | Critical | `RESOLVED` | `PARTNER-002/006`, `ASSET-IMPORT-*` | — | Закрыт 2026-08-02 | Владелец контента / AMIGO |
| `TBD-PRICE-001` | Какая AMIGO-origin PriceVersion активна и проверена? | Preliminary pricing, quote history | Critical | `RESOLVED` | Catalog PriceVersion v2 `9fdc0a74-9fab-4d63-b4b6-015f534e117d` сохраняет source card/base records; active calculation PriceVersion v5 `7618714e-0baf-463a-8311-e9cf84879dd1` pins four reviewed rules and 40 parity fixtures | — | Закрыт 2026-08-08 для Phase 1C; future versions require the same review/parity gate | Владелец / бухгалтер / AMIGO |
| `TBD-PRICE-002` | Как округляются размеры и площадь? | Pricing, dimensions, parity | Critical | `EXTERNAL_AMIGO_DATA_REQUIRED` | Integer half-up area pricing proven only for horizontal model 28 and vertical model 43 in dated Phase 1C evidence | Other rule scopes do not round by guess and require request/manual review | Before automatic activation of another rule scope | Владелец / мастер / AMIGO |
| `TBD-PRICE-003` | Какова minimum Billable Area и scope? | Pricing rules | Critical | `EXTERNAL_AMIGO_DATA_REQUIRED` | One square metre proven only for horizontal model 28 and vertical model 43 verified envelopes | Do not generalize minimum area to roller/Zebra/other systems | Before automatic activation of another rule scope | Владелец / мастер / AMIGO |
| `TBD-PRICE-004` | Какова формула горизонтальных алюминиевых жалюзи? | Horizontal pricing | Critical | `EXTERNAL_AMIGO_DATA_REQUIRED` | Model 28 / material 918 integer one-square-metre area rule and ten examples verified 2026-08-08 | Other models/materials use `PRICE_ON_REQUEST` or manual review | Before expanding horizontal auto-pricing | Владелец / мастер / AMIGO |
| `TBD-PRICE-005` | Какова формула вертикальных жалюзи? | Vertical pricing | Critical | `EXTERNAL_AMIGO_DATA_REQUIRED` | Model 43 / material 1006 integer one-square-metre area rule and ten examples verified 2026-08-08 | Other models/materials use `PRICE_ON_REQUEST` or manual review | Before expanding vertical auto-pricing | Владелец / мастер / AMIGO |
| `TBD-PRICE-006` | Каковы налоговый режим и обязательный показ цены? | Price UI, legal, quote | Critical | `BLOCKER_BEFORE_FEATURE` | Финансово-юридическое решение отсутствует | Не делать налоговых/офертных утверждений; сумма только предварительная | До публичного numeric pricing | Владелец / бухгалтер / юрист |
| `TBD-PRICE-007` | Кто и как вводит PriceVersion в действие? | Admin pricing activation, audit | Critical | `RESOLVED` | Только `OWNER`/`ADMIN` после diff и подтверждения; все активации audited, `OWNER-DECISION-002` | — | Закрыт 2026-08-02; реализован и проверен 2026-08-08 | Product Owner / Business Owner |
| `TBD-PRICE-008` | Каков срок применимости preliminary quote? | Saved calculations, cart, order | High | `SAFE_DEFAULT_AVAILABLE` | Срок не подтверждён | Не показывать срок; перед заказом требовать явную перепроверку без изменения истории | До обещания срока/expiry в UI | Владелец / юрист |
| `TBD-PRICE-CATEGORY-001` | Ограничены ли price categories значениями 1–5? | Catalog/pricing schema | High | `RESOLVED` | Dynamic string; `FR-CATALOG-020`, `FR-VARIANT-001` | — | Закрыт 2026-08-02 | Владелец / менеджер каталога |
| `TBD-MIN-PRICE-001` | 1500 рублей — minimum на изделие или заказ? | Pricing minimum | Critical | `RESOLVED` | Minimum применяется к каждой отдельно изготавливаемой единице изделия; `OWNER-DECISION-003` | До активной проверенной PriceVersion не показывать числовой результат | Закрыт 2026-08-02; реализован и проверен 2026-08-08 | Business Owner / бухгалтер |
| `TBD-MECHANISM-001` | Что входит в базовую стоимость механизма? | Base price/breakdown/config | Critical | `BLOCKER_BEFORE_FEATURE` | Состав не подтверждён | Не показывать детализированную базовую комплектацию/числовой breakdown | До numeric pricing конкретной системы | Владелец / мастер |
| `TBD-PRICE-SOURCE-001` | Какой AMIGO region/context использовать для snapshots? | Source price, parity | Critical | `RESOLVED` | Visible Grozny context is pinned by Phase 1C source version `amigo-public-calculator-2026-08-08-9f9246330385` | — | Закрыт 2026-08-08 для initial rule version; each future source version pins its own context | Владелец / бухгалтер / AMIGO |
| `TBD-PRICE-SOURCE-002` | Каковы cadence и staleness threshold каталога/цен? | Sync, alerts, price activation | High | `RESOLVED` | Автоматически раз в сутки и вручную admin; >7 дней `STALE_WARNING`, >30 дней — обязательная admin verification перед публикацией изменённой цены/нового товара; `OWNER-DECISION-005` | — | Закрыт 2026-08-02; sync implementation не входит в Phase 1A | Business Owner / администратор |
| `TBD-PRICE-PARITY-001` | Какое отклонение от AMIGO допустимо? | Pricing parity gate | Critical | `RESOLVED` | При одинаковых source version/system/material/dimensions/hardware/options/quantity абсолютное отклонение ≤1 рубля; больше — parity error, `OWNER-DECISION-006` | — | Закрыт 2026-08-02; fixture/source gates остаются | Business Owner / бухгалтер |
| `TBD-INVENTORY-001` | В каких единицах учитывать физические остатки? | Quantitative stock/reservations | High | `SAFE_DEFAULT_AVAILABLE` | MVP требует только binary availability | Не вести/не показывать количественный остаток; manual `IN_STOCK/OUT_OF_STOCK` | До quantitative inventory post-MVP | Владелец / снабжение |
| `TBD-INVENTORY-002` | Где source of truth наличия и cadence обновления? | Catalog availability/admin | High | `RESOLVED` | Business Owner — decision authority; подтверждённая локальная запись в admin/PostgreSQL — operational system of record; AMIGO только предлагает и не перезаписывает её, `OWNER-DECISION-004/005/008` | — | Закрыт 2026-08-02; availability UI остаётся Phase 1B+ | Business Owner / снабжение |
| `TBD-SIZE-001` | Каковы технические пределы каждой Product System? | Configurator, price, preview, order | Critical | `EXTERNAL_AMIGO_DATA_REQUIRED` | Verified Phase 1C fixture envelopes and horizontal 435 mm minimum cover only four initial rule scopes | Unknown/out-of-envelope size → `MANUAL_REVIEW_REQUIRED` and free measurement | Before expanding automatic validation beyond verified scopes | Мастер / владелец / AMIGO |
| `TBD-DIM-002` | Какие ширину/высоту вводить для каждого монтажа? | Configurator UX, quote | Critical | `BLOCKER_BEFORE_FEATURE` | Схемы замера отсутствуют | Поля принимают целые пользовательские миллиметры без вычетов/припусков; результат называется предварительным, бесплатный замер показан отдельно | До публикации инструкций замера или manufacturing handoff | Мастер / UX |
| `TBD-DIM-003` | Какие вычеты, припуски и допуски применяются? | Configuration/pricing/manufacturing | Critical | `BLOCKER_BEFORE_FEATURE` | Формулы отсутствуют | Не преобразовывать пользовательские размеры автоматически | До calculation rules Phase 1C | Мастер |
| `TBD-DIM-004` | Как считать створки, зазоры и группы окон? | Multi-item config/pricing | Critical | `BLOCKER_BEFORE_FEATURE` | Правила отсутствуют | Каждая створка — отдельная черновая позиция; итог требует ручной проверки | До multi-sash automatic calculation | Мастер |
| `TBD-INSTALL-001` | Какие способы/поверхности монтажа поддерживаются? | Configurator, measure, order | Critical | `BLOCKER_BEFORE_FEATURE` | Справочник совместимости отсутствует | Не обещать совместимость; route на бесплатный замер | До activation mounting options Phase 1C | Мастер |
| `TBD-INSTALL-002` | Какие условия объекта делают монтаж невозможным/особым? | Warnings, measure, order | Critical | `BLOCKER_BEFORE_FEATURE` | Критерии отсутствуют | Не подтверждать монтаж по фото/анкете; решение после замера | До automatic install eligibility | Мастер |
| `TBD-SERVICE-001` | Бесплатен ли замер при любом размере заказа? | Service lines, lead | High | `RESOLVED` | Да, для подтверждённого ассортимента/региона; `BUSINESS-FREE-SERVICES-001` | — | Закрыт 2026-08-02 | Владелец |
| `TBD-SERVICE-002` | Бесплатна ли доставка по всей Чеченской Республике? | Service lines, landing/cart | High | `RESOLVED` | Да; `BUSINESS-FREE-SERVICES-001` | — | Закрыт 2026-08-02 | Владелец |
| `TBD-SERVICE-003` | Бесплатна ли установка для подтверждённых систем? | Service lines, landing/cart | High | `RESOLVED` | Да; техническая возможность отдельно; `BUSINESS-FREE-SERVICES-001` | — | Закрыт 2026-08-02 | Владелец / мастер |
| `TBD-INSTALLMENT-001` | Кто предоставляет рассрочку? | Automated installment | Critical | `DEFERRED_POST_MVP` | MVP заморожен на neutral manager handoff; `BUSINESS-INSTALLMENT-001` | Только утверждённая нейтральная фраза и WhatsApp | До post-MVP автоматизации/условий | Владелец / юрист |
| `TBD-INSTALLMENT-009` | Кто сторона договора рассрочки? | Automated installment/legal | Critical | `DEFERRED_POST_MVP` | Автоматическая заявка исключена из MVP | Никакого договора/одобрения на сайте; manager handoff | До post-MVP автоматизации | Владелец / провайдер / юрист |
| `TBD-INSTALLMENT-010` | Как обрабатываются данные в рассрочке? | Automated installment/privacy | Critical | `DEFERRED_POST_MVP` | MVP не собирает документы и не передаёт их провайдеру | WhatsApp payload ограничен расчётом и введённым именем | До post-MVP сбора/передачи данных | Privacy / юрист / провайдер |
| `TBD-INSTALLMENT-012` | Доступна ли рассрочка во всех населённых пунктах? | Installment claims/eligibility | High | `DEFERRED_POST_MVP` | География не подтверждена; neutral claim не обещает eligibility | Условия и доступность уточняет менеджер индивидуально | До публикации географии/eligibility | Владелец / провайдер |
| `TBD-ACCOUNT-001` | Входит ли кабинет в MVP? | Account scope, saved calculations | High | `RESOLVED` | Phase 0C: базовый кабинет с сохранёнными расчётами входит в MVP; регистрация не обязательна; [MVP_SCOPE](../06-plans/MVP_SCOPE.md) | Гостевой каталог/config/quote/lead остаётся полным | Закрыт 2026-08-02 | Владелец продукта |
| `TBD-ACCOUNT-003` | Как связать существующий заказ с аккаунтом? | Historical order claim | Critical | `DEFERRED_POST_MVP` | Замороженный кабинет MVP хранит расчёты; claim существующих заказов не обязателен | Не показывать/не присоединять заказ без proof of ownership | До post-MVP order claim | Владелец / Security |
| `TBD-DESIGN-001` | Каковы финальные brand/logo/palette/type? | Landing/design/content | High | `SAFE_DEFAULT_AVAILABLE` | Бренд не утверждён; `PROJECT_NAME` и существующий premium interior-tech direction остаются рабочими | Нейтральный wordmark `PROJECT_NAME`, без чужого брендинга | До production brand publication Phase 1H | Владелец / дизайнер |
| `TBD-AI-001` | Как сравнивать AI/CV providers/self-hosted? | Phase 1G provider decision | Critical | `BLOCKER_BEFORE_FEATURE` | Criteria/evaluation не утверждены | Только deterministic/manual geometry; provider не выбирается | До provider ADR и external processing | Architecture / Product |
| `TBD-AI-002` | Какой benchmark и метрики определяют качество? | Detection/segmentation/AI gate | Critical | `BLOCKER_BEFORE_FEATURE` | Rights-cleared dataset/thresholds отсутствуют | Не заявлять auto quality; manual correction/base-only | До Phase 1G acceptance | Product / CV / мастер |
| `TBD-AI-003` | Какие file/image limits допустимы? | Upload security/UX/cost | Critical | `BLOCKER_BEFORE_FEATURE` | Форматы/лимиты не подтверждены | Upload endpoint/production storage не включать | До реализации upload Phase 1G | Engineering / Security / Product |
| `TBD-AI-005` | Как включается generative refinement? | AI UX/consent/cost | High | `SAFE_DEFAULT_AVAILABLE` | Контракт допускает только optional refinement после base | Выключено по умолчанию; запуск только явным действием и feature flag | До решения изменить default | Product / Privacy |
| `TBD-AI-006` | Каковы guest/customer processing limits? | Abuse/cost/queues | Critical | `BLOCKER_BEFORE_FEATURE` | Бюджет/лимиты отсутствуют | External AI выключен; bounded synthetic tests only | До public Phase 1G pilot | Product / владелец |
| `TBD-AI-007` | Гарантирует ли provider no-training/region/delete? | Private external processing | Critical | `BLOCKER_BEFORE_FEATURE` | Provider/contract не выбран | Ничего не передавать внешнему AI; geometric local fallback | До первого external photo transfer | Privacy / Legal / Architecture |
| `TBD-INFRA-002` | Где проверять региональную доступность без VPN? | Hosting/performance/release | High | `RESOLVED` | Грозный, Урус-Мартан, Аргун, Гудермес; mobile + home/office Wi-Fi; ≥2 routes; mobile/desktop Chrome, `OWNER-DECISION-007` | Production release не получает regional PASS без полного evidence | Закрыт 2026-08-02; измерения выполняются до Phase 1H release | Product Owner / Engineering |
| `TBD-INFRA-004` | Какие data residency требования применимы? | Production DB/storage/AI/backup | Critical | `BLOCKER_BEFORE_FEATURE` | Legal/privacy ограничение неизвестно | Phase 1A только local/isolated synthetic data; production provider и PII запрещены | До shared staging/production с PII или private media | Privacy / Legal |
| `TBD-INFRA-010` | Какой production object-storage provider, region и migration/exit contract выбраны? | Production storage/media delivery | Critical | `BLOCKER_BEFORE_FEATURE` | `OWNER-DECISION-011` выбрал только local/CI VersityGW; Supabase Storage, Cloudflare R2, AWS S3 и другие S3-compatible варианты не оценены | VersityGW только для local/CI; shared staging/production storage не создавать | До shared staging или production storage selection | Product Owner / Architecture / Security / Privacy |
| `TBD-INFRA-006` | Каков WhatsApp integration mode? | Phase 1E handoff | High | `SAFE_DEFAULT_AVAILABLE` | Business API не подтверждён | Editable `wa.me`/deep-link или copy-to-clipboard с confirmed number; не заявлять delivery | До выбора Business API/automation | Владелец / Architecture |
| `TBD-PRIV-001` | Каков TTL гостевых фото и производных? | Guest upload/delete | Critical | `BLOCKER_BEFORE_FEATURE` | TTL юридически не утверждён | Не принимать production guest photos | До Phase 1G guest upload | Privacy / владелец |
| `TBD-PRIV-002` | Каковы сроки фото клиента, заявки и заказа? | Account/lead/order/media retention | Critical | `BLOCKER_BEFORE_FEATURE` | Retention matrix отсутствует | Synthetic data only; не включать долговременное photo storage | До соответствующего PII/media feature | Privacy / юрист |
| `TBD-PRIV-003` | Каковы basis/consent для upload и AI? | Photo upload/AI processing | Critical | `BLOCKER_BEFORE_FEATURE` | Legal text/record absent | Upload/AI external processing disabled | До Phase 1G upload | Privacy / юрист |
| `TBD-PRIV-004` | Кто data controller и как выполняются access/delete requests? | Legal notice, DSAR, accounts/leads | Critical | `BLOCKER_BEFORE_FEATURE` | Реквизиты/process отсутствуют | Не собирать реальные PII в shared environment; ручной канал не выдумывать | До public account/lead/photo collection | Владелец / юрист |
| `TBD-PRIV-005` | Какие subprocessors/contracts допустимы? | Hosting, storage, AI, analytics | Critical | `BLOCKER_BEFORE_FEATURE` | Список/DPA отсутствуют | Только local synthetic Foundation; внешняя обработка выключена | До подключения любого PII/private-media processor | Privacy / Legal |
| `TBD-ANALYTICS-002` | Какие решения должен поддерживать первый reporting? | Product analytics/dashboard | High | `SAFE_DEFAULT_AVAILABLE` | Сложная аналитика отнесена post-MVP | На MVP — только privacy-safe operational health; behavioral analytics off until purpose/consent | До включения продуктовой аналитики Phase 1H/post-MVP | Владелец / Product |

### Сводка P0 Phase 0C

| Показатель | Значение |
|---|---:|
| Всего исторических P0 ID | 61 |
| Открытых и неклассифицированных до Phase 0C | 50 |
| Классифицированных после Phase 0C | 61 |
| Неклассифицированных после Phase 0C | 0 |
| `RESOLVED` | 21 |
| `OWNER_DECISION_REQUIRED` | 0 |
| `EXTERNAL_AMIGO_DATA_REQUIRED` | 8 |
| `BLOCKER_BEFORE_FOUNDATION` | 0 |
| `BLOCKER_BEFORE_FEATURE` | 20 |
| `SAFE_DEFAULT_AVAILABLE` | 7 |
| `DEFERRED_POST_MVP` | 5 |
| `DUPLICATE` / `INVALIDATED` | 0 / 0 |

## Бизнес

| ID | P | Вопрос | Зачем нужен ответ / критерий закрытия | Владелец ответа | Статус |
|---|---|---|---|---|---|
| TBD-BIZ-001 | P0 | Кто является именованным владельцем продукта и финальным утверждающим документацию? | Решено: Product Owner — владелец проекта; Business Owner — отец владельца проекта; полномочия разделены. | Product Owner / Business Owner | Решён — 2026-08-02, `OWNER-DECISION-001` |
| TBD-BIZ-003 | P1 | Какие рабочие часы и ожидаемое время ответа показываются рядом с подтверждённым WhatsApp? | Нужен операционный SLA без выдуманных обещаний. | Владелец бизнеса | Открыт |
| TBD-BIZ-004 | P0 | Как выглядит текущая воронка от первого сообщения до завершённого заказа? | Нужна согласованная карта этапов, ответственных и критериев перехода. | Владелец бизнеса | Открыт |
| TBD-BIZ-005 | P0 | Какие юридические реквизиты, документы и формулировки обязательны на сайте? | Нужны подтверждённые данные и юридическая проверка. | Владелец бизнеса / юрист | Открыт |
| TBD-BIZ-007 | P1 | Что считается успешной заявкой, продажей и повторным обращением? | Нужны определения знаменателей и событий для продуктовых метрик. | Владелец бизнеса | Открыт |
| TBD-LEAD-001 | P0 | Подтверждённый срок изготовления от 2 до 7 дней указан в календарных или рабочих днях? | Решено: календарные дни, включая выходные; `BUSINESS-LEAD-TIME-001`. | Владелец бизнеса | Решён — 2026-08-02, [GLOBAL_SPEC §2](../specs/GLOBAL_SPEC.md#2-подтверждённый-бизнес-контекст) |
| TBD-WARRANTY-001 | P0 | Как клиент обращается по гарантии, какие доказательства нужны, каковы сроки проверки и доступные способы удовлетворения требования? | Покрытие и исключения подтверждены в `BUSINESS-WARRANTY-001`–`003`; вопрос закрывается утверждённым процессом и юридической проверкой без уменьшения прав потребителя. | Владелец бизнеса / юрист | Открыт; scope уточнён 2026-08-02 |

## Ассортимент

| ID | P | Вопрос | Зачем нужен ответ / критерий закрытия | Владелец ответа | Статус |
|---|---|---|---|---|---|
| TBD-ASSORT-002 | P0 | Как выглядит полный проверенный inventory всех текущих AMIGO source categories, systems, models, materials и variants и какие из них локально публикуются/заказываются? | Accepted manifest: 28 categories, 56 systems, 9 models, 451 materials, 1655 variants, 2940 material media placements and 1664 price records; active v2 composition публикует все 1655 variants как `INQUIRY_ONLY`. | Владелец / менеджер каталога | Решён — 2026-08-04, [Phase 1B.2 completion report](../06-plans/completed/PHASE_1B2_FULL_AMIGO_CATALOG_REPORT.md) |
| TBD-ASSORT-003 | P0 | Какие механизмы, кассеты, направляющие и опции совместимы с каждой моделью? | Нужна матрица совместимости и доказательство от производства/поставщика. | Мастер / владелец | Открыт |
| TBD-ASSORT-004 | P1 | На каком уровне назначается SKU и как выглядит схема кодов? | Нужна стабильная идентификация для каталога, остатков и заказов. | Владелец / учёт | Открыт |
| TBD-ASSORT-005 | P1 | Какие характеристики и фильтры важны клиенту для выбора? | Нужен подтверждённый набор атрибутов и терминов. | Владелец / исследование клиентов | Открыт |
| TBD-ASSORT-006 | P1 | Какие конкретные AMIGO/local files сопоставлены каждому Material Variant и готовы к публикации? | Accepted asset inventory содержит 3 053 typed references, 2 818 distinct local objects и primary mapping для 1 655/1 655 MaterialVariant; все объекты имеют `PARTNER_LICENSE` и `PUBLICATION_APPROVED`. | Владелец контента | Решён — 2026-08-04, [Phase 1B.2 completion report](../06-plans/completed/PHASE_1B2_FULL_AMIGO_CATALOG_REPORT.md) |
| TBD-ASSORT-007 | P1 | Какие позиции могут быть заказными, снятыми с продажи или временно скрытыми? | Нужны правила публикации и клиентские формулировки. | Владелец / снабжение | Открыт |
| TBD-SYSTEM-001 | P0 | Какие конкретные рулонные системы производятся? | Решено перечнем source/catalog entities рулонных и Zebra-систем; их нормализованный mapping и технические ограничения остаются `TBD-ASSORT-003`/`TBD-SIZE-001`. | Владелец / мастер | Решён — 2026-08-02, [GLOBAL_SPEC §11.1](../specs/GLOBAL_SPEC.md#111-каталог) |
| TBD-HORIZONTAL-001 | P0 | Какие размеры алюминиевых ламелей горизонтальных жалюзи доступны? | Решено: лента 16, 25, 50 мм и «Волна» 35 мм; технические ограничения остаются `TBD-SIZE-001`. | Владелец / мастер | Решён — 2026-08-02, [GLOBAL_SPEC §11.1](../specs/GLOBAL_SPEC.md#111-каталог) |
| TBD-VERTICAL-001 | P0 | Какие материалы и типы вертикальных жалюзи доступны? | Решено: тканевые, «Бриз», пластиковые, алюминиевые и мультифактурные; неизвестная ширина ламели не выдумывается. | Владелец / мастер | Решён — 2026-08-02, [GLOBAL_SPEC §11.1](../specs/GLOBAL_SPEC.md#111-каталог) |

## Внешние источники и права на активы

| ID | P | Вопрос | Зачем нужен ответ / критерий закрытия | Владелец ответа | Статус |
|---|---|---|---|---|---|
| TBD-SOURCE-AMIGO-001 | P0 | Есть ли у бизнеса официальный партнёрский/B2B-доступ AMIGO и какое использование данных он разрешает? | Решено: официальный партнёрский статус и permission scope каталога, цен, медиа, технических данных, самостоятельной калькуляторной логики и бейджа подтверждены; конкретный transport/export остаётся `TBD-SOURCE-AMIGO-002`. | Владелец / AMIGO / юрист | Решён — 2026-08-02, `PARTNER-001`–`006` |
| TBD-SOURCE-AMIGO-002 | P0 | Может ли AMIGO предоставлять разрешённую полную выгрузку каталога/цен, в каком формате и каков процесс обновления? | Public-page fallback доказан dated capture 2026-08-03 через existing adapter: 114 safe paths, stable identity, semantic source hash, 0 failures. Official export/file sample/schema, если они существуют, всё ещё нельзя предполагать. | Владелец / AMIGO / менеджер каталога | Public-page aspect доказан; official export aspect открыт без evidence |
| TBD-ASSET-AMIGO-001 | P0 | Есть ли партнёрская лицензия на локальный импорт и публичное использование изображений AMIGO? | Решено владельцем: `PARTNER_LICENSE` охватывает фото товаров, тканей, материалов и примеров; конкретный файл проходит mapping и publication record. | Владелец / AMIGO / юрист | Решён — 2026-08-02, `PARTNER-002/003`, `ASSET-013`–`015` |
| TBD-ASSET-AMIGO-002 | P0 | Какие категории AMIGO покрывает разрешение? | Решено: каталоговые фото товаров, тканей, материалов, примеров изделий, badge и разрешённые logos; training и запрещённые модификации не входят. | Владелец контента / AMIGO | Решён — 2026-08-02, `PARTNER-002/006`, `ASSET-IMPORT-*` |
| TBD-ASSET-AMIGO-003 | P1 | Какая точная атрибуция и дополнительные brand guidelines AMIGO применяются к каждой публичной поверхности? | Нужны точные подписи/placement, ограничения изменения, cache/delete и контакт для отзыва; вопрос не отменяет подтверждённый общий permission scope. | Владелец контента / AMIGO | Открыт |
| TBD-ASSET-CATALOG-001 | P1 | Разрешено ли публично использовать собственные фотографии физического каталога и в каком объёме? | Нужны правообладатель, основание, допустимое кадрирование/атрибуция и решение по AI; владение каталогом недостаточно. | Владелец / поставщик / юрист | Открыт |
| TBD-ASSET-RETENTION-001 | P1 | Каков срок хранения непользовательских originals, разрешённых производных и заблокированных media assets? | Нужна матрица по категории, лицензии, отзыву, cache и audit record без выдуманной бессрочности. | Владелец контента / юрист | Открыт |

## Цены

| ID | P | Вопрос | Зачем нужен ответ / критерий закрытия | Владелец ответа | Статус |
|---|---|---|---|---|---|
| TBD-PRICE-001 | P0 | Какая разрешённая AMIGO-origin `PriceVersion` и какие реальные snapshots/локальные правила утверждены для каждой системы и материала? | Catalog PriceVersion v2 pins source card/base revisions; calculation PriceVersion v5 `7618714e-0baf-463a-8311-e9cf84879dd1` pins four rules, source evidence and 40 parity fixtures. Other scopes remain request/manual under `TBD-PRICE-002`–`006` and `TBD-MECHANISM-001`. | Владелец / бухгалтер | Решён — 2026-08-08, Phase 1C pricing verification/report |
| TBD-PRICE-002 | P0 | Как округляются ширина, высота и площадь при расчёте? | Integer half-up proven for Phase 1C horizontal model 28 and vertical model 43 only; other scopes remain open/manual. | Владелец / мастер | Частично решён — 2026-08-08, dated pricing verification |
| TBD-PRICE-003 | P0 | Какова минимальная Billable Area и для каких систем она применяется? | One square metre proven for the same two rule scopes only; no cross-family generalization. | Владелец / мастер | Частично решён — 2026-08-08 |
| TBD-PRICE-004 | P0 | Какова формула горизонтальных алюминиевых жалюзи? | Model 28/material 918 rule and envelope verified; other horizontal combinations remain manual/request. | Владелец / мастер | Частично решён — 2026-08-08 |
| TBD-PRICE-005 | P0 | Какова формула вертикальных жалюзи? | Model 43/material 1006 rule and envelope verified; other vertical combinations remain manual/request. | Владелец / мастер | Частично решён — 2026-08-08 |
| TBD-PRICE-006 | P0 | Каковы налоговый режим и обязательный формат показа рублёвой цены? | Нужна юридически и финансово подтверждённая презентация. | Владелец / бухгалтер | Открыт |
| TBD-PRICE-007 | P0 | Как публикуется, утверждается и вводится в действие версия прайс-листа? | Решено: только `OWNER`/`ADMIN`, после exact diff и подтверждения, с audit каждой активации. | Product Owner / Business Owner | Решён — 2026-08-02, `OWNER-DECISION-002` |
| TBD-PRICE-008 | P0 | Каков срок применимости предварительного предложения и что происходит после него? | Нужна политика истечения без выдуманного периода. | Владелец / юрист | Открыт |
| TBD-PRICE-009 | P1 | Как показывать клиенту разбивку цены и ручное изменение после замера? | Нужен согласованный уровень прозрачности и объяснение изменений. | Владелец / UX | Открыт |
| TBD-PRICE-010 | P1 | Какие надбавки, скидки, акции и ручные корректировки допустимы? | Нужны приоритеты, совместимость и права ролей. | Владелец | Открыт |
| TBD-PRICE-CATEGORY-001 | P0 | Ограничены ли price categories значениями 1–5 и какова их область? | Решено: `sourcePriceCategory` — динамическая строка по material/source context; наблюдаются `E`, `0`, `1`–`5`; nullable `localPriceTier` хранится отдельно. | Владелец / менеджер каталога | Решён — 2026-08-02, `FR-CATALOG-020`, `FR-VARIANT-001` |
| TBD-MIN-PRICE-001 | P0 | Минимальная стоимость 1500 рублей применяется к одному изделию или ко всему заказу? | Решено: к каждой отдельно изготавливаемой единице; 1100 → 1500, две единицы → 3000. | Business Owner / бухгалтер | Решён — 2026-08-02, `OWNER-DECISION-003`; реализован 2026-08-08 в Phase 1C |
| TBD-MECHANISM-001 | P0 | Что входит в базовую стоимость механизма? | Нужна граница базовой комплектации; бесплатные услуги в неё не входят. | Владелец / мастер | Открыт |
| TBD-PRICE-SOURCE-001 | P0 | Какой город/регион должен быть выбран в AMIGO для базовых price snapshots PROJECT_NAME? | Initial Phase 1C source version pins the visible Grozny context; future versions must pin and review context again. | Владелец / бухгалтер | Решён — 2026-08-08, pricing verification |
| TBD-PRICE-SOURCE-002 | P0 | Как часто проверяются каталог/цены AMIGO и когда локальная версия считается устаревшей? | Решено: daily + manual; >7 дней warning, >30 дней admin verification до публикации changed price/new product. | Business Owner / администратор | Решён — 2026-08-02, `OWNER-DECISION-005` |
| TBD-PRICE-PARITY-001 | P0 | Какое абсолютное и/или процентное отклонение локального калькулятора от AMIGO допустимо? | Решено: абсолютное отклонение ≤1 рубля при одинаковых утверждённых входах; больше — parity error. | Business Owner / бухгалтер | Решён — 2026-08-02, `OWNER-DECISION-006` |

## Остатки

| ID | P | Вопрос | Зачем нужен ответ / критерий закрытия | Владелец ответа | Статус |
|---|---|---|---|---|---|
| TBD-INVENTORY-001 | P0 | В каких единицах учитываются ткани, рулоны, механизмы и комплектующие? | Нужен словарь единиц и правила пересчёта. | Владелец / снабжение | Открыт |
| TBD-INVENTORY-002 | P0 | Где сейчас находится источник правды об остатках и как часто он обновляется? | Решено: Business Owner определяет local availability, подтверждённая admin/PostgreSQL-запись является operational system of record; AMIGO предлагает статус без автоматической перезаписи. | Business Owner / снабжение | Решён — 2026-08-02, `OWNER-DECISION-004/005/008` |
| TBD-INVENTORY-004 | P1 | Нужны ли резервы под расчёт, заявку или только подтверждённый заказ? | Нужны момент, срок и правила освобождения резерва. | Владелец | Открыт |
| TBD-INVENTORY-005 | P1 | Нужно ли учитывать разные партии и различие оттенков? | Нужен производственный критерий совместимости партий. | Мастер / снабжение | Открыт |
| TBD-INVENTORY-006 | P2 | Есть ли несколько мест хранения или план их появления? | Нужна модель location без преждевременной сложности. | Владелец | Открыт |
| TBD-INVENTORY-007 | P1 | Разрешён ли заказ при отсутствии и как показывать ожидаемое поступление? | Нужна честная клиентская формулировка без ложных сроков. | Владелец / снабжение | Открыт |

## Размеры

| ID | P | Вопрос | Зачем нужен ответ / критерий закрытия | Владелец ответа | Статус |
|---|---|---|---|---|---|
| TBD-SIZE-001 | P0 | Каковы технические ограничения каждой реально используемой Product System? | Four Phase 1C scopes have verified envelopes; all other systems/sizes remain manual until sourced. | Мастер / владелец | Частично решён — 2026-08-08 |
| TBD-DIM-002 | P0 | Какие именно ширину и высоту должен вводить клиент для каждого способа монтажа? | Нужны однозначные схемы, подписи и примеры. | Мастер / UX | Открыт |
| TBD-DIM-003 | P0 | Какие технологические вычеты, припуски и допуски применяются? | Нужны формулы и ответственная роль; значения нельзя угадывать. | Мастер | Открыт |
| TBD-DIM-004 | P0 | Как рассчитываются отдельные створки, зазоры и общая группа окон? | Нужны правила multi-window и multi-sash конфигураций. | Мастер | Открыт |
| TBD-DIM-005 | P1 | Как нормализовать дробный пользовательский ввод к целым миллиметрам? | Нужны UI-правило, округление и текст ошибки. | Мастер / Product | Открыт |
| TBD-DIM-006 | P1 | Какие размеры можно считать самостоятельными, а какие требуют обязательного замера? | Нужны флаги риска и условия блокировки подтверждения. | Мастер / владелец | Открыт |

## Монтаж

| ID | P | Вопрос | Зачем нужен ответ / критерий закрытия | Владелец ответа | Статус |
|---|---|---|---|---|---|
| TBD-INSTALL-001 | P0 | Какие способы и поверхности монтажа поддерживаются? | Нужен справочник совместимости и ограничений. | Мастер | Открыт |
| TBD-INSTALL-002 | P0 | Какие условия объекта делают монтаж невозможным или требуют отдельной оценки? | Нужны предупреждения и маршрут к замеру. | Мастер | Открыт |
| TBD-INSTALL-003 | P1 | Как планируется дата/время монтажа и кто подтверждает слот? | Нужен операционный workflow без ложного онлайн-бронирования. | Владелец / менеджер | Открыт |
| TBD-INSTALL-004 | P1 | Какие данные и фотографии нужны мастеру до выезда? | Нужен минимальный набор для заявки и privacy review. | Мастер | Открыт |
| TBD-INSTALL-005 | P1 | Как фиксируются результат, замечания и завершение монтажа? | Нужен критерий статуса заказа и история. | Владелец / мастер | Открыт |

## Доставка

| ID | P | Вопрос | Зачем нужен ответ / критерий закрытия | Владелец ответа | Статус |
|---|---|---|---|---|---|
| TBD-DELIVERY-003 | P1 | Доставка отделена от монтажа или объединена с выездом? | Нужны допустимые комбинации услуг. | Владелец | Открыт |
| TBD-DELIVERY-004 | P1 | Какие сроки можно показывать до подтверждения заказа? | Нужна политика без необоснованных обещаний. | Владелец / снабжение | Открыт |

## Бесплатные услуги

| ID | P | Вопрос | Зачем нужен ответ / критерий закрытия | Владелец ответа | Статус |
|---|---|---|---|---|---|
| TBD-SERVICE-001 | P0 | Действует ли бесплатный замер при любом размере заказа? | Решено без ограничения minimum order: услуга бесплатна для подтверждённого ассортимента в обслуживаемой Чеченской Республике. | Владелец | Решён — 2026-08-02, `BUSINESS-FREE-SERVICES-001` |
| TBD-SERVICE-002 | P0 | Действует ли бесплатная доставка во всех населённых пунктах Чеченской Республики без ограничений? | Решено: бесплатная доставка действует на всей территории `BUSINESS-REGION-001`; московские правила AMIGO не применяются. | Владелец | Решён — 2026-08-02, `BUSINESS-FREE-SERVICES-001` |
| TBD-SERVICE-003 | P0 | Действует ли бесплатная установка для всех подтверждённых систем и типов монтажа? | Решено: установка бесплатна для подтверждённого ассортимента; техническая возможность конкретной конфигурации проверяется отдельно и не является платной зоной. | Владелец / мастер | Решён — 2026-08-02, `BUSINESS-FREE-SERVICES-001` |

## Рассрочка

| ID | P | Вопрос | Зачем нужен ответ / критерий закрытия | Владелец ответа | Статус |
|---|---|---|---|---|---|
| TBD-INSTALLMENT-001 | P0 | Кто предоставляет рассрочку? | Нужны юридическое лицо/внутренняя схема, договорное основание и подтверждение права предлагать продукт; до этого только ручная нейтральная формулировка. | Владелец / юрист | Открыт |
| TBD-INSTALLMENT-002 | P1 | Каков максимальный срок рассрочки? | Нужны точное значение, единица срока и область применимости; срок не показывается до подтверждения. | Владелец / провайдер | Открыт |
| TBD-INSTALLMENT-003 | P1 | Каков первоначальный взнос? | Нужны правило/диапазон и условия; отсутствие взноса не обещается. | Владелец / провайдер | Открыт |
| TBD-INSTALLMENT-004 | P1 | Есть ли проценты или переплата и как они раскрываются клиенту? | Нужны полная стоимость/юридически проверенный текст; «0%» и «без переплат» запрещены без доказательства. | Владелец / провайдер / юрист | Открыт |
| TBD-INSTALLMENT-005 | P1 | Какова минимальная сумма для рассрочки? | Нужны сумма, валюта и связь с minimum order; значение не выводится из 1500 рублей. | Владелец / провайдер | Открыт |
| TBD-INSTALLMENT-006 | P1 | Какие документы клиента требуются? | Нужен минимальный перечень и безопасный канал; сайт не собирает документы до privacy/security review. | Провайдер / Privacy | Открыт |
| TBD-INSTALLMENT-007 | P1 | Каковы возрастные требования? | Нужны законное и договорное основание и точная клиентская формулировка. | Провайдер / юрист | Открыт |
| TBD-INSTALLMENT-008 | P1 | Возможна ли досрочная оплата и на каких условиях? | Нужны подтверждённые правила без обещаний об отсутствии комиссии/переплаты. | Провайдер / владелец | Открыт |
| TBD-INSTALLMENT-009 | P0 | Кто является стороной договора рассрочки? | Нужны стороны, предмет, ответственность и связь договора с заказом. | Владелец / провайдер / юрист | Открыт |
| TBD-INSTALLMENT-010 | P0 | Как обрабатываются персональные данные в сценарии рассрочки? | Нужны оператор/обработчики, поля, основание, согласие, передача, срок, удаление и DSAR; до этого WhatsApp payload ограничен данными расчёта и введённым именем. | Privacy / юрист / провайдер | Открыт |
| TBD-INSTALLMENT-011 | P1 | Каков порядок подачи и обработки заявки на рассрочку после сообщения в WhatsApp? | Нужны шаги, ответственный, канал передачи документов, статусы и fallback; MVP пока заканчивается ручным ответом менеджера. | Владелец / менеджер / провайдер | Открыт |
| TBD-INSTALLMENT-012 | P0 | Доступна ли рассрочка клиентам во всех населённых пунктах Чеченской Республики? | Нужна точная география/исключения; обслуживание всей республики не доказывает одинаковую доступность финансового предложения. | Владелец / провайдер | Открыт |
| TBD-INSTALLMENT-013 | P1 | Какие иные требования к клиенту действуют помимо документов и возраста? | Нужен полный закрытый перечень критериев eligibility; гражданство, регистрация, занятость, доход или одобрение не предполагаются. | Провайдер / владелец / юрист | Открыт |

## Аккаунты

| ID | P | Вопрос | Зачем нужен ответ / критерий закрытия | Владелец ответа | Статус |
|---|---|---|---|---|---|
| TBD-ACCOUNT-001 | P0 | Входит ли клиентский кабинет в MVP или расчёт сохраняется гостевой ссылкой? | Решено: базовый кабинет с сохранёнными расчётами входит в MVP, но каталог, конфигуратор, расчёт и заявка полностью доступны гостю. | Владелец продукта | Решён — 2026-08-02, [MVP_SCOPE](../06-plans/MVP_SCOPE.md) |
| TBD-ACCOUNT-002 | P1 | Какие способы входа допустимы для клиента? | Нужны UX, security и стоимость каналов подтверждения. | Product / Security | Открыт |
| TBD-ACCOUNT-003 | P0 | Как безопасно связать существующие заказы с аккаунтом клиента? | Нужен проверяемый proof-of-ownership. | Владелец / Security | Открыт |
| TBD-ACCOUNT-004 | P1 | Как гостевой расчёт переносится в новый или существующий аккаунт? | Нужны правила владения, дедупликации и срока токена. | Product / Security | Открыт |
| TBD-ACCOUNT-005 | P1 | Какие поля профиля действительно нужны? | Нужен минимизированный набор и основания обработки. | Product / Privacy | Открыт |
| TBD-ACCOUNT-006 | P1 | Как обрабатываются удаление аккаунта и сохранение обязательных данных заказа? | Нужна юридически согласованная матрица retention. | Privacy / юрист | Открыт |

## Дизайн

| ID | P | Вопрос | Зачем нужен ответ / критерий закрытия | Владелец ответа | Статус |
|---|---|---|---|---|---|
| TBD-DESIGN-001 | P0 | Каковы окончательный бренд, логотип, палитра и типографическое направление? | До решения используется только `PROJECT_NAME`; копирование референсов исключено. | Владелец / дизайнер | Открыт |
| TBD-DESIGN-002 | P1 | Какой тон коммуникации и форма обращения к клиенту предпочтительны? | Нужен единый voice & tone для контента и ошибок. | Владелец / контент | Открыт |
| TBD-DESIGN-003 | P1 | Какова утверждённая длительность starfield-вступления и нужен ли показ при повторном визите? | Решено: не более 2–3 секунд, skip, не повторять на каждой странице, reduced motion и упрощение на слабых устройствах. | Product / UX | Решён — 2026-08-02, `NFR-MOTION-001`–`005` |
| TBD-DESIGN-004 | P1 | Какие реальные фото работ разрешены для главной и портфолио? | Business Owner определяет состав local portfolio по `OWNER-DECISION-008`; для закрытия всё ещё нужны конкретные исходники, качество, права/согласие, PII review и подписи. | Владелец контента | Открыт; portfolio authority решена, asset inventory нет |
| TBD-DESIGN-005 | P1 | Какая формулировка предупреждает о приблизительности экранного цвета и визуализации? | Нужен понятный, юридически проверенный текст. | Product / юрист | Открыт |
| TBD-DESIGN-006 | P2 | Нужны ли дополнительные языки кроме русского? | Влияет на контент-модель, SEO и layout. | Владелец | Открыт |
| TBD-PREVIEW-001 | P1 | Какие `SceneProfile`, renderer profiles, family states и assets образуют проверяемое покрытие standard preview первого запуска? | Решён initial-launch aspect 2026-08-08: `WINDOW_CLOSEUP`/`ROOM_WINDOW`, `standard-svg-v2`, Roller/Zebra/horizontal aluminium/vertical, 11-entry approved local manifest, four visual baselines and honest fallback; broader scene/family/exact-swatch expansion remains in the mapping-gap register. Evidence: `OWNER-DECISION-014/015`, Phase 1D report. | Product / дизайн / мастер / контент | Решён |

## AI и computer vision

| ID | P | Вопрос | Зачем нужен ответ / критерий закрытия | Владелец ответа | Статус |
|---|---|---|---|---|---|
| TBD-AI-001 | P0 | Какие критерии и веса используются для сравнения AI/CV-провайдеров и self-hosted вариантов? | Нужна отдельная оценка стоимости, качества, доступности, privacy и lock-in. | Architecture / Product | Открыт |
| TBD-AI-002 | P0 | Какой набор репрезентативных фотографий и метрик определяет приемлемую точность обнаружения/сегментации? | Нужен разрешённый benchmark и пороги приёмки без выдуманных чисел. | Product / CV / мастер | Открыт |
| TBD-AI-003 | P0 | Какие форматы, размеры файла/изображения и лимиты загрузки допустимы? | Нужны UX, security, стоимость и mobile constraints. | Engineering / Security / Product | Открыт |
| TBD-AI-004 | P1 | Какие reference images и физические свойства нужны для достоверного рендера вариантов? | Нужен стандарт съёмки и маппинг к каталогу. | Дизайн / CV / мастер | Открыт |
| TBD-AI-005 | P0 | Generative refinement включается только по явному действию, по умолчанию или недоступен в MVP? | Нужны согласие, стоимость, ожидания и fallback. | Product / Privacy | Открыт |
| TBD-AI-006 | P0 | Какие лимиты обработки действуют для гостя и клиента? | Нужны правила abuse prevention и бюджет без скрытой деградации. | Product / владелец | Открыт |
| TBD-AI-007 | P0 | Разрешает ли выбранный провайдер запрет обучения на данных, нужную географию обработки и удаление? | Нужны договорные доказательства до передачи фото. | Privacy / Legal / Architecture | Открыт |
| TBD-AI-008 | P1 | Какие изменения generative refinement запрещено вносить в товар и сцену? | Нужны инварианты, визуальные тесты и disclosure. | Product / мастер / CV | Открыт |
| TBD-AI-009 | P1 | Нужна ли ручная модерация результатов и как пользователь сообщает об ошибке? | Нужен operational loop качества. | Владелец / Product | Открыт |

## Инфраструктура

| ID | P | Вопрос | Зачем нужен ответ / критерий закрытия | Владелец ответа | Статус |
|---|---|---|---|---|---|
| TBD-INFRA-001 | P1 | Где будет канонический Git-репозиторий и кто управляет доступом? | GitHub remote `bataevabdullah2009-pixel/site-for-dad` настроен, Phase 1B.2 branch опубликована владельцем репозитория; для закрытия ещё нужны утверждённые access/review/branch-protection/ownership rules. | Владелец / Engineering | Открыт; remote publication подтверждена 2026-08-04 |
| TBD-INFRA-002 | P0 | Из каких операторских сетей и населённых пунктов Чеченской Республики проверяется доступ без VPN? | Решено: четыре города, mobile + home/office Wi-Fi, минимум два маршрута, mobile/desktop Chrome. | Product Owner / Engineering | Решён — 2026-08-02, `OWNER-DECISION-007` |
| TBD-INFRA-003 | P1 | Каковы ожидаемые объёмы трафика, загрузок и одновременных обработок? | Нужны capacity model и budgets без случайных чисел. | Product / Engineering | Открыт |
| TBD-INFRA-004 | P0 | Какие требования к размещению и резидентности данных применимы? | Нужны legal/privacy ограничения для DB, storage и AI. | Privacy / Legal | Открыт |
| TBD-INFRA-005 | P1 | Какие целевые устройства, браузеры и типы мобильной сети задают performance budget? | Нужна матрица поддержки и измеримые бюджеты. | Product / Engineering | Открыт |
| TBD-INFRA-006 | P0 | Как должна работать передача в WhatsApp: share link, deep link, Business API или ручной сценарий? | Нужна оценка приватности, стоимости, доступности и UX. | Владелец / Architecture | Открыт |
| TBD-INFRA-007 | P1 | Какие RPO, RTO и срок хранения резервных копий приемлемы? | Нужны бизнес-обоснованные recovery targets. | Владелец / Engineering | Открыт |
| TBD-INFRA-008 | P1 | Кто реагирует на алерты и в какие часы поддерживается сервис? | Нужен operational ownership и severity model. | Владелец / Operations | Открыт |
| TBD-INFRA-009 | P1 | Какой канал используется для уведомлений клиенту и сотрудникам? | Нужны провайдер, согласие, шаблоны и fallback. | Владелец / Product | Открыт |
| TBD-INFRA-010 | P1 | Какой provider, region, encryption/key custody, migration и exit path используются для production object storage? | Local/CI VersityGW не является production decision; нужны evaluation, legal/privacy/security review и superseding/confirming ADR. | Product Owner / Architecture / Security / Privacy | Открыт — `OWNER-DECISION-011`, 2026-08-03, явно сохранил production choice gated |

## Приватность

| ID | P | Вопрос | Зачем нужен ответ / критерий закрытия | Владелец ответа | Статус |
|---|---|---|---|---|---|
| TBD-PRIV-001 | P0 | Каков точный срок автоматического хранения гостевых оригиналов, масок и результатов? | Нужен юридически утверждённый TTL и понятное уведомление. | Privacy / владелец | Открыт |
| TBD-PRIV-002 | P0 | Каковы сроки хранения фотографий зарегистрированного клиента, заявки и заказа? | Нужна матрица целей, оснований, сроков и исключений. | Privacy / юрист | Открыт |
| TBD-PRIV-003 | P0 | Какое согласие и правовое основание применяются к загрузке и AI-обработке фото? | Нужны тексты, версия согласия и журнал доказательств. | Privacy / юрист | Открыт |
| TBD-PRIV-004 | P0 | Кто является оператором данных и как подаются запросы на доступ/удаление? | Нужны реквизиты и operational process. | Владелец / юрист | Открыт |
| TBD-PRIV-005 | P0 | Какие внешние обработчики допустимы и какие договоры/политики обязательны? | Нужен список subprocessors, DPA и запрет обучения. | Privacy / Legal | Открыт |
| TBD-PRIV-006 | P1 | Как удалённые данные выводятся из резервных копий или изолируются до истечения backup retention? | Нужна исполнимая и проверяемая процедура. | Engineering / Privacy | Открыт |
| TBD-PRIV-007 | P1 | Нужны ли возрастные ограничения или подтверждение права фотографировать помещение? | Нужна юридическая оценка и UI-текст при необходимости. | Юрист / Product | Открыт |
| TBD-PRIV-008 | P1 | Какие cookies/локальное хранение допустимы до согласия на аналитику? | Нужна consent matrix и режим без необязательных cookies. | Privacy / Analytics | Открыт |

## Аналитика

| ID | P | Вопрос | Зачем нужен ответ / критерий закрытия | Владелец ответа | Статус |
|---|---|---|---|---|---|
| TBD-ANALYTICS-001 | P1 | Какая аналитическая платформа допустима по доступности и приватности? | Нужна сравнительная оценка, hosting decision и consent behavior. | Product / Privacy / Engineering | Открыт |
| TBD-ANALYTICS-002 | P0 | Какие бизнес-решения должен поддерживать первый набор отчётов? | Нужны владельцы метрик и вопросы, а не vanity dashboards. | Владелец / Product | Открыт |
| TBD-ANALYTICS-003 | P1 | Каковы правила согласия, анонимизации и opt-out для аналитики? | Нужен юридически и технически проверяемый режим. | Privacy / Product | Открыт |
| TBD-ANALYTICS-004 | P1 | Как долго хранятся сырые события и агрегаты? | Нужна retention matrix и стоимость хранения. | Product / Privacy | Открыт |
| TBD-ANALYTICS-005 | P1 | Какие источники обращения и правила атрибуции важны бизнесу? | Нужен согласованный словарь каналов и окно атрибуции. | Владелец / Marketing | Открыт |
| TBD-ANALYTICS-006 | P2 | Кто и как часто просматривает отчёты и принимает действия? | Нужны ownership и operating cadence. | Владелец | Открыт |

## Implementation gates после Phase 1A

До synthetic/local Foundation не было P0 со статусом `BLOCKER_BEFORE_FOUNDATION`. `QG-147/148` закрыты письменным решением Product Owner, а `QG-149`–`158` подтверждают завершение Phase 1A 2026-08-02. Phase 1B.2 закрыла `TBD-ASSORT-002`, `TBD-ASSORT-006` и catalog-version aspect `TBD-PRICE-001`; Phase 1C дополнила его активной расчётной версией, частично подтвердила `TBD-PRICE-002`–`005`/`TBD-SIZE-001` и не закрыла остальные scopes. В реестре остаются 97 открытых из 120 исторических ID.

Семь P0, ранее имевшие `OWNER_DECISION_REQUIRED`, решены 2026-08-02: `TBD-BIZ-001`, `TBD-PRICE-007`, `TBD-MIN-PRICE-001`, `TBD-PRICE-SOURCE-002`, `TBD-PRICE-PARITY-001`, `TBD-INVENTORY-002` и `TBD-INFRA-002`. External AMIGO data и `BLOCKER_BEFORE_FEATURE` по-прежнему закрываются перед указанными Phase 1B–1G activations, а не в Foundation.

Phase 1A–1D завершены; `OWNER-DECISION-015` фиксирует explicit partner permission for the locally mirrored photoreal Phase 1D layers. `TBD-SOURCE-AMIGO-002` остаётся открыт только для official API/export/file/schema aspect, если такой канал существует. Phase 1E и любая следующая фаза не разрешены автоматически.

`OWNER-DECISION-011` закрывает только local/CI emulator choice: VersityGW в Docker/POSIX named volumes. `TBD-INFRA-010` явно сохраняет выбор production storage открытым; local choice не свидетельствует в пользу Supabase Storage, Cloudflare R2, AWS S3 или иного provider.

`OWNER-DECISION-009` не закрывает ни один data/transport/price/asset TBD: оно фиксирует только PostgreSQL public-serving topology, обязательные diff/Business Owner approval/admin activation, no-auto-delete, override precedence, audit, source timestamps и rollback contract.

`TBD-LEAD-001`, `TBD-SYSTEM-001`, `TBD-HORIZONTAL-001`, `TBD-VERTICAL-001`, `TBD-SERVICE-001`–`003`, `TBD-SOURCE-AMIGO-001`, `TBD-ASSET-AMIGO-001`–`002`, `TBD-PRICE-CATEGORY-001`, `TBD-DESIGN-003`, `TBD-ACCOUNT-001` и семь owner-decision P0 решены 2026-08-02; `TBD-ASSORT-002`/`006` закрыты 2026-08-04, а `TBD-PRICE-001` получил окончательную Phase 1C evidence 2026-08-08. Все ID сохраняются выше для трассируемости.

Наличие P0 не разрешает придумывать ответ. Оно определяет порядок интервью, сбора артефактов и прохождения профильных gates.
