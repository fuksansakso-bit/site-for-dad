# ADR-0004: Детерминированный standard preview renderer

## Метаданные

| Поле | Значение |
|---|---|
| Статус | Accepted — product boundary; renderer technology pending prototype |
| Дата решения | 2026-08-02 |
| Решение принято | Владелец продукта в рамках поручения Phase 0B |
| Область | Preview on PROJECT_NAME-owned demonstration interiors |
| Заменяет | — |

## Контекст

Пользователю нужен мгновенный предварительный просмотр выбранной конфигурации на демонстрационном окне до загрузки личной фотографии. Этот результат не является AI-примеркой и должен работать даже при отключённом AI. Точная техника рендеринга зависит от качества rights-cleared сцен и прототипа, но продуктовая граница должна быть стабильной.

## Драйверы

- мгновенный и предсказуемый результат;
- точная связь с MaterialVariant и конфигурацией;
- доступность на мобильных устройствах;
- работа без личного изображения и AI;
- возможность visual regression;
- отдельная честная маркировка демонстрационной сцены;
- graceful fallback на статический swatch/product image.

## Рассмотренные варианты

### A. Только изображения AMIGO на карточке

Отклонён как единственный preview: не показывает выбранное сочетание параметров в собственной сцене.

### B. Генеративный AI для каждого стандартного preview

Отклонён: медленнее, дороже, недетерминированно и может менять идентичность товара.

### C. Детерминированный layered renderer

Принят как основной boundary; конкретный выбор CSS/SVG/Canvas/WebGL/server render остаётся за prototype evaluation.

## Решение

1. `GEOMETRIC_PREVIEW` MUST быть отдельным от `AI_REFINED_PREVIEW` типом результата и доступен без AI.
2. Renderer MUST использовать только rights-cleared local scene assets и published catalog/material assets.
3. Input MUST содержать stable configuration/material IDs, renderer profile/version, scene ID, dimensions/state and source asset versions.
4. Output MUST быть детерминирован для одинаковых input/profile/assets и трассироваться к выбранному MaterialVariant.
5. Renderer MUST моделировать только подтверждённые свойства семейства; неподдерживаемый случай получает явный fallback, а не правдоподобную выдумку.
6. Scene templates MUST иметь calibrated window geometry, occlusion/protected layers, lighting variants и accessibility-safe controls.
7. Day/night, open/closed или stripe alignment MAY показываться только для поддерживаемого renderer profile.
8. Preview MUST показывать disclosure «демонстрационный предварительный вид» и не обещать абсолютное совпадение цвета между экраном и образцом.
9. Исходная карточка/образец MUST оставаться доступными при renderer failure, low capability, reduced data или unsupported family.
10. Renderer profile/asset changes MUST запускать visual regression и version compatibility review.

## Поток и состояния

`INPUT_READY → PROFILE_SELECTED → ASSETS_LOADING → RENDERED`; альтернативы: `UNSUPPORTED`, `ASSET_MISSING`, `LOW_CAPABILITY_FALLBACK`, `RENDER_FAILED`. Смена настройки инвалидирует только зависимый preview и не теряет ProductConfiguration.

## Последствия

Положительные: быстрый базовый preview, воспроизводимость, независимость от AI и приватных фото, стабильные тесты.

Отрицательные: нужны подготовленные сцены и профили по семействам; реализм ограничен; точная геометрия сложных изделий требует дополнительных прототипов.

## Риски и меры

| Риск | Мера |
|---|---|
| Preview ошибочно считают фото своего окна | Явная маркировка и отдельный CTA AI-примерки |
| Цвет/фактура искажены дисплеем | Disclosure, swatch metadata, physical sample confirmation |
| Слабое устройство | Capability check и статический fallback |
| Scene asset без прав | Publication gate и asset provenance |
| Новый family не поддержан | Profile capability matrix и neutral unsupported state |

## Откат и supersede

Renderer profile version может быть отключена с возвратом к последней валидной или статическому изображению. Смена технологии допускается без изменения ProductConfiguration/output contract. Существенное изменение идентичности результата требует нового ADR.

## Связанные документы и требования

- [STANDARD_INTERIOR_PREVIEW_SPEC.md](../specs/02-domain/STANDARD_INTERIOR_PREVIEW_SPEC.md)
- [DESIGN_SYSTEM.md](../specs/03-ux/DESIGN_SYSTEM.md)
- [ASSET_MEDIA_PIPELINE.md](../specs/04-technical/ASSET_MEDIA_PIPELINE.md)
- `FR-STANDARD-PREVIEW-001`–`008`, `FR-CONFIG-001`–`008`, `ASSET-014`
- Open: `TBD-DESIGN-003`, `TBD-ASSET-001`, renderer prototype/coverage matrix

## История

| Дата | Изменение |
|---|---|
| 2026-08-02 | Принята детерминированная standard-preview граница, независимая от AI. |
