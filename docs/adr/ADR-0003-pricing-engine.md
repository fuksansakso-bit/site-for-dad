# ADR-0003: Версионированный pricing engine

## Метаданные

| Поле | Значение |
|---|---|
| Статус | Accepted — engine boundary; formula and active data pending |
| Дата решения | 2026-08-02 |
| Решение принято | Владелец продукта в рамках поручения Phase 0B |
| Область | Price sources, calculation, local overrides, quote history |
| Заменяет | — |

## Контекст

AMIGO разрешил использовать цены и логику калькулятора, но точная формула, входные таблицы, active PriceVersion, округление, срок действия и parity tolerance ещё не подтверждены. Источник использует динамические строковые категории, включая `E`, `0` и `1`–`5`; клиент выбирает материал, а не обязан разбираться в категории. Любая сохранённая цена должна воспроизводиться после обновлений.

## Драйверы

- отсутствие выдуманной формулы и нулевой цены;
- точное денежное представление и детализированный breakdown;
- immutable historical calculation;
- сменяемый authorized source;
- local override с явным приоритетом и аудитом;
- parity tests на одинаковых входах;
- безопасный fallback на запрос менеджеру.

## Рассмотренные варианты

### A. Формула в UI и текущие цены без версии

Отклонён: дублирование, расхождение клиентов, потеря истории.

### B. Live расчёт AMIGO для каждого запроса

Отклонён: runtime-зависимость и отсутствие контроля версии/fallback.

### C. Универсальная приблизительная формула

Отклонён: создаёт недостоверную цену и скрывает неизвестные правила.

### D. Версионированный `PricingProvider` с immutable input/output

Принят.

## Решение

1. Domain contract `PricingProvider` MUST принимать нормализованную конфигурацию и явную `priceVersionId` либо выбирать единственную active confirmed version по правилам сервера.
2. Расчёт MUST выполняться только на server/domain boundary; UI MAY показывать preview, но не является источником истины.
3. Деньги MUST храниться целым числом минимальных денежных единиц и ISO currency; binary floating point запрещён.
4. `sourcePriceCategory` MUST быть строкой без закрытого enum; `localPriceTier` nullable и не меняет source value.
5. `PriceVersion` MUST быть immutable после активации и ссылаться на source snapshot, правила, author/approver и activation time.
6. `PriceCalculation` MUST сохранять полные входы/IDs, source/local components, overrides, discounts, minimum decision, breakdown, source/price versions, status и timestamps.
7. Local override MUST иметь scope, priority, effective interval, reason, actor, approval и audit; он не переписывает source snapshot.
8. При отсутствии активной подтверждённой цены результат MUST быть `PRICE_ON_REQUEST` или `UNAVAILABLE`, никогда `0` или догадка.
9. Минимум 1500 рублей не применяется автоматически до закрытия `TBD-MIN-PRICE-001`; публично подтверждённое стартовое сообщение не заменяет правило расчёта.
10. Старый расчёт MUST отображаться по сохранённому input/breakdown/version, даже если новая версия активна.
11. Parity suite MUST сравнивать одинаковые разрешённые входы, версии, source/local result, absolute/relative difference и объяснение; tolerance утверждается владельцем.
12. Клиентская стоимость MUST маркироваться как предварительная там, где финальный замер/подтверждение влияет на договорную цену.

## Статусы

`DRAFT → VALIDATED → APPROVED → ACTIVE → SUPERSEDED → ARCHIVED` для версии. Расчёт: `CALCULATED`, `PRICE_ON_REQUEST`, `INVALID_CONFIGURATION`, `SOURCE_DATA_STALE`, `UNAVAILABLE`. Версия `SUPERSEDED` остаётся читаемой для истории.

## Последствия

Положительные: расчёт объясним и воспроизводим; источник можно заменить; отсутствие данных безопасно; обновления не меняют прошлое.

Отрицательные: активация цены требует governance и parity evidence; нужно хранить версии и snapshots; неизвестные формулы блокируют exact price, но не каталог/заявку.

## Риски и меры

| Риск | Мера |
|---|---|
| Неверная source mapping | Stable IDs, compatibility validation, parity cohort |
| Двойное округление | Единый server money pipeline и breakdown |
| Override неожиданно перекрывает другой | Deterministic precedence + conflict validation |
| Устаревшая версия остаётся active | Freshness state, alert, manual disable/fallback |
| Приблизительная цена воспринята как оферта | UI disclosure и business/legal review |

## Откат и supersede

Откат активирует ранее approved версию новым audit event, не редактируя её. Изменение формулы, порядка overrides, округления или minimum требует новой PriceVersion и при несовместимости нового ADR. Исторические расчёты не мигрируют молча.

## Связанные документы и требования

- [PRICING_CALCULATOR_SPEC.md](../specs/02-domain/PRICING_CALCULATOR_SPEC.md)
- [PRICING_SOURCE_POLICY.md](../00-global/PRICING_SOURCE_POLICY.md)
- [TEST_STRATEGY.md](../quality/TEST_STRATEGY.md)
- `FR-PRICE-001`, `PRICING-SOURCE-001`–`009`, `PRICING-VERSION-001`–`005`, `PRICING-HISTORY-001`, `PRICING-TEST-001`–`005`
- Open: `TBD-PRICE-001`–`006`, `TBD-PRICE-SOURCE-001`–`002`, `TBD-PRICE-PARITY-001`, `TBD-MIN-PRICE-001`

## История

| Дата | Изменение |
|---|---|
| 2026-08-02 | Принята versioned provider model с exact money, audit, parity и safe fallback. |
