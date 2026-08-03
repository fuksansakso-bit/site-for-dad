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
- [x] Provider-neutral storage port сохранён; после воспроизводимого RustFS Windows failure `OWNER-DECISION-011` выбрал local-only VersityGW, а реальный 515,180-byte JPEG прошёл byte/SHA contract gate 2026-08-03.
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
| 1 | Авторизация, transport discovery, active plan и scope guard | COMPLETED | Source of truth синхронизирован; transport/allowlist/stop conditions зафиксированы |
| 2 | Source/normalized/overlay Prisma model и forward migration | COMPLETED | Stable UUID/source identity, ownership separation и migration replay прошли |
| 3 | `CatalogSourceAdapter`, AMIGO parser и fixture adapter | COMPLETED | Contract/mapping/security tests прошли без domain selectors |
| 4 | Graphile Worker sync, raw snapshots, normalization и idempotency | COMPLETED | Real pilot captured 6 snapshots, 32 variants, 59 media links and 32 prices; failed storage run retained historically |
| 5 | Local storage recovery и mandatory contract gate | COMPLETED | RustFS inactive; VersityGW 15/15, signed/multipart/real JPEG/restart persistence, docs and logical commit passed |
| 6 | Media import через storage abstraction | COMPLETED | Runs `f9407db3-9e82-4174-9e21-87528bdd7092`/`642f2bc2-387b-44fe-9d52-e05cd78e374c`: 32/32 variants, 59/59 byte/SHA-verified private objects, zero item failures, retry lineage and restart persistence; failed run unchanged |
| 7 | Catalog/Price versioning, exact diff и activation | COMPLETED | Exact candidates/checksums, distinct OWNER approval, ADMIN activation, idempotency and atomic rollback passed disposable PostgreSQL integration |
| 8 | Business overlay и mutation APIs | COMPLETED | Owner visibility/review, inquiry-only availability, publication and local override set/remove remain separate from source facts and are pinned into immutable composition |
| 9 | Минимальный `/admin/catalog` по design-system rules | **IN_PROGRESS** | RBAC, bulk publication, status/history/diff и responsive flow проходят |
| 10 | Минимальный PostgreSQL-only `/catalog` | PENDING | Search/filter/hidden/out-of-stock/outage scenarios проходят |
| 11 | Реальный pilot run и полный test/CI-equivalent gate | PENDING | 32 real variants/media/prices imported; build/tests/CI clean |
| 12 | Документация, completion report и остановка | PENDING | План completed, report создан, tree clean, Phase 1C не начата |

## 5. Commit sequence

1. `docs: authorize Phase 1B.1`
2. `feat: add catalog source data model`
3. `feat: add catalog source adapters`
4. `feat: add catalog synchronization pipeline`
5. `fix: replace local RustFS emulator with VersityGW`
6. `feat: add catalog media import`
7. `feat: add catalog versioning and diff`
8. `feat: add catalog business overlays`
9. `feat: add admin catalog pilot`
10. `feat: add public catalog pilot`
11. `test: verify catalog synchronization and publication`
12. `docs: complete Phase 1B.1 pilot`

## 6. Verification and recovery

Required evidence covers unit, adapter/storage/API/job contracts, PostgreSQL integration, real-source idempotency, source update/removal, overlay survival, media dedup, atomic version activation/rollback, audit, browser search/filter/admin/bulk publication, AMIGO/media/storage/database outages, worker restart/replay, lint/typecheck/build/security scans and full CI-equivalent execution.

Storage recovery evidence 2026-08-03: VersityGW `v1.4.1` image digest `sha256:0400cb59f59da0f1cf9f7fd49505191abc348dfadf54509bf1988caaff4eb96f`; size matrix `1`, `65,536`, `131,072`, `159,099`, `262,144`, `515,180`, `1 MiB`, `5 MiB`, `6 MiB`; 15/15 tests passed with byte/SHA equality, signed read/write, multipart complete/abort, all-private negative access and graceful/Docker Desktop restart persistence. Existing run `798d5513-27b1-48e3-ab8e-389eeb672db4` remains `FAILED / CATALOG_PIPELINE_STORAGE_UNAVAILABLE`; media continuation must create a new run/correlation ID.

Media recovery evidence 2026-08-03: primary run `f9407db3-9e82-4174-9e21-87528bdd7092` and idempotency repeat `642f2bc2-387b-44fe-9d52-e05cd78e374c` reached `AWAITING_APPROVAL` without publication or activation. All 32 pilot variants have at least one local image; 59 source media objects (8,340,101 bytes) passed full object-storage download and byte/SHA verification, including the 515,180-byte AMIGO JPEG with SHA-256 `ac86fc976afc2063cc97e1528611c978a348f357d26c8fe3c59b7c23f113d0cd`. The repeat created no duplicate source identities, variants, price records, media assets or links; `audit_context.retryOfSyncRunId` preserves the lineage back to failed run `798d5513-27b1-48e3-ab8e-389eeb672db4`.

Versioning and overlay implementation evidence 2026-08-03: disposable PostgreSQL integration creates one immutable catalog candidate, one immutable price candidate and exact typed differences on the first fixture run; owner bulk publication then creates separate visibility/review, safe `INQUIRY_ONLY` availability, publication/media approval and immutable composition. A synthetic local override is set and removed without changing the source price; distinct OWNER approval and ADMIN activation switch both public pointers, an identical retry creates no versions, and a changed catalog candidate is activated and atomically rolled back to its verified predecessor. Real pilot activation remains intentionally pending until the same reviewed admin flow is applied to the 32 real variants.

## 7. Stop conditions

Work stops if stable public IDs disappear, access requires credentials/CAPTCHA/bypass, source pages prohibit the selected transport, pilot prices cannot be captured, permitted media cannot pass storage validation, Phase 1A foundation fails, or completion would require configurator/calculator/AI/Phase 1B.2+. Fixtures never substitute for the real pilot.

## 8. Completion handling

After every acceptance item passes, this record is marked `COMPLETED` and remains at its stable path under `active/` according to the established Phase 1A convention; the immutable outcome/evidence is written to `docs/06-plans/completed/PHASE_1B1_AMIGO_CATALOG_PILOT_REPORT.md`. No next phase is started automatically.
