# Реестр прав на изображения и медиа PROJECT_NAME

## 0. Статус документа

| Поле | Значение |
|---|---|
| Статус | Нормативный global rights register; Phase 1B.2 catalog and Phase 1D preview assets accepted under per-asset gate |
| Версия | 1.6.0 |
| Дата | 2026-08-08, Europe/Moscow |
| Главный источник правды | [GLOBAL_SPEC.md](../specs/GLOBAL_SPEC.md) |
| Реестр происхождения | [EXTERNAL_SOURCES.md](EXTERNAL_SOURCES.md) |

Документ определяет категории активов, доказательства прав, публикационный gate, допустимое AI-использование и удаление. Реестр категорий не заменяет карточку прав каждого конкретного файла.

## 1. Нормативные правила

- **ASSET-001 — MUST:** каждый локальный медиафайл имеет стабильный `assetId`, категорию, происхождение, предполагаемого правообладателя, основание использования, статус прав, публикационный статус, срок хранения и delete path.
- **ASSET-002 — MUST:** rights lifecycle поддерживает `REFERENCE_ONLY`, `PERMISSION_PENDING`, `PARTNER_LICENSE`, `OWNER_CREATED`, `CLIENT_CONSENT` и `PUBLICATION_BLOCKED`; publication lifecycle отдельно поддерживает `PUBLICATION_APPROVED` и `PUBLICATION_BLOCKED`.
- **ASSET-003 — MUST:** публичную выдачу локального файла разрешает только `publicationStatus = PUBLICATION_APPROVED`; `PARTNER_LICENSE`, `OWNER_CREATED` и `CLIENT_CONSENT` фиксируют `rightsStatus`, но не подменяют publication decision.
- **ASSET-004 — MUST:** материал каталога не публикуется без локального изображения, связанного с тем же `MaterialVariant`, с состоянием `PUBLICATION_APPROVED` и непустым доказательством прав.
- **ASSET-005 — MUST:** URL изображения AMIGO MAY храниться только как `sourceImageReference`; hotlink и публичная выдача внешнего URL как контент PROJECT_NAME запрещены.
- **ASSET-006 — MUST NOT:** запрещены массовое скачивание изображений AMIGO, удаление водяных знаков, изменение авторства/источника, выдача работ AMIGO за работы бизнеса и использование AMIGO как обучающего датасета без разрешения.
- **ASSET-007 — MUST:** публичная доступность файла не считается разрешением на коммерческое использование; отсутствие доказательства переводит актив в `REFERENCE_ONLY`, `PERMISSION_PENDING` или `PUBLICATION_BLOCKED`.
- **ASSET-008 — MUST:** пользовательские фотографии, маски, промежуточные файлы и визуализации остаются приватными и не становятся портфолио, benchmark, demo или training data без отдельного законного основания и доказуемого согласия.
- **ASSET-009 — MUST:** актив удаляется или блокируется при отзыве согласия, истечении лицензии, обоснованной претензии правообладателя или невозможности подтвердить основание; историческая audit-запись сохраняется без самого контента, если это допустимо.
- **ASSET-010 — MUST:** права на логотип, товарный знак, фотографию, текстовое описание и физический образец проверяются отдельно; право владеть каталогом или образцом не означает право публиковать воспроизведение.
- **ASSET-011 — MUST:** AI-обработка разрешается только в пределах основания и цели конкретной категории; обучение модели является отдельной целью и по умолчанию запрещено.
- **ASSET-012 — MUST:** asset URL, бинарное содержимое, EXIF, адрес, лицо клиента и иные чувствительные метаданные не попадают в публичные логи, аналитику или тестовые фикстуры.
- **ASSET-013 — MUST:** официальный партнёрский статус и permission scope AMIGO подтверждены `PARTNER-001`–`007`; AMIGO-source assets используют relationship status `AUTHORIZED_PARTNER_SOURCE` и rights basis `PARTNER_LICENSE`.
- **ASSET-014 — MUST:** подтверждённый широкий permission scope не отменяет карточку конкретного файла: перед публикацией MUST быть известны source asset, связь с сущностью, hash/revision, допустимая поверхность и `publicationStatus = PUBLICATION_APPROVED`.
- **ASSET-015 — MUST:** отсутствие загруженной копии договора или бейджа не блокирует документацию и подготовку импорта; `optionalEvidenceReference` остаётся nullable, а факт подтверждения владельцем, дата и scope сохраняются в `PartnerRelationship`.
- **ASSET-016 — MUST:** AMIGO является authority для происхождения и identity AMIGO catalog images; локальный import/derivative не меняет source, правообладателя, product/material mapping или attribution. PostgreSQL хранит asset metadata/provenance/status/object reference, а binary original/derivatives хранятся в управляемом object storage.
- **ASSET-017 — MUST:** Business Owner является decision authority для состава локального портфолио, но это решение не заменяет доказательство авторства, прав, consent/PII review и `PUBLICATION_APPROVED`; AMIGO-source image MUST NOT стать `LOCAL_PORTFOLIO`.
- **ASSET-018 — MUST:** Phase 1B.1 MAY download only primary/detail images referenced by the frozen 32-ID pilot manifest. Каждый файл проходит allowlisted HTTPS fetch, content-length/MIME/sniff/decompression limits, hash dedup, `PARTNER_LICENSE` record и отдельный `PUBLICATION_APPROVED`; это не является разрешением массово скачивать AMIGO media catalog.
- **ASSET-019 — MUST:** `OWNER-DECISION-012` разрешает Phase 1B.2 контролируемо импортировать все доступные разрешённые media catalog entities, найденные full discovery. Это не отменяет запрет unmanaged bulk download: каждый link учитывается в manifest, обрабатывается item-level с rate/retry/SSRF/MIME/dimension/decompression/hash gates, сохраняется private-by-default под generated key и получает отдельные provenance, rights и publication records; единичный повреждённый файл не отменяет весь import и не становится публичным.
- **ASSET-020 — MUST:** позиция без supplier image остаётся видимой администратору как `MISSING_MEDIA`. Публичная выдача MAY использовать только отдельный локальный нейтральный `OWNER_CREATED` placeholder с `PUBLICATION_APPROVED`; внешний URL, raw source или непроверенный бинарный файл не выдаются.

## 2. Состояния прав и публикации

| Состояние | Значение | Публичная публикация |
|---|---|---|
| `REFERENCE_ONLY` | Сохранены provenance и/или URL, но локального разрешённого файла нет | Запрещена |
| `PERMISSION_PENDING` | Запрошено или ожидается подтверждение прав | Запрещена |
| `PARTNER_LICENSE` | Есть подтверждённое партнёрское/лицензионное основание и его ограничения | Только при отдельном `publicationStatus = PUBLICATION_APPROVED` |
| `OWNER_CREATED` | Владелец бизнеса подтвердил авторство/право распоряжения конкретным активом | Только после `PUBLICATION_APPROVED` |
| `CLIENT_CONSENT` | Есть доказуемое согласие клиента на точно указанные цели и срок | Только после `PUBLICATION_APPROVED` |
| `PUBLICATION_APPROVED` | Уполномоченная роль проверила основание, scope, срок, атрибуцию и связь с сущностью | Разрешена в зафиксированном scope |
| `PUBLICATION_BLOCKED` | Основание отсутствует, истекло, оспорено или запрещает нужное использование | Запрещена |

Переход к `PUBLICATION_APPROVED` MUST сохранять проверяющего, дату, версию доказательства и точные поверхности использования. Изменение файла, кадрирование, удаление атрибуции или новая AI-цель MAY потребовать повторного approval.

### 2.1. Подтверждённая запись AMIGO

| Поле | Значение |
|---|---|
| `permissionRecordId` | `AMIGO-PERMISSION-2026-08-02-001` |
| `partnerStatus` | `AUTHORIZED_PARTNER_SOURCE` |
| `partnerName` | `AMIGO` |
| `partnerRegion` | Не зафиксирован; MUST NOT выводиться из территории обслуживания бизнеса |
| `permissionScope` | Каталог; фото товаров, тканей, материалов и примеров изделий; названия, артикулы, технические сведения; цены; самостоятельная калькуляторная логика; партнёрский бейдж и разрешённые логотипы |
| `permissionConfirmedByOwner` | `true` |
| `permissionRecordedAt` | `2026-08-02`, Europe/Moscow |
| `optionalEvidenceReference` | Nullable; отсутствие копии договора/бейджа не блокирует документацию 0B |
| `brandUsageNotes` | Не менять авторство, не удалять водяные знаки, не выдавать AMIGO-примеры за «Наши работы», не использовать для training; дополнительные правила атрибуции — `TBD-ASSET-AMIGO-003` |

## 3. Обязательная карточка актива

| Поле | Правило |
|---|---|
| `assetId` | Уникальный и непереиспользуемый ID. |
| `assetCategory` | Одна из восьми категорий раздела 4. |
| `sourceReference` | Локальный источник либо `sourceId` + URL из `EXTERNAL_SOURCES.md`; не публичный hotlink. |
| `rightsholder` | Подтверждённый правообладатель или `UNKNOWN`; не угадывается. |
| `rightsBasis` | Авторство, согласие, договор, лицензия или иное проверяемое основание. |
| `permissionObtainedAt` | Дата разрешения; nullable только до получения разрешения. |
| `licenseRestrictions` | Территория, срок, каналы, атрибуция, модификации, AI и иные ограничения. |
| `rightsStatus` | Текущее состояние из раздела 2. |
| `publicationScope` | Точные страницы/каналы и допустимые производные. |
| `retentionRule` | Утверждённое правило или связанный `TBD-*`; бессрочность не предполагается молча. |
| `aiUseScope` | `NONE`, конкретная обработка результата либо отдельно разрешённая цель; training по умолчанию `NONE`. |
| `fileHash` | Hash локального файла после разрешённого импорта; изменение файла создаёт новую ревизию. |
| `deletePath` | Кто и как блокирует публикацию, удаляет originals/derivatives и проверяет результат. |
| `administrativeComment` | Непубличная причина решения без лишних персональных данных. |

## 4. Категории активов

### 4.1. Фотографии работ владельца

| Атрибут | Политика |
|---|---|
| Владелец прав | Владелец бизнеса или иной подтверждённый автор/правообладатель; сам факт передачи файла недостаточен без provenance |
| Разрешённое использование | Портфолио и продуктовые страницы после asset-level проверки и `PUBLICATION_APPROVED` |
| Запрещённое использование | Приписывание авторства без доказательства, раскрытие адреса/лица/персональных данных, использование за пределами approval |
| Необходимость согласия | Требуется подтверждение прав владельца бизнеса; согласие изображённых/клиента — когда применимо |
| Срок хранения | Не утверждён; определяется `TBD-ASSET-RETENTION-001` и обязательствами по отзыву |
| Публикационный статус | По умолчанию `OWNER_CREATED` или `PERMISSION_PENDING`; публично только `PUBLICATION_APPROVED` |
| Атрибуция | По договорённости с фактическим автором; не угадывается |
| Использование в AI | Возможна обработка для разрешённой публикационной версии; training/benchmark запрещены без отдельного основания |
| Удаление | Снять с публикации, удалить производные и выполнить проверяемый delete path по запросу/окончанию основания |

### 4.2. Будущие фотографии клиентов

| Атрибут | Политика |
|---|---|
| Владелец прав | Клиент/автор либо иной подтверждённый правообладатель |
| Разрешённое использование | Только приватный расчёт и визуализация в заявленной цели; портфолио — по отдельному согласию |
| Запрещённое использование | Публичный bucket/CDN, скрытая публикация, demo, debug, benchmark или training без отдельного основания |
| Необходимость согласия | Обязательно до upload/AI; отдельное доказуемое согласие для портфолио |
| Срок хранения | `TBD-PRIV-001` и `TBD-PRIV-002`; срок MUST быть показан до загрузки |
| Публикационный статус | По умолчанию `PUBLICATION_BLOCKED`; даже `CLIENT_CONSENT` требует scope review |
| Атрибуция | Не публикуется без отдельного согласия; персональные данные минимизируются |
| Использование в AI | Только утверждённая обработка с проверенным provider policy; обучение запрещено по умолчанию |
| Удаление | Каскадно оригинал, preview, маски, промежуточные и результаты; поведение backup — `TBD-PRIV-006` |

### 4.3. Фотографии физического каталога

| Атрибут | Политика |
|---|---|
| Владелец прав | Не определяется фактом владения физическим каталогом; возможны поставщик, фотограф, дизайнер или иной правообладатель |
| Разрешённое использование | Внутренняя инвентаризация артикулов/названий; публикация собственной съёмки только после проверки прав |
| Запрещённое использование | Считать покупку/получение каталога лицензией на коммерческую репродукцию |
| Необходимость согласия | `TBD-ASSET-CATALOG-001` до публикации |
| Срок хранения | До завершения проверки только в закрытом рабочем контуре; точный срок — `TBD-ASSET-RETENTION-001` |
| Публикационный статус | `PERMISSION_PENDING` или `PUBLICATION_BLOCKED` до доказательства |
| Атрибуция | По условиям правообладателя |
| Использование в AI | Запрещено до отдельного разрешения, включая texture extraction/training |
| Удаление | Удалить локальные копии и производные, если право не подтверждено или ограничение требует удаления |

### 4.4. Материалы AMIGO

| Атрибут | Политика |
|---|---|
| Владелец прав | AMIGO и/или указанный правообладатель; точное лицо подтверждается лицензией |
| Разрешённое использование | Локальный управляемый импорт и публикация фотографий товаров, тканей, материалов, образцов, механизмов и изделий; renderer/AI-reference для выбранного товара; provenance и source labels |
| Запрещённое использование | Неуправляемое массовое скачивание, hotlink, удаление водяного знака, смена авторства, использование вне permission scope и training use |
| Необходимость согласия | Решено владельцем 2026-08-02: `PARTNER_LICENSE`; `TBD-ASSET-AMIGO-001` закрыт, точная атрибуция/brand guidelines остаётся `TBD-ASSET-AMIGO-003` |
| Срок хранения | Reference metadata — по data governance; лицензированный файл — по сроку лицензии; период не придумывается |
| Публикационный статус | `rightsStatus = PARTNER_LICENSE`; конкретный корректно сопоставленный локальный файл MAY получить `publicationStatus = PUBLICATION_APPROVED` |
| Атрибуция | Бренд/source сохраняются; точная публичная форма уточняется `TBD-ASSET-AMIGO-003` без блокировки внутренних спецификаций |
| Использование в AI | Разрешено как material reference/renderer input для клиентской визуализации в scope; training, benchmark dataset и повторное обучение запрещены без отдельного разрешения |
| Удаление | Немедленно блокировать публикацию при окончании/отзыве лицензии; удалить согласно лицензии и audit record |

### 4.5. Примеры работ AMIGO

| Атрибут | Политика |
|---|---|
| Владелец прав | AMIGO и/или автор/участник проекта, указанный в доказательстве |
| Разрешённое использование | Локальная публикация разрешённых примеров с явной подписью AMIGO, а также reference для стандартной сцены/выбора изделия в зафиксированном scope |
| Запрещённое использование | Выдавать за работу данного бизнеса, копировать в портфолио, удалять подписи/водяные знаки |
| Необходимость согласия | Общий permission scope подтверждён владельцем 2026-08-02; конкретный файл проходит mapping/publication record |
| Срок хранения | Локальный файл не создаётся до разрешения; после — по лицензии |
| Публикационный статус | `PARTNER_LICENSE`; `PUBLICATION_APPROVED` после связи source asset и допустимой подписи |
| Атрибуция | «Пример оформления», «Изображение из каталога AMIGO», «Доступный вариант» или «Пример в интерьере»; «Наши работы» запрещено |
| Использование в AI | Training, demo benchmark и генеративные референсы запрещены без отдельного разрешения |
| Удаление | Удалить разрешённый импорт и производные по окончании основания; reference запись MAY остаться для audit |

### 4.6. Сгенерированные визуализации

| Атрибут | Политика |
|---|---|
| Владелец прав | Определяется правами на пользовательский input, условиями провайдера и применимым правом; не предполагается автоматически |
| Разрешённое использование | Приватный показ клиенту и передача по его явному действию в рамках расчёта |
| Запрещённое использование | Публичное портфолио, реклама, benchmark или training без отдельного основания и согласия |
| Необходимость согласия | Согласие на обработку обязательно; публикационное согласие отдельно |
| Срок хранения | Как производное пользовательского фото по `TBD-PRIV-001/002` |
| Публикационный статус | По умолчанию `PUBLICATION_BLOCKED` |
| Атрибуция | По условиям провайдера и согласованному disclosure |
| Использование в AI | Разрешена только заявленная генерация/обработка; повторное обучение запрещено |
| Удаление | Каскадно вместе с исходником и другими производными |

### 4.7. Иконки и UI-ассеты

| Атрибут | Политика |
|---|---|
| Владелец прав | Автор, библиотека или PROJECT_NAME для самостоятельно созданных активов |
| Разрешённое использование | Только по совместимой проверенной лицензии и с сохранением обязательных notices |
| Запрещённое использование | Копирование из референсного сайта или использование без provenance/license review |
| Необходимость согласия | Лицензионное основание обязательно; отдельное согласие автора зависит от лицензии |
| Срок хранения | Пока действует использование и лицензия; notices сохраняются требуемый срок |
| Публикационный статус | `PUBLICATION_APPROVED` после version/license/security review |
| Атрибуция | По лицензии |
| Использование в AI | Допустимо только если лицензия охватывает конкретную цель; обучение не предполагается |
| Удаление | Заменить/удалить при несовместимости лицензии или provenance defect |

### 4.8. Логотипы и торговые марки

| Атрибут | Политика |
|---|---|
| Владелец прав | Владелец соответствующего знака; бренд PROJECT_NAME не утверждён (`TBD-DESIGN-001`) |
| Разрешённое использование | Собственный утверждённый знак; партнёрский бейдж и разрешённые логотипы AMIGO — в подтверждённой идентифицирующей/партнёрской форме |
| Запрещённое использование | Расширять реальное партнёрство до неутверждённых гарантий/представительства, присваивать знак или нарушать brand usage notes |
| Необходимость согласия | Партнёрское использование AMIGO подтверждено владельцем 2026-08-02; конкретный файл и поверхность сохраняются в asset record |
| Срок хранения | По сроку прав/разрешения; публичное использование прекращается при отзыве |
| Публикационный статус | Партнёрский бейдж/разрешённый логотип AMIGO: `PARTNER_LICENSE` + `PUBLICATION_APPROVED`; иные чужие знаки по умолчанию заблокированы |
| Атрибуция | По brand guidelines и лицензии |
| Использование в AI | Не использовать как training asset или для генерации вводящего в заблуждение брендинга |
| Удаление | Снять со всех поверхностей, очистить производные и проверить caches при прекращении права |

### 4.9. Нормативные роли активов

Поле `assetRole` не подменяет категорию прав и MAY принимать: `SUPPLIER_PRODUCT_IMAGE`, `SUPPLIER_MATERIAL_SWATCH`, `SUPPLIER_TECHNICAL_IMAGE`, `SUPPLIER_INTERIOR_EXAMPLE`, `LOCAL_PORTFOLIO`, `CLIENT_UPLOAD`, `AI_GENERATED_RESULT`, `PARTNER_BADGE`, `BRAND_ASSET`. Для каждой роли отдельно задаются допустимые страницы, renderer/AI scope и подпись.

AMIGO-source asset MUST NOT иметь роль `LOCAL_PORTFOLIO`. Только реальные подтверждённые фотографии объектов бизнеса MAY публиковаться в разделе «Наши работы».

## 5. Управляемый импорт партнёрских материалов AMIGO

- **ASSET-IMPORT-001 — MUST:** официальный партнёрский статус и общий permission scope подтверждены; конкретный import batch MUST ссылаться на `PartnerRelationship`, источник, категории файлов и разрешённые цели.
- **ASSET-IMPORT-002 — MUST:** файл копируется в собственное object storage; hotlink не используется.
- **ASSET-IMPORT-003 — MUST:** для каждого импорта сохраняются исходный источник, правообладатель, основание использования, дата разрешения, ограничения лицензии, дата импорта, hash файла и связь с `MaterialVariant`.
- **ASSET-IMPORT-004 — MUST:** повторный импорт изменившегося файла создаёт новую ревизию и повторную проверку публикации.
- **ASSET-IMPORT-005 — MUST:** импорт был запрещён в Phase 0A.1. Phase 1B.1/1B.2 выполняют только явно разрешённый manifest-bound catalog-media intake через принятый pipeline; произвольные источники, user media, training use и production storage остаются запрещены до собственных gates.
- **ASSET-IMPORT-006 — MUST:** сохраняются original, optimized copy, thumbnail, WebP/AVIF derivative, renderer/AI-reference derivative, card derivative и fullscreen derivative; производные не меняют rights scope исходника.
- **ASSET-IMPORT-007 — MUST:** при отзыве/истечении права публикация блокируется, caches и derivatives удаляются по delete path, а audit/provenance record сохраняется без бинарного файла в допустимых границах.

Phase 1B.2 evidence: accepted run учёл 3 053 typed references (`2 940` material, `12` category, `52` system, `49` model), сохранил 2 818 distinct SHA-256 objects общим объёмом 519 671 532 bytes и связал local primary media со всеми 1 655 MaterialVariant. OWNER отдельно перевёл все 2 818 assets в `PUBLICATION_APPROVED`; item-level failures и hotlinks равны нулю, а restart acceptance повторно проверил length/SHA-256 каждого объекта. Это принятие не расширяет derivative/AI/training rights и не отменяет обязательность derivative profiles `ASSET-IMPORT-006` для соответствующих будущих поверхностей.

Phase 1D evidence: `OWNER-DECISION-015` explicitly confirms partner permission for the requested AMIGO customizer interiors and product/system layers. The local manifest records permission basis, source URL, SHA-256, byte length, dimensions, `PARTNER_LICENSE` and `PUBLICATION_APPROVED`. The Zebra 5992 perspective-corrected layer remains `SUPPLIER_PRODUCT_IMAGE`, records the raw source hash and deterministic transform coordinates, and does not become a local work or exact swatch. Runtime access is only through `StoragePort`; training use, customer-photo processing and supplier frontend-code reuse remain prohibited.

## 6. Остановочные условия

Публикация или AI-использование MUST быть остановлены, если неизвестен правообладатель, нет доказательства согласия/лицензии, неясна территория или цель, истёк срок, требуется удалённая атрибуция, которую продукт не может выполнить, либо актив невозможно однозначно связать с правильным `MaterialVariant`.

## 7. История изменений

| Версия | Дата | Изменение |
|---|---|---|
| 1.1.0 | 2026-08-02 | Зафиксированы `PARTNER_LICENSE`, asset-level publication gate и управляемый будущий import AMIGO media. |
| 1.2.0 | 2026-08-02 | По `OWNER-DECISION-008` разделены AMIGO image authority, PostgreSQL metadata и object-storage binaries; Business Owner закреплён как authority локального portfolio composition без ослабления rights/consent gate. |
| 1.3.0 | 2026-08-02 | `OWNER-DECISION-010` разрешил только bounded media import для frozen Phase 1B.1 manifest с private storage, validation/dedup и отдельным publication gate. |
| 1.4.0 | 2026-08-03 | `OWNER-DECISION-012` разрешил controlled full-catalog media manifest/import через existing pipeline; per-asset rights/publication, no-hotlink, private storage, validation/dedup и local approved placeholder сохранены. |
| 1.5.0 | 2026-08-04 | Зафиксированы accepted 3 053 typed media references, 2 818 distinct approved private objects, 1 655/1 655 primary mappings, zero failures/hotlinks и post-restart integrity без расширения derivative/AI/training scope. |
| 1.6.0 | 2026-08-08 | Registered the explicitly permitted Phase 1D photoreal customizer assets, per-file local manifest and deterministic Zebra derivative provenance without changing authorship, portfolio role or AI/training scope. |
