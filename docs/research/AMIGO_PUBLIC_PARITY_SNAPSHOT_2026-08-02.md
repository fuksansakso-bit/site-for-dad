# AMIGO public parity snapshot — 2026-08-02

## 0. Метаданные

| Поле | Значение |
|---|---|
| Статус | Research evidence фазы 0A.1; не нормативная спецификация и не каталог для импорта |
| Дата наблюдения | 2026-08-02, Europe/Moscow |
| Исследовательский контур | Публичные страницы `shop.amigo.ru` и текущий calculator iframe во встроенном браузере |
| Партнёрский контекст | `AUTHORIZED_PARTNER_SOURCE`, permission record `AMIGO-PERMISSION-2026-08-02-001` |
| Главный источник правды | [GLOBAL_SPEC.md](../specs/GLOBAL_SPEC.md) |
| Реестр источников | [EXTERNAL_SOURCES.md](../00-global/EXTERNAL_SOURCES.md) |

Этот snapshot фиксирует только наблюдаемое публичное состояние. Он не подтверждает полноту каталога, наличие конкретного товара, точную формулу цены, постоянство iframe URL, существование публичного API или готовность категории к локальной публикации.

## 1. Метод и ограничения

- Выполнена read-only проверка публичных страниц без авторизации, обхода CAPTCHA/rate limits и закрытых interfaces.
- Media files не скачивались, hotlink не создавался, DOM/code/network API customizer не копировались.
- Интерактивный customizer исследован по видимому UI и accessibility/DOM snapshot во встроенном браузере.
- В customizer введены только тестовые размеры `1000 × 1200 мм`; форма не отправлялась, товар в корзину не добавлялся, callback/login не использовались.
- Любое коммерческое значение требует отдельного immutable snapshot с source context, capture/verification и owner/admin approval.
- Любой AMIGO asset требует локального import record, hash, связи с сущностью, `PARTNER_LICENSE` и publication decision.

## 2. Проверенные публичные URL

| Source ID | URL | Наблюдаемый scope | Доступность |
|---|---|---|---|
| `SOURCE-AMIGO-HOME-001` | https://shop.amigo.ru/ | Навигация, категории, процессы, текущие «от» цены | Доступен |
| `SOURCE-AMIGO-CATALOG-001` | https://shop.amigo.ru/catalog/ | Категории продукции | Доступен |
| `SOURCE-AMIGO-CALCULATOR-001` | https://shop.amigo.ru/calculator/ | Calculator page и iframe discovery | Доступен |
| `SOURCE-AMIGO-PAYMENTS-001` | https://shop.amigo.ru/payments/ | Процесс заказа | Доступен |
| `SOURCE-AMIGO-SERVICES-001` | https://shop.amigo.ru/services/ | Замер, доставка, монтаж в контексте AMIGO | Доступен |
| `SOURCE-AMIGO-PROJECTS-001` | https://shop.amigo.ru/projects/ | AMIGO projects/interior examples | Доступен |
| `SOURCE-AMIGO-ROLLER-001` | https://shop.amigo.ru/rulonnye-shtory/ | Рулонные системы | Доступен |
| `SOURCE-AMIGO-ZEBRA-001` | https://shop.amigo.ru/rulonnye-shtory-zebra/ | Zebra systems | Доступен |
| `SOURCE-AMIGO-ROLLER-MATERIALS-001` | https://shop.amigo.ru/rulonnye-shtory1436/rulonnye-tkani4321/ | Рулонные ткани, filters/categories/prices | Доступен |
| `SOURCE-AMIGO-ZEBRA-MATERIALS-001` | https://shop.amigo.ru/rulonnye-shtory-zebra/rulonnye-tkani-zebra/ | Zebra fabrics, filters/categories/prices | Доступен |
| `SOURCE-AMIGO-HORIZONTAL-CATEGORY-001` | https://shop.amigo.ru/gorizontalnye-zhalyuzi/ | Horizontal taxonomy | Доступен |
| `SOURCE-AMIGO-HORIZONTAL-001` | https://shop.amigo.ru/gorizontalnye-alyuminievye-zhalyuzi/ | Horizontal aluminium | Доступен |
| `SOURCE-AMIGO-HORIZONTAL-WOOD-001` | https://shop.amigo.ru/gorizontalnye-derevyannye-zhalyuzi/ | Horizontal wood | Доступен |
| `SOURCE-AMIGO-VERTICAL-001` | https://shop.amigo.ru/vertikalnye-zhalyuzi/ | Vertical types/materials | Доступен |

Calculator page 2026-08-02 содержала iframe на наблюдаемый URL:

`https://80bcbf2544d2118d6c1ffc708b32c673.customizer.amigo.ru/`

Hostname MUST считаться volatile. Повторная проверка всегда начинается с discovery iframe на calculator page.

## 3. Наблюдаемые категории AMIGO

Публичный каталог/навигация показывает как минимум:

1. ZIP-системы для террас.
2. Готовые решения.
3. Интерьерные ставни.
4. Рулонные шторы.
5. Рулонные шторы «День-Ночь» / «Зебра».
6. Римские шторы.
7. Классические портьеры.
8. Плиссе.
9. Гофре.
10. Горизонтальные алюминиевые жалюзи.
11. Горизонтальные деревянные жалюзи.
12. Вертикальные жалюзи.
13. «Мираж».
14. Моторизованные шторы.
15. Мансардные рулонные системы.

Customizer дополнительно показывает шторные карнизы и LIFT-систему. Этот список является source taxonomy snapshot, а не утверждением локального наличия или MVP orderability.

## 4. Наблюдаемая hierarchy customizer

### 4.1. Рулонные шторы

- MINI.
- Серия UNI.
- Классика.
- Сложные формы.
- Кассета.
- ROOF system (Fakro, Roto, Velux).
- ZIP / LOCK.

### 4.2. Рулонные шторы Zebra

- Zebra MINI.
- Серия UNI.
- Классика.
- Кассета.
- Сложные формы.

### 4.3. Плиссе и гофре

- Плиссе: модели MIDI, MAXI, MINI, RUS.
- Гофре: модели MIDI, MAXI, RUS.

### 4.4. Горизонтальные

- Алюминиевые: Классика 25, Классика 16, Кассета 25, Кассета 16, SYSTEM 50, межрамные.
- Деревянные: Кассета 25, SYSTEM 25, SYSTEM 50.

### 4.5. Вертикальные и другие

- Вертикальные: ткань, пластик, алюминий, карниз в сборе.
- Бриз вертикальные.
- Рулонные шторы «Мираж».
- Портьеры.
- Римские шторы MINI, MAXI, day-night и наклонные; карниз для римских штор.
- Шторные карнизы: radio, wired, radio with battery, mechanical, Lite, LIFT.
- Интерьерные ставни: 1-, 2-, 3- и 4-секционные.

## 5. Наблюдаемый configurator flow

На MINI после выбора системы UI показал:

1. `Система` и выбранный путь `Рулонные шторы / MINI`.
2. `Размер` с отдельными width и height number inputs в миллиметрах.
3. `Материал` с поиском по названию; material list зависит от выбранного контекста.
4. `Опции`.
5. Hardware colors: белый, дуб, коричневый, тёмно-серый, чёрный.
6. Управление и длина управления в миллиметрах.
7. Комментарий к позиции.
8. Демонстрационную interior scene с окном.
9. Действие «Скачать визуализацию».
10. Cart icon и entry points «Личный кабинет», callback и справочник.

Точное влияние каждого поля на compatibility/price не установлено этим наблюдением и остаётся предметом авторизованного data/rule inventory и parity matrix.

## 6. Наблюдаемые material properties и фильтры

На страницах тканей наблюдаются категории свойств:

- цвет и нормализуемые цветовые labels;
- transparency/blackout;
- структура: блеск, гладкая, жаккард, меланж, мелкофактурная, под натуральный материал, принт, люрекс и другие source values;
- рисунок: абстрактный, без рисунка, геометрический, однотонный, орнамент, полоса, растительный, цветочный и другие source values;
- применение внутри помещений;
- пригодность для влажных помещений;
- светоотражающий слой;
- состав: полиэстер, переработанный полиэстер, PVC, лён и другие source values;
- source price category;
- contextual «от» цена или `Цена по запросу`.

Фильтры MUST строиться из фактически импортированных значений и versioned vocabulary. Наблюдаемые labels не являются закрытым enum и требуют нормализации без потери source value.

## 7. Source price categories

- Рулонная fabric page показала категории `E`, `1`, `2`, `3`, `4`, `5`.
- Zebra fabric page показала категории `E`, `0`, `1`, `2`, `3`.
- Поэтому `sourcePriceCategory` MUST быть строкой.
- `localPriceTier` MUST быть nullable и храниться отдельно.
- Клиент выбирает Material Variant; price category подставляется системой.
- Видимая «от» цена не является точным quote без идентичных системы, материала, размеров, монтажа, опций, региона и source version.

## 8. Preview и visualizer boundaries

Customizer подтверждает наличие подготовленной interior scene и material/configuration preview. Для PROJECT_NAME это обосновывает отдельный `STANDARD_INTERIOR_PREVIEW`, который:

- не принимает фото клиента;
- работает детерминированно;
- не требует generative AI;
- не блокирует pricing/cart;
- использует только разрешённые assets;
- не копирует дизайн/DOM customizer.

Примерка на пользовательском окне остаётся отдельным privacy-sensitive flow с `GEOMETRIC_PREVIEW` и optional `AI_REFINED_PREVIEW`.

## 9. Order-flow observations

Публичные страницы AMIGO показывают общий пятиэтапный путь: выбор системы/материала, заявка на замер, подтверждение материала/фурнитуры, детальный расчёт/договор, дата монтажа. PROJECT_NAME адаптирует этот pattern к локальным данным:

- вся Чеченская Республика;
- WhatsApp `+7 963 585-10-36`;
- бесплатные замер, доставка и установка;
- срок 2–7 календарных дней;
- гарантия 12 месяцев с утверждёнными условиями;
- нейтральный ручной installment flow.

Московские контакты, цены услуг, акции и юридические тексты AMIGO не переносятся.

## 10. Parity gaps, требующие доказательств

- Полный entity-level catalog inventory и stable source IDs.
- Конкретный partner export/API/file transport и schema.
- Dimension constraints для каждой системы/модели.
- Compatibility matrix систем, материалов, монтажа, controls и hardware.
- Активная проверенная `PriceVersion` и точные price rules.
- Source region/city и cadence/staleness rules.
- Owner-approved parity tolerance и контрольные cases.
- Asset inventory, attribution/brand guidelines и mapping файлов к сущностям.
- Mobile/error/loading states по репрезентативной матрице устройств.
- Cart/checkout state transitions и локальные order roles.

Эти gaps сохраняются как связанные `TBD-*` и блокируют утверждение соответствующей специализированной спеки, но не отменяют подтверждённый партнёрский status или permission scope.

## 11. Изменения snapshot

| Версия | Дата | Изменение |
|---|---|---|
| 1.0.0 | 2026-08-02 | Создан read-only snapshot 14 публичных страниц и текущего calculator customizer; зафиксированы taxonomy, flow, filters и price-category evidence. |
