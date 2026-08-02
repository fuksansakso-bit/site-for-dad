# Политика источников цены PROJECT_NAME

## 0. Статус документа

| Поле | Значение |
|---|---|
| Статус | Нормативная политика; Phase 1B.1 разрешает только source card prices/local base overrides без calculator |
| Версия | 1.5.0 |
| Дата | 2026-08-02, Europe/Moscow |
| Главный источник правды | [GLOBAL_SPEC.md](../specs/GLOBAL_SPEC.md) |
| Внешние источники | [EXTERNAL_SOURCES.md](EXTERNAL_SOURCES.md) |
| Будущая детализация | `PRICING_CALCULATOR_SPEC.md` и `TEST_STRATEGY.md`, запланированные в [SPEC_ROADMAP.md](SPEC_ROADMAP.md) |

Политика задаёт происхождение, версии, подтверждение и деградацию цены. Phase 1B.1 MAY импортировать опубликованную карточную цену «от», её context/currency/date/version и separate local base override; формула, размеры, minimum 1500 и calculator остаются запрещены до Phase 1C.

## 1. Основные требования владельца

- **PRICING-SOURCE-001 — MUST:** AMIGO является основным внешним источником базовой предварительной цены.
- **PRICING-SOURCE-002 — MUST:** публичная цена AMIGO рассматривается как изменяемый snapshot, а не как постоянное число.
- **PRICING-SOURCE-003 — MUST:** каждый price snapshot сохраняет источник, дату, город или регион расчёта, систему, материал, артикул, ширину, высоту, тип монтажа, выбранные опции, результат, валюту, версию, способ получения и статус проверки администратором.
- **PRICING-SOURCE-004 — MUST:** старый расчёт клиента никогда не меняется автоматически после изменения данных AMIGO.
- **PRICING-SOURCE-005 — MUST:** новый расчёт использует только активную подтверждённую версию прайса.
- **PRICING-SOURCE-006 — MUST:** при недоступности внешнего источника система не придумывает цену и использует последнюю подтверждённую локальную версию, ручной расчёт менеджера либо сообщение «Стоимость требует уточнения».
- **PRICING-SOURCE-007 — MUST NOT:** запрещено копировать программный код, сетевые API, дизайн или закрытые алгоритмы калькулятора AMIGO; разрешена самостоятельная реализация аналогичного пользовательского сценария с коммерчески необходимыми параметрами.
- **PRICING-SOURCE-008 — MUST:** AMIGO имеет status `AUTHORIZED_PARTNER_SOURCE`; владелец подтвердил право использовать цены и самостоятельно воспроизводить калькуляторную логику, но конкретный transport/export/API и формулы должны иметь собственное доказательство.
- **PRICING-SOURCE-009 — MUST:** source price category хранится как `sourcePriceCategory: string`; nullable `localPriceTier: string` является отдельным локальным отображением. Наблюдаемые `E`, `0`, `1`, `2`, `3`, `4`, `5` не образуют закрытый общий enum.
- **PRICING-SOURCE-010 — MUST:** по `OWNER-DECISION-008` AMIGO является authority для AMIGO-origin base price, а PostgreSQL хранит immutable source snapshot и active local projection; import/normalization MUST NOT превращать source price в редактируемое локальное значение.
- **PRICING-SOURCE-011 — MUST:** Business Owner является decision authority для local price overrides и commercial conditions. Они хранятся отдельными versioned/audited слоями, не переписывают AMIGO base price и не активируются без применимых owner, financial и legal gates.
- **PRICING-SOURCE-012 — MUST:** по `OWNER-DECISION-009` конфигуратор и расчёт MUST получать catalog/material/base-price inputs только из совместимых активных одобренных `CatalogVersion`/`PriceVersion` в PostgreSQL. Client request MUST NOT читать AMIGO, raw capture, staged candidate, cache/search source или неподтверждённую цену напрямую.
- **PRICING-SOURCE-013 — MUST:** Phase 1B.1 хранит только decimal minor-unit source card price «от» с currency `RUB`, published regional/source context, capture/version/status и nullable verified `sourcePriceCategory`; отсутствующее/нулевое/неразбираемое значение получает `PRICE_ON_REQUEST`, а opaque DOM token не выдаётся за подтверждённую price category.

## 2. Приоритет источников и способ получения

Приоритет происхождения данных:

1. Официальный партнёрский источник или B2B-доступ (relationship подтверждён; transport ещё определяется).
2. Выгрузка от поставщика.
3. Проверенный ручной импорт.
4. Публичные страницы как временный исследовательский источник.

- **PRICING-SYNC-001 — MUST:** более низкий приоритет используется только при отсутствии доступного и разрешённого источника более высокого приоритета; причина фиксируется.
- **PRICING-SYNC-002 — MUST:** любой полученный набор остаётся draft до валидации и административного подтверждения.
- **PRICING-SYNC-003 — MUST:** Phase 1B.1 проверяет source card prices автоматически раз в сутки и вручную OWNER/ADMIN; проверка создаёт staged diff и никогда не активирует `PriceVersion` автоматически.
- **PRICING-SYNC-006 — MUST:** данные старше 7 дней получают `STALE_WARNING`; возраст более 30 дней блокирует публикацию изменённой цены или нового товара до обязательной административной проверки.
- **PRICING-SYNC-004 — MUST:** город/регион AMIGO, используемый для базового сравнения, определяется `TBD-PRICE-SOURCE-001`; московский контекст не считается автоматически применимым к Чеченской Республике.
- **PRICING-SYNC-005 — MUST NOT:** нельзя утверждать существование публичного официального API AMIGO только из факта партнёрства; конкретный transport/export/API подтверждается отдельно по `TBD-SOURCE-AMIGO-002`.

## 3. Snapshot model и versioning

### 3.1. Price snapshot

Минимальная запись:

| Группа | Поля |
|---|---|
| Provenance | `priceSnapshotId`, `sourceId`, `sourceUrl`, `sourceEntityId/sourceSlug`, `capturedAt`, `lastVerifiedAt`, `acquisitionMethod` |
| Контекст источника | `sourceCity/sourceRegion`, `sourceVersion`, `sourceCurrency`, `sourceContext` |
| Конфигурация | `productFamilyId`, `productSystemId`, `productModelId`, `materialVariantId`, `sourceMaterialId`, `materialCode`, `sourcePriceCategory`, nullable `localPriceTier`, `widthMm`, `heightMm`, `mountingMethodId`, `controlTypeId`, `optionSelections`, `quantity` |
| Результат | `sourcePrice`, `sourceBreakdown` при наличии, `localOverride`, `localSalePrice`, `resultCurrency` |
| Управление | `verificationStatus`, `verifiedBy`, `verifiedAt`, `administrativeComment`, `catalogVersionId`, `priceVersionId` |

- **PRICING-SNAPSHOT-001 — MUST:** snapshot неизменяем после фиксации; исправление создаёт новую ревизию, связанную с предыдущей.
- **PRICING-SNAPSHOT-002 — MUST:** отсутствующее поле источника сохраняется как отсутствующее с объяснением, а не заполняется догадкой.
- **PRICING-SNAPSHOT-003 — MUST:** `localOverride` не перезаписывает `sourcePrice` и содержит значение, область, причину, автора, время и статус approval.
- **PRICING-SNAPSHOT-004 — MUST:** опции хранятся нормализованными значениями и source labels, достаточными для воспроизведения контрольного расчёта.

### 3.2. Price version

- **PRICING-VERSION-001 — MUST:** `PriceVersion` является неизменяемым набором подтверждённых snapshots и локальных правил с уникальным ID, временем публикации и автором.
- **PRICING-VERSION-002 — MUST:** одновременно используемая версия явно помечается `ACTIVE`; draft, superseded, rejected или неподтверждённая версия не участвует в новом автоматическом расчёте.
- **PRICING-VERSION-003 — MUST:** активация новой версии не изменяет прошлые `QuoteCalculation` и не удаляет старую версию.
- **PRICING-VERSION-004 — MUST:** сохранённый расчёт содержит полный calculation snapshot, а не только ссылку на изменяемую текущую запись.
- **PRICING-VERSION-005 — MUST:** rollback выполняется публикацией/реактивацией проверенной версии с audit reason; исторические результаты не переписываются.

## 4. Административное подтверждение и local override

- **PRICING-ADMIN-001 — MUST:** проверяющий сверяет источник, регион, систему, материал/артикул, размеры, монтаж, опции, валюту и результат до активации.
- **PRICING-ADMIN-002 — MUST:** роли получения, проверки и публикации MAY быть разделены; фактически использованное permission фиксируется.
- **PRICING-ADMIN-003 — MUST:** массовая публикация имеет preview изменений, число затронутых записей, validation errors и явное подтверждение.
- **PRICING-ADMIN-004 — MUST:** только actor с ролью `OWNER` или `ADMIN` может активировать `PriceVersion`, после просмотра exact diff и явного подтверждения; попытка и результат активации всегда аудируются.
- **PRICING-OVERRIDE-001 — MUST:** local override применяется только утверждённым правилом бизнеса, не маскирует исходную цену и виден в административной разбивке.
- **PRICING-OVERRIDE-002 — MUST:** ручное изменение подтверждённой клиенту суммы сохраняет предыдущую сумму, новую сумму, причину, автора и связь с новой ревизией предложения.
- **PRICING-OVERRIDE-003 — MUST:** неподтверждённые наценки, скидки, округления и формулы не применяются автоматически.
- **PRICING-OVERRIDE-004 — MUST:** AMIGO sync/import не создаёт, не изменяет и не удаляет Business Owner override или commercial condition; конфликт ownership блокирует affected candidate до review.
- **PRICING-OVERRIDE-005 — MUST:** applicable approved local override имеет приоритет над AMIGO base price только при композиции public/local result в заявленных scope/effective interval; исходный snapshot сохраняется, а выбранные source и override revisions фиксируются в `CatalogVersion`, `PriceVersion` и calculation snapshot.

## 5. Локальные ценовые правила

- **PRICING-LOCAL-001 — MUST:** после базовой цены AMIGO применяются только подтверждённые локальные правила бизнеса.
- **PRICING-LOCAL-002 — MUST:** «Замер», «Доставка» и «Установка» являются отдельными строками расчёта со значением `0` рублей и клиентской подписью «Бесплатно» в пределах всей обслуживаемой Чеченской Республики.
- **PRICING-LOCAL-003 — MUST:** цены AMIGO на замер, доставку и монтаж для Москвы или другого региона не переносятся в PROJECT_NAME.
- **PRICING-LOCAL-004 — MUST:** минимальная стоимость равна 1500 рублей для каждой отдельно изготавливаемой единицы изделия и применяется до суммирования заказа: 1100 рублей по формуле → 1500 рублей; две такие единицы → 3000 рублей.
- **PRICING-LOCAL-005 — MUST:** правило `PRICING-LOCAL-004` документируется, но не реализуется в Phase 1B.1 и не активируется до подтверждения остальных formula/source/version gates Phase 1C.
- **PRICING-LOCAL-006 — MUST:** денежные значения хранятся в целых копейках и сопровождаются валютой; правила округления остаются `TBD-PRICE-002`.
- **PRICING-LOCAL-007 — MUST:** для первой версии `localSalePrice = sourceAmigoPrice` из активного проверенного snapshot, если отсутствует применимый утверждённый `LocalOverride`.
- **PRICING-LOCAL-008 — MUST:** `LocalOverride` MAY задавать fixed price, процентную надбавку, процентную скидку, minimum, manual price или price-on-request с датами действия; конкретные значения и приоритеты не активируются без owner approval.

## 6. Собственный калькулятор

- **PRICING-CALC-001 — MUST:** собственный калькулятор принимает семейство изделия, систему, конкретный материал, ширину, высоту, количество, способ монтажа, цвет фурнитуры, дополнительные опции, несколько окон и отдельное изделие на каждую створку.
- **PRICING-CALC-002 — MUST:** результат называется «Предварительная стоимость», показывает подробную расшифровку, сохраняет price version и может быть передан в WhatsApp.
- **PRICING-CALC-003 — MUST:** одинаковые нормализованные входы и одна активная price version дают воспроизводимый результат.
- **PRICING-CALC-004 — MUST:** отсутствие подтверждённой совместимости, ограничения или цены переводит позицию в Manual Review, а не в приблизительную выдуманную сумму.
- **PRICING-CALC-005 — MUST:** несколько окон сохраняют независимые параметры и breakdown; ошибка одной позиции не стирает остальные и не включается скрытно в общий итог.

## 7. Ручной расчёт и fallback

- **PRICING-FALLBACK-001 — MUST:** `ManualQuoteProvider` принимает нормализованный контекст расчёта и возвращает либо подтверждённую уполномоченным менеджером сумму, либо состояние `REQUIRES_MANUAL_REVIEW`; он не имитирует внешний snapshot.
- **PRICING-FALLBACK-002 — MUST:** ручной результат содержит автора, время, входы, валюту, причину ручного режима и доступную клиенту оговорку.
- **PRICING-FALLBACK-003 — MUST:** последняя локальная версия используется при недоступности AMIGO только если она остаётся активной и подтверждённой администратором.
- **PRICING-FALLBACK-004 — MUST:** если активной подтверждённой версии нет и менеджер не подтвердил сумму, клиент видит «Стоимость требует уточнения» и путь в WhatsApp.
- **PRICING-FALLBACK-005 — MUST:** timeout, невалидный ответ, смена города, CAPTCHA, недоступность или структурное изменение страницы AMIGO не превращаются в нулевую цену.

## 8. Исторические цены и изменение между расчётом и заказом

- **PRICING-HISTORY-001 — MUST:** прошлый расчёт воспроизводится по сохранённым входам, breakdown и `priceVersionId` даже после архивирования каталога или смены источника.
- **PRICING-QUOTE-001 — MUST:** срок действия предварительного предложения не указывается до решения существующего `TBD-PRICE-008`.
- **PRICING-QUOTE-002 — MUST:** перед созданием заказа уполномоченная роль проверяет применимость предложения; это не означает молчаливый пересчёт.
- **PRICING-QUOTE-003 — MUST:** если цена изменилась, создаётся новая ревизия с прежней и новой суммой, причиной, версиями и явным подтверждением клиента/менеджера по будущей спецификации.
- **PRICING-QUOTE-004 — MUST:** расчёт не является заказом и не гарантирует неизменность суммы за пределами утверждённых условий предложения.

## 9. Audit log

- **PRICING-AUDIT-001 — MUST:** журналируются capture/import, validation, verification, rejection, activation, superseding, rollback, override, manual quote и quote revision.
- **PRICING-AUDIT-002 — MUST:** запись содержит actor, permission, timestamp, entity/version, action, безопасный before/after diff, reason и correlation ID.
- **PRICING-AUDIT-003 — MUST:** исходные snapshots и audit history недоступны для изменения обычной административной операцией.
- **PRICING-AUDIT-004 — MUST:** audit log не содержит секретов партнёрского доступа, полного клиентского контакта или закрытого payload внешнего источника.

## 10. Концептуальная граница PricingProvider

Будущая техническая концепция использует заменяемый контракт:

```text
PricingProvider
    getCatalogSnapshot()
    getMaterialSnapshot()
    getPriceQuote()
    getSourceVersion()
    healthCheck()
```

Планируемые реализации:

- `AdminManagedPricingProvider` — активная локальная подтверждённая версия;
- `AmigoAuthorizedProvider` — для подтверждённого партнёрского relationship после выбора доказанного transport/export/API и security boundary;
- `AmigoSnapshotProvider` — проверенные разрешённые snapshots без утверждения о real-time API;
- `ManualQuoteProvider` — ручной расчёт менеджера;
- `MockPricingProvider` — только тестовые/демонстрационные данные, никогда не production-источник цены.

- **PRICING-ARCH-001 — MUST:** доменная логика зависит от `PricingProvider`, а не от разметки, URL, cookies или сетевого интерфейса AMIGO.
- **PRICING-ARCH-002 — MUST:** `healthCheck()` сообщает состояние источника, но сбой внешней проверки не останавливает каталог, контакты или доступ к историческому расчёту.
- **PRICING-ARCH-003 — MUST:** реализация провайдера и способ доступа выбираются позднее через профильную спецификацию и, при архитектурной значимости, ADR.
- **PRICING-ARCH-004 — MUST NOT:** публичный сайт PROJECT_NAME не должен синхронно зависеть от доступности сайта AMIGO для каждого клиентского просмотра или расчёта.
- **PRICING-ARCH-005 — MUST:** `AdminManagedPricingProvider`/runtime provider читает только активную совместимую PostgreSQL `CatalogVersion` + `PriceVersion`; `AmigoAuthorizedProvider` и `AmigoSnapshotProvider` являются acquisition/validation adapters и не вызываются из public calculation path.

## 11. План синхронизации без неподтверждённого расписания

1. Получить данные разрешённым способом по приоритету раздела 2.
2. Зафиксировать raw provenance и immutable snapshots в PostgreSQL staging без публикации.
3. Сопоставить source entities с нормализованными локальными ID, применимыми local overlays и подтвердить allowlist семейства.
4. Провести schema, currency, region, dimensions, options и anomaly validation.
5. Сформировать exact catalog/price diff и контрольные quotes; source removal не удаляет локальные data/overrides.
6. Получить Business Owner approval применимых локальных решений и явную administrator activation совместимых `CatalogVersion`/`PriceVersion`.
7. Выполнить parity checks и перестроить version-pinned производные projections.
8. Сохранить audit/report, source/timestamps и возможность безопасного rollback.

Расписание и staleness thresholds заданы `OWNER-DECISION-005`: daily + manual, `STALE_WARNING` после 7 дней и обязательная admin verification после 30 дней перед публикацией changed price/new product. Объём выборки и конкретный transport остаются gated.

## 12. Тестирование точности

- **PRICING-TEST-001 — MUST:** `TEST_STRATEGY.md` содержит pricing parity test matrix для одинаковых source version, системы, материала, размеров, фурнитуры, опций и количества.
- **PRICING-TEST-002 — MUST:** матрица сохраняет результат AMIGO, результат локального калькулятора, абсолютную разницу, процентную разницу и версию источника.
- **PRICING-TEST-003 — MUST:** допустимое абсолютное отклонение при входах `PRICING-TEST-001` составляет не более 1 рубля включительно; большее отклонение является parity error.
- **PRICING-TEST-004 — MUST:** тест не обходит авторизацию, CAPTCHA, ограничения доступа или закрытые интерфейсы; при невозможности законно получить контрольный результат случай помечается непроверенным.
- **PRICING-TEST-005 — MUST:** контрольные случаи включают несколько систем/материалов, граничные размеры, опции, multi-window, минимальную стоимость после решения её scope и режим недоступного источника.

## 13. Открытые решения

Блокирующими для автоматического production-pricing остаются реальные snapshots и правила из `TBD-PRICE-001`–`006`, `TBD-MECHANISM-001`, `TBD-PRICE-SOURCE-001`, а также конкретный export/transport `TBD-SOURCE-AMIGO-002`. `TBD-PRICE-007`, `TBD-MIN-PRICE-001`, `TBD-PRICE-SOURCE-002`, `TBD-PRICE-PARITY-001`, `TBD-SOURCE-AMIGO-001` и `TBD-PRICE-CATEGORY-001` решены и сохраняются для истории. Срок предложения остаётся `TBD-PRICE-008` и не получает выдуманного периода.

`OWNER-DECISION-008` закрывает authority слоёв, а `OWNER-DECISION-009` — public-serving PostgreSQL topology, diff/approval/no-delete/override/audit/version rules. Ни одно из них не доказывает наличие active `CatalogVersion`/`PriceVersion`, completeness импортированных base prices, формулу, source region или parity fixtures и поэтому не закрывает перечисленные pricing TBD.

## 14. История изменений

| Версия | Дата | Изменение |
|---|---|---|
| 1.2.0 | 2026-08-02 | Зафиксированы owner activation, daily/manual freshness, per-item minimum и parity tolerance при сохранении Phase 1A boundary. |
| 1.3.0 | 2026-08-02 | По `OWNER-DECISION-008` AMIGO base price отделена от Business Owner local overrides/commercial conditions и локальной PostgreSQL-проекции. |
| 1.4.0 | 2026-08-02 | По `OWNER-DECISION-009` public calculations переведены на активные PostgreSQL `CatalogVersion`/`PriceVersion`; зафиксированы override precedence, staged diff, owner/admin activation, audit/source timestamps и отсутствие direct AMIGO runtime reads. |
| 1.5.0 | 2026-08-02 | `OWNER-DECISION-010` разрешил Phase 1B.1 source card prices/PRICE_ON_REQUEST/local base overrides и daily diff, сохранив calculator/formulas/minimum rule для Phase 1C. |
