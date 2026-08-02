# ADR-0002: Интеграция и активация данных AMIGO

## Метаданные

| Поле | Значение |
|---|---|
| Статус | Accepted — integration pattern; transport/cadence pending |
| Дата решения | 2026-08-02 |
| Решение принято | Владелец продукта в рамках поручения Phase 0B |
| Область | Catalog, price and authorized media ingestion from AMIGO |
| Заменяет | — |

## Контекст

Официальный партнёрский статус и scope разрешений AMIGO подтверждены владельцем. Однако официальный public API, формат партнёрской выгрузки, cadence и credentials не подтверждены. Публичные страницы и текущий URL customizer изменяемы. PROJECT_NAME должен воспроизводить разрешённый функциональный охват на собственных данных и не выполнять live lookup при каждом пользовательском запросе.

## Драйверы

- provenance каждой записи и каждого актива;
- динамические новые категории без изменения ядра;
- предварительный просмотр diff до публикации;
- сохранение local overrides и локальных товаров;
- безопасная реакция на source removal;
- воспроизводимость source snapshots и цен;
- запрет обхода auth, CAPTCHA, rate limits и закрытых интерфейсов.

## Рассмотренные варианты

### A. Live proxy к AMIGO

Отклонён: runtime-зависимость, нестабильность URL/контракта, отсутствие версии и невозможность гарантировать историю расчёта.

### B. iframe customizer как основной продукт

Отклонён: нет собственного UX/архитектуры, слабый контроль privacy/accessibility, volatile URL и несоответствие поручению.

### C. Одноразовое копирование без source snapshots

Отклонён: теряется provenance, невозможно объяснить diff и rollback.

### D. Авторизованный snapshot pipeline с staging и явной активацией

Принят.

## Решение

1. Способ получения выбирается в порядке: partner API → partner cabinet/export → official export/file → разрешённый public-page import → manual admin import.
2. Наличие API, выгрузки или автоматизации MUST подтверждаться evidence; документация не утверждает их заранее.
3. Каждый capture MUST создавать immutable `SourceSnapshot` с source/version/timestamps/hash/transport/evidence и результатами валидации.
4. Нормализация MUST сохранять source identity и неизвестные свойства без жёсткой потери данных.
5. Staging MUST отделяться от active catalog; capture/import никогда не означает автоматическую публикацию, наличие, цену или orderability.
6. Diff MUST классифицировать add/change/remove/price/media/compatibility/unknown и указывать impact.
7. Dry-run не меняет active state. Активация выполняется авторизованным администратором после проверок и создаёт immutable activation record.
8. Source removal переводит объект в review/removed state; физическое удаление и исчезновение исторических ссылок запрещены.
9. Local override и local-only product MUST сохраняться независимо от нового source snapshot.
10. Rollback MUST переключать active snapshot/version, не переписывая историю.
11. User-facing read path MUST использовать только подтверждённую локальную active version.
12. Credentials, raw protected payload и чувствительные URL MUST NOT попадать в repository, client bundle, logs или analytics.

## Состояния

`CAPTURE_REQUESTED → CAPTURING → CAPTURED → VALIDATING → DIFF_READY → REVIEW_REQUIRED → APPROVED → ACTIVATING → ACTIVE`.

Любой исполняемый этап MAY перейти в `FAILED_RETRYABLE` или `FAILED_FINAL`. Отклонённый diff получает `REJECTED`; предыдущая active version сохраняется. Source entity использует `SOURCE_ACTIVE`, `SOURCE_CHANGED`, `SOURCE_REMOVED`; local projection — `LOCAL_REVIEW_REQUIRED`, `LOCAL_ACTIVE`, `LOCAL_HIDDEN`, `LOCAL_ARCHIVED`.

## Последствия

Положительные: storefront автономен; diff, provenance и rollback аудируемы; local overrides защищены; новый транспорт заменяем.

Отрицательные: данные не мгновенные; необходимы staging storage, сравнение, approvals, мониторинг freshness и ручной процесс при отсутствии официального транспорта.

## Риски и меры

| Риск | Мера |
|---|---|
| Source schema drift | Raw snapshot + tolerant parser + quarantine unknown |
| Неполный import выглядит полным | Completeness checks, counts, required relationships, admin warning |
| Источник удалил товар | Soft state, review, preserve historical references |
| Local override затёрт | Separate overlay with precedence and conflict report |
| Unauthorized access method | Allowlist transport, evidence, stop on auth/CAPTCHA/rate limit |
| Volatile customizer URL | Discover only through verified source record; never hard-code as stable API |

## Откат и supersede

Rollback переключает активную версию на последнюю подтверждённую и ставит неудачную activation в quarantine. Смена транспорта не меняет canonical source identity. Если AMIGO предоставляет стабильный контракт, новый ADR MAY уточнить adapter, но не отменяет snapshots, review, history и rollback без отдельного impact analysis.

## Связанные документы и требования

- [AMIGO_SYNC_ARCHITECTURE.md](../specs/04-technical/AMIGO_SYNC_ARCHITECTURE.md)
- [AMIGO_CATALOG_PARITY_SPEC.md](../specs/02-domain/AMIGO_CATALOG_PARITY_SPEC.md)
- [EXTERNAL_SOURCES.md](../00-global/EXTERNAL_SOURCES.md)
- `PARTNER-001`, `AMIGO-SYNC-001`, `AMIGO-PARITY-001`, `FR-CATALOG-016`, `EXTSRC-005`, `EXTSRC-008`, `EXTSRC-011`
- Open: `TBD-SOURCE-AMIGO-002`, `TBD-ASSORT-002`

## История

| Дата | Изменение |
|---|---|
| 2026-08-02 | Принят snapshot/staging/diff/approval/activation/rollback pattern без предположения о public API. |
