# PHASE 1B.2 — FULL AUTHORIZED AMIGO CATALOG EXPANSION completion report PROJECT_NAME

## 0. Control block

| Поле | Значение |
|---|---|
| Phase | `1B.2 — FULL AUTHORIZED AMIGO CATALOG EXPANSION` |
| Result | **PASSED_PHASE_1B2_FULL_AMIGO_CATALOG** |
| Date | 2026-08-04, Europe/Moscow |
| Branch baseline | `af8411d2b854e572b6b61b214d3e99a88b96cafc` |
| Phase branch | `phase/1b2-amigo-full-catalog` |
| Owner authorization | `OWNER-DECISION-012` |
| Acceptance | `QG-195`–`230`, `PLAN-1B2-001` |
| Later phases | **NOT AUTHORIZED / NOT STARTED** |

Отчёт фиксирует фактически принятую Phase 1B.2 и не разрешает Phase 1C, dimensional calculator/configurator, preview/AI, cart/order/WhatsApp/installment/account, final landing/starfield или production deployment.

## 1. Исходная база и сохранённая история

Работа начата от завершённой Phase 1B.1 на commit `af8411d2b854e572b6b61b214d3e99a88b96cafc`. Существующий `AmigoCatalogSourceAdapter`, PostgreSQL/Prisma/Graphile Worker, provider-neutral `StoragePort`, VersityGW local/CI adapter, source/normalized/business-overlay layers и explicit OWNER/ADMIN governance расширены без второго импортёра и без переписывания pilot history.

До финального успешного run сохранены как audit/recovery evidence:

| Run | Состояние | Значение evidence |
|---|---|---|
| `cf159226-450a-4aad-8495-1b5c7a5d3fab` | `FAILED` | 5 181 snapshots; реальный restart recovery; суммарный `resumeCount = 114`; sealed partial manifest |
| `d07a3dfa-3105-487a-8f12-525048dc9cdd` | `CANCELLED` | остановка после обнаружения несовместимой family identity без активации |
| `8e2a6deb-48e1-4b33-9b43-cb023ce9570e` | `CANCELLED` | остановка после обнаружения product-model/article compatibility drift без активации |
| `854581ac-03b8-420f-a1b2-a19f584bda69` | `FAILED` | media placement identity conflict сохранён; terminal failure корректно закрыл run и partial manifest |
| `7d19a6e8-abcc-4bc6-a180-c0a5b59e17d6` | `COMPLETED` | принятый полный run: 21 019/21 019 items, 0 errors, полный manifest и кандидаты v2 |

Ни один неуспешный run не переписан в success. Все исправления выполнены forward-only миграциями или новой parser/mapping revision.

## 2. Transport, parser и source version

- transport: `AUTHORIZED_PUBLIC_WEB` только для `https://shop.amigo.ru/catalog/` и обнаруженных allowlisted catalog paths;
- concurrency: `1`; minimum delay: `1 200 ms`; bounded timeout/retry/backoff/jitter/redirect/SSRF controls;
- pages: `114` — index, top-level/nested category pages, pagination и model details;
- parser: `amigo-public-html/2.0.1`;
- mapping: `amigo-public-full-catalog-mapping/2.0.1`;
- semantic source version: `sha256:3cf971b0aabe17091ef0804e8d8368fb37182939533a4eef8ee4346f4c59711d`;
- login, CAPTCHA submit/bypass, account/cart/action/filter/search/API/customizer endpoints и credentials не использовались.

Semantic version строится из безопасных распознанных facts и исключает scripts, form/CAPTCHA/session tokens, capture timestamp и иные volatile значения. Raw captures остаются локальным immutable evidence, не public data.

## 3. Реальный import manifest

Финальный принимаемый run: `7d19a6e8-abcc-4bc6-a180-c0a5b59e17d6`.

| Метрика | Фактическое значение |
|---|---:|
| Pages | 114 |
| Snapshots | 5 181 |
| Categories | 28 |
| Families | 15 |
| Systems | 56 |
| Models | 9 |
| Materials | 451 |
| MaterialVariant | 1 655 |
| Colors | 289 |
| Properties | 12 144 |
| Media manifests | 1 655 |
| Typed media references | 3 053 |
| Material media placements | 2 940 |
| Price records | 1 664 |
| Normalized sync items | 21 019 |
| Durable checkpoints | 8 |
| Warnings | 28 |
| Failures / skips / stable-identity duplicates / source removals | 0 / 0 / 0 / 0 |

Normalized item breakdown: `CATEGORY 28`, `FAMILY 15`, `SYSTEM 56`, `MODEL 9`, `MATERIAL 451`, `MATERIAL_VARIANT 1655`, `COLOR 289`, `PROPERTY 12144`, `MEDIA 4708`, `PRICE 1664`.

Final manifest status: `COMPLETE`; checksum: `ea1b2a3148efa6bd1be9a41a8dba8c21e1a4bada1c728fe262047a0b0f52579e`.

## 4. Диагностика и несоответствия

| Diagnostic | Count | Безопасное решение |
|---|---:|---|
| `MULTIPLE_SOURCE_SECTIONS` | 2 | path identity сохраняет обе легитимные collection structures |
| `SOURCE_ZERO_PRICE_NORMALIZED` | 1 | `0 ₽` становится `PRICE_ON_REQUEST`, не числом `0` |
| `EMPTY_STRUCTURED_CATEGORY` | 1 | категория сохраняется без выдуманной сущности |
| `AMBIGUOUS_SOURCE_PRICE_NORMALIZED` | 24 | несколько денежных значений сохраняются как context, normalized price — `PRICE_ON_REQUEST` |

Real source содержит 23 группы повторяющихся article values и 29 дополнительных variants внутри этих групп. Это не duplicate identity: article сохранён как searchable fact, а все 1 655 source IDs остаются отдельными без loss/merge. Manifest duplicate count равен `0`.

Исторические 59 catalog differences класса `MEDIA/SOURCE_REMOVED` относятся к контролируемому переходу identity pilot-media на full-catalog mapping. Они не являются 59 удалёнными source entities: текущий manifest фиксирует `sourceRemoved = 0`, физического удаления не выполнялось, а Phase 1B.1 v1 сохранена для rollback.

## 5. Схема и восстановление совместимости

Финальная база применяет 15 reviewed migrations. Пять forward compatibility migrations Stage 12:

1. сохраняют уже опубликованные Phase 1B.1 family identities при переходе к mapping `2.0.1`;
2. идемпотентно дополняют раннюю локальную `ProductModel` shape;
3. заменяют опровергнутую unique `(materialId, article)` гипотезу non-unique index;
4. закрепляют parser `2.0.1` и fail-closed ambiguous-price behavior;
5. добавляют `SourceMediaAsset.sourceEntityId` join index для bounded post-normalization media batches.

Semantic material/role/order placement атомарно перепривязывается к current source-media reference, сохраняя historical source evidence; binary deduplication остаётся SHA-256-based. Exhausted terminal media failure переводит run в `FAILED` и запечатывает partial manifest вместо зависания в `IMPORTING_MEDIA`.

## 6. Media и object storage

Полный run учитывает 3 053 typed media references: 2 940 material, 12 category, 52 system и 49 model references. Каждый reference прошёл allowlisted fetch, MIME/signature/dimension/decompression/size validation, generated-key private storage, SHA-256 integrity, `PARTNER_LICENSE` provenance и OWNER publication preparation. Hotlink не использовался.

| Метрика | Результат |
|---|---|
| Imported typed references | `3 053` (`2 940` material, `12` category, `52` system, `49` model) |
| Distinct SHA-256 objects | `2 818` |
| Total distinct bytes | `519 671 532` |
| MaterialVariant с локальным primary media | `1 655 / 1 655` |
| Item-level failures | `0` |
| Post-restart integrity | `2 818 / 2 818` objects verified by stored length and SHA-256 |

VersityGW остаётся local/CI-only и private-by-default. Production storage provider/region не выбран.

## 7. Source prices

Price candidate содержит ровно 1 664 append-only source revisions: 1 655 material variants и 9 models. `AVAILABLE = 1 596`, `PRICE_ON_REQUEST = 68`; наблюдаемый numeric range — от `127 600` до `5 301 700` minor RUB units. Эти значения являются versioned source card/base/price-from facts, а не dimensional calculation.

Несколько цен в одной карточке не склеиваются и не выбираются как min/max. `LocalPriceOverride` хранится отдельно и не меняется sync. Formula, dimensions, compatibility, rounding, minimum-price engine и parity fixtures остаются Phase 1C/TBD.

## 8. OWNER review, bulk evidence и ADMIN activation

OWNER принял checksum-bound catalog и price differences, одобрил обе immutable версии и все `2 759` новых pending media assets; вместе с 59 ранее одобренными pilot assets итоговый publication set содержит `2 818 / 2 818` `PUBLICATION_APPROVED` objects. ADMIN атомарно активировал:

- CatalogVersion v2 `8975b18c-d7de-49cc-a6e6-d7566b69460a`, `ACTIVE / PUBLIC`;
- PriceVersion v2 `9fdc0a74-9fab-4d63-b4b6-015f534e117d`, `ACTIVE / PUBLIC`;
- original catalog diff checksum `4efe2a7f17f3e9242b80033379650e4a05af13abb58a80da686cb11cfa0f7837`;
- composed catalog diff checksum `f22653c6fcbe2f4003b4be6861fa6f71583e423dfad8843ddba5e604d5e96768`;
- immutable 1 739-entry composition checksum `1e9353b2d7d2033c92adaf33b2d8221aba4aa10ea958d90aa73b50d45f534081`;
- price diff checksum `9fb6b6f927d07b535baac471cb172c4aa6441670b8e6cbba9ed4581724062e27`.

Selected bulk evidence использовало source variant `1008`: audited command `afce7c18-f20c-4bd4-9768-afbf2c4ea53c` применил `VISIBLE → HIDDEN`, а `4ace50bb-ae9b-4bcc-98d1-03a24ca2bc45` вернул `HIDDEN → VISIBLE` до composition. OWNER actor: `22522efd-ea5b-4d35-825c-f64d8761f954`; ADMIN actor: `9d3c23c1-8dd0-4ab1-96ac-dec90a1d34ae`.

Ожидаемая immutable composition содержит 1 739 entries: 28 categories, 56 systems и 1 655 material variants. Каждый новый entry получает только reviewed defaults `VISIBLE`, `APPROVED`, `INQUIRY_ONLY`, `PUBLISHED`; import сам по себе не активирует их. Один новый staging-only variant проходит exact selected `HIDDEN → VISIBLE` preview/apply с двумя append-only audited bulk commands до composition.

Catalog и price differences отдельно приняты OWNER через exact checksum-bound `ALL` review batches, затем обе версии отдельно одобрены OWNER и атомарно активированы ADMIN. Phase 1B.1 CatalogVersion `41b039a5-951d-4de3-873e-7565e2c7e9b0` и PriceVersion `ec19a7d7-c19a-45e1-86f9-269f01007fd0` остаются immutable superseded rollback targets; rollback v2 → v1 → v2 проверен без потери snapshots, overlays или media.

Первый повтор после активации выявил ложный v3 candidate `f1055d28-608b-4c6e-b7c8-a4a212a31efd`: volatile media recapture timestamps/hashes и representative provenance URL ошибочно участвовали в semantic comparison и породили 1 795 differences. Версия не активировалась; OWNER отклонил все differences batch `08d84980-d4bd-4a48-969f-8fc177be56f7`. Semantic versioning исправлен: повторная фиксация одинаковых безопасных source facts больше не создаёт candidate/diff, а active v2 не изменялась.

## 9. Public/admin result

После двух полных перезапусков public API возвращает `200` и ровно 1 655 активных MaterialVariant. Acceptance прошёл 34 bounded pages по 50 items, проверил 50 category-filter results, 3 detail pages и 12 media responses; полный public traversal занял `6 513.97 ms` в локальной acceptance-среде. Все публичные slugs bounded и route-safe; immutable technical separators нормализуются детерминированно, collision приводит к fail-closed degraded state. Public DTO не раскрывает source URL, object key или SHA-256.

Public `/catalog` возвращает все 1 655 material variants только из совместимой active PostgreSQL CatalogVersion/PriceVersion pair, с bounded 50-item cursors, hierarchy/search/filters/sort/detail/breadcrumbs, `INQUIRY_ONLY` fallback и controlled same-origin local media. AMIGO, raw snapshots, staging, object keys и source URLs не являются runtime read path.

Admin surface сохраняет full hierarchy, bounded server filters/pages, run/checkpoint/manifest/diff/history, review/bulk/release controls и раздельные source/local layers без raw/hash/parser/object-location leakage на основной экран.

## 10. Idempotency, schedule и restart

| Evidence | Результат |
|---|---|
| Recovery lineage | `cf159226…` resume count 114, затем сохранённые cancelled/failed attempts и успешный retry |
| No-op repeat | run `ae9b8759-7b14-4ca6-9b13-b518113a63b0`: `COMPLETED`, тот же source version, 21 019/21 019, 0 errors, 0 new catalog/price versions и 0 differences; manifest `COMPLETE`, checksum `248a4096b9570699b786f458226ecf81ea2ca801bd72f92f379c3840a1f98fa9` |
| Daily schedule | `catalog-source-discovery` на `2026-08-04T03:00:00.000Z`; автоматический run не активирует версии |
| Full environment restart | Дважды выполнен полный stop/start; PostgreSQL/worker/web/VersityGW готовы, v2 pointers и 2 818 private objects сохранены, public API отвечает `200` |

No-op repeat сохранил semantic source version, 21 019/21 019 counts, zero errors and zero new versions/differences. После `dev:stop → dev` PostgreSQL history, active pointers, private objects, worker/web readiness и public projection совпали.

## 11. Verification и scale evidence

До real acceptance выполнены:

- catalog unit: 40/40;
- catalog contracts: 6/6;
- jobs unit: 28/28;
- web unit/API/read: 22/22;
- migration boundary: 3/3;
- active-catalog browser: 5/5 profiles;
- baseline browser: 25/25;
- VersityGW contract: 15/15;
- Phase 1B.2 scale integration: passed over 2 048 synthetic materials.

Scale baseline: fixture persistence `2 999.07 ms`, heap delta `47 304 032` bytes; public `51.88 ms / 1` planned statement; admin `80.08 ms / 4`; bulk preview `810.61 ms / 6`; bulk apply `782.67 ms / 12`; PostgreSQL temporary blocks `0`. Это regression evidence, не production SLA.

`pnpm.cmd test:catalog-full -- -RunId 7d19a6e8-abcc-4bc6-a180-c0a5b59e17d6 -RepeatRunId ae9b8759-7b14-4ca6-9b13-b518113a63b0 -RecoveryRunId cf159226-450a-4aad-8495-1b5c7a5d3fab` passed. It re-read the complete manifest, exact source-bound price records, active v2 pair, all 1 655 public variants and all 2 818 object bytes; the generated local evidence file is excluded from Git.

Final exact-toolchain `pnpm.cmd ci:verify` passed 9/9 stages on Node `24.18.1`, pnpm `11.18.0`, PostgreSQL `18.4`, Docker Engine `29.6.2`, Playwright `1.62.1` and digest-pinned VersityGW `v1.4.1`: frozen install; format/docs/scope/boundaries; lint/typecheck; coverage; 15-migration database/queue/recovery; 15/15 storage; production build/artifact scan plus 2 048-item scale gate; 25/25 baseline and 5/5 active-catalog browser profiles; committed-secret scan over 358 files and zero critical advisories. Two fixture-only CI findings discovered during this final audit were corrected before the passing run: the integration expectation now follows the source-neutral route-safe slug contract, and repeated synthetic color identities use a consistent hex value.

## 12. Commit sequence

| Commit | Message |
|---|---|
| `377a74e` | `docs: authorize Phase 1B.2` |
| `177c83c` | `feat: expand AMIGO source discovery` |
| `46f950e` | `feat: add resumable full catalog import` |
| `11e1084` | `feat: import full catalog media` |
| `b631ad9` | `feat: add full catalog price snapshots` |
| `3db27fe` | `feat: add full catalog review and activation` |
| `ca4e4e8` | `feat: add bulk business catalog controls` |
| `e88c98d` | `feat: expand admin catalog` |
| `713d6e2` | `feat: expand public catalog` |
| `4b61d93` | `test: verify full catalog expansion` |
| `b625872` | `perf: validate full catalog scale` |
| final history | `docs: complete Phase 1B.2` |

## 13. Remaining TBD

Phase 1B.2 does not invent or close unrelated later-phase inputs. Material open gates include:

- `TBD-SOURCE-AMIGO-002`: official partner API/export/file/schema remains unproved; controlled public-page fallback is the accepted current transport;
- `TBD-ASSORT-003`: exact compatibility matrix for configurator/pricing;
- `TBD-PRICE-002`–`006`, `TBD-MECHANISM-001`, `TBD-PRICE-SOURCE-001`: dimensional/formula/rounding/context/legal pricing inputs;
- `TBD-ASSET-AMIGO-003`, `TBD-ASSET-RETENTION-001`: exact attribution/brand and retention rules;
- production infrastructure/privacy/legal/identity/RPO/RTO gates for later phases.

## 14. Phase boundary confirmation

**Phase 1C was not started.** No dimensional calculation, minimum-price execution, configurator, standard preview, AI/client-photo pipeline, cart, order, WhatsApp workflow, installment/account implementation, final landing/starfield, production secrets/provider/deployment or next-phase authorization was added. Work stops after `PASSED_PHASE_1B2_FULL_AMIGO_CATALOG` and requires a new written Product Owner decision to continue.
