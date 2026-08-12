# AMIGO full catalog transport discovery — 2026-08-03

## 1. Статус и граница доказательства

| Поле | Фактическое значение |
|---|---|
| Решение | `OWNER-DECISION-012`, только Phase 1B.2 |
| Existing adapter | расширен существующий `AmigoCatalogSourceAdapter`; второй importer не создан |
| Transport | `AUTHORIZED_PUBLIC_WEB`, `https://shop.amigo.ru/catalog/` и обнаруженные безопасные catalog paths |
| Capture | 2026-08-03 13:54:11 Europe/Moscow (`2026-08-03T10:54:11.607Z`) |
| Parser | `amigo-public-html/2.0.1` |
| Mapping | `amigo-public-full-catalog-mapping/2.0.1` |
| Semantic source version | `sha256:3cf971b0aabe17091ef0804e8d8368fb37182939533a4eef8ee4346f4c59711d` |
| Результат discovery | `complete = true`; failure diagnostics `0`; warning diagnostics `28` |

Это доказательство полного доступного на дату capture discovery через разрешённый public-page fallback. Оно не доказывает существование official API/export, не активирует данные, не является завершённым PostgreSQL/media import manifest и не разрешает Phase 1C.

## 2. Transport и управление нагрузкой

- Выполнено 114 последовательных HTTPS-запросов: 1 catalog index, 15 top-level category pages, 13 nested collection pages, 76 pagination pages и 9 model detail pages.
- Concurrency — `1`; minimum delay — 1200 ms; применяются timeout, bounded retry, exponential backoff и jitter.
- Разрешаются только `shop.amigo.ru`, чистые catalog paths глубиной до четырёх сегментов и единственный строгий numeric pagination query `PAGEN_n=n`.
- Login, account, cart/action, filter, search, upload, Bitrix mutation, API, customizer и иные запрещённые paths не обходятся и не вызываются.
- Credential для discovery не потребовался. На некоторых страницах присутствуют пассивные CAPTCHA-формы обратной связи, но catalog acquisition ими не закрыт: adapter не заполняет и не отправляет формы, не вызывает CAPTCHA endpoint и не обходит проверку.
- Source HTML/DOM используется только внутри adapter/parser. Frontend-код и дизайн AMIGO не копируются.

## 3. Фактическое покрытие

| Сущность | Количество |
|---|---:|
| Категории всего | 28 |
| Top-level categories | 15 |
| Nested categories/collections | 13 |
| Системы | 56 |
| Модели готовых решений | 9 |
| MaterialVariant source IDs | 1655 |
| Уникальные system/model/material identities | 1720 |
| Material media links | 2940 |
| Category/system/model media links | 113 |
| Typed media references всего | 3053 |
| Source price records на обнаруженных material/model entities | 1664 |
| `PRICE_ON_REQUEST` | 68 |
| Failure diagnostics | 0 |
| Warning diagnostics | 28 |

`2940` — точный discovery-счётчик material media links; ещё `113` ссылок принадлежат category/system/model targets. `3053` — количество typed source references, а не обещание такого же количества бинарных объектов: локальное хранилище дедуплицирует точные bytes по SHA-256, сохраняя каждую provenance-связь.

## 4. Обнаруженные категории

| Source identity | Категория | Parent | Systems | Models | MaterialVariant |
|---|---|---|---:|---:|---:|
| `category:path:outdoor-rulonnye-shtory` | ZIP системы для террас | — | 3 | 0 | 0 |
| `category:path:readymade` | Готовые рулонные шторы и жалюзи | — | 0 | 9 | 0 |
| `category:path:interernye-stavni` | Интерьерные ставни | — | 0 | 0 | 0 |
| `category:path:shtory-klassicheskie-portery` | Шторы: Классические портьеры | — | 3 | 0 | 0 |
| `category:path:rulonnye-shtory-zebra` | Рулонные шторы «День-Ночь» (Зебра) | — | 6 | 0 | 0 |
| `category:path:rulonnye-shtory-dlya-mansardy` | Рулонные шторы для мансарды | — | 0 | 0 | 0 |
| `category:path:shtory-gofre` | Шторы и жалюзи гофре на пластиковые окна | — | 9 | 0 | 0 |
| `category:path:gorizontalnye-alyuminievye-zhalyuzi` | Горизонтальные алюминиевые жалюзи | — | 3 | 0 | 0 |
| `category:path:gorizontalnye-derevyannye-zhalyuzi` | Горизонтальные деревянные жалюзи | — | 4 | 0 | 0 |
| `category:path:vertikalnye-zhalyuzi` | Вертикальные жалюзи | — | 5 | 0 | 0 |
| `category:path:shtory-mirazh` | Рулонные шторы «Мираж» | — | 0 | 0 | 0 |
| `category:path:motorizatsiya-shtory` | Моторизованные шторы | — | 6 | 0 | 0 |
| `category:path:rulonnye-shtory` | Рулонные шторы на пластиковые окна | — | 6 | 0 | 0 |
| `category:path:rimskie-shtory` | Римские шторы | — | 0 | 0 | 0 |
| `category:path:shtory-plisse` | Шторы плиссе на пластиковые окна | — | 11 | 0 | 0 |
| `category:path:gorizontalnye-derevyannye-zhalyuzi--bambuk-derevo-plastik` | Бамбук-дерево-пластик | Горизонтальные деревянные | 4 | 0 | 80 |
| `65` | Вертикальные ткани для жалюзи | Вертикальные | 5 | 0 | 242 |
| `68` | Горизонтальные ленты для алюминиевых жалюзи | Горизонтальные алюминиевые | 3 | 0 | 102 |
| `1291` | Каталог материалов для ставней | Интерьерные ставни | 0 | 0 | 12 |
| `1200` | Материалы для системы ZIP для террасы и вернады | ZIP | 3 | 0 | 38 |
| `1275` | Материалы для штор. Ткани для портьер | Классические портьеры | 3 | 0 | 133 |
| `1125` | Портьерные ткани | Римские шторы | 0 | 0 | 154 |
| `80` | Рулонные ткани | Рулонные шторы | 6 | 0 | 431 |
| `83` | Рулонные ткани Зебра | День-Ночь / Зебра | 6 | 0 | 150 |
| `88` | Ткани для рулонных штор | Мираж | 0 | 0 | 27 |
| `300` | Ткани для штор гофре | Гофре | 9 | 0 | 44 |
| `85` | Ткани для штор плиссе | Плиссе | 11 | 0 | 218 |
| `category:path:vertikalnye-zhalyuzi--vertikalnyy-plastik-alyuminiy` | Вертикальный пластик/алюминий | Вертикальные | 5 | 0 | 24 |

Список — dated snapshot, а не закрытый enum. Будущая новая source category должна пройти тот же discovery, diff, review и activation gate.

## 5. Stable identity и semantic version

- System, model и material cards используют опубликованные numeric upstream IDs.
- Top-level category использует canonical path identity, потому что отдельный стабильный numeric ID на index не опубликован.
- Nested collection с одним однозначным `data-sec` использует numeric section ID.
- Nested collection с несколькими легитимными source sections сохраняет canonical path identity; разделы остаются source facts и не склеиваются по названию.
- Source slug/title не являются ключом.
- Semantic catalog version вычисляется из сортированных безопасных распознанных category/system/model/material facts. Volatile scripts, form IDs, CAPTCHA/session tokens и время capture не создают ложную новую catalog version.
- Raw response content hash остаётся capture-метаданными и не передаётся public client.

## 6. Диагностика без скрытых пропусков

| Code | Count | Результат |
|---|---:|---|
| `MULTIPLE_SOURCE_SECTIONS` | 2 | Коллекции дерево/бамбук/пластик и вертикальный пластик/алюминий сохранены с path identity; все безопасно распознанные items включены |
| `SOURCE_ZERO_PRICE_NORMALIZED` | 1 | Source ID `986` публикует `от 0 ₽`; запись сохранена, цена стала `PRICE_ON_REQUEST`, а не `0` |
| `EMPTY_STRUCTURED_CATEGORY` | 1 | Мансардная страница сохранена как категория; рекламный текст про ROOF не превращён в вымышленную структурированную сущность |
| `AMBIGUOUS_SOURCE_PRICE_NORMALIZED` | 24 | Карточки с несколькими контекстными денежными значениями сохранены с исходной меткой, но нормализованы как `PRICE_ON_REQUEST`; цифры не склеиваются и одно значение не выбирается по догадке |

Обзорные material preview cards не считаются каноническими collection cards. Это исключает ложные duplicate/source-conflict/media-failure diagnostics для одного и того же material ID. Реальные данные содержат 23 группы повторяющихся article values (29 дополнительных строк), поэтому article остаётся поисковым source fact, а стабильной identity служит source ID; ни одна строка не теряется и не сливается. Повреждённая карточка в будущем получает item-level `PARSER_REVIEW_REQUIRED`; safe siblings продолжаются, но discovery не получает `complete = true`, пока failure не устранён или не отражён принятой политикой.

## 7. Stop-condition audit

| Условие | Результат |
|---|---|
| Неизвестный credential | Не требуется для зафиксированных paths |
| CAPTCHA/access bypass | Не требуется и не выполнялся |
| Технический запрет источника | Не наблюдался на разрешённых acquisition paths |
| Нестабильная identity | Не обнаружена |
| Duplicate creation | Не обнаружено; regression fixtures и unique source IDs проходят |
| Массово нераспознанная структура | Не обнаружена |
| Глобальный transport/parser failure | `0` |
| Phase 1C/calculator/production secret | Не требуются и не начаты |

## 8. Последующий принятый результат

После этого dated discovery Phase 1B.2 выполнила durable resumable import, sealed manifest, PostgreSQL normalization/diff, OWNER review и explicit ADMIN activation. Accepted run и точные версии/counts/media/restart/no-op результаты зафиксированы в [Phase 1B.2 completion report](../06-plans/completed/PHASE_1B2_FULL_AMIGO_CATALOG_REPORT.md). Этот research snapshot остаётся provenance исходного capture и не заменяет governed manifest; никакая следующая фаза не разрешена.
