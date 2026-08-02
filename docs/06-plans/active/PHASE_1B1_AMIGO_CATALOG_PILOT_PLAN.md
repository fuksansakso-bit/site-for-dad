# PHASE 1B.1 — AMIGO CATALOG PILOT AND LOCAL PUBLICATION LAYER

## 0. Control block

| Поле | Значение |
|---|---|
| Plan ID | `PLAN-1B1-001` |
| Статус | **IN PROGRESS — AUTHORIZED** |
| Ветка | `phase/1b-amigo-catalog-pilot` |
| Исходный commit | `943d4a2efa5e05f0d05493633cf5eb549e072a22` |
| Проверяемый результат | Идемпотентный реальный пилот AMIGO импортирует 32 разрешённых `MaterialVariant`, их цены «от» и ограниченные media assets в локальные PostgreSQL/object storage, создаёт diff и управляемую версию, а `/catalog` и `/admin/catalog` работают только через локальный published layer. |
| Разрешение | `OWNER-DECISION-010` в [GLOBAL_SPEC](../../specs/GLOBAL_SPEC.md#22-решения-владельца-для-implementation-governance-и-будущих-feature-gates) |
| Transport evidence | [AMIGO_PILOT_TRANSPORT_DISCOVERY_2026-08-02](../../research/AMIGO_PILOT_TRANSPORT_DISCOVERY_2026-08-02.md) |

## 1. Scope boundary

Разрешены только source/normalized/overlay catalog layers, provider-neutral adapters, controlled AMIGO pilot, private-by-default local media, source prices «от», local price overrides, availability/visibility/publication, version/diff/approval, Graphile Worker sync, безопасные catalog APIs и минимальные `/catalog`/`/admin/catalog`.

Запрещены Phase 1B.2/1C+, полный импорт AMIGO, формулы и расчёт по размерам, minimum-price engine, configurator, preview/AI, cart/order/WhatsApp/installment/account, final landing/starfield, production providers и deployment. Наличие карточной цены не разрешает расчёт изделия.

## 2. Entry evidence

- [x] Phase 1A имеет `PASSED_PHASE_1A_FOUNDATION`.
- [x] Product Owner отдельно письменно разрешил только Phase 1B.1.
- [x] branch и clean baseline подтверждены до изменений.
- [x] приоритетный transport discovery выполнен; API/export не выдуманы.
- [x] public-page fallback разрешён владельцем и доступен без login/CAPTCHA.
- [x] у карточек подтверждены стабильные AMIGO `data-id`, section/path, title, price и media path.
- [x] Phase 1A storage port поддерживает private zone, immutable checksum metadata и bounded objects; реальный JPEG preflight прошёл.
- [x] `PARTNER_LICENSE` охватывает pilot material/product media; публикация остаётся asset-level `PUBLICATION_APPROVED`.
- [x] pilot allowlist ограничен 32 материалами и четырьмя системами.

## 3. Frozen pilot allowlist

| Семейство | Source section/path | Material source IDs | Системы |
|---|---|---|---|
| Рулонные | `80` · `/rulonnye-shtory/rulonnye-tkani/` | `49126,49124,49122,49120,49119,49117,49129,50772` | `7556` MINI / ROLLLA; `7557` UNI1 / UNI2 |
| Zebra / День-Ночь | `83` · `/rulonnye-shtory-zebra/rulonnye-tkani-zebra/` | `54650,54649,54648,54647,49850,49849,49848,49847` | `7542` Mini-зебра; `7543` UNI1-зебра |
| Горизонтальные алюминиевые | `68` · `/gorizontalnye-alyuminievye-zhalyuzi/gorizontalnye-lenty/` | `38920,38919,38918,38917,143,28076,28075,28074` | В Phase 1B.1 отдельная system compatibility не активируется без подтверждённого mapping |
| Вертикальные | `65` · `/vertikalnye-zhalyuzi/vertikalnye-tkani/` | `39807,39806,39805,17603,1667,1666,1665,1664` | В Phase 1B.1 отдельная system compatibility не активируется без подтверждённого mapping |

Allowlist содержит roller blackout (`49129`, `50772`), Zebra blackout (`49850`–`49847`), алюминиевую ламель и вертикальную ткань. Source price-category semantics не угадываются: opaque source tokens сохраняются в snapshot/context, а публичный price-category filter включается только для нормализованных значений.

## 4. Execution plan

Только один этап имеет статус `IN_PROGRESS`.

| № | Этап | Статус | Проверяемое завершение |
|---:|---|---|---|
| 1 | Авторизация, transport discovery, active plan и scope guard | **IN_PROGRESS** | Source of truth синхронизирован; transport/allowlist/stop conditions зафиксированы |
| 2 | Source/normalized/overlay Prisma model и forward migration | PENDING | Stable UUID/source identity, ownership separation и migration replay проходят |
| 3 | `CatalogSourceAdapter`, AMIGO parser и fixture adapter | PENDING | Contract/mapping/security tests проходят без domain selectors |
| 4 | Graphile Worker sync, raw snapshots, normalization и idempotency | PENDING | Repeat/update/removal/retry/rollback evidence проходит |
| 5 | Media import через storage abstraction | PENDING | MIME/size/hash/dedup/private delivery/audit tests проходят |
| 6 | Catalog/Price versioning, exact diff и activation | PENDING | OWNER/ADMIN-only atomic activation и rollback доказаны |
| 7 | Business overlay и mutation APIs | PENDING | Availability/visibility/local price переживают sync и аудируются |
| 8 | Минимальный `/admin/catalog` по design-system rules | PENDING | RBAC, bulk publication, status/history/diff и responsive flow проходят |
| 9 | Минимальный PostgreSQL-only `/catalog` | PENDING | Search/filter/hidden/out-of-stock/outage scenarios проходят |
| 10 | Реальный pilot run и полный test/CI-equivalent gate | PENDING | 32 real variants/media/prices imported; build/tests/CI clean |
| 11 | Документация, completion report и остановка | PENDING | План completed, report создан, tree clean, Phase 1C не начата |

## 5. Commit sequence

1. `docs: authorize Phase 1B.1`
2. `feat: add catalog source data model`
3. `feat: add catalog source adapters`
4. `feat: add catalog synchronization pipeline`
5. `feat: add catalog media import`
6. `feat: add catalog versioning and diff`
7. `feat: add catalog business overlays`
8. `feat: add admin catalog pilot`
9. `feat: add public catalog pilot`
10. `test: verify catalog synchronization and publication`
11. `docs: complete Phase 1B.1 pilot`

## 6. Verification and recovery

Required evidence covers unit, adapter/storage/API/job contracts, PostgreSQL integration, real-source idempotency, source update/removal, overlay survival, media dedup, atomic version activation/rollback, audit, browser search/filter/admin/bulk publication, AMIGO/media/storage/database outages, worker restart/replay, lint/typecheck/build/security scans and full CI-equivalent execution.

## 7. Stop conditions

Work stops if stable public IDs disappear, access requires credentials/CAPTCHA/bypass, source pages prohibit the selected transport, pilot prices cannot be captured, permitted media cannot pass storage validation, Phase 1A foundation fails, or completion would require configurator/calculator/AI/Phase 1B.2+. Fixtures never substitute for the real pilot.

## 8. Completion handling

After every acceptance item passes, this record is marked `COMPLETED` and remains at its stable path under `active/` according to the established Phase 1A convention; the immutable outcome/evidence is written to `docs/06-plans/completed/PHASE_1B1_AMIGO_CATALOG_PILOT_REPORT.md`. No next phase is started automatically.
